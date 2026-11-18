"""Cérebro Win7 Med · Motor 1 · prints de QA do diagnóstico (375, 768 e 1440 px) e teste de rolagem horizontal.

Uso: python qa_prints.py <arquivo.html>
Saída: <pasta do html>/qa/<nome>-<largura>.png e um resumo. Código de saída 1 se houver rolagem horizontal.
Requer Playwright para Python já instalado (está nesta máquina; sem dependência nova).
"""
import sys
from pathlib import Path

LARGURAS = [(375, 812), (768, 1024), (1440, 900)]


def main() -> int:
    if len(sys.argv) < 2:
        print("uso: python qa_prints.py <arquivo.html>")
        return 2
    html = Path(sys.argv[1]).resolve()
    if not html.exists():
        print(f"arquivo não encontrado: {html}")
        return 2
    from playwright.sync_api import sync_playwright

    pasta = html.parent / "qa"
    pasta.mkdir(exist_ok=True)
    falhas = 0
    with sync_playwright() as p:
        navegador = p.chromium.launch()
        for largura, altura in LARGURAS:
            pagina = navegador.new_page(viewport={"width": largura, "height": altura}, device_scale_factor=1)
            pagina.goto(html.as_uri())
            pagina.wait_for_timeout(300)
            scroll_w = pagina.evaluate("document.documentElement.scrollWidth")
            inner_w = pagina.evaluate("window.innerWidth")
            altura_total = pagina.evaluate("document.documentElement.scrollHeight")
            destino = pasta / f"{html.stem}-{largura}.png"
            pagina.screenshot(path=str(destino), full_page=True)
            estado = "ok" if scroll_w <= inner_w else "ROLAGEM HORIZONTAL"
            if scroll_w > inner_w:
                falhas += 1
            print(f"{'✅' if scroll_w <= inner_w else '❌'} {largura}px: {estado} (scrollWidth {scroll_w}, altura {altura_total}px) → {destino}")
            pagina.close()
        navegador.close()
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
