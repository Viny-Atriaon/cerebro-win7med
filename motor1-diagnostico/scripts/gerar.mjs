// Cérebro Win7 Med · Motor 1 · linha de comando: dados JSON → laudo HTML (mesmo motor do Gerador).
// Uso: node motor1-diagnostico/scripts/gerar.mjs <dados.json> [--saida arquivo.html] [--logo logo-cliente.png]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const M1 = path.join(RAIZ, 'motor1-diagnostico');

export async function carregarMotor() {
  await import(pathToFileURL(path.join(M1, 'motor', 'motor-diagnostico.js')).href);
  return globalThis.MotorDiagnostico;
}
const b64 = (arq, mime) => `data:${mime};base64,${fs.readFileSync(arq).toString('base64')}`;
export function carregarAtivos() {
  const a = path.join(M1, 'ativos');
  return {
    logo: b64(path.join(a, 'logo-win7med.png'), 'image/png'),
    logoNegativo: b64(path.join(a, 'logo-win7med-negativo.png'), 'image/png'),
    logoGeral: b64(path.join(a, 'logo-win7.png'), 'image/png'),
    logoGeralNegativo: b64(path.join(a, 'logo-win7-negativo.png'), 'image/png'),
    fonte400: b64(path.join(a, 'outfit-400.woff2'), 'font/woff2'),
    fonte700: b64(path.join(a, 'outfit-700.woff2'), 'font/woff2'),
  };
}
export const carregarCss = () => fs.readFileSync(path.join(M1, 'motor', 'laudo.css'), 'utf8');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const entrada = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--saida' && args[args.indexOf(a) - 1] !== '--logo');
  if (!entrada) { console.error('uso: node gerar.mjs <dados.json> [--saida arquivo.html] [--logo logo.png]'); process.exit(2); }
  const M = await carregarMotor();
  let dados;
  try { dados = M.extrairJson(fs.readFileSync(entrada, 'utf8')); } catch (e) { console.error('❌ ' + e.message); process.exit(1); }
  const iLogo = args.indexOf('--logo');
  const logoCliente = iLogo >= 0 ? b64(args[iLogo + 1], args[iLogo + 1].toLowerCase().endsWith('.png') ? 'image/png' : args[iLogo + 1].toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg') : '';
  const r = M.gerarLaudo(dados, { css: carregarCss(), ativos: carregarAtivos(), logoCliente });
  r.validacao.avisos.forEach((a) => console.log('⚠️  ' + a));
  r.validacao.erros.forEach((e) => console.log('❌ ' + e));
  if (r.travessoes_corrigidos) console.log(`ℹ️  ${r.travessoes_corrigidos} travessão(ões) corrigido(s) automaticamente`);
  if (!r.html) { console.log('RESULTADO: diagnóstico não gerado, corrija os erros acima.'); process.exit(1); }
  const iSaida = args.indexOf('--saida');
  const saida = iSaida >= 0 ? args[iSaida + 1] : path.join(path.dirname(path.resolve(entrada)), `diagnostico-google-ads-${M.slug(dados.cliente.nome)}.html`);
  fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
  fs.writeFileSync(saida, r.html, 'utf8');
  console.log(`✅ diagnóstico gerado: ${saida} (${Math.round(r.html.length / 1024)} KB) · placar ${r.placar.geral} de 100 · ${r.validacao.erros.length} erro(s)`);
  process.exit(r.validacao.erros.length ? 1 : 0);
}
