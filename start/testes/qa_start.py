"""QA de ponta a ponta do start.win7.ai com a API (ADR-008), no navegador (Playwright), contra uma instância descartável do PHP.

Percorre o caminho que tinha falhado: entrar pelo convite, gerar o diagnóstico na Análise (fica salvo), apresentar o
onboarding (cada resposta salva), gerar o mapeamento (salvo) e, em OUTRO navegador sem nada guardado, reabrir o projeto
pela aba Projetos com as respostas. Tira prints em computador e celular e confere rolagem horizontal e erros de console.

Uso: python start/testes/qa_start.py <pasta-dos-prints>      (rode antes: npm run build)
Código de saída 1 se alguma etapa falhar.
"""
import hashlib
import json
import os
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

START = Path(__file__).resolve().parents[1]
RAIZ = START.parent


def comando_php():
    if os.environ.get("PHP_EXE"):
        return [os.environ["PHP_EXE"]]
    if os.name != "nt":
        return ["php"]
    pasta = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    achada = next((p for p in pasta.iterdir() if p.name.startswith("PHP.PHP.8")), None) if pasta.exists() else None
    exe = achada / "php.exe" if achada else Path("php")
    return [str(exe), "-c", str(START / "php-dev.ini"), "-d", f"extension_dir={exe.parent / 'ext'}"]


