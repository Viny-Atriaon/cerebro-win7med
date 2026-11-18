# ADR-009: Repositório público do Cérebro, com história saneada
> Data: 18/11/2026 · Status: aceito · Decisor: Viny (Owner) · Substitui: "Repositório privado" (AGENTS.md, 14/10/2026)

## Contexto
O Viny pediu em 18/11/2026: "Eu preciso que o cérebro dos robôs, né, tanto do projeto de análise inicial quanto o robô 3, seja um repositório público, que não seja privado, ou só uma pessoa A, B ou C tem acesso, até porque é um sistema que a gente vai utilizar, outros colaboradores vão utilizar as análises dos onboards para poder criar os projetos."

O repositório `Viny-Atriaon/cerebro-win7med` era privado. A história dele cita clientes reais (nomes, cidades, pastas, links de prévia com token), a consultora e o contato dela, um painel com token e o IP de origem do servidor, que fica escondido atrás da Cloudflare. Tornar público como estava publicaria tudo isso, inclusive em commits antigos.

## Decisão
1. **A história antiga continua privada.** O repositório antigo foi renomeado para `Viny-Atriaon/cerebro-win7med-historico`, com a história completa: PR-001 a PR-022 e o commit `f792c4e` dos projetos salvos.
2. **`Viny-Atriaon/cerebro-win7med` é um repositório novo e público**, com um primeiro commit sem história (órfão) feito a partir da árvore saneada. O endereço é o mesmo, então o comando inicial do robô 3 e os links não mudam.
3. **O que nunca entra no repositório público:**
   - nome, cidade ou pasta de cliente real;
   - link de prévia ou de modelo com token;
   - dado da equipe (nome, telefone, e-mail pessoal);
   - painel ou endereço interno com token;
   - IP de origem e pasta da conta do servidor;
   - segredo de qualquer tipo.
   
   O estado de cada cliente fica na pasta do cliente (fora do git) e nos projetos salvos do start.win7.ai (ADR-008).
4. **Como o código continua funcionando sem esses dados:**
   - a pasta da conta vem do próprio cPanel (`cpanel.home()`, ou `CPANEL_HOME`);
   - o IP de origem vem do registro A de `modelo.win7.ai` na Cloudflare (`cloudflare.ip_servidor()`, ou `SERVIDOR_IP`);
   - tokens e senhas ficam no `credenciais.env`, que é entregue em particular a quem publica.
5. **Os testes continuam barrando nomes reais sem expor os nomes:** a regressão do Motor 1 compara cada palavra do diagnóstico, do agente e do Gerador com uma lista de hashes (`PROIBIDOS`).
6. **Trava contra vazamento da história antiga:** o `.githooks/pre-push` recusa qualquer push cujo commit contenha a raiz da história privada (`.githooks/raiz-privada`).
7. **Quem usa:**
   - qualquer colaborador clona o repositório sem pedir acesso;
   - o robô 1 (Gerador) e o robô 3 rodam;
   - publicar no servidor e no DNS continua exigindo o `credenciais.env` (INSTALAR.md).

## Alternativas descartadas
- **Tornar público o repositório como estava:** publicaria os dados dos clientes, a consultora e o IP de origem nos commits antigos.
- **Reescrever a história (filter-repo) e forçar o push:** o mesmo resultado com mais risco. Qualquer clone antigo ainda tem a história, e um push errado devolveria tudo.
- **Manter privado e convidar cada colaborador:** foi o que o Viny pediu para acabar ("só uma pessoa A, B ou C tem acesso").

## Consequências
- Os hashes do ledger até o PR-022 só existem no repositório histórico. O ledger diz isso no topo.
- Clones antigos (com a história privada) não podem mais dar push no público: o pre-push recusa. Para trabalhar no público, clone de novo ou use o ramo `main` novo.
- Commits do repositório público usam o e-mail `noreply` do GitHub, nunca o e-mail pessoal.
