# AGENTS.md — Cérebro Win7 Med
<!-- padrao seguido: constituicao universal v3.5 (marcador ASCII para o grep do audit.sh no Git Bash/Windows) -->
> Padrão seguido: Constituição de Engenharia Universal **v3.5** (fiscais v3.5.1) · Porte: **app-simples** (scripts, prompts e skills; um servidor pequeno em PHP só para os projetos salvos do start.win7.ai, ADR-008) · Auditado em: 14/10/2026 (F0)
> Fonte da norma (somente leitura, imutável): `github.com/Viny-Atriaon/padrao-engenharia-universal-publico`, commit `63f68e9` (v3.5.1, 08/10/2026). Cópia local: `../../Atriaon-maker/padrao-engenharia-universal-publico/` (atualizar com `git pull`). Os fiscais `scripts/audit.sh` e `scripts/audit-runtime.sh` são cópias versionadas desse commit (Kit §10).
> As regras são **invioláveis** por decisão do Owner (Viny, 14/10/2026). Exceção só com waiver datado em `.audit-waivers` ou registrada em `docs/CONFORMIDADE.md` com prazo e dono (GOV-ADOPT-01).
> Pendências de auditoria: ver `docs/CONFORMIDADE.md`.

## PENDÊNCIAS BLOQUEANTES (parâmetro não preenchido falha alto)
A IA não assume valor padrão para nenhuma delas.

| # | Pendência | Bloqueia |
|---|---|---|
| P-01 | Um prospect real com os links (Google Meu Negócio, site, Instagram, Facebook) e a conversa comercial | F2 |
| P-02 | Uma transcrição real do Gemini com o checklist do mesmo cliente | F7 (o robô 3 foi construído com uma transcrição fictícia) |
| ~~P-03~~ | Resolvida em 14/10 pelo ADR-007 e pelo adendo (seção 19) do `../construtor-lp/PADRAO-LP-WIN7.md` | ~~F4~~ |

## Ritual obrigatório de início de sessão (CTX-RITUAL-01)
1. Leia este arquivo inteiro.
2. Leia `ESTADO.md`: ele diz onde o trabalho parou e o que vem agora.
3. Leia os ADRs em `docs/adr/` citados no `ESTADO.md`.
4. Leia `docs/PLANEJAMENTO.md` se for a primeira sessão sobre um motor que ainda não existe.
5. SE for tocar área já corrigida: leia a entrada em `docs/CORRECOES.md`.
NUNCA comece a codar sem os passos 1 e 2. NUNCA pergunte "onde paramos?": o `ESTADO.md` responde.

