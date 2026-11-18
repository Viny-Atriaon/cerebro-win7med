"""QA da LP modelo (ADR-006) servida por HTTP local, em 1440 e 375 px (Playwright).

Confere: sem rolagem horizontal, sem erro de console, nenhuma imagem quebrada, faixa de modelo visível,
formulários sem efeito (abrem o aviso e não fazem requisição), nenhuma requisição fora do próprio site
e das fontes do Google, nenhum link tel: ou WhatsApp. Tira prints da página inteira.

Uso: python motor1-diagnostico/scripts/qa_lp_modelo.py <pasta-do-site> <token> <pasta-dos-prints>
Código de saída 1 se alguma conferência falhar.
"""
import functools
import http.server
import sys
import threading
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

PERMITIDOS = {"fonts.googleapis.com", "fonts.gstatic.com"}


def main() -> int:
    site, token, pasta = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3]).resolve()
    pasta.mkdir(parents=True, exist_ok=True)
    class Silencioso(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    manipulador = functools.partial(Silencioso, directory=str(site))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), manipulador)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{srv.server_address[1]}/m/{token}/"
    falhas = []
    with sync_playwright() as p:
        nav = p.chromium.launch()
        for largura, altura, rot in [(1440, 900, "pc"), (375, 812, "cel")]:
            pg = nav.new_page(viewport={"width": largura, "height": altura})
            erros, externos, envios = [], [], []
            pg.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: erros.append(str(e)))

            def pedido(req):
                host = urlparse(req.url).hostname or ""
                if host not in ("127.0.0.1",) and host not in PERMITIDOS:
                    externos.append(req.url)
                if req.method == "POST":
                    envios.append(req.url)
            pg.on("request", pedido)
            pg.goto(url)
            pg.wait_for_load_state("networkidle")
            pg.wait_for_timeout(1800)
            sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            if sw > 0:
                falhas.append(f"{rot}: rolagem horizontal de {sw}px")
            quebradas = pg.evaluate("[...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src)")
            if quebradas:
                falhas.append(f"{rot}: imagens quebradas {quebradas}")
            if not pg.is_visible(".faixa-modelo"):
                falhas.append(f"{rot}: faixa de modelo invisível")
            if pg.locator("a[href^='tel:'], a[href*='wa.me'], a[href*='api.whatsapp']").count():
                falhas.append(f"{rot}: link de telefone ou WhatsApp ativo")
            pg.screenshot(path=str(pasta / f"lp-{rot}.png"), full_page=True)
            # CTA abre o pop-up; enviar o formulário só mostra o aviso
            pg.click(".cta")
            pg.fill("#agendar input[name=nome]", "Teste")
            pg.fill("#agendar input[name=telefone]", "61999999999")
            pg.click("#agendar button[type=submit]")
            pg.wait_for_timeout(300)
            if not pg.is_visible("#aviso"):
                falhas.append(f"{rot}: o envio do formulário não abriu o aviso de modelo")
            pg.screenshot(path=str(pasta / f"lp-{rot}-aviso.png"))
            pg.click("#aviso [data-fecha].ok")
            # barra: Ligar também só avisa
            pg.click(".barra .ligar")
            pg.wait_for_timeout(200)
            if not pg.is_visible("#aviso"):
                falhas.append(f"{rot}: o botão Ligar não abriu o aviso")
            pg.keyboard.press("Escape")
            if envios:
                falhas.append(f"{rot}: requisições de envio {envios}")
            if externos:
                falhas.append(f"{rot}: requisições externas {sorted(set(externos))}")
            falhas += [f"{rot}: console: {e}" for e in erros]
            print(f"{rot}: altura {pg.evaluate('document.documentElement.scrollHeight')} px · rolagem lateral {sw} · erros {len(erros)} · externos {len(set(externos))}")
            pg.close()
        nav.close()
    srv.shutdown()
    for f in falhas:
        print("❌", f)
    print("QA da LP modelo:", "ok" if not falhas else f"{len(falhas)} falha(s)")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
