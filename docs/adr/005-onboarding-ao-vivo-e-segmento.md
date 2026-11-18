# ADR-005: Onboarding ao vivo, Mapa do Onboarding e segmento como dado
> Data: 14/10/2026 · Status: aceito · Complementa: ADR-003 e ADR-004 (o diagnóstico continua igual para saúde) · Decisor: Viny (Owner) · Conselho: `docs/CONSELHO-02.md` (GO CONDICIONAL)

## Contexto
O Viny pediu que o diagnóstico sirva para qualquer segmento e que vire uma apresentação usada ao vivo na reunião de onboarding. Ela é o passo a passo de quem conduz, mesmo sem experiência. Durante a reunião, alguém marca e preenche as decisões: verba, serviços, diferenciais, convênios, cidades do raio, depoimentos em vídeo e vídeo da página. No fim, um botão gera o "mapeamento", que junto com a transcrição registra o que foi resolvido. A regra de verba dele: R$ 3.000 por mês = 2 landing pages com os 2 serviços principais; valor por dia para cada segmento, em até 3, = 3 landing pages.

## Decisão
1. **Segmento é dado.** `cliente.setor` vale `saude` ou `geral`; sem setor vale saúde, para todo bloco anterior continuar igual. O motor tem um vocabulário por setor (`VOCAB`): exame ou serviço, paciente ou cliente, clínica ou empresa, logo Win7 Med ou Win7, convênios ou formas de pagamento. O critério `rt_visivel` é só de saúde; informado fora da saúde, é ignorado com aviso. Os textos dos critérios usam marcadores trocados pelo vocabulário.
2. **Regra de verba no motor.** `regraVerba(mensal)`: R$ 1.500 por mês (cerca de R$ 50 por dia) para cada página e campanha, no máximo 3. R$ 3.000 = 2 páginas; R$ 4.500 = 3. A verba pode ser informada por dia e por serviço (`verbaDiariaParaMensal`): R$ 59 × 3 serviços × 30 dias = R$ 5.310 = 3 páginas. O piso é editável nas respostas (`verba.minimo`), para quando o Viny mudar o valor.
3. **Roteiro como dado.** `motor1-diagnostico/onboarding/onboarding.js` (núcleo sem tela, roda no navegador e no Node) guarda o roteiro de 16 passos, cada um com a nota de condução: capa, roteiro do dia, o que entendemos, oportunidades, busca, site, Google Meu Negócio, as 8 perguntas na ordem pedida (verba, serviços, diferenciais, convênios, cidades, depoimentos, vídeo, confirmações) e o fechamento. Passo sem dado no diagnóstico some (ex.: sem raio, sem cidades).
4. **Apresentação dentro do Gerador.** O botão "Apresentar no onboarding" abre a apresentação em tela cheia (`onboarding/apresentacao.js` e `.css`), com teclado, gesto de arrastar no celular, gaveta do roteiro e notas de condução pela tecla N. As notas nunca entram no Mapa.
5. **Respostas no aparelho.** Salvamento automático no navegador de quem conduz, a cada campo, recuperado ao reabrir; botões de exportar, importar e "Apagar deste aparelho". Uma pessoa preenche; as demais acompanham pela tela compartilhada. Nenhum dado de cliente vai para servidor nem para repositório.
6. **Mapa do Onboarding.** Formato `w7-mapa-onboarding` versão 1, em HTML (para o cliente e o grupo) e JSON (para o Motor 2). Traz verba e páginas, serviços confirmados e os da próxima etapa, diferenciais, convênios, cidades para atuar e fora do raio, depoimentos, vídeo da página, termos dos serviços confirmados, pendências com responsável e pontos confirmados. `validarMapa` bloqueia a geração se faltar verba, serviço, convênios, depoimentos, vídeo ou cidade para atuar.
7. **Hospedagem.** "Subir no servidor" = o mesmo GitHub Pages do Gerador (página estática), sem login e sem banco.