## O projeto
- **O que é:** o Cérebro Win7 Med, sistema interno da Win7 Med (captação digital para saúde) com dois motores para clientes novos. Motor 1: Diagnóstico para Google Ads antes da reunião de onboarding, para qualquer segmento (saúde com a marca Win7 Med, os demais com a marca Win7), feito por um agente portátil em qualquer IA e montado pelo Gerador em HTML autossuficiente; na reunião, o mesmo Gerador abre a apresentação ao vivo com as 8 decisões e gera o Mapa do Onboarding (HTML e JSON) que alimenta o Motor 2 (ADR-005). Motor 2: depois da reunião, a partir da transcrição do Gemini, entrega copy de landing page no Padrão Win7, roteiro de vídeo, duas campanhas de Google Ads Pesquisa (padrão e SKAG), checklist de pendências para o grupo de WhatsApp e relatório de cobertura das palavras-chave. Planejamento completo em `docs/PLANEJAMENTO.md`; decisões do Owner em `docs/adr/001-escopo-e-decisoes.md`.
- **Robô 3 (ADR-007):** depois da reunião, a partir de uma PASTA LOCAL do cliente (sem Google Drive): ficha com a fala citada, checklist do WhatsApp, copy de cada página no padrão de LP da Win7, roteiro de vídeo (9 blocos, abertura fixa), Google Ads (padrão e SKAG, CSV do Editor), páginas reais no template da LP em modo `real`, prévia em previa.win7.ai e domínio do cliente. Agente: `agente/AGENTE-EXECUCAO-WIN7MED.md`.
- **Stack:** um motor em JavaScript sem dependências (`motor1-diagnostico/motor/motor-diagnostico.js`) que roda no navegador (Gerador) e no Node 24 (testes e linha de comando); agente portátil em Markdown (`agente/`); Python 3.12 + Playwright, Pillow e PyMuPDF (prints de QA, PDFs, cores da logo, preparo de ativos) e ffmpeg (vídeo). Sem banco: os projetos salvos do start.win7.ai ficam em JSON fora da pasta pública do servidor (PHP 8 sem dependências em `start/api/`, ADR-008). Acesso ao cPanel da Win7 e à Cloudflare por `servidor/cpanel.py` e `servidor/cloudflare.py`, com o token em `.segredos/credenciais.env` (fora do git; instalação em `INSTALAR.md`). Repositório **público** (ADR-009): `github.com/Viny-Atriaon/cerebro-win7med`; a história até 18/11/2026, com clientes reais, fica no privado `cerebro-win7med-historico`. Arquitetura em `docs/adr/003-motor1-portatil.md`.
- **Comandos:** fluxo do chat (diagnóstico + onboarding do cliente + LP modelo publicada): `node motor1-diagnostico/scripts/cliente.mjs clientes/<slug>/diagnostico.json [--logo arq] [--servico "..."] --publicar` · QA da LP modelo: `python motor1-diagnostico/scripts/qa_lp_modelo.py clientes/_lp-modelos/site <token> <pasta>` · gerar só um diagnóstico: `node motor1-diagnostico/scripts/gerar.mjs <dados.json>` · build do Gerador: `npm run build` · prints de QA: `python motor1-diagnostico/scripts/qa_prints.py <laudo.html>` · QA da apresentação ao vivo: `python motor1-diagnostico/scripts/qa_onboarding.py dist/publico/index.html <pasta> [dados.json]` · robô 3: `node motor2-execucao/scripts/robo3.mjs <pasta-do-cliente> ler|ficha|entregas|publicar [--previa | --dominio x [--simular]]` · regressão: `npm test` (Motor 1 e robô 3) · referência por hash (só depois de revisar prints): `npm run golden` · auditoria do padrão: `bash scripts/audit.sh .` · publicar o público: `npm run build` e depois commit + push dentro de `dist/publico` (repositório `Viny-Atriaon/diagnostico-win7med`) · tela única da equipe em https://start.win7.ai (login por convite, Análise, Execução e Projetos salvos, com o batimento): `npm run publicar:start` (servidor da Win7; fonte em `start/index.html` e a API em `start/api/`; primeiro administrador: `python -X utf8 scripts/publicar_start.py dist/start --convite-admin "Nome"`, link em `.segredos/start-convites.txt`) · regressão da API (PHP local): `npm run test:start` · QA de ponta a ponta no navegador: `npm run qa:start` · auditoria do que está no ar: `npm run audit:runtime` · ensaio de restauração da cópia do dia (cifrada, baixada pela tarefa Win7-BackupFora): `node start/testes/restaurar-copia.mjs "<Documentos>/Backups Win7/cerebro/<arquivo>"`.
- **Padrões irmãos:** estrutura das landing pages = `../construtor-lp/PADRAO-LP-WIN7.md` (base da página); engenharia = este padrão. Nenhum substitui o outro.

