/* Motor de Diagnóstico Win7 Med · Diagnóstico para Google Ads
   Um arquivo, sem dependências. Roda no navegador (Gerador) e no Node (testes e linha de comando).
   O agente de IA só preenche os DADOS (JSON). Este motor valida, calcula, pontua e monta o laudo em HTML.
   Regras de negócio: docs/adr/003-motor1-portatil.md e docs/adr/004-foco-google-ads.md ·
   Contrato dos dados: agente/AGENTE-DIAGNOSTICO-WIN7MED.md, seção 11. */
(function (raiz) {
  'use strict';

  var VERSAO = '4.1.0';

  // ---------------------------------------------------------------- pilares e critérios do placar de prontidão
  var PILARES = {
    busca: { nome: 'Busca no Google', peso: 35, itens: [
      { chave: 'aparece_mapa', texto: 'Aparece entre os 3 primeiros do mapa na busca "{servico} + cidade"' },
      { chave: 'aparece_organico', texto: 'Site aparece na primeira página da busca "{servico} + cidade"' },
      { chave: 'anuncia_exame_foco', texto: 'Já anuncia no Google para o {servico} foco' },
      { chave: 'a_frente_dos_concorrentes', texto: 'Aparece antes dos concorrentes na primeira tela' },
      { chave: 'busca_pelo_nome', texto: 'A busca pelo nome mostra o perfil e o site corretos' },
      { chave: 'marca_protegida', texto: 'Nenhum concorrente anuncia quando buscam o nome {da_empresa}' }
    ] },
    site: { nome: 'Site e página de destino', peso: 35, itens: [
      { chave: 'existe', texto: 'Site próprio no ar' },
      { chave: 'https', texto: 'Endereço seguro (https)' },
      { chave: 'celular', texto: 'Leitura confortável no celular' },
      { chave: 'rapido', texto: 'Abre rápido no celular' },
      { chave: 'pagina_por_exame', texto: 'Página própria para cada {servico} foco (destino do anúncio)' },
      { chave: 'contato_whatsapp', texto: 'Contato pelo WhatsApp visível na página (botão ou formulário curto)' },
      { chave: 'convenios_visiveis', texto: '{pagamento}' },
      { chave: 'endereco_como_chegar', texto: 'Endereço e como chegar' },
      { chave: 'rt_visivel', texto: 'Responsável técnico (RT) informado', so_saude: true },
      { chave: 'politica_privacidade', texto: 'Política de privacidade acessível' },
      { chave: 'tag_google', texto: 'Tag do Google ou Gerenciador de Tags instalado' }
    ] },
    google: { nome: 'Google Meu Negócio', peso: 30, itens: [
      { chave: 'reivindicado', texto: 'Perfil reivindicado e administrado {pela_empresa}' },
      { chave: 'categoria_correta', texto: 'Categoria principal correta para o serviço foco' },
      { chave: 'horario_completo', texto: 'Horário completo e atualizado' },
      { chave: 'contato_no_perfil', texto: 'Telefone e site ou WhatsApp no perfil' },
      { chave: 'fotos_reais', texto: '{fotos}' },
      { chave: 'servicos_cadastrados', texto: '{perfil_servicos}' },
      { chave: 'responde_avaliacoes', texto: 'Responde às avaliações, inclusive às negativas' },
      { chave: 'posts_recentes', texto: 'Publicação no perfil nos últimos 30 dias' },
      { chave: 'nota', texto: 'Nota igual ou acima de 4,5', auto: true },
      { chave: 'volume_avaliacoes', texto: 'Pelo menos 100 avaliações', auto: true }
    ] }
  };
  var ORDEM_PILARES = ['busca', 'site', 'google'];
  var STATUS = ['verificado', 'observado', 'informado', 'estimado'];
  var ROTULO_STATUS = { verificado: 'Verificado', observado: 'Observado', informado: 'Informado', estimado: 'Estimado', nd: 'Não verificado' };
  var DATA_IMG = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/;
  /** Segmento é dado (ADR-005): saúde mantém o vocabulário e as regras de saúde; geral serve qualquer outro negócio. */
  var VOCAB = {
    saude: { setor: 'saude', servico: 'exame', servicos: 'exames', Servicos: 'Exames', cliente_final: 'paciente', clientes_finais: 'pacientes', empresa: 'clínica', a_empresa: 'a clínica', da_empresa: 'da clínica', pela_empresa: 'pela clínica', marca: 'Win7 Med', marca_logo: 'Win7 Med Imagem',
      fotos: 'Fotos reais de fachada, recepção e equipamentos', perfil_servicos: 'Exames e serviços cadastrados no perfil', pagamento: 'Convênios aceitos visíveis' },
    geral: { setor: 'geral', servico: 'serviço', servicos: 'serviços', Servicos: 'Serviços', cliente_final: 'cliente', clientes_finais: 'clientes', empresa: 'empresa', a_empresa: 'a empresa', da_empresa: 'da empresa', pela_empresa: 'pela empresa', marca: 'Win7', marca_logo: 'Win7',
      fotos: 'Fotos reais da fachada, do ambiente e do trabalho', perfil_servicos: 'Serviços e produtos cadastrados no perfil', pagamento: 'Formas de pagamento e condições visíveis' }
  };
  /** Sem setor declarado vale saúde: todo bloco de dados anterior à v4 é de saúde (compatibilidade). */
  function vocabDe(d) { var s = texto(d && d.cliente && d.cliente.setor).toLowerCase(); return s && s !== 'saude' && s !== 'saúde' ? VOCAB.geral : VOCAB.saude; }
  function comVocab(t, v) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; }); }
  function itensDo(chave, v) { return PILARES[chave].itens.filter(function (i) { return !i.so_saude || v.setor === 'saude'; }); }

  // ---------------------------------------------------------------- regra de verba (ADR-005): função isolada e testada nos limites
  var VERBA_MINIMA_POR_PAGINA = 1500;
  var MAX_PAGINAS = 3;
  /** Quantas páginas (e campanhas por serviço) a verba mensal comporta: uma a cada R$ 1.500 por mês (cerca de R$ 50 por dia), até 3. */
  function regraVerba(mensal, minimo, maximo) {
    minimo = minimo > 0 ? minimo : VERBA_MINIMA_POR_PAGINA; maximo = maximo > 0 ? maximo : MAX_PAGINAS;
    var v = typeof mensal === 'number' && isFinite(mensal) && mensal > 0 ? mensal : 0;
    var paginas = Math.min(maximo, Math.floor(v / minimo));
    return { mensal: v, paginas: paginas, minimo: minimo, maximo: maximo, abaixo_do_minimo: v < minimo, por_pagina_mes: paginas ? v / paginas : 0, por_pagina_dia: paginas ? v / paginas / 30 : 0, minimo_dia: minimo / 30 };
  }
  /** Verba informada como valor por dia para cada serviço: mensal = valor por dia × 30 × quantidade de serviços. */
  function verbaDiariaParaMensal(porDia, servicos) { return (porDia > 0 && servicos > 0) ? Math.round(porDia * 30 * servicos) : 0; }

  // ---------------------------------------------------------------- utilidades
  function ehObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function lista(x) { return Array.isArray(x) ? x : []; }
  function texto(x) { return x === undefined || x === null ? '' : String(x).trim(); }
  function num(x) { if (typeof x === 'number' && isFinite(x)) return x; if (ehObj(x) && typeof x.valor === 'number' && isFinite(x.valor)) return x.valor; return null; }
  function fato(x) { return ehObj(x) ? x : (typeof x === 'number' ? { valor: x, fonte: '', status: '' } : null); }
  function esc(s) { return texto(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  /** Marcação mínima permitida na narrativa: **negrito** e [[destaque]]. Todo o resto é texto. */
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[\[(.+?)\]\]/g, '<em>$1</em>').replace(/\n/g, '<br>'); }
  function slug(s) { return texto(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cliente'; }
  function moeda(v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); }
  function decimal(v, casas) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }); }
  function inteiro(v) { return Math.round(v).toLocaleString('pt-BR'); }
  function hoje() { var d = new Date(); return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/'); }

  /** Regra 1: nunca travessão. Corrige em vez de reprovar e conta as correções. */
  function limparTexto(s, cont) {
    var antes = s;
    s = s.replace(/(\d)\s*[–—]\s*(\d)/g, '$1 a $2')
      .replace(/\s+[–—]\s+/g, ', ')
      .replace(/[–—]/g, ', ')
      .replace(/,\s*,/g, ',');
    if (s !== antes && cont) cont.n++;
    return s;
  }
  function normalizar(dados) {
    var cont = { n: 0 };
    function andar(x) {
      if (typeof x === 'string') return limparTexto(x, cont);
      if (Array.isArray(x)) return x.map(andar);
      if (ehObj(x)) { var o = {}; Object.keys(x).forEach(function (k) { o[k] = andar(x[k]); }); return o; }
      return x;
    }
    return { dados: andar(dados), travessoes_corrigidos: cont.n };
  }

  /** Aceita a resposta do agente como veio: com cercas ```json, texto em volta, aspas curvas ou vírgula sobrando. */
  function extrairJson(bruto) {
    var t = texto(bruto).replace(/^﻿/, '');
    var cerca = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (cerca) t = cerca[1];
    var ini = t.indexOf('{'), fim = t.lastIndexOf('}');
    if (ini < 0 || fim < ini) throw new Error('Não encontrei um bloco de dados (JSON) no texto colado. Copie o bloco inteiro que o agente entregou, do primeiro { ao último }.');
    t = t.slice(ini, fim + 1);
    var tentativas = [t, t.replace(/[“”]/g, '"'), t.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')];
    var ultimoErro = null;
    for (var i = 0; i < tentativas.length; i++) {
      try { return JSON.parse(tentativas[i]); } catch (e) { ultimoErro = e; }
    }
    var m = String(ultimoErro && ultimoErro.message || '').match(/position (\d+)/);
    var onde = '';
    if (m) { var pos = Number(m[1]); var linha = t.slice(0, pos).split('\n').length; onde = ' perto da linha ' + linha + ': "' + t.slice(Math.max(0, pos - 30), pos + 30).replace(/\s+/g, ' ') + '"'; }
    throw new Error('O bloco de dados está com erro de formato' + onde + '. Peça ao agente: "reenvie o bloco de dados completo".');
  }

  // ---------------------------------------------------------------- matemática (regra: conta só em código)
  function avaliacoesParaNota(n, media, alvo) {
    if (!(n >= 0) || !(media > 0) || !(alvo > 0) || alvo >= 5) return null;
    if (media >= alvo) return 0;
    return Math.ceil((n * (alvo - media)) / (5 - alvo));
  }
  function alvosNota(media) {
    if (!(media > 0)) return [];
    if (media < 4.0) return [4.0, 4.3];
    if (media < 4.5) return [4.5, 4.7];
    if (media < 4.8) return [4.8, 4.9];
    return [];
  }
  function projetar(verba, custoContato, conversao, ticket) {
    var contatos = Math.round(verba / custoContato);
    var exames = Math.round(contatos * conversao);
    return { contatos: contatos, exames: exames, faturamento: exames * ticket, retorno: exames * ticket / verba };
  }

  // ---------------------------------------------------------------- placar
  function valorCriterio(v) {
    if (ehObj(v)) v = v.valor;
    if (v === true) return 'sim';
    if (v === false) return 'nao';
    var s = texto(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (['sim', 's', 'yes', 'ok'].indexOf(s) >= 0) return 'sim';
    if (['nao', 'n', 'no'].indexOf(s) >= 0) return 'nao';
    if (['parcial', 'em parte', 'p'].indexOf(s) >= 0) return 'parcial';
    return 'nd';
  }
  function pontuarPilar(chave, d) {
    var def = PILARES[chave], v0 = vocabDe(d);
    var p = (d.presenca && d.presenca[chave]) || {};
    var crit = ehObj(p.criterios) ? p.criterios : {};
    var naoExiste = def.itens.some(function (i) { return i.chave === 'existe'; }) && valorCriterio(crit.existe) === 'nao';
    var itens = itensDo(chave, v0).map(function (i) {
      var v, ev = ehObj(crit[i.chave]) ? texto(crit[i.chave].evidencia) : '';
      if (chave === 'google' && i.chave === 'nota') {
        var nota = num(p.nota); v = nota === null ? 'nd' : nota >= 4.5 ? 'sim' : nota >= 4.0 ? 'parcial' : 'nao';
        if (nota !== null) ev = 'Nota ' + decimal(nota, 1) + ' no perfil.';
      } else if (chave === 'google' && i.chave === 'volume_avaliacoes') {
        var av = num(p.avaliacoes); v = av === null ? 'nd' : av >= 100 ? 'sim' : av >= 30 ? 'parcial' : 'nao';
        if (av !== null) ev = inteiro(av) + ' avaliações no perfil.';
      } else if (naoExiste && i.chave !== 'existe') {
        v = 'nao'; ev = ev || 'O site não existe.';
      } else {
        v = valorCriterio(crit[i.chave]);
      }
      return { chave: i.chave, texto: comVocab(i.texto, v0), valor: v, evidencia: ev };
    });
    var conhecidos = itens.filter(function (i) { return i.valor !== 'nd'; });
    var soma = conhecidos.reduce(function (a, i) { return a + (i.valor === 'sim' ? 1 : i.valor === 'parcial' ? 0.5 : 0); }, 0);
    return { chave: chave, nome: def.nome, peso: def.peso, itens: itens, conhecidos: conhecidos.length, total: itens.length, pontos: conhecidos.length ? Math.round((100 * soma) / conhecidos.length) : null };
  }
  function nivel(p) { return p === null ? 'na' : p >= 70 ? 'bom' : p >= 45 ? 'atencao' : 'critico'; }
  function classe(p, v) {
    v = v || VOCAB.saude;
    if (p === null) return { nome: 'Sem dados', leitura: 'faltam dados para pontuar' };
    if (p >= 80) return { nome: 'Pronta para anunciar', leitura: 'é ligar as campanhas e escalar' };
    if (p >= 60) return { nome: 'Boa base', leitura: 'dá para anunciar corrigindo os pontos abaixo' };
    if (p >= 40) return { nome: 'Base frágil', leitura: 'anunciar sem os ajustes desperdiça verba' };
    return { nome: 'Base crítica', leitura: 'quem busca o ' + v.servico + ' não encontra ' + v.a_empresa };
  }
  function pontuar(d) {
    var pilares = ORDEM_PILARES.map(function (k) { return pontuarPilar(k, d); });
    var avaliados = pilares.filter(function (p) { return p.pontos !== null; });
    var pesoTotal = avaliados.reduce(function (a, p) { return a + p.peso; }, 0);
    var geral = pesoTotal ? Math.round(avaliados.reduce(function (a, p) { return a + p.pontos * p.peso; }, 0) / pesoTotal) : null;
    var conhecidos = pilares.reduce(function (a, p) { return a + p.conhecidos; }, 0);
    var total = pilares.reduce(function (a, p) { return a + p.total; }, 0);
    return { geral: geral, nivel: nivel(geral), classe: classe(geral, vocabDe(d)), pilares: pilares, conhecidos: conhecidos, total: total };
  }

  // ---------------------------------------------------------------- cores vetadas (regra 4: zero ocorrências)
  function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join(''); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbHex(r, g, b) { return '#' + [r, g, b].map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join(''); }
  function paraHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
    }
    return { h: h, s: s, l: l };
  }
  function deHsl(h, s, l) {
    function f(n) { var k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); }
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  function familiaDeCor(hex) {
    var c = hexRgb(hex), x = paraHsl(c[0], c[1], c[2]);
    if (x.s < 0.18 || x.l < 0.1 || x.l > 0.95) return 'neutro';
    var h = x.h;
    if (h < 15 || h >= 345) return 'vermelho';
    if (h < 38) return 'laranja';
    if (h < 68) return 'amarelo';
    if (h < 170) return 'verde';
    if (h < 200) return 'ciano';
    if (h < 262) return 'azul';
    if (h < 300) return 'roxo';
    return 'rosa';
  }
  var SINONIMOS = { dourado: 'amarelo', ouro: 'amarelo', turquesa: 'ciano', petroleo: 'ciano', 'petróleo': 'ciano', lilas: 'roxo', 'lilás': 'roxo', violeta: 'roxo', pink: 'rosa', vinho: 'vermelho', laranjado: 'laranja', green: 'verde', blue: 'azul', red: 'vermelho', yellow: 'amarelo' };
  function normalizarVetadas(l) { return lista(l).map(function (c) { c = texto(c).toLowerCase(); return SINONIMOS[c] || c; }).filter(Boolean); }
  var SUBSTITUTOS = ['#33424c', '#2f7cc1', '#6b4fa0', '#c46a1a', '#0b4f6c', '#d99a00'];
  function trocarCores(css, vetadas) {
    if (!vetadas.length) return css;
    var base = SUBSTITUTOS.filter(function (c) { return vetadas.indexOf(familiaDeCor(c)) < 0; });
    function novo(r, g, b) {
      var orig = paraHsl(r, g, b);
      for (var i = 0; i < base.length; i++) {
        var s = hexRgb(base[i]), sh = paraHsl(s[0], s[1], s[2]);
        var c = deHsl(sh.h, Math.min(orig.s, sh.s || orig.s), orig.l);
        if (vetadas.indexOf(familiaDeCor(rgbHex(c[0], c[1], c[2]))) < 0) return c;
      }
      var cinza = orig.l * 255; return [cinza, cinza, cinza];
    }
    css = css.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, function (h) {
      if (vetadas.indexOf(familiaDeCor(h)) < 0) return h;
      var c = hexRgb(h), n = novo(c[0], c[1], c[2]); return rgbHex(n[0], n[1], n[2]);
    });
    return css.replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g, function (tudo, r, g, b) {
      if (vetadas.indexOf(familiaDeCor(rgbHex(+r, +g, +b))) < 0) return tudo;
      var n = novo(+r, +g, +b); return tudo.replace(/\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/, '(' + n.map(Math.round).join(','));
    });
  }
  function coresNoTexto(html) {
    var achadas = {};
    (html.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g) || []).forEach(function (h) { achadas[h.toLowerCase()] = 1; });
    var re = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g, m;
    while ((m = re.exec(html))) achadas[rgbHex(+m[1], +m[2], +m[3])] = 1;
    return Object.keys(achadas);
  }

  // ---------------------------------------------------------------- validação dos dados
  function validarDados(d) {
    var erros = [], avisos = [];
    function e(m) { erros.push(m); } function a(m) { avisos.push(m); }
    if (!ehObj(d)) { e('O bloco de dados não é um objeto JSON.'); return { erros: erros, avisos: avisos }; }
    var c = d.cliente || {};
    if (!texto(c.nome)) e('Falta o nome do cliente (cliente.nome).');
    if (!texto(c.cidade) || !texto(c.uf)) e('Falta a cidade e a UF do cliente (cliente.cidade e cliente.uf).');
    if (texto(c.setor) && ['saude', 'saúde', 'geral'].indexOf(texto(c.setor).toLowerCase()) < 0) a('Setor "' + texto(c.setor) + '" desconhecido: use saude ou geral. Tratado como geral.');
    var placar = pontuar(d);
    if (placar.geral === null) e('Nenhum pilar foi avaliado: preencha os critérios de pelo menos um (presenca.busca, presenca.site ou presenca.google).');
    ORDEM_PILARES.forEach(function (k) {
      var p = (d.presenca || {})[k];
      if (!p) { a('Pilar "' + PILARES[k].nome + '" sem dados: ele não entra no placar.'); return; }
      if (ehObj(p.criterios)) Object.keys(p.criterios).forEach(function (ch) {
        if (!PILARES[k].itens.some(function (i) { return i.chave === ch; })) a('Critério desconhecido em ' + k + ': "' + ch + '" (ignorado).');
        else if (!itensDo(k, vocabDe(d)).some(function (i) { return i.chave === ch; })) a('Critério "' + ch + '" só vale para saúde: ignorado neste segmento.');
      });
      var pp = placar.pilares.filter(function (x) { return x.chave === k; })[0];
      if (pp.pontos !== null && !texto(p.observado_em) && k !== 'busca') a('Pilar "' + PILARES[k].nome + '" sem data de leitura (observado_em).');
    });
    var g = (d.presenca || {}).google || {};
    if (num(g.nota) === null || num(g.avaliacoes) === null) a('Sem nota ou sem número de avaliações do Google: a conta das avaliações não aparece.');
    ['nota', 'avaliacoes'].forEach(function (f) { var x = fato(g[f]); if (x && x.status && STATUS.indexOf(x.status) < 0) e('Status inválido em presenca.google.' + f + ': "' + x.status + '". Use verificado, observado, informado ou estimado.'); });
    if (!lista((d.ouvimos || {}).dores).length) a('Sem dores da conversa comercial: a seção "O que ouvimos" sai vazia.');
    var etapas = lista(d.etapas);
    if (etapas.length !== 3) e('O plano precisa de exatamente 3 etapas (etapas). Recebi ' + etapas.length + '.');
    etapas.forEach(function (et, i) {
      var n = texto(et.nome);
      if (!/^etapa\s*\d/i.test(n)) e('A etapa ' + (i + 1) + ' precisa começar com "Etapa ' + (i + 1) + '" (cronograma por etapas, nunca por meses).');
      if (/\b(m[eê]s|meses|semana|semanas)\b/i.test(n + ' ' + texto(et.foco))) e('A etapa ' + (i + 1) + ' cita mês ou semana no título. Use só etapas.');
    });
    var termos = lista((d.termos || {}).frentes);
    if (!termos.length) a('Sem termos de pesquisa sugeridos.');
    termos.forEach(function (f) {
      lista(f.grupos).forEach(function (gr) {
        lista(gr.termos).forEach(function (t) {
          var cs = lista(t.correspondencias).map(function (x) { return texto(x).toLowerCase(); });
          if (!cs.length) e('Termo sem correspondência: "' + texto(t.termo) + '". Use exata e/ou frase.');
          cs.forEach(function (x) { if (x === 'ampla' || x === 'broad') e('Correspondência ampla não é usada pela Win7: "' + texto(t.termo) + '".'); else if (x !== 'exata' && x !== 'frase') e('Correspondência desconhecida "' + x + '" em "' + texto(t.termo) + '". Use exata ou frase.'); });
          var tt = texto(t.termo);
          if (tt.length > 80 || tt.split(/\s+/).length > 10) a('Termo longo demais para o Google Ads (máximo 80 caracteres e 10 palavras): "' + tt + '".');
        });
      });
    });
    if (!d.raio || !lista(d.raio.zonas).length) a('Sem raio de atuação sugerido.');
    var zonasR = lista((d.raio || {}).zonas), antes = 0;
    zonasR.forEach(function (z, i) {
      var km = num(z.km_ate);
      if (!(km > 0)) { e('A zona ' + (i + 1) + ' do raio precisa de km_ate (número em km).'); return; }
      if (km <= antes) e('As zonas do raio são faixas de distância crescentes: a zona ' + (i + 1) + ' termina em ' + km + ' km, que não passa da zona anterior (' + antes + ' km).');
      lista(z.cidades).forEach(function (c) { var kc = num(c.km); if (kc !== null && (kc > km || (i > 0 && kc <= antes))) a('Cidade fora da faixa da zona: ' + texto(c.nome) + ' (' + kc + ' km) está na zona ' + (i + 1) + ', que vai de ' + antes + ' a ' + km + ' km.'); });
      antes = km;
    });
    var v = d.verba;
    if (!v || !lista(v.frentes).length) a('Sem verba sugerida para os anúncios: a seção de verba não aparece.');
    lista((v || {}).frentes).forEach(function (f) { if (num(f.valor) === null) e('Verba sem valor numérico na frente "' + texto(f.frente) + '".'); });
    var pr = d.projecao;
    if (pr) {
      if (num(pr.verba) === null || num(pr.ticket) === null) e('Projeção sem verba ou ticket numéricos.');
      lista(pr.cenarios).forEach(function (c2) { if (!(num(c2.custo_contato) > 0) || !(num(c2.conversao) > 0)) e('Cenário "' + texto(c2.nome) + '" sem custo por contato ou conversão.'); });
    }
    if (!lista(d.perguntas_reuniao).length) a('Sem perguntas para a reunião de onboarding.');
    lista(d.pendencias).forEach(function (p) { a('Pendência do agente: ' + texto(p)); });
    if (d.lp_modelo && texto(d.lp_modelo.url) && !urlModelo(d)) a('Link do modelo de página fora do padrão (https://<site>/m/<12 letras ou números>/): ignorado.');
    else if (!texto((d.lp_modelo || {}).url)) a('Sem o link da página modelo (lp_modelo.url): a apresentação monta o modelo neste navegador, com a logo do passo 3 e as cores dela. Para ter o link no ar (modelo.win7.ai), rode cliente.mjs --publicar no Claude Code.');
    function longos(x, trilha) {
      if (typeof x === 'string' && x.length > 420) a('Texto longo em ' + trilha + ' (' + x.length + ' caracteres). Na reunião ninguém lê parede de texto: encurte.');
      else if (Array.isArray(x)) x.forEach(function (v2, i) { longos(v2, trilha + '[' + i + ']'); });
      else if (ehObj(x)) Object.keys(x).forEach(function (k) { longos(x[k], trilha + '.' + k); });
    }
    longos(d, 'dados');
    return { erros: erros, avisos: avisos };
  }

  // ---------------------------------------------------------------- pedaços de HTML
  var SVG_LUPA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  /** A linha de batimento da logo Win7 Med vira o fio condutor do laudo. */
  function ecg() {
    return '<svg class="ecg" viewBox="0 0 1000 46" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="coracao" d="M14 22c-4-6-12-4-12 2 0 5 7 9 12 14 5-5 12-9 12-14 0-6-8-8-12-2z"/>' +
      '<path d="M30 30H700l14 5 14-31 16 40 12-20 10 6H1000"/></svg>';
  }
  function faixa(vetadas) {
    var cores = [['a', 'amarelo'], ['v', 'vermelho'], ['g', 'verde'], ['b', 'azul']].filter(function (c) { return vetadas.indexOf(c[1]) < 0; });
    return '<div class="faixa-marca" aria-hidden="true">' + cores.map(function (c) { return '<span class="' + c[0] + '"></span>'; }).join('') + '</div>';
  }
  function rotulo(t) { return '<div class="rotulo">' + esc(t) + '</div>'; }
  function selo(st) { st = STATUS.indexOf(st) >= 0 ? st : 'nd'; return '<span class="status ' + st + '">' + ROTULO_STATUS[st] + '</span>'; }
  function estrelas(n) { var c = Math.round(n); var s = ''; for (var i = 0; i < 5; i++) s += i < c ? '★' : '<span class="off">★</span>'; return '<span class="estrelas" aria-label="' + decimal(n, 1) + ' de 5">' + s + '</span>'; }

  function cabecalho(d, ctx) {
    var c = d.cliente, num = 'W7M-' + ctx.dataIso.replace(/-/g, '') + '-' + slug(c.nome).toUpperCase().slice(0, 24).replace(/-+$/, '');
    var focos = lista(c.servicos_foco).slice(0, 4).join(', ');
    var cel = [
      [ctx.vocab.setor === 'saude' ? 'Clínica' : 'Cliente', ctx.logoCliente ? '<img class="logo-cli" src="' + ctx.logoCliente + '" alt="' + esc(c.nome) + '">' : esc(c.nome)],
      ['Cidade', esc(c.cidade) + '/' + esc(c.uf)],
      focos ? [ctx.vocab.Servicos + ' foco', esc(focos), 'largo'] : null,
      texto(c.data_reuniao) ? ['Reunião de onboarding', esc(c.data_reuniao)] : null,
      ['Elaborado por', ctx.vocab.marca],
      ['Data do laudo', esc(ctx.data)]
    ].filter(Boolean);
    return faixa(ctx.vetadas) +
      '<header class="cabecalho"><div class="cabecalho-topo"><img class="logo-w7" src="' + ctx.ativos.logo + '" alt="' + ctx.vocab.marca_logo + '">' +
      '<div class="cab-direita"><div class="cab-tipo">Diagnóstico para Google Ads</div><div class="cab-num">Nº ' + esc(num) + '</div></div></div>' +
      '<div class="cab-titulo"><h1>' + esc(c.nome) + '</h1><p class="cab-sub">' + md(texto(d.subtitulo) || 'Como ' + ctx.vocab.a_empresa + ' aparece hoje para quem busca o ' + ctx.vocab.servico + ' no Google, e o plano para os anúncios.') + '</p>' + ecg() + '</div>' +
      '<div class="ficha"><dl>' + cel.map(function (x) { return '<div' + (x[2] ? ' class="' + x[2] + '"' : '') + '><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl></div></header>';
  }

  function impressao(d, placar, ctx) {
    var im = d.impressao || {};
    var p = placar.geral, arco = Math.PI * 80, off = p === null ? arco : arco * (1 - p / 100);
    var gauge = '<svg viewBox="0 0 200 120" role="img" aria-label="Prontidão ' + (p === null ? 'sem dados' : p + ' de 100') + '">' +
      '<path class="arco-fundo" d="M20 104a80 80 0 0 1 160 0"/>' +
      '<path class="arco st-' + placar.nivel + '" d="M20 104a80 80 0 0 1 160 0" stroke-dasharray="' + arco.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '<text class="valor" x="100" y="98" text-anchor="middle">' + (p === null ? 's/d' : p) + '</text><text class="de" x="100" y="116" text-anchor="middle">de 100</text></svg>';
    var barras = placar.pilares.map(function (pp) {
      var n = nivel(pp.pontos);
      return '<div class="pilar' + (pp.pontos === null ? ' na' : '') + '"><span class="nome">' + esc(pp.nome) + '</span><span class="trilho"><span class="enche f-' + n + '" style="width:' + (pp.pontos === null ? 0 : Math.max(3, pp.pontos)) + '%"></span></span><span class="pts">' + (pp.pontos === null ? 'n/a' : pp.pontos) + '</span></div>';
    }).join('');
    var principais = lista(im.achados_principais).slice(0, 3);
    var rapidos = lista(im.ganhos_rapidos).slice(0, 3);
    return '<section class="secao">' + rotulo('Impressão diagnóstica') +
      '<h2>' + md(texto(im.titulo) || 'Quão pronta ' + ctx.vocab.a_empresa + ' está para anunciar no Google') + '</h2>' +
      '<div class="impressao"><div class="placar"><div class="conf">Prontidão para Google Ads</div>' + gauge + '<div class="classe">' + esc(placar.classe.nome) + '</div><div class="conf">' + esc(placar.classe.leitura) + '</div><div class="conf">Base: ' + placar.conhecidos + ' de ' + placar.total + ' critérios verificados</div></div>' +
      '<div class="leitura">' + (texto(im.frase) ? '<p class="frase">' + md(im.frase) + '</p>' : '') + '<div class="pilares">' + barras + '</div>' +
      (principais.length || rapidos.length ? '<div class="grade-2">' +
        (principais.length ? '<div class="bloco"><h3>Achados principais</h3><ul class="lista-chave">' + principais.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div>' : '') +
        (rapidos.length ? '<div class="bloco"><h3>Ajustes antes de anunciar</h3><ul class="lista-chave rapidos">' + rapidos.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div>' : '') +
        '</div>' : '') +
      '</div></div><p class="nota-fonte">Placar do método ' + ctx.vocab.marca + ': cada critério verificado vale 1 (sim), 0,5 (parcial) ou 0 (não). Pesos: Busca no Google 35, Site e página de destino 35, Google Meu Negócio 30. Critério não verificado fica fora da conta.</p></section>';
  }

  function ouvimos(d, ctx) {
    var o = d.ouvimos || {};
    var dores = lista(o.dores).slice(0, 4), trunfos = lista(o.trunfos).slice(0, 3);
    if (!dores.length && !trunfos.length) return '';
    return '<section class="secao">' + rotulo('Indicação') + '<h2>' + md(texto(o.titulo) || 'O que ouvimos na conversa com ' + ctx.vocab.a_empresa) + '</h2>' +
      (texto(o.intro) ? '<p class="intro">' + md(o.intro) + '</p>' : '') +
      '<div class="grade-2">' + dores.map(function (x) {
        return '<div class="bloco queixa"><h3>' + esc(x.titulo) + '</h3><p>' + md(x.texto) + '</p>' + (texto(x.citacao) ? '<p class="cit">"' + esc(x.citacao) + '"</p>' : '') + '</div>';
      }).join('') + trunfos.map(function (x) {
        return '<div class="bloco trunfo"><h3>' + esc(x.titulo) + '</h3><p>' + md(x.texto) + '</p></div>';
      }).join('') + '</div>' + (texto(o.fonte) ? '<p class="nota-fonte">Fonte: ' + md(o.fonte) + '</p>' : '') + '</section>';
  }

  function tecnica(d, ctx) {
    var pr = d.presenca || {};
    var linhas = [];
    ORDEM_PILARES.forEach(function (k) {
      var p = pr[k]; if (!p) { linhas.push([PILARES[k].nome, '', 'nd', '', 'Não avaliado']); return; }
      var alvo = k === 'busca' ? lista(p.consultas).map(function (c) { return '"' + texto(c.termo) + '"'; }).join(', ') : texto(p.url);
      var dataL = k === 'busca' ? lista(p.consultas).map(function (c) { return texto(c.observado_em); }).filter(Boolean)[0] || '' : texto(p.observado_em);
      linhas.push([PILARES[k].nome, alvo, texto(p.origem) || (dataL ? 'observado' : 'informado'), dataL, texto(p.como) || '']);
    });
    lista(d.fontes_extras).forEach(function (f) { linhas.push([texto(f.fonte), texto(f.detalhe), texto(f.status), texto(f.data), texto(f.como)]); });
    return '<section class="secao">' + rotulo('Técnica') + '<h2>O que analisamos, e de onde veio cada dado</h2>' +
      '<p class="intro">Cada número deste laudo tem origem. <strong>Verificado</strong>: lido na fonte oficial. <strong>Observado</strong>: visto na busca ou em print, com data. <strong>Informado</strong>: dito ' + ctx.vocab.pela_empresa + ' ou pela equipe. <strong>Estimado</strong>: premissa declarada.</p>' +
      '<div class="bloco rolagem"><table class="tecnica"><thead><tr><th>Canal</th><th>Endereço ou busca</th><th>Origem</th><th>Data</th><th>Como</th></tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr><td>' + esc(l[0]) + '</td><td class="url">' + esc(l[1]) + '</td><td>' + selo(l[2]) + '</td><td>' + esc(l[3]) + '</td><td>' + md(l[4]) + '</td></tr>'; }).join('') +
      '</tbody></table></div></section>';
  }

  function listaCriterios(pp) {
    var marca = { sim: '✓', parcial: '½', nao: '✗', nd: '?' };
    return '<ul class="criterios">' + pp.itens.map(function (i) {
      return '<li class="' + i.valor + '"><span class="ic" aria-label="' + ({ sim: 'sim', parcial: 'parcial', nao: 'não', nd: 'não verificado' })[i.valor] + '">' + marca[i.valor] + '</span><span>' + esc(i.texto) + (i.evidencia ? '<span class="ev">' + md(i.evidencia) + '</span>' : '') + '</span></li>';
    }).join('') + '</ul>';
  }
  function listaAchados(p) {
    var a = lista(p && p.achados);
    if (!a.length) return '';
    return '<ul class="achados">' + a.map(function (x) {
      var t = typeof x === 'string' ? x : texto(x.texto), tipo = typeof x === 'string' ? '' : texto(x.tipo);
      return '<li class="achado ' + esc(tipo) + '">' + md(t) + '</li>';
    }).join('') + '</ul>';
  }
  function cabPilar(pp, extra) {
    var n = nivel(pp.pontos);
    return '<div class="pilar-cab"><div><h3>' + esc(pp.nome) + '</h3>' + (extra ? '<div class="url">' + extra + '</div>' : '') + '</div><span class="selo-pts ' + n + '">' + (pp.pontos === null ? 'não avaliado' : pp.pontos + ' de 100') + '</span></div>';
  }
  function serp(c, d) {
    var nomeCli = texto(d.cliente.nome_curto) || texto(d.cliente.nome);
    var itens = lista(c.resultados).map(function (r) {
      var cls = r.cliente ? ' cliente' : r.ausente ? ' ausente' : '';
      var marca = r.cliente ? '<span class="serp-marca">' + esc(texto(r.marca) || nomeCli) + '</span>' : r.ausente ? '<span class="serp-marca">' + esc(texto(r.marca) || nomeCli + ' não aparece') + '</span>' : '';
      var tipo = ({ patrocinado: 'Patrocinado', organico: 'Resultado orgânico', mapa: 'Mapa (perfis locais)', diretorio: 'Diretório ou agregador' })[texto(r.tipo)] || esc(r.tipo);
      return '<div class="serp-item' + cls + '">' + marca + '<div class="serp-tipo">' + tipo + '</div><div class="serp-dom">' + esc(r.dominio) + (texto(r.nome) ? ' · ' + esc(r.nome) : '') + '</div>' + (texto(r.titulo) ? '<div class="serp-tit">' + esc(r.titulo) + '</div>' : '') + (texto(r.descricao) ? '<div class="serp-desc">' + md(r.descricao) + '</div>' : '') + '</div>';
    }).join('');
    var rot = texto(c.observado_em) ? 'Observado em ' + esc(c.observado_em) + '. A ordem muda com hora, local e aparelho.' : 'Simulação ilustrativa montada com o que a equipe relatou; não é um print da busca.';
    return '<div class="serp"><div class="serp-barra">' + SVG_LUPA + '<span>' + esc(c.termo) + '</span></div>' + itens + '<p class="serp-rot">' + rot + '</p></div>';
  }
  function achados(d, placar, ctx) {
    var pr = d.presenca || {};
    var porChave = {}; placar.pilares.forEach(function (p) { porChave[p.chave] = p; });
    var partes = [];
    var b = pr.busca;
    if (b) {
      var cons = lista(b.consultas).slice(0, 2);
      var serps = cons.map(function (c) { return serp(c, d); }).join('');
      var lado = cons.length === 1 ? '<div class="grade-2">' + serps + '<div>' + listaCriterios(porChave.busca) + '</div></div>' : (cons.length ? '<div class="grade-2">' + serps + '</div>' : '') + listaCriterios(porChave.busca);
      partes.push('<div class="bloco">' + cabPilar(porChave.busca) + lado + listaAchados(b) + '</div>');
    }
    var s = pr.site;
    if (s) partes.push('<div class="bloco">' + cabPilar(porChave.site, texto(s.url) ? esc(s.url) : '') + listaCriterios(porChave.site) + listaAchados(s) + '</div>');
    var g = pr.google;
    if (g) {
      var pp = porChave.google, nota = num(g.nota), av = num(g.avaliacoes);
      var card = '';
      if (nota !== null && av !== null) {
        var dados = [g.endereco && '<div><strong>Endereço:</strong> ' + esc(g.endereco) + '</div>', g.horario && '<div><strong>Horário:</strong> ' + esc(g.horario) + '</div>', g.telefone && '<div><strong>Telefone:</strong> ' + esc(g.telefone) + '</div>'].filter(Boolean).join('');
        var fn = fato(g.nota) || {};
        card = '<div class="gmn"><div class="gmn-topo"><div class="gmn-nome">' + esc(texto(g.nome) || d.cliente.nome) + '</div><div class="gmn-cat">' + esc(texto(g.categoria) || 'Categoria não informada') + ' · ' + esc(d.cliente.cidade) + '/' + esc(d.cliente.uf) + '</div>' +
          '<div class="gmn-nota"><span class="n">' + decimal(nota, 1) + '</span><span>' + estrelas(nota) + '<span class="gmn-qtd" style="display:block">' + inteiro(av) + ' avaliações</span></span></div></div>' +
          (dados ? '<div class="gmn-dados">' + dados + '</div>' : '') +
          '<div class="gmn-pe">Perfil recriado em código. ' + ROTULO_STATUS[STATUS.indexOf(fn.status) >= 0 ? fn.status : 'nd'] + (texto(g.observado_em) ? ' em ' + esc(g.observado_em) : '') + (texto(fn.fonte) ? '. Fonte: ' + esc(fn.fonte) : '') + '.</div></div>';
        var alvos = lista(d.nota_alvos).length ? d.nota_alvos : alvosNota(nota);
        var metas = alvos.map(function (al) {
          var x = avaliacoesParaNota(av, nota, al);
          return '<div class="meta-nota"><div class="mv">' + (x === 0 ? '✓' : '+' + inteiro(x)) + '</div><div class="ml">' + (x === 0 ? 'já está em ' + decimal(al, 1) + ' ou mais' : 'avaliações 5 estrelas para chegar a ' + decimal(al, 1)) + '</div></div>';
        }).join('');
        if (!alvos.length) metas = '<div class="meta-nota"><div class="mv">' + decimal(nota, 1) + '</div><div class="ml">nota de excelência: o trabalho é manter o ritmo de avaliações novas</div></div>';
        card += '<div class="metas-nota">' + metas + '</div><p class="formula">Avaliações 5★ necessárias = N × (alvo − nota) ÷ (5 − alvo), com N = ' + inteiro(av) + ' e nota ' + decimal(nota, 1) + '. A nota aparece nos anúncios com extensão de local.</p>';
      }
      partes.push('<div class="bloco">' + cabPilar(pp) + '<div class="grade-2"><div>' + card + '</div><div>' + listaCriterios(pp) + '</div></div>' + listaAchados(g) + '</div>');
    }
    var ag = d.agenda;
    if (ag && lista(ag.itens).length) {
      var total = 0;
      var linhas = lista(ag.itens).map(function (x) {
        var h = num(x.horarios_vazios), t = num(x.ticket); var parado = h !== null && t !== null ? Math.round(h * t) : null; if (parado) total += parado;
        var fh = fato(x.horarios_vazios) || {}, ft = fato(x.ticket) || {};
        return '<tr><td>' + esc(x.nome) + '</td><td>' + (h === null ? 'n/d' : inteiro(h)) + ' ' + selo(fh.status) + '</td><td>' + (t === null ? 'n/d' : moeda(t)) + ' ' + selo(ft.status) + '</td><td><strong>' + (parado === null ? 'n/d' : moeda(parado)) + '</strong></td></tr>';
      }).join('');
      partes.push('<div class="bloco"><div class="pilar-cab"><h3>A agenda vazia que os anúncios vão atacar</h3></div><div class="moldura-tabela rolagem"><table class="tabela"><thead><tr><th>' + ctx.vocab.Servicos.replace(/s$/, '') + '</th><th>Horários vazios por mês</th><th>Ticket médio</th><th>Parado por mês</th></tr></thead><tbody>' + linhas +
        '<tr><td>Total</td><td></td><td></td><td><strong>' + moeda(total) + '</strong></td></tr></tbody></table></div>' +
        (texto(ag.leitura) ? '<p class="intro" style="margin:12px 0 0">' + md(ag.leitura) + '</p>' : '') + '<p class="formula">Parado = horários vazios × ticket médio. Teto bruto, não promessa.</p></div>');
    }
    return '<section class="secao">' + rotulo('Achados') + '<h2>' + md(texto((d.achados || {}).titulo) || 'O que o ' + ctx.vocab.cliente_final + ' encontra quando busca o ' + ctx.vocab.servico) + '</h2><div class="pilha">' + partes.join('') + '</div></section>';
  }

  /**
   * Desenho esquemático do raio (anéis por zona e cidades pelo passo áureo).
   * status (opcional): { chave da cidade: true | false } marca as cidades fora (apresentação ao vivo e Mapa).
   * Sem status, o desenho é idêntico ao do diagnóstico.
   */
  function svgRaio(d, status) {
    var r = d && d.raio;
    if (!r || !lista(r.zonas).length) return '';
    var zonas = lista(r.zonas).slice(0, 3);
    var maxKm = Math.max.apply(null, zonas.map(function (z) { return num(z.km_ate) || 0; }).concat([1]));
    var R = 196, cx = 360, cy = 222, OURO = Math.PI * (3 - Math.sqrt(5));
    var aneis = zonas.map(function (z, i) { return { r: Math.max(30, (num(z.km_ate) / maxKm) * R), z: z, i: i }; });
    var svgAneis = aneis.slice().reverse().map(function (a) { return '<circle class="anel z' + (a.i + 1) + '" cx="' + cx + '" cy="' + cy + '" r="' + a.r.toFixed(1) + '"/>'; }).join('') +
      aneis.map(function (a) { return '<text class="anel-km z' + (a.i + 1) + '" x="' + cx + '" y="' + (cy - a.r - 6).toFixed(1) + '" text-anchor="middle">' + inteiro(num(a.z.km_ate)) + ' km</text>'; }).join('');
    var cidades = [];
    zonas.forEach(function (z, zi) { lista(z.cidades).forEach(function (c) { var km = num(c.km); if (km !== null && km > 0) cidades.push({ c: c, km: km, zona: zi + 1 }); }); });
    cidades.sort(function (a, b) { return a.km - b.km; });
    var pontos = cidades.slice(0, 18).map(function (x, i) {
      var raioP = Math.max(34, Math.min(R + 4, (x.km / maxKm) * R));
      var ang = (i * OURO + Math.PI * 0.72) % (Math.PI * 2), topo = -Math.PI / 2;
      var dif = Math.atan2(Math.sin(ang - topo), Math.cos(ang - topo));
      if (Math.abs(dif) < 0.44) ang += dif >= 0 ? 0.5 : -0.5;
      var px = cx + raioP * Math.cos(ang), py = cy + raioP * Math.sin(ang);
      var co = Math.cos(ang), si = Math.sin(ang);
      var anc = co > 0.25 ? 'start' : co < -0.25 ? 'end' : 'middle';
      var lx = px + 11 * co, ly = py + 11 * si + (anc === 'middle' ? (si > 0 ? 13 : -6) : 4);
      var nome = texto(x.c.nome); if (nome.length > 20) nome = nome.slice(0, 19) + '…';
      var fora = status && status[chaveCidade(x.c.nome)] === false ? ' fora' : '';
      return '<circle class="ponto z' + x.zona + fora + '" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5.5"/><text class="cid' + fora + '" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anc + '">' + esc(nome) + ' · ' + inteiro(x.km) + ' km</text>';
    }).join('');
    return '<svg viewBox="0 0 720 448" role="img" aria-label="Mapa esquemático do raio de atuação"><style>.anel{fill:none;stroke-width:1.6;stroke-dasharray:5 5}.anel.z1{stroke:var(--zona1);fill:rgba(11,79,108,0.07);stroke-dasharray:none}.anel.z2{stroke:var(--zona2)}.anel.z3{stroke:var(--zona3)}.anel-km{font-size:13px;font-weight:700;font-family:var(--fonte)}.anel-km.z1{fill:var(--zona1)}.anel-km.z2{fill:var(--zona2)}.anel-km.z3{fill:#a87600}.ponto{stroke:#fff;stroke-width:2}.ponto.z1{fill:var(--zona1)}.ponto.z2{fill:var(--zona2)}.ponto.z3{fill:var(--zona3)}.cid{font-size:13px;font-weight:600;fill:var(--tinta);font-family:var(--fonte)}.centro{fill:var(--w7-vermelho);stroke:#fff;stroke-width:3}.centro-t{font-size:14.5px;font-weight:700;fill:var(--tinta);font-family:var(--fonte)}' + (status ? '.fora{opacity:.25}' : '') + '</style>' +
      svgAneis + pontos + '<circle class="centro" cx="' + cx + '" cy="' + cy + '" r="9"/><text class="centro-t" x="' + cx + '" y="' + (cy + 26) + '" text-anchor="middle">' + esc(texto(d.cliente.nome_curto) || d.cliente.nome) + '</text></svg>';
  }
  function chaveCidade(n) { return texto(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

  function raio(d) {
    var r = d.raio;
    if (!r || !lista(r.zonas).length) return '';
    var zonas = lista(r.zonas).slice(0, 3);
    var svg = svgRaio(d);
    var cards = zonas.map(function (z, i) {
      var de = i === 0 ? 0 : num(zonas[i - 1].km_ate);
      return '<div class="zona z' + (i + 1) + '"><div class="zona-cab"><span class="zona-nome">' + esc(texto(z.nome) || 'Zona ' + (i + 1)) + '</span><span class="zona-km">' + inteiro(de) + ' a ' + inteiro(num(z.km_ate)) + ' km</span></div><p>' + md(z.estrategia) + '</p>' +
        (lista(z.cidades).length ? '<ul class="cidades">' + lista(z.cidades).map(function (c) { var km = num(c.km); return '<li>' + esc(c.nome) + (texto(c.uf) ? '/' + esc(c.uf) : '') + (km !== null ? ' <b>' + inteiro(km) + ' km</b>' : '') + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    }).join('');
    var rec = num(r.recomendacao_km);
    return '<section class="secao">' + rotulo('Conduta · segmentação geográfica') + '<h2>' + md(texto(r.titulo) || 'Raio de atuação sugerido para os anúncios') + '</h2>' +
      (texto(r.intro) ? '<p class="intro">' + md(r.intro) + '</p>' : '') +
      '<div class="raio"><div class="mapa">' + svg + '<div class="mapa-cap">Mapa esquemático: a distância ao centro é proporcional aos km; a direção não é geográfica.</div></div><div class="pilha">' +
      (rec ? '<div class="recomenda"><span class="km">' + inteiro(rec) + ' km</span><p>' + md(texto(r.recomendacao_texto) || 'Raio para começar a Etapa 1. As zonas seguintes abrem conforme os dados das campanhas.') + '</p></div>' : '') + cards + '</div></div>' +
      '<p class="nota-fonte">' + md(texto(r.fonte) || 'Distâncias por estrada aproximadas, a confirmar no planejamento da campanha.') + '</p></section>';
  }

  function termos(d, ctx) {
    var t = d.termos;
    var frentes = lista(t && t.frentes);
    if (!frentes.length) return '';
    function chips(x) {
      var cs = lista(x.correspondencias).map(function (c) { return texto(c).toLowerCase(); });
      var termo = texto(x.termo).toLowerCase();
      return (cs.indexOf('exata') >= 0 ? '<span class="kw exata">[' + esc(termo) + ']</span>' : '') + (cs.indexOf('frase') >= 0 ? '<span class="kw frase">"' + esc(termo) + '"</span>' : '');
    }
    var blocos = frentes.map(function (f) {
      var linhas = [];
      lista(f.grupos).forEach(function (g) {
        lista(g.termos).forEach(function (x, i) {
          var pr = ['alta', 'media', 'baixa'].indexOf(texto(x.prioridade).toLowerCase().replace('é', 'e')) >= 0 ? texto(x.prioridade).toLowerCase().replace('é', 'e') : 'media';
          linhas.push('<tr><td class="intencao">' + (i === 0 ? esc(g.intencao) : '') + '</td><td>' + chips(x) + '</td><td><span class="prio ' + pr + '">' + ({ alta: 'alta', media: 'média', baixa: 'baixa' })[pr] + '</span></td></tr>');
        });
      });
      var qtd = lista(f.grupos).reduce(function (a, g) { return a + lista(g.termos).length; }, 0);
      return '<div class="frente"><div class="frente-cab"><h3>' + esc(f.frente) + '</h3><span class="sub">' + qtd + ' termos' + (texto(f.observacao) ? ' · ' + esc(f.observacao) : '') + '</span></div><div class="rolagem"><table class="termos"><thead><tr><th>Intenção</th><th>Termo e correspondência</th><th>Prioridade</th></tr></thead><tbody>' + linhas.join('') + '</tbody></table></div></div>';
    }).join('');
    return '<section class="secao">' + rotulo('Conduta · palavras-chave') + '<h2>' + md(texto(t.titulo) || 'Termos de pesquisa que o ' + ctx.vocab.cliente_final + ' usa, por ' + ctx.vocab.servico) + '</h2>' +
      (texto(t.intro) ? '<p class="intro">' + md(t.intro) + '</p>' : '') +
      '<div class="legenda-kw"><span><span class="kw">[termo]</span> correspondência exata</span><span><span class="kw frase">"termo"</span> correspondência de frase</span><span>Sem correspondência ampla.</span></div>' +
      '<div class="pilha">' + blocos + '</div><p class="nota-fonte">' + md(texto(t.observacao) || 'Lista de partida para o planejamento. Volume de buscas e custo por clique são confirmados no Planejador de Palavras-chave do Google na implantação; termos negativos ficam com o gestor de anúncios.') + '</p></section>';
  }

  function conduta(d) {
    var c = d.conduta || {};
    var itens = lista(c.itens).slice(0, 7);
    if (!itens.length) return '';
    return '<section class="secao">' + rotulo('Conduta') + '<h2>' + md(texto(c.titulo) || 'O plano para cada achado') + '</h2>' + (texto(c.intro) ? '<p class="intro">' + md(c.intro) + '</p>' : '') +
      '<div class="pilha">' + itens.map(function (x, i) {
        return '<div class="bloco conduta"><span class="num">' + (i + 1) + '</span><div>' + (texto(x.responde) ? '<span class="responde">' + esc(x.responde) + '</span>' : '') + '<h3>' + esc(x.titulo) + '</h3><p>' + md(x.texto) + '</p></div></div>';
      }).join('') + '</div></section>';
  }

  /** Link do modelo de página (ADR-006). Só aparece com endereço válido do site de modelos. */
  var URL_MODELO = /^https:\/\/[a-z0-9.-]+\/m\/[a-z0-9]{12}\/$/;
  function urlModelo(d) { var u = texto(d && d.lp_modelo && d.lp_modelo.url); return URL_MODELO.test(u) ? u : ''; }
  function modeloPagina(d, ctx) {
    var u = urlModelo(d);
    if (!u) return '';
    return '<section class="secao">' + rotulo('Página de destino') + '<h2>O modelo da sua página</h2>' +
      '<p class="intro">Montamos um modelo da página que vai receber os anúncios, já com “' + esc(texto(d.lp_modelo.servico) || texto((d.cliente || {}).servicos_foco && d.cliente.servicos_foco[0]) || ctx.vocab.servico) + ' em ' + esc(texto((d.cliente || {}).cidade)) + '” no título. Ele mostra a estrutura que converte: vídeo no alto, ' + (ctx.vocab.setor === 'saude' ? 'convênios' : 'formas de pagamento e parceiros') + ', depoimentos e WhatsApp sempre à mão.</p>' +
      '<p><a class="link-modelo" href="' + esc(u) + '" target="_blank" rel="noopener">Abrir o modelo da página</a></p>' +
      '<p class="nota-fonte">Modelo para aprovação, fora do Google: vídeo, ' + (ctx.vocab.setor === 'saude' ? 'convênios' : 'parceiros') + ' e depoimentos são ilustrativos. A página publicada usa o material real ' + ctx.vocab.da_empresa + '.</p></section>';
  }

  function etapas(d) {
    var et = lista(d.etapas).slice(0, 3);
    if (!et.length) return '';
    var html = '<div class="etapas">' + et.map(function (e) {
      return '<div class="etapa"><div class="en">' + esc(e.nome).split('·')[0].trim() + '</div><h3>' + esc((texto(e.nome).split('·')[1] || e.nome).trim()) + '</h3>' + (texto(e.foco) ? '<div class="foco">' + esc(e.foco) + '</div>' : '') +
        '<ul>' + lista(e.acoes).map(function (a) { return '<li>' + md(a) + '</li>'; }).join('') + '</ul>' + (texto(e.meta) ? '<div class="meta"><strong>Meta:</strong> ' + md(e.meta) + '</div>' : '') + '</div>';
    }).join('') + '</div><p class="aviso-etapa"><strong>As etapas avançam pelos dados, não pelo calendário.</strong> Quando a demanda da região satura, o raio abre mais rápido, cidade a cidade, conforme a verba.</p>';
    return '<section class="secao">' + rotulo('Evolução') + '<h2>' + md(texto(d.etapas_titulo) || 'Três etapas, com meta clara em cada uma') + '</h2>' + html + '</section>';
  }

  function verba(d, ctx) {
    var vc = ctx.vocab;
    var v = d.verba, p = d.projecao;
    var frentes = lista(v && v.frentes).filter(function (f) { return num(f.valor) !== null; });
    var temProj = p && lista(p.cenarios).length && num(p.verba) !== null && num(p.ticket) !== null;
    if (!frentes.length && !temProj) return '';
    var html = '';
    if (frentes.length) {
      var total = frentes.reduce(function (a, f) { return a + num(f.valor); }, 0);
      html += '<div class="planos">' + frentes.map(function (f) {
        var ff = fato(f.valor) || {};
        return '<div class="plano"><h3>' + esc(f.frente) + '</h3>' + (texto(f.motivo) ? '<p class="desc">' + md(f.motivo) + '</p>' : '') + '<div class="preco"><div class="pl">Verba sugerida</div><div class="pv">' + moeda(num(f.valor)) + '<small>/mês</small></div><div class="pi">' + selo(ff.status) + (texto(ff.fonte) ? ' ' + esc(ff.fonte) : '') + '</div></div></div>';
      }).join('') + '</div>' +
        '<div class="nota-inv"><strong>Total sugerido: ' + moeda(total) + ' por mês</strong>, pago direto ao Google, no cartão ' + vc.da_empresa + '. ' + md(texto(v.observacao) || 'A verba cresce por frente conforme os dados das campanhas comprovam retorno.') + '</div>';
    }
    if (temProj) {
      var fv = fato(p.verba) || {}, ft = fato(p.ticket) || {};
      html += '<div class="moldura-tabela rolagem" style="margin-top:20px"><table class="tabela"><thead><tr><th>Cenário</th><th>Contatos por mês</th><th>Conversão</th><th>' + (vc.setor === 'saude' ? 'Exames' : 'Vendas') + '</th><th>Faturamento estimado</th></tr></thead><tbody>' +
        lista(p.cenarios).map(function (c) {
          var r = projetar(num(p.verba), num(c.custo_contato), num(c.conversao), num(p.ticket));
          return '<tr><td>' + esc(c.nome) + '</td><td>' + inteiro(r.contatos) + ' (' + moeda(num(c.custo_contato)) + ' por contato)</td><td>' + inteiro(num(c.conversao) * 100) + '%</td><td>' + inteiro(r.exames) + '</td><td>' + moeda(r.faturamento) + ' · ' + decimal(r.retorno, 1) + '× a verba</td></tr>';
        }).join('') + '</tbody></table></div><p class="nota-fonte"><strong>Projeção estimada, não promessa.</strong> Verba de ' + moeda(num(p.verba)) + ' por mês (' + esc(fv.fonte || fv.status) + ') e ticket de ' + moeda(num(p.ticket)) + ' (' + esc(ft.fonte || ft.status) + '). Contatos = verba ÷ custo por contato; ' + (vc.setor === 'saude' ? 'exames' : 'vendas') + ' = contatos × conversão; faturamento = ' + (vc.setor === 'saude' ? 'exames' : 'vendas') + ' × ticket. ' + md(p.nota) + '</p>';
    }
    return '<section class="secao">' + rotulo('Conduta · verba') + '<h2>' + md(texto((v || {}).titulo) || 'Verba sugerida para os anúncios') + '</h2>' + (texto((v || {}).intro) ? '<p class="intro">' + md(v.intro) + '</p>' : '') + html + '</section>';
  }

  function perguntas(d, ctx) {
    var q = lista(d.perguntas_reuniao).slice(0, 8);
    if (!q.length) return '';
    return '<section class="secao">' + rotulo('Próximo passo') + '<h2>Para confirmar na reunião de onboarding</h2><p class="intro">O que ainda precisamos ' + ctx.vocab.da_empresa + ' para colocar as campanhas no ar.</p>' +
      '<div class="bloco"><ul class="lista-chave">' + q.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div></section>';
  }

  function conclusao(d, ctx) {
    var c = d.conclusao || {};
    var titulo = texto(c.titulo) || 'O diagnóstico está pronto. O próximo passo é a reunião de onboarding.';
    return '<div class="fechamento">' + faixa(ctx.vetadas) + '<div class="fech-corpo"><img src="' + ctx.ativos.logoNegativo + '" alt="' + ctx.vocab.marca_logo + '" style="height:54px;width:auto">' + ecg() + '<h2>' + md(titulo) + '</h2>' + (texto(c.texto) ? '<p>' + md(c.texto) + '</p>' : '') + '</div></div>';
  }

  // ---------------------------------------------------------------- montagem
  function fontesCss(ativos) {
    var f = '';
    if (ativos.fonte400) f += '@font-face{font-family:"Outfit";src:url(' + ativos.fonte400 + ') format("woff2");font-weight:400;font-style:normal;font-display:swap}';
    if (ativos.fonte700) f += '@font-face{font-family:"Outfit";src:url(' + ativos.fonte700 + ') format("woff2");font-weight:700;font-style:normal;font-display:swap}';
    return f;
  }

  /**
   * Monta o laudo. opcoes = { css, ativos: {logo, logoNegativo, fonte400, fonte700}, logoCliente, data }
   * Retorna { html, placar, validacao, travessoes_corrigidos }.
   */
  /** Texto em base64 (UTF-8), no navegador e no Node: carrega dados dentro de um comentário HTML sem quebrar a página. */
  function base64Utf8(t) {
    if (typeof Buffer !== 'undefined') return Buffer.from(String(t), 'utf8').toString('base64');
    return btoa(unescape(encodeURIComponent(String(t))));
  }
  /** Dados do diagnóstico que o robô 3 usa, embutidos no HTML: assim o arquivo baixado já serve de entrada (ADR-007). Nada da conversa comercial. */
  function dadosParaRobo3(d) {
    return { schema: 'w7-diagnostico-dados', versao_dados: d.versao_dados, cliente: d.cliente, lp_modelo: d.lp_modelo || null, termos: d.termos || null, raio: d.raio || null, verba: d.verba || null, restricoes: d.restricoes || null };
  }

  function gerarLaudo(dadosBrutos, opcoes) {
    opcoes = opcoes || {};
    var n = normalizar(dadosBrutos);
    var d = n.dados;
    var validacao = validarDados(d);
    if (validacao.erros.length) return { html: '', placar: null, validacao: validacao, travessoes_corrigidos: n.travessoes_corrigidos };
    var ativos = opcoes.ativos || {};
    var vocab = vocabDe(d);
    var saude = vocab.setor === 'saude';
    var ctx = {
      vocab: vocab,
      ativos: { logo: (saude ? ativos.logo : ativos.logoGeral || ativos.logo) || '', logoNegativo: (saude ? ativos.logoNegativo : ativos.logoGeralNegativo || ativos.logoNegativo) || ativos.logo || '' },
      logoCliente: DATA_IMG.test(opcoes.logoCliente || '') ? opcoes.logoCliente : '',
      vetadas: normalizarVetadas((d.restricoes || {}).cores_vetadas),
      data: texto(opcoes.data) || hoje(),
      dataIso: texto(opcoes.dataIso) || new Date().toISOString().slice(0, 10)
    };
    var placar = pontuar(d);
    var css = trocarCores(fontesCss(ativos) + (opcoes.css || ''), ctx.vetadas);
    var corpo = [cabecalho(d, ctx), '<main class="folha">', impressao(d, placar, ctx), ouvimos(d, ctx), tecnica(d, ctx), achados(d, placar, ctx), raio(d), termos(d, ctx), conduta(d) + modeloPagina(d, ctx), etapas(d), verba(d, ctx), perguntas(d, ctx), conclusao(d, ctx),
      '<p class="rodape">Diagnóstico gerado pelo <b>Motor de Diagnóstico ' + ctx.vocab.marca + '</b> v' + VERSAO + ' em ' + esc(ctx.data) + '. Cada dado traz origem e data; simulações e estimativas estão marcadas.</p>', '</main>'].join('\n');
    var corpoFinal = trocarCores(corpo, ctx.vetadas);
    var html = '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex, nofollow">\n' +
      '<meta name="w7-motor" content="' + VERSAO + '">\n<meta name="w7-cores-vetadas" content="' + esc(ctx.vetadas.join(',')) + '">\n' +
      '<title>Diagnóstico para Google Ads · ' + esc(d.cliente.nome) + ' · ' + ctx.vocab.marca + '</title>\n' +
      '<!-- Fonte Outfit, Copyright 2021 The Outfit Project Authors, SIL Open Font License 1.1 -->\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + corpoFinal + '\n<!-- w7-dados diagnostico ' + base64Utf8(JSON.stringify(dadosParaRobo3(d))) + ' -->\n</body>\n</html>\n';
    var v2 = validarHtml(html);
    validacao.ok = v2.ok;
    validacao.erros = validacao.erros.concat(v2.erros);
    validacao.avisos = validacao.avisos.concat(v2.avisos);
    if (ctx.vetadas.length) validacao.avisos.push('Cores vetadas (' + ctx.vetadas.join(', ') + ') trocadas no laudo. A logo oficial da ' + vocab.marca + ' mantém as cores originais.');
    return { html: html, placar: placar, validacao: validacao, travessoes_corrigidos: n.travessoes_corrigidos };
  }

  // ---------------------------------------------------------------- validação do HTML final (regras invioláveis)
  function validarHtml(html) {
    var erros = [], avisos = [], ok = [];
    var semEstilo = html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
    var visivel = semEstilo.replace(/<[^>]+>/g, ' ');
    if (/[–—]/.test(visivel)) erros.push('Regra 1: o laudo tem travessão.'); else ok.push('Sem travessão');
    if (/<meta name="viewport"/.test(html) && /<html lang="pt-BR"/.test(html)) ok.push('Celular e idioma configurados'); else erros.push('Falta meta viewport ou lang pt-BR.');
    var ext = [];
    if (/<link[^>]+href=["']https?:/i.test(html)) ext.push('<link> externo');
    if (/<script/i.test(html)) ext.push('script');
    if (/@import/i.test(html)) ext.push('@import');
    if (/url\(\s*["']?https?:/i.test(html)) ext.push('url(http)');
    if (/<iframe|<object|<embed/i.test(html)) ext.push('iframe ou objeto');
    if ((html.match(/<img[^>]+src="(?!data:)/g) || []).length) ext.push('imagem fora do arquivo');
    if (ext.length) erros.push('Recurso externo no laudo: ' + ext.join(', ') + '. O laudo precisa abrir offline.'); else ok.push('Abre offline (tudo embutido)');
    var etapasT = (html.match(/<div class="en">([^<]*)<\/div>/g) || []).map(function (x) { return x.replace(/<[^>]+>/g, ''); });
    if (etapasT.length === 3 && etapasT.every(function (x) { return /^Etapa\s*\d/.test(x); })) ok.push('Cronograma em 3 etapas'); else erros.push('Cronograma precisa de 3 etapas nomeadas "Etapa N".');
    if (/wa\.me\/|api\.whatsapp\.com/i.test(html)) erros.push('O laudo tem link de WhatsApp da equipe: o diagnóstico não leva contato pessoal.'); else ok.push('Sem contato pessoal da equipe');
    if (/class="plano"/.test(html)) { if (/pago direto ao Google/.test(visivel)) ok.push('Verba paga direto ao Google'); else erros.push('Verba sugerida sem a nota "pago direto ao Google".'); }
    var serps = (html.match(/class="serp"/g) || []).length, rots = (html.match(/class="serp-rot"/g) || []).length;
    if (serps && rots < serps) erros.push('Simulação de busca sem rótulo de data ou de ilustração.'); else if (serps) ok.push('Buscas rotuladas');
    var vet = ((html.match(/<meta name="w7-cores-vetadas" content="([^"]*)"/) || [])[1] || '').split(',').filter(Boolean);
    if (vet.length) {
      var ofens = coresNoTexto(html.replace(/data:[^"')]+/g, '')).filter(function (c) { return vet.indexOf(familiaDeCor(c)) >= 0; });
      if (ofens.length) erros.push('Regra 4: cor vetada (' + vet.join(', ') + ') ainda presente: ' + ofens.slice(0, 6).join(' ')); else ok.push('Zero ocorrências das cores vetadas');
    }
    var kb = html.length / 1024;
    if (kb > 3072) erros.push('Laudo acima de 3 MB (' + Math.round(kb) + ' KB).'); else ok.push('Tamanho ' + Math.round(kb) + ' KB');
    return { ok: ok, erros: erros, avisos: avisos };
  }

  var API = {
    VERSAO: VERSAO, PILARES: PILARES, ORDEM_PILARES: ORDEM_PILARES,
    extrairJson: extrairJson, normalizar: normalizar, validarDados: validarDados, pontuar: pontuar,
    avaliacoesParaNota: avaliacoesParaNota, alvosNota: alvosNota, projetar: projetar,
    familiaDeCor: familiaDeCor, trocarCores: trocarCores, base64Utf8: base64Utf8, gerarLaudo: gerarLaudo, validarHtml: validarHtml, slug: slug,
    VOCAB: VOCAB, urlModelo: urlModelo, svgRaio: svgRaio, chaveCidade: chaveCidade, vocabDe: vocabDe, comVocab: comVocab, itensDo: itensDo, regraVerba: regraVerba, verbaDiariaParaMensal: verbaDiariaParaMensal,
    VERBA_MINIMA_POR_PAGINA: VERBA_MINIMA_POR_PAGINA, MAX_PAGINAS: MAX_PAGINAS, esc: esc, md: md, moeda: moeda, decimal: decimal, inteiro: inteiro, ecg: ecg, faixa: faixa, fontesCss: fontesCss, pontuarPilar: pontuarPilar
  };
  raiz.MotorDiagnostico = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
