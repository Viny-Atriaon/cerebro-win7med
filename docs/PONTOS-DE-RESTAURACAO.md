# PONTOS DE RESTAURAÇÃO — Cérebro Win7 Med
> Append-only. Entrada antiga é IMUTÁVEL. Sem código/diff aqui: o commit guarda o conteúdo.
> Visão MACRO: leia só os títulos `## PR-NNN` (a linha do tempo do projeto).
> Visão MICRO: leia o corpo da entrada desejada.
> **Repositório público desde 18/11/2026 (ADR-009):** os hashes de PR-001 a PR-022 existem só no repositório privado `Viny-Atriaon/cerebro-win7med-historico` (história antiga, com os clientes reais). Para restaurar um deles, clone o histórico. As entradas foram saneadas: nomes de clientes, links com token e endereços do servidor viraram descrições.
>
> COMO RESTAURAR (sempre via git, com o hash da entrada, nunca de memória):
> - Inspecionar um ponto:            git switch -c inspecao-prNNN <hash>
> - Voltar arquivos específicos:     git restore --source <hash> -- <caminhos>
> - Reverter um ponto ruim:          git revert <hash>
> - Voltar o projeto INTEIRO ao ponto: criar branch de resgate a partir do <hash>
>   (reset --hard só com autorização explícita do Viny, IA-DESTRUCT-01)

## PR-001 — 14/10/2026 — Kit de Partida v3.5: memória do projeto, ADRs e fiscais
- **Commit:** `c0c7e71` · **Fase:** F0 · **Tipo:** adicionado
- **Funcionalidades tocadas:** kit do padrão (AGENTS, ESTADO, README, FASES, ADR-001, ADR-002, CORRECOES, CONFORMIDADE, PLANEJAMENTO, CONSELHO-01), fiscais (scripts/audit.sh, scripts/audit-runtime.sh), hook pre-push, CI, package.json sem dependências
- **Adicionado:** tudo acima; .gitignore com clientes/ e saida/ fora do git; .env.example sem segredo
- **Modificado:** —
- **Removido:** —
- **Estado verificado neste ponto:** `bash scripts/audit.sh .` = 21 ✅ · 0 ❌ · 6 ⚠️ (avisos: sem banco, sem servidor, sem teste de carga/abuso/runtime, registrados em docs/CONFORMIDADE.md como não aplicáveis nesta fase). Nenhum script de motor ainda.

