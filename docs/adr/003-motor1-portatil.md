# ADR-003: Motor 1 portátil, com identidade própria Win7 Med
> Data: 14/10/2026 · Status: aceito · Substitui em parte: ADR-002 (o renderizador Node e o visual copiado do cliente piloto) · Decisor: Viny (Owner)

## Contexto
Na revisão do F1, o Viny apontou dois problemas. O diagnóstico copiava o HTML do cliente piloto, e ele quer um motor próprio, nas cores da Win7 Med. E o motor só rodava no Claude Code do Viny, enquanto ele quer que a equipe preencha o diagnóstico em qualquer IA. Pedido literal: um arquivo Markdown que, enviado numa conversa (Claude, ChatGPT ou outra IA) ou lido pelo link de um repositório do GitHub, ative o agente sozinho. O agente faz as perguntas, analisa os links (Google Meu Negócio, site, Instagram, Facebook e a conversa comercial), sugere raio e termos de pesquisa e entrega o diagnóstico em HTML. Ele também pediu para avaliar a publicação online (Netlify, Tailscale ou similar).

## Decisão
1. **Identidade própria: o Laudo de Presença Digital.** O diagnóstico tem a forma de um laudo de exame (impressão diagnóstica, indicação, técnica, achados, conduta, evolução). Usa a paleta da logo Win7 Med: petróleo da linha "Imagem", as quatro cores do 7 e a linha de batimento como fio condutor. A fonte é Outfit, a mesma do padrão de LP. Nada do layout do cliente piloto.
2. **Motor próprio de análise.** Placar de 0 a 100 por canal com 34 critérios e pesos fixos: Google 30, Busca 25, Site 20, Instagram 15, Facebook 10. Inclui a conta das avaliações para a próxima faixa de nota, o raio em até 3 zonas, os termos de pesquisa por exame e intenção (só exata e frase), a agenda vazia e a projeção. Toda conta fica no código.
3. **Separação agente × gerador** (mantém o princípio do ADR-002). A IA nunca escreve HTML: entrega um bloco JSON. O `motor-diagnostico.js` valida, calcula, pontua e monta o laudo. É um arquivo sem dependências que roda no navegador e no Node.
4. **Agente portátil** `agente/AGENTE-DIAGNOSTICO-WIN7MED.md`. É uma fonte única, com cabeçalho de ativação, mensagem de abertura, 5 blocos de perguntas, método de investigação com origem e data por dado, as chaves exatas dos critérios, regras de escrita e o modelo do JSON. Um teste de regressão garante que as chaves do agente e do motor são as mesmas e que o modelo do JSON é aceito pelo Gerador.
5. **Gerador HTML em arquivo único**, que abre por duplo clique e offline. A equipe cola o bloco, vê a prévia, as pendências e as regras conferidas, e baixa o laudo. A **edição interna** já traz a consultora, a foto, o link do painel e o case, e fica em `dist/interno`, nunca publicada. A **edição pública** não traz nenhum dado interno: a equipe importa `config-win7med.json` uma vez por navegador.
6. **Publicação no GitHub** em `Viny-Atriaon/diagnostico-win7med`, repositório público porque o link precisa abrir para qualquer IA. O README é o próprio agente, e o GitHub Pages serve o Gerador (`https://viny-atriaon.github.io/diagnostico-win7med/`). O conteúdo publicado é só o build de `dist/publico`, verificado por teste: nada de painel, case, consultora, preços ou dado de cliente.

## Alternativas rejeitadas
- **A IA gera o HTML completo na conversa**: o arquivo teria uns 150 KB, com a logo e a fonte em base64. As IAs erram ao copiar base64, e as regras viram sugestão. Rejeitada.
- **HTML pequeno que carrega o motor por CDN (jsDelivr) dentro de um artifact**: depende de internet e da política de cada plataforma, e o resultado não abre offline. Fica como melhoria possível, não como caminho principal.
- **Netlify**: funciona, mas é mais uma conta e um deploy separado. O GitHub Pages publica junto com o repositório que já precisa existir para o link do agente. A troca é simples se o Viny quiser um domínio da Win7 Med.
- **Tailscale (servir do PC)**: depende do PC ligado e expõe a máquina. Rejeitada para conteúdo estático.
- **Mini app com a Claude API (formulário, IA e laudo numa página só)**: precisa de backend, chave e custo por uso, e é a opção C que o conselho adiou. Continua adiada; o caminho atual cobre o fluxo sem servidor.
- **Repositório privado**: o link não abriria para as IAs. Rejeitada; a privacidade vem de manter os dados internos fora do build público.

## Consequências
- Mais fácil: qualquer pessoa da equipe gera o laudo em qualquer IA. Todo laudo sai com o mesmo visual e as mesmas regras. Mudar o visual exige mexer num lugar só, e os testes protegem o agente, o motor e a privacidade.
- Mais difícil e aceito: a metodologia do agente fica pública. Ativar só pelo link depende da IA: algumas pedem confirmação antes de seguir instruções de uma página, e a resposta é "sim, comece". O Gerador público precisa da configuração importada para sair com a consultora e o painel.
- A fixture do cliente piloto foi aposentada. O exemplo fictício (Clínica Vértice Imagem) passa a ser a regressão pública.
