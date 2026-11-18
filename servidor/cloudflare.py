"""DNS e configurações de zona no Cloudflare da Win7, sem login (token em .segredos/credenciais.env, fora do git).
Cópia vinda do construtor-lp (14/10/2026), para o Cérebro funcionar em qualquer computador.

Token "win7-lp-dns": DNS:Editar + Configurações de zona:Editar em todas as zonas da conta da Win7.
O script nunca imprime o token. O IP de origem do servidor (escondido atrás da Cloudflare) nunca fica no código:
vem de SERVIDOR_IP nas credenciais ou do registro A de modelo.win7.ai (ip_servidor).

Uso:
  python scripts/cloudflare.py teste
  python scripts/cloudflare.py zonas
  python scripts/cloudflare.py dns <dominio>
  python scripts/cloudflare.py apontar <dominio> [ip]        # A @ e www -> ip (padrão: o do servidor da Win7), proxy, SSL Flexible, HTTPS forçado
  python scripts/cloudflare.py desligar <dominio> [ip]       # apaga A/AAAA/CNAME de @ e www que apontam para o ip
  python scripts/cloudflare.py limpar-cache <dominio>

Criar zona nova exige permissão de conta (este token não tem): fazer pelo painel uma vez.
"""
import json, sys, urllib.parse, urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def arquivo_credenciais():
    """Onde está o credenciais.env (nunca no git): W7_CREDENCIAIS, depois .segredos/ do Cérebro, depois o do construtor-lp."""
    import os
    candidatos = [os.environ.get("W7_CREDENCIAIS", ""), RAIZ / ".segredos" / "credenciais.env", RAIZ.parent / "construtor-lp" / ".segredos" / "credenciais.env"]
    for c in candidatos:
        if c and Path(c).exists():
            return Path(c)
    sys.exit("Não achei o credenciais.env. Copie o arquivo para .segredos/credenciais.env na pasta do Cérebro (veja INSTALAR.md).")
API = "https://api.cloudflare.com/client/v4"


def token():
    for linha in arquivo_credenciais().read_text(encoding="utf-8-sig").splitlines():
        if linha.startswith("CLOUDFLARE_TOKEN="):
            t = linha.split("=", 1)[1].strip()
            if t:
                return t
    sys.exit("CLOUDFLARE_TOKEN vazio em .segredos/credenciais.env")


def api(metodo, caminho, corpo=None):
    req = urllib.request.Request(API + caminho, method=metodo, data=json.dumps(corpo).encode() if corpo is not None else None,
                                 headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode() or "{}")


def zona(dominio):
    r = api("GET", "/zones?" + urllib.parse.urlencode({"name": dominio}))
    if not r.get("result"):
        sys.exit(f"Zona {dominio} não encontrada (ou o token não tem acesso): {r.get('errors')}")
    return r["result"][0]


def registros(zid):
    return api("GET", f"/zones/{zid}/dns_records?per_page=100")["result"]


def ip_servidor():
    """IP de origem do cPanel da Win7: SERVIDOR_IP nas credenciais ou o registro A de modelo.win7.ai (mesmo servidor)."""
    for linha in arquivo_credenciais().read_text(encoding="utf-8-sig").splitlines():
        if linha.startswith("SERVIDOR_IP=") and linha.split("=", 1)[1].strip():
            return linha.split("=", 1)[1].strip()
    for r in registros(zona("win7.ai")["id"]):
        if r["name"] == "modelo.win7.ai" and r["type"] == "A":
            return r["content"]
    sys.exit("Sem o IP do servidor: defina SERVIDOR_IP no credenciais.env (veja INSTALAR.md).")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "teste"
    if cmd == "teste":
        r = api("GET", "/user/tokens/verify")
        print("token:", r.get("result", {}).get("status"), r.get("errors") or "")
    elif cmd == "zonas":
        for z in api("GET", "/zones?per_page=50")["result"]:
            print(z["status"], z["name"])
    elif cmd == "dns":
        z = zona(sys.argv[2])
        print("zona", z["name"], z["status"], "NS:", ", ".join(z["name_servers"]))
        for r in registros(z["id"]):
            print(r["type"], r["name"], r["content"], "proxy" if r.get("proxied") else "")
    elif cmd == "apontar":
        dominio, ip = sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else ip_servidor())
        z = zona(dominio)
        regs = registros(z["id"])
        for nome in (dominio, "www." + dominio):
            for r in [r for r in regs if r["name"] == nome and r["type"] in ("A", "AAAA", "CNAME")]:
                api("DELETE", f"/zones/{z['id']}/dns_records/{r['id']}")
            c = api("POST", f"/zones/{z['id']}/dns_records", {"type": "A", "name": nome, "content": ip, "proxied": True, "ttl": 1, "comment": "LP Win7 - cPanel da Win7"})
            print("A", nome, "->", ip, "ok" if c.get("success") else c.get("errors"))
        print("SSL:", api("PATCH", f"/zones/{z['id']}/settings/ssl", {"value": "flexible"}).get("result", {}).get("value"))
        print("HTTPS forçado:", api("PATCH", f"/zones/{z['id']}/settings/always_use_https", {"value": "on"}).get("result", {}).get("value"))
        print("NS da zona (para o Registro.br):", ", ".join(z["name_servers"]), "| status:", z["status"])
    elif cmd == "desligar":
        dominio, ip = sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else ip_servidor())
        z = zona(dominio)
        for r in registros(z["id"]):
            if r["name"] in (dominio, "www." + dominio) and r["type"] in ("A", "AAAA", "CNAME") and r["content"] == ip:
                d = api("DELETE", f"/zones/{z['id']}/dns_records/{r['id']}")
                print("apagado", r["type"], r["name"], d.get("success"))
    elif cmd == "limpar-cache":
        z = zona(sys.argv[2])
        print("cache limpo:", api("POST", f"/zones/{z['id']}/purge_cache", {"purge_everything": True}).get("success"))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
