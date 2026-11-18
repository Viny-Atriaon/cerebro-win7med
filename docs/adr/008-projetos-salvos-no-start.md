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
- **Pendência:** a cópia do dia fica no próprio servidor. A cópia fora da HostGator (como a tarefa Win7-BackupFora faz com o GoogleX e o MetaX) depende de o Viny autorizar mexer nessa tarefa.
