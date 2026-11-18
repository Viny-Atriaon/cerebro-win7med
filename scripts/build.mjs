// Cérebro Win7 Med · build do Motor 1 (ADR-003 e ADR-004)
// Monta o Gerador em UM arquivo HTML autossuficiente e o conteúdo do repositório público:
//   dist/publico/  index.html (Gerador), agente, README (= agente), exemplo e licença da fonte.
//   dist/gerador-diagnostico-win7med.html  cópia do Gerador para abrir direto do computador da equipe.
// dist/publico é um repositório git próprio, ligado a github.com/Viny-Atriaon/diagnostico-win7med (GitHub Pages).
// Uso: node scripts/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregarMotor, carregarAtivos, carregarCss } from '../motor1-diagnostico/scripts/gerar.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const M1 = path.join(RAIZ, 'motor1-diagnostico');
export const LINKS = {
  repo: 'https://github.com/Viny-Atriaon/diagnostico-win7med',
  gerador: 'https://viny-atriaon.github.io/diagnostico-win7med/',
  agente_pages: 'https://viny-atriaon.github.io/diagnostico-win7med/agente.md',
  agente_raw: 'https://raw.githubusercontent.com/Viny-Atriaon/diagnostico-win7med/main/AGENTE-DIAGNOSTICO-WIN7MED.md',
  robo3: 'https://start.win7.ai/#execucao',
  start: 'https://start.win7.ai/',
};
const ler = (p) => fs.readFileSync(p, 'utf8');
/** Conteúdo injetado em <script> nunca pode fechar a tag por acidente. */
const seguroScript = (s) => s.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
const trocar = (s, marca, valor) => s.split(marca).join(valor);

/**
 * opcoes.cliente: bloco de dados de um cliente para o Gerador já abrir com ele (comando único do chat, ADR-006).
 * Sem cliente, o Gerador público abre com o exemplo fictício.
 */
