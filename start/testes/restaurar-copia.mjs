// Ensaio de restauração da cópia do dia do start.win7.ai (ADR-008, BKP): decifra, descomprime e confere a cópia.
// Uso: node start/testes/restaurar-copia.mjs <cerebro-AAAA-MM-DD-HHMMSS.json.gz.enc> [--para <pasta-vazia>]
//   sem --para: só confere (índice x arquivos dos projetos, contas, pastas) e mostra o resumo;
//   com --para: grava os arquivos numa pasta de dados nova, pronta para subir a API local (DADOS_DIR) e conferir na tela.
// A chave vem de W7_START_CHAVE ou de .segredos/start-copia.env (CHAVE=...), a mesma que o publicador mandou ao servidor.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function chaveLocal() {
  if (process.env.W7_START_CHAVE) return Buffer.from(process.env.W7_START_CHAVE, 'base64');
  const arq = path.join(RAIZ, '.segredos', 'start-copia.env');
  if (!fs.existsSync(arq)) throw new Error('sem a chave: falta .segredos/start-copia.env (ou W7_START_CHAVE)');
  const linha = fs.readFileSync(arq, 'utf8').split(/\r?\n/).find((l) => l.startsWith('CHAVE='));
  return Buffer.from((linha || '').slice(6).trim(), 'base64');
}

/** Formato WCB1: "WCB1" + nonce (12) + tag (16) + AES-256-GCM(gzip(JSON)), AAD "WCB1". */
export function abrirCopia(bruto, chave) {
  if (bruto.subarray(0, 4).toString('latin1') !== 'WCB1') throw new Error('não é uma cópia WCB1');
  if (chave.length !== 32) throw new Error('chave com tamanho errado');
  const d = crypto.createDecipheriv('aes-256-gcm', chave, bruto.subarray(4, 16));
  d.setAAD(Buffer.from('WCB1'));
  d.setAuthTag(bruto.subarray(16, 32));
  const gz = Buffer.concat([d.update(bruto.subarray(32)), d.final()]);
  const copia = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
  if (copia.schema !== 'w7-start-copia') throw new Error('esquema desconhecido: ' + copia.schema);
  return copia;
}

/** Confere a coerência: cada projeto do índice tem o arquivo, e cada arquivo de projeto é um JSON com id e diagnóstico. */
export function conferirCopia(copia) {
  const a = copia.arquivos || {};
  const indice = a['projetos/indice.json'] || [];
  const problemas = [];
  for (const x of indice) if (!a[`projetos/${x.id}.json`]) problemas.push(`índice cita ${x.id} sem o arquivo do projeto`);
  const projetos = Object.keys(a).filter((k) => /^projetos\/[a-f0-9]{16}\.json$/.test(k));
  for (const k of projetos) if (!a[k].id || !a[k].diagnostico) problemas.push(`${k} sem id ou sem diagnóstico`);
  return { projetos: projetos.length, noIndice: indice.length, contas: (a['usuarios.json'] || []).length, pastas: (a['pastas.json'] || []).length, problemas };
}

export function gravarCopia(copia, pasta) {
  if (fs.existsSync(pasta) && fs.readdirSync(pasta).length) throw new Error('a pasta de destino precisa estar vazia (nunca a do servidor)');
  for (const [rel, valor] of Object.entries(copia.arquivos)) {
    if (!/^(usuarios|convites|pastas)\.json$|^projetos\/([a-f0-9]{16}|indice)\.json$/.test(rel)) throw new Error('caminho inesperado na cópia: ' + rel);
    const alvo = path.join(pasta, rel);
    fs.mkdirSync(path.dirname(alvo), { recursive: true });
    fs.writeFileSync(alvo, JSON.stringify(valor));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arq = process.argv[2];
  if (!arq) { console.log('Uso: node start/testes/restaurar-copia.mjs <arquivo.json.gz.enc> [--para <pasta-vazia>]'); process.exit(2); }
  const copia = abrirCopia(fs.readFileSync(arq), chaveLocal());
  const r = conferirCopia(copia);
  console.log(`cópia de ${copia.gerado_em}: ${r.projetos} projeto(s) (${r.noIndice} no índice), ${r.contas} conta(s), ${r.pastas} pasta(s)`);
  r.problemas.forEach((p) => console.log('❌ ' + p));
  const i = process.argv.indexOf('--para');
  if (i > 0) { gravarCopia(copia, path.resolve(process.argv[i + 1])); console.log('✅ gravada em ' + path.resolve(process.argv[i + 1]) + ' (suba a API local com DADOS_DIR apontando para ela)'); }
  process.exit(r.problemas.length ? 1 : 0);
}
