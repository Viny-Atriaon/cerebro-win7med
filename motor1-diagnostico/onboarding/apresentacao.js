/* Apresentação do onboarding · interface (navegador). Depende de MotorDiagnostico e OnboardingW7.
   Abre em tela cheia sobre o Gerador: OnboardingDeck.abrir(diagnostico, { ativos, cssLaudo }).
   Salva cada resposta neste aparelho (localStorage), recupera ao reabrir, exporta e importa rascunho,
   e gera o Mapa do Onboarding (HTML para o cliente + JSON para o próximo motor). Uma pessoa preenche por vez.
   No start.win7.ai (opcoes.sistema, ADR-008) cada resposta e o Mapa também vão para o projeto salvo no sistema. */
(function () {
  'use strict';
  var M = window.MotorDiagnostico, O = window.OnboardingW7;
  var esc = M.esc, md = M.md, moeda = M.moeda;
  var st = { diag: null, r: null, slides: [], i: 0, dir: 1, ativos: {}, cssLaudo: '', logoCliente: '', notas: false, gaveta: false, chave: '', timer: null, tAnima: null, mapa: null, el: null, ajuste: false, sistema: null, tSistema: null, enviando: false, denovo: false };
  var MOVIMENTO = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------------------------------------------------------------- utilidades
  function num(x) { var n = parseFloat(String(x === null || x === undefined ? '' : x).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; }
  function obter(caminho) { return caminho.split('.').reduce(function (o, k) { return o === null || o === undefined ? undefined : o[k]; }, st.r); }
  function definir(caminho, valor) {
    var partes = caminho.split('.'), o = st.r;
    for (var i = 0; i < partes.length - 1; i++) { if (o[partes[i]] === null || typeof o[partes[i]] !== 'object') o[partes[i]] = {}; o = o[partes[i]]; }
    o[partes[partes.length - 1]] = valor;
    if (!st.r.data_reuniao) st.r.data_reuniao = new Date().toLocaleDateString('pt-BR');
    salvar();
  }
  function hora() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function rotuloSalvo(texto, erro) { var el = st.el && st.el.querySelector('.dk-salvo'); if (el) { el.textContent = texto; el.className = 'dk-salvo' + (erro ? ' erro' : ''); } }
  function salvarJa() {
    clearTimeout(st.timer); st.timer = null;
    st.r.atualizado_em = new Date().toISOString();
    var local = true;
    try { localStorage.setItem(st.chave, JSON.stringify({ diagnostico: st.diag, respostas: st.r })); } catch (e) { local = false; }
    if (st.sistema) { enviarAoSistema(false); return; }
    rotuloSalvo(local ? 'Salvo neste aparelho às ' + hora() : 'Não salvou neste navegador: exporte o rascunho', !local);
  }
  function salvar() { clearTimeout(st.timer); st.timer = setTimeout(salvarJa, 250); }
  // ---- sistema do start: uma gravação por vez, a última resposta sempre vence, nova tentativa se a conexão cair
  function enviarAoSistema(imediato) {
    clearTimeout(st.tSistema);
    rotuloSalvo('Salvando no sistema...', false);
    st.tSistema = setTimeout(despachar, imediato ? 0 : 1200);
  }
  function despachar(urgente) {
    var sis = st.sistema; if (!sis) return;
    clearTimeout(st.tSistema); st.tSistema = null;
    if (st.enviando && !urgente) { st.denovo = true; return; }
    st.enviando = true; st.denovo = false;
    sis.salvarRespostas(JSON.parse(JSON.stringify(st.r)), urgente === true).then(function () {
      st.enviando = false; if (st.sistema !== sis) return;
      if (st.denovo) { despachar(); return; }
      rotuloSalvo('Salvo no sistema às ' + hora(), false);
    }, function (e) {
      st.enviando = false; if (st.sistema !== sis) return;
      var definitivo = e && (e.status === 400 || e.status === 404 || e.status === 413);
      rotuloSalvo(definitivo ? 'Não salvou no sistema: exporte o rascunho' : 'Sem conexão com o sistema: tentando de novo', true);
      if (!definitivo) st.tSistema = setTimeout(despachar, 8000);
    });
  }
  /** Antes de sair (Sair, fechar a aba): grava o que ainda estiver na fila. */
  function gravarPendente(urgente) {
    if (st.timer) salvarJa();
    if (st.sistema && (st.tSistema || st.denovo)) despachar(urgente);
  }
  window.addEventListener('pagehide', function () { if (st.el && st.r) gravarPendente(true); });
  function baixar(nome, conteudo, tipo) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo })); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function toast(t) {
    st.el.querySelectorAll('.dk-toast').forEach(function (x) { x.remove(); });
    var el = document.createElement('div'); el.className = 'dk-toast'; el.setAttribute('role', 'status'); el.textContent = t; st.el.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }
  function seg(campo, opcoes, atual) {
    return '<div class="dk-seg" role="group">' + opcoes.map(function (o) { return '<button type="button" data-campo="' + campo + '" data-valor="' + o[0] + '" aria-pressed="' + (atual === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
  }
  function entrada(campo, rotulo, valor, dica) { return '<label class="dk-campo">' + esc(rotulo) + '<input type="text" data-campo="' + campo + '" value="' + esc(valor === null || valor === undefined ? '' : valor) + '"' + (dica ? ' placeholder="' + esc(dica) + '"' : '') + ' autocomplete="off"></label>'; }
  /** Data com máscara dd/mm, conferida contra a reunião: inválida, passada, ou além de 7 dias úteis (pede justificativa). */
  function entradaData(campo, rotulo) {
    return '<div class="dk-data" data-wrap="' + campo + '"><label class="dk-campo">' + esc(rotulo) + '<input type="text" inputmode="numeric" data-campo="' + campo + '" data-mascara="data" value="' + esc(obter(campo) || '') + '" placeholder="dd/mm" maxlength="10" autocomplete="off"></label><div class="dk-data-info">' + infoData(campo) + '</div></div>';
  }
  function infoData(campo) {
    var v = String(obter(campo) || ''), c = O.checarPrazo(v, O.dataBase(st.r));
    if (v.length < 5) return '<p class="dk-dica">Até 7 dias úteis: ' + c.limite + '.</p>';
    if (c.invalida) return '<p class="dk-erro">Data inválida. Use dd/mm.</p>';
    if (c.passado) return '<p class="dk-erro">' + c.data + ' já passou.</p>';
    if (c.alem) return '<p class="dk-alerta">Além de 7 dias úteis (limite ' + c.limite + '). Escreva o motivo:</p><label class="dk-campo dk-just"><span class="sr">Justificativa do prazo</span><textarea rows="2" data-campo="' + campo + '_justificativa" placeholder="Por que o prazo maior">' + esc(obter(campo + '_justificativa') || '') + '</textarea></label>';
    return '<p class="dk-ok">' + c.data + ', dentro dos 7 dias úteis.</p>';
  }
  function entradaCnpj(campo, valor) { return '<label class="dk-campo"><input type="text" inputmode="numeric" data-campo="' + campo + '" data-mascara="cnpj" value="' + esc(valor || '') + '" placeholder="00.000.000/0000-00" maxlength="18" autocomplete="off"></label>'; }
  function entradaTel(campo, rotulo, valor) { return '<label class="dk-campo">' + esc(rotulo) + '<input type="tel" inputmode="tel" data-campo="' + campo + '" data-mascara="tel" value="' + esc(valor || '') + '" placeholder="(DDD) 99999-9999" maxlength="15" autocomplete="off"></label>'; }
  function marcar(campo, rotulo, valor) { return '<label class="dk-check' + (valor ? ' marcado' : '') + '"><input type="checkbox" data-campo="' + campo + '"' + (valor ? ' checked' : '') + '>' + esc(rotulo) + '</label>'; }
  function cabec(s) { return '<div class="dk-rot">' + (s.numero ? '<span class="num">Pergunta ' + s.numero + '</span>' : '') + esc(rotuloTipo(s)) + '</div><h2>' + esc(s.titulo) + '</h2>'; }
  function rotuloTipo(s) { return ({ capa: '', agenda: 'Roteiro', ouvimos: 'Diagnóstico', placar: 'Diagnóstico', busca: 'Diagnóstico', site: 'Diagnóstico', pagina: 'Recomendação', gmn: 'Diagnóstico', pergunta: 'Decisão', fim: 'Fechamento' })[s.tipo] || ''; }
  function ecg() { return '<svg class="dk-ecg" viewBox="0 0 1000 46" preserveAspectRatio="none" aria-hidden="true"><path class="coracao" d="M14 22c-4-6-12-4-12 2 0 5 7 9 12 14 5-5 12-9 12-14 0-6-8-8-12-2z"/><path class="base" d="M30 30H700l14 5 14-31 16 40 12-20 10 6H1000"/><path class="luz" pathLength="1000" d="M30 30H700l14 5 14-31 16 40 12-20 10 6H1000"/></svg>'; }
  /** Faixa de batimento em todos os slides: a análise da Win7 Med acontecendo (traço contínuo e coração pulsando). */
  function faixaPulso() {
    var d = 'M0 17';
    [170, 570, 970].forEach(function (b) { d += ' H' + b + ' l7 -4 l7 4 H' + (b + 26) + ' l5 4 l9 -17 l10 22 l8 -12 l5 3'; });
    d += ' H1200';
    return '<div class="dk-pulso" aria-hidden="true"><svg class="bate" viewBox="0 0 26 24"><path d="M13 22C6 16 1 12 1 7a5.5 5.5 0 0 1 12-2 5.5 5.5 0 0 1 12 2c0 5-5 9-12 15z"/></svg>' +
      '<svg class="traco" viewBox="0 0 1200 30" preserveAspectRatio="none"><path class="base" d="' + d + '"/><path class="luz" pathLength="1000" d="' + d + '"/></svg></div>';
  }
  function vocab() { return M.vocabDe(st.diag); }
  function logo() { var v = vocab(); return v.setor === 'saude' ? st.ativos.logo : (st.ativos.logoGeral || st.ativos.logo); }
  function placar() { return M.pontuar(st.diag); }
  function oportunidades(chave) {
    var pp = M.pontuarPilar(chave, st.diag);
    return { op: pp.itens.filter(function (i) { return i.valor === 'nao' || i.valor === 'parcial'; }), ok: pp.itens.filter(function (i) { return i.valor === 'sim'; }), pontos: pp.pontos };
  }
  function listaItens(itens, cls) { return itens.length ? '<ul class="dk-lista ' + cls + '">' + itens.map(function (i) { return '<li>' + esc(i.texto) + (i.evidencia ? '<br><span style="font-size:13.5px;color:var(--apagado)">' + md(i.evidencia) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="dk-lead">Nada aqui.</p>'; }

  // ---------------------------------------------------------------- slides de leitura (diagnóstico)
  var R = {};
  R.capa = function () {
    var c = st.diag.cliente || {}, v = vocab();
    var data = c.data_reuniao || new Date().toLocaleDateString('pt-BR');
    var trilha = st.slides.filter(function (x) { return x.curto; }).map(function (x) { return '<li>' + esc(x.curto) + '</li>'; }).join('');
    return '<div class="dk-capa"><div class="logos"><img class="logo" src="' + logo() + '" alt="' + v.marca_logo + '">' +
      (st.logoCliente ? '<span class="sep" aria-hidden="true"></span><img class="cli" src="' + st.logoCliente + '" alt="' + esc(c.nome) + '">' : '') + '</div>' +
      '<div class="dk-rot">Onboarding · Plano de Google Ads</div><h1>' + esc(c.nome) + '</h1>' +
      '<p class="sub">Hoje: a verba, o que encontramos no Google, a página que vai receber os anúncios e as decisões para as campanhas irem ao ar.</p>' + ecg() +
      '<div class="meta"><span>' + esc(c.cidade) + '/' + esc(c.uf) + '</span><span>Reunião de ' + esc(data) + '</span><span>' + v.marca + '</span></div>' +
      (trilha ? '<ol class="dk-trilha">' + trilha + '</ol>' : '') + '</div>';
  };
  R.agenda = function (s) {
    var qs = st.slides.filter(function (x) { return x.numero; });
    return cabec(s) + '<p class="dk-lead">Primeiro o diagnóstico, depois ' + qs.length + ' decisões rápidas. Tudo fica registrado aqui na tela.</p><ol class="dk-agenda">' +
      '<li>Diagnóstico: onde estão as oportunidades</li>' + qs.map(function (x) { return '<li>' + esc(x.titulo) + '</li>'; }).join('') + '<li class="final">Mapa do Onboarding com tudo o que combinamos</li></ol>';
  };
  R.ouvimos = function (s) {
    var o = st.diag.ouvimos || {};
    return cabec(s) + '<div class="dk-grade">' + (o.dores || []).slice(0, 4).map(function (x) { return '<div class="dk-cartao dor"><h3>' + esc(x.titulo) + '</h3><p>' + md(x.texto) + '</p></div>'; }).join('') +
      (o.trunfos || []).slice(0, 3).map(function (x) { return '<div class="dk-cartao destaque"><h3>' + esc(x.titulo) + '</h3><p>' + md(x.texto) + '</p></div>'; }).join('') + '</div>';
  };
  R.placar = function (s) {
    var p = placar(), im = st.diag.impressao || {}, g = p.geral, arco = Math.PI * 80, off = g === null ? arco : arco * (1 - g / 100);
    var gauge = '<div class="dk-gauge"><div class="rot">Prontidão para Google Ads</div><svg viewBox="0 0 200 120" role="img" aria-label="' + (g === null ? 'sem dados' : g + ' de 100') + '"><path class="fundo" d="M20 104a80 80 0 0 1 160 0"/><path class="arco ' + p.nivel + '" d="M20 104a80 80 0 0 1 160 0" stroke-dasharray="' + arco.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" style="--arco:' + arco.toFixed(1) + '"/><text class="valor" x="100" y="98" text-anchor="middle"' + (g === null ? '' : ' data-conta="' + g + '"') + '>' + (g === null ? 's/d' : g) + '</text><text class="de" x="100" y="116" text-anchor="middle">de 100</text></svg><div class="cls">' + esc(p.classe.nome) + '</div><div class="rot">' + esc(p.classe.leitura) + '</div></div>';
    var barras = '<div class="dk-pilares">' + p.pilares.map(function (pp) { var n = pp.pontos === null ? 'na' : pp.pontos >= 70 ? 'bom' : pp.pontos >= 45 ? 'atencao' : 'critico'; return '<div class="dk-pilar"><span>' + esc(pp.nome) + '</span><span class="t"><span class="e ' + n + '" style="width:' + (pp.pontos || 0) + '%"></span></span><span class="p">' + (pp.pontos === null ? 'n/a' : pp.pontos) + '</span></div>'; }).join('') + '</div>';
    return cabec(s) + (im.frase ? '<p class="dk-lead">' + md(im.frase) + '</p>' : '') + '<div class="dk-placar">' + gauge + '<div>' + barras +
      '<div class="dk-grade">' + ((im.achados_principais || []).length ? '<div class="dk-cartao"><h3>O que mais pesa hoje</h3><ul class="dk-lista">' + im.achados_principais.slice(0, 3).map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div>' : '') +
      ((im.ganhos_rapidos || []).length ? '<div class="dk-cartao"><h3>Ajustes antes de anunciar</h3><ul class="dk-lista ok">' + im.ganhos_rapidos.slice(0, 3).map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div>' : '') + '</div></div></div>';
  };
  R.busca = function (s) {
    var b = (st.diag.presenca || {}).busca || {}, o = oportunidades('busca');
    var serps = (b.consultas || []).slice(0, 2).map(function (c) {
      return '<div class="dk-serp"><div class="barra">' + esc(c.termo) + '</div>' + (c.resultados || []).map(function (r) {
        var tipo = ({ patrocinado: 'Patrocinado', organico: 'Resultado orgânico', mapa: 'Mapa', diretorio: 'Diretório' })[r.tipo] || esc(r.tipo);
        return '<div class="it' + (r.cliente ? ' cliente' : r.ausente ? ' ausente' : '') + '"><div class="tp">' + tipo + (r.ausente ? ' · ' + esc(r.marca || 'não aparece') : '') + '</div><div class="tt">' + esc(r.titulo) + '</div><div class="ds">' + md(r.descricao || '') + '</div></div>';
      }).join('') + '<div class="rodape">' + (c.observado_em ? 'Observado em ' + esc(c.observado_em) : 'Simulação ilustrativa') + '</div></div>';
    }).join('');
    return cabec(s) + '<div class="dk-grade">' + serps + '</div><div class="dk-grade dk-sec"><div class="dk-cartao"><h3>Oportunidades</h3>' + listaItens(o.op, 'op') + '</div><div class="dk-cartao"><h3>O que já funciona</h3>' + listaItens(o.ok, 'ok') + '</div></div>';
  };
  R.site = function (s) {
    var site = (st.diag.presenca || {}).site || {}, o = oportunidades('site');
    return cabec(s) + (site.url ? '<p class="dk-lead">' + esc(site.url) + '</p>' : '') + '<div class="dk-grade"><div class="dk-cartao"><h3>Oportunidades</h3>' + listaItens(o.op, 'op') + '</div><div class="dk-cartao"><h3>O que já funciona</h3>' + listaItens(o.ok, 'ok') + '</div></div>';
  };
  function iPrincipal() { var i = -1; st.r.servicos.some(function (x, k) { if (x.principal) { i = k; return true; } return false; }); return i < 0 ? 0 : i; }
  /** Domínio da página: escolher uma sugestão agora, ou mandar as sugestões no grupo e esperar a aprovação. */
  function cartaoDominio() {
    var dm = st.r.dominio || { modo: null, escolhido: '', sugestoes: [] };
    var rot = { disponivel: 'livre', registrado: 'já registrado', invalido: 'inválido' };
    var lista_ = (dm.sugestoes || []).map(function (x) {
      var esc_ = dm.modo === 'escolhido' && dm.escolhido === x.dominio, verif = !!rot[x.status];
      return '<div class="dk-dom-linha"><button type="button" class="dk-dom' + (esc_ ? ' escolhido' : '') + (verif ? ' ' + x.status : ' sugestivo') + '" data-acao="escolher-dominio" data-d="' + esc(x.dominio) + '" aria-pressed="' + esc_ + '"><span class="d">' + esc(x.dominio).replace(/\./g, '<wbr>.') + '</span><span class="st">' + (verif ? esc(rot[x.status]) : 'sugestivo') + '</span></button>' +
        (verif ? '' : '<a class="dk-conferir" href="https://registro.br/busca-dominio/?fqdn=' + encodeURIComponent(x.dominio) + '" target="_blank" rel="noopener" title="Abre a busca do Registro.br">Conferir</a>') + '</div>';
    }).join('');
    return '<div class="dk-cartao dk-sec dk-dominio"><h3>Domínio da página</h3><p class="dk-ajuda">Sugestões para os anúncios e as campanhas. Escolha uma agora ou combine de sugerir no grupo do WhatsApp.</p>' +
      seg('dominio.modo', [['escolhido', 'Escolher agora'], ['whatsapp', 'Sugerir no WhatsApp']], dm.modo) +
      (lista_ ? '<div class="dk-doms">' + lista_ + '</div>' : '') +
      (function () { var conf = (dm.sugestoes || []).filter(function (x) { return rot[x.status] && x.conferido_em; })[0]; return conf ? '<p class="dk-dica">Livre ou registrado: conferido no Registro.br em ' + esc(conf.conferido_em.split('-').reverse().join('/')) + '. Sugestivo: ainda não conferido.</p>' : '<p class="dk-dica">Sugestivo: ainda não conferido no Registro.br. Use "Conferir" antes de decidir.</p>'; })() +
      '<div class="dk-linha"><label class="dk-campo">Outro domínio<input type="text" id="dk-novo-dominio" placeholder="ex.: ' + esc(((dm.sugestoes || [])[0] || {}).dominio || 'nomedaclinica.com.br') + '" autocomplete="off" spellcheck="false"></label><button type="button" class="dk-btn" data-acao="add-dominio">Incluir</button></div>' +
      (dm.modo === 'whatsapp' ? '<p class="dk-ajuda">A Win7 manda estas sugestões no grupo; a página vai ao ar quando ' + vocab().a_empresa + ' aprovar uma.</p>' : '') + '</div>';
  }
  /** Copia para a área de transferência; se o navegador recusar, mostra o texto selecionado para copiar à mão. */
  function copiarTexto(t, aviso) {
    function manual() {
      var caixa = document.createElement('textarea'); caixa.value = t; caixa.setAttribute('readonly', ''); caixa.className = 'dk-copia';
      st.el.appendChild(caixa); caixa.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (ok) { caixa.remove(); toast(aviso); } else { toast('Selecione o texto e copie (Ctrl+C).'); setTimeout(function () { caixa.remove(); }, 20000); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast(aviso); }, manual); else manual();
  }
  /** Botões do fundo do banner (1 Órbitas, 2 Ondas, 3 Varredura): trocam o modelo ao vivo. */
  function basesHtml() {
    var nb = st.r.lp_base || 1;
    return '<div class="dk-bases" role="group" aria-label="Fundo do banner"><span>Fundo do banner</span>' + [1, 2, 3].map(function (n) { return '<button type="button" data-acao="base" data-n="' + n + '" aria-pressed="' + (nb === n) + '">' + n + ' · ' + esc(O.BASES_BANNER[n]) + '</button>'; }).join('') + '</div>';
  }
  /**
   * LP modelo montada aqui mesmo quando o bloco não traz lp_modelo.url (colado direto no Gerador):
   * logo do passo 3, cores do bloco ou tiradas da logo, mídia base da Win7 no site dos modelos. Nada é enviado a servidor.
   */
  function modeloLocal(nb) {
    var L = window.LpModeloW7, lp = (window.W7 || {}).lp;
    if (!L || !lp || !lp.modelo) return '';
    var lm = st.diag.lp_modelo || {}, cores = lm.cores || null;
    if (!cores && st.coresLogo && st.coresLogo.length) cores = L.paletaDaLogo(st.coresLogo, (st.diag.restricoes || {}).cores_vetadas || []);
    var chave = [nb, st.logoCliente.length, JSON.stringify(cores)].join('|');
    if (st.lpLocal && st.lpLocal.chave === chave) return st.lpLocal.html;
    try {
      var v = L.variaveis(st.diag, { logo: st.logoCliente ? 'logo.png' : '', cores: cores, base: nb });
      var r = L.montar(v, { modelo: lp.modelo, base: lp.base, midia: {}, wa: lp.wa });
      if (!r.html) return '';
      var html = st.logoCliente ? r.html.split('src="logo.png"').join('src="' + st.logoCliente + '"') : r.html;
      st.lpLocal = { chave: chave, html: html };
      return html;
    } catch (e) { return ''; }
  }
  /** Cores principais da logo (canvas): a mesma regra do cores_logo.py, para o modelo sair com a identidade do cliente. */
  function lerCoresLogo(uri, pronto) {
    if (!uri || !window.LpModeloW7) { pronto([]); return; }
    var img = new Image();
    img.onload = function () {
      try {
        var k = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
        pronto(window.LpModeloW7.coresDosPixels(cx.getImageData(0, 0, w, h).data));
      } catch (e) { pronto([]); }
    };
    img.onerror = function () { pronto([]); };
    img.src = uri;
  }
  function htmlModeloAtual() { return modeloLocal(st.r.lp_base || 1); }
  R.pagina = function (s) {
    var u = M.urlModelo(st.diag), nb = st.r.lp_base || 1, local = u ? '' : htmlModeloAtual(), tem = !!(u || local), v = vocab(), c = st.diag.cliente || {}, ip = iPrincipal(), sv = st.r.servicos[ip] || { nome: v.servico, confirmado: false };
    var conv = v.setor === 'saude' ? 'convênios' : 'parceiros';
    var frente = ((st.diag.verba || {}).frentes || []).filter(function (f) { return M.chaveCidade(f.frente) === M.chaveCidade(sv.nome); })[0];
    var esquerda = '<p class="dk-lead">Recomendamos começar pela página de <strong>' + esc(sv.nome) + ' em ' + esc(c.cidade || '') + '</strong>' + (frente && frente.motivo ? ': ' + md(frente.motivo) : '.') + '</p>' +
      '<div class="dk-cartao"><h3>O que a página já traz</h3><ul class="dk-lista"><li>Logo, ' + v.servico + ' e cidade no título, igual à busca do ' + v.cliente_final + '</li><li>WhatsApp no topo, no botão e na barra fixa</li><li>Lugar do vídeo, dos ' + conv + ' e dos depoimentos</li></ul></div>' +
      '<div class="dk-cartao dk-sec"><h3>O que vem ' + v.da_empresa + '</h3><ul class="dk-lista op"><li>Vídeo de apresentação (ou roteiro, ou IA)</li><li>Lista de ' + (v.setor === 'saude' ? 'convênios' : 'parceiros e formas de pagamento') + '</li><li>Depoimentos em vídeo</li></ul></div>' +
      cartaoDominio() +
      '<div class="dk-gerado"><button type="button" class="dk-btn' + (sv.confirmado ? '' : ' primario') + ' dk-grande" data-acao="confirmar-principal" aria-pressed="' + !!sv.confirmado + '">' + (sv.confirmado ? 'Página principal confirmada' : 'Confirmar como página principal') + '</button>' +
      (u ? '<a class="dk-btn dk-grande" data-modelo-link href="' + esc(u + '#base' + nb) + '" target="_blank" rel="noopener">Abrir o modelo em tela cheia</a>' : local ? '<button type="button" class="dk-btn dk-grande" data-acao="modelo-tela-cheia">Abrir o modelo em tela cheia</button>' : '') + '</div>' + (tem ? '<div class="dk-bases-cel">' + basesHtml() + '</div>' : '');
    var bases = tem ? basesHtml() : '';
    var quadro = u ? '<iframe src="' + esc(u + '#base' + nb) + '" title="Modelo da página de ' + esc(sv.nome) + '" loading="lazy"></iframe>' : '<iframe data-local title="Modelo da página de ' + esc(sv.nome) + '" srcdoc="' + esc(local) + '"></iframe>';
    var direita = tem ? '<div class="dk-celular">' + quadro + '</div>' + bases + '<p class="dk-legenda">Modelo para aprovação: vídeo, ' + conv + ' e depoimentos são exemplos.</p>' : '';
    return cabec(s) + '<div class="dk-recomenda' + (tem ? '' : ' sem-modelo') + '"><div>' + esquerda + '</div>' + (direita ? '<div class="dk-recomenda-modelo">' + direita + '</div>' : '') + '</div>';
  };
  function cartaoGmn() {
    var g = (st.diag.presenca || {}).google; if (!g) return '';
    var o = oportunidades('google');
    var nota = typeof (g.nota || {}).valor === 'number' ? g.nota.valor : (typeof g.nota === 'number' ? g.nota : null);
    var av = typeof (g.avaliacoes || {}).valor === 'number' ? g.avaliacoes.valor : (typeof g.avaliacoes === 'number' ? g.avaliacoes : null);
    var alvos = nota !== null ? M.alvosNota(nota) : [];
    return '<div class="dk-cartao dk-gmn"><h3>Perfil no Google Meu Negócio' + (o.pontos !== null ? ' · ' + o.pontos + ' de 100' : '') + '</h3>' +
      (nota !== null && av !== null ? '<div class="dk-nota"><span class="n" data-conta="' + nota + '" data-casas="1">' + M.decimal(nota, 1) + '</span><span class="e">' + '★★★★★'.slice(0, Math.round(nota)) + '</span><span>' + M.inteiro(av) + ' avaliações</span></div>' +
        (alvos.length ? '<div class="dk-metas">' + alvos.slice(0, 1).map(function (a) { var x = M.avaliacoesParaNota(av, nota, a); return '<div><b data-conta="' + x + '" data-prefixo="+">+' + M.inteiro(x) + '</b>avaliações 5 estrelas para chegar a ' + M.decimal(a, 1) + '</div>'; }).join('') + '</div>' : '') : '') +
      (o.op.length ? '<ul class="dk-lista op dk-sec">' + o.op.slice(0, 3).map(function (i) { return '<li>' + esc(i.texto) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  R.gmn = function (s) {
    var g = (st.diag.presenca || {}).google || {}, o = oportunidades('google');
    var nota = typeof (g.nota || {}).valor === 'number' ? g.nota.valor : (typeof g.nota === 'number' ? g.nota : null);
    var av = typeof (g.avaliacoes || {}).valor === 'number' ? g.avaliacoes.valor : (typeof g.avaliacoes === 'number' ? g.avaliacoes : null);
    var topo = '';
    if (nota !== null && av !== null) {
      var alvos = M.alvosNota(nota);
      topo = '<div class="dk-cartao"><div class="dk-nota"><span class="n">' + M.decimal(nota, 1) + '</span><span class="e">' + '★★★★★'.slice(0, Math.round(nota)) + '</span><span>' + M.inteiro(av) + ' avaliações</span></div>' +
        (alvos.length ? '<div class="dk-metas">' + alvos.map(function (a) { var x = M.avaliacoesParaNota(av, nota, a); return '<div><b>+' + M.inteiro(x) + '</b>avaliações 5 estrelas para chegar a ' + M.decimal(a, 1) + '</div>'; }).join('') + '</div>' : '<p class="dk-lead">Nota de excelência: o trabalho é manter o ritmo de avaliações.</p>') + '</div>';
    }
    return cabec(s) + topo + '<div class="dk-grade dk-sec"><div class="dk-cartao"><h3>Oportunidades</h3>' + listaItens(o.op, 'op') + '</div><div class="dk-cartao"><h3>O que já funciona</h3>' + listaItens(o.ok, 'ok') + '</div></div>';
  };

  // ---------------------------------------------------------------- perguntas (preenchidas ao vivo)
  function calcVerbaHtml() {
    var vb = O.calcularVerba(st.r), v = vocab(), diaria = st.r.verba.modo === 'diaria';
    if (!(vb.mensal > 0)) return '<div class="dk-calc"><div class="small">Informe a verba para ver quantas páginas ela comporta.</div><div class="small">Regra da Win7: uma página e campanha a cada ' + moeda(vb.minimo) + ' por mês (cerca de ' + moeda(vb.minimo_dia) + ' por dia), até ' + vb.maximo + '.</div></div>';
    var origem = diaria ? moeda(vb.mensal / 30) + ' por dia × 30 dias = ' + moeda(vb.mensal) + ' por mês' : moeda(vb.mensal) + ' por mês · cerca de ' + moeda(vb.mensal / 30) + ' por dia';
    if (vb.abaixo_do_minimo) return '<div class="dk-calc alerta"><div class="small">' + origem + '</div><div class="big">Abaixo do mínimo</div><div class="small">Menos de ' + moeda(vb.minimo) + ' por mês não comporta uma página com dados suficientes. Converse sobre ajustar a verba.</div></div>';
    return '<div class="dk-calc"><div class="small">' + origem + '</div><div class="big"><span data-conta="' + vb.paginas + '">' + vb.paginas + '</span> página' + (vb.paginas > 1 ? 's' : '') + ' e campanha' + (vb.paginas > 1 ? 's' : '') + '</div><div class="small">cerca de ' + moeda(vb.por_pagina_dia) + ' por dia em cada ' + v.servico + (vb.paginas === vb.maximo && vb.mensal > vb.minimo * vb.maximo ? ' · começamos com o máximo de ' + vb.maximo + ' e reforçamos a verba de cada uma' : '') + '</div></div>';
  }
  R.verba = function (s) {
    var vbr = st.r.verba, v = vocab();
    var sug = vbr.sugestao_mensal ? '<p class="dk-lead">Sugestão do diagnóstico: ' + moeda(vbr.sugestao_mensal) + ' por mês.</p>' : '';
    var campos = vbr.modo === 'diaria'
      ? '<div class="dk-linha">' + entrada('verba.por_dia', 'Verba por dia no Google (R$)', vbr.por_dia, 'ex.: 100') + '</div>'
      : '<div class="dk-linha">' + entrada('verba.mensal', 'Verba mensal total no Google (R$)', vbr.mensal, 'ex.: 3.000') + '</div>';
    return cabec(s) + '<p class="dk-lead">A verba é paga direto ao Google, no cartão ' + v.da_empresa + ', separada do contrato da Win7.</p>' + sug +
      seg('verba.modo', [['mensal', 'Valor por mês'], ['diaria', 'Valor por dia']], vbr.modo) + campos + '<div class="dk-sec" id="dk-calc">' + calcVerbaHtml() + '</div>';
  };
  R.servicos = function (s) {
    var vb = O.calcularVerba(st.r), v = vocab(), ip = iPrincipal(), sel = st.r.servicos.filter(function (x) { return x.confirmado; }).length;
    var info = vb.paginas > 0 ? 'A verba comporta ' + vb.paginas + (vb.paginas > 1 ? ' páginas' : ' página') + ': a principal' + (vb.paginas > 1 ? ' e mais ' + (vb.paginas - 1) : ' e nenhuma outra por agora') + '. Marcadas: ' + sel + '.' : 'Defina a verba na pergunta 1 para saber quantas páginas cabem agora. Marcadas: ' + sel + '.';
    var ordem = st.r.servicos.map(function (x, i) { return i; }).sort(function (a, b) { return (a === ip ? -1 : b === ip ? 1 : a - b); });
    var linhas = ordem.map(function (i) {
      var x = st.r.servicos[i], principal = i === ip;
      return '<div class="dk-serv' + (principal ? ' principal' : '') + (x.confirmado ? ' marcado' : '') + '">' +
        '<label class="nome"><input type="checkbox" data-campo="servicos.' + i + '.confirmado"' + (x.confirmado ? ' checked' : '') + '><span>' + esc(x.nome) + (x.sugerido ? '' : ' <small>incluído na reunião</small>') + '</span></label>' +
        (principal ? '<span class="dk-selo-principal">Página principal</span>' : '<button type="button" class="dk-btn" data-acao="principal" data-i="' + i + '">Tornar principal</button>') +
        '<button type="button" class="dk-btn dk-excluir" data-acao="excluir-servico" data-i="' + i + '" aria-label="Excluir ' + esc(x.nome) + '">Excluir</button></div>';
    }).join('');
    return cabec(s) + '<p class="dk-lead"><strong>' + esc(info) + '</strong></p>' +
      '<div class="dk-servs">' + (linhas || '<p class="dk-lead">Nenhum ' + v.servico + ' na lista. Inclua abaixo.</p>') + '</div>' +
      (vb.paginas > 0 && sel > vb.paginas ? '<p class="dk-aviso">' + sel + ' marcados para ' + vb.paginas + (vb.paginas > 1 ? ' páginas' : ' página') + ': os excedentes entram na próxima etapa ou a verba precisa subir.</p>' : '') +
      '<div class="dk-linha"><label class="dk-campo">Incluir outro ' + v.servico + '<input type="text" id="dk-novo-servico" placeholder="nome do ' + v.servico + '" autocomplete="off"></label><button type="button" class="dk-btn" data-acao="add-servico">Incluir</button></div>';
  };
  R.diferenciais = function (s) {
    var d = st.r.diferenciais, v = vocab(), trunfos = ((st.diag.ouvimos || {}).trunfos || []);
    function classe(tem) { return 'dk-dif' + (tem === 'sim' ? ' sim' : tem === 'nao' ? ' nao' : ''); }
    function linha(k, titulo, ajuda, rotDetalhe, dica) {
      var tem = d[k].tem;
      return '<div class="' + classe(tem) + '"><div class="txt"><b>' + esc(titulo) + '</b><span>' + esc(ajuda) + '</span></div>' + seg('diferenciais.' + k + '.tem', [['sim', 'Tem'], ['nao', 'Não tem']], tem) +
        (tem === 'sim' ? '<div class="det">' + entrada('diferenciais.' + k + '.detalhe', rotDetalhe, d[k].detalhe, dica) + '</div>' : '') + '</div>';
    }
    var p = d.parcelamento;
    var formas = [['pix', 'Pix'], ['cartao_credito', 'Crédito'], ['cartao_debito', 'Débito'], ['boleto', 'Boleto'], ['dinheiro', 'Dinheiro']];
    var marcados = ['estacionamento', 'equipamento', 'exclusivo', 'horario'].filter(function (k) { return d[k].tem === 'sim'; }).length + (p.tem === 'sim' ? 1 : 0) + (formas.some(function (f) { return d.pagamento[f[0]]; }) ? 1 : 0);
    var pagamento = '<div class="' + classe(p.tem) + '"><div class="txt"><b>Parcelamento</b><span>Parcela no cartão? Em quantas vezes?</span></div>' + seg('diferenciais.parcelamento.tem', [['sim', 'Parcela'], ['nao', 'Não parcela']], p.tem) +
      (p.tem === 'sim' ? '<div class="det dk-linha">' + entrada('diferenciais.parcelamento.vezes', 'Em até quantas vezes', p.vezes, 'ex.: 12') + entrada('diferenciais.parcelamento.sem_juros', 'Quantas sem juros', p.sem_juros, 'ex.: 6') + '</div>' : '') + '</div>' +
      '<div class="dk-dif"><div class="txt"><b>Formas de pagamento</b><span>Toque nas que ' + v.a_empresa + ' aceita</span></div><div class="dk-chips-sel">' +
      formas.map(function (f) { return '<button type="button" class="dk-chip" data-alterna="diferenciais.pagamento.' + f[0] + '" aria-pressed="' + !!d.pagamento[f[0]] + '">' + f[1] + '</button>'; }).join('') + '</div></div>';
    var estrutura = linha('estacionamento', 'Estacionamento', 'Próprio, conveniado ou fácil de parar', 'Como é', 'ex.: próprio e gratuito') +
      linha('equipamento', 'Equipamento ou estrutura', 'Mais novo ou melhor que o da concorrência', 'Qual', 'ex.: aparelho de última geração') +
      linha('exclusivo', v.Servicos.replace(/s$/, '') + ' exclusivo na região', 'Que só vocês fazem por aqui', 'Qual', '') +
      linha('horario', 'Horário diferenciado', 'Noite, sábado ou encaixe no dia', 'Qual', 'ex.: até 20h e aos sábados');
    return cabec(s) + (trunfos.length ? '<div class="dk-chips">' + trunfos.map(function (t) { return '<span>Do diagnóstico: ' + esc(t.titulo) + '</span>'; }).join('') + '</div>' : '') +
      '<p class="dk-lead">Marque o que ' + v.a_empresa + ' tem. Cada diferencial vira título de anúncio. <strong>' + marcados + (marcados === 1 ? ' marcado' : ' marcados') + '</strong>.</p>' +
      '<div class="dk-dif-grupos"><section class="dk-cartao"><h3>Pagamento</h3>' + pagamento + '</section><section class="dk-cartao"><h3>Estrutura e atendimento</h3>' + estrutura + '</section></div>' +
      '<div class="dk-sec"><label class="dk-campo">Outros diferenciais, com as palavras ' + v.da_empresa + '<textarea data-campo="diferenciais.outros">' + esc(d.outros) + '</textarea></label></div>';
  };
  R.convenios = function (s) {
    var c = st.r.convenios, saude = vocab().setor === 'saude';
    var ops = saude ? [['sim', 'Atende convênios'], ['nao', 'Só particular']] : [['sim', 'Tem'], ['nao', 'Não tem'], ['na', 'Não se aplica']];
    return cabec(s) + '<p class="dk-lead">' + (saude ? 'Convênio é um dos critérios que o paciente usa para escolher: ele entra na página e nos anúncios.' : 'Se houver convênios, planos ou parcerias, eles entram na página e nos anúncios.') + '</p>' + seg('convenios.situacao', ops, c.situacao) +
      (c.situacao === 'sim' ? '<div class="dk-sec">' + marcar('convenios.pedir_lista', 'Pedir a lista completa no grupo do WhatsApp', c.pedir_lista !== false) + '<div class="dk-sec">' + entrada('convenios.observacao', 'Principais citados na reunião', c.observacao, 'ex.: Unimed, Bradesco') + '</div></div>' : '');
  };
  R.regioes = function (s) {
    var r = st.diag.raio || {}, zonas = r.zonas || [];
    var porZona = {}; st.r.cidades.forEach(function (c, i) { (porZona[c.zona] = porZona[c.zona] || []).push([c, i]); });
    var html = Object.keys(porZona).sort().map(function (z) {
      var nome = (zonas[z - 1] && zonas[z - 1].nome) || (z === '0' ? 'Incluídas na reunião' : 'Zona ' + z);
      return '<div class="dk-zona-rot">' + esc(nome) + '</div><div class="dk-grade">' + porZona[z].map(function (p) {
        var c = p[0], i = p[1];
        return '<div class="dk-cidade"><div><div class="nm">' + esc(c.nome) + (c.uf ? '/' + esc(c.uf) : '') + '</div><div class="km">' + (c.km !== null && c.km !== undefined ? M.inteiro(c.km) + ' km' : 'distância a confirmar') + '</div></div>' + seg('cidades.' + i + '.atuar', [[true, 'Atuar'], [false, 'Não atuar']], c.atuar) + '</div>';
      }).join('') + '</div>';
    }).join('');
    var a = st.r.cidades.filter(function (c) { return c.atuar === true; }).length, n = st.r.cidades.filter(function (c) { return c.atuar === false; }).length, sd = st.r.cidades.length - a - n;
    var status = {}; st.r.cidades.forEach(function (c) { status[M.chaveCidade(c.nome)] = c.atuar; });
    var svg = M.svgRaio(st.diag, status);
    var mapa = svg ? '<div class="dk-mapa">' + svg + '<div class="cap">Mapa esquemático: a distância ao centro é proporcional aos km. Cidades marcadas "Não atuar" ficam apagadas.</div></div>' : '';
    var lado = mapa + cartaoGmn();
    var lista_ = '<p class="dk-lead">' + (r.recomendacao_km ? 'Raio sugerido para começar: <strong>' + M.inteiro(r.recomendacao_km) + ' km</strong>. ' : '') + 'Atuar: ' + a + ' · Não atuar: ' + n + (sd ? ' · Sem decisão: ' + sd : '') + '</p>' + html +
      '<div class="dk-linha"><label class="dk-campo">Incluir cidade<input type="text" id="dk-nova-cidade" placeholder="nome da cidade" autocomplete="off"></label><label class="dk-campo">Distância (km)<input type="text" id="dk-nova-km" placeholder="ex.: 45" autocomplete="off"></label><button type="button" class="dk-btn" data-acao="add-cidade">Incluir</button></div>';
    return cabec(s) + (lado ? '<div class="dk-regioes"><div class="lado">' + lado + '</div><div class="cidades">' + lista_ + '</div></div>' : lista_);
  };
  R.depoimentos = function (s) {
    var d = st.r.depoimentos, saude = vocab().setor === 'saude', v = vocab();
    return cabec(s) + '<div class="dk-grade"><div class="dk-cartao"><h3>Por que importa</h3><ul class="dk-lista ok"><li>Mostra pessoas reais falando de ' + v.a_empresa + '.</li><li>Dá confiança para quem chega pelo anúncio e ainda não conhece vocês.</li><li>Por isso aumenta a conversão da página: mais contatos com a mesma verba.</li></ul>' +
      (saude ? '<p style="margin-top:10px;font-size:14px;color:var(--apagado)">Em saúde: sem promessa de resultado e sem antes e depois.</p>' : '') + '</div>' +
      '<div class="dk-cartao"><h3>Vocês já têm depoimentos em vídeo?</h3>' + seg('depoimentos.tem', [['sim', 'Sim'], ['alguns', 'Alguns'], ['nao', 'Não']], d.tem) +
      (d.tem === 'sim' || d.tem === 'alguns' ? '<div class="dk-sec"><h3>Vão enviar os vídeos?</h3>' + seg('depoimentos.vai_enviar', [['sim', 'Vão enviar no grupo'], ['nao', 'Ainda não']], d.vai_enviar) + (d.vai_enviar === 'sim' ? '<div class="dk-linha">' + entradaData('depoimentos.prazo_envio', 'Até quando') + '</div>' : '') + '</div>' : '') +
      (d.tem === 'nao' || d.tem === 'alguns' ? '<div class="dk-sec"><h3>Vão gravar?</h3>' + seg('depoimentos.vai_gravar', [['sim', 'Vão gravar'], ['nao', 'Agora não']], d.vai_gravar) + (d.vai_gravar === 'sim' ? '<div class="dk-linha">' + entrada('depoimentos.responsavel', 'Quem cuida', d.responsavel, 'nome') + entradaData('depoimentos.prazo', 'Até quando') + '</div><p style="margin-top:10px;font-size:14px;color:var(--texto)">Dica: vídeo curto, no celular em pé, a pessoa diz o nome e o que gostou.</p>' : '') + '</div>' : '') + '</div></div>';
  };
  R.video = function (s) {
    var vh = st.r.video_home, v = vocab();
    var ops = [['cliente', v.a_empresa.charAt(0).toUpperCase() + v.a_empresa.slice(1) + ' grava', 'A Win7 envia o roteiro e ' + v.a_empresa + ' grava um vídeo curto mostrando a estrutura e a equipe.'], ['ia', 'Win7 cria com IA', 'A Win7 cria o roteiro e um agente de IA monta o vídeo a partir de fotos e informações.']];
    return cabec(s) + '<p class="dk-lead">O vídeo fica no topo da página: é a primeira coisa que o ' + v.cliente_final + ' vê ao chegar pelo anúncio. O roteiro é sempre da Win7.</p><div class="dk-opcoes">' +
      ops.map(function (o) { return '<button type="button" class="dk-opcao" data-campo="video_home.opcao" data-valor="' + o[0] + '" aria-pressed="' + (vh.opcao === o[0]) + '"><b>' + esc(o[1]) + '</b><span>' + esc(o[2]) + '</span></button>'; }).join('') + '</div>' +
      (vh.opcao ? '<div class="dk-linha">' + entrada('video_home.responsavel', 'Quem cuida', vh.responsavel, 'nome') + entradaData('video_home.prazo', 'Até quando') + '</div><div class="dk-sec">' + entrada('video_home.observacao', 'Observação', vh.observacao, '') + '</div>' : '');
  };
  R.confirmacoes = function (s) {
    var c = st.r.confirmacoes, v = vocab(), dc = st.r.dados_cliente || [];
    var dados = dc.length ? '<div class="dk-cartao"><h3>Dados ' + v.da_empresa + ' na página e no Google</h3>' + dc.map(function (x, i) {
      return '<div class="dk-dado"><div><div class="rot">' + esc(x.rotulo) + '</div>' + (x.editavel ? (/telefone|whatsapp/.test(x.campo) ? entradaTel('dados_cliente.' + i + '.valor', '', x.valor) : x.campo === 'cnpj' ? entradaCnpj('dados_cliente.' + i + '.valor', x.valor) : entrada('dados_cliente.' + i + '.valor', '', x.valor, ({ rt: 'Dr(a). Nome · CRM/UF 00000', razao_social: 'nome empresarial, como no CNPJ', email_privacidade: 'contato@empresa.com.br' })[x.campo] || 'preencher')) : '<div class="val">' + esc(x.valor || 'não informado') + '</div>') + '</div>' +
        seg('dados_cliente.' + i + '.status', [['ok', 'Confirmado'], ['corrigir', 'Corrigir']], x.status) +
        (x.status === 'corrigir' ? '<div class="corr">' + (/telefone|whatsapp/.test(x.campo) ? entradaTel('dados_cliente.' + i + '.correcao', 'Como fica', x.correcao) : entrada('dados_cliente.' + i + '.correcao', 'Como fica', x.correcao, '')) + '</div>' : '') + '</div>';
    }).join('') + '</div>' : '';
    return cabec(s) + dados + (c.length ? '<div class="dk-zona-rot">Pontos em aberto do diagnóstico</div>' +  '<div class="pilha" style="display:grid;gap:12px">' + c.map(function (x, i) {
      return '<div class="dk-cartao"><p style="font-weight:700;color:var(--tinta);margin-bottom:8px">' + esc(x.texto) + '</p>' + seg('confirmacoes.' + i + '.status', [['ok', 'Confirmado'], ['pendente', 'Pendente']], x.status) + '<div class="dk-sec" style="margin-top:10px">' + entrada('confirmacoes.' + i + '.obs', 'Anotação', x.obs, '') + '</div></div>';
    }).join('') + '</div>' : '<p class="dk-lead">O diagnóstico não deixou pontos em aberto.</p>') +
      '<div class="dk-sec">' + entrada('participantes', 'Quem participou da reunião', st.r.participantes, 'nomes') + '</div><div class="dk-sec"><label class="dk-campo">Observações gerais<textarea data-campo="observacoes">' + esc(st.r.observacoes) + '</textarea></label></div>';
  };
  R.fim = function (s) {
    var m = O.montarMapa(st.diag, st.r), val = O.validarMapa(m), d = m.decisoes, v = vocab();
    var simNao = { sim: 'Sim', nao: 'Não', na: 'Não se aplica', alguns: 'Alguns' };
    var cards = [
      ['Verba mensal', d.verba.mensal ? moeda(d.verba.mensal) : 'falta', d.verba.paginas ? d.verba.paginas + (d.verba.paginas > 1 ? ' páginas' : ' página') : ''],
      ['Página principal', d.pagina_principal || 'falta', d.dominio && d.dominio.modo === 'escolhido' ? d.dominio.escolhido : d.dominio && d.dominio.modo === 'whatsapp' ? 'domínio: aprovação no grupo' : 'domínio a definir'],
      [v.Servicos, String(d.servicos.length), d.servicos.join(' · ')],
      ['Cidades', d.cidades.atuar.length + ' para atuar', d.cidades.nao_atuar.length ? d.cidades.nao_atuar.length + ' fora' : ''],
      ['Diferenciais', String(d.diferenciais.length), d.diferenciais.map(function (x) { return x.rotulo; }).join(' · ')],
      ['Convênios', simNao[d.convenios.situacao] || 'falta', d.convenios.pedir_lista ? 'pedir lista no grupo' : ''],
      ['Depoimentos', simNao[d.depoimentos.tem] || 'falta', [d.depoimentos.vai_enviar === 'sim' ? 'vão enviar' : '', d.depoimentos.vai_gravar === 'sim' ? 'vão gravar' : ''].filter(Boolean).join(' · ')],
      ['Vídeo da página', ({ cliente: 'Grava', roteiro: 'Grava', ia: 'Win7 com IA' })[d.video_home.opcao] || 'falta', d.video_home.opcao ? 'roteiro da Win7' : ''],
      ['Dados conferidos', d.dados_cliente.filter(function (x) { return x.status === 'ok'; }).length + ' de ' + d.dados_cliente.length, d.dados_cliente.some(function (x) { return x.status === 'corrigir'; }) ? 'com correções' : ''],
      ['Pendências', String(m.pendencias.length), '']
    ].map(function (c) { return '<div class="c"><div class="r">' + esc(c[0]) + '</div><div class="v">' + esc(c[1]) + '</div><div class="s">' + esc(c[2]) + '</div></div>'; }).join('');
    var lista = function (cls, tipo) {
      var itens = val.pontos.filter(function (p) { return p.tipo === tipo; });
      return itens.length ? '<ul class="dk-val ' + cls + '">' + itens.map(function (p) { return '<li>' + (p.passo ? '<button type="button" data-ponto="' + esc(p.passo) + '"><span>' + esc(p.texto) + '</span><b>Ajustar</b></button>' : esc(p.texto)) + '</li>'; }).join('') + '</ul>' : '';
    };
    var guia = val.pontos.some(function (p) { return p.passo; }) ? '<div class="dk-gerado"><button type="button" class="dk-btn" data-acao="comecar-ajuste">Ajustar ponto a ponto (' + val.pontos.filter(function (p) { return p.passo; }).length + ')</button></div>' : '';
    return cabec(s) + '<div class="dk-cards">' + cards + '</div>' + lista('erros', 'erro') + lista('avisos', 'aviso') + guia +
      '<div class="dk-gerado"><button type="button" class="dk-btn primario dk-grande" data-acao="gerar-mapa"' + (val.erros.length ? ' disabled' : '') + '>Gerar mapeamento em PDF</button>' +
      (st.mapa ? '<button type="button" class="dk-btn" data-acao="imprimir">PDF de novo</button><button type="button" class="dk-btn" data-acao="abrir-mapa">Abrir o Mapa</button><button type="button" class="dk-btn" data-acao="baixar-mapa">Baixar Mapa (HTML)</button><button type="button" class="dk-btn" data-acao="baixar-json">Baixar dados para o robô 3 (JSON)</button>' : '') + '</div>' +
      (st.mapa ? '<div class="dk-cartao dk-robo3"><h3>Depois da reunião: robô 3</h3><p class="dk-ajuda">Baixa o mapeamento (JSON) e copia o comando inicial do robô 3. Coloque o mapeamento e a transcrição na pasta do cliente; o robô pede o endereço da pasta.</p><div class="dk-gerado"><button type="button" class="dk-btn primario" data-acao="ativar-robo3">Copiar comando do robô 3</button></div></div>' : '') +
      '<div class="dk-gerado" style="margin-top:22px"><button type="button" class="dk-btn" data-acao="exportar">Exportar rascunho</button><label class="dk-btn" style="position:relative;overflow:hidden">Importar rascunho<input type="file" accept=".json,application/json" data-acao="importar" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label><button type="button" class="dk-btn" data-acao="apagar">' + (st.sistema ? 'Apagar respostas' : 'Apagar deste aparelho') + '</button></div>';
  };

  // ---------------------------------------------------------------- moldura, navegação e eventos
  function montar() {
    var el = document.createElement('div');
    el.className = 'dk'; el.id = 'dk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Apresentação do onboarding'); el.hidden = true;
    el.innerHTML = '<div class="dk-faixa" aria-hidden="true"><span class="a"></span><span class="v"></span><span class="g"></span><span class="b"></span></div>' +
      '<header class="dk-topo"><img class="dk-logo" alt=""><div class="dk-cli"><b></b><span></span></div><div class="dk-prog" aria-hidden="true"></div><div class="dk-acoes"><span class="dk-salvo" aria-live="polite"></span>' +
      '<button type="button" class="dk-btn" data-acao="roteiro">Roteiro</button><button type="button" class="dk-btn" data-acao="notas" aria-pressed="false" title="Notas de quem conduz (tecla N)">Notas</button><button type="button" class="dk-btn" data-acao="sair">Sair</button></div></header>' +
      faixaPulso() +
      '<main class="dk-palco"><div class="dk-slide" tabindex="-1"></div></main>' +
      '<div class="dk-ajuste" hidden role="status" aria-live="polite"></div>' +
      '<aside class="dk-notas" hidden aria-live="polite"><div class="r">Como conduzir</div><p></p></aside>' +
      '<aside class="dk-gaveta" hidden><h3>Roteiro da reunião <button type="button" class="dk-btn" data-acao="roteiro">Fechar</button></h3><ol></ol></aside>' +
      '<nav class="dk-nav"><button type="button" class="dk-btn" data-acao="ant">Anterior</button><span class="dk-pontos"></span><button type="button" class="dk-btn primario" data-acao="prox">Próximo</button></nav>';
    document.body.appendChild(el);
    el.addEventListener('click', aoClicar);
    el.addEventListener('input', aoDigitar);
    el.addEventListener('change', aoMudar);
    document.addEventListener('keydown', aoTeclar);
    var x0 = null, y0 = null;
    el.querySelector('.dk-palco').addEventListener('touchstart', function (e) { if (/INPUT|TEXTAREA/.test(e.target.tagName)) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.querySelector('.dk-palco').addEventListener('touchend', function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dy) < 45) ir(st.i + (dx < 0 ? 1 : -1));
    }, { passive: true });
    return el;
  }
  function desenhar(manterRolagem) {
    var s = st.slides[st.i], palco = st.el.querySelector('.dk-palco'), y = palco.scrollTop;
    var slide = st.el.querySelector('.dk-slide');
    // marcar uma resposta redesenha o slide: sem repetir a animação de entrada
    if (manterRolagem) { clearTimeout(st.tAnima); slide.classList.remove('anima', 'volta'); }
    slide.innerHTML = (R[s.id] || R[s.tipo] || function () { return cabec(s); })(s);
    st.el.querySelector('.dk-cli b').textContent = (st.diag.cliente || {}).nome || '';
    st.el.querySelector('.dk-cli span').textContent = 'Passo ' + (st.i + 1) + ' de ' + st.slides.length;
    st.el.querySelector('.dk-pontos').textContent = (st.i + 1) + ' / ' + st.slides.length;
    st.el.querySelector('.dk-prog').innerHTML = st.slides.map(function (x, k) { return '<i class="' + (k < st.i ? 'feito' : k === st.i ? 'atual' : '') + '"></i>'; }).join('');
    st.el.querySelector('.dk-notas p').textContent = s.nota || '';
    st.el.querySelector('.dk-notas').hidden = !st.notas;
    st.el.querySelector('[data-acao="ant"]').disabled = st.i === 0;
    var prox = st.el.querySelector('[data-acao="prox"]'); prox.disabled = st.i === st.slides.length - 1; prox.textContent = st.i === st.slides.length - 2 ? 'Resumo' : 'Próximo';
    st.el.querySelector('.dk-gaveta ol').innerHTML = st.slides.map(function (x, k) { return '<li><button type="button" data-ir="' + k + '"' + (k === st.i ? ' aria-current="true"' : '') + '>' + (k + 1) + '. ' + esc(x.numero ? 'Pergunta ' + x.numero + ': ' + x.titulo : x.titulo) + '</button></li>'; }).join('');
    if (manterRolagem) palco.scrollTop = y; else { palco.scrollTop = 0; slide.focus({ preventScroll: true }); animarEntrada(slide); }
    painelAjuste();
  }
  function pontosPendentes() { return O.validarMapa(O.montarMapa(st.diag, st.r)).pontos.filter(function (p) { return p.passo && indicePasso(p.passo) >= 0; }); }
  function indicePasso(id) { for (var k = 0; k < st.slides.length; k++) if (st.slides[k].id === id) return k; return -1; }
  /** Vai para o próximo passo com ponto pendente, a partir do atual; sem pendências, volta ao resumo. */
  function proximoPonto() {
    var atual = st.slides[st.i].id, pend = pontosPendentes().filter(function (p) { return p.passo !== atual; });
    if (!pend.length) { st.ajuste = false; ir(st.slides.length - 1); desenhar(true); toast('Tudo ajustado. Agora é só gerar o mapeamento.'); return; }
    var idx = pend.map(function (p) { return indicePasso(p.passo); }).sort(function (a, b) { return a - b; });
    var depois = idx.filter(function (k) { return k > st.i; })[0];
    ir(depois !== undefined ? depois : idx[0]);
  }
  function painelAjuste() {
    var el = st.el.querySelector('.dk-ajuste'), s = st.slides[st.i];
    if (!st.ajuste || !s || s.tipo === 'fim') { el.hidden = true; st.el.classList.remove('com-ajuste'); return; }
    st.el.classList.add('com-ajuste');
    var pend = pontosPendentes(), aqui = pend.filter(function (p) { return p.passo === s.id; }), outros = pend.filter(function (p) { return p.passo !== s.id; });
    el.hidden = false;
    el.className = 'dk-ajuste' + (aqui.length ? '' : ' ok');
    el.innerHTML = '<div class="txt"><span class="r">' + (aqui.length ? 'Ajuste neste passo' : 'Este passo está resolvido') + '</span><b>' + esc(aqui.length ? aqui[0].texto : (outros.length ? 'Faltam ' + outros.length + (outros.length > 1 ? ' pontos' : ' ponto') + ' em outros passos.' : 'Nenhum ponto pendente.')) + '</b></div>' +
      '<div class="acoes">' + (outros.length ? '<button type="button" class="dk-btn primario" data-acao="proximo-ponto">Próximo ponto (' + outros.length + ')</button>' : '<button type="button" class="dk-btn primario" data-acao="voltar-resumo">Voltar ao resumo</button>') +
      (outros.length ? '<button type="button" class="dk-btn" data-acao="voltar-resumo">Resumo</button>' : '') + '<button type="button" class="dk-btn" data-acao="sair-ajuste" aria-label="Fechar o ajuste guiado">Fechar</button></div>';
  }
  /** Motion da apresentação: só na troca de slide, nunca ao marcar uma resposta; respeita "reduzir movimento". */
  function animarEntrada(slide) {
    if (!MOVIMENTO) return;
    slide.classList.remove('anima', 'volta'); void slide.offsetWidth;
    slide.classList.add('anima'); if (st.dir < 0) slide.classList.add('volta');
    clearTimeout(st.tAnima); st.tAnima = setTimeout(function () { slide.classList.remove('anima', 'volta'); }, 2200);
    contar(slide);
  }
  function contar(raiz) {
    if (!MOVIMENTO) return;
    raiz.querySelectorAll('[data-conta]').forEach(function (el) {
      var alvo = parseFloat(el.getAttribute('data-conta')), casas = Number(el.getAttribute('data-casas') || 0), pre = el.getAttribute('data-prefixo') || '';
      if (!isFinite(alvo)) return;
      var t0 = null, dur = 900;
      function passo(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = pre + (alvo * e).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
        if (k < 1) requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    });
  }
  function ir(k) { if (k < 0 || k >= st.slides.length || k === st.i) return; st.dir = k > st.i ? 1 : -1; st.i = k; st.r._passo = k; salvar(); desenhar(false); }
  function aoClicar(e) {
    var alt = e.target.closest('[data-alterna]');
    if (alt) { definir(alt.dataset.alterna, !obter(alt.dataset.alterna)); desenhar(true); return; }
    var b = e.target.closest('[data-valor]');
    if (b && b.dataset.campo) {
      var bruto = b.dataset.valor, valor = bruto === 'true' ? true : bruto === 'false' ? false : bruto;
      definir(b.dataset.campo, obter(b.dataset.campo) === valor ? null : valor);
      if (b.dataset.campo === 'verba.modo' && valor === null) definir('verba.modo', 'mensal');
      desenhar(true); return;
    }
    var pt = e.target.closest('[data-ponto]');
    if (pt) { st.ajuste = true; var ix = indicePasso(pt.dataset.ponto); if (ix >= 0) ir(ix); return; }
    var irPara = e.target.closest('[data-ir]');
    if (irPara) { st.gaveta = false; st.el.querySelector('.dk-gaveta').hidden = true; ir(Number(irPara.dataset.ir)); return; }
    var a = e.target.closest('[data-acao]'); if (!a || a.tagName === 'INPUT') return;
    var acao = a.dataset.acao;
    if (acao === 'prox') ir(st.i + 1);
    else if (acao === 'ant') ir(st.i - 1);
    else if (acao === 'notas') { st.notas = !st.notas; a.setAttribute('aria-pressed', String(st.notas)); st.el.querySelector('.dk-notas').hidden = !st.notas; }
    else if (acao === 'roteiro') { st.gaveta = !st.gaveta; st.el.querySelector('.dk-gaveta').hidden = !st.gaveta; }
    else if (acao === 'sair') fechar();
    else if (acao === 'add-servico') { var inp = st.el.querySelector('#dk-novo-servico'); var n = inp.value.trim(); if (n) { st.r.servicos.push({ nome: n, sugerido: false, confirmado: true, ordem: st.r.servicos.length }); salvar(); desenhar(true); } }
    else if (acao === 'add-cidade') { var nc = st.el.querySelector('#dk-nova-cidade').value.trim(); var km = num(st.el.querySelector('#dk-nova-km').value); if (nc) { st.r.cidades.push({ nome: nc, uf: '', km: km, zona: 0, atuar: true, adicionada: true }); salvar(); desenhar(true); } }
    else if (acao === 'gerar-mapa') gerarMapa();
    else if (acao === 'imprimir' && st.mapa) imprimir();
    else if (acao === 'principal') { var ni = Number(a.dataset.i); st.r.servicos.forEach(function (x, k) { x.principal = k === ni; }); if (st.r.servicos[ni]) st.r.servicos[ni].confirmado = true; salvar(); desenhar(true); }
    else if (acao === 'excluir-servico') {
      if (a.dataset.confirmar !== '1') { a.dataset.confirmar = '1'; a.textContent = 'Confirmar exclusão'; a.classList.add('confirmar'); setTimeout(function () { if (a.isConnected) { a.dataset.confirmar = ''; a.textContent = 'Excluir'; a.classList.remove('confirmar'); } }, 4000); return; }
      var xi = Number(a.dataset.i), era = st.r.servicos[xi]; st.r.servicos.splice(xi, 1);
      if (era && era.principal && st.r.servicos.length) st.r.servicos[0].principal = true;
      salvar(); desenhar(true); toast((era ? era.nome : 'O item') + ' saiu da lista.');
    }
    else if (acao === 'base') {
      st.r.lp_base = +a.dataset.n; salvar();
      var fr = st.el.querySelector('.dk-celular iframe'), um = M.urlModelo(st.diag);
      if (fr && um) fr.src = um + '#base' + st.r.lp_base;
      else if (fr && fr.hasAttribute('data-local')) fr.srcdoc = htmlModeloAtual();
      var lk = st.el.querySelector('[data-modelo-link]'); if (lk && um) lk.href = um + '#base' + st.r.lp_base;
      st.el.querySelectorAll('[data-acao="base"]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.n === st.r.lp_base)); });
    }
    else if (acao === 'modelo-tela-cheia') {
      var hm = htmlModeloAtual(); if (!hm) return;
      var bu = URL.createObjectURL(new Blob([hm], { type: 'text/html;charset=utf-8' }));
      window.open(bu, '_blank'); setTimeout(function () { URL.revokeObjectURL(bu); }, 60000);
    }
    else if (acao === 'escolher-dominio') { st.r.dominio = st.r.dominio || { sugestoes: [] }; var dd = a.dataset.d; var ja = st.r.dominio.modo === 'escolhido' && st.r.dominio.escolhido === dd; st.r.dominio.modo = ja ? null : 'escolhido'; st.r.dominio.escolhido = ja ? '' : dd; salvar(); desenhar(true); }
    else if (acao === 'add-dominio') {
      var ent = st.el.querySelector('#dk-novo-dominio'), nd = O.normalizarDominio(ent.value);
      if (!nd) { toast('Domínio inválido. Ex.: nomedaclinica.com.br'); return; }
      st.r.dominio = st.r.dominio || { modo: null, escolhido: '', sugestoes: [] };
      if (!st.r.dominio.sugestoes.some(function (x) { return x.dominio === nd; })) st.r.dominio.sugestoes.push({ dominio: nd, status: null, incluido: true });
      st.r.dominio.modo = 'escolhido'; st.r.dominio.escolhido = nd; salvar(); desenhar(true);
    }
    else if (acao === 'comecar-ajuste') { st.ajuste = true; proximoPonto(); }
    else if (acao === 'proximo-ponto') proximoPonto();
    else if (acao === 'voltar-resumo') { st.ajuste = false; ir(st.slides.length - 1); }
    else if (acao === 'sair-ajuste') { st.ajuste = false; painelAjuste(); }
    else if (acao === 'confirmar-principal') { var ip = iPrincipal(); if (st.r.servicos[ip]) { st.r.servicos[ip].confirmado = !st.r.servicos[ip].confirmado; salvar(); desenhar(true); } }
    else if (acao === 'abrir-mapa' && st.mapa) window.open(URL.createObjectURL(new Blob([st.mapa.html], { type: 'text/html;charset=utf-8' })), '_blank', 'noopener');
    else if (acao === 'baixar-mapa' && st.mapa) baixar('mapa-onboarding-' + st.r.cliente.slug + '.html', st.mapa.html, 'text/html;charset=utf-8');
    else if (acao === 'ativar-robo3' && st.mapa) {
      if (!st.jsonBaixado) { baixar('mapa-onboarding-' + st.r.cliente.slug + '.json', JSON.stringify(st.mapa.dados, null, 2), 'application/json'); st.jsonBaixado = true; }
      copiarTexto(O.ativacaoRobo3(), 'Comando do robô 3 copiado e mapeamento baixado. Cole o comando numa conversa nova do Claude Code.');
    }
    else if (acao === 'baixar-json' && st.mapa) baixar('mapa-onboarding-' + st.r.cliente.slug + '.json', JSON.stringify(st.mapa.dados, null, 2), 'application/json');
    else if (acao === 'exportar') baixar('rascunho-onboarding-' + st.r.cliente.slug + '.json', JSON.stringify({ diagnostico: st.diag, respostas: st.r }, null, 2), 'application/json');
    else if (acao === 'apagar') {
      var rotulo = st.sistema ? 'Apagar respostas' : 'Apagar deste aparelho';
      if (a.dataset.confirmar !== '1') { a.dataset.confirmar = '1'; a.textContent = st.sistema ? 'Confirmar: apagar as respostas' : 'Confirmar: apagar respostas deste aparelho'; setTimeout(function () { if (a.isConnected) { a.dataset.confirmar = ''; a.textContent = rotulo; } }, 4500); return; }
      try { localStorage.removeItem(st.chave); } catch (er) { /* nada a apagar */ }
      st.r = O.estadoInicial(st.diag); st.mapa = null; st.i = 0; desenhar(false);
      // no sistema, a versão anterior fica guardada no projeto (versões do onboarding)
      if (st.sistema) { salvar(); toast('Respostas apagadas. A versão anterior fica guardada no sistema.'); }
      else toast('Respostas apagadas deste aparelho.');
    }
  }
  function aoDigitar(e) {
    var t = e.target; if (!t.dataset || !t.dataset.campo || t.type === 'checkbox') return;
    if (t.dataset.mascara === 'tel') t.value = O.mascaraTelefone(t.value);
    if (t.dataset.mascara === 'data') t.value = O.mascaraData(t.value);
    if (t.dataset.mascara === 'cnpj') t.value = O.mascaraCnpj(t.value);
    definir(t.dataset.campo, t.value);
    if (t.dataset.mascara === 'data') { var w = t.closest('[data-wrap]'); if (w) w.querySelector('.dk-data-info').innerHTML = infoData(t.dataset.campo); }
    if (st.ajuste) painelAjuste();
    var calc = st.el.querySelector('#dk-calc'); if (calc) { calc.innerHTML = calcVerbaHtml(); if (MOVIMENTO) { calc.classList.remove('pulsa'); void calc.offsetWidth; calc.classList.add('pulsa'); } }
  }
  function aoMudar(e) {
    var t = e.target;
    if (t.dataset && t.dataset.mascara === 'data' && t.value.length === 5) {
      var cc = O.checarPrazo(t.value, O.dataBase(st.r));
      if (cc.data) { t.value = cc.data; definir(t.dataset.campo, t.value); var w2 = t.closest('[data-wrap]'); if (w2) w2.querySelector('.dk-data-info').innerHTML = infoData(t.dataset.campo); }
    }
    if (t.type === 'checkbox' && t.dataset.campo) { definir(t.dataset.campo, t.checked); desenhar(true); return; }
    if (t.dataset && t.dataset.acao === 'importar' && t.files[0]) {
      var leitor = new FileReader();
      leitor.onload = function () {
        try { var o = JSON.parse(leitor.result); if (!o.respostas || o.respostas.schema !== O.RESPOSTAS_SCHEMA) throw new Error('formato'); st.r = O.migrar(o.respostas, st.diag); st.mapa = null; salvar(); desenhar(false); toast('Rascunho importado.'); }
        catch (er) { toast('Arquivo de rascunho inválido.'); }
      };
      leitor.readAsText(t.files[0], 'utf-8'); t.value = '';
    }
  }
  function aoTeclar(e) {
    if (!st.el || st.el.hidden) return;
    if (e.key === 'Escape') { if (st.gaveta) { st.gaveta = false; st.el.querySelector('.dk-gaveta').hidden = true; } else if (st.notas) { st.notas = false; st.el.querySelector('.dk-notas').hidden = true; st.el.querySelector('[data-acao="notas"]').setAttribute('aria-pressed', 'false'); } return; }
    if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); ir(st.i + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); ir(st.i - 1); }
    else if (e.key === 'n' || e.key === 'N') st.el.querySelector('[data-acao="notas"]').click();
  }
  function gerarMapa() {
    var dados = O.montarMapa(st.diag, st.r), val = O.validarMapa(dados);
    if (val.erros.length) { desenhar(true); return; }
    var html = O.gerarMapaHtml(dados, st.diag, { css: st.cssLaudo, ativos: st.ativos });
    st.mapa = { dados: dados, html: html };
    desenhar(true);
    imprimir();
    // o JSON vai junto: o robô 3 lê qualquer formato, mas com os dados a ficha já sai preenchida
    baixar('mapa-onboarding-' + st.r.cliente.slug + '.json', JSON.stringify(dados, null, 2), 'application/json'); st.jsonBaixado = true;
    toast('Mapeamento gerado: escolha "Salvar como PDF". Os dados (JSON) para o robô 3 já foram baixados.');
    if (st.sistema) {
      var sis = st.sistema;
      gravarPendente(false);
      sis.salvarMapa(dados).then(function () { if (st.sistema === sis) rotuloSalvo('Mapeamento salvo no sistema às ' + hora(), false); },
        function (e) { if (st.sistema === sis) { rotuloSalvo('O mapeamento não foi salvo no sistema', true); toast('O mapeamento não foi salvo no sistema (' + e.message + '). Gere de novo antes de sair.'); } });
    }
  }
  /** Imprime o Mapa num quadro escondido: no navegador, "Salvar como PDF" gera o arquivo. */
  function imprimir() {
    var f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Abra o Mapa e use Imprimir, Salvar como PDF.'); } setTimeout(function () { f.remove(); }, 60000); };
    f.srcdoc = st.mapa.html; document.body.appendChild(f);
  }
  function fechar() { gravarPendente(false); st.el.hidden = true; document.documentElement.style.overflow = ''; }

  function avisoRecuperou(origem) {
    return 'Respostas recuperadas ' + origem + '. Para começar do zero, use "' + (st.sistema ? 'Apagar respostas' : 'Apagar deste aparelho') + '" no resumo.';
  }

  window.OnboardingDeck = {
    abrir: function (diag, opcoes) {
      opcoes = opcoes || {};
      if (!st.el) st.el = montar();
      st.diag = diag; st.ativos = opcoes.ativos || {}; st.cssLaudo = opcoes.cssLaudo || ''; st.logoCliente = opcoes.logoCliente || ''; st.mapa = null; st.lpLocal = null; st.coresLogo = [];
      st.slides = O.slidesPara(diag); st.chave = 'w7-onb-' + M.slug((diag.cliente || {}).nome);
      clearTimeout(st.tSistema); st.tSistema = null; st.enviando = false; st.denovo = false;
      st.sistema = opcoes.sistema || null;
      var salvo = null; try { salvo = JSON.parse(localStorage.getItem(st.chave) || 'null'); } catch (e) { salvo = null; }
      var local = salvo && salvo.respostas && salvo.respostas.schema === O.RESPOSTAS_SCHEMA ? salvo.respostas : null;
      var doSistema = st.sistema && st.sistema.respostas && st.sistema.respostas.schema === O.RESPOSTAS_SCHEMA ? st.sistema.respostas : null;
      // a cópia mais nova vence: a do sistema (outra pessoa continuou) ou a deste aparelho (a internet caiu no meio)
      var escolhida = doSistema && (!local || String(doSistema.atualizado_em || '') >= String(local.atualizado_em || '')) ? doSistema : local;
      var origem = escolhida && escolhida === doSistema ? 'do sistema' : 'deste aparelho';
      var recuperou = !!escolhida;
      st.r = recuperou ? O.migrar(escolhida, diag) : O.estadoInicial(diag);
      st.i = recuperou && typeof st.r._passo === 'number' ? Math.min(st.r._passo, st.slides.length - 1) : 0;
      st.el.querySelector('.dk-logo').src = logo(); st.el.querySelector('.dk-logo').alt = vocab().marca;
      st.el.hidden = false; document.documentElement.style.overflow = 'hidden';
      desenhar(false);
      rotuloSalvo(st.sistema && doSistema ? 'Salvo no sistema' : '', false);
      if (st.sistema && escolhida && escolhida === local) enviarAoSistema(true);
      if (!M.urlModelo(diag)) {
        // sem link publicado: o modelo é montado aqui, com a logo e as cores do cliente
        var semCores = !(diag.lp_modelo && diag.lp_modelo.cores);
        if (st.logoCliente && semCores) lerCoresLogo(st.logoCliente, function (cs) { st.coresLogo = cs; st.lpLocal = null; if (!st.el.hidden) desenhar(true); });
        if (!st.logoCliente) toast('Sem a logo do cliente: a página modelo sai com a logo da Win7. Envie a logo no passo 3 do Gerador.');
        else if (recuperou) toast(avisoRecuperou(origem));
      }
      else if (recuperou) toast(avisoRecuperou(origem));
    },
    fechar: fechar
  };
})();
