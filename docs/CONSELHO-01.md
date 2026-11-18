# Conselho 01 · Cérebro Win7 Med (dois motores)

**Data:** 14/10/2026 · **Formato:** 5 agentes em paralelo (2 prós, 2 contras, 1 juiz), regra padrão do Viny.

**Veredito do juiz: GO CONDICIONAL.** Mercado 8 · Métricas 7 · Investimento 8 · Esforço 5 · Custo de oportunidade 6.

**Decisões do Viny já tomadas antes do conselho (valem acima dos pareceres):**
- Dois motores: Motor 1 = diagnóstico pré-reunião a partir do Google Meu Negócio + site + redes; Motor 2 = pós-onboarding a partir da transcrição do Gemini.
- Motor 2 entrega: copy da LP no Padrão Win7 (hero com vídeo e chamada principal, convênios se houver, depoimentos, nada além disso), roteiro de vídeo com abertura fixa "Se você estava no google procurando por [serviço] em [cidade], você chegou ao lugar certo!", e DUAS campanhas de Google Ads Pesquisa: uma padrão e uma SKAG, só correspondência exata e de frase, nunca ampla, com nome de campanha, grupos, palavras-chave, termos de pesquisa, anúncios com títulos e descrições.
- Os pareceres viram travas de engenharia; não revertem essas decisões. Onde o conselho diverge (SKAG, redes sociais), o item fica para o Viny reconsiderar explicitamente.

## Travas de engenharia (consenso)
1. **Nenhum número sem fonte.** Dossiê em JSON com cada fato marcado `verificado` (API), `observado` (print com data), `informado` (reunião/checklist) ou `estimado` (premissa explícita). Matemática (nota alvo, ocupação × ticket, projeções) em código, nunca no texto do modelo.
2. **HTML de diagnóstico renderizado de template fixo**; o modelo escreve só a narrativa. Revisão humana antes de toda reunião.
3. **Transcrição é rascunho, não fonte.** Entre a transcrição do Gemini e qualquer geração existe a "ficha do cliente" extraída com citação da fala e marcada `A_CONFIRMAR` no que estiver incerto (convênios, nomes de exame, RT, cidade). Só a ficha confirmada alimenta LP, vídeo e campanhas.
4. **Contratos de saída validados por script:** YAML do briefing (schema da seção 2 do PADRAO-LP-WIN7), roteiro de 9 blocos, JSON canônico das campanhas + CSV do Google Ads Editor. Validador de 30/90 caracteres com acento, só EXACT e PHRASE, zero BROAD, sem termos vetados (CFM 2336/2023 e política de saúde do Google). Saída inválida não é entregue.
5. **Humano no circuito nas campanhas:** o motor exporta CSV ou cria pausado; nunca publica sozinho. Quando a API oficial do Google Ads liberar, o mesmo JSON sobe direto.
6. **Coleta do Google Meu Negócio só por Places API** (nota, total, horário, endereço). SERP "exame + cidade" e redes sociais entram como prints tirados no navegador, rotulados com data, nunca scraping como fonte única.
7. **Fixtures de regressão:** dois clientes reais (diagnóstico; LP e roteiro), depois trocados pelo exemplo fictício rodam antes de cada mudança de prompt ou template.
8. **Time-box:** 2 sprints de 8 h, custo por execução registrado no ESTADO.md. Se o Motor 1 não substituir o processo manual em 3 diagnósticos reais, vira só prompt unificado.

