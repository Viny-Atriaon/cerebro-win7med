# PLANEJAMENTO · Cérebro Win7 Med

> Memória completa do projeto: contexto, decisões, estrutura dos dois motores, regras das landing pages, engenharia e fases.
> Escrito em 14/10/2026 a partir das conversas com o Viny. Este arquivo é a fonte quando a sessão de IA perder o contexto.
> Cópia viva no repositório: `Documents\Claude\cerebro-win7med\docs\PLANEJAMENTO.md` (a do repositório manda quando houver diferença).

---

## 1. De onde o projeto nasce

A Win7 Med é a unidade de captação digital para saúde da Win7, focada em clínicas de diagnóstico por imagem (ressonância, tomografia, ultrassom, mamografia, densitometria). O processo inicial de cada cliente hoje roda em três ferramentas e duas plataformas:

| Peça | Onde vive hoje | O que faz |
|---|---|---|
| Prompt "Cérebro Diagnóstico Win7 Med" | Projeto no Claude.ai | Transforma checklist preenchido pelo comercial + prints em uma apresentação HTML de diagnóstico e fechamento |
| HERMES V11.3 | ChatGPT | Gera copy longa de landing page e roteiro de vídeo de 50 a 60 segundos, um projeto por vez, com aprovação |
| Exemplo Planejamento | PDF | Gabarito de conteúdo da LP: topo com RT, banner, vídeo, convênios, depoimentos, endereço, selo Win7 |
| Padrão de LP Win7 v1.0 | `Documents\Claude\construtor-lp\PADRAO-LP-WIN7.md` | Estrutura, estilo, QA e publicação da landing page, aprovado em 06/10/2026 |

Arquivos de origem na pasta `Downloads\Cerebro nosso processo inicial win7`:
- `PROMPT CEREBRO Diagnostico Win7Med.md`: o prompt do diagnóstico, com 12 regras invioláveis, checklist de entrada, o que investigar e a estrutura do HTML.
- Um diagnóstico de cliente real em HTML (fora do repositório): saída de referência do diagnóstico (12 seções, autossuficiente).
- `HERMES V11.3.pdf`: prompt de copy, com as leis de headline dupla, abertura obrigatória do vídeo e ordem de entrega.
- `Exemplo Planejamento.pdf`: gabarito de conteúdo da LP.
- `RESSONÂNCIA ROTEIRO DE VÍDEO.pdf`: exemplo de roteiro no formato HERMES (de um cliente real).

Exemplo vivo de LP no padrão: uma LP publicada de cliente da Win7 (endereço fora do repositório).

## 2. O que o projeto é

Um sistema único, o **Cérebro Win7 Med**, com dois motores que substituem o processo fracionado. Vale só para clientes novos.

```
Motor 1 (diagnóstico)  →  reunião de onboarding (o Viny também chama de "brainstorm")  →  Motor 2 (planejamento e criação)
   antes da reunião          gravada e transcrita pelo Gemini                              logo depois da reunião
```

- **Motor 1** recebe os dados do prospect, investiga e entrega a apresentação de diagnóstico no estilo do diagnóstico de referência, apresentada na reunião.
- **Motor 2** recebe a transcrição da reunião mais o dossiê do Motor 1 e entrega tudo que a implantação precisa: copy da LP, roteiro de vídeo, duas campanhas de Google Ads, checklist de pendências do cliente e relatório de cobertura das palavras-chave.

## 3. Decisões do Viny (14/10/2026)

Estas decisões valem acima de qualquer parecer do conselho ou sugestão da IA.

