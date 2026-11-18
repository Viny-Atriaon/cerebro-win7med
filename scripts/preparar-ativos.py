"""Prepara os ativos binários do Motor 1 (rodar só quando a logo ou a fonte mudarem).
Saída em motor1-diagnostico/ativos/: logo-win7med.png (cores oficiais), logo-win7med-negativo.png (texto preto vira branco,
para fundo escuro), outfit-400.woff2 e outfit-700.woff2 (subconjunto latino), OFL da fonte.
Uso: python -I scripts/preparar-ativos.py <logo.png> <pasta-com-Outfit-*.ttf>
"""
import sys
from pathlib import Path
from PIL import Image
from fontTools import subset
from fontTools.ttLib import TTFont

RAIZ = Path(__file__).resolve().parent.parent
DEST = RAIZ / "motor1-diagnostico" / "ativos"
UNICODES = "U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2605,U+2713,U+2717"


def logo(origem: Path) -> None:
    im = Image.open(origem).convert("RGBA")
    largura = 720
    im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    im.save(DEST / "logo-win7med.png", optimize=True)
    # negativo: pixels quase pretos (texto "Win" e "Med") viram branco; cores do 7 e a linha ficam
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a > 0 and max(r, g, b) < 70:
                px[x, y] = (255, 255, 255, a)
            elif a > 0 and b > r and b > g and r < 60 and (b - r) > 60 and max(r, g, b) < 175:
                # azul petróleo de "Imagem" e da linha clareado para ler no escuro
                px[x, y] = (min(255, r + 90), min(255, g + 110), min(255, b + 80), a)
    im.save(DEST / "logo-win7med-negativo.png", optimize=True)


def fontes(pasta: Path) -> None:
    for peso, nome in ((400, "Outfit-Regular.ttf"), (700, "Outfit-Bold.ttf")):
        f = TTFont(pasta / nome)
        opt = subset.Options()
        opt.flavor = "woff2"
        opt.layout_features = ["kern", "liga", "calt", "tnum", "lnum"]
        opt.name_IDs = ["*"]
        opt.notdef_outline = True
        s = subset.Subsetter(options=opt)
        s.populate(unicodes=subset.parse_unicodes(UNICODES))
        s.subset(f)
        f.flavor = "woff2"
        f.save(DEST / f"outfit-{peso}.woff2")
    (DEST / "Outfit-OFL.txt").write_bytes((pasta / "Outfit-OFL.txt").read_bytes())



if __name__ == "__main__":
    DEST.mkdir(parents=True, exist_ok=True)
    logo(Path(sys.argv[1]))
    fontes(Path(sys.argv[2]))
    for p in sorted(DEST.iterdir()):
        print(f"{p.name}: {p.stat().st_size / 1024:.1f} KB")
