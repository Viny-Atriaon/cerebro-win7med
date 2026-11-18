"""Publica start.win7.ai: a tela única com a Análise (robôs 1 e 2), a Execução (robô 3) e os projetos salvos (ADR-008).

Uso: python scripts/publicar_start.py dist/start [--convite-admin "Nome"]      (rode antes: npm run build)
Cria, se faltar, o domínio adicional no cPanel da Win7 e o registro A com proxy na zona win7.ai da Cloudflare
(HTTPS pela Cloudflare, como modelo.win7.ai e previa.win7.ai). Cria a pasta de dados fora da pasta pública
(start-cerebro-dados, na pasta da conta). Envia só o que mudou (páginas e a API em PHP) e confere no ar.

Cópia do dia (ADR-008): garante a chave (.segredos/start-copia.env, fora do git; cópia no servidor em chave-copia.txt,
0600, fora da pasta pública) e o cron do cPanel que roda api/lib/cron.php de hora em hora (gera uma cópia cifrada por dia).
A tarefa Win7-BackupFora do computador baixa as cópias e sobe para o Drive cifrado.

--convite-admin "Nome": gera um convite de administrador (vale 7 dias, uma vez, sem e-mail: a pessoa escreve o dela ao
aceitar). Só o hash do token vai ao servidor; o link fica em .segredos/start-convites.txt (fora do git) e não é impresso.
Credenciais em .segredos/credenciais.env (fora do git), lidas por servidor/cpanel.py e servidor/cloudflare.py.
"""
import base64
import hashlib
import json
import re
import secrets
import sys
import tempfile
import time
import urllib.request
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "servidor"))
sys.path.insert(0, str(RAIZ / "motor2-execucao" / "scripts"))
import cpanel  # noqa: E402
import cloudflare  # noqa: E402
from publicar_pagina import garantir_addon, mkdir, pegar  # noqa: E402

DOMINIO = "start.win7.ai"
PASTA_DADOS = "start-cerebro-dados"  # na pasta da conta, fora da pasta pública do domínio
PERMITIDO = {"index.html", "analise.html", "robo3.html", "robots.txt", ".htaccess", "api/index.php", "api/lib/base.php", "api/lib/copia.php", "api/lib/cron.php"}
PHP_CLI = "/opt/cpanel/ea-php83/root/usr/bin/php"  # o PHP da linha de comando do cPanel (EasyApache), o mesmo do GoogleX
CHAVE_LOCAL = RAIZ / ".segredos" / "start-copia.env"


