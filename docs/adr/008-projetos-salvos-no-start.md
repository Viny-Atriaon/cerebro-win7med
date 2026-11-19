# ADR-008: Projetos salvos no start.win7.ai (diagnóstico, onboarding e mapeamento)
> Data: 18/11/2026 · Status: aceito · Decisor: Viny (Owner) · Revoga: a regra "Respostas da reunião não saem do aparelho" (ADR-005) **só no start.win7.ai** · Mantém: o Gerador público (GitHub Pages) e o arquivo de onboarding do cliente continuam sem enviar nada · Desenho herdado: servidor da Lis (`../lac-atendimento-ia`, ADR-004 de lá)

## Contexto
Em 18/11/2026 o Viny relatou o gargalo: "Criei um onboard hoje, uma análise, e aí fizemos um onboard e isso não ficou salvo. Eu preciso que isso fique salvo lá dentro do sistema, do Start, para se alguém precisar rever ou ter acesso a informações de um projeto passado". Outros colaboradores vão usar as análises dos onboardings para criar os projetos (robô 3).

Até aqui o start.win7.ai era estático: o diagnóstico vivia na aba do navegador (rascunho em `sessionStorage`) e as respostas do onboarding no `localStorage` de quem conduzia. Fechou a aba, trocou de computador ou de pessoa: perdeu.

## Decisão
1. **Um servidor pequeno no próprio start.win7.ai**, em PHP sem dependências, no cPanel da Win7 (o mesmo da Lis, do GoogleX e das LPs). Código em `start/api/` (`index.php` e `lib/base.php`), publicado junto com as páginas por `scripts/publicar_start.py`.
2. **Dados em JSON fora da pasta pública** (`start-cerebro-dados`, na pasta da conta), gravação sob trava de arquivo e renomeio atômico (queda no meio nunca deixa arquivo pela metade):
   - `projetos/indice.json` (lista) e `projetos/<id>.json` (um por cliente);
   - `usuarios.json`, `convites.json`, `estado/` (sessões, limites);
   - `backups/AAAA-MM-DD/<id>.json` (cópia do dia de cada projeto, 30 dias);
   - `logs/AAAA-MM-DD.log`.
3. **O que fica salvo em cada projeto:**
   - o diagnóstico (o bloco normalizado do Gerador) e a logo do passo 3;
   - as respostas do onboarding, a cada mudança (fila com nova tentativa se a internet cair; a cópia do aparelho continua como reserva e a mais nova vence ao reabrir);
   - o mapeamento (os dados do Mapa, que o robô 3 lê);
   - as 5 versões anteriores do diagnóstico e do onboarding, o histórico (quem fez o quê e quando) e a etapa (diagnóstico, onboarding, mapeamento).
4. **Quando grava:** só em ação da pessoa (Gerar, abrir arquivo, trocar a logo, responder, gerar o Mapa). Abrir a página nunca grava. O exemplo fictício nunca é salvo. Um id de projeto só vale para o mesmo cliente: outro bloco colado na mesma página vira outro projeto, nunca grava por cima.
5. **Acesso por pessoa, por convite.** Sem conta compartilhada:
   - o administrador gera o link de convite na aba Equipe (vale 7 dias, uma vez; só o hash do token fica guardado) e a pessoa cria a própria senha (mínimo de 10 caracteres, guardada como hash);
   - o primeiro convite de administrador sai pela publicação (`--convite-admin "Nome"`), sem e-mail: a pessoa escreve o dela ao aceitar, e o link fica só em `.segredos/start-convites.txt`;
   - papéis: `equipe` (vê, abre, continua e baixa todos os projetos) e `admin` (também equipe, convites, desativar conta e arquivar projeto). Nada é apagado pela tela: arquivar tira da lista.
6. **Defesas (as mesmas da Lis):**
   - sessão por cookie HttpOnly, SameSite=Lax e Secure, de 72 h, guardada pelo hash do token;
   - escrita só com o cabeçalho `X-Start` e Origin do próprio site;
   - limites de tentativa de login por IP e por conta, com espera progressiva;
   - IP real só pelo `CF-Connecting-IP` vindo da Cloudflare;
   - corpo com teto de tamanho, ids em formato fixo (nunca viram caminho de arquivo), `api/lib` fechado e respostas com `noindex` e `no-store`.
7. **Tela do start:**
   - entrada com login (ou convite) antes de tudo;
   - aba **Projetos**: busca, etapa, quem atualizou e quando; Abrir (o Gerador abre o projeto e a apresentação traz as respostas), baixar o diagnóstico e o mapeamento em JSON para a pasta do robô 3, histórico;
   - **Equipe** no menu da conta (administrador).
   - Sessão vencida no meio da reunião: o login aparece por cima, sem descarregar nada, e a fila de gravação continua depois de entrar.
8. **O Gerador do start é um build próprio** (`W7.start`). O Gerador público no GitHub Pages e o arquivo de onboarding do cliente (`cliente.mjs`) continuam sem servidor e sem enviar nada.

## Alternativas descartadas
- **Supabase ou outro banco de terceiros:** mais um fornecedor com dado de cliente (contrato, LGPD, conta), para meia dúzia de pessoas da equipe. O cPanel da Win7 já guarda a Lis e o GoogleX.
- **Guardar no GitHub:** repositório não é banco, e o cérebro vai ser público (ADR-009).
- **Continuar só no aparelho, com exportar e importar:** foi o que falhou na prática.

