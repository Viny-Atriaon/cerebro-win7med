"""Texto de um documento do cliente (transcrição do Gemini, diagnóstico ou mapeamento) em .txt, .md, .pdf, .docx ou .html. Robô 3, ADR-007.

Uso: python motor2-execucao/scripts/ler_transcricao.py <arquivo>   (escreve o texto em UTF-8 na saída padrão)
.docx é lido direto do XML (sem python-docx); .pdf pelo PyMuPDF.
"""
import re
import sys
import zipfile
from pathlib import Path


def de_docx(arq):
    with zipfile.ZipFile(arq) as z:
        xml = z.read('word/document.xml').decode('utf-8', errors='ignore')
    xml = re.sub(r'</w:p>', '\n', xml)
    xml = re.sub(r'<w:tab/>', '\t', xml)
    xml = re.sub(r'<w:br[^>]*/>', '\n', xml)
    t = re.sub(r'<[^>]+>', '', xml)
    for a, b in (('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'), ('&quot;', '"'), ('&apos;', "'")):
        t = t.replace(a, b)
    return t


def de_pdf(arq):
    import fitz
    with fitz.open(arq) as d:
        return '\n'.join(p.get_text() for p in d)


def main():
    if len(sys.argv) < 2:
        print('Uso: python ler_transcricao.py <arquivo>', file=sys.stderr)
        sys.exit(2)
    arq = Path(sys.argv[1])
    ext = arq.suffix.lower()
    if ext == '.docx':
        t = de_docx(arq)
    elif ext in ('.html', '.htm'):
        import html as h
        bruto = arq.read_text(encoding='utf-8', errors='ignore')
        bruto = re.sub(r'(?is)<(script|style|head)[^>]*>.*?</\1>', ' ', bruto)
        bruto = re.sub(r'(?i)<br\s*/?>|</(p|div|li|h[1-6]|tr|section)>', '\n', bruto)
        t = h.unescape(re.sub(r'<[^>]+>', ' ', bruto))
    elif ext == '.pdf':
        t = de_pdf(arq)
    else:
        t = arq.read_text(encoding='utf-8', errors='ignore')
    t = re.sub(r'[ \t]+\n', '\n', t)
    t = re.sub(r'\n{3,}', '\n\n', t).strip() + '\n'
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stdout.write(t)


if __name__ == '__main__':
    main()