def subir():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); porta = s.getsockname()[1]; s.close()
    dados = Path(tempfile.mkdtemp(prefix="w7-start-qa-"))
    token = secrets.token_hex(20)
    semente = {hashlib.sha256(token.encode()).hexdigest(): {"email": "", "nome": "Admin Teste", "papel": "admin", "expira": time.time() * 1000 + 3600e3, "criado_por": "qa"}}
    (dados / "convites-semente.json").write_text(json.dumps(semente), encoding="utf-8")
    env = {**os.environ, "DADOS_DIR": str(dados), "START_DIST": str(RAIZ / "dist" / "start")}
    proc = subprocess.Popen([*comando_php(), "-S", f"127.0.0.1:{porta}", str(START / "roteador-dev.php")], cwd=RAIZ, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    base = f"http://127.0.0.1:{porta}"
    for _ in range(80):
        try:
            urllib.request.urlopen(base + "/api/saude", timeout=2)
            break
        except Exception:
            time.sleep(0.15)
    return base, token, dados, proc


def responder(pg, fr, falhas, rot):
    """Percorre a apresentação respondendo como na reunião (mesmas respostas do qa_onboarding)."""
    total = int(fr.locator(".dk-pontos").inner_text().split("/")[1])
    for i in range(total):
        titulo = fr.locator(".dk-slide h2, .dk-slide h1").first.inner_text()
        slide = fr.locator(".dk-slide")
        if "investir" in titulo:
            fr.locator('input[data-campo="verba.mensal"]').fill("3.000")
        elif "Nossa recomendação" in titulo:
            fr.locator('.dk-slide [data-acao="escolher-dominio"]').first.click()
        elif "além da página principal" in titulo:
            slide.locator('input[type="checkbox"]').nth(0).check(); fr.locator('.dk-slide input[type="checkbox"]').nth(1).check()
        elif "concorrentes não têm" in titulo:
            fr.locator('[data-campo="diferenciais.parcelamento.tem"][data-valor="sim"]').click()
            fr.locator('input[data-campo="diferenciais.parcelamento.vezes"]').fill("12")
            fr.locator('input[data-campo="diferenciais.parcelamento.sem_juros"]').fill("6")
        elif titulo.startswith("Convênios"):
            fr.locator('[data-campo="convenios.situacao"][data-valor="sim"]').click()
        elif "regiões" in titulo:
            for k in range(fr.locator(".dk-cidade").count()):
                linha = fr.locator(".dk-cidade").nth(k)
                if linha.locator('[aria-pressed="true"]').count() == 0:
                    linha.locator('[data-valor="true"]').click()
        elif "Depoimentos" in titulo:
            fr.locator('[data-campo="depoimentos.tem"][data-valor="nao"]').click()
            fr.locator('[data-campo="depoimentos.vai_gravar"][data-valor="sim"]').click()
            fr.locator('input[data-campo="depoimentos.prazo"]').fill((date.today() + timedelta(days=2)).strftime("%d/%m"))
        elif "vídeo de apresentação" in titulo.lower():
            fr.locator('[data-campo="video_home.opcao"][data-valor="cliente"]').click()
        elif "confirmar os dados" in titulo:
            for k in range(fr.locator('.dk-slide [data-valor="ok"]').count()):
                fr.locator('.dk-slide [data-valor="ok"]').nth(k).click()
            campo = fr.locator('.dk-slide input[data-campo^="dados_cliente"][data-campo$=".valor"]')
            for k in range(campo.count()):
                campo.nth(k).fill("64990000000")
            fr.locator('input[data-campo="participantes"]').fill("Equipe do cliente e Win7 (teste)")
        if i < total - 1:
            fr.locator('[data-acao="prox"]').click()
            pg.wait_for_timeout(90)
    bloqueios = fr.locator(".dk-val.erros li").all_inner_texts()
    if bloqueios:
        falhas.append(f"{rot}: Mapa bloqueado: {bloqueios}")


def sem_rolagem(pg, rot, falhas, onde):
    sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    if sw > 1:
        falhas.append(f"{rot}: rolagem horizontal de {sw}px em {onde}")


def main() -> int:
    pasta = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else RAIZ / "saida" / "qa-start"
    pasta.mkdir(parents=True, exist_ok=True)
    exemplo = json.loads((RAIZ / "motor1-diagnostico/exemplos/exemplo-ficticio.json").read_text(encoding="utf-8"))
    exemplo["cliente"]["nome"] = "Clínica Teste Salvamento"
    exemplo["meta"]["aviso"] = "Teste de QA do salvamento (dados inventados)."
    base, token, dados, proc = subir()
    falhas, erros = [], []
    senha = "senha-qa-" + secrets.token_hex(6)
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch()
            # ---------------- 1. computador: convite, análise, onboarding, mapeamento
            ctx = nav.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
            pg = ctx.new_page()
            pg.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: erros.append(str(e)))
            pg.goto(base + "/#convite=" + token)
            pg.wait_for_selector("#porta-convite:not([hidden])")
            pg.wait_for_timeout(450)
            pg.screenshot(path=str(pasta / "start-pc-01-convite.png"))
            # convite do primeiro administrador, como a publicação semeia: sem e-mail, a pessoa escreve o dela
            if pg.get_attribute("#ac-email", "readonly") is not None:
                falhas.append("pc: convite sem e-mail deixou o campo de e-mail travado")
            pg.fill("#ac-email", "admin@teste.local")
            pg.fill("#ac-senha", senha); pg.fill("#ac-senha2", senha)
            pg.click("#form-aceitar button[type=submit]")
            pg.wait_for_selector("#abas:not([hidden])")
            pg.wait_for_timeout(400)
            pg.wait_for_timeout(450)
            pg.screenshot(path=str(pasta / "start-pc-02-inicio.png"))
            pg.click('[data-aba="analise"]')
            fr = pg.frame_locator("#v-analise iframe")
            fr.locator("#dados").fill(json.dumps(exemplo, ensure_ascii=False))
            fr.locator("#gerar").click()
            fr.locator("#msg-sistema.ok").wait_for(timeout=10000)
            if "no sistema" not in fr.locator("#msg-sistema").inner_text():
                falhas.append("pc: diagnóstico não foi salvo no sistema")
            pg.wait_for_timeout(450)
            pg.screenshot(path=str(pasta / "start-pc-03-analise-salva.png"))
            fr.locator("#apresentar").click()
            fr.locator("#dk:not([hidden])").wait_for()
            responder(pg, fr, falhas, "pc")
            pg.wait_for_timeout(1800)
            salvo = fr.locator(".dk-salvo").inner_text()
            if "Salvo no sistema" not in salvo:
                falhas.append(f"pc: respostas não salvas no sistema ({salvo!r})")
            with pg.expect_download():
                fr.locator('[data-acao="gerar-mapa"]').click()
            pg.wait_for_timeout(1500)
            salvo = fr.locator(".dk-salvo").inner_text()
            if "Mapeamento salvo no sistema" not in salvo:
                falhas.append(f"pc: mapeamento não salvo no sistema ({salvo!r})")
            pg.wait_for_timeout(450)
            pg.screenshot(path=str(pasta / "start-pc-04-mapa-salvo.png"))
            fr.locator('[data-acao="sair"]').first.click()
            pg.click('[data-aba="projetos"]')
            pg.wait_for_selector(".projeto")
            pg.wait_for_timeout(300)
            linha = pg.inner_text(".projeto")
            if "Clínica Teste Salvamento" not in linha or "Mapeamento pronto" not in linha:
                falhas.append(f"pc: projeto não aparece pronto na lista ({linha!r})")
            pg.click('.projeto [data-acao="historico"]')
            pg.wait_for_selector(".detalhe li")
            pg.wait_for_timeout(450)
            pg.screenshot(path=str(pasta / "start-pc-05-projetos.png"))
            # equipe: gerar convite
            pg.goto(base + "/#equipe")
            pg.wait_for_selector(".pessoa")
            pg.fill("#cv-nome", "Pessoa da Equipe"); pg.fill("#cv-email", "pessoa@teste.local")
            pg.click("#form-convite button[type=submit]")
            pg.wait_for_selector("#link-convite:not([hidden])")
            pg.wait_for_timeout(450)
            pg.screenshot(path=str(pasta / "start-pc-06-equipe.png"))
            sem_rolagem(pg, "pc", falhas, "equipe")
            ctx.close()

            # ---------------- 2. outro computador, sem nada guardado: reabre o projeto
            ctx2 = nav.new_context(viewport={"width": 1440, "height": 900})
            pg2 = ctx2.new_page()
            pg2.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)
            pg2.on("pageerror", lambda e: erros.append(str(e)))
            pg2.goto(base + "/")
            pg2.wait_for_selector("#porta-entrar:not([hidden])")
            pg2.wait_for_timeout(450)
            pg2.screenshot(path=str(pasta / "start-pc-07-entrar.png"))
            pg2.fill("#en-email", "admin@teste.local"); pg2.fill("#en-senha", senha)
            pg2.click("#form-entrar button[type=submit]")
            pg2.wait_for_selector("#abas:not([hidden])")
            pg2.goto(base + "/#projetos")
            pg2.wait_for_selector('.projeto [data-acao="abrir"]')
            pg2.click('.projeto [data-acao="abrir"]')
            fr2 = pg2.frame_locator("#v-analise iframe")
            fr2.locator("#msg-sistema.ok").wait_for(timeout=10000)
            if "Clínica Teste Salvamento" not in fr2.locator("#res-cliente").inner_text():
                falhas.append("outro computador: o diagnóstico do projeto não abriu")
            fr2.locator("#apresentar").click()
            fr2.locator("#dk:not([hidden])").wait_for()
            pg2.wait_for_timeout(500)
            if "Salvo no sistema" not in fr2.locator(".dk-salvo").inner_text():
                falhas.append("outro computador: a apresentação não mostrou que as respostas vieram do sistema")
            # vai até o passo da verba e confere o valor respondido no primeiro computador
            achou = False
            total = int(fr2.locator(".dk-pontos").inner_text().split("/")[1])
            fr2.locator('[data-acao="sair"]').first.click(); fr2.locator("#apresentar").click(); fr2.locator("#dk:not([hidden])").wait_for()
            for _ in range(total):
                if fr2.locator('input[data-campo="verba.mensal"]').count():
                    achou = fr2.locator('input[data-campo="verba.mensal"]').input_value() == "3.000"
                    break
                if fr2.locator('[data-acao="ant"]').first.is_enabled():
                    fr2.locator('[data-acao="ant"]').first.click(); pg2.wait_for_timeout(60)
                else:
                    break
            if not achou:
                falhas.append("outro computador: a verba respondida (3.000) não voltou do sistema")
            pg2.wait_for_timeout(450)
            pg2.screenshot(path=str(pasta / "start-pc-08-reaberto.png"))
            ctx2.close()

            # ---------------- 3. celular: entrar, projetos e equipe
            ctx3 = nav.new_context(viewport={"width": 375, "height": 812}, is_mobile=True, has_touch=True)
            pg3 = ctx3.new_page()
            pg3.on("pageerror", lambda e: erros.append(str(e)))
            pg3.goto(base + "/")
            pg3.wait_for_selector("#porta-entrar:not([hidden])")
            sem_rolagem(pg3, "cel", falhas, "entrar")
            pg3.wait_for_timeout(450)
            pg3.screenshot(path=str(pasta / "start-cel-01-entrar.png"))
            pg3.fill("#en-email", "admin@teste.local"); pg3.fill("#en-senha", senha)
            pg3.click("#form-entrar button[type=submit]")
            pg3.wait_for_selector("#abas:not([hidden])")
            pg3.wait_for_timeout(300)
            sem_rolagem(pg3, "cel", falhas, "início")
            pg3.wait_for_timeout(450)
            pg3.screenshot(path=str(pasta / "start-cel-02-inicio.png"))
            pg3.goto(base + "/#projetos")
            pg3.wait_for_selector(".projeto")
            pg3.wait_for_timeout(300)
            sem_rolagem(pg3, "cel", falhas, "projetos")
            pg3.wait_for_timeout(450)
            pg3.screenshot(path=str(pasta / "start-cel-03-projetos.png"), full_page=True)
            pg3.click("#conta-botao")
            pg3.wait_for_timeout(450)
            pg3.screenshot(path=str(pasta / "start-cel-04-conta.png"))
            pg3.click("#menu-equipe")
            pg3.wait_for_selector(".pessoa")
            sem_rolagem(pg3, "cel", falhas, "equipe")
            pg3.wait_for_timeout(450)
            pg3.screenshot(path=str(pasta / "start-cel-05-equipe.png"), full_page=True)
            pg3.goto(base + "/#analise")
            pg3.wait_for_timeout(900)
            sem_rolagem(pg3, "cel", falhas, "análise")
            pg3.wait_for_timeout(450)
            pg3.screenshot(path=str(pasta / "start-cel-06-analise.png"))
            pg3.click("#conta-botao"); pg3.click("#sair")
            pg3.wait_for_selector("#porta-entrar:not([hidden])")
            ctx3.close()
            nav.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(dados, ignore_errors=True)
    erros_reais = [e for e in erros if "favicon" not in e]
    if erros_reais:
        falhas.append(f"erros de console: {erros_reais[:5]}")
    for f in falhas:
        print("❌ " + f)
    print(f"prints em {pasta}")
    print("QA do start: " + ("ok" if not falhas else f"{len(falhas)} falha(s)"))
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
