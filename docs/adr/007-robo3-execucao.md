# ADR-007: Robô 3 (Motor 2 ampliado): da transcrição à página no ar
> Data: 14/10/2026 · Status: aceito · Decisor: Viny (Owner) · Amplia: ADR-001 (Motor 2) · Substitui em parte: ADR-006 (a página real sai do mesmo template da LP modelo, não do construtor-lp) · Conselho: o CONSELHO-01 já aprovou o Motor 2 (GO CONDICIONAL); o que muda aqui é decisão do Owner

## Contexto
Com a análise (diagnóstico) e o onboarding prontos, o Viny pediu o terceiro robô. Depois da reunião, ele faz:
- a copy de cada landing page;
- o roteiro de vídeo de cada página;
- o planejamento de Google Ads;
- as páginas, já no servidor da Win7;
- a configuração do domínio, se ele já estiver pago.

Os termos das campanhas entram no texto da página para melhorar o Índice de Qualidade. A página real leva o RT verdadeiro e uma política de privacidade verdadeira, única para qualquer segmento.

Decisões do Viny no chat (14/10/2026, tarde):
- **Escopo aprovado como proposto.** O histórico está em `historico/HISTORICO-DA-CONVERSA-2026-10-14.md`, fora do git.
- **Sem Google Drive.** Nos testes, o que subia para o Drive precisava ser baixado de volta para ler imagens e PDFs, o que pesava a máquina e atrasava o processo. A equipe manda o caminho de uma **pasta local** com os dados do cliente, em qualquer computador.
- **Pontos de controle mantidos.** "Ir ao ar" é subir a página com todas as informações para a revisão interna, em que a Win7 aprova e pede ajustes. A campanha só entra no ar depois que o gestor de Google Ads monta a campanha e as integrações estão feitas.
- **Próximos passos:** fechar o primeiro protótipo e depois fazer a apostila e o vídeo do processo.

## Decisão
1. **A entrada é uma pasta local do cliente**, informada no chat. O robô procura os arquivos pelo nome e pela extensão:

   | Arquivo | Nome ou formato |
   |---|---|
   | Diagnóstico | `diagnostico.json` |
   | Mapeamento do onboarding | `mapa-onboarding*.json` |
   | Transcrição | `.txt`, `.md`, `.pdf` ou `.docx` |
   | Logo e fotos | imagens da pasta |
   | Vídeos | `video*` e `depoimento*` |
   | Logos dos convênios | pasta `convenios/` |
   | Integrações | `integracoes.json` |

   As saídas vão para `<pasta>/entregas-win7/`.
2. **Vale o mesmo princípio do Motor 1.** A IA escreve os dados (`ficha.json` e `plano.json`), e o motor `motor2-execucao/motor/motor-execucao.js` valida e monta. A IA nunca escreve HTML. O agente fica em `agente/AGENTE-EXECUCAO-WIN7MED.md`, e um teste reprova se ele divergir do motor.
3. **As etapas têm pontos de controle:**
   - **`ficha`:** reúne os fatos do cliente, cada um com a fala da reunião que o sustenta. O que for incerto vira `a_confirmar` e entra no checklist do WhatsApp. **Ponto 1:** o Viny confere a ficha.
   - **`entregas`:** para cada página, gera a copy (no formato "landing page formatada" do `Exemplo Planejamento.pdf`), o roteiro de vídeo (9 blocos com tempo e abertura fixa), o planejamento de Google Ads (padrão e SKAG) e o relatório de cobertura das palavras-chave.
   - **`pagina` e `publicar --previa`:** monta as páginas e as publica num endereço de prévia. **Ponto 2:** aprovação interna.
   - **`publicar --dominio`:** publica no domínio do cliente e confere no ar.
4. **Formatos de saída:**
   - PDF com a identidade Win7 Med (Win7 nos outros segmentos) para a ficha, a copy, os roteiros e o planejamento;
   - CSV para importar no Google Ads Editor;
   - texto pronto para o grupo do WhatsApp.

   Os ajustes são pedidos no chat, e o robô refaz tudo a partir do `plano.json`.
5. **A página real sai do mesmo template da LP modelo**, em modo `real`. Assim ela fica igual ao que o cliente aprovou na reunião: cores, base do banner e estrutura.
   - Do `construtor-lp` vêm o formulário nativo `win7-form.js` (copiado byte a byte), os scripts de cPanel e Cloudflare e as regras do `PADRAO-LP-WIN7.md` (seções, SEO só com texto visível e QA).
   - O padrão recebe um adendo: RT no cabeçalho, volta da política de privacidade, 3 bases de banner com movimento contínuo e noindex. Isso fecha a pendência P-03.
