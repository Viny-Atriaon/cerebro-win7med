"""Publica o site de modelos de LP Win7 (ADR-006) no cPanel da Win7, domínio modelo.win7.ai.

Usa o acesso por token de servidor/cpanel.py (credenciais em .segredos/credenciais.env, fora do git).
Nunca imprime credencial. Só envia arquivos da lista fechada (trava 4 do CONSELHO-03): raiz do site,
a base da Win7 (logos, etiqueta, vídeo e depoimentos base) e, por cliente, index.html e logo.

Uso:
  python motor1-diagnostico/scripts/publicar_lp_modelo.py <pasta-do-site> [--token T] [--dias 30]
  python motor1-diagnostico/scripts/publicar_lp_modelo.py <pasta-do-site> --so-limpar

--token T   publica a página desse cliente (sem ele, publica todas as da pasta)
--dias N    modelos criados há mais de N dias saem do ar e do registro (padrão 30, trava 5)
"""
import hashlib
import json
import re
import shutil
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "servidor"))
try:
    import cpanel  # noqa: E402
except ImportError:
    sys.exit("Não achei servidor/cpanel.py no Cérebro.")

DOMINIO = "modelo.win7.ai"
PERMITIDO = re.compile(r"^(index\.html|robots\.txt|\.htaccess"
                       r"|base/(win7-etiqueta\.webp|logo-win7med\.png|logo-win7\.png|hero\.(mp4|webp)|depoimento-[1-3]\.(mp4|webp))"
                       r"|m/[a-z0-9]{12}/(index\.html|logo\.(png|jpg|jpeg|webp|svg)))$")
LIMITE_MB = {".mp4": 25, ".webp": 2, ".png": 2, ".jpg": 2, ".jpeg": 2, ".svg": 1, ".html": 1}


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def mkdir(rel):
    pai, nome = (DOMINIO + "/" + rel).rsplit("/", 1)
    cpanel.api2("Fileman", "mkdir", path=f"{cpanel.HOME}/{pai}", name=nome, permissions="0755")


def remotos(rel):
    r = cpanel.uapi("Fileman", "list_files", dir=f"{cpanel.HOME}/{DOMINIO}/{rel}")
    return [f.get("file") for f in (r.get("data") or []) if f.get("type") == "file"]


def apagar_pasta(rel):
    r = cpanel.api2("Fileman", "fileop", op="killdir", sourcefiles=f"{cpanel.HOME}/{DOMINIO}/{rel}")
    return not r.get("error")


def enviar(site, rel):
    local = site / rel
    mb = local.stat().st_size / 1024 / 1024
    if mb > LIMITE_MB.get(local.suffix.lower(), 1):
        raise SystemExit(f"{rel} tem {mb:.1f} MB: acima do limite para {local.suffix}. Comprima antes (vídeo em 720p, até 25 MB).")
    pasta = DOMINIO + ("/" + rel.rsplit("/", 1)[0] if "/" in rel else "")
    ok, erros = cpanel.enviar(local, pasta)
    if not ok:
        raise SystemExit(f"Falha ao enviar {rel}: {erros}")


def conferir(url, token):
    """Tenta HTTPS e depois HTTP; vale a primeira resposta que for a página do modelo (não a de erro do servidor)."""
    ultimo = ""
    for u in (url, url.replace("https://", "http://")):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "win7-conferencia"}), timeout=30) as r:
                corpo = r.read().decode("utf-8", "replace")
                if r.status == 200 and r.geturl().rstrip("/").endswith(token) and "Modelo para aprovação" in corpo and "noindex" in corpo:
                    return u, True, r.headers.get("X-Robots-Tag", "")
                ultimo = f"{u} respondeu {r.status} em {r.geturl()}"
        except Exception as e:  # noqa: BLE001
            ultimo = f"{u}: {e}"
    return url, False, ultimo


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    site = Path(args[0]).resolve()
    token = args[args.index("--token") + 1] if "--token" in args else ""
    dias = int(args[args.index("--dias") + 1]) if "--dias" in args else 30
    registro_arq = site.parent / "registro.json"
    registro = json.loads(registro_arq.read_text(encoding="utf-8")) if registro_arq.exists() else {}

    # 1. lista fechada: nada fora dela sobe (vídeo de cliente real, foto, outro arquivo)
    arquivos = sorted(p.relative_to(site).as_posix() for p in site.rglob("*") if p.is_file() and p.name != ".publicado.json")
    fora = [a for a in arquivos if not PERMITIDO.match(a)]
    if fora:
        sys.exit("Publicação recusada: arquivos fora da lista permitida: " + ", ".join(fora))

    # 2. expiração (trava 5): modelo com mais de N dias sai do ar
    agora = datetime.now(timezone.utc)
    for slug, reg in list(registro.items()):
        criado = datetime.fromisoformat(reg["criado_em"].replace("Z", "+00:00"))
        if (agora - criado).days > dias:
            t = reg["token"]
            if apagar_pasta(f"m/{t}"):
                shutil.rmtree(site / "m" / t, ignore_errors=True)
                del registro[slug]
                print(f"🗑️  modelo de {reg.get('nome', slug)} expirou ({(agora - criado).days} dias) e saiu do ar")
    registro_arq.write_text(json.dumps(registro, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if "--so-limpar" in args:
        return

    # 3. raiz e base: só o que mudou desde a última publicação
    estado_arq = site / ".publicado.json"
    estado = json.loads(estado_arq.read_text(encoding="utf-8")) if estado_arq.exists() else {}
    mkdir("base")
    mkdir("m")
    for rel in [a for a in arquivos if not a.startswith("m/")]:
        h = sha(site / rel)
        if estado.get(rel) != h:
            enviar(site, rel)
            estado[rel] = h
            print(f"⬆️  {rel}")

    # 4. páginas dos clientes
    tokens = [token] if token else sorted({a.split("/")[1] for a in arquivos if a.startswith("m/")})
    for t in tokens:
        if not (site / "m" / t / "index.html").exists():
            sys.exit(f"Não há página local para o token {t}.")
        mkdir(f"m/{t}")
        locais = {p.name for p in (site / "m" / t).iterdir() if p.is_file()}
        for n in remotos(f"m/{t}"):
            if n not in locais and re.match(r"^logo\.", n):
                cpanel.api2("Fileman", "fileop", op="unlink", sourcefiles=f"{cpanel.HOME}/{DOMINIO}/m/{t}/{n}")
        for n in sorted(locais):
            enviar(site, f"m/{t}/{n}")
            estado[f"m/{t}/{n}"] = sha(site / "m" / t / n)
        url = f"https://{DOMINIO}/m/{t}/"
        u, ok, info = conferir(url, t)
        if ok and u.startswith("https://"):
            print(f"✅ no ar: {u} (X-Robots-Tag: {info or 'meta'})")
        elif ok:
            print(f"✅ no ar em {u}. ⚠️ HTTPS ainda sem certificado: a hospedagem emite sozinha pelo AutoSSL, como nos outros domínios. Confira de novo mais tarde.")
        else:
            print(f"⚠️  enviado, mas a conferência falhou em {url}: {info}")
    estado_arq.write_text(json.dumps(estado, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
