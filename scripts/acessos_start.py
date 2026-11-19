"""Acesso de administrador com senha temporária no start.win7.ai e o HTML de acessos (ADR-008, adendo de 19/11/2026).

Uso: python -X utf8 scripts/acessos_start.py <email-de-login-do-administrador> [--super] [--nome "Nome"] [--desativar <outro-email>]
  --super: super admin (dono do sistema): nenhum outro administrador desativa nem redefine a senha dele.
  --desativar: tira o acesso de outra conta na mesma publicação (a conta fica, desativada; as sessões caem).
(o e-mail é só o login; o sistema não envia e-mail. Fica fora do código: o repositório é público, ADR-009)
- Gera uma senha temporária (12 letras e números sem os que confundem), calcula o hash com o PHP local e envia ao
  servidor só o hash, como usuarios-semente.json (0600, fora da pasta pública). A API absorve na próxima requisição:
  conta de administrador ativa, marcada para trocar a senha no primeiro acesso, temporária válida por 7 dias.
- Rodar de novo com o mesmo e-mail gera outra temporária e derruba as sessões dessa conta (serve para "esqueci a senha").
- Grava .segredos/ACESSOS-START.html (fora do git): endereço, e-mail, senha temporária e o passo a passo.
  A senha não é impressa no terminal. Depois do primeiro acesso a temporária não vale mais.
"""
import base64
import html
import json
import os
import secrets
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "servidor"))
import cpanel  # noqa: E402

DOMINIO = "start.win7.ai"
PASTA_DADOS = "start-cerebro-dados"
SAIDA = RAIZ / ".segredos" / "ACESSOS-START.html"
LETRAS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"


def php_local():
    if os.environ.get("PHP_EXE"):
        return [os.environ["PHP_EXE"]]
    pasta = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    achada = next((p for p in pasta.iterdir() if p.name.startswith("PHP.PHP.8")), None) if pasta.exists() else None
    if achada:
        return [str(achada / "php.exe")]
    if shutil.which("php"):
        return ["php"]
    sys.exit("Preciso do PHP 8 neste computador para calcular o hash da senha (INSTALAR.md: winget install PHP.PHP.8.3).")


def senha_temporaria():
    t = "".join(secrets.choice(LETRAS) for _ in range(12))
    return f"{t[:4]}-{t[4:8]}-{t[8:]}"


