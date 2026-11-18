# Agente do Robô 3 · Execução Win7 Med (v1.0)
> Cérebro Win7 Med · ADR-007 · roda no Claude Code com o repositório `cerebro-win7med`. Para o segmento de saúde a marca é Win7 Med; para os demais, Win7.
> O robô 3 entra **depois da reunião de onboarding** e vai até a página no ar para a revisão interna. Você (IA) escreve **dados** (`ficha.json` e `plano.json`); o motor (`motor2-execucao/motor/motor-execucao.js`) valida e monta documentos, campanhas e páginas. Você nunca escreve HTML.

## 1. Entrada: a pasta do cliente
A equipe manda o caminho de uma **pasta local** (sem Google Drive). **Qualquer formato e qualquer nome servem**: o robô reconhece pelo conteúdo o diagnóstico, o mapeamento e a transcrição em JSON, HTML, PDF, DOCX, TXT ou MD. O HTML do diagnóstico e o do mapeamento trazem os dados embutidos (comentário `w7-dados`); o JSON baixado no fim da apresentação também. PDF e os demais viram texto em `entregas-win7/_contexto/`: leia e complete a ficha. O mínimo é o diagnóstico ou o mapeamento, mais a transcrição.

| Arquivo | Para quê |
|---|---|
| diagnóstico | robô 1: `diagnostico.json`, o HTML baixado do Gerador ou o PDF |
| mapeamento da reunião | robô 2: o JSON baixado junto com o PDF, o HTML do Mapa, o PDF ou o rascunho exportado da apresentação; traz verba, páginas, base do banner, domínio, dados conferidos, pendências, termos |
| transcrição | Gemini: PDF, DOCX, TXT, MD ou HTML, com qualquer nome |
| `logo.png` / `.jpg` / `.webp` / `.svg` | logo da página; `logo*.svg`, `.pdf`, `.ai`, `.eps` contam como vetor |
| `video*.mp4` / `.mov` | vídeo da página (vira 720p até 5 MB e poster) |
| `depoimento*.mp4` / `.mov` | depoimentos em vídeo (só reais, com autorização de imagem) |
| `convenios/<nome>.png` | logos dos convênios; o nome do arquivo é o nome do convênio |
| `integracoes.json` | IDs do formulário Win7 e rastreamento (seção 8) |

## 2. Ativação
Como no robô 1: a página https://viny-atriaon.github.io/diagnostico-win7med/robo3.html (e o passo 4 do Gerador, e o resumo da apresentação) tem o botão **"Copiar comando inicial"**. Colado numa conversa nova do Claude Code, o comando liga este robô; você confirma que está ativo e pede o endereço da pasta do cliente. Se a pasta for `clientes/<cliente>` com outro nome no disco, o comando acha pelo registro dos modelos ou pelo nome do diagnóstico; o mapeamento baixado na reunião é trazido de Downloads.

## 3. Fluxo (execução controlada: listar antes, um ponto de controle por vez)
1. `node motor2-execucao/scripts/robo3.mjs <pasta> ler`: inventário, texto da transcrição em `entregas-win7/_transcricao.txt` e o `ficha-rascunho.json` (tudo que o Mapa e o diagnóstico já garantem). **Liste para o Viny as páginas (serviço, região, cliente) antes de seguir.**
2. Leia a transcrição inteira e complete o rascunho; salve como `ficha.json` (seção 4).
3. `robo3.mjs <pasta> ficha`: valida (toda citação precisa estar na transcrição) e gera a ficha em PDF e a mensagem do grupo do WhatsApp. **Ponto de controle 1: o Viny confere a ficha.**
4. Escreva o `plano.json` (seções 5 a 7).
5. `robo3.mjs <pasta> entregas`: valida e gera a landing page formatada e o roteiro de cada página (PDF), o planejamento de Google Ads (PDF, CSV do Editor e JSON), as páginas reais em `entregas-win7/site/` e a cobertura das palavras-chave. Erro de validação: corrija o plano e rode de novo.
6. `robo3.mjs <pasta> publicar --previa`: publica em `https://previa.win7.ai/<token>/`. **Ponto de controle 2: aprovação interna.**
7. `robo3.mjs <pasta> publicar --dominio <dominio.com.br>`: com o domínio pago, a zona criada na Cloudflare (painel, conta da Win7) e os servidores DNS trocados no Registro.br por quem tem o login. Use `--simular` antes para ver o que será feito. Na saúde, sem o RT confirmado a página não vai ao domínio.

