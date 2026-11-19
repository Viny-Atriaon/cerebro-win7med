# ESTADO — Cérebro Win7 Med
> Atualizado em: 18/11/2026 · Fase atual: start.win7.ai com projetos salvos (ADR-008) e repositório público (ADR-009)
> Teste de validade: uma sessão nova retoma o trabalho lendo SÓ AGENTS.md + este arquivo.
> **Repositório público** (ADR-009): este arquivo não leva nome de cliente, pasta de cliente, link com token, dado da equipe nem endereço do servidor. O estado de cada cliente real fica na pasta do cliente (fora do git, `LEIA-PRIMEIRO.md` ou `ESTADO.md` de lá) e nos projetos salvos do start.win7.ai. A história até 18/11/2026 (PR-001 a PR-022, com os clientes reais) está no repositório privado `Viny-Atriaon/cerebro-win7med-historico`.

## Último checkpoint
- **Super admin (19/11, pedido do Viny):**
  - O super admin é o e-mail do Viny (fica só no servidor, nunca no git), criado com `acessos_start.py <email> --super --nome ... --desativar <genérico>`.
  - Nenhum outro administrador desativa nem redefine a senha dele, e ninguém cria conta ou convite por cima desse e-mail.
  - O `admin@win7.ai` genérico foi desativado.
  - O HTML novo está em `.segredos/ACESSOS-START.html` e foi enviado ao Viny na conversa. A temporária vale até 26/11/2026, com troca obrigatória.
  - Commit `df8deca`, PR-026.
- **Acessos com senha temporária (19/11, adendo da ADR-008, pedido do Viny):** até aqui ninguém tinha entrado, porque o único acesso era o link de convite num arquivo local.
  - **Acesso de administrador:** criado com `scripts/acessos_start.py`. Quem entra com a senha temporária é obrigado a criar a própria senha. A temporária vale até 26/11/2026.
  - **O HTML para o Viny:** `.segredos/ACESSOS-START.html` (fora do git), com endereço, login, senha temporária e passo a passo.
  - **Equipe:** "Adicionar pessoa" com senha temporária (o padrão) ou link; "Redefinir senha"; "Trocar minha senha" no menu da conta.
  - **Conferido no servidor sem entrar no sistema:** conta ativa, marcada para trocar a senha; o hash confere com a senha do HTML; a semente foi absorvida.
  - Commit `62f7c85`, PR-025.
- **Organizar e voltar a uma versão (18/11 tarde, adendo da ADR-008, pedido do Viny):**
  - **Pastas:** qualquer pessoa da equipe cria e organiza. Chips na aba Projetos, seletor em cada projeto e, na Análise, "Pasta no sistema" e "Nova pasta".
  - **Quem fez:** "Feito por" e "Atualizado por" em cada projeto, com filtro "Feito por".
  - **Salvar:** botão **Salvar no sistema** na Análise e **Salvar** na apresentação.
  - **Versões:** 20 do diagnóstico e 10 do onboarding. **Abrir esta versão** e salvar volta o projeto para ela.
  - **Arquivar:** qualquer pessoa arquiva e desarquiva; nada é apagado.
  - Commit `25fd36f`, PR-024; publicado em 18/11.
- **Cópia do dia fora da HostGator (18/11, autorizada pelo Viny):**
  - **No servidor:** o cron do cPanel roda `api/lib/cron.php` de hora em hora, aos 17 minutos, e gera uma cópia por dia cifrada (WCB1) em `start-cerebro-dados/copias`.
  - **A chave:** fica em `.segredos/start-copia.env` (fora do git; precisa ir para o gerenciador de senhas) e no servidor (0600).
  - **No computador:** a tarefa Win7-BackupFora (GoogleX, commit `489a611`) baixa para `Documentos\Backups Win7\cerebro` e sobe para o Drive cifrado.
  - **Ensaio:** `node start/testes/restaurar-copia.mjs`.
  - **Provado em 18/11:** primeira cópia gerada pelo cron às 17:17; baixada pela tarefa e conferida no Drive cifrado; aberta com a chave; `audit-runtime.sh` com 10 ✅ e 0 ❌.
