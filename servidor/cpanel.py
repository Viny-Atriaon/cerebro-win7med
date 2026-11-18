"""Acesso ao cPanel da Win7 por token de API (sem navegador e sem login).

Cópia vinda do construtor-lp (14/10/2026), para o Cérebro funcionar em qualquer computador.
O token fica em .segredos/credenciais.env (fora do git); ver arquivo_credenciais().
Este script lê o arquivo e nunca imprime o token.

Uso:
  python scripts/cpanel.py teste
  python scripts/cpanel.py dominios
  python scripts/cpanel.py listar <pasta-no-servidor>
  python scripts/cpanel.py enviar <arquivo-local> <pasta-no-servidor>     # 0644 garantido
  python scripts/cpanel.py baixar <pasta-no-servidor> <arquivo> <destino-local>

Pastas no servidor são relativas à pasta da conta (ex.: dominio-do-cliente.com.br). A pasta vem de CPANEL_HOME
nas credenciais ou do próprio cPanel: nunca fica escrita no código (repositório público, ADR-009).
"""
import json, sys, urllib.parse, urllib.request, uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
_HOME = None


def arquivo_credenciais():
    """Onde está o credenciais.env (nunca no git): W7_CREDENCIAIS, depois .segredos/ do Cérebro, depois o do construtor-lp."""
    import os
    candidatos = [os.environ.get("W7_CREDENCIAIS", ""), RAIZ / ".segredos" / "credenciais.env", RAIZ.parent / "construtor-lp" / ".segredos" / "credenciais.env"]
    for c in candidatos:
        if c and Path(c).exists():
            return Path(c)
    sys.exit("Não achei o credenciais.env. Copie o arquivo para .segredos/credenciais.env na pasta do Cérebro (veja INSTALAR.md).")


def credenciais():
    env = arquivo_credenciais()
    dados = {}
    for linha in env.read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.strip().startswith("#"):
            k, v = linha.split("=", 1)
            dados[k.strip()] = v.strip()
    if not dados.get("CPANEL_TOKEN"):
        sys.exit(f"Token do cPanel vazio em {env}. Gere em cPanel > Segurança > Gerenciar tokens de API e cole após CPANEL_TOKEN=")
    return dados


C = None


def home():
    """Pasta da conta no servidor: CPANEL_HOME nas credenciais ou a que o cPanel informa."""
    global _HOME
    if _HOME is None:
        C2 = C or credenciais()
        _HOME = C2.get("CPANEL_HOME") or uapi("Variables", "get_user_information")["data"]["home"]
    return _HOME


def __getattr__(nome):
    # cpanel.HOME continua valendo para os scripts que já usam
    if nome == "HOME":
        return home()
    raise AttributeError(nome)


def _req(url, data=None, headers=None):
    global C
    C = C or credenciais()
    h = {"Authorization": f"cpanel {C['CPANEL_USER']}:{C['CPANEL_TOKEN']}"}
    h.update(headers or {})
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h), timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def uapi(modulo, funcao, **params):
    C2 = C or credenciais()
    return _req(f"https://{C2['CPANEL_HOST']}/execute/{modulo}/{funcao}?{urllib.parse.urlencode(params)}")


def api2(modulo, funcao, **params):
    C2 = C or credenciais()
    q = urllib.parse.urlencode({"cpanel_jsonapi_module": modulo, "cpanel_jsonapi_func": funcao, "cpanel_jsonapi_apiversion": 2, **params})
    return _req(f"https://{C2['CPANEL_HOST']}/json-api/cpanel?{q}")["cpanelresult"]


def enviar(local, pasta):
    C2 = C or credenciais()
    local = Path(local)
    limite = uuid.uuid4().hex
    corpo = b"".join([
        f"--{limite}\r\nContent-Disposition: form-data; name=\"dir\"\r\n\r\n{home()}/{pasta}\r\n".encode(),
        f"--{limite}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\n1\r\n".encode(),
        f"--{limite}\r\nContent-Disposition: form-data; name=\"file-1\"; filename=\"{local.name}\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode(),
        local.read_bytes(), f"\r\n--{limite}--\r\n".encode(),
    ])
    r = _req(f"https://{C2['CPANEL_HOST']}/execute/Fileman/upload_files", corpo, {"Content-Type": f"multipart/form-data; boundary={limite}"})
    ok = r.get("status") == 1
    api2("Fileman", "fileop", op="chmod", metadata="0644", sourcefiles=f"{home()}/{pasta}/{local.name}")
    return ok, r.get("errors")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "teste"
    if cmd == "teste":
        r = uapi("Variables", "get_user_information")
        print("OK, conectado como", r["data"]["user"] if r.get("status") == 1 else r.get("errors"))
    elif cmd == "dominios":
        r = uapi("DomainInfo", "domains_data")["data"]
        for d in r["addon_domains"]:
            print(d["domain"], "->", d["documentroot"])
    elif cmd == "listar":
        for f in uapi("Fileman", "list_files", dir=f"{home()}/{sys.argv[2]}", show_hidden=1)["data"]:
            print(f["nicemode"], f["size"], f["file"])
    elif cmd == "enviar":
        ok, err = enviar(sys.argv[2], sys.argv[3])
        print("enviado" if ok else f"falhou: {err}")
    elif cmd == "baixar":
        r = uapi("Fileman", "get_file_content", dir=f"{home()}/{sys.argv[2]}", file=sys.argv[3])
        Path(sys.argv[4]).write_text(r["data"]["content"], encoding="utf-8", newline="")
        print("baixado", sys.argv[4])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