## Consequências
- O porte deixa de ser "sem servidor": vale a auditoria do ambiente em execução (`scripts/audit-runtime.conf`) e a regressão de abuso (`start/testes/teste-api-abuso.mjs`, no `npm test`, no pre-push e na CI).
- QA de ponta a ponta no navegador: `npm run qa:start`.
- **LGPD:** o projeto guarda dados de empresa (nome, cidade, CNPJ, telefone e e-mail comercial, nome do RT) e o nome de quem da equipe mexeu. Nenhum dado de paciente. Acesso só da equipe convidada; retenção e cópia fora da HostGator entram na decisão de LGPD já pendente (CONFORMIDADE).
- **Cópia fora da HostGator:** resolvida no adendo abaixo (18/11, autorizada pelo Viny).

## Adendo · 18/11/2026 (tarde): organizar, voltar a uma versão e cópia fora do servidor
Pedido do Viny: "Bota um botão de salvar, sei lá, arquivar, entendeu? Criar pastas, ou o nome de quem fez, algo assim, para identificar." E, sobre o backup: "pode colocar a parte do backup".
1. **Pastas:** qualquer pessoa da equipe cria, renomeia e apaga (só a vazia). O projeto guarda o id da pasta.
   - Na aba Projetos: chips Todos, cada pasta, Sem pasta e Arquivados, com a contagem; e um seletor de pasta em cada projeto.
   - Na Análise: "Pasta no sistema", "Nova pasta" e o botão **Salvar no sistema**.
2. **Quem fez:**
   - cada projeto mostra "Feito por" e "Atualizado por", com data e hora;
   - filtro "Feito por" na aba Projetos;
   - o histórico registra salvar, guardar na pasta, arquivar e voltar de versão.
3. **Salvar:**
   - o Gerar continua salvando sozinho;
   - o botão **Salvar no sistema** salva na hora, com a pasta escolhida; salvar sem mudança fica no histórico como "diagnóstico salvo";
   - na apresentação, o botão **Salvar** grava as respostas na hora. Elas também salvam sozinhas a cada mudança.
4. **Versões:**
   - o sistema guarda as 20 versões anteriores do diagnóstico e as 10 do onboarding;
   - em "Histórico e versões", **Abrir esta versão** mostra a versão antiga na Análise;
   - **Salvar no sistema** volta o projeto para ela, e a versão atual também fica guardada.
5. **Arquivar:** qualquer pessoa da equipe arquiva e desarquiva. Nada é apagado: o projeto vai para Arquivados e o histórico registra quem fez.
6. **Cópia do dia, cifrada, fora da HostGator:**
   - **No servidor:** o cron do cPanel roda `api/lib/cron.php` de hora em hora e gera uma vez por dia `copias/cerebro-AAAA-MM-DD-HHMMSS.json.gz.enc`.
     - Formato WCB1: AES-256-GCM sobre o gzip de todos os projetos, contas e pastas.
     - Vai com as partes em base64 e o `.sha256`, e o servidor guarda as 14 mais recentes.
   - **A chave:** fica em `chave-copia.txt` (0600, fora da pasta pública) e em `.segredos/start-copia.env` no computador que publica. Precisa estar também no gerenciador de senhas.
   - **No computador:** a tarefa Win7-BackupFora (`app/deploy/backup_fora.py` do GoogleX) baixa as cópias para `Documentos\Backups Win7\cerebro` (60 dias) e sobe para o Drive cifrado (90 dias). O Cérebro é opcional ali: a falha dele não derruba a cópia do GoogleX e do MetaX.
   - **Ensaio de restauração:** `node start/testes/restaurar-copia.mjs <arquivo> [--para <pasta-vazia>]`.

## Adendo · 19/11/2026: acesso de administrador com senha temporária
O Viny perguntou: "cadê esses acessos?". Ninguém tinha entrado: o único acesso era o link de convite, que ficou num arquivo local. Ele pediu "um acesso admin que eu possa adicionar outros usuários... uma senha temporária, onde quando eu entrar, depois eu habilite outras senhas".
1. **Senha temporária:** 12 letras e números, sem os que confundem, vale 7 dias.
   - Quem entra com ela só consegue criar a própria senha: a API responde `TROCAR_SENHA` (403) para todo o resto, e a tela mostra "Crie a sua senha".
   - Depois da troca, a temporária para de valer e as outras sessões da pessoa caem.
2. **Acesso de administrador:** `python -X utf8 scripts/acessos_start.py <email>`.
   - O script calcula o hash com o PHP local e envia só o hash, como `usuarios-semente.json` (0600, fora da pasta pública). A API absorve na próxima requisição.
   - O e-mail de login fica fora do código, porque o repositório é público.
   - O HTML com o endereço, o login, a senha temporária e o passo a passo fica em `.segredos/ACESSOS-START.html` (fora do git). A senha nunca aparece no terminal nem no chat.
   - Rodar de novo gera outra temporária. Serve para o administrador que perdeu a senha.
3. **Equipe (administrador):**
   - "Adicionar pessoa" com **Senha temporária**, o padrão: o sistema mostra a senha uma vez, com o botão "Copiar tudo". O **Link de convite** continua como opção.
   - "Redefinir senha" em cada pessoa: sai uma temporária nova e as sessões dela caem.
   - Selo "senha temporária" para quem ainda não criou a senha.
   - "Cancelar" também no convite sem e-mail.
4. **Para todos:** "Trocar minha senha" no menu da conta, que pede a senha atual.
