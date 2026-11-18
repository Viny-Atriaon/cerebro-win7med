// Cérebro Win7 · Robô 3 (ADR-007): da transcrição da reunião à página no ar, a partir de uma PASTA LOCAL do cliente.
// Uso: node motor2-execucao/scripts/robo3.mjs <pasta-do-cliente> <etapa> [opções]
//   ler        inventário da pasta, texto da transcrição e o rascunho da ficha (ficha-rascunho.json)
//   ficha      valida ficha.json (citações conferidas na transcrição) e gera a ficha em PDF e o checklist do WhatsApp   · ponto de controle 1
//   entregas   valida plano.json e gera: landing page formatada, roteiros, Google Ads (PDF + CSV do Editor), páginas e cobertura
//   publicar   --previa (modelo.win7.ai/previa/<token>/) · ponto de controle 2   |   --dominio <dominio.com.br>
// A IA escreve ficha.json e plano.json na pasta do cliente (agente/AGENTE-EXECUCAO-WIN7MED.md); o robô valida e monta.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregarAtivos } from '../../motor1-diagnostico/scripts/gerar.mjs';

const M2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(M2, '..');
const M1 = path.join(RAIZ, 'motor1-diagnostico');
const ler = (p) => fs.readFileSync(p, 'utf8');
const lerJson = (p) => JSON.parse(ler(p));
const gravar = (p, t) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t, 'utf8'); };

export async function carregar() {
  for (const f of ['motor/motor-diagnostico.js', 'onboarding/onboarding.js', 'lp-modelo/lp-modelo.js']) await import(pathToFileURL(path.join(M1, f)).href);
  await import(pathToFileURL(path.join(M2, 'motor', 'motor-execucao.js')).href);
  return { M: globalThis.MotorDiagnostico, O: globalThis.OnboardingW7, L: globalThis.LpModeloW7, X: globalThis.ExecucaoW7 };
}

const IGNORAR = /^(ficha|ficha-rascunho|plano|integracoes|previa)\.json$/i;
const DOCUMENTO = /\.(pdf|docx|txt|md|html?)$/i;

