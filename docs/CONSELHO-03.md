# Conselho 03 · LP modelo por cliente e fluxo inteiro no chat

**Data:** 14/10/2026 · **Formato:** conselho rápido de 5 agentes em paralelo (2 prós, 2 contras, 1 juiz), regra padrão do Viny.

**Veredito do juiz: GO CONDICIONAL.** Valor 8 · Métricas 5 · Investimento 9 · Esforço 6 · Custo de oportunidade 6.

**Pedido do Viny (decisão já tomada, o conselho só define travas):**
1. O fluxo "agente gera JSON, colar no Gerador" ficou complexo. Agora tudo acontece no chat: ele passa os dados do cliente e o sistema gera o relatório.
2. Além do relatório, o sistema personaliza uma landing page modelo no padrão Win7 Med, hospedada no servidor da Win7 com uma URL gratuita do Cloudflare.
3. O modelo leva a logo do cliente (ou a da Win7 Med), o vídeo base da Win7 Med no lugar do vídeo dele, a headline do serviço principal na cidade, convênios fictícios e depoimentos em vídeo fictícios.
4. A mesma base serve para todas as reuniões; muda só o que é do cliente. Na reunião de onboarding o cliente já vê um modelo pronto, para testes.

## Pareceres

**Pró negócio.** Ver a própria logo e "Ressonância em Rio Verde" no celular, ao vivo, transforma a promessa em entrega no minuto zero e reduz o arrependimento depois da compra. O modelo vira briefing visual: cada item fictício mostra o que falta o cliente mandar. Condição: selo visível de modelo e página fora do Google. Métricas para 60 dias: assinatura até a página final no ar em até 5 dias úteis; 80% dos clientes mandando o material em até 7 dias após a reunião; 70% das páginas aprovadas com no máximo uma rodada de ajustes.

**Pró técnico.** Viável em 2 sessões: o bloco do diagnóstico ganha um campo opcional, o motor ganha a montagem da página ao lado do relatório, o modelo sai da LP aprovada (publicado-v6). Hospedagem: Cloudflare Pages exige uma ação do Viny; o plano B que já funciona é um subdomínio no cPanel com DNS em win7.ai pelos tokens atuais. URL com sufixo aleatório, noindex por cabeçalho, meta e robots, vídeos base com nome fixo para trocar todos de uma vez.

**Contra técnico.** Do jeito pedido, é publicidade enganosa: depoimento e convênio fictícios com a marca de uma clínica real (CDC art. 37, Res. CFM 2.336/2023, CONAR); vídeo de paciente de outro cliente é uso indevido de imagem e dado sensível (CC art. 20, LGPD art. 11); logo de operadora sem autorização é uso indevido de marca. Não pode entrar: vídeo, foto, voz ou nome de paciente real; rosto realista gerado por IA; logo ou nome de convênio real; promessa de resultado; formulário que funcione; pixel ou tag; nome do cliente ou da cidade na URL. Travas: vídeo só o institucional da Win7 Med (vazio com legenda enquanto não existir); depoimentos e convênios como molduras "Exemplo ilustrativo", nomes genéricos, nenhum rosto; faixa fixa de modelo não removível; noindex, X-Robots-Tag e robots; token aleatório e expiração; formulário sem efeito; modelo derivado do padrão congelado, nunca vira a página no ar.

**Contra negócio.** Contra no formato proposto: o cliente pode tomar o fictício como promessa, pedir mudanças de layout antes da hora, e o material concorre com a apresentação ao vivo. Aprova se: template único congelado, trocando só logo, nome, cidade e serviço; tarja "modelo ilustrativo" e espaços marcados no lugar de pessoas e operadoras; noindex e link que expira; qualquer pessoa da Win7 gerar sem o Viny; o modelo entrar como etapa da apresentação ao vivo, não como outro link; teto de 1 dia e teste em 5 reuniões.

**Juiz.** Travas:
1. Fictício explícito: faixa fixa "Modelo de demonstração"; depoimentos com selo "ilustrativo", sem nome nem rosto; convênios genéricos ("Convênio A, B, C"), nunca marca real.
2. Indexação zero: meta noindex, X-Robots-Tag, robots.txt bloqueando tudo, sem sitemap, sem pixel e sem GA.
3. Formulário inerte, com o aviso "em produção, este contato chega no seu WhatsApp"; a barra não leva o número do cliente.
4. Vídeos de clientes reais proibidos: lista fechada de mídias; o script bloqueia a publicação com qualquer outro arquivo.
5. Caminho opaco por cliente, sem nome, cidade ou CNPJ; apagar após 30 dias.
6. Base congelada: o chat só preenche variáveis validadas (logo, serviço, cidade, nome).

Cortes da v1: formulário funcional, analytics, domínio próprio por cliente, cores livres, vários serviços na mesma página, depoimentos gerados por IA com rosto realista, painel de gestão.

## Como cada trava foi atendida (F1.4)

| Trava | Como ficou |
|---|---|
| Faixa fixa de modelo | faixa "Modelo para aprovação · vídeo, convênios e depoimentos são ilustrativos · página não publicada" no próprio `modelo.html`, sem marcador: o gerador não tem como tirar; a conferência reprova sem ela |
| Depoimentos sem rosto nem nome | cards 9:16 com silhueta e selo "Exemplo ilustrativo"; só tocam vídeo se a Win7 colocar `depoimento-N.mp4` na base |
| Convênios genéricos | "Convênio A" a "Convênio J" (no segmento geral, "Parceiro A"); a conferência reprova nomes de operadoras reais |
| Indexação zero | meta robots noindex, nofollow, noarchive; `X-Robots-Tag` no `.htaccess`; `robots.txt` com `Disallow: /`; sem sitemap, sem GTM, sem gtag, sem pixel |
| Formulário e telefone inertes | formulários com `data-modelo`, sem `win7-form.js`; enviar, Ligar e o telefone do topo só abrem o aviso "Nada foi enviado"; o QA confere que nenhuma requisição sai |
| Lista fechada de mídia | `midiaPermitida` no motor e a mesma lista no publicador: raiz, base da Win7 e, por cliente, `index.html` e `logo.*`; qualquer outro arquivo recusa a publicação |
| Caminho opaco e expiração | `https://modelo.win7.ai/m/<12 letras ou números>/`; registro local fora do git; o publicador tira do ar o que passou de 30 dias |
| Base congelada | o chat só preenche variáveis validadas: nome, cidade, serviço, logo, cores (com contraste conferido); todo texto é escapado |
| Etapa da apresentação ao vivo | passo "O modelo da sua página" entra na apresentação quando o link existe, com nota de condução que segura pedidos de mudança de layout |
| Sem depender do Viny | um comando gera tudo: `node motor1-diagnostico/scripts/cliente.mjs clientes/<slug>/diagnostico.json --publicar` |

## Decisões do Viny que prevalecem sobre pareceres
- **Logo e nome do cliente no modelo** (contra técnico pedia cautela): o cliente já fechou e o modelo é dele, para aprovação. Mitigação: faixa de modelo, noindex, caminho opaco, expiração.
- **Hospedagem no servidor da Win7 com Cloudflare** (pró técnico preferia Cloudflare Pages): o cPanel funciona hoje sem ação do Viny; Pages fica como alternativa se o servidor sair.

## Ficam em aberto para o Viny
- Vídeo base de apresentação da Win7 Med e os depoimentos base: entregar os arquivos (`hero.mp4`, `depoimento-1.mp4` a `-3.mp4`), com cessão de imagem de quem aparece.
- Métricas do Pró negócio e o teste do Contra negócio (5 reuniões).
