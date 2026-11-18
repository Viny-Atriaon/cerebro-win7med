---
name: robo3
description: Robô 3 do Cérebro Win7 Med (ADR-007). Depois da reunião de onboarding, a partir de uma PASTA LOCAL do cliente (diagnóstico, mapeamento da reunião, transcrição, logo), monta a ficha com a fala citada, o checklist do WhatsApp, a copy de cada página no padrão de LP da Win7, o roteiro de vídeo, o planejamento de Google Ads (padrão e SKAG, CSV do Editor), as páginas reais e publica a prévia e o domínio. Use quando o Viny disser "robô 3", "terceiro robô", "execução", "pós-reunião", mandar uma transcrição ou o caminho da pasta de um cliente.
---

# /robo3 · Robô 3 no Claude Code

A fonte única é `agente/AGENTE-EXECUCAO-WIN7MED.md`. **Leia o arquivo inteiro antes de começar e siga-o**; leia também `AGENTS.md` e `ESTADO.md` (ritual do projeto). Este arquivo é só o roteiro de operação.

## Ativação
A conversa começa com o comando inicial do botão "Copiar comando inicial" (página https://viny-atriaon.github.io/diagnostico-win7med/robo3.html, passo 4 do Gerador ou resumo da apresentação). Responda em uma frase que o robô 3 está ativo e peça o endereço da pasta do cliente; com a pasta, rode a etapa `ler` direto. Se a pasta for `clientes/<cliente>` e não existir com esse nome, o comando acha a pasta salva pelo robô 1; o mapeamento baixado na reunião é trazido de Downloads.

## Entrada
O Viny passa o caminho de uma pasta local do cliente (nunca Google Drive). Se ele não passou, peça o caminho. **Qualquer formato serve:** o comando reconhece pelo conteúdo o diagnóstico, o mapeamento da reunião e a transcrição, em JSON, HTML, PDF, DOCX, TXT ou MD, com qualquer nome. HTML do diagnóstico e do mapeamento traz os dados embutidos; PDF e os demais viram texto em `entregas-win7/_contexto/` para você ler e completar a ficha. Precisa de: o diagnóstico ou o mapeamento (ao menos um) e a transcrição. Logo, vídeos, `convenios/` e `integracoes.json` são opcionais. Nunca diga ao Viny que só aceita JSON.

## Passo a passo (pare em cada ponto de controle)
1. `node motor2-execucao/scripts/robo3.mjs "<pasta>" ler` e mostre ao Viny a lista de páginas (serviço, cidade, cliente) e o que falta na pasta.
2. Leia a transcrição inteira (`<pasta>/entregas-win7/_transcricao.txt`) e o `ficha-rascunho.json`. Complete a ficha seguindo a seção 4 do agente; cada fato tirado da reunião leva a fala copiada literalmente. Salve como `<pasta>/ficha.json`.
3. `node motor2-execucao/scripts/robo3.mjs "<pasta>" ficha`. Corrija até zero erros. Envie ao Viny (SendUserFile) `entregas-win7/01-ficha-do-cliente.pdf` e mostre a mensagem de `01-checklist-whatsapp.txt`. **Ponto de controle 1: espere o ok da ficha.**
4. Escreva `<pasta>/plano.json` (seções 5 a 7 do agente): copy de cada página pelo padrão de LP da Win7, roteiro de 9 blocos com a abertura fixa, grupos de palavras-chave por intenção a partir dos `termos` do Mapa, anúncios, sitelinks e frases.
5. `node motor2-execucao/scripts/robo3.mjs "<pasta>" entregas`. Erro de validação ou palavra-chave sem cobertura: ajuste o plano (nunca o HTML) e rode de novo. Envie ao Viny os PDFs de `entregas-win7/` (landing page formatada e roteiro de cada página, Google Ads) e diga onde está o `04-google-ads-editor.csv`.
6. Confira as páginas em `entregas-win7/site/` servidas por HTTP local em 375 e 1440 px (sem rolagem lateral, sem erro de console).
7. Com o ok do Viny: `node motor2-execucao/scripts/robo3.mjs "<pasta>" publicar --previa` e mande o link. **Ponto de controle 2: aprovação interna.**
8. Domínio, só com o ok dele e com o domínio pago, a zona criada no painel da Cloudflare e os DNS trocados no Registro.br: primeiro `publicar --dominio <dominio> --simular`, depois sem `--simular`.

## Nunca
- Inventar fato, número, convênio, depoimento ou selo; escrever HTML à mão; publicar campanha na conta do Google Ads.
- Ir ao domínio sem o RT confirmado (saúde) ou sem o ok do Viny na prévia.
- Commitar a pasta do cliente ou `entregas-win7/`.
