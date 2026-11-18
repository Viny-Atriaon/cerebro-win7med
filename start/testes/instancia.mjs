// Instância descartável da API do start.win7.ai (ADR-008) para os testes: servidor embutido do PHP numa porta livre,
// pasta de dados temporária e um convite de administrador semeado pelo próprio teste (token aleatório a cada execução).
// TRAVA: recusa rodar se DADOS_DIR apontar uma pasta que já tem dados (nunca a do servidor). Ao parar, apaga tudo.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const START = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(START, '..');

/** O PHP do winget (Windows) vem sem php.ini: as extensões entram pelo php-dev.ini. No Linux (CI) já vêm ligadas. */
export function comandoPhp() {
  if (process.env.PHP_EXE) return { exe: process.env.PHP_EXE, args: [] };
  if (process.platform !== 'win32') return { exe: 'php', args: [] };
  const pasta = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
  const achada = fs.existsSync(pasta) && fs.readdirSync(pasta).find((p) => p.startsWith('PHP.PHP.8'));
  const exe = achada ? path.join(pasta, achada, 'php.exe') : 'php';
  return { exe, args: ['-c', path.join(START, 'php-dev.ini'), '-d', 'extension_dir=' + path.join(path.dirname(exe), 'ext')] };
}

function portaLivre() {
  return new Promise((ok, falha) => {
    const s = net.createServer();
    s.once('error', falha);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
  });
}

/** Sobe a API e devolve { base, dados, convite (link do administrador), parar }. dist/start precisa existir (npm run build). */
/** emailAdmin: '' semeia o convite como a publicação faz (sem e-mail: a pessoa escreve o dela ao aceitar). */
export async function subirInstancia({ emailAdmin = 'admin@teste.local' } = {}) {
  const porta = await portaLivre();
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'w7-start-teste-'));
  if (fs.readdirSync(dados).length) throw new Error('trava: a pasta de dados do teste precisa começar vazia');
  const token = crypto.randomBytes(20).toString('hex');
  const semente = { [crypto.createHash('sha256').update(token).digest('hex')]: { email: emailAdmin, nome: 'Admin Teste', papel: 'admin', expira: Date.now() + 3600e3, criado_por: 'teste' } };
  fs.writeFileSync(path.join(dados, 'convites-semente.json'), JSON.stringify(semente));
  const php = comandoPhp();
  const filho = spawn(php.exe, [...php.args, '-S', '127.0.0.1:' + porta, path.join(START, 'roteador-dev.php')], {
    cwd: RAIZ, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DADOS_DIR: dados, START_DIST: path.join(RAIZ, 'dist', 'start') },
  });
  let saida = '';
  filho.stdout.on('data', (x) => { saida += x; });
  filho.stderr.on('data', (x) => { saida += x; });
  filho.on('error', (e) => { saida += String(e); });
  const base = `http://127.0.0.1:${porta}`;
  for (let i = 0; ; i++) {
    try { if ((await fetch(base + '/api/saude')).status < 600) break; } catch { /* ainda subindo */ }
    if (i > 80 || filho.exitCode !== null) { filho.kill(); fs.rmSync(dados, { recursive: true, force: true }); throw new Error('a API de teste não subiu (PHP instalado?):\n' + saida.slice(-800)); }
    await new Promise((r) => setTimeout(r, 150));
  }
  async function parar() {
    if (filho.exitCode === null) { filho.kill(); await new Promise((r) => filho.once('exit', r)); }
    fs.rmSync(dados, { recursive: true, force: true });
  }
  return { base, dados, token, convite: `${base}/#convite=${token}`, parar, saida: () => saida };
}