## PR-002 — 14/10/2026 — Motor 1 funcional: template, renderizador, validador, regressão e skill
- **Commit:** `01cd5bc` · **Fase:** F1 · **Tipo:** adicionado
- **Funcionalidades tocadas:** motor1-diagnostico (modelo/estilo.css, scripts/renderizar.mjs, calcular.mjs, validar.mjs, teste-regressao.mjs, qa_prints.py, esquema, fixture do cliente piloto, checklist do comercial), skill .claude/skills/diagnostico, .gitattributes, ESTADO/FASES/CONFORMIDADE/PLANEJAMENTO
- **Adicionado:** tudo acima. Paleta por variável com substituição do :root (cor vetada = zero ocorrências); mapa esquemático por passo áureo; tabela de cidades em cards no celular; verba fora do total do plano (regra 12).
- **Modificado:** ESTADO.md (F1 fechada, próximos passos F2), docs/FASES.md (F0 e F1 ✅), docs/CONFORMIDADE.md (evidências do F1), docs/PLANEJAMENTO.md (seção Estado)
- **Removido:** —
- **Estado verificado neste ponto:** `npm test` = regressão ok (20 ✅, 0 ❌) · `validar.mjs` na fixture = 14 ✅ · 0 ❌ · 1 ⚠️ · `qa_prints.py` = 375/768/1440 px sem rolagem horizontal · `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-003 — 14/10/2026 — Motor 1 v2: laudo com identidade Win7 Med, agente portátil e Gerador publicados
- **Commit:** `a3bf492` (código) e `7436b62` (documentação) · **Fase:** F1.1 · **Tipo:** adicionado e removido
- **Funcionalidades tocadas:** agente portátil (agente/), motor no navegador e no Node (motor1-diagnostico/motor), Gerador (motor1-diagnostico/gerador), build com edição interna e pública, ADR-003
- **Adicionado:** Laudo de Presença Digital (placar de 34 critérios em 5 canais, raio, termos), agente em Markdown com ativação por arquivo ou link, Gerador HTML offline, repositório público Viny-Atriaon/diagnostico-win7med com GitHub Pages
- **Modificado:** regressão passou a cobrir coerência agente × motor e privacidade do build público
- **Removido:** renderizador Node e template copiados do cliente piloto, fixture do cliente piloto (o Viny pediu motor próprio, sem copiar o cliente piloto)
- **Estado verificado neste ponto:** npm test = regressão ok (45 checagens); audit.sh = 22 ✅ · 0 ❌; Gerador sem erro de console e com download; ativação por link testada em IA nova; ponta a ponta com um cliente real em IA nova

## PR-004 — 14/10/2026 — Motor 1 v3: Diagnóstico para Google Ads, sem dados da consultora
- **Commit:** `90eea94` · **Fase:** F1.2 · **Tipo:** modificado e removido
- **Funcionalidades tocadas:** motor (pilares, seções, validação), agente (v3), Gerador (edição única), exemplo fictício, build, regressão, ADR-004
- **Adicionado:** placar de Prontidão para Google Ads (Busca 35, Site e página de destino 35, Google Meu Negócio 30; 27 critérios, com marca protegida, política de privacidade e tag do Google), seções de verba sugerida por campanha, perguntas para a reunião de onboarding e conclusão; validação de zonas do raio em faixas crescentes; recusa de link de WhatsApp no diagnóstico; 13 regras novas no agente vindas do teste de ponta a ponta
- **Modificado:** critério whatsapp_um_clique → contato_whatsapp (formulário curto do padrão Win7 conta como sim); Instagram e Facebook viram só contexto
- **Removido:** dados da consultora (nome, foto, WhatsApp), config/config-interno.json, edição interna do Gerador, painel ao vivo, case, planos, preços, validade e pergunta de fechamento. Motivo: pedido do Viny em 14/10 (foco em Google Ads, sem dados pessoais)
- **Estado verificado neste ponto:** npm test = regressão ok (50 checagens); audit.sh = 22 ✅ · 0 ❌; Gerador público v3 publicado (commit f68b17b no repositório público), Pages atualizado e HTTP 200 nas 3 URLs; varredura sem nenhum dado pessoal no conteúdo público

## PR-005 — 14/10/2026 — Motor 1 v4: onboarding ao vivo, Mapa do Onboarding e qualquer segmento
- **Commit:** `3fbd264` · **Fase:** F1.3 · **Tipo:** adicionado e modificado
- **Funcionalidades tocadas:** motor (vocabulário por setor, regra de verba), onboarding (roteiro, respostas, Mapa), apresentação ao vivo no Gerador, agente v4, exemplos, regressão, QA da apresentação, ADR-005, CONSELHO-02
- **Adicionado:** `cliente.setor` (`saude` ou `geral`) com logo Win7 para outros segmentos; `regraVerba` (R$ 1.500 por mês por página e campanha, até 3) e verba por dia; `onboarding/onboarding.js` (16 passos com notas de condução, estado das respostas, Mapa `w7-mapa-onboarding` v1 com validação); `onboarding/apresentacao.js` e `.css` (tela cheia, teclado, gesto, notas pela tecla N, salvamento automático, exportar, importar, apagar); botão "Apresentar no onboarding"; `exemplo-geral.json` (Torque Auto Center, fictício); `referencia-sha256.txt` e `npm run golden`; `qa_onboarding.py`
- **Modificado:** agente v4 genérico (setor, RT só em saúde, seção 8.1 da apresentação); textos do laudo e do Gerador pelo vocabulário do setor; `gerar.mjs` cria a pasta de saída
- **Removido:** —
- **Estado verificado neste ponto:** `npm test` = regressão ok (94 checagens); `qa_onboarding.py` ok com os dois exemplos em 1440 e 375 px (16 passos, Mapa gerado, sem nota de condução no Mapa, recuperação depois de recarregar, zero erro de console); corpo do diagnóstico de saúde idêntico ao da v3; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️; varredura sem dado pessoal em `dist/publico`

## PR-006 — 14/10/2026 — LP modelo por cliente e fluxo inteiro no chat
- **Commit:** `b3bf0c9` · **Fase:** F1.4 · **Tipo:** adicionado
- **Funcionalidades tocadas:** lp-modelo (modelo, núcleo, raiz, base), scripts cliente.mjs, publicar_lp_modelo.py, qa_lp_modelo.py, motor (seção do link do modelo), onboarding (passo "O modelo da sua página"), Gerador (abre com um cliente embutido), regressão, ADR-006, CONSELHO-03
- **Adicionado:** comando único do chat; LP modelo derivada do publicado-v6 com faixa de modelo, noindex, formulário e telefone sem efeito, convênios "Convênio A" a "J", depoimentos sem rosto; lista fechada de mídia; expiração de 30 dias; domínio adicional `modelo.win7.ai` no cPanel da Win7 e registro A proxied na zona win7.ai
- **Modificado:** diagnóstico e apresentação mostram o link do modelo quando existe; Gerador aceita cliente embutido (`fixo`)
- **Removido:** —
- **Estado verificado neste ponto:** `npm test` = regressão ok (111 checagens); corpo do diagnóstico de saúde sem link idêntico ao da v3; `qa_lp_modelo.py` ok em 1440 e 375 px (zero envio, zero requisição externa, zero erro); `qa_onboarding.py` ok no Gerador público (16 passos) e no onboarding do cliente (17 passos); modelo fictício no ar em http://modelo.win7.ai/m/dzllmcvngfby/ (HTTPS aguardando AutoSSL); `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-007 — 14/10/2026 — Ordem do brainstorm do Viny e mapeamento em PDF
- **Commit:** `befa421` · **Fase:** F1.5 · **Tipo:** modificado e corrigido
- **Funcionalidades tocadas:** roteiro da apresentação, slides (capa, recomendação, serviços, regiões, confirmação dos dados, fechamento), Mapa do Onboarding (HTML e PDF), motor (svgRaio, 4.1.0), Gerador (abre direto no arquivo do cliente), agente (seção 8.1), regressão, QA
- **Adicionado:** página principal recomendada com o modelo no celular e confirmação; regiões com mapa do raio e Google Meu Negócio; dados do cliente para confirmar ou corrigir; impressão em PDF; migração de rascunho antigo
- **Modificado:** ordem: capa, verba, diagnóstico, página principal, outros serviços, regiões, diferenciais, convênios, depoimentos, vídeo, confirmar os dados
- **Removido:** passos separados de agenda e de Google Meu Negócio (a trilha foi para a capa; o perfil, para as regiões)
- **Estado verificado neste ponto:** `npm test` = regressão ok (120 checagens); corpo do diagnóstico idêntico ao anterior (só versão e CSS de impressão mudaram; CORRECOES 01); `qa_onboarding.py` ok no Gerador público (saúde e geral) e no arquivo do cliente; PDF do Mapa em 5 páginas; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-008 — 14/10/2026 — Ajustes de UX, motion graphics e LP modelo no celular
- **Commit:** `93cfe9c` · **Fase:** F1.6 · **Tipo:** modificado
- **Funcionalidades tocadas:** apresentação (verba, diferenciais, depoimentos, animações), núcleo do onboarding (verba diária, envio de depoimentos), LP modelo (vídeo simulado, celular), exemplo e agente (sem pergunta operacional), regressão e QA
- **Adicionado:** motion graphics na troca de slide; botão "vão enviar no grupo"; vídeo simulado no topo da LP; telefone só com ícone abaixo de 420 px
- **Modificado:** verba só por mês ou por dia (vezes 30); diferenciais em dois grupos de linhas; barra fixa do celular mais discreta; vídeo no banner do celular
- **Removido:** campo "quantos serviços" da verba; perguntas de horário de corte, de quem responde o WhatsApp e da lista de convênios no exemplo
- **Estado verificado neste ponto:** `npm test` = regressão ok (121 checagens); `qa_onboarding.py` ok no Gerador público (saúde e geral) e no arquivo do cliente; `qa_lp_modelo.py` ok; LP conferida em 320, 375 e 1440 px no ar; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-009 — 14/10/2026 — Batimento contínuo, página principal escolhida, vídeo e ajuste guiado
- **Commit:** `bd2d094` · **Fase:** F1.7 · **Tipo:** adicionado e modificado
- **Funcionalidades tocadas:** apresentação (faixa de batimento, serviços, vídeo, resumo, painel de ajuste), núcleo do onboarding (validação com passo por ponto, pendências do vídeo, migração), regressão e QA
- **Adicionado:** faixa de batimento em todos os slides; Tornar principal e Excluir na pergunta 2; Ajustar por ponto e painel Próximo ponto
- **Modificado:** vídeo com duas opções e roteiro sempre da Win7; validação devolve `pontos` com o passo
- **Removido:** opção "Win7 envia o roteiro" (virou o padrão de "a clínica grava")
- **Estado verificado neste ponto:** `npm test` = regressão ok (122 checagens); `qa_onboarding.py` ok no Gerador público (saúde e geral) e no arquivo do cliente; `qa_lp_modelo.py` ok; ajuste guiado percorrido no navegador; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-010 — 14/10/2026 — Domínio da página, máscaras e prazos de até 7 dias úteis
- **Commit:** `9245f91` · **Fase:** F1.8 · **Tipo:** adicionado
- **Funcionalidades tocadas:** recomendação da página principal (cartão do domínio), comando do chat (conferência no Registro.br), núcleo do onboarding (sugestões de domínio, dias úteis, prazos, máscaras, validação), apresentação (campos de data e telefone), regressão e QA
- **Adicionado:** domínios sugeridos com status do Registro.br ou "sugestivo"; decisão escolher agora ou sugerir no WhatsApp; máscaras de telefone e data; limite de 7 dias úteis com justificativa
- **Modificado:** o mapeamento exige a decisão do domínio e prazos válidos
- **Removido:** —
- **Estado verificado neste ponto:** `npm test` = regressão ok (133 checagens); `qa_onboarding.py` ok no Gerador público (saúde e geral) e no arquivo do cliente; `qa_lp_modelo.py` ok; datas, telefone e domínios conferidos no navegador em 1440 e 375 px; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-011 · 14/10/2026 · Etapa A do robô 3: cores da logo, 3 bases do banner, RT e política no modelo
- **Commit:** `c3bce20` · **Fase:** F1.9 · **Tipo:** adicionado
- **Funcionalidades tocadas:** LP modelo (template e núcleo), comando do chat (cores e base), apresentação (passo da página principal e "Confirmar os dados"), núcleo do onboarding (campos da empresa, base no Mapa), agente, regressão
- **Adicionado:** `cores_logo.py` e `paletaDaLogo` (cores da logo com contraste ajustado); 3 bases de banner com movimento contínuo (1 Órbitas, 2 Ondas, 3 Varredura), sorteio sem repetir e troca ao vivo por `#baseN`; RT abaixo da logo e link de política no rodapé; campos RT, razão social, CNPJ (com máscara) e e-mail para a política
- **Modificado:** destaque com 3:1 sobre o fundo (texto grande e grafismo); fundo escuro com metade da claridade da cor da marca
- **Removido:** nota do Google no banner do modelo
- **Estado verificado neste ponto:** `npm test` = regressão ok (143 checagens); `qa_onboarding.py` ok no Gerador público (geral) e no arquivo do cliente; prints das 3 bases em 1440 e 375 px sem rolagem lateral nem erro de console; troca de base conferida no navegador nos dois tamanhos; modelo e Gerador no ar (público `c5b16ca`); `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-012 · 14/10/2026 · Robô 3: da transcrição à página no ar (cliente fictício)
- **Commit:** `4cf0de9` · **Fases:** F3, F4, F5, F6 e F6.1 · **Tipo:** adicionado
- **Funcionalidades tocadas:** novo `motor2-execucao/` (motor, etapas ler, ficha, entregas e publicar, utilitários Python, regressão), agente do robô 3, template da LP em dois modos (modelo e real), padrão de LP da Win7 (adendo, seção 19), prévia em previa.win7.ai
- **Adicionado:** ficha com fala citada e conferida na transcrição; checklist do WhatsApp sem tarefa interna; copy no formato "landing page formatada"; roteiro em 9 blocos com abertura fixa e tempo por bloco; campanhas padrão e SKAG (só exata e frase, pausadas) com CSV do Google Ads Editor; cobertura das palavras-chave no texto visível; política de privacidade única (parágrafo de saúde); páginas reais com RT, selo confirmado, 3 pontos, cidades atendidas, formulário Win7 ou pré-integração; prévia com noindex, robots bloqueado e sem listagem; caminho do domínio com conferência da zona e simulação
- **Modificado:** a página real sai do template da LP modelo em modo `real` (ADR-007 substitui a parte do ADR-006 que mandava fazer no construtor-lp)
- **Removido:** nada
- **Estado verificado neste ponto:** `npm test` = Motor 1 regressão ok + robô 3 51 checagens ok; páginas reais sem rolagem lateral em 320, 375 e 1440 px, sem erro de console e sem imagem quebrada; envio em pré-integração abre o WhatsApp com a mensagem da página; PDFs: ficha 4 páginas, landing page formatada 2, roteiro 1, Google Ads 6; prévia no ar em https://previa.win7.ai/30d8wazxrylo/ (200, X-Robots-Tag noindex); domínio recusado sem a zona na Cloudflare (simulação); LP modelo republicada e QA ok nas 3 bases; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-013 · 14/10/2026 · Cérebro no GitHub privado e independente do construtor-lp
- **Commit:** `0329501` (mais o fiscal de envio com o robô 3) · **Tipo:** modificado
- **Funcionalidades tocadas:** acesso ao servidor (`servidor/cpanel.py`, `servidor/cloudflare.py`), formulário Win7 (`servidor/win7-form.js`, byte a byte), publicadores da LP modelo e da página real, CI, pre-push, skill `/robo3`, guia `INSTALAR.md`
- **Adicionado:** repositório privado `Viny-Atriaon/cerebro-win7med`; credenciais procuradas em `W7_CREDENCIAIS`, `.segredos/` do Cérebro e, por último, no construtor-lp
- **Modificado:** o Cérebro não depende mais da pasta `../construtor-lp` para publicar
- **Removido:** nada
- **Estado verificado neste ponto:** varredura de segredos nos arquivos e no histórico sem achados; `python servidor/cpanel.py teste` = conectado à conta da Win7; `python servidor/cloudflare.py teste` = token ativo; `npm test` = Motor 1 ok + robô 3 52 checagens ok; CI no GitHub = success; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-014 · 14/10/2026 · Ativação do robô 3 (como a do robô 1)
- **Commit:** `4898fbd` (público `5c0f521`) · **Tipo:** adicionado
- **Funcionalidades tocadas:** resumo da apresentação, Gerador (passo 4), núcleo do onboarding (`ativacaoRobo3`), comando do robô 3 (pasta pelo nome, mapeamento de Downloads, transcrição obrigatória na ficha), comando do chat (pasta no registro), agente e skill do robô 3
- **Adicionado:** botão "Copiar ativação do robô 3" (baixa o mapeamento e copia a mensagem com o cliente e a pasta); passo 4 do Gerador; busca da pasta salva pelo robô 1; cópia do mapeamento mais novo de Downloads
- **Modificado:** a ficha não roda sem a transcrição na pasta; um aviso por vez na apresentação
- **Removido:** nada
- **Estado verificado neste ponto:** `npm test` = Motor 1 ok + robô 3 53 checagens ok; QA da apresentação ok no Gerador público e no arquivo do cliente; botão do resumo testado no navegador (baixou `mapa-onboarding-clinica-vertice-imagem.json` e copiou a ativação) e o do Gerador (copiou com o nome do cliente); busca em Downloads testada com arquivo de teste (apagado); Gerador público atualizado no Pages; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-015 · 14/10/2026 · Página do robô 3 com "Copiar comando inicial"
- **Commit:** `4c28c31` (público `dd5e9cc`) · **Tipo:** modificado
- **Funcionalidades tocadas:** comando inicial do robô 3 (`ativacaoRobo3`), página `robo3.html` no link público, passo 4 do Gerador, resumo da apresentação, skill e agente do robô 3
- **Adicionado:** https://viny-atriaon.github.io/diagnostico-win7med/robo3.html com o botão "Copiar comando inicial", como o Gerador do robô 1
- **Modificado:** o comando ficou curto e igual em todo lugar: ativa o robô 3 pelo repositório e manda pedir o endereço da pasta do cliente (pedido do Viny, 14/10)
- **Removido:** nome e pasta do cliente dentro do comando
- **Estado verificado neste ponto:** `npm test` = Motor 1 ok + robô 3 54 checagens ok; botão testado em 1440 e 375 px (copia o comando, sem rolagem lateral nem erro); QA da apresentação ok; link no ar (200); `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-016 · 14/10/2026 · Robô 3 aceita qualquer formato
- **Commit:** `ad886df` (público `a404296`) · **Tipo:** modificado
- **Funcionalidades tocadas:** leitura da pasta do robô 3 (`inventario` por conteúdo), `ler_transcricao.py` (HTML), motor do diagnóstico e Mapa (dados embutidos), Gerador (baixar JSON), apresentação (JSON baixado junto com o PDF), agente e skill do robô 3
- **Adicionado:** comentário `w7-dados` (base64) no HTML do diagnóstico (só cliente, modelo de página, termos, raio, verba e restrições) e no HTML do Mapa; "Baixar dados (JSON)" no Gerador; reconhecimento de diagnóstico, mapeamento e transcrição pelo conteúdo em JSON, HTML, PDF, DOCX, TXT e MD, inclusive títulos com letras espaçadas do PDF e o rascunho exportado da apresentação; textos em `entregas-win7/_contexto/`
- **Modificado:** referência por hash do diagnóstico regravada (conteúdo visível idêntico; só o comentário a mais, 5,8 KB); o rascunho da ficha sai do diagnóstico quando não há Mapa estruturado
- **Removido:** a exigência de `diagnostico.json` e `mapa-onboarding-*.json`
- **Estado verificado neste ponto:** `npm test` = Motor 1 ok + robô 3 60 checagens ok; pastas de teste com diagnóstico HTML + mapeamento PDF + transcrição PDF e com diagnóstico PDF + mapeamento HTML + transcrição TXT reconhecidas; Gerador baixa o JSON; gerar o mapeamento baixa o JSON junto; QA da apresentação ok; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-017 · 15/10/2026 · start.win7.ai, a tela única da equipe
- **Commit:** `bc69469` (público `5af97d7`) · **Tipo:** adicionado
- **Funcionalidades tocadas:** nova tela `start/index.html`, build (`dist/start`), publicação (`scripts/publicar_start.py`, `npm run publicar:start`), Gerador e página do robô 3 em modo embutido, links do robô 3
- **Adicionado:** start.win7.ai com as abas Início, Análise e Execução (endereços `#analise` e `#execucao`), linha do processo e o batimento contínuo da apresentação; domínio adicional `start.win7.ai` no cPanel da Win7 e registro A proxied na zona win7.ai (criados em 15/10); noindex, robots bloqueado, sem listagem
- **Modificado:** dentro da tela única, o Gerador e a página do robô 3 escondem o próprio cabeçalho; o link "Página do robô 3" aponta para start.win7.ai/#execucao; a página do robô 3 diz que qualquer formato serve
- **Removido:** nada (os links do GitHub continuam)
- **Estado verificado neste ponto:** `npm test` = Motor 1 ok + robô 3 60 checagens ok; QA no ar em 1440 e 375 px: sem rolagem lateral, batimento animado, abas trocam sem recarregar, cabeçalho próprio escondido, "Copiar comando inicial" copia, apresentação do onboarding abre dentro da tela única, zero erro de console; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️