A campanha nunca é publicada pelo robô: o gestor importa o CSV, define nomes, negativas, lance e locais, e ativa depois das integrações.

## 4. Ficha (`ficha.json`, esquema `w7-ficha` versão 1)
- **Nada inventado.** Cada fato tem `valor`, `fonte` (`mapa`, `transcricao`, `diagnostico` ou `cliente`), `citacao` e `status` (`confirmado` ou `a_confirmar`).
- **Fonte `transcricao` exige `citacao` literal**, com pelo menos 3 palavras, copiada da transcrição (o motor confere ignorando acento e pontuação). Sem fala que sustente, o fato fica `a_confirmar` e vira pergunta no grupo.
- `fatos`: `nome_publico`, `telefone`, `whatsapp` (DDD e número: celular com 9 dígitos ou fixo com WhatsApp Business), `endereco`, `horario`, `site`, `rt` (saúde: nome e CRM), `razao_social`, `cnpj`, `email_privacidade`, `selo` (só com dado confirmado pelo cliente, no formato "12 anos de referência em Cidade").
- `dores`: o que o cliente final sente, com a fala da reunião. `diferenciais`: do Mapa e da transcrição; promessa que o cliente não garante (ex.: "encaixe no mesmo dia") fica `a_confirmar`.
- `convenios.lista`: os nomes citados; a lista completa vem pelo grupo.
- `paginas`: uma por serviço, na ordem do Mapa (a principal na raiz, `slug` vazio; as demais com `slug` em minúsculas e hífen). A quantidade segue a verba (`verba.paginas`).
- `autorizacoes.preco`: `true` só se o cliente autorizou divulgar preço (com a fala citada em `observacoes`).

## 5. Copy de cada página (`plano.json`, esquema `w7-plano` versão 1: `plano.paginas[].copy`, padrão de LP da Win7)
A estrutura é a do `PADRAO-LP-WIN7.md` e do "Exemplo Planejamento" (landing page formatada): topo com logo, telefone e RT; banner; convênios; depoimentos; endereço; rodapé com a política e o símbolo da Win7. Do HERMES ficam só as noções de estratégia: a região é a cidade do cliente (nunca inferida, nunca com estado no título), headline estrutural "SERVIÇO EM CIDADE" e, logo abaixo, uma frase persuasiva com foco na dor; convênios como benefício; prova social sem exagero.

| Campo | Regra |
|---|---|
| `title` | até 60 caracteres, com o serviço e a cidade |
| `description` | de 120 a 155 caracteres, com serviço, cidade e o convite ao WhatsApp |
| `subtitulo` | até 20 palavras: a frase persuasiva, com os termos que as palavras-chave precisam encontrar na página |
| `pontos` | exatamente 3, até 8 palavras cada, só diferenciais confirmados |
| `cta` | "Agendar exame" (saúde) ou "Agendar" + serviço |
| `texto_whatsapp` | a primeira mensagem que o paciente manda |
| `legenda_video`, `conv_titulo`, `dep_titulo`, `alt_poster`, `alt_logo` | textos curtos; o motor tem padrão para os vazios |

