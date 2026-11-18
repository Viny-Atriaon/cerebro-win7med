"""Publica as páginas reais montadas pelo robô 3 (ADR-007) no cPanel da Win7, com a Cloudflare na frente.

Usa o acesso por token de servidor/cpanel.py e servidor/cloudflare.py (credenciais em .segredos/credenciais.env,
fora do git). Nunca imprime credencial.

Uso:
  python motor2-execucao/scripts/publicar_pagina.py <pasta-site> --previa <token12>
      Prévia para a revisão interna em https://previa.win7.ai/<token12>/ (noindex, robots bloqueado, sem listagem).
  python motor2-execucao/scripts/publicar_pagina.py <pasta-site> --dominio <dominio.com.br> [--simular]
      Domínio do cliente: a zona precisa existir na Cloudflare (criada no painel) com os DNS trocados no Registro.br.
      O script cria o domínio adicional no cPanel, envia os arquivos, aponta A @ e www (proxy, SSL Flexible, HTTPS forçado)
      e confere na origem e no ar. --simular só mostra o que faria.
"""
import hashlib
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SCRIPTS_LP = RAIZ / "servidor"
sys.path.insert(0, str(SCRIPTS_LP))
try:
    import cpanel  # noqa: E402
    import cloudflare  # noqa: E402
except ImportError:
    sys.exit("Não achei servidor/cpanel.py e servidor/cloudflare.py no Cérebro.")

PREVIA = "previa.win7.ai"
LIMITE_MB = {".mp4": 25, ".webp": 2, ".png": 2, ".jpg": 2, ".jpeg": 2, ".svg": 1, ".html": 1, ".js": 1}
PERMITIDO = re.compile(r"^(index\.html|robots\.txt|\.htaccess|[a-z0-9-]+/index\.html|politica-de-privacidade/index\.html"
                       r"|assets/[a-z0-9._-]+\.(webp|png|jpg|jpeg|svg|mp4|js)|assets/convenios/[a-z0-9-]+\.webp)$")


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def dominios_addon():
    r = cpanel.uapi("DomainInfo", "domains_data")
    return {d["domain"]: d["documentroot"] for d in (r.get("data") or {}).get("addon_domains", [])}


def garantir_addon(dominio, simular=False):
    if dominio in dominios_addon():
        return False
    if simular:
        print(f"   (simulação) criaria o domínio adicional {dominio} na pasta da conta")
        return True
    r = cpanel.api2("AddonDomain", "addaddondomain", newdomain=dominio, subdomain=dominio.split(".")[0].replace("-", "")[:20], dir=dominio)
    dados = (r.get("data") or [{}])[0]
    if not dados.get("result"):
        sys.exit(f"Não consegui criar o domínio adicional {dominio}: {dados.get('reason') or r.get('error')}")
    print(f"🆕 domínio adicional {dominio} criado no cPanel")
    return True


def mkdir(raiz_remota, rel):
    if not rel:
        return
    pai, nome = (raiz_remota + "/" + rel).rsplit("/", 1)
    cpanel.api2("Fileman", "mkdir", path=f"{cpanel.HOME}/{pai}", name=nome, permissions="0755")


def enviar_site(site, raiz_remota, simular=False):
    arquivos = sorted(p.relative_to(site).as_posix() for p in site.rglob("*") if p.is_file() and not p.name.startswith(".publicado"))
    fora = [a for a in arquivos if not PERMITIDO.match(a)]
    if fora:
        sys.exit("Publicação recusada: arquivos fora do esperado para a página: " + ", ".join(fora))
    for a in arquivos:
        mb = (site / a).stat().st_size / 1024 / 1024
        if mb > LIMITE_MB.get((site / a).suffix.lower(), 1):
            sys.exit(f"{a} tem {mb:.1f} MB: acima do limite. Comprima antes (vídeo em 720p).")
    estado_arq = site / f".publicado-{raiz_remota.replace('/', '_')}.json"
    estado = json.loads(estado_arq.read_text(encoding="utf-8")) if estado_arq.exists() else {}
    pastas = sorted({a.rsplit("/", 1)[0] for a in arquivos if "/" in a}, key=lambda x: x.count("/"))
    if simular:
        print(f"   (simulação) enviaria {len(arquivos)} arquivo(s) para {raiz_remota}/ na pasta da conta")
        return
    for pz in pastas:
        parcial = ""
        for parte in pz.split("/"):
            parcial = f"{parcial}/{parte}" if parcial else parte
            mkdir(raiz_remota, parcial)
    for a in arquivos:
        h = sha(site / a)
        if estado.get(a) == h:
            continue
        pasta = raiz_remota + ("/" + a.rsplit("/", 1)[0] if "/" in a else "")
        ok, erros = cpanel.enviar(site / a, pasta)
        if not ok:
            sys.exit(f"Falha ao enviar {a}: {erros}")
        estado[a] = h
        print(f"⬆️  {a}")
    estado_arq.write_text(json.dumps(estado, indent=2) + "\n", encoding="utf-8")