1. **Dois motores, construídos por partes.** Primeiro o Motor 1 funcional, depois o Motor 2.
2. **Engenharia e estrutura são coisas diferentes.** O Padrão de Engenharia Universal v3.5 (github.com/Viny-Atriaon/padrao-engenharia-universal-publico) é regra imutável para segurança, escalabilidade, performance e memória. O Padrão de LP Win7 v1.0 é a base da estrutura da página. Nenhum substitui o outro.
3. **Só clientes novos.** As três LPs no ar não mudam.
4. **Um domínio por cliente, uma página por exame.** A raiz é o exame prioritário (ex.: ressonância). Os demais exames ficam em subcaminhos do mesmo domínio: `/tomografia`, `/ultrassom`. Cabeçalho, convênios e rodapé compartilhados; H1, vídeo, bullets e título próprios por página.
5. **Páginas fora da busca orgânica.** Foco exclusivo em anúncios pagos. `noindex` em todas as páginas, sem bloquear o AdsBot.
6. **Política de privacidade enxuta volta**, com o básico da LGPD, numa página comum do domínio.
7. **RT obrigatório em todas as páginas** do cliente, inclusive subcaminhos e política.
8. **Duas campanhas completas de Google Ads Pesquisa** por cliente: uma padrão (grupos por exame e intenção) e uma SKAG completa (um termo por grupo, não só termos cabeça). Só correspondência exata e de frase. Nunca ampla.
9. **A copy trabalha o Índice de Qualidade.** Os termos da campanha precisam estar na página, nos lugares certos.
10. **Fora do escopo:** motor de redes sociais (o Instagram do cliente continua como entrada de análise do diagnóstico), nomes de campanha, lista de negativas (o gestor de anúncios da Win7 aplica as listas dele por segmento) e Google Cloud / Places API.
11. **Hospedagem:** servidor da HostGator (cPanel da Win7), com os scripts de publicação que já existem no construtor-lp.
12. **Transcrição do Gemini** é enviada logo após a reunião; é ela que dispara o Motor 2.
13. **Motor 1 trabalha com dados informados** pelo comercial mais a leitura pública dos links, sem chave de API.

## 4. Motor 1 · Diagnóstico Win7 Med

> **Atualização de 14/10/2026 (ADR-003).** O Motor 1 deixou de copiar o HTML do cliente piloto e ganhou identidade própria: o **Laudo de Presença Digital**, nas cores da logo Win7 Med. Passou a ser **portátil**. A equipe envia o arquivo do agente ou cola o link do repositório público numa conversa com Claude, ChatGPT ou Gemini, responde as perguntas e cola o bloco de dados no **Gerador**. O Gerador funciona online e como arquivo local.
> - Agente (repositório público, o README é o agente): https://github.com/Viny-Atriaon/diagnostico-win7med
> - Gerador online: https://viny-atriaon.github.io/diagnostico-win7med/
> - Gerador para abrir do computador: `cerebro-win7med/dist/gerador-diagnostico-win7med.html`
> - Entradas novas: links do Google Meu Negócio, site, Instagram e **Facebook**, mais a conversa comercial. Saídas novas: placar de 0 a 100 por canal, **raio sugerido** em 3 zonas e **termos de pesquisa** por exame e intenção (só exata e frase).
> As seções 4.1 a 4.5 abaixo registram o desenho original. Onde houver conflito, valem o ADR-003 e o arquivo do agente.
>
> **Atualização de 14/10/2026 (ADR-004), pedido do Viny:** o Motor 1 virou o **Diagnóstico para Google Ads**, sem os dados e contatos da consultora e sem peças de venda (proposta, preços, case, painel, pergunta de fechamento), porque a clínica já é cliente quando chega ao onboarding. O placar mede a **Prontidão para Google Ads** em 3 pilares: Busca no Google, Site e página de destino, e Google Meu Negócio. Instagram e Facebook são só contexto. Entram a verba sugerida por campanha e a lista do que confirmar na reunião. O agente pede 3 prints (Maps, busca do exame, busca do nome), porque o Google bloqueia a leitura automática.

### 4.1 Entradas
- Três links do prospect: perfil do Google Meu Negócio, site e Instagram.
- Checklist do comercial (modelo em `motor1-diagnostico/exemplos/checklist-comercial.md`): nome, cidade/UF, logo, cores da marca, exames ou serviços foco em ordem de prioridade (ressonância primeiro quando houver), dores ditas na reunião com as palavras do cliente, convênios × particular, capacidade ociosa (horários vazios, máquina parada), região de atuação, pacote e preços a ofertar (implantação, mensalidade, verba sugerida), prints (perfil do Google, busca "exame + cidade", concorrentes), restrições (cores vetadas, o que não prometer).
- Planilhas do cliente quando existirem (ocupação, origem dos pacientes).

### 4.2 O que o motor analisa
- **Google Meu Negócio:** nota, número de avaliações, endereço, horário. Matemática da nota: com N avaliações e média M, quantas avaliações 5 estrelas faltam para chegar a 4,0 e 4,3: `x = N × (alvo − M) ÷ (5 − alvo)`.
- **Busca local** ("ressonância em [cidade]", "tomografia [cidade]"): quem aparece no patrocinado e no orgânico; se concorrente anuncia e o cliente não; se diretórios e agregadores dominam.
- **Site:** jornadas quebradas, mobile herdado do desktop, falta de página por exame, botão de WhatsApp.
- **Instagram:** existe, frequência de postagem, se o esforço está no lugar errado do funil.
- **Benchmark:** 2 ou 3 referências do segmento com uma linha sobre o que fazem certo, e a conclusão "a mesma lógica, no porte certo".
- **Capacidade ociosa × ticket:** custo mensal da agenda vazia, com as premissas rotuladas.

