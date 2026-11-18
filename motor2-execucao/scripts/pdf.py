"""HTML para PDF A4 com o Chromium do Playwright (o weasyprint falha no Windows sem GTK). Robô 3, ADR-007.

Uso: python motor2-execucao/scripts/pdf.py <arquivo.html> [<arquivo.html> ...]
Cada PDF sai ao lado do HTML, com o mesmo nome. Imprime as páginas de cada um.
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


def main():
    arquivos = [Path(a).resolve() for a in sys.argv[1:]]
    if not arquivos:
        print('Uso: python pdf.py <arquivo.html> ...', file=sys.stderr)
        sys.exit(2)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for a in arquivos:
            pg.goto(a.as_uri())
            pg.wait_for_load_state('networkidle')
            saida = a.with_suffix('.pdf')
            pg.pdf(path=str(saida), format='A4', print_background=True, prefer_css_page_size=True)
            try:
                import fitz
                with fitz.open(saida) as d:
                    n = d.page_count
            except Exception:
                n = '?'
            print(f'{saida.name}: {n} página(s)')
        b.close()


if __name__ == '__main__':
    main()