- **LGPD adiada pelo Viny (18/11):** é análise interna, não é exposta ao público e não trata dado sensível. Reavaliar até 18/02/2027 (CONFORMIDADE).
- **Projetos salvos no start.win7.ai (18/11, ADR-008, pedido do Viny):** o diagnóstico e o onboarding de um cliente não ficavam salvos. Agora:
  - **Servidor pequeno em PHP** no cPanel da Win7 (`start/api/`), dados em JSON fora da pasta pública (`start-cerebro-dados`, na pasta da conta).
  - **Acesso por pessoa, por convite:** papéis equipe e administrador; sessão, limites de login e escrita só do próprio site.
  - **Gerar salva o projeto.** Cada resposta do onboarding e o mapeamento também, com fila e nova tentativa se a internet cair.
  - **Aba Projetos:** busca, etapa, quem atualizou, abrir para rever ou continuar, baixar o diagnóstico e o mapeamento em JSON para o robô 3, e histórico.
  - **Equipe** no menu da conta (convites e desativar conta).
  - Versões anteriores e cópia do dia guardadas no servidor.
  - O Gerador público (GitHub Pages) e o arquivo do cliente continuam sem enviar nada.
- **Publicado em 18/11:**
  - https://start.win7.ai: página, API (`/api/saude` 200) e `api/lib` fechado (403).
  - Convite do primeiro administrador criado, sem e-mail: o Viny escreve o dele ao aceitar. O link fica em `.segredos/start-convites.txt` (fora do git), vale 7 dias e funciona uma vez.
  - Gerador público republicado (commit `0e40e93` do `diagnostico-win7med`).
- **Zona win7.ai de volta para SSL Full (18/11):** com a autorização do Viny de 14/10 ("voltar para Full quando o certificado sair"), depois de conferir o certificado de origem de todos os sites da conta. Os 11 sites da zona responderam igual antes e depois.
- **Repositório público (18/11, ADR-009, pedido do Viny):** `Viny-Atriaon/cerebro-win7med` passou a ser público, com história nova e saneada.
  - A história antiga (com clientes reais) está no repositório privado `cerebro-win7med-historico`.
  - Nomes reais nos testes viraram lista de hashes.
  - O IP de origem e a pasta da conta saíram do código: vêm do cPanel, da Cloudflare ou das credenciais.
  - O pre-push recusa qualquer push que leve a história antiga para o público.
  - Primeiro commit do público: `64b7b67` (PR-023). A história anterior termina em `1b0c054`, no histórico.
- **Estado do sistema (18/11):**
  - `npm test`: Motor 1 ok, robô 3 com 60 checagens ok, API do start com 113 checagens ok (pastas, versões, cópia cifrada do dia, senha temporária, super admin).
  - `npm run qa:start`: ok, de ponta a ponta no navegador. Convite, Gerar, onboarding e mapeamento salvos; o projeto reabre em outro navegador sem nada guardado, com as respostas; 1440 e 375 px sem rolagem lateral e sem erro de console.
  - `bash scripts/audit.sh .`: 24 ✅ · 0 ❌ · 4 ⚠️ (sem banco, carga e capacidade não medidas, auditoria de dependências só com `--deps`: ver CONFORMIDADE).
  - `npm run audit:runtime -- --abuse`: 8 ✅ · 0 ❌.