def json_da_api(url):
    req = urllib.request.Request(url, headers={"User-Agent": "cerebro-win7med-publicador"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode("utf-8") or "null")
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception:
        return 0, None


def garantir_chave_copia():
    """A chave da cópia do dia: criada aqui uma vez, guardada em .segredos e enviada ao servidor se faltar lá."""
    if not CHAVE_LOCAL.exists():
        CHAVE_LOCAL.parent.mkdir(exist_ok=True)
        CHAVE_LOCAL.write_text("# Chave da cópia do dia do start.win7.ai (ADR-008). GUARDE NO GERENCIADOR DE SENHAS: sem ela, a cópia não abre.\n"
                               f"CHAVE={base64.b64encode(secrets.token_bytes(32)).decode()}\n", encoding="utf-8")
        print("🔑 chave nova da cópia do dia em .segredos/start-copia.env (guarde no gerenciador de senhas)")
    chave = next(l.split("=", 1)[1].strip() for l in CHAVE_LOCAL.read_text(encoding="utf-8").splitlines() if l.startswith("CHAVE="))
    r = cpanel.uapi("Fileman", "list_files", dir=f"{cpanel.HOME}/{PASTA_DADOS}", show_hidden=1)
    if "chave-copia.txt" in {f["file"] for f in (r.get("data") or [])}:
        return
    with tempfile.TemporaryDirectory() as tmp:
        arq = Path(tmp) / "chave-copia.txt"
        arq.write_text(chave, encoding="ascii")
        ok, erros = cpanel.enviar(arq, PASTA_DADOS)
        if not ok:
            sys.exit(f"Falha ao enviar a chave da cópia: {erros}")
    cpanel.api2("Fileman", "fileop", op="chmod", metadata="0600", sourcefiles=f"{cpanel.HOME}/{PASTA_DADOS}/chave-copia.txt")
    print("🔑 chave da cópia do dia enviada ao servidor (0600, fora da pasta pública)")


def garantir_cron():
    """De hora em hora, aos 17 minutos: a cópia sai uma vez por dia; se uma rodada falhar, a próxima tenta de novo."""
    atuais = cpanel.api2("Cron", "listcron").get("data", [])
    if any(f"{DOMINIO}/api/lib/cron.php" in (c.get("command") or "") for c in atuais):
        return
    linha = f"{PHP_CLI} {cpanel.HOME}/{DOMINIO}/api/lib/cron.php >> {cpanel.HOME}/{PASTA_DADOS}/logs/cron.log 2>&1"
    r = cpanel.api2("Cron", "add_line", command=linha, minute="17", hour="*", day="*", month="*", weekday="*")
    if not ((r.get("data") or [{}])[0].get("status") or r.get("event", {}).get("result")):
        sys.exit(f"Não consegui criar o cron da cópia do dia: {r.get('error') or r.get('data')}")
    print("🕒 cron da cópia do dia criado (de hora em hora, aos 17 minutos; uma cópia por dia)")


def convite_admin(nome):
    token = secrets.token_hex(20)
    semente = {hashlib.sha256(token.encode()).hexdigest(): {"email": "", "nome": nome, "papel": "admin", "expira": int(time.time() * 1000 + 7 * 86400e3), "criado_por": "publicação"}}
    with tempfile.TemporaryDirectory() as tmp:
        arq = Path(tmp) / "convites-semente.json"
        arq.write_text(json.dumps(semente, ensure_ascii=False), encoding="utf-8")
        ok, erros = cpanel.enviar(arq, PASTA_DADOS)
        if not ok:
            sys.exit(f"Falha ao enviar o convite: {erros}")
    segredos = RAIZ / ".segredos"
    segredos.mkdir(exist_ok=True)
    with (segredos / "start-convites.txt").open("a", encoding="utf-8") as f:
        f.write(f"{datetime.now():%d/%m/%Y %H:%M} · administrador · {nome} · vale 7 dias, uma vez\nhttps://{DOMINIO}/#convite={token}\n\n")
    print(f"🔑 convite de administrador para {nome} criado; o link está em .segredos/start-convites.txt")


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    site = Path(args[0]).resolve()
    nome_convite = args[args.index("--convite-admin") + 1] if "--convite-admin" in args else None
    arquivos = sorted(p.relative_to(site).as_posix() for p in site.rglob("*") if p.is_file() and not p.name.startswith(".publicado"))
    fora = [a for a in arquivos if a not in PERMITIDO]
    if fora or "index.html" not in arquivos or "api/index.php" not in arquivos:
        sys.exit("Publicação recusada: arquivos fora do esperado ou faltando index.html/api: " + ", ".join(fora))
    garantir_addon(DOMINIO)
    z = cloudflare.zona("win7.ai")
    if not [x for x in cloudflare.registros(z["id"]) if x["name"] == DOMINIO]:
        ip = cloudflare.ip_servidor()
        r = cloudflare.api("POST", f"/zones/{z['id']}/dns_records", {"type": "A", "name": DOMINIO, "content": ip, "proxied": True, "ttl": 1, "comment": "Cérebro Win7 Med (start) - cPanel da Win7"})
        if not r.get("success"):
            sys.exit(f"Não consegui criar o registro {DOMINIO}: {r.get('errors')}")
        print(f"🆕 registro A {DOMINIO} (proxy) na zona win7.ai")
    # pasta de dados fora da pasta pública (o PHP também cria sozinho; aqui garante antes do convite)
    cpanel.api2("Fileman", "mkdir", path=cpanel.HOME, name=PASTA_DADOS, permissions="0750")
    for pasta in ("api", "api/lib"):
        mkdir(DOMINIO, pasta)
    estado_arq = site / ".publicado-start.json"
    estado = json.loads(estado_arq.read_text(encoding="utf-8")) if estado_arq.exists() else {}
    # a API antes das páginas: a tela nova nunca fica no ar sem o servidor que ela chama
    for a in sorted(arquivos, key=lambda x: (not x.startswith("api/"), x)):
        h = hashlib.sha256((site / a).read_bytes()).hexdigest()
        if estado.get(a) == h:
            continue
        pasta = DOMINIO + ("/" + a.rsplit("/", 1)[0] if "/" in a else "")
        ok, erros = cpanel.enviar(site / a, pasta)
        if not ok:
            sys.exit(f"Falha ao enviar {a}: {erros}")
        estado[a] = h
        print(f"⬆️  {a}")
    estado_arq.write_text(json.dumps(estado, indent=2) + "\n", encoding="utf-8")
    cpanel.api2("Fileman", "mkdir", path=f"{cpanel.HOME}/{PASTA_DADOS}", name="logs", permissions="0750")
    cpanel.api2("Fileman", "mkdir", path=f"{cpanel.HOME}/{PASTA_DADOS}", name="copias", permissions="0750")
    garantir_chave_copia()
    garantir_cron()
    if nome_convite:
        convite_admin(nome_convite)
    # conferência no ar: página, API e código interno fechado
    titulo = re.search(r"<title>(.*?)</title>", (site / "index.html").read_text(encoding="utf-8")).group(1)
    st, final, corpo, cab = pegar(f"https://{DOMINIO}/")
    pagina = st == 200 and f"<title>{titulo}</title>" in corpo
    print(("✅" if pagina else "⚠️ ") + f" página: https://{DOMINIO}/ (HTTP {st}, X-Robots-Tag: {cab.get('X-Robots-Tag', '?')})")
    s1, saude = json_da_api(f"https://{DOMINIO}/api/saude")
    s2, sessao = json_da_api(f"https://{DOMINIO}/api/sessao")
    s3, _ = json_da_api(f"https://{DOMINIO}/api/lib/base.php")
    api_ok = s1 == 200 and (saude or {}).get("ok") is True and s2 == 200 and (sessao or {}).get("usuario", "x") is None
    print(("✅" if api_ok else "❌") + f" API: saúde HTTP {s1} {saude} · sessão HTTP {s2}")
    print(("✅" if s3 == 403 else "❌") + f" código interno fechado: /api/lib/base.php HTTP {s3}")
    if not (pagina and api_ok and s3 == 403):
        sys.exit(1)


if __name__ == "__main__":
    main()