6. **Uma página por serviço no mesmo domínio.** A principal fica na raiz, as demais em subcaminhos (como `/tomografia/`) e a política em `/politica-de-privacidade/`.
   - O noindex vai na meta e no cabeçalho `X-Robots-Tag`.
   - O `robots.txt` fica liberado e não há sitemap.
   - O AdsBot nunca é bloqueado.
7. **A política de privacidade é única** para qualquer segmento e cobre o básico da LGPD: controlador, dados coletados, finalidades e bases legais, compartilhamento, retenção, direitos do titular, cookies e contato.
   - Na saúde entra um parágrafo a mais: o formulário não pede dado de saúde e, se a pessoa enviar, o dado é tratado como sensível.
   - Fica registrada a recomendação de uma revisão jurídica única do modelo.
8. **As integrações vêm de `integracoes.json`:** IDs do formulário Win7, token do Portal, GTM, Google Ads e rótulo da conversão.
   - Sem elas, a página sobe em modo **pré-integração**: o formulário abre o WhatsApp sem gravar o lead.
   - O relatório lista o que falta antes da campanha.
9. **Publicação:**
   - **Prévia:** em `modelo.win7.ai/previa/<token>/`, com noindex.
   - **Domínio:** com o domínio pago e os servidores DNS apontados para a Cloudflare, o robô cria os registros e o domínio adicional no cPanel, envia os arquivos, acerta as permissões e confere no ar.
   - **Fora do robô:** comprar o domínio e trocar os DNS no Registro.br fica com quem tem o login.
10. **O robô nunca publica campanhas.** O CSV sai com tudo pausado e nomes provisórios. Nomes, negativas e ativação ficam com o gestor. As palavras-chave usam só correspondência exata e de frase.
11. **Referências de conteúdo (pedido do Viny, 14/10):**
    - **A copy segue o padrão de LP da Win7** (`PADRAO-LP-WIN7.md`: topo com logo, telefone e RT; banner com H1 "serviço em cidade", subtítulo, vídeo e botão; convênios; depoimentos; endereço; etiqueta Win7) e o formato do `Exemplo Planejamento.pdf`.
    - **O HERMES V11.3 serve de noção de estratégia, sem ser seguido à risca.** Ficam dele: a região só com a cidade do cliente (nunca inferida, nunca com estado no título), a headline estrutural "SERVIÇO EM CIDADE" com uma frase persuasiva logo abaixo, nada inventado, convênios como benefício, prova social sem exagero e o projeto listado antes de executar.
    - **O roteiro segue o HERMES e o exemplo de ressonância da pasta:** 9 blocos (abertura, dor, agravamento, serviço, diferencial, diferencial, prova, CTA, reforço) com o tempo de cada um, de 50 a 60 segundos. A abertura é exata: "Se você estava no google procurando por [serviço] em [cidade], você chegou ao lugar certo!", sem o estado.
12. **O teste de regressão usa um cliente fictício:** a Clínica Vértice, com transcrição fictícia. Nenhum dado de cliente real entra no git. O roteiro de ressonância e o `Exemplo Planejamento.pdf` da pasta do Viny servem só de referência de formato.

## Alternativas rejeitadas
- **Google Drive como entrada e saída:** rejeitada pelo Owner. Era preciso baixar os arquivos para lê-los, a máquina ficava pesada e o processo, lento.
- **Página real feita no construtor-lp a partir de um briefing YAML** (o plano do ADR-001 e da F4): rejeitada. Com dois templates, a página real divergiria do que o cliente viu na reunião (cores e base do banner). Um template em dois modos garante a mesma página.
- **DOCX editável:** adiado. O ajuste é pedido no chat e o robô refaz; o PDF é a peça de leitura.
- **Robô publicando a campanha na conta:** rejeitada. O ADR-001 exige humano no circuito, e a API oficial ainda está pendente.

## Consequências
- **Fica mais fácil:**
  - uma pasta por cliente, sem nuvem;
  - o que foi aprovado na reunião é o que vai ao ar;
  - os ajustes são refeitos por comando.
- **Fica mais difícil, e foi aceito:**
  - a página real depende do template da LP modelo, então qualquer mudança no template exige QA nos dois modos;
  - as integrações dependem do cadastro interno da Win7;
  - a troca de DNS depende de quem tem o login do Registro.br.