## PR-018 · 04/11/2026 · LP modelo com a identidade do site do cliente
- **Commit:** `e1c8adc` (público `7acaf60`) · **Tipo:** adicionado
- **Funcionalidades tocadas:** `lp-modelo.js` (VERSAO 1.3.0: `fontes`, `paletaDaLogo` com `opcoes.escura`), `modelo.html` (fontes por token), `cliente.mjs` (`--fundo`, `--fontes`), agente (tabela da seção 8.1)
- **Adicionado:** `lp_modelo.fontes` (`titulo`, `texto`, lista fechada do Google Fonts; família de um peso só sem negrito falso); `--fundo "#hex"` usa o fundo escuro do site (grafite ou preto, 7:1 com o branco) e a cor da marca vira o destaque sem saturar; `lp_modelo.cores.fundo_site` guarda a escolha; 5 checagens novas
- **Modificado:** a fonte da página deixou de ser fixa (sem fontes informadas, segue a Outfit, como antes)
- **Removido:** nada
- **Estado verificado neste ponto:** `npm test` = Motor 1 ok + robô 3 60 checagens ok (diagnóstico idêntico à referência por hash); primeiro cliente real republicado em (modelo do cliente, link fora do repositório) com `--cores "#5eb04f" --fundo "#262626" --fontes "Bebas Neue,Montserrat"`; QA da LP em 1440 e 375 px: rolagem lateral 0, erros 0, externos 0; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-019 · 04/11/2026 · Aviso de bloco sem a página modelo
- **Commit:** `e06c0f7` (público `cfa5ea9`) · **Tipo:** modificado
- **Funcionalidades tocadas:** validação do motor (aviso), apresentação do onboarding (aviso ao abrir), regressão
- **Adicionado:** aviso no Gerador e ao abrir a apresentação quando o bloco não traz `lp_modelo.url` (a reunião sairia sem a landing page, sem explicação); checagem nova
- **Modificado:** a checagem do exemplo geral ignora só esse aviso
- **Removido:** nada
- **Estado verificado neste ponto:** `npm test` = Motor 1 ok + robô 3 60 checagens ok; Gerador online com bloco que tem o link mostra a página no passo da página principal (1366 px à direita; tela estreita abaixo do domínio); start.win7.ai republicado