## O que existe
- **Motor 1** (ADR-003 a 006): `agente/AGENTE-DIAGNOSTICO-WIN7MED.md`, `motor1-diagnostico/motor/` (diagnóstico), `lp-modelo/` (LP modelo com as cores da logo e 3 bases de banner), `onboarding/` (roteiro, respostas, Mapa e apresentação ao vivo), `gerador/` (o Gerador), `scripts/` (comando do chat `cliente.mjs`, publicação e QA), `exemplos/` (fictícios).
- **Robô 3** (ADR-007): `agente/AGENTE-EXECUCAO-WIN7MED.md`, `motor2-execucao/motor/motor-execucao.js`, `motor2-execucao/scripts/robo3.mjs` (ler, ficha, entregas, publicar), exemplo fictício `motor2-execucao/exemplos/clinica-vertice/`, página de ativação `motor2-execucao/ativacao/robo3.html`.
- **start.win7.ai** (ADR-008): `start/index.html` (tela única: entrada, Início, Análise, Execução, Projetos, Equipe, batimento), `start/api/` (PHP), `start/roteador-dev.php` e `start/php-dev.ini` (PHP local), `start/testes/` (regressão de abuso, instância descartável e QA no navegador), `scripts/publicar_start.py`.
- **Servidor e DNS:** `servidor/cpanel.py`, `servidor/cloudflare.py` (token em `.segredos/credenciais.env`, fora do git; INSTALAR.md).

## Decisões desta sessão (já gravadas em ADR)
- 18/11: projetos salvos no start, com conta por convite e papéis (ADR-008). Revoga a regra "respostas da reunião não saem do aparelho" só no start.
- 18/11: repositório público com história saneada e histórico privado (ADR-009).

## Próximos 3 passos (concretos, executáveis)
1. O Viny abre `.segredos/ACESSOS-START.html`, entra, cria a senha e adiciona a equipe pela aba Equipe. Se quiser, cancela em Equipe o convite antigo, o sem e-mail.
2. O Viny guarda a chave da cópia do dia (`.segredos/start-copia.env`) no gerenciador de senhas.
3. Ensaio de restauração uma vez por mês, com a cópia mais recente de `Documentos\Backups Win7\cerebro`.

## Bloqueios / pendências
- P-01 e P-02 (AGENTS.md): prospect e transcrição reais para fechar as fases F2 e F7.
- LGPD: adiada pelo Viny em 18/11/2026; reavaliar até 18/02/2027 (CONFORMIDADE).
- CONSELHO-02 em aberto para o Viny:
  - aceite com 3 onboardings reais em até 60 minutos;
  - uma pessoa responsável pela manutenção, que não seja o Viny;
  - métricas com linha de base nos últimos 5 onboardings.
- Vídeo base da Win7 Med e depoimentos base: aguardando os arquivos do Viny, com cessão de imagem de quem aparece.

## Capacidade e hardware (SCALE-CAP-01)
- Uso interno: menos de 20 pessoas, em hospedagem compartilhada (cPanel, sem núcleos próprios). Não medido; reavaliar se passar de 20 pessoas (CONFORMIDADE).
- Hardware do build: PC do Viny (Windows 11, Node 24, Python 3.12, PHP 8.3 do winget para os testes).

## Serviços externos (DEP-SERVICE-01)
- **HostGator (cPanel da Win7):** domínios adicionais `modelo.win7.ai`, `previa.win7.ai` e `start.win7.ai`; dados do start em `start-cerebro-dados`, fora da pasta pública. Acesso por token (credenciais fora do git). Monitor: os publicadores conferem a página no ar; `npm run audit:runtime`.
- **Cloudflare (zona win7.ai, conta da Win7, SSL Full):** registros A com proxy para o servidor (o IP de origem nunca vai para o código).
- **GitHub (conta Viny-Atriaon):**
  - este repositório (público);
  - o histórico privado;
  - o Gerador público em GitHub Pages (`diagnostico-win7med`).

## Fases concluídas (1 linha cada; hashes antigos no repositório histórico)
- F0: Kit de Partida v3.5 (14/10/2026).
- F1 a F1.4: Motor 1 do v1 ao v4, onboarding ao vivo, LP modelo e fluxo no chat (14/10/2026).
- F1.9 e F3 a F6.1: robô 3 completo com o cliente fictício (14/10/2026).
- F7 parcial: robô 3 no primeiro cliente real (04/11/2026; detalhes na pasta do cliente e no histórico).
- F8: projetos salvos no start.win7.ai (18/11/2026, ADR-008).
- F9: repositório público (18/11/2026, ADR-009).
