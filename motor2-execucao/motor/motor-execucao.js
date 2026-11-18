/* Robô 3 (Motor 2 ampliado) · núcleo puro (sem DOM, sem rede). ADR-007. Expõe globalThis.ExecucaoW7.
   Depende de MotorDiagnostico, OnboardingW7 e LpModeloW7 carregados antes.
   A IA escreve dados (ficha.json e plano.json); aqui eles são validados e viram documentos, campanhas e páginas.
   Regras de conteúdo: padrão de LP da Win7 (PADRAO-LP-WIN7.md); HERMES V11.3 como noção de estratégia; roteiro em 9 blocos
   com a abertura fixa. Nada de número inventado, nada de superlativo nem promessa (CFM 2.336/2023 e política de saúde do Google). */
(function (raiz) {
  'use strict';
  var M = raiz.MotorDiagnostico, O = raiz.OnboardingW7, L = raiz.LpModeloW7;
  if (!M || !O || !L) throw new Error('ExecucaoW7 precisa de MotorDiagnostico, OnboardingW7 e LpModeloW7 carregados antes.');
  var VERSAO = '1.0.0';
  var FICHA_SCHEMA = 'w7-ficha', PLANO_SCHEMA = 'w7-plano';
  var esc = M.esc;

  function texto(x) { return x === undefined || x === null ? '' : String(x).trim(); }
  function lista(x) { return Array.isArray(x) ? x : []; }
  function chave(s) { return texto(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  /** Texto normalizado para comparar falas: minúsculo, sem acento, só letras e números separados por espaço. */
  function norm(s) { return chave(s).replace(/[^a-z0-9]+/g, ' ').trim(); }
  function nPalavras(s) { var t = texto(s); return t ? t.split(/\s+/).length : 0; }
  function minusculaInicial(s) { return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function maiusculaInicial(s) { s = texto(s); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function digitos(t) { return texto(t).replace(/\D/g, ''); }
  function slug(s) { return M.slug(s); }

  // ---------------------------------------------------------------- regras fixas
  /** Ordem do roteiro (HERMES e o exemplo de ressonância da pasta do Viny) e o tempo de cada bloco, em segundos. */
  var ROTEIRO_TIPOS = ['abertura', 'dor', 'agravamento', 'servico', 'diferencial', 'diferencial', 'prova', 'cta', 'reforco'];
  var ROTULO_BLOCO = { abertura: 'Abertura', dor: 'Dor', agravamento: 'Agravamento', servico: 'Serviço', diferencial: 'Diferencial', prova: 'Prova e benefício', cta: 'Chamada para ação', reforco: 'Reforço' };
  var TEMPOS = [7, 6, 6, 6, 6, 6, 7, 7, 7];
  /** Fala por segundo: acima de 3 o locutor corre; acima de 3,4 não cabe no bloco. */
  var FALA_POR_SEGUNDO = { aviso: 3, erro: 3.4 };
  /** Proibido em copy, roteiro e anúncio: superlativo, promessa de resultado, antes e depois. */
  var PROIBIDAS = [
    [/\bmelhor(es)?\b/, '"melhor"'], [/\b(o|a|os|as) mais (complet|modern|barat|rapid|segur|precis|avancad)/, 'superlativo ("o mais ...")'],
    [/\bmais barat/, '"mais barato"'], [/garant/, 'garantia de resultado'], [/\b100 ?%/, '"100%"'], [/\bcura(r|m)?\b/, 'promessa de cura'],
    [/\bsem dor\b/, '"sem dor"'], [/\bnumero 1\b|\bn[o°º] ?1\b/, '"número 1"'], [/\blider(es)?\b/, '"líder"'], [/\bperfeit/, '"perfeito"'],
    [/\bmilagr/, '"milagre"'], [/\bdefinitiv/, '"definitivo"'], [/\bimbativel|\binsuperavel/, 'superlativo'], [/\bantes e depois\b/, '"antes e depois"']
  ];
  var STOP = ['de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'para', 'pra', 'com', 'e', 'a', 'o', 'as', 'os', 'um', 'uma', 'por', 'que', 'ao', 'aos'];
  /** Palavras de intenção: ajudam a relevância, mas não precisam estar escritas na página (cobertura parcial). */
  var MODIFICADORES = ['perto', 'mim', 'proximo', 'proxima', 'onde', 'fazer', 'faz', 'marcar', 'agendar', 'agendamento', 'valor', 'valores', 'preco', 'precos', 'quanto', 'custa', 'custo',
    'barato', 'particular', 'convenio', 'convenios', 'plano', 'planos', 'urgencia', 'urgente', '24h', 'hoje', 'aberto', 'horario', 'clinica', 'clinicas', 'laboratorio', 'exame', 'exames',
    'resultado', 'laudo', 'online', 'whatsapp', 'telefone', 'endereco', 'unimed', 'sus'];
  var INTENCOES = { geral: 'Serviço e cidade', preco: 'Preço e valor', convenio: 'Convênio', urgencia: 'Urgência', perto: 'Perto de mim', agendamento: 'Agendamento', marca: 'Nome da empresa' };
  var LIMITES = { titulo: 30, descricao: 90, caminho: 15, sitelink: 25, sitelink_desc: 35, frase: 25, title: 60 };

  function proibidas(t) {
    var n = ' ' + norm(t) + ' ', out = [];
    PROIBIDAS.forEach(function (p) { if (p[0].test(n)) out.push(p[1]); });
    return out;
  }
  function temTravessao(t) { return /[–—]/.test(texto(t)); }

  // ---------------------------------------------------------------- entrada em qualquer formato
  /** Dados embutidos por robôs 1 e 2 no HTML (comentário com base64). Devolve { tipo, dados } ou null. */
  function dadosEmbutidos(html) {
    var m = String(html || '').match(/<!-- w7-dados (diagnostico|mapa) ([A-Za-z0-9+\/=]+) -->/);
    if (!m) return null;
    try {
      var t = typeof Buffer !== 'undefined' ? Buffer.from(m[2], 'base64').toString('utf8') : decodeURIComponent(escape(atob(m[2])));
      return { tipo: m[1], dados: JSON.parse(t) };
    } catch (e) { return null; }
  }
  /** Papel de um JSON: mapa, diagnóstico, rascunho exportado da apresentação ou nada. */
  function classificarJson(j) {
    if (!j || typeof j !== 'object') return '';
    if (j.schema === 'w7-mapa-onboarding') return 'mapa';
    if (/^w7-(ficha|plano|campanhas)$/.test(j.schema || '')) return '';
    if (j.diagnostico && j.respostas) return 'rascunho';
    if (j.schema === 'w7-diagnostico-dados' || (j.cliente && (j.presenca || j.termos || j.impressao || j.raio))) return 'diagnostico';
    return '';
  }
  /** Papel de um documento pelo texto (PDF, DOCX, HTML, TXT): o que aparecer primeiro no começo decide. */
  function classificarTexto(t, nome) {
    if (/transcri|transcript/i.test(chave(nome))) return 'transcricao';
    // sem espaços: o PDF guarda títulos com letras espaçadas ("M A PA D O O N B OA R D I N G")
    var ini = norm(String(t || '').slice(0, 3000)).replace(/ /g, '');
    var marcas = [['mapa', ini.indexOf('mapadoonboarding')], ['diagnostico', ini.indexOf('diagnosticoparagoogleads')], ['transcricao', ini.indexOf('transcricao')], ['transcricao', ini.indexOf('transcript')]]
      .filter(function (x) { return x[1] >= 0; }).sort(function (a, b) { return a[1] - b[1]; });
    return marcas.length ? marcas[0][0] : 'texto';
  }

  // ---------------------------------------------------------------- ficha do cliente
  var CAMPOS_FATOS = {
    nome_publico: 'Nome na página', telefone: 'Telefone que recebe ligações', whatsapp: 'WhatsApp que recebe os contatos', endereco: 'Endereço',
    horario: 'Horário de atendimento', site: 'Site atual', rt: 'Responsável técnico (nome e CRM)', razao_social: 'Razão social', cnpj: 'CNPJ',
    email_privacidade: 'E-mail para pedidos sobre dados pessoais', selo: 'Selo do banner (ex.: anos de referência)'
  };
  var DO_MAPA = { nome: 'nome_publico', endereco: 'endereco', telefone: 'telefone', whatsapp: 'whatsapp', horario: 'horario', site: 'site', rt: 'rt', razao_social: 'razao_social', cnpj: 'cnpj', email_privacidade: 'email_privacidade' };

  /**
   * Rascunho da ficha a partir do que é certo: o Mapa do Onboarding (decidido na reunião) e o diagnóstico.
   * A IA completa com a transcrição (dores, diferenciais em detalhe, lista de convênios, selo), sempre com a fala citada.
   */
  function rascunhoFicha(diag, mapa) {
    var d = (mapa && mapa.decisoes) || {}, cli = (mapa && mapa.cliente) || {}, c = (diag && diag.cliente) || {};
    var nPag = Math.max(1, (d.verba || {}).paginas || 1);
    var principal = texto(d.pagina_principal) || lista(d.servicos)[0] || '';
    if (!principal && !mapa) principal = texto(((diag && diag.lp_modelo) || {}).servico) || lista(c.servicos_foco)[0] || '';
    var fonteServ = mapa ? lista(d.servicos) : lista(c.servicos_foco);
    var servs = [principal].concat(fonteServ.filter(function (s) { return chave(s) !== chave(principal); })).filter(Boolean).slice(0, mapa ? nPag : 1);
    var fatos = {};
    lista(d.dados_cliente).forEach(function (x) {
      var k = DO_MAPA[x.campo]; if (!k) return;
      var valor = texto(x.status === 'corrigir' ? x.correcao : x.valor);
      fatos[k] = { valor: valor, fonte: 'mapa', citacao: '', status: x.status === 'ok' && valor ? 'confirmado' : 'a_confirmar' };
    });
    Object.keys(CAMPOS_FATOS).forEach(function (k) { if (!fatos[k] && (k !== 'rt' || cli.setor !== 'geral')) fatos[k] = { valor: '', fonte: '', citacao: '', status: 'a_confirmar' }; });
    var dm = d.dominio || {};
    return {
      schema: FICHA_SCHEMA, versao: 1, gerado_em: new Date().toISOString(),
      cliente: { nome: texto(cli.nome || c.nome), slug: slug(cli.nome || c.nome), setor: cli.setor === 'geral' ? 'geral' : 'saude', cidade: texto(cli.cidade || c.cidade), uf: texto(cli.uf || c.uf), data_reuniao: texto(cli.data_reuniao) },
      paginas: servs.map(function (s, i) { return { servico: s, slug: i ? slug(s) : '', principal: i === 0 }; }),
      fatos: fatos,
      dores: [],
      diferenciais: lista(d.diferenciais).map(function (x) { return { texto: texto(x.rotulo) + (texto(x.detalhe) ? ': ' + texto(x.detalhe) : ''), fonte: 'mapa', citacao: '', status: 'confirmado' }; }),
      convenios: { situacao: texto((d.convenios || {}).situacao), lista: [], fonte: '', status: 'a_confirmar' },
      depoimentos: d.depoimentos || {},
      video: d.video_home || {},
      dominio: { modo: texto(dm.modo), escolhido: texto(dm.escolhido) },
      base_banner: ((d.base_banner || {}).n) || ((diag && diag.lp_modelo) || {}).base || 1,
      cores: ((diag && diag.lp_modelo) || {}).cores || null,
      cidades: lista((d.cidades || {}).atuar).map(function (x) { return typeof x === 'string' ? x : texto(x.nome); }).filter(Boolean),
      verba: { mensal: (d.verba || {}).mensal || null, paginas: (d.verba || {}).paginas || null },
      autorizacoes: { preco: false },
      publico: '',
      observacoes: []
    };
  }

  /**
   * Confere a ficha. Com a transcrição, toda citação precisa estar nela (contra fato inventado).
   * Devolve { erros, avisos, a_confirmar: [rótulos] }.
   */
  function validarFicha(f, transcricao) {
    var erros = [], avisos = [], aConf = [];
    var tn = transcricao ? ' ' + norm(transcricao) + ' ' : '';
    if (!f || f.schema !== FICHA_SCHEMA || f.versao !== 1) return { erros: ['Ficha com formato desconhecido (esperado w7-ficha versão 1).'], avisos: [], a_confirmar: [] };
    var c = f.cliente || {}, saude = c.setor !== 'geral';
    if (!texto(c.nome)) erros.push('Falta cliente.nome.');
    if (!texto(c.cidade)) erros.push('Falta cliente.cidade (a região vem do cliente, nunca inferida).');
    var pags = lista(f.paginas);
    if (!pags.length) erros.push('A ficha precisa de ao menos uma página.');
    if (pags.filter(function (p) { return p.principal; }).length !== 1) erros.push('Exatamente uma página principal.');
    var slugs = {};
    pags.forEach(function (p, i) {
      if (!texto(p.servico)) erros.push('Página ' + (i + 1) + ' sem serviço.');
      if (p.principal && texto(p.slug)) erros.push('A página principal fica na raiz do domínio (slug vazio).');
      if (!p.principal && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(texto(p.slug))) erros.push('Slug inválido na página de ' + texto(p.servico) + ': use letras minúsculas, números e hífen.');
      if (slugs[p.slug]) erros.push('Slug repetido: ' + p.slug + '.'); slugs[p.slug] = 1;
    });
    function conferirCitacao(rotulo, x) {
      if (!x || x.fonte !== 'transcricao') return;
      var ct = texto(x.citacao);
      if (nPalavras(ct) < 3) erros.push(rotulo + ': citação da transcrição com menos de 3 palavras.');
      else if (tn && tn.indexOf(' ' + norm(ct) + ' ') < 0) erros.push(rotulo + ': a citação "' + ct.slice(0, 60) + '" não está na transcrição.');
    }
    Object.keys(f.fatos || {}).forEach(function (k) {
      var x = f.fatos[k] || {};
      if (['confirmado', 'a_confirmar'].indexOf(x.status) < 0) erros.push('Fato ' + k + ' sem status (confirmado ou a_confirmar).');
      if (x.status === 'confirmado' && !texto(x.valor) && k !== 'selo') erros.push('Fato ' + k + ' confirmado sem valor.');
      conferirCitacao('Fato ' + (CAMPOS_FATOS[k] || k), x);
      if (x.status === 'a_confirmar') aConf.push(CAMPOS_FATOS[k] || k);
    });
    var fx = f.fatos || {};
    if (saude && !fx.rt) erros.push('Página de saúde: falta o fato rt (responsável técnico), mesmo que a confirmar.');
    // fixo com WhatsApp Business (10 dígitos) aceito por decisão do Viny em 04/11/2026 (cliente com telefone VoIP)
    if (fx.whatsapp && texto(fx.whatsapp.valor) && [10, 11].indexOf(digitos(fx.whatsapp.valor).length) < 0) erros.push('WhatsApp com DDD e número (celular com 9 dígitos ou fixo com WhatsApp Business).');
    if (fx.selo && fx.selo.status === 'confirmado' && texto(fx.selo.valor) && fx.selo.fonte !== 'transcricao' && fx.selo.fonte !== 'cliente') erros.push('Selo só com dado confirmado pelo cliente (fala citada ou enviado por ele).');
    lista(f.dores).forEach(function (x, i) { conferirCitacao('Dor ' + (i + 1), x); if (x.fonte !== 'transcricao') avisos.push('Dor ' + (i + 1) + ' sem fala da reunião: confira se é do cliente.'); });
    lista(f.diferenciais).forEach(function (x, i) { conferirCitacao('Diferencial ' + (i + 1), x); if (x.status === 'a_confirmar') aConf.push('Diferencial: ' + texto(x.texto)); });
    var cv = f.convenios || {};
    if (saude && cv.situacao === 'sim' && !lista(cv.lista).length) aConf.push('Lista completa de convênios');
    conferirCitacao('Convênios', cv);
    if (!lista(f.dores).length) avisos.push('Nenhuma dor registrada: o roteiro e o subtítulo ficam genéricos.');
    return { erros: erros, avisos: avisos, a_confirmar: aConf };
  }

  // ---------------------------------------------------------------- checklist para o grupo do WhatsApp
  /** Itens com dono e prazo: pendências do Mapa, fatos a confirmar e a lista fixa de onboarding que ainda falta. */
  function checklist(f, mapa, pasta) {
    pasta = pasta || {};
    var itens = [], vistos = {};
    function add(t, dono, prazo, interno) { var k = norm(t); if (vistos[k]) return; vistos[k] = 1; itens.push({ texto: t, dono: dono || 'Cliente', prazo: texto(prazo), interno: !!interno }); }
    function ja(re) { return itens.some(function (x) { return re.test(norm(x.texto)); }); }
    lista(mapa && mapa.pendencias).forEach(function (p) { add(texto(p.texto) + (texto(p.obs) ? ' (' + texto(p.obs) + ')' : ''), p.responsavel, p.prazo); });
    var saude = (f.cliente || {}).setor !== 'geral';
    Object.keys(f.fatos || {}).forEach(function (k) {
      var x = f.fatos[k]; if (!x || x.status !== 'a_confirmar' || k === 'selo' || k === 'site') return;
      add(texto(x.valor) ? 'Confirmar ' + minusculaInicial(CAMPOS_FATOS[k]) + ': ' + texto(x.valor) : 'Enviar ' + minusculaInicial(CAMPOS_FATOS[k]), 'Cliente', '');
    });
    if (!pasta.logo_vetorial) add('Enviar a logo em vetor (SVG, PDF ou AI)', 'Cliente', '');
    if (saude && (f.convenios || {}).situacao !== 'nao') { if (!lista((f.convenios || {}).lista).length) add('Enviar a lista completa de convênios', 'Cliente', ''); if (!pasta.logos_convenios) add('Enviar as logos dos convênios principais (até 10)', 'Cliente', ''); }
    if (!pasta.video && !ja(/video/)) add('Vídeo da página: gravar a partir do roteiro da Win7 ou enviar fotos para o vídeo com IA', 'Cliente', texto((f.video || {}).prazo));
    add('Autorização de uso de imagem de quem aparece nos vídeos', 'Cliente', '');
    add('Acesso ao Perfil da Empresa no Google (Google Meu Negócio) para a Win7', 'Cliente', '');
    add('Conta do Google Ads e do Google Tag Manager com acesso para a Win7', 'Cliente', '');
    if (texto((f.dominio || {}).escolhido) && !ja(/dominio/)) add('Domínio ' + f.dominio.escolhido + ': registrar e apontar os servidores DNS para a Cloudflare', 'Win7', '');
    add('Apontar os servidores DNS do domínio para a Cloudflare e publicar a página', 'Win7', '', true);
    add('Cadastro do formulário Win7 (IDs do cliente) e da conversão no Google Ads', 'Win7', '', true);
    return itens;
  }
  /** Mensagem pronta para colar no grupo, sem emoji, com dono e prazo; e a segunda, com as perguntas de confirmação. */
  function mensagemWhatsApp(f, itens) {
    var c = f.cliente || {};
    var m1 = '*Próximos passos · ' + texto(c.nome) + '*\nCombinado na reunião' + (texto(c.data_reuniao) ? ' de ' + c.data_reuniao : '') + '. Para colocar a página no ar, precisamos de:\n\n' +
      itens.filter(function (x) { return !x.interno; }).map(function (x, i) { return (i + 1) + '. ' + x.texto + ' · ' + x.dono + (x.prazo ? ' · até ' + x.prazo : ''); }).join('\n') +
      '\n\nQualquer dúvida, é só chamar aqui.';
    var perg = Object.keys(f.fatos || {}).filter(function (k) { var x = f.fatos[k]; return x && x.status === 'a_confirmar' && texto(x.valor); })
      .map(function (k) { return CAMPOS_FATOS[k] + ': ' + texto(f.fatos[k].valor) + '. Está certo?'; })
      .concat(lista(f.diferenciais).filter(function (x) { return x.status === 'a_confirmar'; }).map(function (x) { return 'Podemos dizer na página: "' + texto(x.texto) + '"?'; }));
    var m2 = perg.length ? '*Para confirmar*\n' + perg.map(function (p, i) { return (i + 1) + '. ' + p; }).join('\n') : '';
    return { principal: m1, confirmacoes: m2 };
  }

  // ---------------------------------------------------------------- plano: copy, roteiro e anúncios por página
  function aberturaEsperada(servico, cidade) { return 'Se você estava no google procurando por ' + minusculaInicial(texto(servico)) + ' em ' + texto(cidade) + ', você chegou ao lugar certo!'; }
  function palavrasDaPagina(p) {
    var vistas = {}, out = [];
    lista(p.grupos).forEach(function (g) { lista(g.palavras).forEach(function (k) { var n = norm(k); if (n && !vistas[n]) { vistas[n] = 1; out.push(texto(k).toLowerCase()); } }); });
    return out;
  }
  function textosDoPlano(p) {
    var c = p.copy || {}, t = [];
    ['title', 'description', 'subtitulo', 'cta', 'texto_whatsapp', 'legenda_video', 'conv_titulo', 'dep_titulo'].forEach(function (k) { if (c[k]) t.push(['copy.' + k, c[k]]); });
    lista(c.pontos).forEach(function (x, i) { t.push(['copy.pontos[' + i + ']', x]); });
    lista((p.roteiro || {}).blocos).forEach(function (b, i) { t.push(['roteiro bloco ' + (i + 1), b.fala]); });
    lista((p.anuncios || {}).titulos).forEach(function (x, i) { t.push(['título ' + (i + 1), x]); });
    lista((p.anuncios || {}).descricoes).forEach(function (x, i) { t.push(['descrição ' + (i + 1), x]); });
    lista(p.grupos).forEach(function (g) { lista(g.titulos).concat(lista(g.descricoes)).forEach(function (x) { t.push(['grupo ' + texto(g.intencao), x]); }); });
    return t;
  }

  /** Valida o plano contra a ficha. Erro bloqueia as entregas; aviso vai para o relatório. */
  function validarPlano(plano, f) {
    var erros = [], avisos = [];
    if (!plano || plano.schema !== PLANO_SCHEMA || plano.versao !== 1) return { erros: ['Plano com formato desconhecido (esperado w7-plano versão 1).'], avisos: [] };
    var c = f.cliente || {}, cidade = texto(c.cidade), uf = texto(c.uf), saude = c.setor !== 'geral';
    var pf = lista(f.paginas), pp = lista(plano.paginas);
    if (pp.length !== pf.length) erros.push('O plano tem ' + pp.length + ' página(s) e a ficha tem ' + pf.length + '.');
    var todas = {};
    pp.forEach(function (p, i) {
      var ref = pf[i] || {}, nome = 'Página ' + (i + 1) + ' (' + texto(p.servico) + ')', cp = p.copy || {};
      if (chave(p.servico) !== chave(ref.servico)) erros.push(nome + ': serviço diferente da ficha (' + texto(ref.servico) + ').');
      if (texto(p.slug) !== texto(ref.slug)) erros.push(nome + ': slug diferente da ficha.');
      // copy pelo padrão de LP da Win7
      if (!texto(cp.title)) erros.push(nome + ': falta o title.');
      else if (cp.title.length > LIMITES.title) erros.push(nome + ': title com ' + cp.title.length + ' caracteres (máximo 60).');
      else if (chave(cp.title).indexOf(chave(cidade)) < 0) avisos.push(nome + ': o title não cita ' + cidade + '.');
      var dl = texto(cp.description).length;
      if (!dl) erros.push(nome + ': falta a description.'); else if (dl < 110 || dl > 160) avisos.push(nome + ': description com ' + dl + ' caracteres (ideal 120 a 155).');
      if (!texto(cp.subtitulo)) erros.push(nome + ': falta o subtítulo.');
      else if (nPalavras(cp.subtitulo) > 20) erros.push(nome + ': subtítulo com ' + nPalavras(cp.subtitulo) + ' palavras (máximo 20).');
      if (lista(cp.pontos).length !== 3) erros.push(nome + ': são 3 pontos no banner (diferenciais confirmados).');
      lista(cp.pontos).forEach(function (x, k) { if (nPalavras(x) > 8) erros.push(nome + ': ponto ' + (k + 1) + ' com mais de 8 palavras.'); });
      if (!texto(cp.cta)) erros.push(nome + ': falta o botão (cta).');
      if (!texto(cp.texto_whatsapp)) erros.push(nome + ': falta a mensagem inicial do WhatsApp.');
      if (uf && new RegExp('\\b' + chave(uf) + '\\b').test(chave(cp.subtitulo))) avisos.push(nome + ': o subtítulo cita o estado; a região é só a cidade.');
      // roteiro
      var bl = lista((p.roteiro || {}).blocos);
      if (bl.length !== 9) erros.push(nome + ': o roteiro tem ' + bl.length + ' blocos (são 9: abertura, dor, agravamento, serviço, diferencial, diferencial, prova, CTA, reforço).');
      bl.forEach(function (b, k) {
        if (bl.length === 9 && b.tipo !== ROTEIRO_TIPOS[k]) erros.push(nome + ': bloco ' + (k + 1) + ' deveria ser "' + ROTULO_BLOCO[ROTEIRO_TIPOS[k]] + '".');
        var seg = TEMPOS[k] || 7, ps = nPalavras(b.fala) / seg;
        if (!texto(b.fala)) erros.push(nome + ': bloco ' + (k + 1) + ' sem fala.');
        else if (ps > FALA_POR_SEGUNDO.erro) erros.push(nome + ': bloco ' + (k + 1) + ' não cabe em ' + seg + ' segundos (' + nPalavras(b.fala) + ' palavras).');
        else if (ps > FALA_POR_SEGUNDO.aviso) avisos.push(nome + ': bloco ' + (k + 1) + ' corrido para ' + seg + ' segundos (' + nPalavras(b.fala) + ' palavras).');
      });
      if (bl[0] && norm(bl[0].fala) !== norm(aberturaEsperada(p.servico, cidade))) erros.push(nome + ': a abertura do vídeo é fixa: "' + aberturaEsperada(p.servico, cidade) + '"');
      if (bl[0] && uf && new RegExp('\\b' + chave(uf) + '\\b').test(chave(bl[0].fala))) erros.push(nome + ': a abertura não leva o estado.');
      if (bl[7] && !/whatsapp/.test(chave(bl[7].fala))) avisos.push(nome + ': o bloco de chamada não cita o WhatsApp.');
      if (bl[8] && chave(bl[8].fala).indexOf(chave(c.nome).split(' ')[0]) < 0) avisos.push(nome + ': o reforço não cita o nome ' + (saude ? 'da clínica' : 'da empresa') + '.');
      // anúncios e grupos (campanha padrão)
      var an = p.anuncios || {}, tit = lista(an.titulos), des = lista(an.descricoes);
      if (tit.length < 8 || tit.length > 15) erros.push(nome + ': anúncio com ' + tit.length + ' títulos (de 8 a 15).');
      if (des.length < 2 || des.length > 4) erros.push(nome + ': anúncio com ' + des.length + ' descrições (de 2 a 4).');
      var tvistos = {};
      tit.forEach(function (x) { if (x.length > LIMITES.titulo) erros.push(nome + ': título "' + x + '" com ' + x.length + ' caracteres (máximo 30).'); if (/!/.test(x)) erros.push(nome + ': título com exclamação não é aceito pelo Google: "' + x + '".'); if (tvistos[chave(x)]) erros.push(nome + ': título repetido "' + x + '".'); tvistos[chave(x)] = 1; });
      des.forEach(function (x) { if (x.length > LIMITES.descricao) erros.push(nome + ': descrição com ' + x.length + ' caracteres (máximo 90).'); });
      var gs = lista(p.grupos);
      if (!gs.some(function (g) { return g.intencao === 'geral'; })) erros.push(nome + ': falta o grupo "geral" (serviço e cidade).');
      gs.forEach(function (g) {
        if (!INTENCOES[g.intencao]) erros.push(nome + ': intenção desconhecida "' + texto(g.intencao) + '".');
        if (!lista(g.palavras).length) erros.push(nome + ': grupo ' + texto(g.intencao) + ' sem palavras-chave.');
        lista(g.titulos).forEach(function (x) { if (x.length > LIMITES.titulo) erros.push(nome + ': título "' + x + '" com ' + x.length + ' caracteres.'); });
        lista(g.descricoes).forEach(function (x) { if (x.length > LIMITES.descricao) erros.push(nome + ': descrição com ' + x.length + ' caracteres.'); });
        lista(g.palavras).forEach(function (k) {
          var t = texto(k);
          if (!/^[a-z0-9áéíóúâêôãõçà ]+$/.test(t)) erros.push(nome + ': palavra-chave "' + t + '" com símbolo ou maiúscula (a correspondência é definida pelo motor).');
          if (nPalavras(t) > 10 || t.length > 80) erros.push(nome + ': palavra-chave longa demais: "' + t + '".');
          var n = norm(t); if (todas[n] && todas[n] !== nome) avisos.push('Palavra-chave "' + t + '" em duas páginas: fica na ' + todas[n] + '.'); todas[n] = todas[n] || nome;
        });
      });
      var nk = palavrasDaPagina(p).length;
      if (nk < 5) erros.push(nome + ': só ' + nk + ' palavras-chave (mínimo 5).');
      if (nk > 60) avisos.push(nome + ': ' + nk + ' palavras-chave: a SKAG terá ' + nk + ' grupos.');
    });
    // extensões
    lista(plano.sitelinks).forEach(function (s) {
      if (texto(s.texto).length > LIMITES.sitelink) erros.push('Sitelink "' + s.texto + '" com mais de 25 caracteres.');
      [s.descricao1, s.descricao2].forEach(function (x) { if (texto(x).length > LIMITES.sitelink_desc) erros.push('Descrição de sitelink com mais de 35 caracteres: "' + x + '".'); });
    });
    lista(plano.frases).forEach(function (x) { if (texto(x).length > LIMITES.frase) erros.push('Frase de destaque com mais de 25 caracteres: "' + x + '".'); });
    // conteúdo proibido, travessão e preço
    pp.forEach(function (p) {
      textosDoPlano(p).forEach(function (t) {
        proibidas(t[1]).forEach(function (q) { erros.push(texto(p.servico) + ', ' + t[0] + ': ' + q + ' não pode (CFM e política de saúde do Google).'); });
        if (temTravessao(t[1])) erros.push(texto(p.servico) + ', ' + t[0] + ': sem travessão (use vírgula ou dois-pontos).');
        if (/R\$\s?\d/.test(t[1]) && !((f.autorizacoes || {}).preco)) erros.push(texto(p.servico) + ', ' + t[0] + ': preço só com autorização do cliente (autorizacoes.preco).');
      });
    });
    // área para clínicas parceiras (opcional, mesma trava de texto das páginas)
    var pc = plano.parceiros;
    if (pc) {
      if (!texto(pc.texto)) erros.push('Área de clínicas parceiras: falta o texto (parceiros.texto).');
      if (texto(pc.whatsapp) && [10, 11].indexOf(texto(pc.whatsapp).replace(/\D/g, '').length) < 0) erros.push('Área de clínicas parceiras: WhatsApp comercial com DDD e número.');
      ['selo', 'chamada', 'subtitulo', 'botao', 'titulo', 'texto', 'cta', 'texto_whatsapp'].map(function (k) { return pc[k]; }).concat(lista(pc.beneficios)).forEach(function (x) {
        proibidas(x).forEach(function (q) { erros.push('Área de clínicas parceiras: ' + q + ' não pode.'); });
        if (temTravessao(x)) erros.push('Área de clínicas parceiras: sem travessão.');
        if (/R\$\s?\d/.test(texto(x)) && !((f.autorizacoes || {}).preco)) erros.push('Área de clínicas parceiras: preço só com autorização do cliente.');
      });
    }
    return { erros: erros, avisos: avisos };
  }

  // ---------------------------------------------------------------- Google Ads: campanha padrão e SKAG
  function urlFinal(f, p) {
    var d = texto((f.dominio || {}).escolhido);
    return (d ? 'https://' + d : 'https://dominio-a-definir.com.br') + '/' + (texto(p.slug) ? p.slug + '/' : '');
  }
  function caminhos(p, cidade) { return [slug(p.servico).split('-')[0].slice(0, 15), slug(cidade).replace(/-/g, '').slice(0, 15)]; }
  function unir(a, b, max) { var v = {}, out = []; lista(a).concat(lista(b)).forEach(function (x) { var k = chave(x); if (texto(x) && !v[k]) { v[k] = 1; out.push(texto(x)); } }); return out.slice(0, max); }
  function tituloDaPalavra(k) { var t = texto(k).split(' ').map(function (w, i) { return i === 0 || ['de', 'da', 'do', 'em', 'e', 'para', 'com', 'no', 'na', 'perto', 'mim'].indexOf(w) < 0 ? maiusculaInicial(w) : w; }).join(' '); return t.length <= LIMITES.titulo ? t : ''; }

  /** As duas campanhas em JSON canônico. Nomes provisórios e tudo pausado: nome, negativas e ativação ficam com o gestor. */
  function campanhas(plano, f) {
    var cidade = texto((f.cliente || {}).cidade), mensal = (f.verba || {}).mensal || 0;
    var diario = mensal ? Math.round(mensal / 30.4 * 100) / 100 : null;
    var padrao = [], skag = [];
    lista(plano.paginas).forEach(function (p) {
      var url = urlFinal(f, p), cam = caminhos(p, cidade), an = p.anuncios || {};
      lista(p.grupos).forEach(function (g) {
        padrao.push({
          nome: texto(p.servico) + ' · ' + INTENCOES[g.intencao], pagina: texto(p.servico), intencao: g.intencao, url_final: url,
          palavras: lista(g.palavras).reduce(function (a, k) { return a.concat([{ texto: texto(k).toLowerCase(), tipo: 'Exata' }, { texto: texto(k).toLowerCase(), tipo: 'Frase' }]); }, []),
          anuncio: { titulos: unir(g.titulos, an.titulos, 15), descricoes: unir(g.descricoes, an.descricoes, 4), caminho1: cam[0], caminho2: cam[1] }
        });
      });
      palavrasDaPagina(p).forEach(function (k) {
        skag.push({
          nome: k, pagina: texto(p.servico), url_final: url,
          palavras: [{ texto: k, tipo: 'Exata' }, { texto: k, tipo: 'Frase' }],
          anuncio: { titulos: unir([tituloDaPalavra(k)], an.titulos, 15), descricoes: unir([], an.descricoes, 4), caminho1: cam[0], caminho2: cam[1] }
        });
      });
    });
    return {
      schema: 'w7-campanhas', versao: 1, cliente: texto((f.cliente || {}).nome),
      orcamento: { mensal: mensal || null, diario: diario, nota: 'As duas campanhas saem pausadas com o mesmo orçamento diário: o gestor ativa uma delas ou divide a verba.' },
      locais: { cidades: lista(f.cidades), nota: 'Segmentação geográfica: configurar no Editor ou na conta (cidades do Mapa do Onboarding).' },
      campanhas: [
        { nome: '[A DEFINIR] Pesquisa · Padrão', tipo: 'padrao', status: 'Pausada', grupos: padrao },
        { nome: '[A DEFINIR] Pesquisa · SKAG', tipo: 'skag', status: 'Pausada', grupos: skag }
      ],
      sitelinks: lista(plano.sitelinks), frases: lista(plano.frases)
    };
  }

  /** CSV para importar no Google Ads Editor (Conta › Importar › Do arquivo). Tudo pausado; sem lance nem local (ficam com o gestor). */
  function csvEditor(camp) {
    var cols = ['Campaign', 'Campaign Type', 'Networks', 'Budget', 'Budget type', 'Campaign Status', 'Ad Group', 'Ad Group Status', 'Keyword', 'Criterion Type', 'Status', 'Ad type'];
    for (var i = 1; i <= 15; i++) cols.push('Headline ' + i);
    for (var j = 1; j <= 4; j++) cols.push('Description ' + j);
    cols = cols.concat(['Path 1', 'Path 2', 'Final URL']);
    function linha(o) { return cols.map(function (k) { var v = o[k] === undefined || o[k] === null ? '' : String(o[k]); return '"' + v.replace(/"/g, '""') + '"'; }).join(','); }
    var out = [cols.map(function (k) { return '"' + k + '"'; }).join(',')];
    camp.campanhas.forEach(function (c) {
      out.push(linha({ Campaign: c.nome, 'Campaign Type': 'Search', Networks: 'Google search', Budget: camp.orcamento.diario ? camp.orcamento.diario.toFixed(2) : '', 'Budget type': 'Daily', 'Campaign Status': 'Paused' }));
      c.grupos.forEach(function (g) {
        out.push(linha({ Campaign: c.nome, 'Ad Group': g.nome, 'Ad Group Status': 'Enabled' }));
        g.palavras.forEach(function (k) { out.push(linha({ Campaign: c.nome, 'Ad Group': g.nome, Keyword: k.texto, 'Criterion Type': k.tipo === 'Exata' ? 'Exact' : 'Phrase', Status: 'Enabled' })); });
        var a = { Campaign: c.nome, 'Ad Group': g.nome, 'Ad type': 'Responsive search ad', Status: 'Enabled', 'Path 1': g.anuncio.caminho1, 'Path 2': g.anuncio.caminho2, 'Final URL': g.url_final };
        g.anuncio.titulos.forEach(function (t, i) { a['Headline ' + (i + 1)] = t; });
        g.anuncio.descricoes.forEach(function (t, i) { a['Description ' + (i + 1)] = t; });
        out.push(linha(a));
      });
    });
    return '﻿' + out.join('\r\n') + '\r\n';
  }

  // ---------------------------------------------------------------- cobertura das palavras-chave na página
  /** Texto que o visitante vê: sem head, script, style e pop-ups. */
  function textoVisivel(html) {
    return texto(String(html || '').replace(/<head[\s\S]*?<\/head>/i, ' ').replace(/<(script|style|dialog|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'));
  }
  function raiz_(w) { return w.length > 5 ? w.slice(0, w.length - 2) : w; }
  function cobre(w, palavrasPg) { var r = raiz_(w); return palavrasPg.some(function (p) { return p === w || p.indexOf(r) === 0 || raiz_(p) === r; }); }
  /** Por palavra-chave: coberta (todas as palavras na página), parcial (falta só intenção) ou não coberta (falta o núcleo). */
  function cobertura(plano, htmlPorSlug) {
    return lista(plano.paginas).map(function (p) {
      var pal = norm(textoVisivel(htmlPorSlug[texto(p.slug)] || '')).split(' ');
      var itens = palavrasDaPagina(p).map(function (k) {
        var ws = norm(k).split(' ').filter(function (w) { return w && STOP.indexOf(w) < 0; });
        var nucleo = ws.filter(function (w) { return MODIFICADORES.indexOf(w) < 0; }), mods = ws.filter(function (w) { return MODIFICADORES.indexOf(w) >= 0; });
        var faltaN = nucleo.filter(function (w) { return !cobre(w, pal); }), faltaM = mods.filter(function (w) { return !cobre(w, pal); });
        return { palavra: k, status: faltaN.length ? 'nao_coberta' : faltaM.length ? 'parcial' : 'coberta', falta: faltaN.concat(faltaM) };
      });
      var cob = itens.filter(function (x) { return x.status === 'coberta'; }).length;
      return { servico: texto(p.servico), slug: texto(p.slug), itens: itens, cobertas: cob, total: itens.length, nao_cobertas: itens.filter(function (x) { return x.status === 'nao_coberta'; }).length };
    });
  }

  // ---------------------------------------------------------------- política de privacidade (única, qualquer segmento)
  function politicaHtml(f, opcoes) {
    opcoes = opcoes || {};
    var c = f.cliente || {}, fx = f.fatos || {}, saude = c.setor !== 'geral', t = opcoes.paleta || L.paleta(f.cores).tokens;
    function v(k) { return texto((fx[k] || {}).valor); }
    var empresa = v('razao_social') || v('nome_publico') || c.nome, cnpj = v('cnpj'), email = v('email_privacidade'), end = v('endereco'), tel = v('telefone') || v('whatsapp');
    var ig = opcoes.integracoes || {}, medicao = texto(ig.gtm) || texto(ig.google_ads);
    var hoje = opcoes.data || new Date().toLocaleDateString('pt-BR');
    var raizSite = texto(opcoes.raiz) || '../';
    var sec = [
      ['Quem cuida dos seus dados', '<p>Esta página é de <strong>' + esc(empresa) + '</strong>' + (cnpj ? ', CNPJ ' + esc(cnpj) : '') + (end ? ', com endereço em ' + esc(end) : '') + '. A empresa é a controladora dos dados pessoais tratados aqui, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).</p>' +
        '<p>O site e a medição dos anúncios são operados pela Win7 Marketing Digital, que trata os dados apenas em nome ' + (saude ? 'da clínica' : 'da empresa') + ' e para as finalidades descritas abaixo.</p>'],
      ['Quais dados coletamos', '<ul><li><strong>Dados que você informa:</strong> nome e número de WhatsApp no formulário, e o que você escrever na conversa pelo WhatsApp ou ao telefone.</li>' +
        '<li><strong>Dados de navegação:</strong> páginas visitadas, origem da visita (por exemplo, o anúncio clicado), tipo de aparelho e navegador, e endereço IP aproximado, coletados por cookies e identificadores' + (medicao ? ' do Google (Google Tag Manager, Google Ads e, se ativo, Google Analytics)' : ' das ferramentas de medição, quando ativas') + '.</li></ul>'],
      ['Para que usamos', '<ul><li>Responder o seu contato e ' + (saude ? 'agendar o seu atendimento ou exame' : 'atender o seu pedido') + '.</li><li>Medir quais anúncios trazem contatos, para investir melhor a verba de publicidade.</li><li>Manter a segurança da página e prevenir fraudes.</li><li>Cumprir obrigações legais e regulatórias.</li></ul>'],
      ['Bases legais', '<p>Tratamos os dados para atender o seu pedido de contato e de agendamento (procedimentos preliminares a um contrato, art. 7º, V, da LGPD), por legítimo interesse na medição e na segurança da página (art. 7º, IX), para cumprir obrigações legais (art. 7º, II) e, quando a lei exigir, com o seu consentimento (art. 7º, I).</p>'],
      ['Com quem compartilhamos', '<p>Os dados são compartilhados apenas com quem nos ajuda a prestar o atendimento: a empresa de hospedagem do site, a Win7 Marketing Digital (operadora do site e da medição), o Google (ferramentas de anúncios e medição) e o WhatsApp, quando você inicia a conversa por lá. Não vendemos dados pessoais.</p>'],
      ['Por quanto tempo guardamos', '<p>Os dados de contato ficam guardados pelo tempo necessário para o atendimento e para cumprir prazos legais. Os dados de navegação seguem os prazos configurados em cada ferramenta de medição. Depois disso, são eliminados ou anonimizados.</p>'],
      ['Seus direitos', '<p>Você pode pedir, a qualquer momento: a confirmação de que tratamos seus dados, o acesso a eles, a correção de dados incompletos ou desatualizados, a anonimização, o bloqueio ou a eliminação de dados desnecessários, a portabilidade, informação sobre com quem compartilhamos, e a revogação do consentimento (art. 18 da LGPD). Também pode se opor a um tratamento feito sem consentimento.</p>' +
        '<p>Para exercer seus direitos, escreva para ' + (email ? '<strong>' + esc(email) + '</strong>' : 'o e-mail de contato') + (tel ? ' ou fale pelo telefone ' + esc(tel) : '') + '. Respondemos nos prazos da LGPD. Se não ficar satisfeito, você pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).</p>'],
      ['Cookies', '<p>Cookies são pequenos arquivos guardados no seu navegador. Usamos cookies de medição para saber de qual anúncio veio a visita. Você pode apagar ou bloquear cookies nas configurações do navegador; a página continua funcionando.</p>'],
      ['Segurança', '<p>Adotamos medidas técnicas e administrativas para proteger os dados contra acesso não autorizado, perda ou uso indevido, como conexão protegida (HTTPS) e acesso restrito às informações.</p>']
    ];
    if (saude) sec.splice(3, 0, ['Dados de saúde', '<p>O formulário desta página não pede dados de saúde. Se você nos enviar informações sobre exames, sintomas, pedidos médicos ou outros documentos de saúde, elas serão tratadas como dados pessoais sensíveis (art. 11 da LGPD): usadas apenas para o seu atendimento, com acesso restrito e sigilo profissional. Quando o atendimento for de criança ou adolescente, os dados devem ser informados pelo responsável.</p>']);
    sec.push(['Atualizações desta política', '<p>Esta política pode ser atualizada para refletir mudanças na lei ou nos nossos serviços. A data da última atualização aparece no início da página.</p>']);
    return '<!doctype html>\n<html lang="pt-BR">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>Política de privacidade · ' + esc(c.nome) + '</title>\n<meta name="robots" content="noindex, nofollow">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">\n' +
      '<style>:root{--marca:' + t.marca + ';--escura:' + t.marca_escura + ';--texto:' + t.texto + ';--linha:' + t.linha + '}*{box-sizing:border-box;margin:0}body{font-family:"Outfit",system-ui,sans-serif;color:#1d262b;line-height:1.6;background:#fff}' +
      '.wrap{width:min(820px,100% - 32px);margin-inline:auto}header{border-bottom:1px solid var(--linha)}header .wrap{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;padding-block:14px}header img{height:56px;width:auto;max-width:min(220px,60vw);object-fit:contain}main{overflow-wrap:anywhere}' +
      'header a.voltar{font-weight:600;color:var(--marca);text-underline-offset:3px}main{padding-block:36px 56px}h1{font-size:clamp(1.8rem,4vw,2.4rem);line-height:1.15;color:var(--escura)}.data{color:var(--texto);margin-top:6px}' +
      'h2{font-size:1.25rem;color:var(--escura);margin-top:30px}p,ul{margin-top:10px}ul{padding-left:20px}li{margin-top:6px}footer{background:var(--escura);color:rgba(255,255,255,.86);font-size:14px}footer .wrap{padding-block:18px}</style>\n</head>\n<body>\n' +
      '<header><div class="wrap"><a href="' + esc(raizSite) + '"><img src="' + esc(raizSite) + 'assets/' + esc(opcoes.logo || 'logo.png') + '" alt="' + esc(c.nome) + '"></a><a class="voltar" href="' + esc(raizSite) + '">Voltar para a página</a></div></header>\n' +
      '<main class="wrap"><h1>Política de privacidade</h1><p class="data">Atualizada em ' + esc(hoje) + '</p>\n' +
      sec.map(function (s) { return '<h2>' + s[0] + '</h2>\n' + s[1]; }).join('\n') + '\n</main>\n' +
      '<footer><div class="wrap">© ' + esc(texto(c.nome).toUpperCase()) + ' • Todos os direitos reservados • Criado por Win7.com.br</div></footer>\n</body>\n</html>\n';
  }

  // ---------------------------------------------------------------- página real (template da LP em modo real)
  /** Dados da página real de uma página do plano. pasta: { logo, video, poster, depoimentos, convenios_logos } (nomes em assets/). */
  function dadosPagina(f, plano, p, pasta, integracoes) {
    var fx = f.fatos || {}, c = f.cliente || {};
    function v(k) { return texto((fx[k] || {}).valor); }
    pasta = pasta || {};
    var logos = pasta.convenios_logos || {};
    var convs = lista((f.convenios || {}).lista).map(function (n) { return { nome: texto(n), logo: logos[norm(n)] || '' }; });
    var selo = fx.selo && fx.selo.status === 'confirmado' && texto(fx.selo.valor) ? (function () { var m = texto(fx.selo.valor).match(/^(\d+)\s+(.+)$/); return m ? { numero: m[1], texto: m[2] } : null; })() : null;
    return {
      v: { setor: c.setor === 'geral' ? 'geral' : 'saude', nome: v('nome_publico') || c.nome, cidade: c.cidade, uf: c.uf, servico: p.servico, servicos: lista(f.paginas).map(function (x) { return x.servico; }),
        telefone: v('telefone'), endereco: v('endereco'), nota: null, avaliacoes: null, logo: pasta.logo || '', cores: f.cores || null, base: f.base_banner || 1, rt: v('rt'), token: '' },
      real: {
        copy: p.copy, raiz: p.slug ? '../' : '', logo: pasta.logo || '', telefone: v('telefone'), whatsapp: v('whatsapp'), endereco: v('endereco'),
        // p.convenios === false: página sem a seção de convênios (ex.: página só do particular)
        rt: (fx.rt && fx.rt.status === 'confirmado') ? v('rt') : '', selo: selo, convenios: p.convenios === false ? [] : convs,
        depoimentos: lista(pasta.depoimentos), depoimentos_previstos: texto((f.depoimentos || {}).vai_enviar) === 'sim' || texto((f.depoimentos || {}).vai_gravar) === 'sim',
        parceiros: (plano && plano.parceiros) || null, como_chegar: !(plano && plano.como_chegar === false), video: pasta.video ? { arquivo: pasta.video, poster: pasta.poster || '', alt: texto((p.copy || {}).alt_poster) } : null,
        integracoes: integracoes || {}, identificacao: p.slug ? p.servico : '',
        atende: lista(f.cidades).filter(function (x) { return chave(x) !== chave(c.cidade); }).slice(0, 6)
      }
    };
  }

  // ---------------------------------------------------------------- documentos (HTML para PDF, identidade Win7 Med)
  function documento(titulo, subtitulo, corpo, opcoes) {
    opcoes = opcoes || {};
    var saude = opcoes.setor !== 'geral', a = opcoes.ativos || {};
    var logo = saude ? a.logoNegativo : a.logoGeralNegativo;
    var fontes = a.fonte400 ? '@font-face{font-family:"Outfit";src:url(' + a.fonte400 + ') format("woff2");font-weight:400}@font-face{font-family:"Outfit";src:url(' + a.fonte700 + ') format("woff2");font-weight:700}' : '';
    return '<!doctype html>\n<html lang="pt-BR">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(titulo) + '</title>\n<style>' + fontes + (opcoes.css || '') + '</style></head>\n<body class="doc">\n' +
      '<header class="doc-topo"><div class="faixa7"><i></i><i></i><i></i><i></i></div><div class="doc-topo-in">' + (logo ? '<img src="' + logo + '" alt="' + (saude ? 'Win7 Med' : 'Win7') + '">' : '<b>' + (saude ? 'Win7 Med' : 'Win7') + '</b>') +
      '<div><h1>' + esc(titulo) + '</h1>' + (subtitulo ? '<p>' + esc(subtitulo) + '</p>' : '') + '</div></div></header>\n<main class="doc-corpo">' + corpo + '</main>\n' +
      '<footer class="doc-rodape">' + (saude ? 'Win7 Med' : 'Win7') + ' · Cérebro, robô 3 · ' + esc(opcoes.data || new Date().toLocaleDateString('pt-BR')) + '</footer>\n</body>\n</html>\n';
  }
  function linhaFato(rot, x) {
    if (!x) return '';
    var st = x.status === 'confirmado' ? '<span class="st ok">confirmado</span>' : '<span class="st conf">a confirmar</span>';
    return '<tr><th>' + esc(rot) + '</th><td>' + (texto(x.valor) ? esc(x.valor) : '<em>falta</em>') + (x.citacao ? '<div class="cit">"' + esc(x.citacao) + '"</div>' : '') + '</td><td>' + st + '</td></tr>';
  }
  function docFicha(f, itens, msg, opcoes) {
    var c = f.cliente || {};
    var corpo = '<section><h2>Páginas</h2><ol class="pags">' + lista(f.paginas).map(function (p) { return '<li><strong>' + esc(p.servico) + ' em ' + esc(c.cidade) + '</strong> · ' + (p.principal ? 'página principal, na raiz' : '/' + esc(p.slug) + '/') + '</li>'; }).join('') + '</ol>' +
      '<p class="nota">Banner: base ' + esc(f.base_banner) + ' · ' + esc(O.BASES_BANNER[f.base_banner] || '') + (texto((f.dominio || {}).escolhido) ? ' · domínio ' + esc(f.dominio.escolhido) : (f.dominio || {}).modo === 'whatsapp' ? ' · domínio: aprovação no grupo' : '') + '</p></section>' +
      '<section><h2>Dados da página</h2><table class="fatos">' + Object.keys(CAMPOS_FATOS).map(function (k) { return linhaFato(CAMPOS_FATOS[k], (f.fatos || {})[k]); }).join('') + '</table></section>' +
      '<section><h2>Dores do ' + (c.setor === 'geral' ? 'cliente' : 'paciente') + '</h2>' + (lista(f.dores).length ? '<ul>' + f.dores.map(function (x) { return '<li>' + esc(x.texto) + (x.citacao ? '<div class="cit">"' + esc(x.citacao) + '"</div>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="nota">Nenhuma dor registrada.</p>') + '</section>' +
      '<section><h2>Diferenciais</h2><ul>' + lista(f.diferenciais).map(function (x) { return '<li>' + esc(x.texto) + (x.status === 'a_confirmar' ? ' <span class="st conf">a confirmar</span>' : '') + (x.citacao ? '<div class="cit">"' + esc(x.citacao) + '"</div>' : '') + '</li>'; }).join('') + '</ul></section>' +
      (c.setor !== 'geral' ? '<section><h2>Convênios</h2><p>' + (lista((f.convenios || {}).lista).length ? esc(f.convenios.lista.join(', ')) : '<em>Lista a receber do cliente.</em>') + '</p></section>' : '') +
      '<section class="quebra"><h2>Checklist para o grupo do WhatsApp</h2><table class="check"><tr><th>#</th><th>Item</th><th>Quem</th><th>Prazo</th></tr>' + itens.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.texto) + (x.interno ? ' <span class="st conf">interno</span>' : '') + '</td><td>' + esc(x.dono) + '</td><td>' + esc(x.prazo || 'a combinar') + '</td></tr>'; }).join('') + '</table>' +
      '<h3>Mensagem pronta</h3><pre class="msg">' + esc(msg.principal) + '</pre>' + (msg.confirmacoes ? '<h3>Segunda mensagem</h3><pre class="msg">' + esc(msg.confirmacoes) + '</pre>' : '') + '</section>';
    return documento('Ficha do cliente', texto(c.nome) + ' · ' + texto(c.cidade) + (c.uf ? '/' + c.uf : ''), corpo, opcoes);
  }
  function docCopy(f, p, opcoes) {
    var c = f.cliente || {}, cp = p.copy || {}, fx = f.fatos || {}, saude = c.setor !== 'geral';
    function v(k) { return texto((fx[k] || {}).valor); }
    function bloco(n, tit, html) { return '<section class="mod"><h2><span class="n">' + n + '</span>' + tit + '</h2>' + html + '</section>'; }
    var convs = p.convenios === false ? [] : lista((f.convenios || {}).lista), semConv = p.convenios === false;
    var pc = (opcoes || {}).parceiros;
    var corpo =
      bloco(1, 'Topo', '<dl><dt>Logo</dt><dd>Arquivo da pasta do cliente</dd><dt>Telefone para receber ligações</dt><dd>' + esc(v('telefone') || 'a confirmar') + '</dd><dt>WhatsApp</dt><dd>' + esc(v('whatsapp') || 'a confirmar') + '</dd>' + (saude ? '<dt>RT</dt><dd>' + esc(v('rt') || 'a confirmar') + '</dd>' : '') + '</dl>') +
      bloco(2, 'Banner', '<p class="h1">' + esc((p.servico + ' em ' + c.cidade).toUpperCase()) + '</p><p class="sub">' + esc(cp.subtitulo) + '</p><ul class="pontos">' + lista(cp.pontos).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<dl><dt>Vídeo</dt><dd>' + esc(cp.legenda_video || 'Conheça a nossa estrutura') + ' · roteiro no documento do vídeo</dd><dt>Botão</dt><dd>' + esc(texto(cp.cta).toUpperCase()) + '</dd><dt>Mensagem inicial do WhatsApp</dt><dd>' + esc(cp.texto_whatsapp) + '</dd><dt>Fundo do banner</dt><dd>Base ' + esc(f.base_banner) + ' · ' + esc(O.BASES_BANNER[f.base_banner] || '') + '</dd></dl>') +
      (!semConv && (saude ? convs.length || (f.convenios || {}).situacao !== 'nao' : convs.length) ? bloco(3, saude ? 'Convênios' : 'Parceiros', '<p class="t">' + esc(cp.conv_titulo || (saude ? 'Aceitamos os principais convênios' : 'Trabalhamos com os principais parceiros')) + '</p><p>' + (convs.length ? esc(convs.join(' · ')) : '<em>Lista a receber do cliente.</em>') + '</p><dl><dt>Botão</dt><dd>VER LISTA COMPLETA' + (convs.length ? ' (' + convs.length + ')' : '') + '</dd></dl>') : '') +
      bloco(4, 'Depoimentos', '<p class="t">' + esc(cp.dep_titulo || 'Depoimentos de ' + (saude ? 'pacientes' : 'clientes')) + '</p><p>Vídeos curtos do celular, enviados pelo cliente. Sem depoimento inventado' + (saude ? ', sem promessa de resultado e sem antes e depois' : '') + '.</p>') +
      bloco(5, 'Endereço', '<p>' + esc(v('endereco') || 'a confirmar') + '</p>' + ((opcoes || {}).como_chegar === false ? '' : '<dl><dt>Link</dt><dd>Como chegar (Google Maps)</dd></dl>') + '') +
      (pc ? bloco('5b', 'Clínicas parceiras', '<p class="t">' + esc(pc.chamada || 'É clínica ou médico e quer encaminhar pacientes?') + '</p><dl><dt>Botão</dt><dd>' + esc(texto(pc.botao || 'Área para clínicas parceiras').toUpperCase()) + '</dd><dt>Pop-up</dt><dd>' + esc(pc.titulo || 'Clínicas parceiras') + ': ' + esc(pc.texto) + '</dd>' +
        (lista(pc.beneficios).length ? '<dt>Benefícios</dt><dd>' + lista(pc.beneficios).map(esc).join(' · ') + '</dd>' : '<dt>Benefícios</dt><dd><em>A receber do cliente no grupo.</em></dd>') +
        '<dt>WhatsApp comercial</dt><dd>' + esc(pc.whatsapp || 'a receber (por enquanto, o WhatsApp da página)') + '</dd></dl>') : '') +
      bloco(6, 'Rodapé', '<p>© ' + esc(texto(v('nome_publico') || c.nome).toUpperCase()) + ' • Todos os direitos reservados • Política de privacidade • Criado por Win7.com.br</p><p>Símbolo padrão da Win7 no rodapé.</p>') +
      '<section class="mod seo"><h2><span class="n">SEO</span>Busca e anúncios</h2><dl><dt>Título da aba (title)</dt><dd>' + esc(cp.title) + '</dd><dt>Descrição (meta description)</dt><dd>' + esc(cp.description) + '</dd><dt>Endereço</dt><dd>' + esc(urlFinal(f, p)) + '</dd></dl>' +
      '<p class="t">Palavras-chave desta página</p><p class="kw">' + palavrasDaPagina(p).map(esc).join(' · ') + '</p></section>';
    return documento('Landing page formatada', texto(p.servico) + ' em ' + texto(c.cidade) + ' · ' + texto(c.nome), corpo, opcoes);
  }
  function docRoteiro(f, p, opcoes) {
    var c = f.cliente || {}, ini = 0;
    var corpo = '<p class="lead">Vídeo de 50 a 60 segundos para o topo da página. O roteiro é da Win7; ' + ((f.video || {}).opcao === 'ia' ? 'o vídeo é feito com IA a partir das fotos do cliente.' : 'o cliente grava no celular, na horizontal, com boa luz e sem música alta.') + '</p>' +
      lista((p.roteiro || {}).blocos).map(function (b, i) {
        var s = TEMPOS[i] || 7, de = ini; ini += s;
        return '<section class="bloco"><h2><span class="n">Bloco ' + String(i + 1).padStart(2, '0') + '</span>' + esc(ROTULO_BLOCO[b.tipo] || b.tipo) + ' <span class="tempo">' + de + ' a ' + ini + ' s</span></h2><p class="fala">"' + esc(b.fala) + '"</p>' + (texto(b.cena) ? '<p class="cena">Cena: ' + esc(b.cena) + '</p>' : '') + '</section>';
      }).join('') + '<p class="nota">Duração total: ' + ini + ' segundos. A primeira frase é fixa e não muda.</p>';
    return documento('Roteiro de vídeo', texto(p.servico) + ' em ' + texto(c.cidade) + ' · ' + texto(c.nome), corpo, opcoes);
  }
  function docAds(f, camp, cob, opcoes, plano) {
    var c = f.cliente || {}, moeda = function (x) { return x ? M.moeda(x) : 'a definir'; };
    var padrao = camp.campanhas[0], skag = camp.campanhas[1];
    var corpo = '<section><h2>Resumo</h2><table class="fatos"><tr><th>Verba mensal</th><td>' + moeda(camp.orcamento.mensal) + ' · cerca de ' + moeda(camp.orcamento.diario) + ' por dia</td></tr><tr><th>Campanhas</th><td>Pesquisa padrão (' + padrao.grupos.length + ' grupos) e SKAG (' + skag.grupos.length + ' grupos), pausadas</td></tr>' +
      '<tr><th>Correspondência</th><td>Só exata e frase. Nenhuma ampla.</td></tr><tr><th>Cidades</th><td>' + esc(lista(camp.locais.cidades).join(', ') || 'a definir') + '</td></tr><tr><th>Com o gestor</th><td>Nomes das campanhas, lista de negativas, estratégia de lance, locais na conta e ativação.</td></tr></table><p class="nota">' + esc(camp.orcamento.nota) + '</p></section>' +
      '<section><h2>Campanha padrão: grupos por intenção</h2>' + lista(plano.paginas).map(function (p) {
        var an = p.anuncios || {}, gs = padrao.grupos.filter(function (g) { return g.pagina === texto(p.servico); });
        return '<div class="pag-ads"><h3>' + esc(p.servico) + ' · <span class="url">' + esc(urlFinal(f, p)) + '</span></h3>' +
          '<div class="anuncio-base"><div><p class="t">Títulos do anúncio (até 30 caracteres)</p><ol class="tit">' + lista(an.titulos).map(function (t) { return '<li>' + esc(t) + ' <span class="cc">' + t.length + '</span></li>'; }).join('') + '</ol></div>' +
          '<div><p class="t">Descrições (até 90 caracteres)</p><ol class="des">' + lista(an.descricoes).map(function (t) { return '<li>' + esc(t) + ' <span class="cc">' + t.length + '</span></li>'; }).join('') + '</ol>' +
          '<p class="nota">Caminho exibido: /' + esc(gs[0] ? gs[0].anuncio.caminho1 : '') + '/' + esc(gs[0] ? gs[0].anuncio.caminho2 : '') + '</p></div></div>' +
          '<table class="check grupos"><tr><th>Grupo</th><th>Palavras-chave (exata e frase)</th><th>Texto próprio do grupo</th></tr>' + lista(p.grupos).map(function (g) {
            return '<tr><td>' + esc(INTENCOES[g.intencao] || g.intencao) + '</td><td>' + lista(g.palavras).map(esc).join('<br>') + '</td><td>' + lista(g.titulos).concat(lista(g.descricoes)).map(esc).join('<br>') + '</td></tr>';
          }).join('') + '</table></div>';
      }).join('') + '<p class="nota">No CSV do Editor, cada grupo leva o anúncio completo: os textos próprios do grupo primeiro, depois os da página (até 15 títulos e 4 descrições).</p></section>' +
      '<section><h2>SKAG: um termo por grupo</h2><table class="check"><tr><th>Grupo e palavra-chave</th><th>Página</th><th>Título 1</th></tr>' + skag.grupos.map(function (g) { return '<tr><td>' + esc(g.nome) + '</td><td>' + esc(g.pagina) + '</td><td>' + esc(g.anuncio.titulos[0]) + '</td></tr>'; }).join('') + '</table></section>' +
      (lista(camp.sitelinks).length || lista(camp.frases).length ? '<section><h2>Extensões</h2>' + (lista(camp.sitelinks).length ? '<table class="check"><tr><th>Sitelink</th><th>Descrição 1</th><th>Descrição 2</th></tr>' + camp.sitelinks.map(function (s) { return '<tr><td>' + esc(s.texto) + '</td><td>' + esc(s.descricao1) + '</td><td>' + esc(s.descricao2) + '</td></tr>'; }).join('') + '</table>' : '') + (lista(camp.frases).length ? '<p class="kw">Frases de destaque: ' + camp.frases.map(esc).join(' · ') + '</p>' : '') + '</section>' : '') +
      '<section class="quebra"><h2>Cobertura das palavras-chave na página</h2><p class="nota">Índice de Qualidade: a palavra-chave (ou a raiz dela) precisa estar no texto visível da página. "Parcial" = falta só a palavra de intenção (preço, perto, agendar).</p>' + cob.map(function (pg) {
        return '<h3>' + esc(pg.servico) + ' · ' + pg.cobertas + ' de ' + pg.total + ' cobertas' + (pg.nao_cobertas ? ' · ' + pg.nao_cobertas + ' sem cobertura' : '') + '</h3><table class="check"><tr><th>Palavra-chave</th><th>Situação</th><th>Falta na página</th></tr>' +
          pg.itens.map(function (x) { return '<tr><td>' + esc(x.palavra) + '</td><td><span class="st ' + (x.status === 'coberta' ? 'ok' : x.status === 'parcial' ? 'conf' : 'nao') + '">' + ({ coberta: 'coberta', parcial: 'parcial', nao_coberta: 'sem cobertura' })[x.status] + '</span></td><td>' + esc(x.falta.join(', ')) + '</td></tr>'; }).join('') + '</table>';
      }).join('') + '</section>';
    return documento('Planejamento de Google Ads', texto(c.nome) + ' · ' + texto(c.cidade), corpo, opcoes);
  }

  raiz.ExecucaoW7 = {
    VERSAO: VERSAO, FICHA_SCHEMA: FICHA_SCHEMA, PLANO_SCHEMA: PLANO_SCHEMA, ROTEIRO_TIPOS: ROTEIRO_TIPOS, ROTULO_BLOCO: ROTULO_BLOCO, TEMPOS: TEMPOS,
    INTENCOES: INTENCOES, LIMITES: LIMITES, CAMPOS_FATOS: CAMPOS_FATOS, MODIFICADORES: MODIFICADORES,
    norm: norm, proibidas: proibidas, dadosEmbutidos: dadosEmbutidos, classificarJson: classificarJson, classificarTexto: classificarTexto, rascunhoFicha: rascunhoFicha, validarFicha: validarFicha, checklist: checklist, mensagemWhatsApp: mensagemWhatsApp,
    aberturaEsperada: aberturaEsperada, palavrasDaPagina: palavrasDaPagina, validarPlano: validarPlano, campanhas: campanhas, csvEditor: csvEditor,
    textoVisivel: textoVisivel, cobertura: cobertura, politicaHtml: politicaHtml, dadosPagina: dadosPagina, urlFinal: urlFinal,
    documento: documento, docFicha: docFicha, docCopy: docCopy, docRoteiro: docRoteiro, docAds: docAds
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
