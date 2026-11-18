"""Cores principais da logo do cliente (ADR-007, etapa A).

Uso: python motor1-diagnostico/scripts/cores_logo.py <logo.png|jpg|webp|svg>
Saída (JSON): {"cores": [{"hex": "#rrggbb", "peso": 0.62}, ...], "monocromatica": false}

Só entram cores com saturação: branco, preto e cinza são ignorados (fundo, texto).
O peso é a fração dos pixels coloridos. A montagem da paleta (contraste, tom escuro do banner)
fica no lp-modelo.js, que é testado no Node; aqui só se lê a imagem.
"""
import colorsys
import json
import re
import sys
from pathlib import Path


def hex_de(r, g, b):
    return '#%02x%02x%02x' % (int(r), int(g), int(b))


def colorida(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return s >= 0.22 and 0.1 <= l <= 0.92


def agrupar(pixels):
    """Agrupa por tom (12 graus), claridade e saturação; devolve a média de cada grupo e o peso."""
    grupos = {}
    for r, g, b in pixels:
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        k = (int(h * 30), int(l * 5), int(s * 3))
        a = grupos.setdefault(k, [0, 0, 0, 0])
        a[0] += r; a[1] += g; a[2] += b; a[3] += 1
    total = sum(a[3] for a in grupos.values()) or 1
    lista = sorted(grupos.values(), key=lambda a: -a[3])
    saida = []
    for a in lista:
        cor = (a[0] / a[3], a[1] / a[3], a[2] / a[3])
        h, l, s = colorsys.rgb_to_hls(*(c / 255 for c in cor))
        # funde com um grupo já aceito de tom parecido
        par = None
        for x in saida:
            dh = abs(x['h'] - h) * 360
            if min(dh, 360 - dh) < 14 and abs(x['l'] - l) < 0.22:
                par = x
                break
        if par:
            par['n'] += a[3]
            continue
        saida.append({'rgb': cor, 'h': h, 'l': l, 'n': a[3]})
    saida.sort(key=lambda x: -x['n'])
    return [{'hex': hex_de(*x['rgb']), 'peso': round(x['n'] / total, 3)} for x in saida if x['n'] / total >= 0.03][:5]


def de_svg(texto):
    achados = []
    for m in re.finditer(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', texto):
        h = m.group(1)
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        achados.append(tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)))
    for m in re.finditer(r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', texto):
        achados.append(tuple(int(m.group(i)) for i in (1, 2, 3)))
    return [p for p in achados if colorida(*p)]


def de_imagem(caminho):
    from PIL import Image
    im = Image.open(caminho).convert('RGBA')
    im.thumbnail((160, 160))
    dados = im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()
    return [(r, g, b) for r, g, b, a in dados if a >= 200 and colorida(r, g, b)]


def main():
    if len(sys.argv) < 2:
        print('Uso: python cores_logo.py <logo>')
        sys.exit(2)
    arq = Path(sys.argv[1])
    pixels = de_svg(arq.read_text(encoding='utf-8', errors='ignore')) if arq.suffix.lower() == '.svg' else de_imagem(arq)
    cores = agrupar(pixels) if pixels else []
    print(json.dumps({'cores': cores, 'monocromatica': not cores}, ensure_ascii=False))


if __name__ == '__main__':
    main()
