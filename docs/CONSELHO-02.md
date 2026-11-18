# Conselho 02 · Onboarding ao vivo, Mapa do Onboarding e qualquer segmento

**Data:** 14/10/2026 · **Formato:** conselho rápido de 5 agentes em paralelo (2 prós, 2 contras, 1 juiz), regra padrão do Viny.

**Veredito do juiz: GO CONDICIONAL.** Valor 8 · Métricas 5 · Investimento 7 · Esforço 5 · Custo de oportunidade 4.

**Pedido do Viny (decisão já tomada, o conselho só define travas):**
1. O diagnóstico vale para qualquer segmento, não só saúde.
2. O diagnóstico vira apresentação navegável, no celular e no computador, usada ao vivo na reunião de onboarding.
3. A apresentação é o roteiro de quem conduz, mesmo sem experiência, com perguntas preenchidas ao vivo: verba (R$ 3.000 = 2 páginas; R$ 59 por dia por segmento, em até 3 = 3 páginas), diferenciais, convênios, serviços a anunciar, depoimentos em vídeo, vídeo da página e cidades do raio.
4. No fim, um botão gera o "mapeamento": o Mapa do Onboarding, que junto com a transcrição registra o que foi resolvido.
5. A ferramenta fica hospedada no servidor.

## Pareceres

**Pró negócio.** Padroniza toda reunião e acaba o "esqueci de perguntar". Tira o Viny do gargalo: um júnior conduz e o Viny revisa o Mapa. Corta as idas e vindas pelo WhatsApp e alimenta o Motor 2 com campos estruturados. Métricas propostas para 60 dias, com linha de base nos últimos 5 onboardings: dias entre o fechamento e a campanha no ar caem 40%; mais de 70% dos Mapas conduzidos por não sênior aprovados sem correção estrutural; no máximo 1 pedido de informação ao cliente depois da reunião.

**Pró técnico.** Viável e de baixo risco, em 4 sessões mais 1 de folga. Página estática no mesmo GitHub Pages, roteiro descrito como dado, perfil por segmento, salvamento automático no aparelho com exportar e importar, regra de verba numa função simples e Mapa com conferência de campos obrigatórios.

**Contra técnico.** Risco de perder a reunião se o estado ficar só na memória; dois aparelhos sem servidor geram dois arquivos diferentes; a generalização pode apagar convênio, responsável técnico e regras de conselho do fluxo de saúde. Travas mínimas:
1. Salvamento automático a cada campo, recuperação ao reabrir, exportar sempre visível e "Apagar deste aparelho" no fim.
2. Uma pessoa preenche; as outras acompanham pela tela compartilhada.
3. Segmento como perfil de dados. Um JSON antigo de saúde gera exatamente o mesmo HTML, com teste contra uma saída de referência.
4. Regra de verba em função isolada, testada em 0, 1.499, 1.500, 3.000, 4.500 e 9.000.
5. Teste em 375 px obrigatório.
6. JSON com versão do formato.
7. Nenhum dado de paciente; "subir no servidor" quer dizer continuar como página estática.

**Contra negócio.** Contra na forma pedida: oito blocos ao vivo podem virar interrogatório; a regra de verba na tela pode virar promessa ou teto; placar ruim projetado deixa o cliente na defensiva; generalizar enfraquece a Win7 Med. Aprova se: o diagnóstico for apresentado como oportunidades; a regra de verba ficar só no uso interno; houver piloto em 5 onboardings de saúde antes de abrir para outros segmentos; o Mapa tiver no máximo 10 itens; a manutenção tiver um responsável que não seja o Viny. Alternativa: checklist em documento compartilhado.

**Juiz.** Travas:
1. Mapa com formato versionado, testes da regra de verba e exportação bloqueada se o Mapa for inválido.
2. Sem servidor nem login na v1: página estática, rascunho no aparelho, exportação em HTML e JSON. Nenhum dado de cliente vai para o servidor ou para o repositório público.
3. Segmento é dado, não código; convênios só no pacote de saúde.
4. Notas de condução nunca aparecem no HTML do cliente, com teste automático.
5. Funciona em 375 px e offline, com ensaio em celular real antes da primeira reunião.
6. Prazo de 5 dias úteis. Aceite: 3 onboardings reais com Mapa válido em até 60 minutos.

Cortes da v1: vídeo por IA só registra a escolha; lista de convênios vira pendência do grupo; cidades em lista, sem mapa interativo; sem sincronização entre aparelhos; só saúde e um perfil genérico; sem motor de copy.

## Como cada trava foi atendida (F1.3)

| Trava | Como ficou |
|---|---|
| Formato versionado e Mapa bloqueado se inválido | `w7-mapa-onboarding` versão 1; `validarMapa` separa erros de avisos e o botão de gerar fica desligado com erro |
| Regra de verba testada nos limites | `regraVerba` isolada no motor; regressão cobre 0, 1.499, 1.500, 3.000, 4.500, 9.000 e o valor por dia (R$ 50 e R$ 59 × 3) |
| Sem servidor e sem dado no repositório | página estática no GitHub Pages; respostas só no navegador de quem conduz; exportar, importar e apagar |
| Salvamento e recuperação | salvamento automático a cada campo, recuperado ao reabrir ("Respostas recuperadas deste aparelho"); o QA recarrega a página e confere |
| Uma pessoa preenche | sem sincronização; documentado no ADR-005 |
| Segmento como dado | `cliente.setor` (`saude` ou `geral`); vocabulário, logo, critério de RT e textos de convênio vêm de dados; exemplo fictício do segmento geral na regressão |
| JSON antigo de saúde igual | corpo do diagnóstico de saúde idêntico ao da v3 (conferido em 14/10); referência por hash na regressão (`npm run golden` só depois de revisar prints) |
| Notas nunca no Mapa | teste automático em Node e no QA do navegador |
| 375 px e offline | QA em 1440 e 375 px sem rolagem horizontal e sem erro de console; Gerador sem recurso externo |
| Apresentado como oportunidades | passo "Onde estão as oportunidades"; a nota de condução manda apresentar o placar como ponto de partida |

## Decisões do Viny que prevalecem sobre pareceres
- **Qualquer segmento desde já** (Contra negócio pedia piloto só em saúde): pedido explícito do Viny. Mitigação: saúde é o padrão quando o setor não é informado, e o fluxo de saúde ficou idêntico ao da v3.
- **Regra de verba na conversa com o cliente** (Contra negócio pedia só uso interno): o Viny descreveu a regra como fala da reunião ("até R$ 3.000, duas landing pages"). Mitigação: a apresentação mostra a regra como critério técnico para gerar dados, e a nota pede para explicar que a verba é paga direto ao Google.

## Ficam em aberto para o Viny
- Aceite do juiz: 3 onboardings reais com Mapa válido em até 60 minutos, e ensaio em celular real antes do primeiro.
- Responsável pela manutenção que não seja o Viny (Contra negócio).
- Métricas do Pró negócio, com linha de base nos últimos 5 onboardings.
