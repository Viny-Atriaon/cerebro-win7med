# Cérebro Win7 Med

Três robôs internos da Win7 Med (captação digital para saúde) para o processo inicial de clientes novos. Instalar em outro computador: `INSTALAR.md`. A equipe usa tudo numa tela só em https://start.win7.ai (Análise, Execução e os projetos salvos, com conta por convite; ADR-008).

1. **Motor 1 · Diagnóstico e onboarding** (`agente/` + `motor1-diagnostico/`): antes e durante a reunião de onboarding, para qualquer segmento (saúde com a marca Win7 Med, os demais com a marca Win7). O agente portátil (Markdown) faz as perguntas em qualquer IA, analisa a busca no Google, o site e página de destino, o Google Meu Negócio e a conversa comercial, e entrega um bloco de dados. O Gerador transforma o bloco no **Diagnóstico para Google Ads** e, na reunião, abre a **apresentação ao vivo** com as 8 decisões e as notas de condução. No fim, gera o **Mapa do Onboarding** (HTML e JSON). Agente e Gerador públicos: https://github.com/Viny-Atriaon/diagnostico-win7med · https://viny-atriaon.github.io/diagnostico-win7med/
2. **Robô 3 · Execução** (`motor2-execucao/`, ADR-007): depois da reunião, a partir de uma pasta local do cliente (diagnóstico, mapeamento da reunião, transcrição, logo). Entrega a ficha com a fala citada, o checklist do WhatsApp, a copy de cada página no padrão de LP da Win7, o roteiro de vídeo, as campanhas de Google Ads (padrão e SKAG, CSV do Editor), a cobertura das palavras-chave, as páginas reais e a prévia em previa.win7.ai, e publica no domínio. No Claude Code: `/robo3 <pasta>`; agente em `agente/AGENTE-EXECUCAO-WIN7MED.md`.

Planejamento completo: `docs/PLANEJAMENTO.md`. Decisões: `docs/adr/`. Estado atual: `ESTADO.md`.

## Como usar (Motor 1)

**Equipe (qualquer IA):** envie `agente/AGENTE-DIAGNOSTICO-WIN7MED.md` ou cole o link do repositório público numa conversa com Claude, ChatGPT ou Gemini. Responda as perguntas, copie o bloco de dados e cole no Gerador (online ou `dist/gerador-diagnostico-win7med.html`). Baixe o diagnóstico. Na reunião, clique em **Apresentar no onboarding**, siga os passos (tecla N mostra as notas de condução) e, no fim, clique em **Gerar Mapa do Onboarding**.

**Claude Code (fluxo principal, ADR-006):** passe no chat os links, prints, logo e a conversa do comercial. O Claude monta o bloco em `clientes/<slug>/diagnostico.json` e roda o comando único, que gera o diagnóstico, o arquivo do onboarding já aberto com o cliente e a LP modelo publicada em `modelo.win7.ai`. Skill `/diagnostico`, ou direto:

```bash
node motor1-diagnostico/scripts/cliente.mjs clientes/<slug>/diagnostico.json --logo clientes/<slug>/logo.png --publicar
node motor1-diagnostico/scripts/gerar.mjs clientes/<slug>/diagnostico.json
npm run build      # gera dist/publico (repositório público) e dist/gerador-diagnostico-win7med.html
```

## Verificação (padrão v3.5)

```bash
bash scripts/audit.sh .   # auditoria do código (roda no pre-push e no CI)
npm test                  # regressões: Motor 1 (matemática, placar, regras, sem dado pessoal, coerência agente × motor, verba, segmentos, onboarding, referência por hash), robô 3 e API do start (PHP local)
npm run qa:start          # start.win7.ai de ponta a ponta no navegador, contra uma instância descartável
npm run audit:runtime     # o que está no ar em start.win7.ai (cabeçalhos, saúde, arquivos sensíveis)
npm run golden            # só depois de revisar os prints de uma mudança visual intencional: regrava a referência
python motor1-diagnostico/scripts/qa_onboarding.py dist/publico/index.html <pasta-dos-prints> [dados.json]
python motor1-diagnostico/scripts/qa_lp_modelo.py clientes/_lp-modelos/site <token> <pasta-dos-prints>
```

Ative o hook uma vez por clone: `git config core.hooksPath .githooks`.

## Padrões
- Engenharia: Constituição de Engenharia Universal v3.5 (regra imutável). Ver `AGENTS.md`.
- Estrutura das landing pages: `../construtor-lp/PADRAO-LP-WIN7.md`.