export async function montarGerador(opcoes = {}) {
  const M = await carregarMotor();
  const ativos = carregarAtivos();
  const fontes = `@font-face{font-family:"Outfit";src:url(${ativos.fonte400}) format("woff2");font-weight:400;font-display:swap}` +
    `@font-face{font-family:"Outfit";src:url(${ativos.fonte700}) format("woff2");font-weight:700;font-display:swap}`;
  const dados = 'window.W7 = ' + JSON.stringify({
    ativos, cssLaudo: carregarCss(), exemplo: opcoes.cliente || JSON.parse(ler(path.join(M1, 'exemplos', 'exemplo-ficticio.json'))), links: LINKS,
    fixo: !!opcoes.cliente, logoCliente: opcoes.logoCliente || '',
    // start.win7.ai (ADR-008): o diagnóstico e o onboarding ficam salvos no sistema da Win7 (API em start/api)
    start: !!opcoes.start,
    // LP modelo montada no próprio navegador quando o bloco chega sem lp_modelo.url (logo e cores do cliente na hora)
    lp: { modelo: ler(path.join(M1, 'lp-modelo', 'modelo.html')), wa: ler(path.join(M1, 'lp-modelo', 'icone-whatsapp.txt')).trim(), base: 'https://modelo.win7.ai/base/' },
  }).replace(/\{\{/g, '{' + String.fromCharCode(92) + 'u007b').replace(/</g, String.fromCharCode(92) + 'u003c') + ';';  // o modelo da LP tem marcadores {{X}} e tags: escapados para as conferências do Gerador não confundirem
  let html = ler(path.join(M1, 'gerador', 'gerador.html'));
  html = trocar(html, '/*{{FONTES}}*/', fontes);
  html = trocar(html, '/*{{CSS_GERADOR}}*/', ler(path.join(M1, 'gerador', 'gerador.css')));
  html = trocar(html, '/*{{CSS_APRESENTACAO}}*/', ler(path.join(M1, 'onboarding', 'apresentacao.css')));
  html = trocar(html, '{{LOGO}}', ativos.logo);
  html = trocar(html, '{{VERSAO}}', M.VERSAO);
  html = trocar(html, '{{LINK_AGENTE}}', LINKS.agente_pages);
  html = trocar(html, '{{LINK_REPO}}', LINKS.repo);
  html = trocar(html, '{{LINK_ROBO3}}', LINKS.robo3);
  html = trocar(html, '/*{{MOTOR}}*/', seguroScript(ler(path.join(M1, 'motor', 'motor-diagnostico.js'))));
  html = trocar(html, '/*{{LP_MODELO}}*/', seguroScript(ler(path.join(M1, 'lp-modelo', 'lp-modelo.js'))).replace(/\{\{/g, '{' + String.fromCharCode(92) + 'u007b').replace(/<script/g, '<' + String.fromCharCode(92) + 'u0073cript'));
  html = trocar(html, '/*{{ONBOARDING}}*/', seguroScript(ler(path.join(M1, 'onboarding', 'onboarding.js'))));
  html = trocar(html, '/*{{APRESENTACAO}}*/', seguroScript(ler(path.join(M1, 'onboarding', 'apresentacao.js'))));
  html = trocar(html, '/*{{DADOS}}*/', seguroScript(dados));
  html = trocar(html, '/*{{GERADOR_JS}}*/', seguroScript(ler(path.join(M1, 'gerador', 'gerador.js'))));
  if (opcoes.start) html = trocar(html, 'Tudo roda neste navegador: nenhum dado do cliente sai do seu computador.', 'No start.win7.ai, cada diagnóstico e cada onboarding ficam salvos no sistema da Win7, com acesso só para a equipe.');
  if (/\{\{[A-Z_]+\}\}|\/\*\{\{/.test(html)) throw new Error('marcador do modelo sem substituir no gerador');
  return html;
}

/** Página do robô 3: o botão "Copiar comando inicial", como o do Gerador do robô 1. */
export async function montarPaginaRobo3() {
  await carregarMotor();
  await import(pathToFileURL(path.join(M1, 'onboarding', 'onboarding.js')).href);
  const ativos = carregarAtivos();
  const fontes = `@font-face{font-family:"Outfit";src:url(${ativos.fonte400}) format("woff2");font-weight:400;font-display:swap}` +
    `@font-face{font-family:"Outfit";src:url(${ativos.fonte700}) format("woff2");font-weight:700;font-display:swap}`;
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = ler(path.join(RAIZ, 'motor2-execucao', 'ativacao', 'robo3.html'));
  html = trocar(html, '/*{{FONTES}}*/', fontes);
  html = trocar(html, '{{LOGO}}', ativos.logo);
  html = trocar(html, '{{COMANDO}}', esc(globalThis.OnboardingW7.ativacaoRobo3()));
  if (/\{\{[A-Z_]+\}\}|\/\*\{\{/.test(html)) throw new Error('marcador sem substituir na página do robô 3');
  return html;
}

/** O batimento da apresentação do onboarding: coração pulsando e luz correndo no traço. */
function pulsoSvg() {
  let d = 'M0 17';
  [170, 570, 970].forEach((b) => { d += ` H${b} l7 -4 l7 4 H${b + 26} l5 4 l9 -17 l10 22 l8 -12 l5 3`; });
  d += ' H1200';
  return '<svg class="bate" viewBox="0 0 26 24"><path d="M13 22C6 16 1 12 1 7a5.5 5.5 0 0 1 12-2 5.5 5.5 0 0 1 12 2c0 5-5 9-12 15z"/></svg>' +
    `<svg class="traco" viewBox="0 0 1200 30" preserveAspectRatio="none"><path class="base" d="${d}"/><path class="luz" pathLength="1000" d="${d}"/></svg>`;
}
/** Linha do processo na tela de entrada: um batimento em cada momento (antes, reunião, depois). */
function ecgSvg() {
  let d = 'M0 34';
  [135, 470, 805].forEach((b) => { d += ` H${b} l9 4 l10 -28 l12 38 l10 -20 l8 6`; });
  d += ' H1000';
  // o coração fica fora do traço esticado, para não deformar no celular
  return '<svg class="coracao" viewBox="0 0 26 24"><path d="M13 22C6 16 1 12 1 7a5.5 5.5 0 0 1 12-2 5.5 5.5 0 0 1 12 2c0 5-5 9-12 15z"/></svg>' +
    `<svg class="linha-ecg" viewBox="0 0 1000 56" preserveAspectRatio="none"><path class="base" d="${d}"/><path class="luz" pathLength="1000" d="${d}"/></svg>`;
}

/** start.win7.ai: a tela única com os dois sistemas e o batimento contínuo. */
export async function montarStart() {
  const ativos = carregarAtivos();
  const fontes = `@font-face{font-family:"Outfit";src:url(${ativos.fonte400}) format("woff2");font-weight:400;font-display:swap}` +
    `@font-face{font-family:"Outfit";src:url(${ativos.fonte700}) format("woff2");font-weight:700;font-display:swap}`;
  let html = ler(path.join(RAIZ, 'start', 'index.html'));
  html = trocar(html, '/*{{FONTES}}*/', fontes);
  html = trocar(html, '{{LOGO}}', ativos.logo);
  html = trocar(html, '{{PULSO}}', pulsoSvg());
  html = trocar(html, '{{ECG}}', ecgSvg());
  if (/\{\{[A-Z_]+\}\}|\/\*\{\{/.test(html)) throw new Error('marcador sem substituir no start');
  return html;
}

/** .htaccess do start.win7.ai: API pelo index.php, código interno fechado, fora de buscadores, sem listagem. */
const HTACCESS_START = [
  '# start.win7.ai: sistemas internos da Win7 Med e projetos salvos (ADR-008). Gerado por scripts/build.mjs.',
  'Options -Indexes',
  'DirectoryIndex index.html',
  'RewriteEngine On',
  '# código interno da API nunca é servido direto; a API inteira passa pelo index.php',
  'RewriteRule ^api/lib/ - [F,L]',
  'RewriteRule ^api/ api/index.php [L,QSA]',
  '<IfModule mod_headers.c>',
  '  Header always set X-Robots-Tag "noindex, nofollow, noarchive"',
  '  Header always set Referrer-Policy "no-referrer"',
  '  Header always set X-Content-Type-Options "nosniff"',
  '  Header always set Strict-Transport-Security "max-age=31536000"',
  '  <FilesMatch "\\.(html|txt)$">',
  '    Header set Cache-Control "no-cache, must-revalidate"',
  '    # a tela do start abre a Análise e a Execução dentro dela (mesmo domínio); ninguém de fora',
  '    Header set X-Frame-Options "SAMEORIGIN"',
  '  </FilesMatch>',
  '</IfModule>',
  '<IfModule mod_deflate.c>',
  '  AddOutputFilterByType DEFLATE text/html application/json',
  '</IfModule>',
  '# arquivos que não são da página',
  '<FilesMatch "(^\\.|\\.(log|md|ini|json)$)">',
  '  Require all denied',
  '</FilesMatch>',
  '',
].join('\n');

/** A API do start vai junto do build, igual à fonte (start/api): o publicador envia o que está em dist/start. */
function copiarApi(st) {
  const saida = [];
  for (const rel of ['index.php', 'lib/base.php', 'lib/copia.php', 'lib/cron.php']) {
    const destino = path.join(st, 'api', rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.copyFileSync(path.join(RAIZ, 'start', 'api', rel), destino);
    saida.push(path.relative(RAIZ, destino));
  }
  return saida;
}

export function montarReadme(agente) {
  return agente + `
---

## Arquivos deste repositório

| Arquivo | Para que serve |
|---|---|
| \`README.md\` e \`AGENTE-DIAGNOSTICO-WIN7MED.md\` | O agente. Cole o link do repositório numa conversa com a IA, ou envie o arquivo |
| \`index.html\` | O Gerador do diagnóstico, publicado em ${LINKS.gerador} |
| \`robo3.html\` | O comando inicial do robô 3 (execução depois da reunião), em ${LINKS.robo3} |
| \`agente.md\` | Cópia do agente servida junto com o Gerador |
| \`exemplo.json\` | Exemplo fictício de bloco de dados |

Tudo roda no navegador de quem usa: o Gerador não envia dados da clínica para nenhum servidor. Fonte Outfit sob SIL Open Font License 1.1 (\`OFL-Outfit.txt\`).
`;
}

export async function build() {
  const agente = ler(path.join(RAIZ, 'agente', 'AGENTE-DIAGNOSTICO-WIN7MED.md'));
  const dist = path.join(RAIZ, 'dist'), pub = path.join(dist, 'publico');
  fs.mkdirSync(pub, { recursive: true });
  const gerador = await montarGerador();
  const escrever = (p, c) => { fs.writeFileSync(p, c, 'utf8'); return `${path.relative(RAIZ, p)} (${Math.round(Buffer.byteLength(c) / 1024)} KB)`; };
  return [
    escrever(path.join(pub, 'index.html'), gerador),
    escrever(path.join(pub, 'robo3.html'), await montarPaginaRobo3()),
    escrever(path.join(pub, 'AGENTE-DIAGNOSTICO-WIN7MED.md'), agente),
    escrever(path.join(pub, 'agente.md'), agente),
    escrever(path.join(pub, 'README.md'), montarReadme(agente)),
    escrever(path.join(pub, 'exemplo.json'), ler(path.join(M1, 'exemplos', 'exemplo-ficticio.json'))),
    escrever(path.join(pub, 'OFL-Outfit.txt'), ler(path.join(M1, 'ativos', 'Outfit-OFL.txt'))),
    escrever(path.join(pub, '.nojekyll'), ''),
    escrever(path.join(dist, 'gerador-diagnostico-win7med.html'), gerador),
    ...(await (async () => {
      // start.win7.ai (servidor da Win7): a tela única e os dois sistemas
      const st = path.join(dist, 'start');
      fs.mkdirSync(st, { recursive: true });
      return [
        escrever(path.join(st, 'index.html'), await montarStart()),
        escrever(path.join(st, 'analise.html'), await montarGerador({ start: true })),
        ...copiarApi(st),
        escrever(path.join(st, 'robo3.html'), await montarPaginaRobo3()),
        escrever(path.join(st, 'robots.txt'), 'User-agent: *\nDisallow: /\n'),
        escrever(path.join(st, '.htaccess'), HTACCESS_START),
      ];
    })()),
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = await build();
  s.forEach((x) => console.log('✅ ' + x));
}