def hash_da(senha):
    r = subprocess.run([*php_local(), "-r", "echo password_hash(getenv('W7_S'), PASSWORD_DEFAULT);"], env={**os.environ, "W7_S": senha},
                       capture_output=True, text=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    h = r.stdout.strip()
    if not h.startswith("$2y$"):
        sys.exit(f"O PHP não calculou o hash: {r.stderr.strip()[:300]}")
    return h


def logo_base64():
    arq = RAIZ / "motor1-diagnostico" / "ativos" / "logo-win7med.png"
    return "data:image/png;base64," + base64.b64encode(arq.read_bytes()).decode() if arq.exists() else ""


def montar_html(email, senha, vale_ate, super_admin=False):
    e, s = html.escape(email), html.escape(senha)
    papel = "super admin" if super_admin else "administrador"
    extra = " Como super admin, só você altera a sua conta: nenhum outro administrador desativa nem redefine a sua senha." if super_admin else ""
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Acessos do Cérebro</title>
<style>
:root{{--petroleo:#0b4f6c;--petroleo-fundo:#082f44;--leve:#e8f2f7;--tinta:#0e1a22;--texto:#3b5160;--apagado:#6f8593;--fundo:#eef3f6;--cartao:#fff;--linha:#d7e2e8;
  --amarelo:#f5b71a;--vermelho:#e23b3b;--verde:#27a548;--azul:#2f7cc1;--aviso:#fff4d6;--aviso-tinta:#6b4b00;color-scheme:light}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:var(--fundo);color:var(--tinta);font-family:"Outfit","Segoe UI",Roboto,Arial,sans-serif;font-size:15.5px;line-height:1.55;padding-inline:16px}}
.faixa{{display:flex;height:5px;position:fixed;inset:0 0 auto 0}}.faixa i{{flex:1}}
.faixa i:nth-child(1){{background:var(--amarelo)}}.faixa i:nth-child(2){{background:var(--vermelho)}}.faixa i:nth-child(3){{background:var(--verde)}}.faixa i:nth-child(4){{background:var(--azul)}}
main{{max-width:720px;margin:0 auto;padding-block:44px 56px;display:grid;gap:22px}}
header{{display:flex;align-items:center;gap:14px;flex-wrap:wrap}}
header img{{height:46px;width:auto}}
h1{{font-size:clamp(1.6rem,4vw,2.2rem);line-height:1.1;text-wrap:balance}}
.sub{{color:var(--texto);max-width:60ch}}
.cartao{{background:var(--cartao);border:1px solid var(--linha);border-radius:20px;padding:24px;display:grid;gap:14px}}
.cartao h2{{font-size:1.15rem}}
.dados{{display:grid;gap:10px}}
.linha{{display:grid;grid-template-columns:150px minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--leve)}}
.linha dt{{font-size:13px;font-weight:700;color:var(--texto);text-transform:uppercase;letter-spacing:.06em}}
.linha dd{{font-family:ui-monospace,"Cascadia Mono",Consolas,monospace;font-size:17px;font-weight:700;overflow-wrap:anywhere;user-select:all}}
button,.botao{{font:inherit;font-size:14px;font-weight:700;border-radius:10px;padding:8px 14px;min-height:38px;cursor:pointer;border:1.5px solid var(--petroleo);background:var(--cartao);color:var(--petroleo);text-decoration:none;display:inline-flex;align-items:center;white-space:nowrap}}
.botao.primario{{background:var(--petroleo);color:#fff}}
.vale{{font-size:14px;color:var(--texto)}}
ol{{display:grid;gap:10px;padding-left:22px}}
ol li{{padding-left:4px}}
ol b{{color:var(--tinta)}}
.aviso{{background:var(--aviso);color:var(--aviso-tinta);border-radius:14px;padding:14px 16px;font-size:14.5px}}
.rodape{{font-size:13px;color:var(--apagado)}}
@media (max-width:560px){{.linha{{grid-template-columns:1fr auto}}.linha dd{{font-size:15px;overflow-wrap:normal;word-break:break-word}}.linha dt{{grid-column:1/-1}}.cartao{{padding:18px}}}}
@media print{{button,.botao{{display:none}}}}
</style>
</head>
<body>
<div class="faixa" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<main>
  <header>{f'<img src="{logo_base64()}" alt="Win7 Med">' if logo_base64() else ''}<div><h1>Acessos do Cérebro</h1></div></header>
  <p class="sub">O sistema interno da Win7 Med com a Análise, a Execução e os projetos salvos. Este é o seu acesso de {papel}: com ele você entra, cria a sua senha e adiciona as outras pessoas.{extra}</p>

  <section class="cartao" aria-labelledby="t-admin">
    <h2 id="t-admin">Acesso de {papel}</h2>
    <dl class="dados">
      <div class="linha"><dt>Endereço</dt><dd id="v-end">https://{DOMINIO}</dd><a class="botao primario" href="https://{DOMINIO}" target="_blank" rel="noopener">Abrir</a></div>
      <div class="linha"><dt>E-mail</dt><dd id="v-email">{e}</dd><button type="button" data-copiar="v-email">Copiar</button></div>
      <div class="linha"><dt>Senha temporária</dt><dd id="v-senha">{s}</dd><button type="button" data-copiar="v-senha">Copiar</button></div>
    </dl>
    <p class="vale">A senha temporária vale até <b>{vale_ate}</b> e funciona só até você criar a sua.</p>
  </section>

  <section class="cartao" aria-labelledby="t-passos">
    <h2 id="t-passos">Passo a passo</h2>
    <ol>
      <li><b>Entre</b> em {DOMINIO} com o e-mail e a senha temporária acima.</li>
      <li><b>Crie a sua senha.</b> O sistema pede logo depois de entrar: pelo menos 10 caracteres (uma frase curta é mais fácil de lembrar). A temporária deixa de valer.</li>
      <li><b>Adicione as pessoas.</b> Clique no círculo com as suas iniciais, no canto de cima, e depois em <b>Equipe e acessos</b>. Em Adicionar pessoa: nome, e-mail, o acesso (Equipe ou Administrador) e <b>Senha temporária</b>. O sistema mostra a senha uma vez, com o botão Copiar tudo: passe para a pessoa pelo WhatsApp. No primeiro acesso, ela cria a senha dela.</li>
      <li><b>Alguém esqueceu a senha?</b> Na mesma tela, em Pessoas, clique em <b>Redefinir senha</b>: sai uma temporária nova, e a antiga para de valer.</li>
      <li><b>Trocar a sua senha</b> a qualquer hora: menu da conta, <b>Trocar minha senha</b>.</li>
    </ol>
  </section>

  <p class="aviso"><b>Este arquivo tem senha.</b> Ele fica só neste computador, fora do git. Não envie por e-mail aberto nem poste em grupo. Depois que você criar a sua senha, a temporária não vale mais, e pode apagar este arquivo. Perdeu o acesso? Na pasta do Cérebro, rode de novo <code>python -X utf8 scripts/acessos_start.py {e}{' --super' if super_admin else ''}</code>: sai uma temporária nova.</p>
  <p class="rodape">Gerado em {datetime.now():%d/%m/%Y às %H:%M} · Cérebro Win7 Med · uso interno</p>
</main>
<script>
document.querySelectorAll('[data-copiar]').forEach(function (b) {{
  b.addEventListener('click', function () {{
    var alvo = document.getElementById(b.getAttribute('data-copiar')), t = alvo.textContent;
    var ok = function () {{ b.textContent = 'Copiado'; setTimeout(function () {{ b.textContent = 'Copiar'; }}, 2000); }};
    var marcar = function () {{ var r = document.createRange(); r.selectNodeContents(alvo); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }};
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, marcar); else marcar();
  }});
}});
</script>
</body>
</html>
"""


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith("--"):
        sys.exit(__doc__)
    valor = lambda chave: args[args.index(chave) + 1] if chave in args and args.index(chave) + 1 < len(args) else None
    email = args[0].strip().lower()
    super_admin = "--super" in args
    nome = (valor("--nome") or ("Super admin" if super_admin else "Administrador")).strip()
    desativar = (valor("--desativar") or "").strip().lower()
    for x in filter(None, [email, desativar]):
        if "@" not in x or "." not in x.split("@")[-1]:
            sys.exit(f"E-mail inválido: {x}")
    if desativar == email:
        sys.exit("O e-mail a desativar é o mesmo do acesso novo.")
    senha = senha_temporaria()
    semente = [{"email": email, "nome": nome, "papel": "admin", "dono": super_admin, "hash": hash_da(senha)}]
    if desativar:
        semente.append({"email": desativar, "desativar": True})
    with tempfile.TemporaryDirectory() as tmp:
        arq = Path(tmp) / "usuarios-semente.json"
        arq.write_text(json.dumps(semente), encoding="utf-8")
        ok, erros = cpanel.enviar(arq, PASTA_DADOS)
        if not ok:
            sys.exit(f"Falha ao enviar a conta ao servidor: {erros}")
    cpanel.api2("Fileman", "fileop", op="chmod", metadata="0600", sourcefiles=f"{cpanel.HOME}/{PASTA_DADOS}/usuarios-semente.json")
    # a API absorve a semente na próxima requisição: confere que ela sumiu (a conta foi criada)
    for _ in range(10):
        try:
            urllib.request.urlopen(urllib.request.Request(f"https://{DOMINIO}/api/saude", headers={"User-Agent": "cerebro-win7med-acessos"}), timeout=20).read()
        except Exception:
            pass
        lista = cpanel.uapi("Fileman", "list_files", dir=f"{cpanel.HOME}/{PASTA_DADOS}", show_hidden=1).get("data") or []
        nomes = {f["file"] for f in lista}
        if "usuarios-semente.json" not in nomes and "usuarios.json" in nomes:
            break
        time.sleep(2)
    else:
        sys.exit("A conta foi enviada, mas o servidor ainda não absorveu. Abra https://start.win7.ai e rode de novo se não entrar.")
    vale_ate = (datetime.now() + timedelta(days=7)).strftime("%d/%m/%Y às %H:%M")
    SAIDA.parent.mkdir(exist_ok=True)
    SAIDA.write_text(montar_html(email, senha, vale_ate, super_admin), encoding="utf-8")
    print(f"✅ acesso de {'super admin' if super_admin else 'administrador'} {email} pronto no servidor (senha temporária, troca obrigatória no 1º acesso, vale até {vale_ate})")
    if desativar:
        print(f"🔒 acesso de {desativar} desativado")
    print(f"📄 abra {SAIDA} (a senha não é impressa aqui)")


if __name__ == "__main__":
    main()