Tudo lido nas páginas públicas pelo navegador, com print e data como evidência. Nenhum dado via API paga.

### 4.3 Saída
Um único arquivo HTML autossuficiente (CSS e JS inline, imagens em base64, sem dependência externa, abre offline em TV, notebook e celular), mais um resumo de até 5 linhas: dados usados da reunião, dados investigados com fonte, o que ficou assumido e precisa de confirmação.

Estrutura do HTML, nesta ordem:
1. Hero escuro: logo do cliente, "Win7 Med · Diagnóstico", promessa em uma frase, chips do escopo.
2. As dores (3 cards, palavras da reunião).
3. O que investigamos: card do Google recriado em código com os dados reais, simulação da busca local, mapa de raio quando houver região.
4. A matemática: a conta concreta (nota, ocupação ou ticket) em números grandes.
5. A estratégia: ferramentas em cards (landing page por exame, assistente com IA, painéis, anúncios segmentados, WhatsApp com mensagem pronta).
6. Metas por etapa (etapa 1, 2, 3; nunca meses).
7. Investimento: cards estilo Atria, exame prioritário primeiro, pacote fechado, nota da verba paga direto ao Google, validade de 15 dias.
8. Fechamento: pergunta de fechamento, card da consultora e o botão de WhatsApp dela (dados pessoais retirados a pedido do Viny, ADR-004).

Seções opcionais quando houver dado: território por zonas de distância, interceptação da busca por cidade, case comprovado (com link do painel ao vivo), portas de entrada por frente de exame, próximos passos, como trabalhamos.