## PR-020 · 04/11/2026 · Robô 3 no primeiro cliente real
- **Commit:** `488896d` · **Tipo:** adicionado
- **Funcionalidades tocadas:** `lp-modelo.js` (VERSAO 1.4.0: `validarReal`, modo `real`), `modelo.html` (seção e pop-up de parceiros), `motor-execucao.js` (`validarFicha`, `validarPlano`, `dadosPagina`, `docCopy`), `robo3.mjs`, agente do robô 3
- **Adicionado:** `plano.parceiros` (botão no fim da página e pop-up com WhatsApp comercial); `plano.paginas[].convenios: false`; molduras "Em produção" para depoimentos combinados e não enviados; checagem das travas de texto na área de parceiros
- **Modificado:** WhatsApp aceita fixo com WhatsApp Business (10 dígitos), decisão do Viny em 04/11
- **Removido:** nada
- **Estado verificado neste ponto:** `npm test` = Motor 1 ok + robô 3 60 checagens ok; Cliente: ficha válida, entregas sem erro (padrão 10 grupos, SKAG 45), páginas em 375 e 1440 px sem rolagem lateral e sem erro de console, pop-up dos parceiros abre; prévia (prévia do cliente, link fora do repositório) com 200 nas três URLs; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-021 · 06/11/2026 · LP modelo montada no Gerador (bloco colado sem link)
- **Commit:** `6f595a8` · **Tipo:** adicionado
- **Funcionalidades tocadas:** `lp-modelo.js` (`coresDosPixels`), `apresentacao.js` (passo da página principal), `build.mjs` (modelo da LP e motor da LP dentro do Gerador), aviso do motor
- **Adicionado:** quando o bloco não traz `lp_modelo.url`, a apresentação monta a página modelo no próprio navegador (quadro do celular, troca de fundo e "Abrir em tela cheia"), com a logo enviada no passo 3 e as cores do bloco ou tiradas da logo por canvas; mídia base vem de modelo.win7.ai/base
- **Modificado:** aviso do Gerador explica que o modelo é montado no navegador e que o link no ar continua saindo do cliente.mjs --publicar
- **Removido:** nada
- **Motivo:** pedido do Viny em 06/11 (cliente real): o bloco colado no Gerador saía sem a página e sem a identidade do cliente
- **Estado verificado neste ponto:** `npm test` sem falha (209 checagens); Cliente real sem link: página montada com logo e cor #09710a da logo, fundo 3 trocado ao vivo, 375 px sem rolagem lateral, zero erro de console; `bash scripts/audit.sh .` = 22 ✅ · 0 ❌ · 6 ⚠️