## Posições vencidas registradas (para o Viny reconsiderar explicitamente)
- **SKAG** (Contra #1 e Juiz): com variantes próximas da exata em 2026, SKAG rende pouco, cai em "baixo volume" e canibaliza a campanha padrão. Sugestão alternativa: SKAG só para os termos cabeça de cada exame.
- **Redes sociais no Motor 1** (Juiz): sinal baixo, coleta frágil; cortar do MVP ou manter como print leve.
- **"Quem anuncia" automático** (Contra #1): fica como campo manual de print.
- **Opção C (mini app)** (todos): só com segundo operador e 10 diagnósticos validados.
- **Contra #2** recomenda não construir agora e migrar os 3 prompts para um único Projeto no Claude.ai. Decisão do Viny: construir. Fica a trava de manter esse Projeto como fallback para o comercial quando o Viny não estiver disponível.

## Hospedagem recomendada: opção D (B agora, C depois)
Skills + scripts no Claude Code, operados pelo Viny, reaproveitando MCPs e navegador já instalados; mini app só depois.

## Ordem de construção recomendada
1. Motor 1: coletor (Places + PageSpeed + prints) → `dossie.json` → template HTML do Cérebro.
2. Motor 2: ficha confirmada → `briefing.yaml` do Padrão Win7.
3. Roteiro HERMES (port direto do prompt).
4. Campanhas Google Ads: padrão primeiro, SKAG depois, CSV testado por importação no Editor.

---

## Parecer PRÓ #1 · viabilidade técnica
Recomenda a opção D: B agora, C depois.

1) Por que é viável: os três ativos críticos já existem e são texto: super prompt da LP, Cérebro (HTML de 12 seções) e HERMES V11.3. O projeto não inventa produto, só orquestra prompts validados sobre dados coletados por script. O Motor 1 depende de APIs públicas e baratas: Places API (New) devolve rating, userRatingCount, regularOpeningHours, formattedAddress e reviews em uma chamada; PageSpeed Insights v5 devolve Core Web Vitals e auditorias Lighthouse. O print da busca "exame + cidade" é Playwright. O Motor 2 é LLM com saída estruturada: Claude API com tool use e JSON Schema, com limites de 30/90 caracteres garantidos por validador em código.

2) Stack: Motor 1: skill `diagnostico-win7`; `coletar.mjs` em Node chama Places API (New), PageSpeed v5 e Playwright headless com geolocalização para print do SERP; sai `diagnostico.json`; Claude preenche o template HTML. Motor 2: skill `onboarding-win7`; entrada: transcrição + diagnostico.json; três tools: `gerar_briefing_lp` (YAML validado por zod), `gerar_roteiro_hermes` (9 blocos, abertura fixa no template), `gerar_campanhas` (JSON). Validador pós-geração: tamanhos, match types permitidos, zero ampla.

3) Formato das campanhas: ambos. JSON canônico é a fonte de verdade; dele saem dois CSVs no layout do Google Ads Editor (Campaign, Ad group, Keyword, Criterion Type, Headline 1 a 15, Description 1 a 4, Final URL, Sitelinks). CSV importa hoje; JSON alimenta a API quando o Basic Access sair, com Windsor.ai como ponte enquanto isso.

4) MVP em 7 dias úteis: dias 1 e 2 coletor testado em 3 clínicas; dia 3 template HTML parametrizado; dias 4 e 5 Motor 2 com tools e validadores; dia 6 gerador CSV e importação de teste no Editor; dia 7 README e texto fixo de pedido por WhatsApp.

5) Riscos aceitos: SERP varia e pode bloquear bot (fallback de print manual); Places não expõe posts e perguntas (checklist cobre); transcrição ruidosa (extração de fatos antes de gerar); alucinação em convênios e RT (só entra o que estiver na transcrição ou checklist; o resto `A_CONFIRMAR`); custo: Places ~US$ 0,02 por chamada, PageSpeed grátis, Claude centavos por rodada.

## Parecer PRÓ #2 · oportunidade de negócio
1) Ganho por cliente: hoje ~3 h de diagnóstico + 1,5 h copy + 1 h roteiro + 6 h de campanhas = ~11,5 h em 3 ferramentas. Com os motores, humano só revisa: ~3 h. Ganho ~8 h por cliente; com 4 fechamentos/mês, 32 h/mês. Prazo de implantação de 10 a 15 dias úteis para 3 a 5.

2) Fechamento: diagnóstico específico vira padrão de toda reunião, prova no pitch. De 20% para 25% de fechamento em 20 reuniões/mês = 1 cliente a mais de R$ 5.000/mês. Onboarding rápido reduz churn precoce.

3) Sinergias: Motor 2 entrega o YAML já no formato aprovado; Motor 1 roda sobre a carteira de 90 clínicas para re-diagnóstico trimestral e upsell de frentes; Google Ads API leva as campanhas direto e os termos reais das 90 contas alimentam o motor.

4) Interno por 90 dias; depois Motor 1 vira isca comercial ("diagnóstico gratuito da sua clínica"). Vender a outras agências só após provar.

