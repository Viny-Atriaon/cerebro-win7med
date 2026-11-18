# ADR-006: LP modelo por cliente e fluxo inteiro no chat
> Data: 14/10/2026 · Status: aceito · Complementa: ADR-005 (a apresentação ao vivo ganha o passo do modelo) · Decisor: Viny (Owner) · Conselho: `docs/CONSELHO-03.md` (GO CONDICIONAL)

## Contexto
O Viny achou o fluxo complexo: o agente gera um JSON, depois é preciso abrir o Gerador no GitHub e colar o bloco para ter o relatório. Ele pediu para tudo acontecer no chat. Com os dados do cliente, o sistema gera o relatório e também personaliza uma landing page modelo no padrão Win7 Med (`construtor-lp/PADRAO-LP-WIN7.md`), hospedada no servidor da Win7 com uma URL gratuita do Cloudflare. O modelo leva a logo do cliente ou a da Win7 Med, o vídeo base da Win7 Med, a headline do serviço principal na cidade, convênios fictícios e depoimentos fictícios. A mesma base serve todas as reuniões.

## Decisão
1. **Um comando no chat.** `node motor1-diagnostico/scripts/cliente.mjs clientes/<slug>/diagnostico.json [--logo arquivo] [--servico "..."] [--publicar]` gera três coisas:
   - o diagnóstico em HTML, com a logo do cliente;
   - `onboarding-<slug>.html`, o Gerador já aberto com aquele cliente, com o botão "Apresentar no onboarding", sem colar JSON;
   - a LP modelo.
   O link do modelo fica gravado no bloco (`lp_modelo.url`) e aparece no diagnóstico (seção "O modelo da sua página") e na apresentação ao vivo (passo próprio). O agente portátil e o Gerador público continuam valendo para quem usa outra IA.
2. **LP modelo derivada do padrão aprovado.** `motor1-diagnostico/lp-modelo/modelo.html` sai do `publicado-v6` da CG (mesma grade, cores, tipografia, barra fixa, pop-ups). `lp-modelo.js` preenche só variáveis validadas:
   - nome, cidade e UF;
   - serviço principal e lista de serviços;
   - telefone, endereço e nota, lidos do perfil do Google no diagnóstico;
   - logo e as 4 cores da marca, com contraste conferido.
   Saúde usa "Convênio A" a "J", "Agendar exame" e "Depoimentos de pacientes". O segmento geral usa "Parceiro A" a "J", "Agendar serviço" e "Depoimentos de clientes".
3. **Travas do conselho embutidas e conferidas por máquina** (`conferir`):
   - faixa fixa de modelo, sem marcador;
   - noindex por meta, cabeçalho e robots;
   - nenhum GTM, gtag, pixel ou formulário ativo; enviar ou ligar só abre o aviso "Nada foi enviado";
   - nenhum nome de operadora real;
   - nenhum link de telefone ou WhatsApp;
   - nenhuma mídia externa nem fora da lista fechada.
4. **Hospedagem: `modelo.win7.ai` no cPanel da Win7**, como domínio adicional (o plano não tem limite), com registro A proxied na zona win7.ai do Cloudflare.
   - Caminho opaco por cliente, `/m/<12 letras ou números>/`, estável entre gerações.
   - Mídia compartilhada em `/base/`.
   - Raiz sem listagem.
   - **Atualização de 14/10, com autorização do Viny:** o Chrome força HTTPS e caía na página de erro do servidor, porque a hospedagem ainda não tinha emitido o certificado de `modelo.win7.ai` (AutoSSL; o plano não tem `sslinstall`). A zona win7.ai passou de SSL "Full" para "Flexible": o modelo abre em HTTPS na hora. Os outros 13 registros da zona são túneis do Cloudflare e responderam igual antes e depois da troca. Quando o certificado sair na origem, a zona volta para "Full".
5. **Publicação.** `publicar_lp_modelo.py` usa o acesso por token do construtor de LPs. Ele recusa arquivo fora da lista fechada e envia a raiz e a base só quando mudam. Tira do ar os modelos com mais de 30 dias e confere a página no ar.
6. **Vídeos base.** A Win7 coloca `hero.mp4` (e `hero.webp`) e `depoimento-1.mp4` a `-3.mp4` em `lp-modelo/base/`. Os arquivos ficam fora do git. Enquanto não existem, o modelo mostra molduras "Exemplo ilustrativo". Vídeo de cliente real nunca entra (lista fechada).

## Alternativas rejeitadas
- **Cloudflare Pages (`*.pages.dev`)**: exige login do Wrangler ou token novo do Viny. Fica como alternativa se o servidor sair.
- **Regra de SSL só para o subdomínio**: exigiria permissão de regras que o token não tem. Por isso a troca foi na zona inteira, autorizada pelo Viny e conferida nos outros subdomínios.
- **Esperar o certificado da hospedagem**: sem previsão, e o link não abria no Chrome nesse meio tempo.
- **GitHub Pages**: exige repositório público, e os nomes e logos dos clientes ficariam expostos.
- **Reaproveitar vídeos e depoimentos de clientes reais**: proibido (imagem, LGPD, contrato).
- **Depoimentos com atores de banco de imagens**: a licença proíbe sugerir endosso, e o conselho vetou rosto realista.

## Consequências
- Mais fácil: uma frase no chat, com links e prints, vira diagnóstico, apresentação e modelo de página publicado. O cliente vê a própria página na reunião.
- Mais difícil e aceito: o modelo é público para quem tiver o link, sem login. Por isso não leva nada além do que é público do cliente. Os vídeos base dependem da Win7.
- Pendente: voltar a zona win7.ai para SSL "Full" quando a origem tiver o certificado de `modelo.win7.ai`, e os vídeos base da Win7 Med.

## Adendo de 14/10/2026 (noite): LP modelo no celular e vídeo simulado
- **Vídeo simulado no topo,** no computador e no celular, porque toda página Win7 tem vídeo. Enquanto o vídeo base não existe, entra uma cena em movimento nas cores da marca, com play, legenda, barra de progresso, duração e selo "Vídeo ilustrativo". O play abre o aviso de onde entra o vídeo real.
- **No celular, o vídeo sobe para o banner,** depois do título e do subtítulo. O botão "Agendar exame" vem logo abaixo.
- **Topo e barra fixa:** o telefone do topo não quebra linha; abaixo de 420 px fica só o ícone. A barra fixa do celular ficou mais discreta: 50 px de altura e texto de 16 px.
