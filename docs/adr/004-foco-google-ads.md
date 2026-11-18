# ADR-004: Motor 1 vira Diagnóstico para Google Ads, sem dados pessoais da equipe
> Data: 14/10/2026 · Status: aceito · Substitui em parte: ADR-003 (configuração interna, edição interna, Instagram e Facebook no placar, proposta e case no laudo) · Decisor: Viny (Owner)

## Contexto
Ao ver o Motor 1 v2, o Viny pediu: "pode tirar os dados da consultora, contatos dela, e deixar focado no diagnóstico de anúncios no Google Ads". O diagnóstico é feito antes da reunião de onboarding, com a clínica já cliente. Proposta, preços, case de outro cliente, painel ao vivo e cartão de consultora eram peças de venda.

O teste de ponta a ponta com uma IA nova (um cliente real, 14/10) mostrou mais quatro pontos. O Google bloqueia a leitura automática do Maps e da busca. O critério "WhatsApp em um clique" punia o próprio padrão de LP Win7, que usa formulário curto antes do WhatsApp. As zonas do raio vieram fora de ordem. E o arquivo do agente tinha 13 trechos ambíguos.

## Decisão
1. **Foco em Google Ads.** O documento passa a se chamar "Diagnóstico para Google Ads", com placar de **Prontidão para Google Ads** em 3 pilares: Busca no Google 35, Site e página de destino 35, Google Meu Negócio 30, com 27 critérios. Entram critérios novos: `marca_protegida` (concorrente anunciando no nome da clínica), `politica_privacidade`, `tag_google`. O critério `whatsapp_um_clique` vira `contato_whatsapp`, em que um botão ou um formulário curto contam como "sim". Instagram e Facebook saem do placar e ficam só como contexto, em `fontes_extras`.
2. **Sem dados pessoais nem peças de venda.** Saem do motor, do Gerador e do agente: consultora (nome, foto, WhatsApp), link do painel ao vivo, case, planos, preços, validade e pergunta de fechamento. Entram três seções:
   - **verba sugerida por campanha**, somada pelo motor e "paga direto ao Google";
   - **para confirmar na reunião de onboarding**;
   - **conclusão** sem contato.
   O validador reprova qualquer link de WhatsApp no diagnóstico.
3. **Edição única do Gerador.** Sem dado interno, não há mais edição interna nem `config/config-interno.json`. A foto da consultora e a configuração foram apagadas do repositório (ficam no histórico do git local). O repositório público nunca as conteve, conforme o teste de privacidade da v2.
4. **Prints como entrada padrão.** A abertura do agente pede 3 prints: o perfil no Maps, a busca "exame + cidade" e a busca pelo nome. Sem print e sem acesso, o pilar fica fora e vira pergunta para a reunião.
5. **Raio em faixas crescentes.** `km_ate` precisa crescer de uma zona para a outra, ou o motor recusa. Cidade fora da faixa gera aviso.
6. **As 13 ambiguidades viraram regras no agente**: abertura condicional, dois sites, conflito de dados, velocidade só com medição, tipo de exame como intenção, UF na cidade ambígua, convênio principal desconhecido, campos vazios fora do JSON, entre outras.

## Alternativas rejeitadas
- **Manter Instagram e Facebook no placar com peso menor**: o pedido foi foco em Google Ads, e as redes não mudam a prontidão para anunciar. Ficam como contexto.
- **Manter a edição interna com o case e o painel** para uso comercial: o diagnóstico é de onboarding, não de venda. Se o comercial precisar de peça de venda, é outro documento.
- **Raspar a busca do Google com navegador automático**: viola os termos do Google e falha com frequência. Prints da equipe são mais fiéis.

## Consequências
- Mais fácil: o diagnóstico vira insumo direto para o Motor 2. Raio, termos, verba e perguntas alimentam as campanhas e a reunião. Nenhum dado pessoal circula.
- Mais difícil e aceito: sem prints, os pilares de maior peso podem ficar fora do placar. A equipe precisa tirar os prints na cidade da clínica.
