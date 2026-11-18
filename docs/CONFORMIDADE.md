# Conformidade com o padrão v3.5 — Cérebro Win7 Med

> Adoção em 14/10/2026 por decisão do Owner (Viny): "padrão de engenharia versão 3.5 como regra imutável". Porte `app-simples`: scripts, prompts e skills. Desde 18/11/2026 há um servidor pequeno (PHP no cPanel, ADR-008) só para os projetos salvos do start.win7.ai; os dados ficam no servidor, nunca no repositório. Dados de clientes ficam fora do git (`clientes/`, `saida/`).
> Prazo padrão das pendências: 06/11/2026 (mesmo prazo da exceção GOV-AUDIT-01 do próprio padrão). Dono das decisões: o Owner (Viny).

## Como cada regra roda sozinha (GOV-ENFORCE-01)
| Ponto | Situação |
|---|---|
| 1. Verificação antes do push | `.githooks/pre-push`: `scripts/audit.sh` + as três regressões (Motor 1, robô 3 e API do start com PHP local). Ativar por clone: `git config core.hooksPath .githooks`. |
| 2. CI | `.github/workflows/verificacao.yml`: mesma auditoria e as mesmas regressões (a da API roda com o PHP do executor do GitHub). |
| 3. Ambiente em execução | start.win7.ai: `npm run audit:runtime` (`scripts/audit-runtime.conf`: cabeçalhos da página e da API, arquivos sensíveis, saúde, prontidão, bundle sem segredo; `--abuse` roda as defesas contra uma instância descartável). O publicador também confere página, API e `api/lib` fechado a cada publicação. O Gerador público segue estático no GitHub Pages (HTTP 200 nas URLs e varredura de dados pessoais no build). |
| 4. Evidência | Saída de `audit.sh` e de `npm test` colada no `ESTADO.md` e no ledger a cada checkpoint. |

