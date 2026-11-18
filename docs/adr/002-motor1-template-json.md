# ADR-002: Motor 1 renderiza de template fixo a partir de um JSON de fatos
> Data: 14/10/2026 · Status: aceito · Decisor: Viny (Owner); proposta técnica da IA

## Contexto
O prompt original do Cérebro pede ao modelo que escreva o HTML inteiro a cada cliente. Isso produz páginas bonitas, mas sem garantia de regra (travessão, cor vetada, fonte externa, número sem fonte) e sem regressão possível. O conselho exigiu HTML de template, fatos com fonte e matemática em código.

## Decisão
- A entrada do Motor 1 é um único arquivo `diagnostico.json` por cliente, validado contra `motor1-diagnostico/esquema/diagnostico.schema.json`. Cada fato numérico carrega `valor`, `fonte` e `status` (`verificado` | `observado` | `informado` | `estimado`).
- O modelo (skill `/diagnostico`) só preenche o JSON: coleta, dossiê e narrativa. Nunca escreve HTML.
- `renderizar.mjs` (Node 24, sem dependências) monta o HTML a partir do template (CSS extraído do cliente piloto, fontes do sistema, imagens convertidas para base64) e das seções presentes no JSON. Seções opcionais só aparecem quando há dado.
- `calcular.mjs` faz toda a matemática: avaliações que faltam para a nota alvo, horários vazios × ticket, projeção por cenário. O texto do modelo nunca contém conta própria.
- `validar.mjs` reprova o HTML com: travessão, cor vetada (por matiz, não só por hex), recurso externo (`http` em `src`, `link`, `@import`, `url()`), imagem fora de base64, ausência de viewport, de card da consultora ou do WhatsApp, mês ou semana no cronograma, simulação sem rótulo "ilustrativo", tamanho acima de 3 MB.
- `qa_prints.py` (Playwright) gera prints em 375 e 1440 px e acusa rolagem horizontal.
- A fixture `motor1-diagnostico/fixtures/<cliente-piloto>/` reproduz o diagnóstico do cliente piloto e roda em `npm test` antes de qualquer push.

## Alternativas rejeitadas
- HTML livre pelo modelo com checklist de revisão humana: rejeitado; não há regressão e a regra vira sugestão.
- Template com motor de templates de terceiros (Handlebars, Nunjucks): rejeitado; dependência desnecessária e quarentena de 14 dias (DEP-QUARENTENA-01); template literal em Node resolve.
- Gerar PDF em vez de HTML: rejeitado; o HTML abre em TV, notebook e celular, com link vivo do painel.

## Consequências
- Mais fácil: regressão com o cliente piloto, validação automática, mudanças de layout em um lugar só, dossiê reaproveitado pelo Motor 2.
- Mais difícil e aceito: seção nova exige mudar o esquema e o renderizador; a narrativa precisa caber nos campos previstos (o que também força texto curto, regra 2 do prompt).
