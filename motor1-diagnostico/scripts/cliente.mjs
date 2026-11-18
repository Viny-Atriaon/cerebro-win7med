// Cérebro Win7 · comando único do chat (ADR-006): a partir do bloco de dados de um cliente, gera
//   1. o Diagnóstico para Google Ads (HTML, com a logo do cliente se houver);
//   2. o arquivo do onboarding: o Gerador já aberto com este cliente (diagnóstico + "Apresentar no onboarding");
//   3. a landing page MODELO no site de modelos (https://modelo.win7.ai/m/<12 letras>/), com faixa de modelo,
//      formulário sem efeito, convênios e depoimentos ilustrativos;
//   4. com --publicar, envia o modelo ao servidor e confere no ar.
// Uso: node motor1-diagnostico/scripts/cliente.mjs clientes/<slug>/diagnostico.json [--logo arquivo] [--servico "Tomografia"] [--dominios]
//      [--base 1|2|3] [--cores "#hex,#hex"] [--fundo "#hex"] [--fontes "Título,Texto"] [--recalcular-cores] [--publicar]
// --dominios refaz as sugestões de domínio e a conferência no Registro.br.
// --base escolhe o fundo do banner (1 Órbitas, 2 Ondas, 3 Varredura); sem ela, sorteia sem repetir o cliente anterior.
// --cores força as cores da marca; sem ela, as cores saem da logo (cores_logo.py) e ficam gravadas no bloco.
// --fundo usa o fundo escuro do site do cliente (grafite ou preto, 7:1 com o branco); a cor da marca vira o destaque.
// --fontes usa as fontes do site do cliente ("Bebas Neue,Montserrat": título e texto), da lista fechada do Google Fonts.
// O link do modelo fica gravado no próprio bloco (lp_modelo.url) e aparece no diagnóstico e na apresentação.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregarMotor, carregarAtivos, carregarCss } from './gerar.mjs';
import { montarGerador } from '../../scripts/build.mjs';

const M1 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(M1, '..');
export const SITE_MODELOS = 'https://modelo.win7.ai';
const PASTA_MODELOS = path.join(RAIZ, 'clientes', '_lp-modelos');
const ler = (p) => fs.readFileSync(p, 'utf8');

export async function carregarLp() {
  const M = await carregarMotor();
  await import(pathToFileURL(path.join(M1, 'lp-modelo', 'lp-modelo.js')).href);
  await import(pathToFileURL(path.join(M1, 'onboarding', 'onboarding.js')).href);
  return { M, L: globalThis.LpModeloW7, O: globalThis.OnboardingW7 };
}

/** Confere no Registro.br se cada domínio sugerido está livre (status 0) ou registrado (status 2). Sem rede, fica "verificar". */
export async function conferirDominios(dominios) {
  const hoje = new Date().toISOString().slice(0, 10), out = [];
  for (const d of dominios) {
    let status = 'verificar';
    if (/\.br$/.test(d)) {
      try {
        const r = await fetch(`https://registro.br/v2/ajax/avail/raw/${encodeURIComponent(d)}`, { signal: AbortSignal.timeout(8000) });
        const j = await r.json();
        status = j.status === 0 ? 'disponivel' : j.status === 2 ? 'registrado' : j.status === 3 ? 'invalido' : 'verificar';
      } catch { status = 'verificar'; }
    }
    out.push({ dominio: d, status, conferido_em: hoje });
  }
  return out;
}

/** O que existe na pasta base (vídeo de apresentação e depoimentos base da Win7). */
export function midiaBase(pastaBase = path.join(M1, 'lp-modelo', 'base')) {
  const tem = (n) => fs.existsSync(path.join(pastaBase, n));
  return { hero: tem('hero.mp4'), heroPoster: tem('hero.webp'), depoimentos: [1, 2, 3].map((i) => tem(`depoimento-${i}.mp4`)) };
}

export function caminhoWa() {
  const m = ler(path.join(M1, 'lp-modelo', 'icone-whatsapp.txt')).trim();
  return m;
}

