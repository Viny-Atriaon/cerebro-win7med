/* LP modelo Win7 · núcleo puro (sem DOM, sem rede). Roda no Node (linha de comando e testes).
   Depende de MotorDiagnostico carregado antes. Expõe globalThis.LpModeloW7.
   ADR-006 e CONSELHO-03: uma landing page de demonstração por cliente, a partir do mesmo bloco de dados do diagnóstico.
   Travas embutidas: faixa "Modelo para aprovação" fixa no modelo, formulário e telefone sem efeito, sem rastreamento,
   noindex, convênios genéricos ("Convênio A"), depoimentos sem rosto nem nome, mídia só da lista fechada. */
(function (raiz) {
  'use strict';
  var M = raiz.MotorDiagnostico;
  if (!M) throw new Error('LpModeloW7 precisa do MotorDiagnostico carregado antes.');
  var VERSAO = '1.4.0';
  var esc = M.esc;

  /** Paleta padrão: identidade Win7 Med (petróleo + amarelo do 7). Vale também para o segmento geral. */
  var PALETA_PADRAO = { marca: '#0b4f6c', marca_escura: '#082f44', destaque: '#f5b71a', apoio: '#f28c28' };
  var LETRAS = 'ABCDEFGHIJKL'.split('');
  /** Nomes de operadoras e convênios reais: nunca podem aparecer no modelo (trava do conselho). */
  var CONVENIOS_REAIS = ['unimed', 'bradesco', 'sulamerica', 'sul america', 'amil', 'cassi', 'hapvida', 'notredame', 'notre dame', 'porto seguro', 'golden cross', 'geap', 'ipasgo', 'ipsemg', 'iamspe', 'postal saude', 'careplus', 'omint', 'prevent senior', 'mediservice', 'allianz', 'saude caixa', 'cabesp', 'fusex', 'cassems', 'unisaude', 'intermedica', 'gama saude', 'capesesp', 'petrobras'];
  /** Mídia permitida no site dos modelos (trava 4 do juiz): só a base da Win7 e a logo do cliente. */
  var MIDIA_BASE = /^base\/(win7-etiqueta\.webp|logo-win7med\.png|logo-win7\.png|hero\.(mp4|webp)|depoimento-[1-3]\.(mp4|webp))$/;
  var MIDIA_CLIENTE = /^m\/[a-z0-9]{12}\/(index\.html|logo\.(png|jpg|jpeg|webp|svg))$/;
  var TOKEN = /^[a-z0-9]{12}$/;
  /**
   * Fontes do cliente (lista fechada do Google Fonts, que a página já carrega). pesos: os que a família tem;
   * unico = família de um peso só (títulos condensados), que entra sem negrito falso e com espaçamento próprio.
   */
  var FONTES = {
    'Outfit': { pesos: '400;500;600;700;800' }, 'Montserrat': { pesos: '400;500;600;700;800' }, 'Poppins': { pesos: '400;500;600;700;800' },
    'Inter': { pesos: '400;500;600;700;800' }, 'Roboto': { pesos: '400;500;700;900' }, 'Open Sans': { pesos: '400;500;600;700;800' },
    'Lato': { pesos: '400;700;900' }, 'Nunito': { pesos: '400;500;600;700;800' }, 'Nunito Sans': { pesos: '400;500;600;700;800' },
    'Raleway': { pesos: '400;500;600;700;800' }, 'Oswald': { pesos: '400;500;600;700' }, 'Playfair Display': { pesos: '400;500;600;700;800' },
    'Lora': { pesos: '400;500;600;700' }, 'Merriweather': { pesos: '400;700;900' }, 'Work Sans': { pesos: '400;500;600;700;800' },
    'DM Sans': { pesos: '400;500;600;700;800' }, 'Rubik': { pesos: '400;500;600;700;800' }, 'Barlow': { pesos: '400;500;600;700;800' },
    'Barlow Condensed': { pesos: '400;500;600;700;800' }, 'Archivo': { pesos: '400;500;600;700;800' }, 'Manrope': { pesos: '400;500;600;700;800' },
    'Ubuntu': { pesos: '400;500;700' }, 'Quicksand': { pesos: '400;500;600;700' }, 'Mulish': { pesos: '400;500;600;700;800' },
    'Josefin Sans': { pesos: '400;500;600;700' }, 'Kanit': { pesos: '400;500;600;700;800' }, 'Figtree': { pesos: '400;500;600;700;800' },
    'Plus Jakarta Sans': { pesos: '400;500;600;700;800' }, 'Source Sans 3': { pesos: '400;500;600;700;800' },
    'Bebas Neue': { pesos: '', unico: true }, 'Anton': { pesos: '', unico: true }, 'League Gothic': { pesos: '', unico: true }
  };
  var FONTE_PADRAO = 'Outfit';

  function texto(x) { return x === undefined || x === null ? '' : String(x).trim(); }
  function lista(x) { return Array.isArray(x) ? x : []; }
  function chave(s) { return texto(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function num(x) { if (typeof x === 'number' && isFinite(x)) return x; if (x && typeof x === 'object' && typeof x.valor === 'number') return x.valor; return null; }

  // ---------------------------------------------------------------- cores
  function hexOk(h) { return /^#[0-9a-f]{6}$/i.test(texto(h)); }
  function rgb(h) { var n = parseInt(texto(h).slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2); }).join(''); }
  function luminancia(h) { return rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (a, v, i) { return a + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function contraste(a, b) { var la = luminancia(a), lb = luminancia(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
  function misturar(a, b, t) { var x = rgb(a), y = rgb(b); return hex(x.map(function (v, i) { return v + (y[i] - v) * t; })); }

  /** As 4 cores da marca viram o conjunto completo de tokens do padrão (seção 4 do PADRAO-LP-WIN7). */
  function paleta(cores) {
    var c = Object.assign({}, PALETA_PADRAO, cores || {}), erros = [];
    ['marca', 'marca_escura', 'destaque', 'apoio'].forEach(function (k) { if (!hexOk(c[k])) erros.push('Cor "' + k + '" inválida: use #rrggbb.'); });
    if (erros.length) return { erros: erros };
    if (contraste('#ffffff', c.marca_escura) < 7) erros.push('A cor escura da marca precisa de contraste 7:1 com o branco (hoje ' + contraste('#ffffff', c.marca_escura).toFixed(1) + ':1). Escureça a cor.');
    // destaque só aparece em texto grande (cidade no título) e em grafismo: 3:1 basta (WCAG 1.4.3 e 1.4.11)
    if (contraste(c.destaque, c.marca_escura) < 3) erros.push('A cor de destaque precisa de contraste 3:1 sobre a cor escura (hoje ' + contraste(c.destaque, c.marca_escura).toFixed(1) + ':1).');
    return {
      erros: erros,
      tokens: {
        marca: c.marca, marca_escura: c.marca_escura, destaque: c.destaque, apoio: c.apoio,
        tinta: misturar(c.marca_escura, '#000000', 0.25), texto: misturar(c.marca_escura, '#6b7b80', 0.55),
        fundo_claro: misturar('#ffffff', c.marca, 0.08), linha: misturar('#ffffff', c.marca, 0.2), marca_rgb: rgb(c.marca).join(',')
      }
    };
  }

  // ---------------------------------------------------------------- fontes do cliente
  function nomeFonte(n) {
    var k = chave(n).replace(/\s+/g, ' ');
    return Object.keys(FONTES).filter(function (f) { return chave(f) === k; })[0] || '';
  }
  /** { titulo, texto } do bloco vira o link do Google Fonts e os tokens de CSS. Fonte fora da lista fechada vira erro. */
  function fontes(f) {
    f = f || {};
    var erros = [], pedido = { titulo: texto(f.titulo) || texto(f.texto), texto: texto(f.texto) || texto(f.titulo) }, ok = {};
    ['titulo', 'texto'].forEach(function (k) {
      if (!pedido[k]) { ok[k] = FONTE_PADRAO; return; }
      ok[k] = nomeFonte(pedido[k]);
      if (!ok[k]) { erros.push('Fonte "' + pedido[k] + '" fora da lista: use ' + Object.keys(FONTES).join(', ') + '.'); ok[k] = FONTE_PADRAO; }
    });
    var familias = [ok.titulo, ok.texto].filter(function (x, i, a) { return a.indexOf(x) === i; });
    var link = 'https://fonts.googleapis.com/css2?' + familias.map(function (n) {
      return 'family=' + n.replace(/ /g, '+') + (FONTES[n].pesos ? ':wght@' + FONTES[n].pesos : '');
    }).join('&amp;') + '&amp;display=swap';
    var unico = !!FONTES[ok.titulo].unico;
    return {
      erros: erros, titulo: ok.titulo, texto: ok.texto,
      tokens: {
        FONTES_LINK: '<link href="' + link + '" rel="stylesheet">',
        FONTE_TITULO: '"' + ok.titulo + '",' + (unico ? 'Impact,' : '') + 'system-ui,sans-serif',
        FONTE_TEXTO: '"' + ok.texto + '",system-ui,sans-serif',
        // família de um peso só: sem negrito falso, letras um pouco maiores e mais abertas
        PESO_TITULO: unico ? '400' : '800', PESO_SEC: unico ? '400' : '700',
        ESPACO_TITULO: unico ? '.015em' : '-.012em', ESCALA_TITULO: unico ? '1.16' : '1'
      }
    };
  }

  // ---------------------------------------------------------------- cores a partir da logo (ADR-007, etapa A)
  function paraHsl(h) {
    var c = rgb(h).map(function (v) { return v / 255; }), max = Math.max.apply(null, c), min = Math.min.apply(null, c), l = (max + min) / 2, x = 0, s = 0;
    if (max !== min) {
      var d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      x = max === c[0] ? ((c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0)) * 60 : max === c[1] ? ((c[2] - c[0]) / d + 2) * 60 : ((c[0] - c[1]) / d + 4) * 60;
    }
    return { h: x, s: s, l: l };
  }
  function deHsl(h, s, l) {
    function f(n) { var k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))); }
    return hex([f(0), f(8), f(4)]);
  }
  function distTom(a, b) { var d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); }

  /**
   * Cores principais a partir dos pixels da logo (a mesma regra do cores_logo.py, para o Gerador ler a logo no navegador).
   * pixels: lista plana RGBA (como o ImageData do canvas). Só entram cores com saturação e pixels opacos.
   * Devolve [{ hex, peso }], no máximo 5, cada uma com pelo menos 3% dos pixels coloridos.
   */
  function coresDosPixels(pixels) {
    var grupos = {}, ordem = [], total = 0;
    function hls(r, g, b) { var x = paraHsl(hex([r, g, b])); return { h: x.h / 360, l: x.l, s: x.s }; }
    for (var i = 0; i + 3 < pixels.length; i += 4) {
      var r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (pixels[i + 3] < 200) continue;
      var c = hls(r, g, b);
      if (!(c.s >= 0.22 && c.l >= 0.1 && c.l <= 0.92)) continue;
      var k = Math.floor(c.h * 30) + ':' + Math.floor(c.l * 5) + ':' + Math.floor(c.s * 3);
      if (!grupos[k]) { grupos[k] = [0, 0, 0, 0]; ordem.push(k); }
      var a = grupos[k]; a[0] += r; a[1] += g; a[2] += b; a[3] += 1; total++;
    }
    if (!total) return [];
    var saida = [];
    ordem.map(function (k) { return grupos[k]; }).sort(function (x, y) { return y[3] - x[3]; }).forEach(function (a) {
      var cor = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], c = hls(cor[0], cor[1], cor[2]);
      var par = saida.filter(function (x) { var dh = Math.abs(x.h - c.h) * 360; return Math.min(dh, 360 - dh) < 14 && Math.abs(x.l - c.l) < 0.22; })[0];
      if (par) { par.n += a[3]; return; }
      saida.push({ rgb: cor, h: c.h, l: c.l, n: a[3] });
    });
    saida.sort(function (x, y) { return y.n - x.n; });
    return saida.filter(function (x) { return x.n / total >= 0.03; }).slice(0, 5)
      .map(function (x) { return { hex: hex(x.rgb.map(Math.round)), peso: Math.round(x.n / total * 1000) / 1000 }; });
  }
  /** Sobe (passo > 0) ou desce a claridade até o contraste com o fundo chegar ao mínimo. */
  function ajustarAte(c, fundo, minimo, passo) {
    for (var l = c.l; l >= 0.04 && l <= 0.96; l += passo) { var x = deHsl(c.h, c.s, l); if (contraste(x, fundo) >= minimo) return x; }
    return '';
  }

  /**
   * As 4 cores da página a partir das cores da logo (cores_logo.py) ou das informadas no chat.
   * marca = a cor forte mais escura da logo; marca_escura = o mesmo tom até 7,5:1 com o branco (fundo do banner);
   * destaque = a outra cor mais clara, clareada só até 3,2:1 sobre o fundo (texto grande e grafismo); apoio = a cor seguinte, com o branco legível por cima.
   * Logo sem cor (preto, branco, cinza) ou só com cor vetada: devolve null e a página fica com a paleta da Win7.
   * opcoes.escura: o fundo escuro do site do cliente (pode ser grafite ou preto, desde que tenha 7:1 com o branco).
   * Com ele, a própria cor da marca vira o destaque, como no site.
   */
  function paletaDaLogo(cores, vetadas, opcoes) {
    opcoes = opcoes || {};
    var escuraSite = hexOk(opcoes.escura) && contraste('#ffffff', opcoes.escura) >= 7 ? texto(opcoes.escura).toLowerCase() : '';
    var vet = lista(vetadas).map(function (v) { return chave(v); });
    var cs = lista(cores).map(function (c) { return typeof c === 'string' ? { hex: c, peso: 1 } : c; })
      .filter(function (c) { return c && hexOk(c.hex); })
      .map(function (c) { var x = paraHsl(c.hex); return { hex: texto(c.hex).toLowerCase(), peso: typeof c.peso === 'number' ? c.peso : 1, h: x.h, s: x.s, l: x.l }; })
      .filter(function (c) { return c.s >= 0.22 && c.l >= 0.1 && c.l <= 0.92 && vet.indexOf(M.familiaDeCor(c.hex)) < 0; });
    if (!cs.length) return null;
    var fortes = cs.filter(function (c) { return c.peso >= 0.15; });
    if (!fortes.length) fortes = [cs[0]];
    var p = fortes.slice().sort(function (a, b) { return luminancia(a.hex) - luminancia(b.hex); })[0];
    var outras = cs.filter(function (c) { return c !== p && distTom(c.h, p.h) >= 25; })
      .sort(function (a, b) { return luminancia(b.hex) - luminancia(a.hex); });
    var quente = ['amarelo', 'laranja'].indexOf(M.familiaDeCor(p.hex)) >= 0 && !outras.length;
    var marca, escura;
    if (escuraSite) {
      marca = deHsl(p.h, Math.min(p.s, 0.85), Math.max(0.24, Math.min(0.5, p.l)));
      escura = escuraSite; outras = outras.length ? outras : [p];
    } else if (quente) {
      // logo só amarela ou laranja: fundo grafite e a cor da logo como destaque
      marca = '#2c353c'; escura = '#1d2328'; outras = [p];
    } else {
      marca = deHsl(p.h, Math.min(p.s, 0.85), Math.max(0.24, Math.min(0.5, p.l)));
      escura = ajustarAte({ h: p.h, s: Math.min(p.s, 0.75), l: Math.min(0.22, paraHsl(marca).l * 0.55) }, '#ffffff', 7.5, -0.01) || '#0f1a20';
    }
    var d0 = outras[0] || { h: p.h, s: Math.max(p.s, 0.7), l: 0.62 };
    // com o fundo do site, a cor da marca entra como está quando já se lê sobre ele (sem saturar)
    var destaque = escuraSite && d0.hex && contraste(d0.hex, escura) >= 3.2 ? d0.hex
      : ajustarAte({ h: d0.h, s: escuraSite ? d0.s : Math.max(d0.s, 0.6), l: d0.l }, escura, 3.2, 0.01);
    if (!destaque) destaque = PALETA_PADRAO.destaque;
    var a0 = outras[1] || outras[0] || p;
    var apoio = ajustarAte({ h: a0.h, s: Math.max(a0.s, 0.55), l: Math.min(0.55, Math.max(a0.l, 0.4)) }, '#ffffff', 3, -0.01) || marca;
    return { marca: marca, marca_escura: escura, destaque: destaque, apoio: apoio };
  }

  // ---------------------------------------------------------------- bases do banner (ADR-007, etapa A)
  /** Três fundos de banner em movimento contínuo. Mesma estrutura de página; muda só o elemento visual. */
  var BASES = [{ n: 1, nome: 'Órbitas' }, { n: 2, nome: 'Ondas' }, { n: 3, nome: 'Varredura' }];
  function baseValida(n) { n = +n; return n === 1 || n === 2 || n === 3 ? n : 0; }
  /** Sorteio sem repetir a base do cliente anterior. sorte: número entre 0 e 1 (Math.random, ou fixo nos testes). */
  function sortearBase(anterior, sorte) {
    var op = [1, 2, 3].filter(function (n) { return n !== baseValida(anterior); });
    return op[Math.min(op.length - 1, Math.floor((typeof sorte === 'number' ? sorte : 0) * op.length))];
  }
  function onda(y, a, P) {
    var d = 'M0 ' + y, h = P / 2;
    for (var x = 0, i = 0; x < 2400; x += h, i++) {
      var sy = i % 2 ? y + a * 4 / 3 : y - a * 4 / 3;
      d += ' C' + Math.round(x + h / 3) + ' ' + Math.round(sy) + ' ' + Math.round(x + 2 * h / 3) + ' ' + Math.round(sy) + ' ' + (x + h) + ' ' + y;
    }
    return d;
  }
  /** Marcação dos fundos. todas = true no modelo (troca ao vivo pela apresentação); na página real só a escolhida. */
  function heroBases(n, todas) {
    n = baseValida(n) || 1;
    var b1 = '<svg class="campo b1" viewBox="0 0 1500 1500" aria-hidden="true"><g class="aneis">' +
      [250, 330, 410, 490, 570, 650, 730].map(function (r) { return '<circle cx="750" cy="750" r="' + r + '"/>'; }).join('') +
      '</g><g class="orbita"><path class="arco" d="M 1076 571 A 370 370 0 1 0 1076 929"/><circle class="ponto" cx="1090" cy="555" r="11"/></g></svg>';
    var linhas = [[130, 20, 400, 0], [215, 34, 400, -120], [360, 26, 400, -60], [585, 44, 400, -200], [545, 30, 400, -30], [628, 18, 400, -150]];
    var b2 = '<svg class="ondas b2" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      linhas.map(function (o, i) { return '<g class="o o' + (i + 1) + '"><path transform="translate(' + o[3] + ' 0)" d="' + onda(o[0], o[1], o[2]) + '"/></g>'; }).join('') + '</svg>';
    var b3 = '<svg class="grade b3" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
      '<pattern id="w7-pontos" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="1.7"/></pattern>' +
      '<radialGradient id="w7-vinheta" cx="74%" cy="50%" r="58%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<mask id="w7-mascara"><rect width="1600" height="700" fill="url(#w7-vinheta)"/></mask>' +
      '<linearGradient id="w7-feixe"><stop offset="0" style="stop-color:var(--destaque);stop-opacity:0"/><stop offset=".5" style="stop-color:var(--destaque);stop-opacity:.34"/><stop offset="1" style="stop-color:var(--destaque);stop-opacity:0"/></linearGradient>' +
      '</defs><g mask="url(#w7-mascara)"><rect class="pontos" width="1600" height="700" fill="url(#w7-pontos)"/>' +
      '<g class="feixe"><rect x="-420" y="-260" width="260" height="1220" fill="url(#w7-feixe)" transform="rotate(18)"/></g></g>' +
      '<g class="nos">' + [[980, 118], [1386, 604], [1534, 300], [900, 612]].map(function (q) { return '<g class="no"><circle class="anel" cx="' + q[0] + '" cy="' + q[1] + '" r="6"/><circle class="nucleo" cx="' + q[0] + '" cy="' + q[1] + '" r="4"/></g>'; }).join('') + '</g></svg>';
    var todasB = { 1: b1, 2: b2, 3: b3 };
    return todas ? b1 + b2 + b3 : todasB[n];
  }

  // ---------------------------------------------------------------- variáveis a partir do diagnóstico
  function minusculaInicial(s) { return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function juntar(itens) { if (itens.length < 2) return itens.join(''); return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1]; }

  /**
   * Dados do modelo a partir do bloco do diagnóstico. extra: { servico, logo (nome do arquivo), cores, token }.
   * Nada é inventado: telefone, endereço e nota vêm do perfil do Google lido no diagnóstico; sem eles, o modelo mostra um marcador.
   */
  function variaveis(diag, extra) {
    extra = extra || {};
    var c = (diag && diag.cliente) || {}, g = ((diag && diag.presenca) || {}).google || {}, lm = (diag && diag.lp_modelo) || {};
    var servicos = lista(c.servicos_foco).map(texto).filter(Boolean);
    if (!servicos.length) servicos = lista((diag.termos || {}).frentes).map(function (f) { return texto(f.frente); }).filter(Boolean);
    return {
      setor: M.vocabDe(diag).setor,
      nome: texto(c.nome), cidade: texto(c.cidade), uf: texto(c.uf),
      servico: texto(extra.servico || lm.servico) || servicos[0] || '',
      servicos: servicos,
      telefone: texto(g.telefone), endereco: texto(g.endereco),
      nota: num(g.nota), avaliacoes: num(g.avaliacoes),
      logo: texto(extra.logo || ''),
      cores: extra.cores || lm.cores || null,
      fontes: extra.fontes || lm.fontes || null,
      base: baseValida(extra.base || lm.base) || 1,
      rt: texto(extra.rt || lm.rt),
      token: texto(extra.token || '')
    };
  }

  function validar(v) {
    var erros = [], avisos = [];
    if (!v.nome) erros.push('Falta o nome do cliente.');
    if (!v.cidade) erros.push('Falta a cidade do cliente.');
    if (!v.servico) erros.push('Falta o serviço principal (primeiro de servicos_foco).');
    if (v.token && !TOKEN.test(v.token)) erros.push('Endereço do modelo inválido: use 12 letras minúsculas ou números.');
    if (v.logo && !/^logo\.(png|jpg|jpeg|webp|svg)$/.test(v.logo)) erros.push('Logo do cliente precisa se chamar logo.png, logo.jpg, logo.webp ou logo.svg.');
    if (!v.logo) avisos.push('Sem logo do cliente: o modelo usa a logo da ' + (v.setor === 'saude' ? 'Win7 Med' : 'Win7') + '.');
    if (!v.telefone) avisos.push('Sem telefone no diagnóstico: o modelo mostra "(DDD) 0000-0000".');
    if (!v.endereco) avisos.push('Sem endereço no diagnóstico: o modelo mostra só a cidade.');
    var p = paleta(v.cores), f = fontes(v.fontes);
    erros = erros.concat(p.erros, f.erros);
    return { erros: erros, avisos: avisos, paleta: p.tokens, fontes: f.tokens };
  }

  // ---------------------------------------------------------------- montagem
  var SILHUETA = '<svg class="silhueta" viewBox="0 0 200 220" aria-hidden="true"><circle cx="100" cy="70" r="42" fill="currentColor"/><path d="M20 220c0-52 36-86 80-86s80 34 80 86z" fill="currentColor"/></svg>';
  var PLAY = '<span class="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>';

  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z" fill="currentColor"/></svg>';
  function digitos(t) { return texto(t).replace(/\D/g, ''); }
  /** Blocos condicionais do template: <!--se:x--> ... <!--/se:x--> ficam só quando a marca x está ligada. */
  function blocos(html, marcas) {
    for (var i = 0; i < 4 && /<!--se:/.test(html); i++) {
      html = html.replace(/<!--se:(\w+)-->([\s\S]*?)<!--\/se:\1-->/g, function (m, k, c) { return marcas[k] ? c : ''; });
    }
    return html;
  }

  /**
   * Monta o HTML da página. opcoes: { modelo (texto de modelo.html), base (caminho até as mídias), midia, wa, modo, real }.
   * modo 'modelo' (padrão): demonstração da reunião, com as travas do ADR-006.
   * modo 'real' (ADR-007): a mesma página com os dados do cliente. real: { copy, telefone, whatsapp, endereco, rt, selo,
   *   convenios: [{ nome, logo }], depoimentos: [{ video, poster }], video: { arquivo, poster, alt }, integracoes, logo, raiz }.
   */
  function montar(v, opcoes) {
    opcoes = opcoes || {};
    var real = opcoes.modo === 'real', r = opcoes.real || {};
    var val = validar(v);
    if (real) { var vr = validarReal(v, r); val.erros = val.erros.concat(vr.erros); val.avisos = vr.avisos; }
    if (val.erros.length) return { html: '', erros: val.erros, avisos: val.avisos };
    var voc = M.VOCAB[v.setor === 'geral' ? 'geral' : 'saude'], saude = voc.setor === 'saude';
    var base = texto(opcoes.base) || '../../base/', midia = opcoes.midia || {}, t = val.paleta;
    var rot = saude ? 'Convênio' : 'Parceiro';
    var trocas, html_ = { SELO: 1, VIDEO: 1, CONV_ITENS: 1, CONV_LISTA: 1, DEP_ITENS: 1, COMO_CHEGAR: 1, RT: 1, POLITICA: 1, HERO_BASES: 1, PONTOS: 1, ATENDE: 1, CONV_TOTAL: 1, HEAD_EXTRA: 1, BODY_INICIO: 1, FORM_ATTRS: 1, SCRIPT_FORM: 1, FONTES_LINK: 1, FONTE_TITULO: 1, FONTE_TEXTO: 1, PARC_ITENS: 1, PARC_ACAO: 1 };
    var comuns = Object.assign({}, val.fontes, {
      VERSAO: VERSAO,
      COR_MARCA: t.marca, COR_MARCA_ESCURA: t.marca_escura, COR_DESTAQUE: t.destaque, COR_APOIO: t.apoio,
      COR_TINTA: t.tinta, COR_TEXTO: t.texto, COR_FUNDO_CLARO: t.fundo_claro, COR_LINHA: t.linha, MARCA_RGB: t.marca_rgb,
      NOME: v.nome, NOME_RODAPE: v.nome.toUpperCase(), SERVICO: v.servico, CIDADE: v.cidade, BASE: base, BASE_N: String(v.base),
      CONV_ROTULO: saude ? 'Convênios aceitos' : 'Parceiros', CONV_PLURAL: saude ? 'convênios' : 'parceiros',
      PELA_EMPRESA: voc.pela_empresa, DA_EMPRESA: voc.da_empresa, HEAD_EXTRA: '', BODY_INICIO: '', PONTOS: '', FORM_ATTRS: '', SCRIPT_FORM: '', TEL: '', CONV_TOTAL: '', ATENDE: '',
      PARC_CHAMADA: '', PARC_SELO: '', PARC_SUB: '', PARC_BOTAO: '', PARC_TITULO: '', PARC_TEXTO: '', PARC_ITENS: '', PARC_ACAO: ''
    });
    var marcas = { modelo: !real, real: real, conv: true, dep: true, parc: false };
    if (!real) {
      var servicosSub = (v.servicos.length ? v.servicos : [v.servico]).slice(0, 3);
      var cta = saude ? 'Agendar exame' : 'Agendar ' + voc.servico;
      var fone = v.telefone || '(DDD) 0000-0000';
      var itens = LETRAS.slice(0, 10).map(function (l) { return '<div class="tile"><i aria-hidden="true">' + l + '</i><span>' + rot + ' ' + l + '</span></div>'; });
      var video = midia.hero
        ? '<div class="video" id="video">' + (midia.heroPoster ? '<img src="' + base + 'hero.webp" alt="Vídeo de apresentação" width="1200" height="675" fetchpriority="high">' : '') +
          '<button type="button" data-video="' + base + 'hero.mp4" aria-label="Assistir ao vídeo de apresentação">' + PLAY + '<span class="legenda">Conheça a nossa estrutura</span></button></div>'
        : '<div class="video simulado" id="video"><div class="cena" aria-hidden="true"><span class="tom"></span><span class="anel a3"></span><span class="anel a2"></span><span class="anel a1"></span><span class="luz"></span></div>' +
          '<button type="button" data-aviso-video aria-label="Vídeo de apresentação (modelo)">' + PLAY + '<span class="legenda">Conheça a nossa estrutura</span></button>' +
          '<div class="controles" aria-hidden="true"><span>0:00 / 1:24</span><span class="trilho"><i></i></span></div><span class="etiqueta-ilustr selo-video">Vídeo ilustrativo</span></div>';
      trocas = {
        TITULO: v.servico + ' em ' + v.cidade + (v.uf ? ' ' + v.uf : '') + ' · modelo para aprovação',
        META_DESC: 'Modelo de página para aprovação. Conteúdo ilustrativo, página não publicada.',
        OG_TITULO: 'Modelo de página · ' + v.nome,
        LOGO_SRC: v.logo || base + (saude ? 'logo-win7med.png' : 'logo-win7.png'), LOGO_ALT: v.logo ? v.nome : (saude ? 'Win7 Med' : 'Win7') + ' (logo do cliente entra aqui)',
        FONE: fone,
        // a nota do Google não entra no banner (pedido do Viny, 14/10); o selo só existe com dado confirmado, na página real
        SELO: '', SUB: juntar(servicosSub.map(function (s, i) { return i ? minusculaInicial(s) : s; })) + ' com agendamento rápido pelo WhatsApp.', CTA: cta, VIDEO: video,
        CONV_TITULO: saude ? 'Aceitamos os principais convênios' : 'Trabalhamos com os principais parceiros',
        CONV_ITENS: itens.map(function (h) { return '        <li>' + h + '</li>'; }).concat(itens.map(function (h) { return '        <li class="dup" aria-hidden="true">' + h + '</li>'; })).join('\n'),
        CONV_LISTA: LETRAS.map(function (l) { return '    <li>' + rot.toUpperCase() + ' ' + l + '</li>'; }).join('\n'),
        CONV_SUBT: 'Lista ilustrativa', CONV_RODAPE: 'Na página publicada entra a lista real, enviada ' + voc.pela_empresa + ' no grupo do WhatsApp.',
        DEP_TITULO: 'Depoimentos de ' + voc.clientes_finais,
        DEP_ITENS: [0, 1, 2].map(function (i) {
          var tem = lista(midia.depoimentos)[i];
          return '        <li class="dep">' + SILHUETA + (tem
            ? '<button type="button" data-video="' + base + 'depoimento-' + (i + 1) + '.mp4" aria-label="Assistir ao depoimento ' + (i + 1) + ' (ilustrativo)">' + PLAY + '<span class="rot"><span class="etiqueta-ilustr">Exemplo ilustrativo</span>Depoimento em vídeo</span></button>'
            : '<div class="dep-capa" role="img" aria-label="Depoimento em vídeo (exemplo ilustrativo)"><span class="rot"><span class="etiqueta-ilustr">Exemplo ilustrativo</span>Depoimento em vídeo</span></div>') + '</li>';
        }).join('\n'),
        DEP_NOTA: 'Vídeos curtos, gravados no celular, de quem já foi atendido. Na página publicada entram os depoimentos reais ' + voc.da_empresa + '.' + (saude ? ' Sem promessa de resultado e sem antes e depois.' : ''),
        ENDERECO: v.endereco || (v.cidade + (v.uf ? '/' + v.uf : '')),
        COMO_CHEGAR: v.endereco ? '<a href="https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(v.endereco).replace(/%20/g, '+') + '" target="_blank" rel="noopener">Como chegar</a>' : '',
        RT: saude ? '<p class="rt">RT: ' + esc(v.rt || 'Dr(a). Nome Sobrenome · CRM/UF 00000') + '</p>' : '',
        POLITICA: '<button class="link" type="button" data-abre="aviso-politica">Política de privacidade</button>',
        HERO_BASES: heroBases(v.base, true)
      };
    } else {
      var c = r.copy || {}, raizSite = texto(r.raiz), ig = r.integracoes || {}, integrado = !!(texto(ig.data_cliente) && texto(ig.data_form));
      var wa = digitos(r.whatsapp), wa55 = wa.length >= 12 ? wa : '55' + wa, tel = digitos(r.telefone);
      var convs = lista(r.convenios).filter(function (x) { return x && texto(x.nome); });
      var deps = lista(r.depoimentos).filter(function (x) { return x && texto(x.video); });
      // depoimentos combinados na reunião e ainda não enviados: molduras "Em produção" (nunca depoimento inventado)
      var depsPrev = !deps.length && !!r.depoimentos_previstos;
      marcas.conv = convs.length > 0; marcas.dep = deps.length > 0 || depsPrev;
      // área para clínicas parceiras (B2B): botão no fim da página e pop-up com o WhatsApp comercial
      var pc = r.parceiros && typeof r.parceiros === 'object' ? r.parceiros : null;
      if (pc) {
        marcas.parc = true;
        var waP = digitos(pc.whatsapp) || wa, waP55 = waP.length >= 12 ? waP : '55' + waP;
        var parcTrocas = {
          PARC_SELO: texto(pc.selo) || 'Para clínicas e médicos',
          PARC_CHAMADA: texto(pc.chamada) || 'É clínica ou médico e quer encaminhar pacientes?',
          PARC_SUB: texto(pc.subtitulo) || 'Conheça as condições para parceiros e fale direto com a nossa equipe comercial.',
          PARC_BOTAO: texto(pc.botao) || 'Área para clínicas parceiras',
          PARC_TITULO: texto(pc.titulo) || 'Clínicas parceiras',
          PARC_TEXTO: texto(pc.texto),
          PARC_ITENS: lista(pc.beneficios).length ? '<ul class="parc-lista">' + lista(pc.beneficios).map(function (b) { return '<li>' + CHECK + '<span>' + esc(b) + '</span></li>'; }).join('') + '</ul>' : '',
          PARC_ACAO: '<a class="ok" href="https://api.whatsapp.com/send?phone=' + esc(waP55) + '&amp;text=' + encodeURIComponent(texto(pc.texto_whatsapp) || 'Olá, sou de uma clínica e quero ser parceiro.') + '" target="_blank" rel="noopener" data-evento="clique_whatsapp_parceiros"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="{{WA}}"/></svg>' + esc(texto(pc.cta) || 'Falar com o comercial') + '</a>'
        };
      }
      var tiles = convs.slice(0, 10).map(function (x) {
        return x.logo ? '<img src="' + esc(base + x.logo) + '" alt="' + esc(rot + ' ' + x.nome) + '" width="130" height="130" loading="lazy">' : '<div class="tile nome"><span>' + esc(x.nome) + '</span></div>';
      });
      var ordem = convs.map(function (x) { return texto(x.nome); }).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
      var vd = r.video || null;
      var videoReal = vd && vd.arquivo
        ? '<div class="video" id="video">' + (vd.poster ? '<img src="' + esc(base + vd.poster) + '" alt="' + esc(vd.alt || v.nome) + '" width="1200" height="675" fetchpriority="high">' : '') +
          '<button type="button" data-video="' + esc(base + vd.arquivo) + '" data-evento="play_video_hero" aria-label="Assistir ao vídeo">' + PLAY + '<span class="legenda">' + esc(c.legenda_video || 'Conheça a nossa estrutura') + '</span></button></div>'
        : '<div class="video simulado" id="video"><div class="cena" aria-hidden="true"><span class="tom"></span><span class="anel a3"></span><span class="anel a2"></span><span class="anel a1"></span><span class="luz"></span></div>' +
          '<button type="button" disabled aria-label="Vídeo em produção">' + PLAY + '<span class="legenda">' + esc(c.legenda_video || 'Conheça a nossa estrutura') + '</span></button><span class="etiqueta-ilustr selo-video">Vídeo em produção</span></div>';
      var gtm = /^GTM-[A-Z0-9]+$/.test(texto(ig.gtm)) ? texto(ig.gtm) : '', ads = /^AW-\d+$/.test(texto(ig.google_ads)) ? texto(ig.google_ads) : '';
      var head = (gtm ? "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','" + gtm + "');</script>" : '') +
        (ads && !gtm ? '<script async src="https://www.googletagmanager.com/gtag/js?id=' + ads + '"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + ads + '");</script>' : '');
      var attrs = integrado
        ? 'data-win7-form data-cliente="' + esc(ig.data_cliente) + '" data-form="' + esc(ig.data_form) + '" data-whatsapp="' + esc(wa55) + '" data-texto="' + esc(c.texto_whatsapp) + '" data-identificacao="' + esc(texto(r.identificacao)) + '"'
        : 'data-pre-integracao data-whatsapp="' + esc(wa55) + '" data-texto="' + esc(c.texto_whatsapp) + '"';
      trocas = {
        TITULO: c.title, META_DESC: c.description, OG_TITULO: c.title,
        LOGO_SRC: base + r.logo, LOGO_ALT: texto(c.alt_logo) || v.nome,
        FONE: r.telefone, TEL: 'tel:+55' + tel,
        SELO: r.selo && texto(r.selo.numero) ? '<p class="selo"><b>' + esc(r.selo.numero) + '</b>' + esc(r.selo.texto) + '</p>' : '',
        SUB: c.subtitulo, CTA: c.cta, VIDEO: videoReal,
        PONTOS: lista(c.pontos).length ? '<ul class="pontos">' + lista(c.pontos).map(function (p) { return '<li>' + CHECK + '<span>' + esc(p) + '</span></li>'; }).join('') + '</ul>' : '',
        CONV_TITULO: c.conv_titulo || (saude ? 'Aceitamos os principais convênios' : 'Trabalhamos com os principais parceiros'),
        CONV_ITENS: tiles.map(function (h) { return '        <li>' + h + '</li>'; }).concat(tiles.map(function (h) { return '        <li class="dup" aria-hidden="true">' + h.replace(/ alt="[^"]*"/, ' alt=""') + '</li>'; })).join('\n'),
        CONV_LISTA: ordem.map(function (n) { return '    <li>' + esc(n) + '</li>'; }).join('\n'),
        CONV_TOTAL: ' (' + convs.length + ')', CONV_SUBT: convs.length + ' ' + (saude ? (convs.length > 1 ? 'convênios' : 'convênio') : (convs.length > 1 ? 'parceiros' : 'parceiro')),
        CONV_RODAPE: 'Não encontrou o seu? Fale com a gente pelo WhatsApp.',
        DEP_TITULO: c.dep_titulo || 'Depoimentos de ' + voc.clientes_finais,
        DEP_ITENS: depsPrev
          ? [0, 1, 2].map(function () { return '        <li class="dep">' + SILHUETA + '<div class="dep-capa" role="img" aria-label="Depoimento em vídeo em produção"><span class="rot"><span class="etiqueta-ilustr">Em produção</span>Depoimento em vídeo</span></div></li>'; }).join('\n')
          : deps.map(function (x, i) {
          return '        <li class="dep">' + (x.poster ? '<img src="' + esc(base + x.poster) + '" alt="" loading="lazy">' : '') + '<button type="button" data-video="' + esc(base + x.video) + '" aria-label="Assistir ao depoimento ' + (i + 1) + '">' + PLAY + '</button></li>';
        }).join('\n'),
        DEP_NOTA: '',
        ENDERECO: r.endereco,
        COMO_CHEGAR: r.como_chegar === false ? '' : '<a href="https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(r.endereco).replace(/%20/g, '+') + '" target="_blank" rel="noopener" data-evento="clique_como_chegar">Como chegar</a>',
        RT: saude ? '<p class="rt">RT: ' + esc(r.rt) + '</p>' : '',
        POLITICA: '<a href="' + esc(raizSite) + 'politica-de-privacidade/">Política de privacidade</a>',
        HERO_BASES: heroBases(v.base, false),
        ATENDE: lista(r.atende).length ? '<span class="atende">Atendemos também quem vem de ' + esc(juntar(lista(r.atende))) + '.</span>' : '',
        HEAD_EXTRA: head,
        BODY_INICIO: gtm ? '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' + gtm + '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>' : '',
        FORM_ATTRS: attrs,
        SCRIPT_FORM: integrado ? '<script src="' + esc(base) + 'win7-form.js"' + (texto(ig.data_token) ? ' data-token="' + esc(ig.data_token) + '"' : '') + ' defer></script>' : ''
      };
      if (pc) Object.assign(trocas, parcTrocas);
    }
    trocas = Object.assign({}, comuns, trocas);
    var html = blocos(String(opcoes.modelo || ''), marcas).replace(/\{\{([A-Z_0-9]+)\}\}/g, function (m, k) {
      if (k === 'WA') return m;
      if (!(k in trocas)) return m;
      return html_[k] ? trocas[k] : esc(trocas[k]);
    });
    html = html.split('{{WA}}').join(opcoes.wa || '');
    var restos = html.match(/\{\{[A-Z_0-9]+\}\}/g);
    return { html: restos ? '' : html, erros: restos ? ['Marcador sem valor no modelo: ' + restos.join(', ')] : [], avisos: val.avisos };
  }

  /** Dados mínimos da página real (ADR-007). Pendência de cadastro vira aviso; dado errado vira erro. */
  function validarReal(v, r) {
    var erros = [], avisos = [], c = r.copy || {}, saude = v.setor !== 'geral';
    ['title', 'description', 'subtitulo', 'cta', 'texto_whatsapp'].forEach(function (k) { if (!texto(c[k])) erros.push('Falta copy.' + k + ' da página de ' + v.servico + '.'); });
    if (!/^logo\.(png|jpg|webp|svg)$/.test(texto(r.logo))) erros.push('Falta a logo do cliente (logo.png, logo.jpg, logo.webp ou logo.svg).');
    if (digitos(r.telefone).length < 10) erros.push('Telefone da página inválido: use DDD e número.');
    var w = digitos(r.whatsapp); if ([10, 11, 12, 13].indexOf(w.length) < 0) erros.push('WhatsApp que recebe os contatos inválido: use DDD e número (celular ou fixo com WhatsApp Business).');
    if (!texto(r.endereco)) erros.push('Falta o endereço da página.');
    if (saude && !texto(r.rt)) avisos.push('RT pendente: a página de saúde não vai ao domínio sem o nome e o CRM do responsável técnico.');
    var ig = r.integracoes || {};
    if (!(texto(ig.data_cliente) && texto(ig.data_form))) avisos.push('Pré-integração: sem os IDs do formulário Win7 o envio só abre o WhatsApp e não grava o lead.');
    if (!texto(ig.gtm) && !texto(ig.google_ads)) avisos.push('Sem GTM nem Google Ads: a conversão ainda não é medida.');
    if (!(r.video && r.video.arquivo)) avisos.push('Vídeo da página ainda em produção: entra a cena animada com a etiqueta "Vídeo em produção".');
    if (r.depoimentos_previstos && !lista(r.depoimentos).some(function (x) { return x && texto(x.video); })) avisos.push('Depoimentos em vídeo ainda não chegaram: entram 3 molduras "Em produção".');
    if (r.parceiros) {
      if (!texto(r.parceiros.texto)) erros.push('Área de clínicas parceiras sem texto.');
      if (!digitos(r.parceiros.whatsapp)) avisos.push('Área de clínicas parceiras sem WhatsApp comercial próprio: o botão usa o WhatsApp da página até chegar o número.');
    }
    return { erros: erros, avisos: avisos };
  }

  /** Conferência da página real: o que nunca pode ir ao ar. publicar = true exige o que a prévia tolera (RT). */
  function conferirReal(html, opcoes) {
    opcoes = opcoes || {};
    var erros = [], semEstilo = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
    if (!/<meta name="robots" content="noindex/.test(html)) erros.push('Falta noindex (página só para tráfego pago).');
    if (/faixa-modelo|data-modelo|Exemplo ilustrativo|Lista ilustrativa|Convênio [A-J]<|Parceiro [A-J]</.test(semEstilo)) erros.push('Sobrou trecho do modelo na página real.');
    if (!/politica-de-privacidade\/"/.test(html)) erros.push('Falta o link da política de privacidade.');
    if ((html.match(/<h1\b/g) || []).length !== 1) erros.push('A página precisa de exatamente um H1.');
    if (/<form(?![^>]*(data-win7-form|data-pre-integracao))[^>]*>/i.test(html)) erros.push('Formulário sem o padrão Win7.');
    if (/[–—]/.test(semEstilo.replace(/<[^>]+>/g, ' '))) erros.push('Travessão no texto da página.');
    if (opcoes.saude !== false && opcoes.publicar && !/<p class="rt">RT: [^<]{6,}<\/p>/.test(html)) erros.push('Falta o RT: a página de saúde não vai ao domínio sem o responsável técnico.');
    if (/\{\{[A-Z_]+\}\}/.test(html)) erros.push('Marcador sem valor na página.');
    return { erros: erros };
  }

  /** Conferência do HTML final: as travas do conselho por máquina. */
  function conferir(html) {
    var erros = [];
    var semEstilo = html.replace(/<style[\s\S]*?<\/style>/g, '');
    if (!/<meta name="robots" content="noindex/.test(html)) erros.push('Falta noindex.');
    if (!/class="faixa-modelo"/.test(html) || !/Modelo para aprovação/.test(html)) erros.push('Falta a faixa de modelo para aprovação.');
    if (/googletagmanager|gtag\(|fbq\(|connect\.facebook|clarity\.ms|data-win7-form|win7-form\.js/i.test(html)) erros.push('Modelo com rastreamento ou formulário ativo.');
    if (/wa\.me|api\.whatsapp\.com|href="tel:/i.test(semEstilo)) erros.push('Modelo com WhatsApp ou telefone clicável.');
    if (/<form(?![^>]*data-modelo)[^>]*>/i.test(html)) erros.push('Formulário sem a marca de modelo.');
    var visivel = chave(semEstilo.replace(/<[^>]+>/g, ' '));
    CONVENIOS_REAIS.forEach(function (n) { if (new RegExp('\\b' + n + '\\b').test(visivel)) erros.push('Nome de convênio real no modelo: ' + n + '.'); });
    if (/[–—]/.test(semEstilo.replace(/<[^>]+>/g, ' '))) erros.push('Travessão no texto do modelo.');
    var midias = (semEstilo.match(/(?:src|data-video)="([^"]+)"/g) || []).map(function (s) { return s.replace(/^[^"]+"|"$/g, ''); });
    midias.forEach(function (s) { if (/^https?:/i.test(s)) erros.push('Mídia externa no modelo: ' + s + '.'); });
    return { erros: erros };
  }

  /** Caminho relativo à raiz do site dos modelos que pode ser publicado (lista fechada). */
  function midiaPermitida(rel) {
    rel = texto(rel).replace(/\\/g, '/');
    if (/^(index\.html|robots\.txt|\.htaccess)$/.test(rel)) return true;
    return MIDIA_BASE.test(rel) || MIDIA_CLIENTE.test(rel);
  }

  raiz.LpModeloW7 = {
    VERSAO: VERSAO, PALETA_PADRAO: PALETA_PADRAO, CONVENIOS_REAIS: CONVENIOS_REAIS, TOKEN: TOKEN,
    FONTES: FONTES, fontes: fontes, contraste: contraste, paleta: paleta, paletaDaLogo: paletaDaLogo, coresDosPixels: coresDosPixels, BASES: BASES, baseValida: baseValida, sortearBase: sortearBase, heroBases: heroBases, variaveis: variaveis, validar: validar, montar: montar, conferir: conferir, conferirReal: conferirReal, validarReal: validarReal, blocos: blocos, midiaPermitida: midiaPermitida
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