## PR-022 · 18/11/2026 · Projetos salvos no start.win7.ai (ADR-008)
- **Commit:** `f792c4e` (no repositório histórico) · **Tipo:** adicionado
- **Funcionalidades tocadas:** `start/api/` (novo, PHP), `start/index.html` (entrada, convite, Projetos, Equipe), `gerador.js` e `gerador.html` (salvar no sistema no build `W7.start`), `apresentacao.js` (`opcoes.sistema`: fila de gravação das respostas e do Mapa), `build.mjs` (Gerador do start, API e `.htaccess`), `publicar_start.py` (API, pasta de dados, convite do administrador), testes e auditoria do ambiente
- **Adicionado:** API com contas por convite (equipe e administrador), sessão, limites de login, escrita só do próprio site, projetos com versões, histórico e cópia do dia; aba Projetos (abrir, baixar o diagnóstico e o mapeamento, histórico, arquivar); Equipe (convites, desativar conta); `start/testes/teste-api-abuso.mjs` (65 checagens), `qa_start.py` (de ponta a ponta no navegador), `scripts/audit-runtime.conf`
- **Modificado:** a regra "respostas da reunião não saem do aparelho" vale só fora do start (ADR-008); zona win7.ai de volta para SSL Full (autorização do Viny de 14/10)
- **Removido:** nada
- **Motivo:** pedido do Viny em 18/11: a análise e o onboarding do dia não ficaram salvos
- **Estado verificado neste ponto:** `npm test` = Motor 1 ok + robô 3 60 ok + API 65 ok; `qa_start.py` ok (projeto reaberto em outro navegador com as respostas; 1440 e 375 px sem rolagem lateral nem erro de console); no ar: página 200, `/api/saude` 200, `api/lib` 403; `audit-runtime.sh --abuse` = 8 ✅ · 0 ❌