Opcionais: `plano.paginas[].convenios: false` tira a seção de convênios daquela página (ex.: página só do particular). `plano.parceiros` liga, em todas as páginas, um botão no fim da página que abre a área para clínicas parceiras: `{ selo, chamada, subtitulo, botao, titulo, texto (obrigatório), beneficios: [], cta, whatsapp (comercial; sem ele usa o da página), texto_whatsapp }`; só benefícios confirmados pelo cliente. `plano.como_chegar: false` tira o link "Como chegar" do endereço. Depoimentos combinados na reunião (`depoimentos.vai_enviar` ou `vai_gravar` = "sim") e ainda não enviados aparecem como molduras "Em produção".

O H1 é sempre o serviço e a cidade, montado pelo motor. Sem superlativo nem promessa ("melhor", "o mais", "garantido", "100%", "cura", "sem dor", "número 1", "líder", "antes e depois"), sem travessão e sem preço sem autorização: o motor reprova.

## 6. Roteiro de vídeo (`plano.paginas[].roteiro.blocos`)
Exatamente 9 blocos, nesta ordem: `abertura`, `dor`, `agravamento`, `servico`, `diferencial`, `diferencial`, `prova`, `cta`, `reforco`. Tempos fixos: 7, 6, 6, 6, 6, 6, 7, 7 e 7 segundos (58 s). Até cerca de 3 palavras por segundo.
- **Abertura exata, sem estado:** "Se você estava no google procurando por [serviço em minúsculas] em [cidade], você chegou ao lugar certo!"
- A dor e o agravamento vêm das `dores` da ficha; os diferenciais e a prova, de fatos confirmados.
- CTA: "Clique agora no botão do WhatsApp e converse com nossa equipe."
- Reforço com o nome da clínica: "[Nome], entre em contato e agende sua [serviço]!"
- `cena` (opcional) orienta quem grava ou o vídeo com IA.

## 7. Google Ads (`plano.paginas[].anuncios`, `.grupos`, `plano.sitelinks`, `plano.frases`)
- `anuncios.titulos`: de 8 a 15, até 30 caracteres, sem exclamação, sem repetir. `anuncios.descricoes`: de 2 a 4, até 90 caracteres.
- `grupos`: um por intenção, com `intencao` em `geral` (obrigatório: serviço e cidade), `preco`, `convenio`, `urgencia`, `perto`, `agendamento` ou `marca`; `palavras` em minúsculas, sem símbolo (a correspondência exata e de frase é do motor; nunca ampla); `titulos` e `descricoes` próprios do grupo, opcionais.
- Use os `termos` do Mapa como base. De 5 a 60 palavras-chave por página; a mesma palavra não vai para duas páginas.
- A campanha padrão sai dos grupos; a SKAG sai sozinha, um grupo por palavra-chave. As duas pausadas, com a verba do Mapa. Nomes, negativas e ativação ficam com o gestor.
- `sitelinks`: `texto` até 25, `descricao1` e `descricao2` até 35. `frases`: até 25 caracteres.
- **Cobertura (Índice de Qualidade):** o núcleo de cada palavra-chave (tudo menos as palavras de intenção como preço, perto, agendar, convênio) precisa estar no texto visível da página: H1, subtítulo, pontos, convênios e "Atendemos também quem vem de" (as cidades do Mapa). Palavra sem núcleo na página reprova as entregas: ajuste o subtítulo ou os pontos, ou tire a palavra.

## 8. Integrações (`integracoes.json`, opcional até a campanha)
```json
{ "data_cliente": "ID criptografada", "data_form": "ID do form", "data_token": "win7_site_...", "gtm": "GTM-XXXXXXX", "google_ads": "AW-000000000", "rotulo_conversao": "" }
```
Os IDs vêm da tela "Editar cliente" do sistema da Win7. Sem eles a página fica em **pré-integração**: o formulário abre o WhatsApp sem gravar o lead, e o relatório avisa.

## 9. Saída para o Viny
Mensagem curta: as páginas, o que ficou a confirmar, os arquivos em `entregas-win7/` (ficha, landing page formatada e roteiro de cada página, Google Ads em PDF e CSV), a cobertura das palavras-chave, o link da prévia e o que falta para o domínio e a campanha.
