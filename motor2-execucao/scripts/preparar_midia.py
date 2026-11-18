"""Mídias da página real a partir da pasta do cliente (padrão Win7, seção 10). Robô 3, ADR-007.

Uso: python motor2-execucao/scripts/preparar_midia.py <pasta-do-cliente> <pasta-assets>
Saída (JSON): {"logo": "logo.png", "video": "video-720.mp4", "poster": "poster.webp",
               "depoimentos": [{"video": "depoimento-1.mp4", "poster": "depoimento-1.webp"}],
               "convenios_logos": {"unimed": "convenios/unimed.webp"}, "logo_vetorial": true, "avisos": []}

- logo.(png|jpg|webp|svg) é copiada como está; logo*.svg/.pdf/.ai/.eps conta como logo vetorial.
- video*.(mp4|mov|m4v): 720p H.264 crf 26, AAC 96k, faststart (até 5 MB); poster 1200x675 do segundo 2.
- depoimento*.(mp4|mov|m4v): 720p na vertical; poster do segundo 1.
- convenios/<nome>.(png|jpg|webp|svg): 260x260 webp q88 em fundo branco; o nome do arquivo é o nome do convênio.
Refaz só o que mudou (compara a data dos arquivos).
"""
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

VIDEO = ('.mp4', '.mov', '.m4v')
IMAGEM = ('.png', '.jpg', '.jpeg', '.webp')


def chave(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def novo(origem, destino):
    return not destino.exists() or destino.stat().st_mtime < origem.stat().st_mtime


def ffmpeg(*args):
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], capture_output=True, text=True)
    return r.returncode == 0


def main():
    pasta, assets = Path(sys.argv[1]), Path(sys.argv[2])
    assets.mkdir(parents=True, exist_ok=True)
    out = {'logo': '', 'video': '', 'poster': '', 'depoimentos': [], 'convenios_logos': {}, 'logo_vetorial': False, 'avisos': []}
    arquivos = [a for a in pasta.iterdir() if a.is_file()]

    for a in arquivos:
        n = a.name.lower()
        if re.match(r'^logo\.(png|jpg|jpeg|webp|svg)$', n) and not out['logo']:
            ext = a.suffix.lower().replace('.jpeg', '.jpg')
            shutil.copyfile(a, assets / ('logo' + ext))
            out['logo'] = 'logo' + ext
        if n.startswith('logo') and a.suffix.lower() in ('.svg', '.pdf', '.ai', '.eps'):
            out['logo_vetorial'] = True

    videos = sorted(a for a in arquivos if a.suffix.lower() in VIDEO and a.name.lower().startswith('video'))
    if videos:
        v, dv, dp = videos[0], assets / 'video-720.mp4', assets / 'poster.webp'
        if novo(v, dv):
            ok = ffmpeg('-i', str(v), '-vf', 'scale=-2:720', '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '96k', str(dv))
            if not ok:
                out['avisos'].append(f'Não consegui converter o vídeo {v.name} (ffmpeg).')
        if dv.exists():
            out['video'] = dv.name
            if dv.stat().st_size > 5 * 1024 * 1024:
                out['avisos'].append(f'O vídeo ficou com {dv.stat().st_size // 1024 // 1024} MB (limite do padrão: 5 MB). Encurte ou aumente o crf.')
            if novo(dv, dp):
                ffmpeg('-ss', '2', '-i', str(dv), '-frames:v', '1', '-vf', 'scale=1200:675:force_original_aspect_ratio=increase,crop=1200:675', '-q:v', '82', str(dp))
            if dp.exists():
                out['poster'] = dp.name

    deps = sorted(a for a in arquivos if a.suffix.lower() in VIDEO and a.name.lower().startswith('depoimento'))
    for i, d in enumerate(deps[:6], 1):
        dv, dp = assets / f'depoimento-{i}.mp4', assets / f'depoimento-{i}.webp'
        if novo(d, dv):
            ffmpeg('-i', str(d), '-vf', 'scale=720:-2', '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '96k', str(dv))
        if dv.exists():
            if novo(dv, dp):
                ffmpeg('-ss', '1', '-i', str(dv), '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '80', str(dp))
            out['depoimentos'].append({'video': dv.name, 'poster': dp.name if dp.exists() else ''})

    conv = pasta / 'convenios'
    if conv.is_dir():
        (assets / 'convenios').mkdir(exist_ok=True)
        from PIL import Image
        for a in sorted(conv.iterdir()):
            if a.suffix.lower() not in IMAGEM:
                continue
            nome = re.sub(r'^\d+[-_ ]*', '', a.stem)
            d = assets / 'convenios' / (re.sub(r'[^a-z0-9]+', '-', chave(nome)).strip('-') + '.webp')
            if novo(a, d):
                im = Image.open(a).convert('RGBA')
                im.thumbnail((230, 230))
                fundo = Image.new('RGB', (260, 260), 'white')
                fundo.paste(im, ((260 - im.width) // 2, (260 - im.height) // 2), im)
                fundo.save(d, 'WEBP', quality=88)
            out['convenios_logos'][chave(nome)] = 'convenios/' + d.name

    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