5) Métricas em 60 dias: horas humanas por implantação de ~11 h para no máximo 4 h; contrato assinado até campanha no ar em até 5 dias úteis; fechamento com diagnóstico vs sem, meta +5 pontos, com CPL igual ou melhor que o manual.

## Parecer CONTRA #1 · complexidade técnica
1) GMN e busca local: Places API (New) dá nota, total, horários e no máximo 5 reviews; não dá histórico nem "quem anuncia". Termos: cache de 30 dias, atribuição obrigatória. "Quem anuncia" só existe na SERP real, e SERP é scraping: viola ToS, varia por IP, hora e dispositivo. Varrer SERP com o Chrome logado arrisca a conta que opera a MCC. Instagram de terceiros não tem API. O print que o comercial tira hoje é mais fiel que a coleta automática.

2) Alucinação: "nunca inventar número" é instrução, não garantia. Preço e CPC sem Keyword Planner são chute. Matemática e projeções em código; HTML de template a partir de JSON de fatos com campo "fonte" obrigatório.

3) Transcrição do Gemini: ASR erra convênios, nomes de exame, cidades; o modelo "corrige" para o mais comum. Sem diarização, "não quero ressonância" vira grupo de anúncio. Transcrição é rascunho de uma ficha confirmada.

4) Google Ads: sem Keyword Planner, SKAG cai em "baixo volume"; exata aceita variantes próximas, SKAG rende pouco e as duas campanhas canibalizam o mesmo leilão. Contagem de caracteres com acento precisa de validador. Política de saúde do Google + CFM 2336/2023.

5) Três formatos (YAML, 9 blocos, CSV do Editor): sem schema, golden tests e importação de teste, é regressão invisível.

6) Opção C esconde login, fila, guarda de transcrições (LGPD), custo de API, versionamento, deploy e monitoramento: 6 a 10 semanas.

Fora do MVP: Motor 1 autônomo (SERP e redes), SKAG e segunda campanha, roteiro automático, opção C, escrita via API. Mínimo defensável: opção B com JSON de fatos, ficha confirmada, briefing YAML e UMA campanha (frase + exata) validada por código.

## Parecer CONTRA #2 · viabilidade comercial
Recomenda não construir os dois motores agora.
1) Custo de oportunidade: Binngo, videos-v2, ON-Maker, clientes abertos. O Cérebro não gera receita nova; economiza horas do comercial pagando com horas do dono.
2) Opção B cria gargalo: toda reunião passa pela agenda do Viny; se ele some uma semana, o funil para.
3) Número errado na mesa queima credibilidade; preço sugerido errado ancora o vendedor abaixo dos R$ 5.000.
4) O processo atual funciona; migrar o HERMES para um Projeto no Claude.ai resolve a dor de alternar plataformas em duas horas. SKAG exportada sem revisão vira gasto errado com verba do cliente.
5) Scraping quebra a cada mudança do Google; API oficial pendente; tokens baratos (R$ 5 a 15 por diagnóstico) mas manutenção é hora do Viny.
6) Adoção: novo fluxo exige treino; opção C é o sétimo projeto aberto.
Muda de opinião se houver 10+ reuniões/mês sem preparo e os produtos estiverem estáveis. Alternativa 80%: Projeto único no Claude.ai com HERMES + Cérebro + briefing YAML; Motor 2 só gera estrutura de campanhas em planilha revisada; Motor 1 não começa.

## Parecer do JUIZ
Notas: Mercado 8, Métricas 7, Investimento 8, Esforço 5, Custo de oportunidade 6. Veredito GO CONDICIONAL com travas a) escopo congelado em ADR-001 (MVP = Motor 1 + copy YAML; nada mais antes de 3 diagnósticos reais), b) contratos de saída validados por script, c) humano no circuito, d) GMN só por Places com campo verificado/estimado, e) fixtures dos dois clientes reais, f) time-box de 2 sprints de 8 h. Opção D. Ordem: coletor do Motor 1 → copy YAML → roteiro → uma campanha CSV. Cortar do MVP: SKAG, redes sociais, "quem anuncia" automático, sitelinks automáticos, publicação via Windsor, mini app, multiusuário. Alternativa mínima: prompts unificados num Projeto do Claude.ai + script coletor do Places, 2 dias, ~60% do valor.
