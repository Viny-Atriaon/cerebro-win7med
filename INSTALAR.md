# Instalar o Cérebro Win7 Med em outro computador

O Cérebro roda no Claude Code. O repositório é **público** (ADR-009): qualquer pessoa da equipe clona sem pedir acesso. Os três robôs precisam dele, do Node e do Python com Playwright. Só para **publicar** no servidor e no DNS da Win7 é preciso o arquivo de acesso (seção 3). **Dado de cliente, histórico de conversa e senha nunca entram no git.**

Os projetos dos clientes (diagnóstico, onboarding e mapeamento) ficam salvos em https://start.win7.ai, com conta por pessoa: peça o convite a quem administra o Cérebro (ADR-008).

## 1. Programas
| Programa | Versão usada | Para quê |
|---|---|---|
| Git | qualquer recente | baixar e atualizar o projeto |
| Node.js | 24 | motores, testes, comandos `cliente.mjs` e `robo3.mjs` |
| Python | 3.12 | PDFs, prints de QA, cores da logo, transcrição e publicação |
| ffmpeg | 9 | vídeo da página em 720p e poster |
| PHP | 8.3 (no Windows: `winget install PHP.PHP.8.3`) | só para a regressão da API do start.win7.ai (`npm test`) |
| Claude Code | app desktop (aba Code) ou terminal | onde os robôs trabalham |

Bibliotecas do Python (uma vez):
```bash
pip install playwright==1.62.0 pillow==12.2.0 pymupdf==1.28.0
```
```bash
python -m playwright install chromium
```

## 2. Projeto
```bash
git clone https://github.com/Viny-Atriaon/cerebro-win7med.git
```
Dentro da pasta, ligue o fiscal que roda antes de cada envio:
```bash
git config core.hooksPath .githooks
```
Confira que está tudo certo (as três regressões precisam passar: Motor 1, robô 3 e API do start):
```bash
npm test
```

## 3. Acesso ao servidor da Win7 e à Cloudflare
Só para quem publica. Crie a pasta `.segredos` na raiz do projeto e coloque nela o arquivo `credenciais.env`, que o Viny passa por fora (nunca por e-mail aberto, nunca no git). Chaves esperadas, sem os valores:
```
CPANEL_HOST=
CPANEL_USER=
CPANEL_TOKEN=
CLOUDFLARE_TOKEN=
# opcionais: sem elas, a pasta da conta vem do cPanel e o IP do servidor vem do registro de modelo.win7.ai
CPANEL_HOME=
SERVIDOR_IP=
```
Teste os dois acessos:
```bash
python servidor/cpanel.py teste
```
```bash
python servidor/cloudflare.py teste
```
A primeira deve responder "OK, conectado à conta da Win7"; a segunda, "token: active".

## 4. Usar
Abra o Claude Code **com a pasta do projeto como pasta de trabalho**. Assim ele lê `AGENTS.md`, `ESTADO.md` e os atalhos.
- `/diagnostico`: robô 1 (diagnóstico, arquivo do onboarding e LP modelo em modelo.win7.ai).
- Na reunião: o arquivo `onboarding-<cliente>.html` abre a apresentação (robô 2) e baixa o mapeamento em JSON.
- `/robo3 <caminho-da-pasta-do-cliente>`: robô 3 (ficha, copy, roteiro, Google Ads, páginas, prévia em previa.win7.ai e domínio).

## 5. O que fica fora do git (por regra)
`clientes/`, `historico/`, `dist/`, `.segredos/`, as pastas `entregas-win7/` e os vídeos base da LP modelo. Para levar um cliente de um computador a outro, copie a pasta dele por fora, ou baixe o diagnóstico e o mapeamento na aba Projetos do start.win7.ai.

O repositório é público: nunca escreva no git nome ou pasta de cliente real, link de prévia, dado da equipe ou endereço do servidor (ADR-009). O pre-push recusa levar a história antiga, que fica no repositório privado `cerebro-win7med-historico`.
