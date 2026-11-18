---
name: diagnostico
description: Motor 1 do Cérebro Win7 Med dentro do Claude Code. Conduz o Agente de Diagnóstico (qualquer segmento: saúde com a marca Win7 Med, os demais com a marca Win7; perguntas, investigação da busca, do site e do Google Meu Negócio, raio, termos, verba) e gera o Diagnóstico para Google Ads em HTML, que na reunião vira a apresentação ao vivo do onboarding e o Mapa do Onboarding. Use quando o Viny disser "diagnóstico", "Motor 1", "diagnóstico de Google Ads", "onboarding" ou mandar links e conversa comercial de um cliente novo.
---

# /diagnostico · Motor 1 no Claude Code

A fonte única do agente é `agente/AGENTE-DIAGNOSTICO-WIN7MED.md`. **Leia o arquivo inteiro e siga-o**: abertura, perguntas, investigação, critérios, raio, termos, regras de escrita e modelo do bloco de dados. Este arquivo só acrescenta o que muda no Claude Code.

## Fluxo do chat (principal, ADR-006)
1. O Viny passa no chat os links, prints, a logo (se tiver) e a conversa do comercial. Siga o agente para investigar e montar o bloco.
2. Salve o bloco em `clientes/<slug>/diagnostico.json` e a logo em `clientes/<slug>/logo.png` (ou .jpg, .webp, .svg).
3. Rode `node motor1-diagnostico/scripts/cliente.mjs clientes/<slug>/diagnostico.json --publicar` (use `--servico "..."` se o serviço principal da página não for o primeiro de `servicos_foco`).
4. Rode o QA da LP: `python motor1-diagnostico/scripts/qa_lp_modelo.py clientes/_lp-modelos/site <token> <pasta>` e olhe os prints de 375 e 1440 px.
5. Envie ao Viny, com SendUserFile, o diagnóstico e o `onboarding-<slug>.html`. Mande também o link do modelo. O link já está no diagnóstico e no passo "O modelo da sua página" da apresentação.

## Diferenças no Claude Code
- Investigue com o navegador embutido (`mcp__Claude_Browser__*`): perfil do Google Maps, busca "exame + cidade" e pelo nome da clínica, site em 1440 e 390 px. Registre data e origem de cada dado. Se o Google não carregar, peça os prints à equipe.
- Salve o bloco de dados em `clientes/<slug>/diagnostico.json` (pasta fora do git) e gere o diagnóstico:

```bash
node motor1-diagnostico/scripts/gerar.mjs clientes/<slug>/diagnostico.json
python motor1-diagnostico/scripts/qa_prints.py clientes/<slug>/diagnostico-google-ads-<slug>.html
```

- Se o cliente mandou logo: acrescente `--logo clientes/<slug>/logo.png`.
- Corrija o JSON (nunca o HTML) até zero erros. Olhe os prints de 375 e 1440 px.
- Defina `cliente.setor` (`saude` ou `geral`) antes de tudo: muda vocabulário, logo e o critério de RT.
- Entregue ao Viny o caminho do diagnóstico, o placar, os avisos e as pendências. O diagnóstico só vai para a reunião depois da revisão humana.
- Para ensaiar a reunião: `npm run build`, abra `dist/gerador-diagnostico-win7med.html`, cole o bloco e clique em Apresentar no onboarding. Para conferir por máquina: `python motor1-diagnostico/scripts/qa_onboarding.py dist/publico/index.html <pasta> clientes/<slug>/diagnostico.json`.

## Nunca
- Escrever HTML do diagnóstico à mão ou editar o arquivo gerado.
- Colocar contato, foto ou nome de consultor no diagnóstico.
- Fazer conta no texto (o motor calcula).
- Commitar `clientes/`.
- Pôr na LP modelo vídeo, foto ou depoimento de cliente real, ou nome de convênio real. O modelo usa só a base da Win7.
