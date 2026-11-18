"""QA da apresentação do onboarding (Playwright): abre o Gerador, gera o exemplo, apresenta, percorre os passos,
responde as perguntas como na reunião, gera o Mapa e confere o arquivo baixado. Tira prints em computador e celular.

Uso: python motor1-diagnostico/scripts/qa_onboarding.py <gerador.html> <pasta-dos-prints> [dados.json]
Sem dados.json usa o exemplo de saúde embutido no Gerador. Com cliente.setor "geral", confere também que nenhum termo de saúde aparece.
Código de saída 1 se houver erro de console, rolagem horizontal, Mapa não gerado ou nota de condução no Mapa.
"""
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright


def main() -> int:
    gerador = Path(sys.argv[1]).resolve()
    pasta = Path(sys.argv[2]).resolve()
    pasta.mkdir(parents=True, exist_ok=True)
    dados_arq = Path(sys.argv[3]).resolve() if len(sys.argv) > 3 else None
    dados_json = dados_arq.read_text(encoding='utf-8') if dados_arq else None
    geral = bool(dados_json) and json.loads(dados_json).get('cliente', {}).get('setor') == 'geral'
    pre = 'geral-' if geral else ''
    proibidos = ['clínica', 'paciente', 'exame', 'Win7 Med', 'Convênios aceitos'] if geral else []
    falhas = []
    with sync_playwright() as p:
        nav = p.chromium.launch()
        for largura, altura, rot in [(1440, 900, 'pc'), (375, 812, 'cel')]:
            ctx = nav.new_context(viewport={'width': largura, 'height': altura}, accept_downloads=True)
            pg = ctx.new_page()
            erros = []
            pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: erros.append(str(e)))
            pg.goto(gerador.as_uri())
            pg.wait_for_timeout(700)
            if dados_json:
                pg.fill('#dados', dados_json)
                pg.click('#gerar')
                pg.wait_for_timeout(400)
            pg.evaluate('try{localStorage.clear()}catch(e){}')
            if not pg.is_visible('#dk'):  # o arquivo de um cliente já abre na apresentação
                pg.click('#apresentar')
            pg.wait_for_selector('#dk:not([hidden])')
            total = int(pg.inner_text('.dk-pontos').split('/')[1])
            vistos = []
            for i in range(total):
                titulo = pg.locator('.dk-slide h2, .dk-slide h1').first.inner_text()
                vistos.append(titulo)
                corpo_slide = pg.inner_text('.dk-slide') + ' ' + pg.inner_text('.dk-notas')
                for w in proibidos:
                    if w.lower() in corpo_slide.lower():
                        falhas.append(f'{rot}: termo de saúde "{w}" no passo {i + 1} ({titulo})')
                sw = pg.evaluate('document.querySelector(".dk-palco").scrollWidth - document.querySelector(".dk-palco").clientWidth')
                if sw > 2:
                    falhas.append(f'{rot}: rolagem horizontal no passo {i + 1} ({titulo})')
                if i in (0, 1, 3, 6, 7, 8, total - 2, total - 1) or rot == 'pc' and i == 9:
                    pg.wait_for_timeout(350)
                    pg.screenshot(path=str(pasta / f'onb-{pre}{rot}-{i + 1:02d}.png'))
                slide = pg.locator('.dk-slide')
                # responde como na reunião
                if 'investir' in titulo:
                    pg.fill('input[data-campo="verba.mensal"]', '3.000')
                    pg.wait_for_timeout(100)
                    calc = pg.inner_text('#dk-calc')
                    if '2 páginas' not in calc:
                        falhas.append(f'{rot}: regra de verba não mostrou 2 páginas para R$ 3.000 ({calc!r})')
                elif 'Nossa recomendação' in titulo:
                    pg.locator('.dk-slide [data-acao="escolher-dominio"]').first.click()
                elif 'além da página principal' in titulo:
                    caixas = slide.locator('input[type="checkbox"]')
                    caixas.nth(0).check(); caixas = pg.locator('.dk-slide input[type="checkbox"]'); caixas.nth(1).check()
                elif 'concorrentes não têm' in titulo:
                    pg.click('[data-campo="diferenciais.parcelamento.tem"][data-valor="sim"]')
                    pg.fill('input[data-campo="diferenciais.parcelamento.vezes"]', '12')
                    pg.fill('input[data-campo="diferenciais.parcelamento.sem_juros"]', '6')
                    pg.click('[data-campo="diferenciais.estacionamento.tem"][data-valor="sim"]')
                    pg.fill('input[data-campo="diferenciais.estacionamento.detalhe"]', 'próprio e gratuito')
                    pg.click('.dk-slide [data-alterna="diferenciais.pagamento.pix"]')
                elif titulo.startswith('Convênios'):
                    pg.click('[data-campo="convenios.situacao"][data-valor="sim"]')
                elif 'regiões' in titulo:
                    botoes = pg.locator('.dk-slide [data-valor="false"]')
                    if botoes.count():
                        botoes.last.click()
                    for k in range(pg.locator('.dk-cidade').count()):
                        linha = pg.locator('.dk-cidade').nth(k)
                        if linha.locator('[aria-pressed="true"]').count() == 0:
                            linha.locator('[data-valor="true"]').click()
                elif 'Depoimentos' in titulo:
                    pg.click('[data-campo="depoimentos.tem"][data-valor="nao"]')
                    pg.click('[data-campo="depoimentos.vai_gravar"][data-valor="sim"]')
                    pg.fill('input[data-campo="depoimentos.prazo"]', (date.today() + timedelta(days=2)).strftime('%d/%m'))
                elif 'vídeo de apresentação' in titulo.lower():
                    pg.click('[data-campo="video_home.opcao"][data-valor="cliente"]')
                elif 'confirmar os dados' in titulo:
                    for k in range(pg.locator('.dk-slide [data-valor="ok"]').count()):
                        pg.locator('.dk-slide [data-valor="ok"]').nth(k).click()
                    campo_wa = pg.locator('.dk-slide input[data-campo^="dados_cliente"][data-campo$=".valor"]')
                    for k in range(campo_wa.count()):
                        campo_wa.nth(k).fill('64990000000')
                    pg.fill('input[data-campo="participantes"]', 'Equipe do cliente e Win7 (teste)')
                if i < total - 1:
                    pg.click('[data-acao="prox"]')
                    pg.wait_for_timeout(120)
            # notas de condução visíveis só quando pedidas
            pg.keyboard.press('n')
            notas_visiveis = pg.is_visible('.dk-notas')
            pg.keyboard.press('n')
            if not notas_visiveis:
                falhas.append(f'{rot}: tecla N não abriu as notas')
            pg.screenshot(path=str(pasta / f'onb-{pre}{rot}-fim.png'), full_page=False)
            bloqueios = pg.locator('.dk-val.erros li').all_inner_texts()
            if bloqueios:
                falhas.append(f'{rot}: Mapa bloqueado: {bloqueios}')
            else:
                pg.click('[data-acao="gerar-mapa"]')  # abre a impressão (Salvar como PDF); o HTML vem pelo botão de baixar
                pg.wait_for_timeout(500)
                with pg.expect_download() as d:
                    pg.click('[data-acao="baixar-mapa"]')
                html = Path(d.value.path()).read_text(encoding='utf-8')
                (pasta / f'mapa-{pre}{rot}.html').write_text(html, encoding='utf-8')
                texto_mapa = re.sub(r'<[^>]+>', ' ', re.sub(r'<style.*?</style>', '', html, flags=re.S))
                for w in proibidos:
                    if w.lower() in texto_mapa.lower():
                        falhas.append(f'{rot}: termo de saúde "{w}" no Mapa')
                with pg.expect_download() as d2:
                    pg.click('[data-acao="baixar-json"]')
                dados = json.loads(Path(d2.value.path()).read_text(encoding='utf-8'))
                print(f'{rot}: Mapa {len(html) // 1024} KB · verba {dados["decisoes"]["verba"]["mensal"]} em {dados["decisoes"]["verba"]["paginas"]} páginas · serviços {dados["decisoes"]["servicos"]} · pendências {len(dados["pendencias"])}')
                if 'Como conduzir' in html or 'Pergunte:' in html or 'Explique' in html:
                    falhas.append(f'{rot}: nota de condução vazou para o Mapa')
            # recuperação: recarrega e reabre
            pg.reload(); pg.wait_for_timeout(600)
            if not pg.is_visible('#dk'):
                pg.click('#apresentar')
            pg.wait_for_timeout(400)
            if 'recuperadas' not in pg.inner_text('#dk'):
                falhas.append(f'{rot}: respostas não foram recuperadas depois de recarregar')
            print(f'{rot}: {total} passos · erros de console: {erros or "nenhum"}')
            falhas += [f'{rot}: console: {e}' for e in erros]
            ctx.close()
        nav.close()
    for f in falhas:
        print('❌', f)
    print('QA do onboarding:', 'ok' if not falhas else f'{len(falhas)} falha(s)')
    return 1 if falhas else 0


if __name__ == '__main__':
    sys.exit(main())