/** Monta a pasta local do site de modelos: raiz, base (lista fechada) e a página do cliente. */
export function prepararSite(L, destino) {
  fs.mkdirSync(path.join(destino, 'base'), { recursive: true });
  fs.mkdirSync(path.join(destino, 'm'), { recursive: true });
  for (const n of ['index.html', 'robots.txt', '.htaccess']) fs.copyFileSync(path.join(M1, 'lp-modelo', 'raiz', n), path.join(destino, n));
  const base = path.join(M1, 'lp-modelo', 'base');
  for (const n of fs.readdirSync(base)) {
    if (!L.midiaPermitida('base/' + n)) throw new Error(`Arquivo fora da lista de mídia permitida na base: ${n}. Só entram a base da Win7 e a logo do cliente.`);
    fs.copyFileSync(path.join(base, n), path.join(destino, 'base', n));
  }
}

const ARQ_ULTIMA_BASE = path.join(PASTA_MODELOS, 'ultima-base.json');
function lerUltimaBase() { try { return JSON.parse(ler(ARQ_ULTIMA_BASE)).base || 0; } catch { return 0; } }
function gravarUltimaBase(n) { fs.mkdirSync(PASTA_MODELOS, { recursive: true }); fs.writeFileSync(ARQ_ULTIMA_BASE, JSON.stringify({ base: n, em: new Date().toISOString() }) + '\n', 'utf8'); }

/** Cores principais da logo (Python + Pillow; SVG lido como texto). Sem Python ou sem cor: lista vazia. */
export function coresDaLogo(arquivo) {
  const py = spawnSync('python', ['-X', 'utf8', path.join(M1, 'scripts', 'cores_logo.py'), arquivo], { encoding: 'utf8' });
  try { return JSON.parse(py.stdout).cores || []; } catch { return []; }
}

function lerRegistro() { try { return JSON.parse(ler(path.join(PASTA_MODELOS, 'registro.json'))); } catch { return {}; } }
function gravarRegistro(r) { fs.mkdirSync(PASTA_MODELOS, { recursive: true }); fs.writeFileSync(path.join(PASTA_MODELOS, 'registro.json'), JSON.stringify(r, null, 2) + '\n', 'utf8'); }
function novoToken() { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; return Array.from(crypto.randomBytes(12), (b) => a[b % 36]).join(''); }