## Regras específicas deste projeto
- **Decisões do Owner valem acima de pareceres** (ADR-001). Onde o conselho divergiu (SKAG completa, construir agora), a decisão dele está registrada e não se reabre em silêncio.
- **Nunca inventar número.** Todo fato do dossiê tem `fonte` e `status` (`verificado`, `observado`, `informado`, `estimado`). Matemática em código (`motor1-diagnostico/motor/motor-diagnostico.js`), nunca no texto do modelo. Pacote e preços sempre vêm do humano.
- **HTML de template.** A IA nunca escreve HTML: entrega o bloco JSON e o motor monta o laudo. Mudança de visual = `motor/laudo.css` e `motor/motor-diagnostico.js`, com `npm test` e prints de novo.
- **Agente e motor andam juntos.** Mudou critério, chave ou formato no motor: atualize `agente/AGENTE-DIAGNOSTICO-WIN7MED.md` no mesmo commit (o teste de coerência reprova se divergir).
- **Sem dado pessoal e sem peça de venda** (ADR-004). O diagnóstico não leva consultora, contato, foto, painel ao vivo, case, proposta nem preço do contrato. Nunca copie dado de cliente real para o exemplo ou para `dist/publico`; a regressão reprova.
- **Segmento é dado** (ADR-005). Saúde e outros segmentos diferem só pelo vocabulário (`VOCAB`), pelos textos do roteiro (`TEXTOS_SETOR`) e pelo critério `so_saude`. Nunca `if` de segmento espalhado. O diagnóstico de saúde não pode mudar sem querer: a referência por hash reprova.
- **Notas de condução nunca chegam ao cliente.** Elas vivem no `ROTEIRO` de `onboarding/onboarding.js` e só aparecem no painel de notas; a regressão e o QA reprovam se vazarem para o Mapa.
- **Página real do robô 3** (ADR-007): mesmo template da LP modelo em modo `real`; noindex; RT obrigatório para ir ao domínio na saúde; política de privacidade; formulário Win7 ou pré-integração; campanha nunca publicada pelo robô; citação de fato da transcrição conferida por máquina. `conferirReal` e o publicador reprovam o resto.
- **LP modelo é demonstração, nunca página no ar** (ADR-006). Faixa de modelo fixa, noindex, formulário e telefone sem efeito, convênios "Convênio A", depoimentos sem rosto, mídia só da lista fechada (nunca vídeo de cliente real). `conferir` e o publicador reprovam o resto. A página real sai do mesmo template em modo `real` (ADR-007).
- **Projetos salvos só no start.win7.ai** (ADR-008, revoga em 18/11 a regra antiga "respostas não saem do aparelho" só ali): diagnóstico, respostas do onboarding e mapeamento vão para o servidor da Win7, com conta por pessoa (convite), sessão, limites e versões. O Gerador público e o arquivo do cliente continuam sem enviar nada. Uma pessoa preenche por vez; as demais acompanham pela tela compartilhada. Mudou rota ou regra da API: `start/testes/teste-api-abuso.mjs` no mesmo commit.
- **Repositório público** (ADR-009): nunca entra no git nome, cidade ou pasta de cliente real, link de prévia ou de modelo com token, dado da equipe, painel com token, IP de origem ou pasta da conta do servidor, nem segredo. Estado de cliente fica na pasta do cliente e nos projetos do start. Termo proibido novo nos testes entra como hash (`PROIBIDOS` em `teste-regressao.mjs`).
- **Saídas em português do Brasil, sem travessão** (vírgula, dois pontos ou "·"), sem emoji em botões, texto curto.
- **Cor vetada pelo cliente = zero ocorrências no arquivo**, inclusive no botão do WhatsApp. O validador reprova.
- **Sem dependência externa no HTML entregue:** fontes do sistema, imagens em base64, nada de CDN. O validador reprova.
- **Ordem das etapas sempre "Etapa 1, 2, 3"**, nunca meses nem semanas no cronograma.
- **Dados de cliente não entram no git:** `saida/`, `clientes/`, `dist/`, `historico/` e as saídas `entregas-win7/` estão no `.gitignore`. A regressão usa os exemplos fictícios `motor1-diagnostico/exemplos/exemplo-ficticio.json` (saúde) e `exemplo-geral.json` (outro segmento).
- **Idiomas:** domínio=pt-BR · código=pt-BR nos nomes e comentários · commits=pt-BR.

## Regras aplicadas por máquina (GOV-ENFORCE-01)
Antes de declarar qualquer entrega pronta, rode e COLE a saída de `bash scripts/audit.sh .` e de `npm test`.
SE tocou infra, autenticação, limites, desempenho ou backup: também `bash scripts/audit-runtime.sh scripts/audit-runtime.conf --abuse` (start.win7.ai, ADR-008).
Exceção só por waiver com data (`.audit-waivers` ou `RT_WAIVERS`); vencido, reprova sozinho.
Ponto 1: `.githooks/pre-push` (ativar em cada clone com `git config core.hooksPath .githooks`). Ponto 2: `.github/workflows/verificacao.yml`. Ponto 3: auditoria do que está no ar (`npm run audit:runtime`, start.win7.ai). Ponto 4: evidência colada no `ESTADO.md` e no ledger.

## Ritual obrigatório de fim de sessão
1. Atualize `ESTADO.md` (fase, checkpoint, decisões, próximos 3 passos, bloqueios).
2. Commit (commits atômicos em pt-BR). Push quando houver remoto.
3. Todo checkpoint vira entrada em `docs/PONTOS-DE-RESTAURACAO.md` com o hash (CTX-RESTORE-01). Antes de operação de risco, savepoint primeiro (CTX-RESTORE-02).
4. Decisão tomada no chat → grave no arquivo-fonte (ADR, ESTADO ou PLANEJAMENTO) ANTES de encerrar (CTX-RESUMO-01).
