/* Gerador do Diagnóstico para Google Ads · interface.
   Depende de MotorDiagnostico (motor-diagnostico.js) e de W7 (injetado no build: W7.ativos, W7.cssLaudo, W7.exemplo, W7.links).
   Tudo roda neste navegador. Só no start.win7.ai (W7.start, ADR-008) o diagnóstico e o onboarding ficam salvos no sistema da Win7. */
(function () {
  'use strict';
  var M = window.MotorDiagnostico, W7 = window.W7;
  var $ = function (id) { return document.getElementById(id); };
  var estado = { logoCliente: W7.logoCliente || '', html: '', nomeArquivo: '', dados: null, projeto: null };

  function msg(id, texto, tipo) { var el = $(id); el.textContent = texto; el.className = 'msg' + (tipo ? ' ' + tipo : ''); }
  function hora(iso) { var d = iso ? new Date(iso) : new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function dia(iso) { var d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' às ' + hora(iso); }

  // ---------------------------------------------------------------- start.win7.ai (ADR-008): tudo fica salvo no sistema
  // Só no build do start (W7.start). O Gerador público e o arquivo do cliente continuam sem enviar nada.
  var sistema = W7.start ? (function () {
    function api(metodo, rota, corpo, urgente) {
      var cab = { 'X-Start': '1' }; if (corpo) cab['Content-Type'] = 'application/json';
      return fetch('/api/' + rota, { method: metodo, credentials: 'same-origin', headers: cab, body: corpo ? JSON.stringify(corpo) : undefined, keepalive: !!urgente }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok) return j;
          // sessão vencida: a tela do start mostra o login de novo, sem perder esta página
          if (r.status === 401) { try { window.parent.postMessage({ tipo: 'w7-sessao' }, location.origin); } catch (e) { /* aberto fora do start */ } }
          var er = new Error((j.erro && j.erro.mensagem) || 'Sem conexão com o sistema.'); er.status = r.status; throw er;
        });
      }, function () { throw new Error('Sem conexão com o sistema.'); });
    }
    function situacao(texto, tipo) { var el = $('msg-sistema'); el.hidden = false; msg('msg-sistema', texto, tipo); }
    return {
      api: api, situacao: situacao,
      salvarDiagnostico: function () {
        if (!estado.dados) return Promise.resolve();
        if (/EXEMPLO FICT[ÍI]CIO/i.test(String((estado.dados.meta || {}).aviso || ''))) { situacao('Exemplo fictício: não é salvo no sistema.', ''); return Promise.resolve(); }
        situacao('Salvando no sistema...', '');
        return (estado.salvando = api('POST', 'projetos', { id: estado.projeto ? estado.projeto.id : '', diagnostico: estado.dados, logo: estado.logoCliente || '' }).then(function (r) {
          if (!estado.projeto || estado.projeto.id !== r.id) estado.projeto = { id: r.id, onboarding: null };
          try { history.replaceState(null, '', location.pathname + '?projeto=' + r.id + location.hash); } catch (e) { /* endereço fica como está */ }
          try { window.parent.postMessage({ tipo: 'w7-projeto', id: r.id }, location.origin); } catch (e) { /* fora do start */ }
          situacao((r.novo ? 'Projeto criado' : 'Projeto salvo') + ' no sistema às ' + hora() + '. Ele fica na aba Projetos do start.', 'ok');
        }, function (e) { situacao('Não salvou no sistema: ' + e.message + ' Clique em Gerar de novo antes de sair.', 'erro'); })).then(function () { estado.salvando = null; });
      },
      /** Opções da apresentação: cada resposta e o mapeamento vão para o projeto no sistema. */
      opcoesDeck: function (respostasServidor) {
        var id = estado.projeto && estado.projeto.id;
        if (!id) return null;
        return {
          respostas: respostasServidor || null,
          salvarRespostas: function (r, urgente) { return api('PUT', 'projetos/' + id + '/onboarding', { respostas: r }, urgente); },
          salvarMapa: function (d) { return api('PUT', 'projetos/' + id + '/mapa', { dados: d }); }
        };
      }
    };
  })() : null;

  /** Reduz a imagem no navegador para o diagnóstico não ficar pesado. */
  function lerImagem(arquivo, larguraMax, formato, pronto) {
    if (!/^image\/(png|jpeg|webp)$/.test(arquivo.type)) { pronto(null, 'Use PNG, JPG ou WEBP.'); return; }
    var leitor = new FileReader();
    leitor.onload = function () {
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(1, larguraMax / img.width), c = document.createElement('canvas');
        c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        pronto(c.toDataURL(formato, 0.85));
      };
      img.onerror = function () { pronto(null, 'Não consegui ler essa imagem.'); };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  }

  /** salvar = true só em ação da pessoa (Gerar, abrir arquivo, trocar logo): abrir a página nunca grava nada. */
  function gerar(salvar) {
    var bruto = $('dados').value;
    if (!bruto.trim()) { msg('msg-dados', 'Cole o bloco de dados que o agente entregou.', 'erro'); return; }
    var dados;
    try { dados = M.extrairJson(bruto); } catch (e) { msg('msg-dados', e.message, 'erro'); return; }
    var r = M.gerarLaudo(dados, { css: W7.cssLaudo, ativos: W7.ativos, logoCliente: estado.logoCliente });
    $('res-vazio').hidden = true; $('res-cheio').hidden = false;
    var preencher = function (id, itens) { $(id).innerHTML = ''; itens.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; $(id).appendChild(li); }); };
    preencher('res-erros', r.validacao.erros);
    preencher('res-avisos', r.validacao.avisos.concat(r.travessoes_corrigidos ? [r.travessoes_corrigidos + ' texto(s) com travessão corrigido(s) automaticamente.'] : []));
    preencher('res-oks', r.validacao.ok || []);
    var nome = (dados.cliente && dados.cliente.nome) || 'cliente';
    $('res-cliente').textContent = nome;
    if (!r.html) {
      $('res-placar').textContent = '0'; $('res-placar').className = 'v critico'; $('res-classe').textContent = 'diagnóstico não gerado';
      ['apresentar', 'baixar', 'nova-aba', 'imprimir'].forEach(function (id) { $(id).disabled = true; });
      $('previa').srcdoc = ''; estado.dados = null;
      msg('msg-dados', 'O diagnóstico não foi gerado: corrija os itens em vermelho ou peça ao agente para reenviar o bloco.', 'erro');
      return;
    }
    estado.html = r.html;
    estado.dados = M.normalizar(dados).dados;
    var d = new Date();
    estado.nomeArquivo = 'diagnostico-google-ads-' + M.slug(nome) + '-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.html';
    $('res-placar').textContent = r.placar.geral; $('res-placar').className = 'v ' + r.placar.nivel; $('res-classe').textContent = r.placar.classe.nome;
    ['apresentar', 'baixar', 'nova-aba', 'imprimir'].forEach(function (id) { $(id).disabled = !!r.validacao.erros.length; });
    $('previa').srcdoc = r.html;
    msg('msg-dados', r.validacao.erros.length ? 'Diagnóstico gerado com pendências em vermelho: corrija antes de usar.' : 'Diagnóstico gerado. Na reunião, clique em Apresentar no onboarding.', r.validacao.erros.length ? 'erro' : 'ok');
    try { sessionStorage.setItem('w7-rascunho', bruto); } catch (e) { /* sem rascunho, sem problema */ }
    if (sistema && salvar === true) sistema.salvarDiagnostico();
  }
  function blobUrl() { return URL.createObjectURL(new Blob([estado.html], { type: 'text/html;charset=utf-8' })); }

  $('gerar').addEventListener('click', function () { gerar(true); });
  $('exemplo').addEventListener('click', function () { $('dados').value = JSON.stringify(W7.exemplo, null, 2); gerar(); });
  $('limpar').addEventListener('click', function () { $('dados').value = ''; msg('msg-dados', ''); $('res-vazio').hidden = false; $('res-cheio').hidden = true; $('previa').srcdoc = ''; estado.html = ''; });
  $('arquivo-json').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var leitor = new FileReader(); leitor.onload = function () { $('dados').value = leitor.result; gerar(true); }; leitor.readAsText(f, 'utf-8'); e.target.value = '';
  });
  $('dados').addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') gerar(true); });
  $('logo-cliente').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    lerImagem(f, 600, f.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', function (uri, erro) {
      if (!uri) { msg('msg-dados', erro, 'erro'); return; }
      estado.logoCliente = uri; $('mini-logo').hidden = false; $('remover-logo').hidden = false;
      $('mini-logo').querySelector('img').src = uri; $('mini-logo').querySelector('span').textContent = f.name;
      if ($('dados').value.trim()) gerar(true);
    });
    e.target.value = '';
  });
  $('remover-logo').addEventListener('click', function () { estado.logoCliente = ''; $('mini-logo').hidden = true; $('remover-logo').hidden = true; if (estado.html) gerar(true); });
  $('baixar').addEventListener('click', function () {
    var a = document.createElement('a'); a.href = blobUrl(); a.download = estado.nomeArquivo; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  });
  $('baixar-json').addEventListener('click', function () {
    if (!estado.dados) return;
    var nome = 'diagnostico-' + (M.slug((estado.dados.cliente || {}).nome) || 'cliente') + '.json';
    var url = URL.createObjectURL(new Blob([JSON.stringify(estado.dados, null, 2)], { type: 'application/json' }));
    var a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  });
  function apresentar(respostasServidor) {
    window.OnboardingDeck.abrir(estado.dados, { ativos: W7.ativos, cssLaudo: W7.cssLaudo, logoCliente: estado.logoCliente, sistema: sistema ? sistema.opcoesDeck(respostasServidor) : null });
  }
  $('apresentar').addEventListener('click', function () {
    if (!estado.dados || !window.OnboardingDeck) return;
    if (!sistema) { apresentar(null); return; }
    // no start, o onboarding sempre tem projeto: se o diagnóstico ainda não foi salvo (rascunho da aba), salva antes
    (estado.salvando || (estado.projeto ? Promise.resolve() : sistema.salvarDiagnostico())).then(function () {
      if (!estado.projeto) { apresentar(null); return; }
      // busca a versão mais nova das respostas: outra pessoa pode ter continuado o onboarding em outro aparelho
      sistema.api('GET', 'projetos/' + estado.projeto.id).then(function (p) { apresentar(p.onboarding ? p.onboarding.respostas : null); }, function () { apresentar(null); });
    });
  });
  $('nova-aba').addEventListener('click', function () { window.open(blobUrl(), '_blank', 'noopener'); });
  $('imprimir').addEventListener('click', function () { var w = $('previa').contentWindow; if (w) { w.focus(); w.print(); } });
  $('ver-pc').addEventListener('click', function () { $('previa').className = ''; $('ver-pc').setAttribute('aria-pressed', 'true'); $('ver-cel').setAttribute('aria-pressed', 'false'); });
  $('ver-cel').addEventListener('click', function () { $('previa').className = 'celular'; $('ver-cel').setAttribute('aria-pressed', 'true'); $('ver-pc').setAttribute('aria-pressed', 'false'); });
  $('copiar-ativacao').addEventListener('click', function () {
    var texto = 'Atue como o Agente de Diagnóstico Win7 Med descrito neste link e comece o diagnóstico: ' + W7.links.repo;
    var ok = function () { msg('msg-ativacao', 'Mensagem copiada. Cole na conversa com a IA e envie.', 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, function () { msg('msg-ativacao', texto, ''); });
    else msg('msg-ativacao', texto, '');
  });

  $('copiar-robo3').addEventListener('click', function () {
    var texto = window.OnboardingW7 ? window.OnboardingW7.ativacaoRobo3() : '';
    var ok = function () { msg('msg-robo3', 'Comando copiado. Cole numa conversa nova do Claude Code.', 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, function () { msg('msg-robo3', texto, ''); });
    else msg('msg-robo3', texto, '');
  });

  // a ferramenta abre já mostrando um diagnóstico de exemplo (ou o último rascunho desta aba)
  // Gerador de um cliente (W7.fixo): abre sempre com os dados dele, nunca com o rascunho de outra aba
  var rascunho = null; if (!W7.fixo) { try { rascunho = sessionStorage.getItem('w7-rascunho'); } catch (e) { rascunho = null; } }
  if (sistema && /[?&]novo=1/.test(location.search)) rascunho = null;  // Novo projeto, no start: começa do exemplo
  // no start, ?projeto=<id> abre um projeto salvo (aba Projetos): diagnóstico, logo e, ao apresentar, as respostas da reunião
  var idProjeto = sistema ? (/[?&]projeto=([a-f0-9]{16})(?![a-f0-9])/.exec(location.search) || [])[1] : null;
  if (idProjeto) {
    $('dados').value = ''; sistema.situacao('Abrindo o projeto salvo...', '');
    sistema.api('GET', 'projetos/' + idProjeto).then(function (p) {
      estado.projeto = { id: p.id }; estado.logoCliente = p.logo || '';
      if (estado.logoCliente) { $('mini-logo').hidden = false; $('remover-logo').hidden = false; $('mini-logo').querySelector('img').src = estado.logoCliente; $('mini-logo').querySelector('span').textContent = 'logo salva no projeto'; }
      $('dados').value = JSON.stringify(p.diagnostico, null, 2);
      gerar();
      sistema.situacao('Projeto salvo no sistema: atualizado por ' + (p.atualizado_por || 'alguém da equipe') + ' em ' + dia(p.atualizado_em) + '.', 'ok');
    }, function (e) {
      sistema.situacao('Não consegui abrir o projeto: ' + e.message, 'erro');
      $('dados').value = JSON.stringify(W7.exemplo, null, 2); gerar();
    });
  } else {
    $('dados').value = rascunho || JSON.stringify(W7.exemplo, null, 2);
    gerar();
  }
  // arquivo de onboarding de um cliente: abre direto na apresentação (Sair volta para o diagnóstico)
  if (W7.fixo && estado.dados && window.OnboardingDeck) window.OnboardingDeck.abrir(estado.dados, { ativos: W7.ativos, cssLaudo: W7.cssLaudo, logoCliente: estado.logoCliente });
})();