## Alternativas rejeitadas
- **Servidor com banco para várias pessoas preencherem juntas**: dobra o esforço, cria dado de cliente em servidor (LGPD) e não foi pedido como obrigatório. Fica para quando houver segundo operador.
- **Apresentação separada do Gerador**: a equipe teria duas ferramentas e dois links. Dentro do Gerador, o diagnóstico já está carregado na hora da reunião.
- **Segmento por `if` espalhado no código**: o conselho pediu segmento como dado; o vocabulário centralizado deixa o fluxo de saúde idêntico ao da v3 e abre espaço para um terceiro pacote sem mexer na lógica.
- **Checklist em documento compartilhado** (alternativa do Contra negócio): não valida a regra de verba nem gera o JSON que o Motor 2 precisa.

## Consequências
- Mais fácil: o Motor 2 passa a receber o Mapa em JSON, com verba, páginas, serviços, diferenciais, cidades e pendências já estruturados, além da transcrição.
- Mais difícil e aceito: respostas presas ao aparelho de quem conduz até exportar ou gerar o Mapa; limpar o navegador antes disso perde o rascunho. O aviso fica na nota do fechamento e no botão de apagar.
- Pendente: aceite do juiz (3 onboardings reais com Mapa válido em até 60 minutos, ensaio em celular real) e um responsável pela manutenção que não seja o Viny.

## Adendo de 14/10/2026 (tarde): ordem da reunião definida pelo Viny
O Viny manteve os slides e fixou a ordem do brainstorm:
1. Capa com a logo da Win7 Med e a do cliente, e a trilha da reunião.
2. Pergunta 1, a verba.
3. O diagnóstico: o que entendemos, placar, busca e site.
4. A recomendação da página principal, com o modelo da página no formato de celular e o botão "Confirmar como página principal".
5. Pergunta 2, os outros serviços além da página principal.
6. Pergunta 3, as regiões, com o mapa do raio (as cidades marcadas "Não atuar" ficam apagadas) e o cartão do Google Meu Negócio.
7. Perguntas 4 a 7: diferenciais, convênios, depoimentos em vídeo e vídeo da página. Na opção de IA, um agente de IA da Win7 cria o vídeo.
8. Pergunta 8, confirmar os dados: nome, endereço, telefone, WhatsApp que recebe os contatos, horário e site, cada um "Confirmado" ou "Corrigir". Dado a corrigir vira pendência da Win7. Depois vêm os pontos em aberto e os participantes.
9. Fechamento: o botão "Gerar mapeamento em PDF" abre a impressão do navegador (Salvar como PDF). HTML e JSON seguem nos botões.

O passo do Google Meu Negócio deixou de ser separado e entrou nas regiões. O passo de agenda saiu, e a trilha foi para a capa. Rascunhos da versão anterior são migrados ao abrir (`OnboardingW7.migrar`). O arquivo do onboarding de um cliente abre direto na apresentação. Motor 4.1.0: o mapa do raio virou função própria (`svgRaio`) e o diagnóstico continua idêntico.

## Adendo de 14/10/2026 (noite): ajustes pedidos pelo Viny nos prints
1. **Verba:** só "Valor por mês" ou "Valor por dia". Saiu "quantos serviços": o valor por dia é da conta inteira e vezes 30 dá o total do mês, que define as páginas.
2. **Diferenciais:** a tela virou dois grupos, "Pagamento" e "Estrutura e atendimento". Cada item é uma linha com a pergunta à esquerda e "Tem / Não tem" à direita. O detalhe só aparece quando tem. As formas de pagamento viraram botões de alternar.
3. **Depoimentos:** quem já tem responde "Vão enviar no grupo", com prazo. Isso vira pendência do cliente.
4. **Perguntas operacionais fora:** sem "horário de corte para encaixe". O agente também não repete o que a apresentação já pergunta, inclusive os dados do cliente.
5. **Motion graphics na troca de slide:**
   - entrada escalonada, da direita ao avançar e da esquerda ao voltar; no celular, de baixo para cima;
   - o placar conta e o arco se desenha;
   - as barras crescem;
   - os anéis do mapa e as cidades aparecem;
   - a linha da capa se desenha;
   - o celular do modelo sobe;
   - a nota do Google e as avaliações contam.
   Marcar uma resposta não repete a animação. Tudo respeita "reduzir movimento".