async function principal() {
  const args = process.argv.slice(2);
  const entrada = args.find((a) => !a.startsWith('--') && /\.json$/i.test(a));
  if (!entrada) { console.log('Uso: node motor1-diagnostico/scripts/cliente.mjs clientes/<slug>/diagnostico.json [--logo arquivo] [--servico "..."] [--publicar]'); process.exit(2); }
  const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : ''; };
  const { M, L, O } = await carregarLp();
  const pasta = path.dirname(path.resolve(entrada));
  const bruto = M.extrairJson(ler(entrada));
  const dados = M.normalizar(bruto).dados;
  const nome = (dados.cliente && dados.cliente.nome) || '';
  const slug = M.slug(nome);
  if (!slug) { console.log('❌ Falta cliente.nome no bloco de dados.'); process.exit(1); }

  // endereço do modelo: o mesmo token em todas as gerações do mesmo cliente
  const registro = lerRegistro();
  const reg = registro[slug] || { token: novoToken(), criado_em: new Date().toISOString() };
  const url = `${SITE_MODELOS}/m/${reg.token}/`;
  bruto.lp_modelo = Object.assign({}, bruto.lp_modelo || {}, { url });
  if (val('--servico')) bruto.lp_modelo.servico = val('--servico');
  // domínios sugeridos para a página, conferidos no Registro.br (refaz com --dominios)
  if (!Array.isArray(bruto.lp_modelo.dominios) || !bruto.lp_modelo.dominios.length || args.includes('--dominios')) {
    const sug = O.sugerirDominios(M.normalizar(bruto).dados);
    if (sug.length) {
      bruto.lp_modelo.dominios = await conferirDominios(sug);
      console.log('🌐 domínios: ' + bruto.lp_modelo.dominios.map((x) => x.dominio + ' (' + ({ disponivel: 'livre', registrado: 'registrado', invalido: 'inválido', verificar: 'a conferir' })[x.status] + ')').join(' · '));
    }
  }
  // logo: --logo, ou logo.* já na pasta do cliente
  let logoArq = val('--logo');
  if (!logoArq) logoArq = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp', 'logo.svg'].map((n) => path.join(pasta, n)).find((p) => fs.existsSync(p)) || '';
  const ext = logoArq ? path.extname(logoArq).toLowerCase().replace('.jpeg', '.jpg') : '';
  if (logoArq && !['.png', '.jpg', '.webp', '.svg'].includes(ext)) { console.log('❌ Logo precisa ser PNG, JPG, WEBP ou SVG.'); process.exit(1); }

  // cores da página: informadas no chat > tiradas da logo > paleta da Win7 (ADR-007, etapa A)
  const vetadas = (bruto.restricoes || {}).cores_vetadas || [];
  // fundo escuro do site do cliente (--fundo, ou o já gravado): pode ser grafite ou preto, com 7:1 sobre o branco
  const fundo = (val('--fundo') || ((bruto.lp_modelo.cores || {}).fundo_site) || '').toLowerCase();
  if (fundo && !(/^#[0-9a-f]{6}$/.test(fundo) && L.contraste('#ffffff', fundo) >= 7)) { console.log('❌ --fundo precisa ser #rrggbb escuro, com contraste 7:1 sobre o branco.'); process.exit(1); }
  const comFundo = (p) => (p && fundo ? Object.assign(p, { fundo_site: fundo }) : p);
  if (val('--cores') || (val('--fundo') && bruto.lp_modelo.cores && bruto.lp_modelo.cores.origem === 'informada')) {
    const lista = val('--cores') ? val('--cores').split(',').map((x) => x.trim()) : [bruto.lp_modelo.cores.marca];
    const p = L.paletaDaLogo(lista, vetadas, { escura: fundo });
    if (!p) { console.log('❌ --cores precisa de ao menos uma cor com saturação em #rrggbb (preto, branco e cinza não servem).'); process.exit(1); }
    bruto.lp_modelo.cores = comFundo(Object.assign(p, { origem: 'informada' }));
  } else if (logoArq && (!bruto.lp_modelo.cores || args.includes('--recalcular-cores') || val('--fundo'))) {
    const daLogo = coresDaLogo(logoArq), p = L.paletaDaLogo(daLogo, vetadas, { escura: fundo });
    if (p) bruto.lp_modelo.cores = comFundo(Object.assign(p, { origem: 'logo', da_logo: daLogo.map((c) => c.hex) }));
    else { delete bruto.lp_modelo.cores; console.log('⚠️  A logo não tem cor (preto, branco ou cinza): a página fica com a paleta da Win7. Informe a cor da marca com --cores "#rrggbb".'); }
  }
  // fontes do site do cliente: --fontes "Título,Texto" (uma só vale para os dois); lista fechada do Google Fonts
  if (val('--fontes')) {
    const [titulo, texto] = val('--fontes').split(',').map((x) => x.trim());
    const f = L.fontes({ titulo, texto: texto || titulo });
    if (f.erros.length) { f.erros.forEach((e) => console.log('❌ ' + e)); process.exit(1); }
    bruto.lp_modelo.fontes = { titulo: f.titulo, texto: f.texto };
  }
  if (bruto.lp_modelo.fontes) console.log('🔤 fontes: título ' + bruto.lp_modelo.fontes.titulo + ' · texto ' + bruto.lp_modelo.fontes.texto);
  const cs = bruto.lp_modelo.cores;
  console.log('🎨 cores ' + (cs ? '(' + cs.origem + '): marca ' + cs.marca + ' · fundo ' + cs.marca_escura + ' · destaque ' + cs.destaque + ' · apoio ' + cs.apoio : '(paleta da Win7)'));

  // base do banner: --base, ou a já gravada, ou sorteio sem repetir o cliente anterior
  if (val('--base')) {
    if (!L.baseValida(val('--base'))) { console.log('❌ --base precisa ser 1 (Órbitas), 2 (Ondas) ou 3 (Varredura).'); process.exit(1); }
    bruto.lp_modelo.base = +val('--base');
  } else if (!L.baseValida(bruto.lp_modelo.base)) {
    bruto.lp_modelo.base = L.sortearBase(lerUltimaBase(), Math.random());
    gravarUltimaBase(bruto.lp_modelo.base);
  }
  console.log('🌀 banner: base ' + bruto.lp_modelo.base + ' · ' + L.BASES[bruto.lp_modelo.base - 1].nome + (val('--base') ? '' : ' (troque com --base 1, 2 ou 3)'));

  fs.writeFileSync(entrada, JSON.stringify(bruto, null, 2) + '\n', 'utf8');
  const dadosFinais = M.normalizar(bruto).dados;
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[ext];
  const logoDataUri = logoArq && ext !== '.svg' ? `data:${mime};base64,${fs.readFileSync(logoArq).toString('base64')}` : '';

  // 1. diagnóstico
  const r = M.gerarLaudo(dadosFinais, { css: carregarCss(), ativos: carregarAtivos(), logoCliente: logoDataUri });
  r.validacao.avisos.forEach((a) => console.log('⚠️  ' + a));
  r.validacao.erros.forEach((e) => console.log('❌ ' + e));
  if (!r.html) { console.log('RESULTADO: diagnóstico não gerado, corrija os erros acima.'); process.exit(1); }
  const arqDiag = path.join(pasta, `diagnostico-google-ads-${slug}.html`);
  fs.writeFileSync(arqDiag, r.html, 'utf8');

  // 2. onboarding (Gerador com este cliente)
  const arqOnb = path.join(pasta, `onboarding-${slug}.html`);
  fs.writeFileSync(arqOnb, await montarGerador({ cliente: bruto, logoCliente: logoDataUri }), 'utf8');

  // 3. LP modelo
  const site = path.join(PASTA_MODELOS, 'site');
  prepararSite(L, site);
  const pastaLp = path.join(site, 'm', reg.token);
  fs.mkdirSync(pastaLp, { recursive: true });
  for (const n of fs.readdirSync(pastaLp)) if (/^logo\./.test(n)) fs.unlinkSync(path.join(pastaLp, n));
  if (logoArq) fs.copyFileSync(logoArq, path.join(pastaLp, 'logo' + ext));
  const v = L.variaveis(dadosFinais, { logo: logoArq ? 'logo' + ext : '', token: reg.token, servico: bruto.lp_modelo.servico, cores: bruto.lp_modelo.cores, fontes: bruto.lp_modelo.fontes, base: bruto.lp_modelo.base });
  const lp = L.montar(v, { modelo: ler(path.join(M1, 'lp-modelo', 'modelo.html')), base: '../../base/', midia: midiaBase(), wa: caminhoWa() });
  lp.avisos.forEach((a) => console.log('⚠️  LP: ' + a));
  if (!lp.html) { lp.erros.forEach((e) => console.log('❌ LP: ' + e)); process.exit(1); }
  const conf = L.conferir(lp.html);
  if (conf.erros.length) { conf.erros.forEach((e) => console.log('❌ LP: ' + e)); process.exit(1); }
  fs.writeFileSync(path.join(pastaLp, 'index.html'), lp.html, 'utf8');
  registro[slug] = Object.assign(reg, { nome, url, pasta: path.relative(RAIZ, pasta).split(path.sep).join('/'), atualizado_em: new Date().toISOString() });
  gravarRegistro(registro);

  console.log(`✅ diagnóstico: ${arqDiag} · placar ${r.placar.geral} de 100`);
  console.log(`✅ onboarding: ${arqOnb} (abre já com o cliente; botão "Apresentar no onboarding")`);
  console.log(`✅ LP modelo: ${path.join(pastaLp, 'index.html')}`);

  // 4. publicação
  if (args.includes('--publicar')) {
    const py = spawnSync('python', ['-X', 'utf8', path.join(M1, 'scripts', 'publicar_lp_modelo.py'), site, '--token', reg.token], { stdio: 'inherit' });
    if (py.status !== 0) { console.log('❌ publicação falhou: o modelo ficou só no computador.'); process.exit(1); }
  }
  console.log(`🔗 ${url}`);
  console.log(`➡️  Depois da reunião: no resumo da apresentação, "Copiar ativação do robô 3" (pasta ${path.relative(RAIZ, pasta).split(path.sep).join("/")}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal();