## PR-023 · 18/11/2026 · Repositório público com história nova (ADR-009)
- **Commit:** `64b7b67` (primeiro commit do público; a história anterior termina em `1b0c054` no `cerebro-win7med-historico`) · **Tipo:** modificado
- **Funcionalidades tocadas:** documentos (saneados), `servidor/cpanel.py` (`home()`), `servidor/cloudflare.py` (`ip_servidor()`), publicadores, `teste-regressao.mjs` (`PROIBIDOS` por hash), `.githooks/pre-push` (trava da história privada), `start/testes/regressao-abuso.sh`
- **Adicionado:** ADR-009; `.githooks/raiz-privada`; chaves opcionais `CPANEL_HOME` e `SERVIDOR_IP` no `credenciais.env`
- **Modificado:** `Viny-Atriaon/cerebro-win7med` agora é público, com um commit órfão; o repositório antigo virou `cerebro-win7med-historico` (privado); commits do público com o e-mail noreply do GitHub
- **Removido:** do repositório público, nomes e pastas de clientes reais, links com token, dados da equipe, painel com token, IP de origem e pasta da conta do servidor
- **Motivo:** pedido do Viny em 18/11: o cérebro precisa ser público para os colaboradores usarem, sem depender de quem tem acesso
- **Estado verificado neste ponto:** varredura de termos sensíveis em todos os arquivos publicados sem ocorrência; `npm test` = Motor 1 ok + robô 3 60 ok + API 65 ok; `bash scripts/audit.sh .` = 24 ✅ · 0 ❌ · 4 ⚠️; pre-push recusou de propósito um envio com a história antiga para o público e aceitou o histórico privado