## Adendo de 14/10/2026 (fim da noite): batimento, página principal, vídeo e ajuste guiado
1. **Batimento contínuo.** Uma faixa fica embaixo do topo em todos os slides. O coração pulsa e uma luz percorre o traço do eletrocardiograma sem parar: é a análise da Win7 Med acontecendo. O traço da capa também ganhou a luz contínua. Com "reduzir movimento", tudo fica parado.
2. **Página principal escolhida na reunião.** Na pergunta 2, qualquer serviço pode virar a principal, inclusive um incluído na hora, pelo botão "Tornar principal". A principal fica marcada para anunciar e vai para o topo da lista. Todo serviço pode ser excluído; a exclusão pede confirmação. Excluir a principal passa a coroa para o primeiro da lista.
3. **Vídeo: o roteiro é sempre da Win7.** Ficam duas opções:
   - a clínica grava, com o roteiro que a Win7 envia;
   - a Win7 cria o roteiro e um agente de IA monta o vídeo.
   A opção antiga "Win7 envia o roteiro" virou "a clínica grava" nos rascunhos.
4. **Ajuste guiado no resumo.** Cada ponto obrigatório ou de aviso tem o botão "Ajustar", que leva ao passo exato. A validação devolve o passo de cada ponto, obrigatórios primeiro e na ordem do roteiro. Um painel no pé da tela mostra o que falta naquele passo, troca para "resolvido" assim que a resposta entra e oferece "Próximo ponto". Sem pendências, ele volta ao resumo para gerar o mapeamento.

## Adendo de 14/10/2026 (madrugada): domínio da página
Na recomendação da página principal entra o cartão "Domínio da página". Domínios sugeridos:
- O sistema sugere de 4 a 5 domínios `.com.br` a partir do serviço principal e da cidade. Exemplos: ressonanciarioverde, ressonanciaemrioverde, rioverderessonancia. O nome tem até 26 caracteres, que é o limite do Registro.br.
- No fluxo do chat, `cliente.mjs` confere cada sugestão no Registro.br (`/v2/ajax/avail/raw`: status 0 livre, 2 registrado, 3 inválido). O resultado fica gravado em `lp_modelo.dominios`, e `--dominios` refaz a conferência.
- No Gerador público, e para domínios digitados na reunião, as sugestões aparecem como "sugestivo", com o link "Conferir" para a busca do Registro.br. O Registro.br só aceita consulta feita do próprio site, então o navegador da apresentação não consulta sozinho.

Na reunião há dois caminhos:
- **Escolher agora**, uma sugestão ou outro domínio digitado. A pendência é da Win7: registrar o domínio e apontar para a página.
- **Sugerir no WhatsApp.** A Win7 envia as sugestões no grupo e o cliente aprova uma; a página vai ao ar depois disso.

Sem decisão, o mapeamento não é gerado. Um domínio escolhido que já esteja registrado gera um aviso.

## Adendo de 14/10/2026 (madrugada): máscaras e prazos de até 7 dias úteis
- **Telefone e WhatsApp:** os campos ganharam máscara no formato (DD) 99999-9999 ou (DD) 9999-9999. Um WhatsApp sem 11 dígitos gera aviso.
- **Prazos** (gravar depoimentos, enviar depoimentos, vídeo da página):
  - O campo tem máscara dd/mm e, ao sair, ganha o ano. Sem ano, a data fica no ano da reunião; só passa para o ano seguinte na virada, entre novembro e fevereiro.
  - O limite é de 7 dias úteis a partir da data do brainstorm. A data entra na primeira resposta e pula fins de semana e feriados nacionais: fixos, Carnaval, Sexta-feira Santa e Corpus Christi.
  - O campo mostra o limite e avisa quando a data é inválida ou já passou. Acima do limite, abre a justificativa obrigatória.
  - Data inválida, data passada ou prazo além do limite sem justificativa bloqueiam o mapeamento. A justificativa vai para a observação da pendência.
