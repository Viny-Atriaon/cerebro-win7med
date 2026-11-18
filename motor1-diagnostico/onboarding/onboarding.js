/* Onboarding Win7 · núcleo puro (sem DOM). Roda no navegador (apresentação ao vivo) e no Node (testes).
   Depende de MotorDiagnostico (motor-diagnostico.js) carregado antes. Expõe globalThis.OnboardingW7.
   Conteúdo: o roteiro da reunião como dado (ADR-005), o estado inicial das respostas, a regra de verba,
   a montagem e a validação do Mapa do Onboarding e o HTML do Mapa (que NUNCA leva as notas de condução). */
(function (raiz) {
  'use strict';
  var M = raiz.MotorDiagnostico;
  if (!M) throw new Error('OnboardingW7 precisa do MotorDiagnostico carregado antes.');
  var MAPA_SCHEMA = 'w7-mapa-onboarding';
  var MAPA_VERSAO = 1;
  var RESPOSTAS_SCHEMA = 'w7-onboarding-respostas';

  function ehObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function lista(x) { return Array.isArray(x) ? x : []; }
  function texto(x) { return x === undefined || x === null ? '' : String(x).trim(); }
  function num(x) { if (typeof x === 'number' && isFinite(x)) return x; if (ehObj(x) && typeof x.valor === 'number') return x.valor; var n = parseFloat(String(x || '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; }
  function chave(s) { return texto(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  /** Concordância de número: pl(2, 'página', 'páginas') = '2 páginas'. */
  function pl(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function hojeBr() { var d = new Date(); return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/'); }

  // ---------------------------------------------------------------- roteiro da reunião (dado, não código)
  // Ordem pedida pelo Viny em 14/10/2026 (tarde): capa com as logos, verba, diagnóstico, recomendação da página principal
  // (com o modelo da página), outros serviços, regiões (mapa do raio e Google Meu Negócio), diferenciais, convênios,
  // depoimentos, vídeo da página e, para finalizar, confirmar os dados. "curto" aparece na trilha da capa.
  // "nota" é a fala de quem conduz: aparece só no painel de notas da apresentação, nunca no Mapa.
  var ROTEIRO = [
    { id: 'capa', tipo: 'capa', titulo: 'Onboarding',
      nota: 'Agradeça a confiança e diga o roteiro: primeiro a verba, depois o que encontramos no Google, a página que vai receber os anúncios e as decisões para as campanhas irem ao ar. Avise que vai anotar as respostas na tela e que, no final, {a_empresa} recebe o mapeamento com tudo o que foi combinado.' },
    { id: 'verba', tipo: 'pergunta', numero: 1, curto: 'Verba', titulo: 'Quanto vocês vão investir por mês no Google?',
      nota: 'Comece pela verba: ela define quantas páginas e campanhas cabem agora. Pergunte: "Quanto vocês podem investir por mês, direto no Google?" Explique que a verba é paga direto ao Google, no cartão {da_empresa}, separada do contrato da Win7. Regra da Win7: cada página e campanha precisa de cerca de R$ 50 por dia (R$ 1.500 por mês) para gerar dados, até 3. Se {a_empresa} pensar em valor por dia, use "Valor por dia": a tela mostra o total do mês.' },
    { id: 'ouvimos', tipo: 'ouvimos', titulo: 'O que entendemos até aqui', se: 'dores',
      nota: 'Confirme se entendemos bem o momento {da_empresa}. Pergunte: "Isso continua sendo a prioridade?" Anote o que mudou nas observações do último passo.' },
    { id: 'oportunidades', tipo: 'placar', curto: 'Diagnóstico', titulo: 'O diagnóstico: onde estão as oportunidades',
      nota: 'Apresente o placar como ponto de partida, nunca como nota. Diga: "Esse número mostra o quanto do caminho já está pronto; o restante é o que vamos fazer juntos." Fale dos achados principais e dos ajustes antes de anunciar.' },
    { id: 'busca', tipo: 'busca', titulo: 'O que aparece quando buscam o {servico}', se: 'busca',
      nota: 'Mostre o que o {cliente_final} vê ao buscar. Se um concorrente aparece antes, diga que é exatamente esse espaço que a campanha vai disputar. Não critique o concorrente.' },
    { id: 'site', tipo: 'site', titulo: 'Para onde o anúncio vai levar hoje', se: 'site',
      nota: 'Explique que o anúncio leva para uma página. Se não existe página por {servico}, diga que é isso que vamos mostrar agora: a página que a Win7 cria, focada no contato pelo WhatsApp.' },
    { id: 'pagina', tipo: 'pagina', curto: 'Página principal', titulo: 'Nossa recomendação: a página principal',
      nota: 'Apresente a recomendação: a página principal é do {servico} com mais chance de retorno, na cidade {da_empresa}. Se houver modelo, mostre no celular da tela: vídeo, {conv_plural} e depoimentos são exemplos, e a versão publicada usa o material real {da_empresa}. Se {a_empresa} concordar, toque em "Confirmar como página principal". Depois, o domínio: mostre as sugestões (livre ou já registrado) e escolha uma agora, ou combine de mandar as sugestões no grupo e esperar a aprovação para colocar no ar. Pedido de mudança de layout fica para depois do material: o padrão é o que converte.' },
    { id: 'servicos', tipo: 'pergunta', numero: 2, curto: 'Outros {servicos}', titulo: 'Quais outros {servicos} entram além da página principal',
      nota: 'Diga: "Além da página principal, a verba comporta mais estes {servicos}." Se a principal não for a recomendada, toque em "Tornar principal" no {servico} certo. Marque até o número de páginas que a verba permite, contando a principal. Inclua o que surgir na conversa e exclua o que ficar de fora.' },
    { id: 'regioes', tipo: 'pergunta', numero: 3, curto: 'Regiões', titulo: 'Em quais regiões vamos anunciar', se: 'regioes',
      nota: 'Mostre o mapa do raio e o perfil no Google. Explique que a nota e as avaliações aparecem junto do anúncio, e quantas avaliações faltam para a próxima faixa. Para cada cidade pergunte: "Vale atender quem vem de lá?" Marque atuar ou não atuar. Cidade muito distante, ou sem demanda para {a_empresa}, fica de fora.' },
    { id: 'diferenciais', tipo: 'pergunta', numero: 4, curto: 'Diferenciais', titulo: 'O que vocês têm que os concorrentes não têm',
      nota: 'Pergunte: "O que faz um {cliente_final} escolher vocês e não o concorrente?" Puxe pelos itens da tela: parcelamento e em quantas vezes sem juros, formas de pagamento, estacionamento, equipamento, {servico} que só vocês fazem na região, horário. Anote com as palavras {da_empresa}: isso vira título de anúncio.' },
    { id: 'convenios', tipo: 'pergunta', numero: 5, curto: '{curto_convenios}', titulo: '{titulo_convenios}',
      nota: '{nota_convenios}' },
    { id: 'depoimentos', tipo: 'pergunta', numero: 6, curto: 'Depoimentos', titulo: 'Depoimentos em vídeo',
      nota: 'Explique: depoimento em vídeo de quem já foi atendido mostra pessoas reais e dá confiança para quem chega pelo anúncio; por isso aumenta a conversão da página. Pergunte se já têm. Se não, combine quem grava e até quando. Dica para passar: vídeo curto, gravado no celular em pé, a pessoa diz o nome e o que gostou.{nota_depoimentos_saude}' },
    { id: 'video', tipo: 'pergunta', numero: 7, curto: 'Vídeo da página', titulo: 'O vídeo de apresentação da página',
      nota: 'Explique que o vídeo fica no topo da página e mostra a estrutura e a equipe. O roteiro é sempre da Win7. Ofereça dois caminhos: {a_empresa} grava a partir do roteiro que a Win7 envia, ou um agente de IA da Win7 cria o vídeo a partir de fotos e informações.' },
    { id: 'confirmacoes', tipo: 'pergunta', numero: 8, curto: 'Confirmar os dados', titulo: 'Para finalizar: confirmar os dados',
      nota: 'Leia os dados {da_empresa} que vão para a página e para os anúncios: nome, endereço, telefone, WhatsApp que recebe os contatos, horário e site. Marque confirmado ou corrigir e anote a correção. Depois passe pelos pontos em aberto do diagnóstico e registre quem participou.' },
    { id: 'fim', tipo: 'fim', titulo: 'Resumo e Mapa do Onboarding',
      nota: 'Leia o resumo em voz alta. Se faltar algo obrigatório, a tela avisa. Gere o mapeamento em PDF e envie no grupo do WhatsApp. Se o aparelho for compartilhado, apague os dados no final.' }
  ];
  var TEXTOS_SETOR = {
    saude: {
      titulo_convenios: 'Convênios',
      curto_convenios: 'Convênios',
      nota_convenios: 'Pergunte se atendem convênios. Se sim, marque e avise que vamos pedir a lista completa no grupo do WhatsApp. Se não, marque não.',
      nota_depoimentos_saude: ' Em saúde, o depoimento não pode prometer resultado nem mostrar antes e depois (regras do conselho profissional).',
      conv_plural: 'convênios'
    },
    geral: {
      titulo_convenios: 'Convênios, planos ou parcerias',
      curto_convenios: 'Parcerias',
      nota_convenios: 'Pergunte se trabalham com convênios, planos ou parcerias. Se sim, marque e avise que vamos pedir a lista completa no grupo do WhatsApp. Se não fizer sentido para o negócio, marque não se aplica.',
      nota_depoimentos_saude: '',
      conv_plural: 'parceiros'
    }
  };
  function vocabCompleto(diag) { var v = M.vocabDe(diag); return Object.assign({}, v, TEXTOS_SETOR[v.setor]); }
  function txt(t, diag) { return M.comVocab(M.comVocab(t, vocabCompleto(diag)), vocabCompleto(diag)); }
  function slidesPara(diag) {
    var pr = (diag && diag.presenca) || {};
    var raio = lista((diag.raio || {}).zonas).length > 0;
    var tem = { dores: lista((diag.ouvimos || {}).dores).length > 0, busca: !!pr.busca, site: !!pr.site, google: !!pr.google, raio: raio, regioes: raio || !!pr.google };
    return ROTEIRO.filter(function (s) { return !s.se || tem[s.se]; }).map(function (s) { return Object.assign({}, s, { titulo: txt(s.titulo, diag), nota: txt(s.nota, diag), curto: s.curto ? txt(s.curto, diag) : '' }); });
  }

  // ---------------------------------------------------------------- estado inicial das respostas
  function estadoInicial(diag) {
    var c = diag.cliente || {};
    var nomes = [], vistos = {};
    lista(c.servicos_foco).concat(lista((diag.termos || {}).frentes).map(function (f) { return f.frente; })).forEach(function (n) {
      var k = chave(n); if (k && !vistos[k]) { vistos[k] = 1; nomes.push(texto(n)); }
    });
    var rec = num((diag.raio || {}).recomendacao_km);
    var cidades = [];
    lista((diag.raio || {}).zonas).forEach(function (z, zi) {
      lista(z.cidades).forEach(function (cd) {
        var km = num(cd.km);
        cidades.push({ nome: texto(cd.nome), uf: texto(cd.uf), km: km, zona: zi + 1, atuar: km === 0 ? true : (rec !== null && km !== null && km <= rec ? true : null), adicionada: false });
      });
    });
    var sugestao = lista((diag.verba || {}).frentes).reduce(function (a, f) { return a + (num(f.valor) || 0); }, 0);
    // página principal: o serviço do modelo de página (lp_modelo.servico) ou o primeiro de servicos_foco; vai para o topo da lista
    var kPrincipal = chave((diag.lp_modelo || {}).servico) || chave(nomes[0]);
    var iPrincipal = nomes.map(chave).indexOf(kPrincipal);
    if (iPrincipal < 0 && texto((diag.lp_modelo || {}).servico)) { nomes.unshift(texto(diag.lp_modelo.servico)); iPrincipal = 0; }
    if (iPrincipal > 0) nomes.unshift(nomes.splice(iPrincipal, 1)[0]);
    var pr = diag.presenca || {}, g = pr.google || {}, links = c.links || {};
    var dados = [['nome', 'Nome que aparece na página e no Google', texto(c.nome)], ['endereco', 'Endereço', texto(g.endereco)], ['telefone', 'Telefone', texto(g.telefone)],
      ['whatsapp', 'WhatsApp que recebe os contatos', ''], ['horario', 'Horário de atendimento', texto(g.horario)], ['site', 'Site atual', texto(links.site || (pr.site || {}).url)]]
      .concat(camposEmpresa(M.vocabDe(diag).setor === 'saude'))
      .map(function (x) { return { campo: x[0], rotulo: x[1], valor: x[2], editavel: !x[2], status: null, correcao: '' }; });
    return {
      schema: RESPOSTAS_SCHEMA, versao: 1,
      cliente: { nome: texto(c.nome), slug: M.slug(c.nome) },
      iniciado_em: new Date().toISOString(), atualizado_em: null,
      verba: { modo: 'mensal', mensal: null, por_dia: null, minimo: M.VERBA_MINIMA_POR_PAGINA, sugestao_mensal: sugestao || null },
      servicos: nomes.map(function (n, i) { return { nome: n, sugerido: true, principal: i === 0, confirmado: false, ordem: i }; }),
      diferenciais: {
        parcelamento: { tem: null, vezes: '', sem_juros: '' },
        pagamento: { pix: false, cartao_credito: false, cartao_debito: false, boleto: false, dinheiro: false },
        estacionamento: { tem: null, detalhe: '' },
        equipamento: { tem: null, detalhe: '' },
        exclusivo: { tem: null, detalhe: '' },
        horario: { tem: null, detalhe: '' },
        outros: ''
      },
      convenios: { situacao: null, pedir_lista: true, observacao: '' },
      cidades: cidades,
      depoimentos: { tem: null, vai_enviar: null, vai_gravar: null, responsavel: '', prazo: '', prazo_envio: '' },
      video_home: { opcao: null, responsavel: '', prazo: '', observacao: '' },
      dados_cliente: dados,
      dominio: { modo: null, escolhido: '', sugestoes: dominiosIniciais(diag) },
      lp_base: baseDe((diag.lp_modelo || {}).base),
      confirmacoes: lista(diag.perguntas_reuniao).map(function (q) { return { texto: texto(q), status: null, obs: '' }; }),
      participantes: '', observacoes: ''
    };
  }

  // ---------------------------------------------------------------- datas, prazos e telefone
  // Prazos combinados na reunião: até 7 dias úteis a partir do brainstorm; acima disso, justificativa obrigatória.
  var PRAZO_DIAS_UTEIS = 7;
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function formatarData(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
  function pascoa(a) {
    var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3);
    var i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451);
    var mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1;
    return new Date(a, mes - 1, dia);
  }
  /** Feriados nacionais (fixos e móveis: Carnaval, Sexta-feira Santa, Corpus Christi). */
  function feriados(ano) {
    var f = {}, pa = pascoa(ano);
    ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].forEach(function (md) { f[ano + '-' + md] = 1; });
    [-48, -47, -2, 60].forEach(function (k) { var d = new Date(pa); d.setDate(d.getDate() + k); f[iso(d)] = 1; });
    return f;
  }
  function diaUtil(d) { var w = d.getDay(); return w !== 0 && w !== 6 && !feriados(d.getFullYear())[iso(d)]; }
  function somarDiasUteis(base, n) { var d = new Date(base.getFullYear(), base.getMonth(), base.getDate()), k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (diaUtil(d)) k++; } return d; }
  /** "dd/mm" ou "dd/mm/aaaa" vira data; sem ano, vale o ano da reunião (na virada do ano, o seguinte). Inválida: null. */
  function lerData(t, base) {
    var m = texto(t).match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!m) return null;
    var dia = +m[1], mes = +m[2], ano = m[3] ? +m[3] : base.getFullYear();
    if (m[3] && m[3].length === 2) ano += 2000;
    var d = new Date(ano, mes - 1, dia);
    if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
    // sem ano: só vira o ano na virada (reunião em nov ou dez, prazo em jan ou fev); fora disso, data anterior é passado
    if (!m[3] && d < new Date(base.getFullYear(), base.getMonth(), base.getDate()) && base.getMonth() >= 10 && d.getMonth() <= 1) d.setFullYear(ano + 1);
    return d;
  }
  function dataBase(r) { return lerData(texto(r && r.data_reuniao) || hojeBr(), new Date()) || new Date(); }
  /** Confere um prazo digitado contra a data da reunião: vazio, inválido, no passado, ou além de 7 dias úteis. */
  function checarPrazo(t, base) {
    var limite = somarDiasUteis(base, PRAZO_DIAS_UTEIS);
    if (!texto(t)) return { vazio: true, limite: formatarData(limite) };
    var d = lerData(t, base);
    if (!d) return { invalida: true, limite: formatarData(limite) };
    var b0 = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    return { data: formatarData(d), passado: d < b0, alem: d > limite, limite: formatarData(limite) };
  }
  /** Máscara de telefone: (61) 99999-9999 ou (61) 3333-4444. */
  function mascaraTelefone(t) {
    var n = String(t || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
    if (n.length <= 2) return n.length ? '(' + n : '';
    if (n.length <= 6) return '(' + n.slice(0, 2) + ') ' + n.slice(2);
    if (n.length <= 10) return '(' + n.slice(0, 2) + ') ' + n.slice(2, 6) + '-' + n.slice(6);
    return '(' + n.slice(0, 2) + ') ' + n.slice(2, 7) + '-' + n.slice(7);
  }
  function mascaraCnpj(t) { var n = String(t || '').replace(/\D/g, '').slice(0, 14); return n.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'); }
  function mascaraData(t) { var n = String(t || '').replace(/\D/g, '').slice(0, 8); return n.length <= 2 ? n : n.length <= 4 ? n.slice(0, 2) + '/' + n.slice(2) : n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4); }
  /** Os prazos da reunião, com o passo onde se ajustam. */
  var PRAZOS = [
    { campo: 'depoimentos.prazo', rotulo: 'gravar os depoimentos', passo: 'depoimentos', ativo: function (r) { return (r.depoimentos || {}).vai_gravar === 'sim'; } },
    { campo: 'depoimentos.prazo_envio', rotulo: 'enviar os depoimentos', passo: 'depoimentos', ativo: function (r) { return (r.depoimentos || {}).vai_enviar === 'sim'; } },
    { campo: 'video_home.prazo', rotulo: 'o vídeo da página', passo: 'video', ativo: function (r) { return !!(r.video_home || {}).opcao; } }
  ];
  function valorCampo(r, caminho) { return caminho.split('.').reduce(function (o, k) { return o === null || o === undefined ? undefined : o[k]; }, r); }

  // ---------------------------------------------------------------- domínio da página (sugestões e decisão)
  function semAcento(t) { return texto(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
  var PALAVRAS_FRACAS = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para'];
  /** Normaliza o que a equipe digitar: tira http, www e barra; sem ponto, vira .com.br. Inválido devolve ''. */
  function normalizarDominio(d) {
    var x = texto(d).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').replace(/\s+/g, '');
    if (!x) return '';
    if (x.indexOf('.') < 0) x = semAcento(x) + '.com.br';
    if (/\.br$/.test(x) && x.split('.')[0].length > 26) return '';  // limite do Registro.br
    return /^[a-z0-9-]{2,40}(\.[a-z0-9-]{2,20}){1,3}$/.test(x) ? x : '';
  }
  /** Sugestões a partir do serviço principal e da cidade (padrão das LPs Win7, como examedeimagem<cidade>.com.br). Nome com até 26 caracteres (limite do Registro.br). */
  function sugerirDominios(diag, servico) {
    var c = (diag && diag.cliente) || {}, lm = (diag && diag.lp_modelo) || {};
    var sv = texto(servico || lm.servico || lista(c.servicos_foco)[0]);
    var palavras = sv.toLowerCase().split(/\s+/).filter(function (w) { return w && PALAVRAS_FRACAS.indexOf(w) < 0; }).map(semAcento).filter(Boolean);
    var cidade = semAcento(c.cidade), uf = semAcento(c.uf);
    if (!palavras.length || !cidade) return [];
    var curto = palavras[0], completo = palavras.join('');
    var bases = [curto + cidade, curto + 'em' + cidade, cidade + curto, completo + cidade, curto + cidade + uf, cidade + completo];
    var vistos = {}, out = [];
    bases.forEach(function (b) { if (b.length >= 6 && b.length <= 26 && !vistos[b]) { vistos[b] = 1; out.push(b + '.com.br'); } });
    return out.slice(0, 5);
  }
  /** Sugestões do bloco (lp_modelo.dominios, com a conferência no Registro.br) ou geradas aqui, sem conferência. */
  function dominiosIniciais(diag) {
    var dados = lista(((diag && diag.lp_modelo) || {}).dominios).map(function (x) { return typeof x === 'string' ? { dominio: normalizarDominio(x), status: null } : { dominio: normalizarDominio(x.dominio), status: x.status && x.status !== 'verificar' ? x.status : null, conferido_em: x.conferido_em || '' }; }).filter(function (x) { return x.dominio; });
    return dados.length ? dados : sugerirDominios(diag).map(function (d) { return { dominio: d, status: null }; });
  }

  /** Rascunho salvo numa versão anterior do roteiro: completa os campos novos sem perder as respostas. */
  /** Comando inicial do robô 3 (como a ativação do robô 1): liga o robô numa conversa nova do Claude Code; a pasta do cliente vem depois. */
  var REPO_CEREBRO = 'https://github.com/Viny-Atriaon/cerebro-win7med';
  function ativacaoRobo3() {
    return [
      'A partir de agora você é o Robô 3 do Cérebro Win7 Med.',
      'Ative o robô 3 do repositório ' + REPO_CEREBRO + '. Neste computador ele fica em Documents\\Claude\\cerebro-win7med (se não estiver, procure a pasta ou clone o repositório, que é público, com git clone).',
      'Leia AGENTS.md, ESTADO.md e .claude/skills/robo3/SKILL.md e siga o robô 3 à risca.',
      'Comece me pedindo o endereço da pasta do cliente, com os arquivos do projeto.'
    ].join('\n');
  }

  /** Campos que a página real precisa (ADR-007): RT na saúde e os dados da empresa para a política de privacidade. */
  function camposEmpresa(saude) {
    return (saude ? [['rt', 'Responsável técnico (nome e CRM)', '']] : []).concat([['razao_social', 'Razão social (vai na política de privacidade)', ''], ['cnpj', 'CNPJ', ''], ['email_privacidade', 'E-mail para pedidos sobre dados pessoais', '']]);
  }
  /** Base do banner: 1 Órbitas, 2 Ondas, 3 Varredura (a mesma escolhida no modelo, trocável na reunião). */
  var BASES_BANNER = { 1: 'Órbitas', 2: 'Ondas', 3: 'Varredura' };
  function baseDe(x) { x = +x; return BASES_BANNER[x] ? x : 1; }

  function migrar(r, diag) {
    var base = estadoInicial(diag);
    Object.keys(base).forEach(function (k) { if (r[k] === undefined) r[k] = base[k]; });
    // conversas salvas antes da etapa A ganham os campos novos de "Confirmar os dados"
    var tem = lista(r.dados_cliente).map(function (x) { return x.campo; });
    lista(base.dados_cliente).forEach(function (x) { if (tem.indexOf(x.campo) < 0) r.dados_cliente.push(x); });
    if (lista(r.servicos).length && !lista(r.servicos).some(function (x) { return x.principal; })) r.servicos[0].principal = true;
    if (r.video_home && r.video_home.opcao === 'roteiro') r.video_home.opcao = 'cliente';
    return r;
  }

  /** Verba mensal efetiva: o total por mês, ou o valor por dia da conta inteira vezes 30. */
  function verbaMensal(r) {
    var v = r.verba || {};
    if (v.modo === 'diaria') return M.verbaDiariaParaMensal(num(v.por_dia) || 0, 1);
    return num(v.mensal) || 0;
  }
  function calcularVerba(r) { return M.regraVerba(verbaMensal(r), num((r.verba || {}).minimo) || M.VERBA_MINIMA_POR_PAGINA); }

  // ---------------------------------------------------------------- Mapa do Onboarding
  var ROTULO_DIF = { parcelamento: 'Parcelamento', estacionamento: 'Estacionamento', equipamento: 'Equipamento ou estrutura diferenciada', exclusivo: 'Serviço exclusivo na região', horario: 'Horário diferenciado' };
  var ROTULO_PAG = { pix: 'Pix', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito', boleto: 'Boleto', dinheiro: 'Dinheiro' };
  function diferenciaisLegiveis(r) {
    var d = r.diferenciais || {}, out = [];
    var p = d.parcelamento || {};
    if (p.tem === 'sim') out.push({ rotulo: 'Parcelamento', detalhe: [texto(p.vezes) ? 'em até ' + texto(p.vezes) + ' vezes' : '', texto(p.sem_juros) ? texto(p.sem_juros) + ' sem juros' : ''].filter(Boolean).join(', ') });
    var pg = Object.keys(ROTULO_PAG).filter(function (k) { return (d.pagamento || {})[k]; }).map(function (k) { return ROTULO_PAG[k]; });
    if (pg.length) out.push({ rotulo: 'Formas de pagamento', detalhe: pg.join(', ') });
    ['estacionamento', 'equipamento', 'exclusivo', 'horario'].forEach(function (k) { var x = d[k] || {}; if (x.tem === 'sim') out.push({ rotulo: ROTULO_DIF[k], detalhe: texto(x.detalhe) }); });
    if (texto(d.outros)) out.push({ rotulo: 'Outros diferenciais', detalhe: texto(d.outros) });
    return out;
  }
  function pendenciasDe(r) {
    var p = [];
    var base = dataBase(r);
    function obsPrazo(campo) { var c = checarPrazo(valorCampo(r, campo), base); return c.alem ? 'Além de 7 dias úteis: ' + texto(valorCampo(r, campo + '_justificativa')) : ''; }
    var dm = r.dominio || {};
    if (dm.modo === 'escolhido' && texto(dm.escolhido)) p.push({ texto: 'Registrar o domínio ' + texto(dm.escolhido) + ' e apontar para a página', responsavel: 'Win7', prazo: '' });
    if (dm.modo === 'whatsapp') { p.push({ texto: 'Enviar as sugestões de domínio no grupo do WhatsApp', responsavel: 'Win7', prazo: '' }); p.push({ texto: 'Aprovar um domínio no grupo para a página ir ao ar', responsavel: 'Cliente', prazo: '' }); }
    if ((r.convenios || {}).situacao === 'sim' && r.convenios.pedir_lista !== false) p.push({ texto: 'Enviar a lista completa de convênios no grupo do WhatsApp', responsavel: 'Cliente', prazo: '' });
    var dp = r.depoimentos || {};
    if ((dp.tem === 'sim' || dp.tem === 'alguns') && dp.vai_enviar === 'sim') p.push({ texto: 'Enviar os depoimentos em vídeo no grupo do WhatsApp', responsavel: 'Cliente', prazo: texto(dp.prazo_envio), obs: obsPrazo('depoimentos.prazo_envio') });
    if ((dp.tem === 'nao' || dp.tem === 'alguns') && dp.vai_gravar === 'sim') p.push({ texto: 'Gravar depoimentos em vídeo', responsavel: texto(dp.responsavel) || 'Cliente', prazo: texto(dp.prazo), obs: obsPrazo('depoimentos.prazo') });
    if (dp.tem === 'nao' && dp.vai_gravar === 'nao') p.push({ texto: 'Página sai sem depoimentos em vídeo: rever na Etapa 2', responsavel: 'Win7', prazo: '' });
    var v = r.video_home || {};
    if (v.opcao === 'cliente' || v.opcao === 'roteiro') { p.push({ texto: 'Enviar o roteiro do vídeo de apresentação', responsavel: 'Win7', prazo: '' }); p.push({ texto: 'Gravar o vídeo a partir do roteiro', responsavel: texto(v.responsavel) || 'Cliente', prazo: texto(v.prazo), obs: obsPrazo('video_home.prazo') }); }
    if (v.opcao === 'ia') { p.push({ texto: 'Enviar fotos e informações para o vídeo com IA', responsavel: 'Cliente', prazo: texto(v.prazo), obs: obsPrazo('video_home.prazo') }); p.push({ texto: 'Criar o roteiro e o vídeo de apresentação com IA', responsavel: 'Win7', prazo: '' }); }
    var dce = {}; lista(r.dados_cliente).forEach(function (x) { dce[x.campo] = texto(x.status === 'corrigir' ? x.correcao : x.valor); });
    if ('rt' in dce && !dce.rt) p.push({ texto: 'Enviar nome e CRM do responsável técnico', responsavel: 'Cliente', prazo: '' });
    if ('razao_social' in dce && (!dce.razao_social || !dce.cnpj || !dce.email_privacidade)) p.push({ texto: 'Enviar razão social, CNPJ e e-mail para a política de privacidade', responsavel: 'Cliente', prazo: '' });
    lista(r.dados_cliente).forEach(function (x) { if (x.status === 'corrigir') p.push({ texto: 'Corrigir ' + x.rotulo.charAt(0).toLowerCase() + x.rotulo.slice(1) + ' na página e no perfil do Google', responsavel: 'Win7', prazo: '', obs: texto(x.correcao) }); });
    lista(r.confirmacoes).forEach(function (c) { if (c.status === 'pendente') p.push({ texto: c.texto, responsavel: 'Cliente', prazo: '', obs: texto(c.obs) }); });
    return p;
  }
  function termosConfirmados(diag, servicos) {
    var ks = servicos.map(chave);
    return lista((diag.termos || {}).frentes).filter(function (f) { var k = chave(f.frente); return ks.some(function (s) { return k.indexOf(s) >= 0 || s.indexOf(k) >= 0; }); });
  }
  function montarMapa(diag, r) {
    var placar = M.pontuar(diag), vb = calcularVerba(r), vocab = M.vocabDe(diag);
    var confirmados = lista(r.servicos).filter(function (s) { return s.confirmado; }).map(function (s) { return texto(s.nome); }).filter(Boolean);
    var cid = lista(r.cidades);
    return {
      schema: MAPA_SCHEMA, versao: MAPA_VERSAO, gerado_em: new Date().toISOString(),
      cliente: { nome: texto((diag.cliente || {}).nome), cidade: texto((diag.cliente || {}).cidade), uf: texto((diag.cliente || {}).uf), setor: vocab.setor, data_reuniao: texto(r.data_reuniao) || hojeBr() },
      diagnostico: { placar: placar.geral, classe: placar.classe.nome, pilares: placar.pilares.reduce(function (a, p) { a[p.chave] = p.pontos; return a; }, {}) },
      decisoes: {
        verba: { modo: (r.verba || {}).modo || 'mensal', mensal: vb.mensal, paginas: vb.paginas, minimo_por_pagina: vb.minimo, por_pagina_mes: Math.round(vb.por_pagina_mes), por_pagina_dia: Math.round(vb.por_pagina_dia) },
        pagina_principal: (lista(r.servicos).filter(function (s) { return s.confirmado && s.principal; })[0] || {}).nome || confirmados[0] || '',
        pagina_principal_recomendada: (lista(r.servicos).filter(function (s) { return s.principal; })[0] || {}).nome || '',
        base_banner: { n: baseDe(r.lp_base), nome: BASES_BANNER[baseDe(r.lp_base)] },
        servicos: confirmados,
        servicos_proxima_etapa: lista(r.servicos).filter(function (s) { return !s.confirmado; }).map(function (s) { return texto(s.nome); }).filter(Boolean),
        diferenciais: diferenciaisLegiveis(r),
        convenios: { situacao: (r.convenios || {}).situacao, pedir_lista: (r.convenios || {}).situacao === 'sim' && (r.convenios || {}).pedir_lista !== false, observacao: texto((r.convenios || {}).observacao) },
        cidades: {
          atuar: cid.filter(function (c) { return c.atuar === true; }).map(function (c) { return { nome: c.nome, uf: c.uf, km: c.km }; }),
          nao_atuar: cid.filter(function (c) { return c.atuar === false; }).map(function (c) { return { nome: c.nome, uf: c.uf, km: c.km }; }),
          sem_decisao: cid.filter(function (c) { return c.atuar !== true && c.atuar !== false; }).map(function (c) { return { nome: c.nome, uf: c.uf, km: c.km }; })
        },
        depoimentos: Object.assign({}, r.depoimentos),
        video_home: Object.assign({}, r.video_home),
        dominio: { modo: (r.dominio || {}).modo || null, escolhido: texto((r.dominio || {}).escolhido), sugestoes: lista((r.dominio || {}).sugestoes).map(function (x) { return { dominio: x.dominio, status: x.status || null }; }) },
        dados_cliente: lista(r.dados_cliente).map(function (x) { return { campo: x.campo, rotulo: x.rotulo, valor: texto(x.valor), status: x.status || 'sem resposta', correcao: texto(x.correcao) }; })
      },
      lp_modelo: M.urlModelo(diag),
      termos: termosConfirmados(diag, confirmados),
      confirmacoes: lista(r.confirmacoes).map(function (c) { return { texto: c.texto, status: c.status || 'sem resposta', obs: texto(c.obs) }; }),
      pendencias: pendenciasDe(r),
      participantes: texto(r.participantes),
      observacoes: texto(r.observacoes)
    };
  }
  function validarMapa(m) {
    var erros = [], avisos = [], pontos = [];
    function E(t, passo) { erros.push(t); pontos.push({ tipo: 'erro', texto: t, passo: passo || '' }); }
    function A(t, passo) { avisos.push(t); pontos.push({ tipo: 'aviso', texto: t, passo: passo || '' }); }
    var d = (m && m.decisoes) || {};
    var v = M.VOCAB[(m && m.cliente && m.cliente.setor) === 'geral' ? 'geral' : 'saude'];
    if (!m || m.schema !== MAPA_SCHEMA || m.versao !== MAPA_VERSAO) E('Mapa com formato desconhecido.');
    var vb = d.verba || {};
    if (!(vb.mensal > 0)) E('Falta a verba mensal para o Google (pergunta 1).', 'verba');
    else if (!(vb.paginas > 0)) E('A verba informada fica abaixo de ' + M.moeda(vb.minimo_por_pagina) + ' por mês: não comporta nenhuma página. Reveja a verba com o cliente.', 'verba');
    var dm = d.dominio || {};
    if (!dm.modo) E('Falta definir o domínio da página (recomendação da página principal).', 'pagina');
    else if (dm.modo === 'escolhido' && !dm.escolhido) E('Falta escolher o domínio da página.', 'pagina');
    else if (dm.modo === 'escolhido' && lista(dm.sugestoes).some(function (x) { return x.dominio === dm.escolhido && x.status === 'registrado'; })) A('O domínio ' + dm.escolhido + ' já está registrado: confirme que é ' + v.da_empresa + ' antes de usar.', 'pagina');
    if (!lista(d.servicos).length) E('Nenhum ' + v.servico + ' confirmado para anunciar (pergunta 2).', 'servicos');
    else if (vb.paginas > 0 && d.servicos.length > vb.paginas) A(d.servicos.length + ' ' + v.servicos + ' confirmados para ' + pl(vb.paginas, 'página', 'páginas') + ': os excedentes começam na próxima etapa, ou a verba precisa subir.', 'servicos');
    var cd = d.cidades || {};
    if ((lista(cd.atuar).length + lista(cd.nao_atuar).length + lista(cd.sem_decisao).length) > 0) {
      if (!lista(cd.atuar).length) E('Nenhuma cidade marcada para atuar (pergunta 3).', 'regioes');
      if (lista(cd.sem_decisao).length) A(pl(cd.sem_decisao.length, 'cidade', 'cidades') + ' sem decisão: ' + cd.sem_decisao.map(function (c) { return c.nome; }).join(', ') + '.', 'regioes');
    }
    if (!d.convenios || !d.convenios.situacao) E('Falta responder sobre convênios (pergunta 5).', 'convenios');
    if (!d.depoimentos || !d.depoimentos.tem) E('Falta responder sobre depoimentos em vídeo (pergunta 6).', 'depoimentos');
    else {
      if ((d.depoimentos.tem === 'sim' || d.depoimentos.tem === 'alguns') && !d.depoimentos.vai_enviar) A('Depoimentos: falta combinar o envio dos vídeos que já existem.', 'depoimentos');
      if ((d.depoimentos.tem === 'nao' || d.depoimentos.tem === 'alguns') && !d.depoimentos.vai_gravar) A('Depoimentos: falta combinar se vão gravar.', 'depoimentos');
    }
    if (!d.video_home || !d.video_home.opcao) E('Falta definir o vídeo de apresentação da página (pergunta 7).', 'video');
    if (!lista(d.diferenciais).length) A('Nenhum diferencial registrado (pergunta 4): os anúncios ficam genéricos.', 'diferenciais');
    var base = lerData(texto(m && m.cliente && m.cliente.data_reuniao), new Date()) || new Date(), resp = { depoimentos: d.depoimentos || {}, video_home: d.video_home || {} };
    PRAZOS.forEach(function (pz) {
      if (!pz.ativo(resp)) return;
      var c = checarPrazo(valorCampo(resp, pz.campo), base);
      if (c.invalida) E('Data inválida no prazo para ' + pz.rotulo + ': use dd/mm.', pz.passo);
      else if (c.passado) E('O prazo para ' + pz.rotulo + ' (' + c.data + ') já passou.', pz.passo);
      else if (c.alem && !texto(valorCampo(resp, pz.campo + '_justificativa'))) E('Prazo para ' + pz.rotulo + ' além de 7 dias úteis (limite ' + c.limite + ') sem justificativa.', pz.passo);
    });
    var dcx = {}; lista(d.dados_cliente).forEach(function (x) { dcx[x.campo] = texto(x.status === 'corrigir' ? x.correcao : x.valor); });
    if ('rt' in dcx && !dcx.rt) A('Falta o responsável técnico (nome e CRM): é obrigatório na página de saúde. Combine o envio no grupo.', 'confirmacoes');
    if ('razao_social' in dcx && (!dcx.razao_social || !dcx.cnpj || !dcx.email_privacidade)) A('Faltam dados da empresa para a política de privacidade (razão social, CNPJ e e-mail).', 'confirmacoes');
    if (dcx.cnpj && String(dcx.cnpj).replace(/\D/g, '').length !== 14) A('O CNPJ está incompleto: são 14 números.', 'confirmacoes');
    if (dcx.email_privacidade && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dcx.email_privacidade)) A('O e-mail para pedidos de privacidade parece inválido.', 'confirmacoes');
    var wa = lista(d.dados_cliente).filter(function (x) { return x.campo === 'whatsapp' && x.valor; })[0];
    if (wa && String(wa.valor).replace(/\D/g, '').length !== 11) A('O WhatsApp que recebe os contatos está incompleto: use DDD e os 9 dígitos.', 'confirmacoes');
    var rec = texto(d.pagina_principal_recomendada);
    if (lista(d.servicos).length && rec && lista(d.servicos).indexOf(rec) < 0) A('A página principal (' + rec + ') não está marcada para anunciar: a principal passa a ser ' + d.pagina_principal + '.', 'servicos');
    var dc = lista(d.dados_cliente), semConf = dc.filter(function (x) { return x.status === 'sem resposta'; }).length;
    if (semConf) A(pl(semConf, 'dado', 'dados') + ' do cliente sem conferência (pergunta 8).', 'confirmacoes');
    if (dc.some(function (x) { return x.campo === 'whatsapp' && !x.valor && x.status !== 'corrigir'; })) A('Falta o WhatsApp que recebe os contatos (pergunta 8).', 'confirmacoes');
    var semResp = lista(m && m.confirmacoes).filter(function (c) { return c.status === 'sem resposta'; }).length;
    if (semResp) A(pl(semResp, 'ponto para confirmar', 'pontos para confirmar') + ' sem resposta (pergunta 8).', 'confirmacoes');
    // ordem do roteiro, obrigatórios antes dos avisos
    var ordem = ['verba', 'pagina', 'servicos', 'regioes', 'diferenciais', 'convenios', 'depoimentos', 'video', 'confirmacoes'];
    pontos.sort(function (a, b) { return (a.tipo === b.tipo ? 0 : a.tipo === 'erro' ? -1 : 1) || ordem.indexOf(a.passo) - ordem.indexOf(b.passo); });
    return { erros: erros, avisos: avisos, pontos: pontos };
  }


  // ---------------------------------------------------------------- HTML do Mapa (vai para o cliente: sem notas de condução)
  function gerarMapaHtml(m, diag, opcoes) {
    opcoes = opcoes || {};
    var esc = M.esc, md = M.md, moeda = M.moeda, vocab = M.vocabDe(diag), saude = vocab.setor === 'saude';
    var ativos = opcoes.ativos || {};
    var logo = (saude ? ativos.logo : ativos.logoGeral || ativos.logo) || '';
    var logoNeg = (saude ? ativos.logoNegativo : ativos.logoGeralNegativo || ativos.logoNegativo) || logo;
    var vetadas = lista(((diag.restricoes || {}).cores_vetadas)).map(function (c) { return chave(c); }).map(function (c) { return ({ dourado: 'amarelo', ouro: 'amarelo', turquesa: 'ciano', 'petroleo': 'ciano' })[c] || c; });
    var d = m.decisoes, vb = d.verba;
    function card(rotulo, valor, sub) { return '<div class="mapa-card"><div class="mc-rot">' + esc(rotulo) + '</div><div class="mc-val">' + valor + '</div>' + (sub ? '<div class="mc-sub">' + sub + '</div>' : '') + '</div>'; }
    var simNao = { sim: 'Sim', nao: 'Não', na: 'Não se aplica', alguns: 'Alguns' };
    var Empresa = vocab.a_empresa.charAt(0).toUpperCase() + vocab.a_empresa.slice(1);
    var videoOp = { cliente: [Empresa + ' grava', 'Com o roteiro que a Win7 envia'], roteiro: [Empresa + ' grava', 'Com o roteiro que a Win7 envia'], ia: ['Criado com IA', 'A Win7 cria o roteiro e o vídeo a partir de fotos e informações ' + vocab.da_empresa] };
    var vid = videoOp[d.video_home.opcao] || ['sem definição', ''];
    var principal = texto(d.pagina_principal);
    var cards = [
      card('Verba mensal no Google', moeda(vb.mensal), (vb.paginas === 1 ? '1 página e campanha' : vb.paginas + ' páginas e campanhas') + ' · cerca de ' + moeda(vb.por_pagina_dia) + ' por dia em cada'),
      card('Página principal', esc(principal || 'a definir'), (d.base_banner ? 'Banner: base ' + d.base_banner.n + ' · ' + esc(d.base_banner.nome) + (m.lp_modelo ? ' · ' : '') : '') + (m.lp_modelo ? '<a href="' + esc(m.lp_modelo) + '" target="_blank" rel="noopener">Ver o modelo da página</a>' : '')),
      card('Domínio da página', esc(d.dominio && d.dominio.modo === 'escolhido' ? d.dominio.escolhido : d.dominio && d.dominio.modo === 'whatsapp' ? 'Aprovação no grupo' : 'a definir'), d.dominio && d.dominio.modo === 'whatsapp' ? esc('Sugestões: ' + lista(d.dominio.sugestoes).map(function (x) { return x.dominio; }).join(' · ')) : ''),
      card(vocab.Servicos + ' para anunciar', String(d.servicos.length), esc(d.servicos.join(' · '))),
      card('Convênios', esc(simNao[d.convenios.situacao] || 'sem resposta'), d.convenios.pedir_lista ? 'Lista completa será pedida no grupo do WhatsApp' : esc(d.convenios.observacao)),
      card('Depoimentos em vídeo', esc(simNao[d.depoimentos.tem] || 'sem resposta'), esc([d.depoimentos.vai_enviar === 'sim' ? 'Vai enviar no grupo' + (texto(d.depoimentos.prazo_envio) ? ' até ' + d.depoimentos.prazo_envio : '') : '', d.depoimentos.vai_gravar === 'sim' ? 'Vai gravar' + (texto(d.depoimentos.prazo) ? ' até ' + d.depoimentos.prazo : '') : (d.depoimentos.vai_gravar === 'nao' ? 'Não vai gravar agora' : '')].filter(Boolean).join(' · '))),
      card('Vídeo da página', esc(vid[0]), esc([vid[1], texto(d.video_home.observacao)].filter(Boolean).join(' · '))),
      card('Cidades', String(d.cidades.atuar.length) + ' para atuar', d.cidades.nao_atuar.length ? d.cidades.nao_atuar.length + ' fora do raio' : '')
    ].join('');
    var difs = d.diferenciais.length ? '<ul class="mapa-lista">' + d.diferenciais.map(function (x) { return '<li><strong>' + esc(x.rotulo) + '</strong>' + (x.detalhe ? ': ' + esc(x.detalhe) : '') + '</li>'; }).join('') + '</ul>' : '<p class="intro">Nenhum diferencial registrado.</p>';
    var status = {}; lista(m.decisoes.cidades.atuar).forEach(function (c) { status[M.chaveCidade(c.nome)] = true; }); lista(m.decisoes.cidades.nao_atuar).forEach(function (c) { status[M.chaveCidade(c.nome)] = false; });
    var svg = M.svgRaio(diag, status);
    var cidades = (svg ? '<div class="mapa" style="margin-bottom:16px">' + svg + '<div class="mapa-cap">Cidades fora do raio aparecem apagadas. Mapa esquemático: a distância ao centro é proporcional aos km.</div></div>' : '') + '<div class="grade-2"><div class="bloco"><h3>Vamos atuar</h3><ul class="cidades">' + d.cidades.atuar.map(function (c) { return '<li>' + esc(c.nome) + (c.uf ? '/' + esc(c.uf) : '') + (c.km !== null && c.km !== undefined ? ' <b>' + M.inteiro(c.km) + ' km</b>' : '') + '</li>'; }).join('') + '</ul></div>' +
      '<div class="bloco"><h3>Fora do raio por agora</h3>' + (d.cidades.nao_atuar.length ? '<ul class="cidades">' + d.cidades.nao_atuar.map(function (c) { return '<li>' + esc(c.nome) + (c.uf ? '/' + esc(c.uf) : '') + '</li>'; }).join('') + '</ul>' : '<p class="intro">Nenhuma.</p>') + '</div></div>';
    var termosHtml = m.termos.length ? m.termos.map(function (f) {
      var kws = []; lista(f.grupos).forEach(function (g) { lista(g.termos).forEach(function (t) { var cs = lista(t.correspondencias); var tt = esc(texto(t.termo).toLowerCase()); if (cs.indexOf('exata') >= 0) kws.push('<span class="kw">[' + tt + ']</span>'); if (cs.indexOf('frase') >= 0) kws.push('<span class="kw frase">"' + tt + '"</span>'); }); });
      return '<div class="bloco"><h3>' + esc(f.frente) + '</h3><div>' + kws.join(' ') + '</div></div>';
    }).join('') : '<p class="intro">Os termos dos ' + vocab.servicos + ' confirmados entram no planejamento da campanha.</p>';
    var pend = m.pendencias.length ? '<div class="moldura-tabela rolagem"><table class="tabela"><thead><tr><th>O que</th><th>Quem</th><th>Prazo</th></tr></thead><tbody>' + m.pendencias.map(function (p) { return '<tr><td>' + esc(p.texto) + (p.obs ? '<br><span class="sub">' + esc(p.obs) + '</span>' : '') + '</td><td>' + esc(p.responsavel) + '</td><td>' + esc(p.prazo || 'a combinar') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="intro">Nenhuma pendência.</p>';
    var selo = function (st) { return '<span class="status ' + (st === 'ok' ? 'verificado' : st === 'corrigir' ? 'estimado' : 'nd') + '">' + (st === 'ok' ? 'Confirmado' : st === 'corrigir' ? 'Corrigir' : 'Sem conferência') + '</span> '; };
    var dadosHtml = lista(d.dados_cliente).length ? '<ul class="mapa-lista">' + d.dados_cliente.map(function (x) { return '<li>' + selo(x.status) + '<strong>' + esc(x.rotulo) + ':</strong> ' + esc(x.valor || 'não informado') + (x.status === 'corrigir' && x.correcao ? ' · correção: ' + esc(x.correcao) : '') + '</li>'; }).join('') + '</ul>' : '';
    var conf = m.confirmacoes.length ? '<ul class="mapa-lista">' + m.confirmacoes.map(function (c) { return '<li><span class="status ' + (c.status === 'ok' ? 'verificado' : c.status === 'pendente' ? 'estimado' : 'nd') + '">' + (c.status === 'ok' ? 'Confirmado' : c.status === 'pendente' ? 'Pendente' : 'Sem resposta') + '</span> ' + esc(c.texto) + (c.obs ? ' · ' + esc(c.obs) : '') + '</li>'; }).join('') + '</ul>' : '';
    var corpo = M.faixa(vetadas) +
      '<header class="cabecalho"><div class="cabecalho-topo"><img class="logo-w7" src="' + logo + '" alt="' + vocab.marca_logo + '"><div class="cab-direita"><div class="cab-tipo">Mapa do Onboarding</div><div class="cab-num">Validado na reunião de ' + esc(m.cliente.data_reuniao) + '</div></div></div>' +
      '<div class="cab-titulo"><h1>' + esc(m.cliente.nome) + '</h1><p class="cab-sub">O que decidimos juntos para as campanhas no Google irem ao ar.</p>' + M.ecg() + '</div>' +
      '<div class="ficha"><dl><div><dt>Cidade</dt><dd>' + esc(m.cliente.cidade) + '/' + esc(m.cliente.uf) + '</dd></div><div><dt>Prontidão no diagnóstico</dt><dd>' + (m.diagnostico.placar === null ? 'sem dados' : m.diagnostico.placar + ' de 100 · ' + esc(m.diagnostico.classe)) + '</dd></div>' + (m.participantes ? '<div class="largo"><dt>Participantes</dt><dd>' + esc(m.participantes) + '</dd></div>' : '') + '<div><dt>Elaborado por</dt><dd>' + vocab.marca + '</dd></div></dl></div></header>' +
      '<main class="folha">' +
      '<section class="secao"><div class="rotulo">Decisões</div><h2>O que ficou combinado</h2><div class="mapa-cards">' + cards + '</div></section>' +
      '<section class="secao"><div class="rotulo">Diferenciais</div><h2>O que vai para os anúncios</h2>' + difs + '</section>' +
      (d.cidades.atuar.length || d.cidades.nao_atuar.length ? '<section class="secao"><div class="rotulo">Segmentação geográfica</div><h2>Onde vamos aparecer</h2>' + cidades + '</section>' : '') +
      (dadosHtml ? '<section class="secao"><div class="rotulo">Dados conferidos</div><h2>Como ' + vocab.a_empresa + ' aparece na página e no Google</h2>' + dadosHtml + '</section>' : '') +
      '<section class="secao"><div class="rotulo">Palavras-chave</div><h2>Termos dos ' + vocab.servicos + ' confirmados</h2><div class="pilha">' + termosHtml + '</div><p class="nota-fonte">Só correspondência exata [termo] e de frase "termo". Volume e custo por clique são confirmados no Planejador de Palavras-chave na implantação.</p></section>' +
      '<section class="secao"><div class="rotulo">Próximos passos</div><h2>Pendências com responsável</h2>' + pend + (conf ? '<h3 style="margin-top:22px">Pontos confirmados na reunião</h3>' + conf : '') + (m.observacoes ? '<div class="nota-inv" style="margin-top:18px"><strong>Observações:</strong> ' + md(m.observacoes) + '</div>' : '') + '</section>' +
      '<div class="fechamento">' + M.faixa(vetadas) + '<div class="fech-corpo"><img src="' + logoNeg + '" alt="' + vocab.marca_logo + '" style="height:54px;width:auto">' + M.ecg() + '<h2>Tudo combinado. Próximo passo: páginas e campanhas.</h2><p>Este mapa é a referência do onboarding junto com a transcrição da reunião.</p></div></div>' +
      '<p class="rodape">Mapa gerado pelo <b>Motor de Diagnóstico ' + vocab.marca + '</b> v' + M.VERSAO + ' em ' + esc(opcoes.data || hojeBr()) + ', a partir do diagnóstico e das respostas registradas na reunião.</p></main>';
    var css = M.trocarCores(M.fontesCss(ativos) + (opcoes.css || ''), vetadas);
    var html = '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex, nofollow">\n<meta name="w7-mapa" content="' + MAPA_VERSAO + '">\n<title>Mapa do Onboarding · ' + esc(m.cliente.nome) + ' · ' + vocab.marca + '</title>\n<!-- Fonte Outfit, Copyright 2021 The Outfit Project Authors, SIL Open Font License 1.1 -->\n<style>\n' + css + '\n</style>\n</head>\n<body class="mapa-doc">\n' + M.trocarCores(corpo, vetadas) + '\n<!-- w7-dados mapa ' + M.base64Utf8(JSON.stringify(m)) + ' -->\n</body>\n</html>\n';
    return html;
  }

  raiz.OnboardingW7 = {
    ROTEIRO: ROTEIRO, MAPA_SCHEMA: MAPA_SCHEMA, MAPA_VERSAO: MAPA_VERSAO, RESPOSTAS_SCHEMA: RESPOSTAS_SCHEMA,
    slidesPara: slidesPara, estadoInicial: estadoInicial, migrar: migrar, sugerirDominios: sugerirDominios, normalizarDominio: normalizarDominio,
    PRAZO_DIAS_UTEIS: PRAZO_DIAS_UTEIS, somarDiasUteis: somarDiasUteis, lerData: lerData, checarPrazo: checarPrazo, dataBase: dataBase, formatarData: formatarData, mascaraTelefone: mascaraTelefone, mascaraData: mascaraData, mascaraCnpj: mascaraCnpj, BASES_BANNER: BASES_BANNER, REPO_CEREBRO: REPO_CEREBRO, ativacaoRobo3: ativacaoRobo3, PRAZOS: PRAZOS, verbaMensal: verbaMensal, calcularVerba: calcularVerba,
    montarMapa: montarMapa, validarMapa: validarMapa, gerarMapaHtml: gerarMapaHtml, pendenciasDe: pendenciasDe, txt: txt
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