def pegar(url, host=None):
    req = urllib.request.Request(url, headers={"User-Agent": "win7-conferencia", **({"Host": host} if host else {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.geturl(), r.read().decode("utf-8", "replace"), dict(r.headers)
    except Exception as e:  # noqa: BLE001
        return 0, url, str(e), {}


def conferir(url, site):
    """A página no ar precisa ser a mesma montada aqui (mesmo título) e estar fora do Google orgânico."""
    titulo = re.search(r"<title>(.*?)</title>", (site / "index.html").read_text(encoding="utf-8")).group(1)
    for u in (url, url.replace("https://", "http://")):
        st, final, corpo, cab = pegar(u)
        if st == 200 and f"<title>{titulo}</title>" in corpo:
            robots = cab.get("X-Robots-Tag", "") or ("meta" if "noindex" in corpo else "")
            return u, True, robots
        ultimo = f"{u} respondeu {st} em {final}"
    return url, False, ultimo


def garantir_previa():
    """previa.win7.ai: domínio adicional no cPanel, registro A com proxy na zona win7.ai e raiz fechada."""
    novo = garantir_addon(PREVIA)
    z = cloudflare.zona("win7.ai")
    regs = [r for r in cloudflare.registros(z["id"]) if r["name"] == PREVIA]
    if not regs:
        r = cloudflare.api("POST", f"/zones/{z['id']}/dns_records", {"type": "A", "name": PREVIA, "content": cloudflare.ip_servidor(), "proxied": True, "ttl": 1, "comment": "Prévias do robô 3 (Cérebro Win7) - cPanel da Win7"})
        if not r.get("success"):
            sys.exit(f"Não consegui criar o registro {PREVIA}: {r.get('errors')}")
        print(f"🆕 registro A {PREVIA} (proxy) na zona win7.ai")
    if novo or not (Path(__file__).parent / ".previa-raiz-ok").exists():
        tmp = Path(__file__).parent / "_raiz_previa"
        tmp.mkdir(exist_ok=True)
        (tmp / ".htaccess").write_text("# Prévias internas do robô 3 (ADR-007): fora de buscadores, sem listagem.\nOptions -Indexes\nDirectoryIndex index.html\n<IfModule mod_headers.c>\n  Header set X-Robots-Tag \"noindex, nofollow, noarchive\"\n  Header set Referrer-Policy \"no-referrer\"\n</IfModule>\n", encoding="utf-8")
        (tmp / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
        (tmp / "index.html").write_text("<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex, nofollow\"><title>Prévias Win7</title></head><body><p>Prévias internas da Win7.</p></body></html>\n", encoding="utf-8")
        for n in (".htaccess", "robots.txt", "index.html"):
            ok, erros = cpanel.enviar(tmp / n, PREVIA)
            if not ok:
                sys.exit(f"Falha ao preparar a raiz da prévia: {erros}")
        (Path(__file__).parent / ".previa-raiz-ok").write_text("ok\n", encoding="utf-8")


def main():
    args = sys.argv[1:]
    if not args or ("--previa" not in args and "--dominio" not in args):
        sys.exit(__doc__)
    site = Path(args[0]).resolve()
    if not (site / "index.html").exists():
        sys.exit(f"Não há página montada em {site} (rode a etapa entregas antes).")
    simular = "--simular" in args
    if "--previa" in args:
        token = args[args.index("--previa") + 1]
        if not re.fullmatch(r"[a-z0-9]{12}", token):
            sys.exit("Token da prévia inválido.")
        garantir_previa()
        mkdir(PREVIA, token)
        enviar_site(site, f"{PREVIA}/{token}")
        u, ok, info = conferir(f"https://{PREVIA}/{token}/", site)
        print(f"✅ prévia no ar: {u} (X-Robots-Tag: {info})" if ok else f"⚠️  enviado, mas a conferência falhou: {info}")
        return
    dominio = args[args.index("--dominio") + 1].lower().strip()
    if not re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)+", dominio):
        sys.exit("Domínio inválido.")
    r = cloudflare.api("GET", "/zones?name=" + dominio)
    if not r.get("result"):
        sys.exit(f"A zona {dominio} ainda não existe na Cloudflare. Passo manual (uma vez): criar a zona no painel da Cloudflare "
                 f"(conta da Win7) e trocar os servidores DNS no Registro.br pelos que a zona mostrar.")
    z = r["result"][0]
    print(f"🌐 zona {dominio}: {z['status']} · DNS {', '.join(z.get('name_servers', []))}")
    if z["status"] != "active":
        print("⚠️  a zona ainda não está ativa: o Registro.br pode levar até algumas horas para propagar a troca de DNS.")
    garantir_addon(dominio, simular)
    enviar_site(site, dominio, simular)
    if simular:
        print(f"   (simulação) apontaria A @ e www de {dominio} para o servidor da Win7 com proxy, SSL Flexible e HTTPS forçado")
        return
    st, final, corpo, _ = pegar(f"http://{cloudflare.ip_servidor()}/", host=dominio)
    print(f"🔎 origem: {'ok' if st == 200 and 'noindex' in corpo else f'respondeu {st}'}")
    subprocess.run([sys.executable, str(SCRIPTS_LP / "cloudflare.py"), "apontar", dominio], check=False)
    u, ok, info = conferir(f"https://{dominio}/", site)
    print(f"✅ no ar: {u} (X-Robots-Tag: {info})" if ok else f"⚠️  enviado e apontado; o domínio ainda não respondeu com a página: {info}. Confira de novo após a propagação.")


if __name__ == "__main__":
    main()