## Regras que tocam este repositório
| Regra | Situação | Evidência ou prazo |
|---|---|---|
| CTX-KIT-01 | cumpre | AGENTS.md, ESTADO.md, README, docs/FASES.md, docs/adr/, docs/CORRECOES.md, docs/PONTOS-DE-RESTAURACAO.md, .env.example criados antes de qualquer código (F0) |
| CTX-RESTORE-01/02/03 | cumpre | ledger append-only; savepoint antes de operação de risco |
| DEP-QUARENTENA-01 / DEP-MINIMAL-01 | cumpre | zero dependências de terceiros em Node; `.npmrc` com `ignore-scripts=true` |
| PIPE-SUPPLY-01 | cumpre | `package-lock.json` versionado; `engines` e `.nvmrc` fixam o Node |
| IA-ENCODING-01 | cumpre | arquivos UTF-8 sem BOM; o audit.sh reprova mojibake |
| IA-EVIDENCE-01 | cumpre | nenhuma fase fecha sem saída colada. F1 (14/10): `npm test` = 20 ✅ · 0 ❌ (regressão do cliente piloto); `validar.mjs` = 14 ✅ · 0 ❌ · 1 ⚠️; `qa_prints.py` = 375/768/1440 px sem rolagem horizontal; `audit.sh` = 22 ✅ · 0 ❌. F1.5 (14/10): `npm test` = 120 ✅ · 0 ❌; `qa_onboarding.py` ok (público saúde e geral, arquivo do cliente). F1.3 (14/10): `npm test` = 94 ✅ · 0 ❌; `qa_onboarding.py` ok (saúde e geral, 1440 e 375 px); `audit.sh` = 22 ✅ · 0 ❌ · 6 ⚠️ |
| Regras do prompt do Cérebro (12) | cumpre por máquina | `motor-diagnostico.js` (validarDados + validarHtml) corrige travessão e reprova cor vetada, recurso externo, imagem fora do arquivo, cronograma por mês ou semana, menos de 3 etapas, correspondência ampla, busca sem rótulo, zonas do raio fora de ordem, link de WhatsApp da equipe e verba sem a nota "pago direto ao Google" |
| Sem dado pessoal da equipe (ADR-004) | cumpre por máquina | o motor reprova link de WhatsApp no diagnóstico; a regressão reprova consultora, contato, case, painel ou proposta no diagnóstico, no agente e no Gerador; varredura antes de cada push em `dist/publico` |
| Regressão (exemplo fictício) | cumpre | `exemplo-ficticio.json` (saúde) e `exemplo-geral.json` (outro segmento) rodam no pre-push e no CI; referência por hash do diagnóstico de saúde (`referencia-sha256.txt`, regravada só com `npm run golden` depois de revisar prints) |
| Onboarding ao vivo (ADR-005, CONSELHO-02) | cumpre por máquina | regra de verba testada nos limites; Mapa versionado e bloqueado se inválido; teste de que nenhuma nota de condução vai para o Mapa (Node e navegador); QA em 1440 e 375 px nos dois segmentos (`qa_onboarding.py`), com recuperação depois de recarregar |
| LP modelo (ADR-006, CONSELHO-03) | cumpre por máquina | `conferir` reprova falta de faixa de modelo ou noindex, rastreamento, formulário ativo, telefone ou WhatsApp clicável, nome de operadora real, mídia externa; publicador recusa arquivo fora da lista fechada e expira modelos com mais de 30 dias; `qa_lp_modelo.py` confere que nenhum envio nem requisição externa sai |
| Projetos salvos no start (ADR-008, LGPD) | cumpre (◐) | diagnóstico, respostas e mapeamento no servidor da Win7, fora da pasta pública; conta por pessoa por convite, senha e sessão só em hash, papéis equipe e administrador, nada apagado pela tela (arquivar). Dados de empresa, nunca de paciente. O Gerador público e o arquivo do cliente continuam só no aparelho. Retenção entra na decisão de LGPD das transcrições (pendente, abaixo) |
| SECRETS-* | cumpre | sem segredo; `.env` no `.gitignore` desde o commit 1 |
| TEST-ABUSE-01 / TEST-RUNTIME-01 | cumpre | `start/testes/teste-api-abuso.mjs` (65 checagens: Origin e cabeçalho de escrita, convite de uso único, limites de login com espera, sessão revogada ao desativar, papéis, ids que nunca viram caminho, gravação atômica) no `npm test`, no pre-push e na CI; `scripts/audit-runtime.conf` para o que está no ar |
| TEST-LOAD-01 / SCALE-CAP-01 | não se aplica (◐) | uso interno da equipe (menos de 20 pessoas, uma gravação por resposta com espera de 1,2 s); hospedagem compartilhada sem núcleos próprios. Reavaliar se passar de 20 pessoas ou se o start abrir para cliente. Dono: Viny |
| DEP-SERVICE-01 | cumpre | sem serviço externo novo: o servidor é o cPanel que a Win7 já usa (Lis, GoogleX, LPs) |
| BKP-* | parcial (◐) | código: repositório + fixture reproduzem tudo. Projetos do start: versões anteriores dentro de cada projeto e cópia do dia em `backups/` (30 dias) no próprio servidor. **Pendente:** cópia fora da HostGator e cifrada (como a tarefa Win7-BackupFora faz com o GoogleX e o MetaX), depende de autorização do Viny para mexer nessa tarefa; prazo 18/12/2026. Dono: Viny |
| SEC-HEADERS-02 / OBS-* | cumpre (◐) | start.win7.ai: HSTS, `X-Frame-Options` (SAMEORIGIN nas páginas, DENY na API), nosniff, `Referrer-Policy`, `X-Robots-Tag`, sem listagem de pasta; saúde mínima em `/api/saude`. Zona win7.ai de volta para SSL **Full** em 18/11/2026 (autorização do Viny de 14/10: "voltar para Full quando o certificado sair"); 11 sites da zona responderam igual antes e depois. LPs publicadas seguem a auditoria do construtor-lp |
| LGPD (transcrições e dados de pacientes) | pendente | transcrições do Gemini e dossiês contêm dados de clínicas e podem conter nomes; ficam em `clientes/` fora do git; definir retenção e local (Drive da Win7) até 06/11/2026. Dono: Viny. |
