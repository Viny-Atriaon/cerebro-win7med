# ADR-001: Escopo do Cérebro Win7 Med e decisões do Owner
> Data: 14/10/2026 · Status: aceito · Decisor: Viny (Owner e decisor técnico)

## Contexto
O processo inicial de cada cliente da Win7 Med roda em três ferramentas e duas plataformas (prompt do diagnóstico no Claude.ai, HERMES no ChatGPT, padrão de LP no construtor-lp). O Viny quer um sistema único, com dois motores, que também entregue campanhas de Google Ads e trabalhe o Índice de Qualidade. O conselho de 5 agentes deu GO CONDICIONAL (`docs/CONSELHO-01.md`).

## Decisão
1. Dois motores, construídos por partes: Motor 1 (diagnóstico, antes da reunião de onboarding) primeiro; Motor 2 (planejamento e criação, depois da reunião) em seguida. Só para clientes novos.
2. Engenharia pelo Padrão Universal v3.5 (imutável). Estrutura da landing page pelo Padrão de LP Win7 v1.0. Um não substitui o outro.
3. Um domínio por cliente: raiz = exame prioritário; demais exames em subcaminhos (`/tomografia`, `/ultrassom`).
4. Páginas só para tráfego pago: `noindex` na meta e no cabeçalho, sem sitemap, AdsBot nunca bloqueado.
5. Política de privacidade enxuta (LGPD básica) volta. RT obrigatório em todas as páginas.
6. Duas campanhas de Google Ads Pesquisa por cliente: padrão (grupos por exame e intenção) e SKAG completa (um termo por grupo). Só exata e frase. Nunca ampla. Títulos ≤ 30 e descrições ≤ 90 caracteres validados em código.
7. A copy entrega o mapa de relevância para o Índice de Qualidade e o relatório de cobertura das palavras-chave na página.
8. Motor 2 entrega também o checklist de pendências do cliente para o grupo de WhatsApp.
9. Motor 1 trabalha com dados informados pelo comercial e com a leitura pública dos links (Google Meu Negócio, site, Instagram) pelo navegador, sem API paga. Sem Google Cloud.
10. Fora do escopo: motor de redes sociais, nomes de campanha, lista de negativas (ficam com o gestor de anúncios da Win7), publicação automática, mini app web, alteração das LPs já no ar.
11. Hospedagem das LPs: HostGator (cPanel da Win7) com os scripts do construtor-lp.

## Alternativas rejeitadas (metade do valor está aqui)
- Só migrar os três prompts para um Projeto no Claude.ai (parecer Contra #2): rejeitada pelo Owner; fica como fallback para o comercial quando o Viny não estiver disponível.
- SKAG só para termos cabeça (Contra #1 e Juiz): rejeitada pelo Owner; SKAG completa.
- Places API / Google Cloud para o Motor 1 (Pró #1): rejeitada pelo Owner; leitura pública pelo navegador com print e data.
- Mini app interno (opção C): adiado até haver segundo operador e 10 diagnósticos validados.
- HTML escrito livremente pelo modelo a cada cliente: rejeitado pelas travas do conselho; template + JSON (ADR-002).

## Consequências
- Mais fácil: um repositório, uma memória, prompts versionados, fixtures de regressão, saídas validadas por script.
- Mais difícil e aceito: o Viny é o operador até existir segundo operador; "quem anuncia" e Instagram dependem de print tirado no navegador, não de API; SKAG completa exige validador forte e revisão do gestor antes de subir.