/** Texto de PDF, DOCX, HTML, TXT ou MD (ler_transcricao.py; HTML e texto puro direto aqui). */
function textoDoArquivo(arq) {
  const ext = path.extname(arq).toLowerCase();
  if (ext === '.txt' || ext === '.md') return ler(arq);
  const r = spawnSync('python', ['-X', 'utf8', path.join(M2, 'scripts', 'ler_transcricao.py'), arq], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Não consegui ler ' + path.basename(arq) + ': ' + (r.stderr || '').split('\n').slice(-2).join(' '));
  return r.stdout;
}

/**
 * O que existe na pasta do cliente, pelo CONTEÚDO, em qualquer formato (pedido do Viny, 14/10):
 * JSON (dados), HTML do diagnóstico ou do mapeamento (dados embutidos pelos robôs 1 e 2), PDF, DOCX, TXT ou MD (texto).
 * Com dados, a ficha já sai preenchida; só com texto, a IA completa a ficha lendo entregas-win7/_contexto/.
 */
export function inventario(pasta, X, O) {
  const itens = [];
  for (const n of fs.readdirSync(pasta)) {
    const arq = path.join(pasta, n);
    if (!fs.statSync(arq).isFile() || IGNORAR.test(n) || /^[._]/.test(n)) continue;
    const ext = path.extname(n).toLowerCase();
    if (ext === '.json') {
      let j; try { j = lerJson(arq); } catch { continue; }
      const papel = X.classificarJson(j);
      if (papel === 'rascunho') {
        // rascunho exportado da apresentação: dá o diagnóstico e o mapeamento com as respostas
        const r = O.migrar(j.respostas, j.diagnostico);
        itens.push({ arq, formato: 'rascunho da apresentação (JSON)', papel: 'mapa', dados: O.montarMapa(j.diagnostico, r) });
        itens.push({ arq, formato: 'rascunho da apresentação (JSON)', papel: 'diagnostico', dados: j.diagnostico });
      } else if (papel) itens.push({ arq, formato: 'JSON', papel, dados: j });
      continue;
    }
    if (!DOCUMENTO.test(n)) continue;
    const bruto = /\.html?$/i.test(n) ? ler(arq) : '';
    const emb = bruto ? X.dadosEmbutidos(bruto) : null;
    if (emb) { itens.push({ arq, formato: 'HTML com os dados', papel: emb.tipo, dados: emb.dados }); continue; }
    let texto = '';
    try { texto = textoDoArquivo(arq); } catch (e) { console.log('⚠️  ' + e.message); continue; }
    if (!texto.trim()) continue;
    itens.push({ arq, formato: ext.slice(1).toUpperCase() + ' (texto)', papel: X.classificarTexto(texto, n), texto });
  }
  const melhor = (papel) => itens.filter((i) => i.papel === papel).sort((a, b) => (b.dados ? 1 : 0) - (a.dados ? 1 : 0))[0] || null;
  const diag = melhor('diagnostico'), mapa = melhor('mapa');
  const trans = melhor('transcricao') || itens.filter((i) => i.papel === 'texto').sort((a, b) => b.texto.length - a.texto.length)[0] || null;
  if (trans) trans.papel = 'transcricao';
  return {
    pasta, itens, diag, mapa, transcricaoItem: trans,
    transcricao: trans ? trans.arq : '', dados: { diag: (diag && diag.dados) || null, mapa: (mapa && mapa.dados) || null },
    ficha: path.join(pasta, 'ficha.json'), plano: path.join(pasta, 'plano.json'), integracoes: path.join(pasta, 'integracoes.json'), saida: path.join(pasta, 'entregas-win7')
  };
}

function pdfs(arquivos) {
  const r = spawnSync('python', ['-X', 'utf8', path.join(M2, 'scripts', 'pdf.py'), ...arquivos], { encoding: 'utf8' });
  if (r.status !== 0) { console.log('⚠️  PDF não gerado: ' + (r.stderr || '').split('\n').slice(-3).join(' ')); return; }
  r.stdout.trim().split('\n').forEach((l) => console.log('   📄 ' + l));
}
function opcoesDoc(setor) { return { setor, ativos: carregarAtivos(), css: ler(path.join(M2, 'motor', 'documentos.css')) }; }
function relatar(v, rotulo) {
  v.avisos.forEach((a) => console.log('⚠️  ' + a));
  v.erros.forEach((e) => console.log('❌ ' + e));
  if (v.erros.length) { console.log(`RESULTADO: ${rotulo} com ${v.erros.length} erro(s); corrija e rode de novo.`); process.exit(1); }
}

// ---------------------------------------------------------------- etapas
/** Se o mapeamento não está na pasta, procura em Downloads (a apresentação baixa lá) e traz o mais novo: JSON, HTML ou PDF. */
function trazerMapaDeDownloads(inv, X, O) {
  if (inv.mapa) return inv;
  const nome = ((inv.dados.diag || {}).cliente || {}).nome || '';
  const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dl = path.join(os.homedir(), 'Downloads');
  if (!slug || !fs.existsSync(dl)) return inv;
  const chaveNome = (n) => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  const achados = fs.readdirSync(dl).filter((n) => /\.(json|html?|pdf)$/i.test(n) && chaveNome(n).includes('mapa') && chaveNome(n).includes(slug))
    .map((n) => ({ n, t: fs.statSync(path.join(dl, n)).mtimeMs })).sort((a, b) => b.t - a.t);
  if (!achados.length) return inv;
  const destino = path.join(inv.pasta, achados[0].n.replace(/[^\w.\- ]+/g, '-'));
  fs.copyFileSync(path.join(dl, achados[0].n), destino);
  console.log('📥 mapeamento trazido de Downloads: ' + achados[0].n);
  return inventario(inv.pasta, X, O);
}

async function etapaLer(inv, X, O, L) {
  inv = trazerMapaDeDownloads(inv, X, O);
  console.log('📁 ' + inv.pasta);
  const linha = (rot, it, falta) => console.log((it ? '✅ ' : '❌ ') + rot + ': ' + (it ? path.basename(it.arq) + ' (' + it.formato + ')' : falta));
  linha('diagnóstico', inv.diag, 'não encontrei (vale JSON, HTML ou PDF do diagnóstico)');
  linha('mapeamento da reunião', inv.mapa, 'não encontrei (vale o JSON, o HTML ou o PDF do mapeamento)');
  linha('transcrição', inv.transcricaoItem, 'não encontrei (PDF, DOCX, TXT ou MD do Gemini)');
  if (!inv.transcricaoItem) console.log('   Peça ao Viny a transcrição da reunião (anexo ou caminho) e salve na pasta.');
  const outros = inv.itens.filter((x) => x.texto && x !== inv.transcricaoItem && x !== inv.diag && x !== inv.mapa);
  // textos para a IA ler: transcrição, diagnóstico e mapeamento sem dados, e qualquer outro documento
  fs.mkdirSync(path.join(inv.saida, '_contexto'), { recursive: true });
  if (inv.transcricaoItem) { gravar(path.join(inv.saida, '_transcricao.txt'), inv.transcricaoItem.texto); console.log(`   transcrição em texto: entregas-win7/_transcricao.txt (${inv.transcricaoItem.texto.split(/\s+/).length} palavras)`); }
  [inv.diag, inv.mapa].concat(outros).filter((x) => x && x.texto).forEach((x) => gravar(path.join(inv.saida, '_contexto', path.basename(x.arq) + '.txt'), x.texto));
  if (outros.length) console.log('📄 outros documentos lidos: ' + outros.map((x) => path.basename(x.arq)).join(', ') + ' (texto em entregas-win7/_contexto/)');
  if (!inv.diag && !inv.mapa) { console.log('❌ Preciso do diagnóstico ou do mapeamento da reunião, em qualquer formato.'); process.exit(1); }
  const rasc = X.rascunhoFicha(inv.dados.diag, inv.dados.mapa);
  // cores da página: do diagnóstico; sem elas, da logo da pasta
  if (!rasc.cores) {
    const logo = fs.readdirSync(inv.pasta).find((n) => /^logo\.(png|jpe?g|webp|svg)$/i.test(n));
    if (logo) { const { coresDaLogo } = await import('../../motor1-diagnostico/scripts/cliente.mjs'); const pl = L.paletaDaLogo(coresDaLogo(path.join(inv.pasta, logo))); if (pl) rasc.cores = Object.assign(pl, { origem: 'logo' }); }
  }
  gravar(path.join(inv.pasta, 'ficha-rascunho.json'), JSON.stringify(rasc, null, 2) + '\n');
  const soTexto = [inv.diag, inv.mapa].filter((x) => x && !x.dados).map((x) => x === inv.diag ? 'diagnóstico' : 'mapeamento');
  console.log(`✅ ficha-rascunho.json: ${rasc.paginas.length} página(s)` + (rasc.paginas.length ? ' (' + rasc.paginas.map((p) => p.servico).join(', ') + ')' : '') + '. Complete com a transcrição e salve como ficha.json.');
  if (soTexto.length) console.log('   ' + soTexto.join(' e ') + ' só em texto: confira páginas, verba, base do banner, domínio e dados do cliente lendo entregas-win7/_contexto/.');
}

async function etapaFicha(inv, X) {
  if (!fs.existsSync(inv.ficha)) { console.log('❌ Falta ficha.json na pasta (rode a etapa "ler" e complete o rascunho).'); process.exit(1); }
  if (!inv.transcricaoItem) { console.log('❌ Falta a transcrição da reunião na pasta: sem ela não dá para conferir as falas citadas.'); process.exit(1); }
  const f = lerJson(inv.ficha), t = inv.transcricaoItem.texto;
  const v = X.validarFicha(f, t);
  relatar(v, 'ficha');
  const mapa = inv.dados.mapa;
  const nomes = fs.readdirSync(inv.pasta).map((n) => n.toLowerCase());
  const itens = X.checklist(f, mapa, { logo_vetorial: nomes.some((n) => /^logo.*\.(svg|pdf|ai|eps)$/.test(n)), logos_convenios: fs.existsSync(path.join(inv.pasta, 'convenios')), video: nomes.some((n) => /^video.*\.(mp4|mov|m4v)$/.test(n)) });
  const msg = X.mensagemWhatsApp(f, itens);
  gravar(path.join(inv.saida, '01-checklist-whatsapp.txt'), msg.principal + (msg.confirmacoes ? '\n\n------\n\n' + msg.confirmacoes : '') + '\n');
  const html = path.join(inv.saida, '01-ficha-do-cliente.html');
  gravar(html, X.docFicha(f, itens, msg, opcoesDoc(f.cliente.setor)));
  pdfs([html]);
  console.log(`✅ ficha válida · ${v.a_confirmar.length} item(ns) a confirmar · ${itens.length} no checklist`);
  console.log('   ' + path.join(inv.saida, '01-ficha-do-cliente.pdf'));
  console.log('   ' + path.join(inv.saida, '01-checklist-whatsapp.txt') + ' (mensagem pronta para o grupo)');
  console.log('PONTO DE CONTROLE 1: confira a ficha antes de seguir para as entregas.');
}

/** Monta as páginas reais (uma por serviço), a política e os arquivos do servidor em entregas-win7/site/. */
export function montarSite(inv, f, plano, X, L) {
  const site = path.join(inv.saida, 'site'), assets = path.join(site, 'assets');
  fs.rmSync(site, { recursive: true, force: true });
  fs.mkdirSync(assets, { recursive: true });
  const r = spawnSync('python', ['-X', 'utf8', path.join(M2, 'scripts', 'preparar_midia.py'), inv.pasta, assets], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Mídias não preparadas: ' + r.stderr);
  const midia = JSON.parse(r.stdout);
  midia.avisos.forEach((a) => console.log('⚠️  ' + a));
  fs.copyFileSync(path.join(M1, 'lp-modelo', 'base', 'win7-etiqueta.webp'), path.join(assets, 'win7-etiqueta.webp'));
  const ig = fs.existsSync(inv.integracoes) ? lerJson(inv.integracoes) : {};
  if (ig.data_cliente && ig.data_form) fs.copyFileSync(path.join(RAIZ, 'servidor', 'win7-form.js'), path.join(assets, 'win7-form.js'));
  const modelo = ler(path.join(M1, 'lp-modelo', 'modelo.html'));
  const wa = ler(path.join(M1, 'lp-modelo', 'icone-whatsapp.txt')).trim();
  const htmlPorSlug = {}, avisos = new Set(), erros = [];
  plano.paginas.forEach((p) => {
    const d = X.dadosPagina(f, plano, p, midia, ig);
    const res = L.montar(d.v, { modelo, wa, modo: 'real', base: d.real.raiz + 'assets/', real: d.real });
    res.avisos.forEach((a) => avisos.add(a));
    if (!res.html) { res.erros.forEach((e) => erros.push(p.servico + ': ' + e)); return; }
    const conf = L.conferirReal(res.html, { saude: f.cliente.setor !== 'geral' });
    conf.erros.forEach((e) => erros.push(p.servico + ': ' + e));
    htmlPorSlug[p.slug || ''] = res.html;
    gravar(path.join(site, p.slug ? p.slug : '', 'index.html'), res.html);
  });
  gravar(path.join(site, 'politica-de-privacidade', 'index.html'), X.politicaHtml(f, { logo: midia.logo, integracoes: ig, raiz: '../' }));
  gravar(path.join(site, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  gravar(path.join(site, '.htaccess'), [
    '# Robô 3 (ADR-007): página só para tráfego pago. Fora do Google orgânico, sem bloquear o AdsBot.',
    'Options -Indexes',
    '<IfModule mod_headers.c>', '  Header set X-Robots-Tag "noindex, nofollow"',
    '  <FilesMatch "\\.(html|xml|txt)$">', '    Header set Cache-Control "no-cache, must-revalidate"', '  </FilesMatch>',
    '  <FilesMatch "\\.(webp|svg|png|jpg|mp4)$">', '    Header set Cache-Control "public, max-age=2592000"', '  </FilesMatch>', '</IfModule>',
    '<IfModule mod_deflate.c>', '  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml', '</IfModule>', ''
  ].join('\n'));
  return { site, htmlPorSlug, avisos: [...avisos], erros, midia, integracoes: ig };
}

async function etapaEntregas(inv, X, L, O) {
  for (const [p, n] of [[inv.ficha, 'ficha.json'], [inv.plano, 'plano.json']]) if (!fs.existsSync(p)) { console.log('❌ Falta ' + n + ' na pasta do cliente.'); process.exit(1); }
  const f = lerJson(inv.ficha), plano = lerJson(inv.plano);
  const vf = X.validarFicha(f, inv.transcricaoItem ? inv.transcricaoItem.texto : '');
  if (vf.erros.length) { relatar(vf, 'ficha'); }
  const vp = X.validarPlano(plano, f);
  relatar(vp, 'plano');
  const op = opcoesDoc(f.cliente.setor);
  // páginas reais (a cobertura das palavras-chave é medida nelas)
  const s = montarSite(inv, f, plano, X, L);
  s.avisos.forEach((a) => console.log('⚠️  página: ' + a));
  if (s.erros.length) { s.erros.forEach((e) => console.log('❌ página: ' + e)); process.exit(1); }
  const cob = X.cobertura(plano, s.htmlPorSlug);
  const semCob = cob.reduce((a, p) => a.concat(p.itens.filter((x) => x.status === 'nao_coberta').map((x) => p.servico + ': "' + x.palavra + '" (falta ' + x.falta.join(', ') + ')')), []);
  // documentos
  const arquivos = [];
  plano.paginas.forEach((p, i) => {
    const nome = String(i + 1).padStart(2, '0') + '-' + (p.slug || 'principal');
    const a = path.join(inv.saida, '02-landing-page-' + nome + '.html'); gravar(a, X.docCopy(f, p, Object.assign({}, op, { parceiros: plano.parceiros || null, como_chegar: plano.como_chegar }))); arquivos.push(a);
    const b = path.join(inv.saida, '03-roteiro-video-' + nome + '.html'); gravar(b, X.docRoteiro(f, p, op)); arquivos.push(b);
  });
  const camp = X.campanhas(plano, f);
  gravar(path.join(inv.saida, '04-campanhas.json'), JSON.stringify(camp, null, 2) + '\n');
  gravar(path.join(inv.saida, '04-google-ads-editor.csv'), X.csvEditor(camp));
  const ads = path.join(inv.saida, '04-google-ads.html'); gravar(ads, X.docAds(f, camp, cob, op, plano)); arquivos.push(ads);
  pdfs(arquivos);
  cob.forEach((p) => console.log(`🔎 cobertura · ${p.servico}: ${p.cobertas} de ${p.total} cobertas` + (p.nao_cobertas ? `, ${p.nao_cobertas} sem cobertura` : '')));
  semCob.forEach((x) => console.log('❌ cobertura: ' + x));
  console.log(`✅ ${plano.paginas.length} página(s) em entregas-win7/site · campanhas: padrão ${camp.campanhas[0].grupos.length} grupos, SKAG ${camp.campanhas[1].grupos.length} grupos`);
  console.log('   ' + inv.saida);
  if (semCob.length) { console.log('RESULTADO: palavra-chave sem o núcleo na página. Ajuste a copy (subtítulo ou pontos) ou tire a palavra do plano.'); process.exit(1); }
  console.log('Próximo: publicar --previa e aprovar internamente (ponto de controle 2).');
}

/** Publica as páginas: prévia interna (previa.win7.ai) ou o domínio do cliente. Confere antes de subir. */
async function etapaPublicar(inv, L, args) {
  const site = path.join(inv.saida, 'site');
  if (!fs.existsSync(path.join(site, 'index.html'))) { console.log('❌ Rode a etapa entregas antes: não há página montada.'); process.exit(1); }
  const f = lerJson(inv.ficha), saude = f.cliente.setor !== 'geral';
  const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : ''; };
  const dominio = val('--dominio'), previa = args.includes('--previa');
  if (!dominio && !previa) { console.log('Use --previa (revisão interna) ou --dominio <dominio.com.br>.'); process.exit(2); }
  const paginas = [];
  (function varrer(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) { if (n !== 'assets' && n !== 'politica-de-privacidade') varrer(p); } else if (n === 'index.html') paginas.push(p); } })(site);
  const erros = [];
  paginas.forEach((p) => L.conferirReal(ler(p), { saude, publicar: !!dominio }).erros.forEach((e) => erros.push(path.relative(site, p) + ': ' + e)));
  if (erros.length) { erros.forEach((e) => console.log('❌ ' + e)); console.log('RESULTADO: publicação recusada.'); process.exit(1); }
  const py = (extra) => spawnSync('python', ['-X', 'utf8', path.join(M2, 'scripts', 'publicar_pagina.py'), site, ...extra], { stdio: 'inherit' });
  if (previa) {
    const arq = path.join(inv.saida, 'previa.json');
    const reg = fs.existsSync(arq) ? lerJson(arq) : { token: Array.from(crypto.randomBytes(12), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('') };
    const r = py(['--previa', reg.token]);
    if (r.status !== 0) { console.log('❌ prévia não publicada.'); process.exit(1); }
    reg.url = 'https://previa.win7.ai/' + reg.token + '/'; reg.publicado_em = new Date().toISOString();
    gravar(arq, JSON.stringify(reg, null, 2) + '\n');
    console.log('🔗 ' + reg.url);
    console.log('PONTO DE CONTROLE 2: aprovação interna da prévia antes do domínio.');
    return;
  }
  const esc_ = texto(f.dominio && f.dominio.escolhido);
  if (esc_ && esc_ !== dominio) console.log('⚠️  O domínio escolhido na reunião foi ' + esc_ + '; publicando em ' + dominio + '.');
  const r = py(['--dominio', dominio].concat(args.includes('--simular') ? ['--simular'] : []));
  if (r.status !== 0) process.exit(1);
}
function texto(x) { return x === undefined || x === null ? '' : String(x).trim(); }

/** A ativação traz "clientes/<slug>"; se a pasta salva pelo robô 1 tiver outro nome, acha pelo registro dos modelos ou pelo nome no diagnóstico. */
function acharPastaDoCliente(pedida) {
  const slug = path.basename(pedida).toLowerCase();
  try { const reg = lerJson(path.join(RAIZ, 'clientes', '_lp-modelos', 'registro.json'))[slug]; if (reg && reg.pasta && fs.existsSync(path.join(RAIZ, reg.pasta))) return path.join(RAIZ, reg.pasta); } catch { /* sem registro */ }
  const base = path.join(RAIZ, 'clientes');
  if (!fs.existsSync(base)) return '';
  for (const d of fs.readdirSync(base)) {
    const arq = path.join(base, d, 'diagnostico.json');
    if (!fs.existsSync(arq)) continue;
    try { const nome = (lerJson(arq).cliente || {}).nome || ''; if (nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === slug) return path.join(base, d); } catch { /* ignora */ }
  }
  return '';
}

async function principal() {
  let [pasta, etapa] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (pasta && !fs.existsSync(pasta)) { const achada = acharPastaDoCliente(pasta); if (achada) { console.log('📁 pasta do cliente encontrada: ' + path.relative(RAIZ, achada)); pasta = achada; } }
  if (!pasta || !etapa || !fs.existsSync(pasta)) { console.log('Uso: node motor2-execucao/scripts/robo3.mjs <pasta-do-cliente> ler|ficha|entregas|publicar [--previa | --dominio x]'); process.exit(2); }
  const { L, O, X } = await carregar();
  const inv = inventario(path.resolve(pasta), X, O);
  if (etapa === 'ler') return etapaLer(inv, X, O, L);
  if (etapa === 'ficha') return etapaFicha(inv, X);
  if (etapa === 'entregas' || etapa === 'pagina') return etapaEntregas(inv, X, L, O);
  if (etapa === 'publicar') return etapaPublicar(inv, L, process.argv.slice(2));
  console.log('Etapa desconhecida: ' + etapa); process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal();