### 4.4 Regras invioláveis (do prompt original, mantidas)
1. Nunca usar travessão. Vírgula, dois pontos ou "·".
2. Texto curto. Título forte + no máximo 3 itens de uma linha por seção.
3. Mobile first: media queries, botões grandes, logos que empilham.
4. Hero escuro, cards claros com borda fina, 1 cor de destaque, cores da marca do cliente. Cor vetada = zero ocorrências no arquivo, inclusive no botão do WhatsApp (usar dourado #dbab3c ou azul).
5. Nunca inventar número. Todo dado vem da reunião, de fonte pública citada no rodapé da seção, ou é marcado "ilustrativo". Não afirmar fato técnico sem certeza.
6. Cronograma por etapas, nunca por meses.
7. Telas e interfaces recriadas em código. Foto gerada por IA só em moldura rotulada "imagem conceitual, substituída por fotos reais".
8. Telas com cara de site só quando o objetivo for vender site. Protótipos com selo "PROTÓTIPO · DADOS DE EXEMPLO".
9. Fechamento padrão com o card da consultora e o botão de WhatsApp.
10. Ao falar de acompanhamento e ROI, incluir o painel ao vivo (link do sistema da Win7, fora do repositório)
11. Garantia ou fidelidade só entram se o Viny informar.
12. Verba de anúncios nunca entra no pacote: "sugerida a partir de R$ X/mês, paga direto ao Google, quando o cliente decidir ativar".

### 4.5 Travas de engenharia (do conselho, incorporadas)
- Dossiê em JSON com cada fato marcado `verificado` (lido na fonte), `observado` (print com data), `informado` (reunião ou checklist) ou `estimado` (premissa explícita).
- Matemática (nota alvo, ociosidade × ticket, projeções) em código, nunca no texto do modelo.
- HTML renderizado a partir de template fixo; o modelo escreve só a narrativa.
- Validador automático antes da entrega: zero travessão, zero cor vetada, zero recurso externo, imagens em base64, meta viewport, card da consultora e WhatsApp presentes, etapas sem meses, simulações rotuladas.
- Prints em 375 px e 1440 px como evidência.
- Revisão humana antes de toda reunião. Pacote e preços sempre vêm do humano.
- O cliente piloto era o teste de regressão: toda mudança de template ou prompt o renderizava de novo (substituído pelo exemplo fictício, ADR-003).

### 4.6 Onboarding ao vivo e qualquer segmento (ADR-005, 14/10/2026)
- O diagnóstico vale para qualquer segmento: `cliente.setor` = `saude` (Win7 Med: exame, paciente, convênios, RT) ou `geral` (Win7: serviço, cliente, formas de pagamento, sem RT).
- Na reunião, o botão "Apresentar no onboarding" do Gerador abre a apresentação: diagnóstico em passos e 8 perguntas na ordem do Viny (verba, serviços, diferenciais, convênios, cidades, depoimentos em vídeo, vídeo da página, pontos para confirmar), com notas de condução para quem não é experiente.
- Regra de verba: R$ 1.500 por mês (cerca de R$ 50 por dia) por página e campanha, até 3. R$ 3.000 = 2 páginas; valor por dia × serviços × 30 também vale (R$ 59 × 3 = 3 páginas).
- No fim, "Gerar Mapa do Onboarding": HTML para o cliente e o grupo, JSON (`w7-mapa-onboarding` v1) para o Motor 2. O Mapa, junto com a transcrição, é o registro oficial do que foi resolvido.
- Conselho: `docs/CONSELHO-02.md` (GO CONDICIONAL, travas atendidas).

### 4.7 LP modelo e fluxo no chat (ADR-006, 14/10/2026)
- No chat, os dados do cliente viram, num comando só, o diagnóstico, o arquivo do onboarding já aberto com o cliente e a LP modelo publicada em `modelo.win7.ai/m/<token>/`.
- A LP modelo segue o padrão Win7 (publicado-v6): logo do cliente ou da Win7 Med, "SERVIÇO EM CIDADE", vídeo base da Win7 Med, convênios "Convênio A" a "J", depoimentos ilustrativos sem rosto, faixa "Modelo para aprovação", formulário que não envia nada, fora do Google.
- O link entra no diagnóstico e na apresentação ao vivo. Conselho: `docs/CONSELHO-03.md`.

### 4.8 Ordem do brainstorm (14/10/2026, tarde)
Capa com as logos; 1 verba; diagnóstico; recomendação da página principal com o modelo; 2 outros serviços; 3 regiões com o mapa do raio e o Google Meu Negócio; 4 diferenciais; 5 convênios; 6 depoimentos; 7 vídeo da página (cliente grava, roteiro da Win7 ou agente de IA); 8 confirmar os dados. No fim, o mapeamento sai em PDF e em JSON para o Motor 2.

## 5. Motor 2 · Planejamento e criação

### 5.1 Entradas
- Transcrição da reunião de onboarding (Gemini), enviada logo após a reunião.
- Dossiê JSON do Motor 1.
- Checklist do comercial e pacote fechado (quais frentes de exame).
- Assets do cliente quando já existirem (logo, logos de convênios, vídeos).

### 5.2 Saídas (seis entregas)
1. **Ficha confirmada do cliente.** Extraída da transcrição com a fala citada em cada fato. Convênios, nomes de exame, RT, cidade, horários e preços incertos ficam marcados `A_CONFIRMAR`. Só a ficha confirmada alimenta o resto. Transcrição é rascunho, nunca fonte direta.
2. **Briefing YAML de cada página**, no formato da seção 2 do Padrão de LP Win7: H1 "serviço em cidade", subtítulo de até 20 palavras citando todos os exames, três bullets, selo só com dado verdadeiro, CTA fixo "Agendar exame", convênios, depoimentos só se houver vídeo, RT, endereço, telefone e WhatsApp. Uma página por exame: raiz = exame prioritário, subcaminhos para os demais. Junto vai o **mapa de relevância** por grupo de anúncio: quais termos entram no title, H1, subtítulo, bullets, legenda do vídeo, nome e alt do poster, slug da URL e título da seção de convênios. O título 1 do anúncio responsivo é igual ao H1.
3. **Roteiro de vídeo** por página, de 50 a 60 segundos, 7 a 9 blocos de cerca de 7 segundos, na ordem: abertura, dor, agravamento, serviço, diferencial, diferencial, prova, CTA, reforço. Abertura fixa e intocável: "Se você estava no google procurando por [SERVIÇO] em [CIDADE], você chegou ao lugar certo!". Cidade sem estado.
4. **Duas campanhas de Google Ads Pesquisa** em JSON canônico, CSV do Google Ads Editor e documento legível:
   - **Padrão:** grupos por exame e intenção (preço, convênio, urgência, "perto de mim", agendamento), cada grupo apontando para a página do exame.
   - **SKAG completa:** um termo por grupo, em exata e frase, cobrindo todos os termos, não só os cabeça.
   - Anúncios responsivos com títulos de até 30 caracteres e descrições de até 90, validados em código com acento. Sitelinks e segmentação geográfica sugeridos. Termos de pesquisa por grupo.
   - Só EXACT e PHRASE. Zero BROAD. Sem superlativos nem promessa de resultado (CFM 2336/2023 e política de saúde do Google). Preço só com autorização.
   - O motor nunca publica. Exporta CSV ou cria pausado. Quando a API oficial liberar, o mesmo JSON sobe direto.
   - Nome de campanha e negativas ficam com o gestor de anúncios da Win7.
5. **Checklist para o grupo de WhatsApp**, pronto para colar, com dono e prazo por item. Cruza três fontes: campos vazios do briefing YAML, itens `A_CONFIRMAR` da ficha e a lista fixa de onboarding: logo vetorial, logos e lista completa de convênios, vídeo da estrutura, depoimentos em vídeo, nome e CRM do RT, endereço, telefone e WhatsApp do atendimento, horários, acesso ao Google Meu Negócio, conta do Google Ads e do GTM, domínio, preços se houver oferta, autorização de uso de imagem, fotos. Junto sai uma segunda mensagem curta com perguntas de confirmação.
6. **Relatório de cobertura do Índice de Qualidade:** toda palavra-chave da campanha, ou sua raiz, precisa aparecer no texto visível da página; o relatório sai por grupo de anúncio.

### 5.3 Robô 3 (ADR-007, 14/10/2026)
O Motor 2 virou o robô 3 e vai até a página no ar para revisão interna. Entrada: pasta local do cliente (sem Google Drive). Etapas `ficha` (ponto de controle 1), `entregas` (copy, roteiros, Google Ads, cobertura), `pagina` + prévia (ponto de controle 2) e domínio. A página real sai do mesmo template da LP modelo, em modo `real`. Copy pelo padrão de LP da Win7; HERMES só como noção de estratégia; roteiro pelo HERMES e pelo exemplo de ressonância. Fases F1.9 a F7 em `docs/FASES.md`.

## 6. Regras das landing pages (resumo do que muda no padrão)

- **Estrutura:** Padrão de LP Win7 v1.0 continua a base. Mudanças registradas por ADR no construtor-lp: página por exame em subcaminhos, política de privacidade enxuta volta, RT em todas as páginas, páginas só para tráfego pago.
- **Fora do orgânico sem quebrar o Google Ads:** `<meta name="robots" content="noindex, nofollow">` na página, cabeçalho `X-Robots-Tag: noindex, nofollow` no `.htaccess`, sem `sitemap.xml`, nunca enviar ao Search Console. O `robots.txt` continua liberado: se bloquear o Googlebot, o Google pode indexar a URL sem conteúdo. O AdsBot-Google, que avalia a página para o Índice de Qualidade, nunca pode ser bloqueado. OG e JSON-LD ficam.
- **Índice de Qualidade:** relevância (termos nos lugares certos, mensagem do anúncio igual ao H1), transparência (nome, endereço, telefone, RT, política), navegação, velocidade (HTML < 45 KB, Lighthouse mobile ≥ 90), mobile.
- **QA acrescenta quatro checagens:** meta noindex presente, X-Robots-Tag presente, página ausente do sitemap, busca simulada com o agente AdsBot-Google respondendo normalmente.
- **Botões de ação sempre verdes** (#14A44D, hover #0F8F42) e turquesa #0FA89A: identidade de conversão Win7, fixa.
- **Hospedagem:** HostGator, cPanel da Win7, Cloudflare na frente, scripts em `construtor-lp/scripts/`.

## 7. Engenharia

- **Padrão:** Constituição de Engenharia Universal v3.5 (v3.5.1 dos fiscais, commit `63f68e9` de 08/10/2026). Regra imutável.
- **Repositório dos motores:** `Documents\Claude\cerebro-win7med`, porte `app-simples` (scripts, prompts, sem servidor). Kit: AGENTS.md, ESTADO.md, README, docs/FASES.md, docs/adr/, docs/CORRECOES.md, docs/PONTOS-DE-RESTAURACAO.md, docs/CONFORMIDADE.md, `.env.example`, `scripts/audit.sh` no pre-push e no CI.
- **Cada LP:** porte `site-estático`. O construtor-lp adota o v3.5 com um kit único; cada LP vira uma fase com checkpoint no ledger.
- **Onde os motores vivem:** opção D do conselho. Skills e scripts no Claude Code agora, operados pelo Viny; mini app interno só depois, quando houver segundo operador e 10 diagnósticos validados. Fallback: um Projeto no Claude.ai com o mesmo prompt unificado, para o comercial não depender da agenda do Viny.
- **Quatro pontos de aplicação por máquina:** pre-push com audit.sh e validadores de saída; CI que bloqueia; auditoria do que está no ar (LPs); evidência colada antes de qualquer "pronto".
- **Fixtures de regressão:** dois clientes reais (Motor 1; Motor 2, LP e roteiro), depois trocados pelo exemplo fictício.

## 8. Conselho 01 (14/10/2026)

Veredito do juiz: **GO CONDICIONAL**. Mercado 8 · Métricas 7 · Investimento 8 · Esforço 5 · Custo de oportunidade 6. Registro completo em `cerebro-win7med/docs/CONSELHO-01.md`.

Travas aceitas: nenhum número sem fonte; HTML de template; transcrição vira ficha confirmada; contratos de saída validados por script; humano no circuito nas campanhas; fixtures de regressão; time-box com custo por execução registrado.

Posições vencidas, decididas pelo Viny contra o parecer: SKAG completa (o conselho sugeria só termos cabeça); construir agora em vez de só migrar os prompts para o Claude.ai.

## 9. Fases

| Fase | Entrega | Depende de |
|---|---|---|
| F0 | Kit v3.5 do repositório dos motores | ok do Viny (dado em 14/10) |
| F1 | Motor 1: template HTML a partir do cliente piloto, dossiê com fonte por fato, validadores, cliente piloto como regressão | nada |
| F1.3 | Motor 1 v4: qualquer segmento, apresentação ao vivo do onboarding e Mapa do Onboarding | pedido do Viny (14/10) |
| F1.4 | LP modelo por cliente e fluxo inteiro no chat | pedido do Viny (14/10) |
| F1.5 | Ordem do brainstorm e mapeamento em PDF | pedido do Viny (14/10) |
| F2 | Motor 1: primeiro diagnóstico real e primeira reunião conduzida pela apresentação | um prospect real |
| F3 | Motor 2: ficha confirmada e checklist para o grupo | uma transcrição real |
| F4 | Motor 2: briefing YAML multi-página, mapa de relevância, política enxuta, integração com o construtor-lp (ADR no construtor-lp) | F3 |
| F5 | Motor 2: roteiro de vídeo, um cliente real como regressão | F3 |
| F6 | Motor 2: campanhas padrão e SKAG, validadores, importação de teste no Editor com o gestor | F4 |
| F7 | Cliente novo de ponta a ponta, conformidade e guia de uso para o comercial e o gestor | F2 a F6 |

## 10. Fora de escopo
Motor de redes sociais, publicação automática de campanhas, nomes de campanha e negativas, Google Cloud, mini app web (até a condição do conselho), alteração das LPs já no ar.

## 11. Insumos pendentes
- Um prospect real com os três links e o checklist (para F2).
- Uma transcrição real do Gemini com o checklist do mesmo cliente (para F3).

## 12. Estado (atualizar a cada fase)
- 14/10/2026: F0 (kit v3.5), F1, F1.1 e F1.2 fechadas. O Motor 1 v3 (Diagnóstico para Google Ads) é portátil (agente em Markdown + Gerador) e está publicado no GitHub. O Motor 1 renderiza, valida e tira prints a partir de `diagnostico.json`; a skill `/diagnostico` conduz a coleta. Próximo: F2 com um prospect real. Detalhe vivo em `ESTADO.md`.
- 14/10/2026 (tarde): F1.3 fechada. O Motor 1 v4 serve qualquer segmento, tem a apresentação ao vivo do onboarding com as 8 perguntas e gera o Mapa do Onboarding (HTML + JSON). Próximo: ensaio em celular real e F2 com prospect real.

## 13. Mapa de pastas
- Origem: `Downloads\Cerebro nosso processo inicial win7\` (prompts, exemplos, este arquivo).
- Repositório dos motores: `Documents\Claude\cerebro-win7med\`.
- Padrão de LP e construtor: `Documents\Claude\construtor-lp\`.
- Padrão de engenharia: github.com/Viny-Atriaon/padrao-engenharia-universal-publico (cópia local em `Documents\Atriaon-maker\padrao-engenharia-universal-publico`).
- Adoção de referência do v3.5: outro projeto da Win7 já no padrão (AGENTS.md, docs/CONFORMIDADE.md).
