/*!
 * win7-form.js — formulário NATIVO da landing page (substitui o iframe de
 * formularios.win7.com.br/whatsapp/).
 *
 * POR QUE EXISTE
 * Toda LP de cliente carregava o formulário de WhatsApp em iframe. Com as LPs
 * no nosso servidor, o formulário passa a ser HTML da própria página, mas o lead
 * tem que alimentar exatamente o que o iframe alimentava: TBL_LEADS do cliente,
 * e-mail para a clínica, gclid para conversão offline e ROI. Por isso o script
 * chama o MESMO endpoint que o iframe chama (registrar_whatsapp), com os mesmos
 * parâmetros, e em paralelo manda a atribuição completa (UTM/fbclid/página) ao
 * Portal, que o iframe nunca conseguiu mandar.
 *
 * COMO USAR (os dois IDs vêm da tela "Editar cliente" do sistema antigo)
 *   <form data-win7-form
 *         data-cliente="ID Criptografada"
 *         data-form="ID Form"
 *         data-whatsapp="5561999999999"   (reserva: vale o número do sistema)
 *         data-texto="Olá, tenho interesse nos seus serviços">
 *     <input name="nome" placeholder="Seu nome">
 *     <input name="telefone" type="tel" placeholder="Seu WhatsApp" required>
 *     <button type="submit">Iniciar</button>
 *   </form>
 *   <script src="win7-form.js" data-token="win7_site_XXXX" defer></script>
 *
 * NÚMERO DO WHATSAPP
 * Quem manda é o sistema (Editar cliente > LP WhatsApps). No envio, o script
 * consulta o número da vez em numero_atual (mesma regra e mesma rotação do
 * iframe). data-whatsapp só é usado se o sistema estiver em "Buscar no banco =
 * Não" ou fora do ar. Antes o número fixo do HTML ia como nova lista e
 * regravava o banco a cada lead, desfazendo a troca feita no sistema.
 *
 * Atributos opcionais do <form>:
 *   data-identificacao  unidade/página (vira " - X" no nome do lead, como no iframe)
 *   data-obrigado       URL de obrigado; a página vai pra lá depois de abrir o WhatsApp
 *   data-pagina         nome da LP para o relatório de atribuição (padrão: <title>)
 *   data-especialidade  especialidade da LP para o relatório de atribuição
 * Atributos opcionais do <script>:
 *   data-token          token win7_site_ do cliente (sem ele, só o legado é alimentado)
 *   data-legado / data-portal / data-numero  troca os endpoints (testes)
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var cfg = function (nome, padrao) {
    return (script && script.getAttribute(nome)) || padrao;
  };

  var LEGADO = cfg("data-legado", "https://formularios.win7.com.br/whatsapp/php/registrar_whatsapp");
  var NUMERO = cfg("data-numero", "https://formularios.win7.com.br/whatsapp/php/numero_atual");
  var PORTAL = cfg("data-portal", "https://app.win7med.com.br/api/capture/lead");
  var TOKEN = cfg("data-token", null);

  var CHAVE_ATRIBUICAO = "win7_attr_v1"; // mesma chave do win7-capture.js do Portal
  var VALIDADE_DIAS = 30;
  var CAMPOS_ATRIBUICAO = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
  var HONEYPOT = "win7_site_url";

  // ---- Atribuição: a UTM chega na primeira página, o envio acontece depois ----

  function lerArmazenado() {
    try {
      var bruto = JSON.parse(localStorage.getItem(CHAVE_ATRIBUICAO) || "null");
      if (bruto && bruto.exp > Date.now()) return bruto.dados || {};
    } catch (e) {
      /* storage bloqueado: segue só com a URL */
    }
    return {};
  }

  function atribuicao() {
    var dados = lerArmazenado();
    var daUrl = {};
    try {
      var p = new URLSearchParams(window.location.search);
      CAMPOS_ATRIBUICAO.forEach(function (c) {
        var v = p.get(c);
        if (v) daUrl[c] = v;
      });
    } catch (e) {
      /* navegador antigo */
    }
    // Chegou campanha nova pela URL: ela substitui a anterior inteira, para não
    // misturar utm de um anúncio com gclid de outro.
    if (Object.keys(daUrl).length) {
      dados = daUrl;
      try {
        localStorage.setItem(
          CHAVE_ATRIBUICAO,
          JSON.stringify({ dados: dados, exp: Date.now() + VALIDADE_DIAS * 864e5 })
        );
      } catch (e) {
        /* sem storage */
      }
    }
    if (!dados.gclid) {
      try {
        dados.gclid = sessionStorage.getItem("win7_gclid") || undefined; // gclid-capture.js antigo
      } catch (e) {
        /* sem storage */
      }
    }
    return dados;
  }

  atribuicao(); // grava já na chegada, mesmo que o envio seja em outra página

  // ---- Telefone: mesma máscara do iframe, (61) 99999-9999 ----

  function digitos(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function mascarar(v) {
    var d = digitos(v).replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  function telefoneValido(v) {
    var d = digitos(v);
    if (d.length !== 10 && d.length !== 11) return false;
    if (Number(d.slice(0, 2)) < 11) return false; // DDD não existe abaixo de 11
    if (d.length === 11 && d.charAt(2) !== "9") return false; // celular começa com 9
    return !/^(\d)\1+$/.test(d); // 00000000000, 99999999999...
  }

  // ---- Número da vez, lido do sistema ----

  function numeroDoSistema(form) {
    var id = form.getAttribute("data-cliente");
    var reserva = { numero: digitos(form.getAttribute("data-whatsapp")), lista: "" };
    if (!id || typeof fetch !== "function") return Promise.resolve(reserva);
    var limite = new Promise(function (ok) {
      setTimeout(function () {
        ok(null);
      }, 2500);
    });
    var consulta = fetch(NUMERO + "?id=" + encodeURIComponent(id) + "&t=" + Date.now(), {
      credentials: "omit",
      cache: "no-store",
    })
      .then(function (r) {
        return r.json();
      })
      .catch(function () {
        return null;
      });
    return Promise.race([consulta, limite]).then(function (r) {
      // Lista vazia não regrava o banco (registrar_whatsapp só salva lista com número)
      if (r && r.modo === "banco" && digitos(r.numero)) {
        return { numero: digitos(r.numero), lista: r.nova_lista || "" };
      }
      return reserva;
    });
  }

  // ---- Envio ----

  function enviarLegado(form, nome, telefone, email, gclid, atual) {
    // Mesma ordem e mesmos nomes de parâmetro que o iframe monta hoje
    // (jQuery.serialize() do form + string fixa).
    var whatsapp = atual.numero;
    var p = new URLSearchParams();
    // Sem campo de nome (formulário só de WhatsApp), o parâmetro nem vai, como
    // no iframe; o legado grava "Novo Contato WhatsApp".
    if (form.querySelector('[name="nome"]')) p.append("nome", nome);
    p.append("telefoneLead", telefone);
    if (email) p.append("email", email);
    if (gclid) p.append("gclid", gclid);
    p.append("id", form.getAttribute("data-cliente") || "");
    p.append("texto", form.getAttribute("data-texto") || "");
    p.append("telefoneCliente", whatsapp);
    p.append("identificacao", form.getAttribute("data-identificacao") || "");
    p.append("nova_lista_whatsapps_string", atual.lista);
    p.append("idemails", form.getAttribute("data-form") || "");
    p.append("url", "");
    // no-cors: o legado não manda cabeçalho CORS; a resposta não interessa,
    // só que o request chegue. keepalive garante a entrega mesmo se a página
    // navegar para o WhatsApp ou para o obrigado logo em seguida.
    return fetch(LEGADO + "?" + p.toString(), { mode: "no-cors", keepalive: true, credentials: "omit" });
  }

  function enviarPortal(form, nome, telefone, email, extras, attr) {
    if (!TOKEN) return Promise.resolve();
    var corpo = {
      token: TOKEN,
      name: nome || null,
      phone: telefone,
      email: email || null,
      fields: extras,
      landing_page: {
        name: form.getAttribute("data-pagina") || document.title || null,
        url: window.location.href.slice(0, 1000),
        specialty: form.getAttribute("data-especialidade") || null,
      },
      tracking: {
        utm_source: attr.utm_source || null,
        utm_medium: attr.utm_medium || null,
        utm_campaign: attr.utm_campaign || null,
        utm_term: attr.utm_term || null,
        utm_content: attr.utm_content || null,
        gclid: attr.gclid || null,
        fbclid: attr.fbclid || null,
        referrer: document.referrer || null,
      },
    };
    return fetch(PORTAL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      keepalive: true,
      credentials: "omit",
    });
  }

  function dispararEventos(form) {
    var formId = form.getAttribute("data-form") || "";
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "win7_lead", win7_form_id: formId, win7_lead_tipo: "whatsapp" });
    } catch (e) {
      /* sem GTM */
    }
    try {
      if (typeof window.fbq === "function") window.fbq("track", "Lead");
    } catch (e) {
      /* sem pixel */
    }
  }

  function abrirWhatsApp(form, janela, numero) {
    if (!numero) return;
    var url =
      "https://api.whatsapp.com/send?phone=" +
      numero +
      "&text=" +
      encodeURIComponent(form.getAttribute("data-texto") || "");
    if (janela && !janela.closed) janela.location.href = url;
    else window.location.href = url;
  }

  function erro(form, campo, msg) {
    var alvo = form.querySelector("[data-win7-erro]");
    if (alvo) {
      alvo.textContent = msg;
      alvo.hidden = false;
    } else {
      window.alert(msg);
    }
    if (campo) campo.focus();
  }

  function aoEnviar(ev) {
    ev.preventDefault();
    var form = ev.currentTarget;
    if (form.getAttribute("data-win7-enviando") === "1") return;

    var campoNome = form.querySelector('[name="nome"]');
    var campoTel = form.querySelector('[name="telefone"]');
    var campoEmail = form.querySelector('[name="email"]');
    var aviso = form.querySelector("[data-win7-erro]");
    if (aviso) aviso.hidden = true;

    var nome = campoNome ? campoNome.value.trim() : "";
    var telefone = campoTel ? mascarar(campoTel.value) : "";
    var email = campoEmail ? campoEmail.value.trim() : "";

    if (campoNome && campoNome.required && !nome) return erro(form, campoNome, "Informe seu nome.");
    if (!telefoneValido(telefone)) return erro(form, campoTel, "Informe um WhatsApp válido com DDD.");

    // Robô preencheu o campo invisível: finge sucesso e não grava nada.
    var pote = form.querySelector('[name="' + HONEYPOT + '"]');
    if (pote && pote.value) {
      form.reset();
      return;
    }

    // Abre a aba já no clique (senão o navegador bloqueia o pop-up) e só depois
    // aponta para o WhatsApp, quando os envios já saíram.
    var janela = null;
    if (form.getAttribute("data-whatsapp") && !form.getAttribute("data-obrigado")) {
      try {
        janela = window.open("", "_blank");
      } catch (e) {
        janela = null;
      }
    }

    form.setAttribute("data-win7-enviando", "1");
    var botao = form.querySelector('[type="submit"]');
    if (botao) {
      botao.disabled = true;
      botao.setAttribute("data-texto-original", botao.textContent || botao.value);
      if (botao.tagName === "INPUT") botao.value = "Iniciando...";
      else botao.textContent = "Iniciando...";
    }

    var attr = atribuicao();
    var extras = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || ["nome", "telefone", "email", HONEYPOT].indexOf(el.name) >= 0) return;
      if ((el.type === "checkbox" || el.type === "radio") && !el.checked) return;
      extras[el.name] = el.value;
    });

    var envioPortal = enviarPortal(form, nome, telefone, email, extras, attr);
    dispararEventos(form);

    numeroDoSistema(form).then(function (atual) {
      var envios = [
        enviarLegado(form, nome, telefone, email, attr.gclid, atual),
        envioPortal,
      ].map(function (p) {
        return p.catch(function () {
          /* um destino fora do ar não pode travar o outro nem o WhatsApp */
        });
      });
      // Espera no máximo 1,5 s: o keepalive termina a entrega mesmo depois.
      var limite = new Promise(function (ok) {
        setTimeout(ok, 1500);
      });
      return Promise.race([Promise.all(envios), limite]).then(function () {
        return atual;
      });
    }).then(function (atual) {
      var obrigado = form.getAttribute("data-obrigado");
      if (obrigado) {
        // Com página de obrigado, ela é quem leva ao WhatsApp (botão ou redirect).
        window.location.href = obrigado;
        return;
      }
      abrirWhatsApp(form, janela, atual.numero);
      form.reset();
      form.removeAttribute("data-win7-enviando");
      if (botao) {
        botao.disabled = false;
        var original = botao.getAttribute("data-texto-original");
        if (botao.tagName === "INPUT") botao.value = original;
        else botao.textContent = original;
      }
    });
  }

  function preparar(form) {
    if (form.getAttribute("data-win7-pronto")) return;
    form.setAttribute("data-win7-pronto", "1");
    form.setAttribute("novalidate", "");

    var tel = form.querySelector('[name="telefone"]');
    if (tel) {
      tel.setAttribute("inputmode", "tel");
      tel.setAttribute("maxlength", "15");
      tel.addEventListener("input", function () {
        tel.value = mascarar(tel.value);
      });
    }

    if (!form.querySelector('[name="' + HONEYPOT + '"]')) {
      var pote = document.createElement("input");
      pote.type = "text";
      pote.name = HONEYPOT;
      pote.tabIndex = -1;
      pote.autocomplete = "off";
      pote.setAttribute("aria-hidden", "true");
      pote.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0";
      form.appendChild(pote);
    }

    form.addEventListener("submit", aoEnviar);
  }

  function iniciar() {
    Array.prototype.forEach.call(document.querySelectorAll("form[data-win7-form]"), preparar);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  window.Win7Form = { preparar: preparar, mascarar: mascarar, telefoneValido: telefoneValido };
})();
