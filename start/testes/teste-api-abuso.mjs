// Regressão da API do start.win7.ai (ADR-008): contas por convite, sessão, limites, projetos salvos e equipe.
// Roda contra uma instância descartável do PHP (start/testes/instancia.mjs). Uso: node start/testes/teste-api-abuso.mjs
// Precisa de `npm run build` antes (o roteador serve dist/start) e do PHP 8 (no Windows, o do winget).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { subirInstancia } from './instancia.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let falhas = 0, total = 0;
function check(ok, rotulo) { total++; if (ok) console.log('✅ ' + rotulo); else { falhas++; console.log('❌ ' + rotulo); } }

const exemplo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'motor1-diagnostico', 'exemplos', 'exemplo-ficticio.json'), 'utf8'));
const diagA = { ...exemplo, cliente: { ...exemplo.cliente, nome: 'Clínica Teste Salvamento' } };
const diagB = { ...exemplo, cliente: { ...exemplo.cliente, nome: 'Outra Clínica de Teste' } };
const respostas = (texto) => ({ schema: 'w7-onboarding-respostas', versao: 1, atualizado_em: new Date().toISOString(), cliente: { slug: 'clinica-teste-salvamento' }, observacoes: texto });
const mapa = { schema: 'w7-mapa-onboarding', versao: 1, cliente: { nome: 'Clínica Teste Salvamento' } };

const inst = await subirInstancia();
const B = inst.base;
/** Requisição com cookie e o cabeçalho X-Start (o que o site manda). */
async function req(metodo, rota, { corpo, cookie = '', semStart = false, origem, ip } = {}) {
  const cab = {};
  if (!semStart) cab['X-Start'] = '1';
  if (corpo !== undefined) cab['Content-Type'] = 'application/json';
  if (cookie) cab.Cookie = cookie;
  if (origem) cab.Origin = origem;
  if (ip) cab['CF-Connecting-IP'] = ip;
  const r = await fetch(B + '/api/' + rota, { method: metodo, headers: cab, body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
  const texto = await r.text();
  let j = null; try { j = JSON.parse(texto); } catch { j = null; }
  return { status: r.status, j, texto, cookie: (r.headers.get('set-cookie') || '').split(';')[0], cab: r.headers };
}

try {
  // ---------------------------------------------------------------- abertas e defesas
  const s = await req('GET', 'saude');
  check(s.status === 200 && s.j.ok === true, 'saúde responde e grava na pasta de dados');
  check((await req('GET', 'eu')).status === 401, 'sem sessão: /api/eu recusa (401)');
  const ss = await req('GET', 'sessao');
  check(ss.status === 200 && ss.j.usuario === null, 'sem sessão: /api/sessao responde 200 com usuario nulo (tela de entrada sem erro no console)');
  check((await req('GET', 'projetos')).status === 401, 'sem sessão: lista de projetos recusada');
  check((await req('POST', 'entrar', { corpo: { email: 'a@b.c', senha: 'x' }, semStart: true })).status === 403, 'escrita sem o cabeçalho X-Start recusada (outro site não consegue postar)');
  check((await req('POST', 'entrar', { corpo: { email: 'a@b.c', senha: 'x' }, origem: 'https://atacante.exemplo' })).status === 403, 'escrita com Origin de outro site recusada');
  const lib = await fetch(B + '/api/lib/base.php');
  check(lib.status === 403, 'código interno (api/lib) nunca é servido');
  check(s.cab.get('x-frame-options') === 'DENY' && /noindex/.test(s.cab.get('x-robots-tag') || '') && s.cab.get('cache-control') === 'no-store', 'API com cabeçalhos de segurança (DENY, noindex, no-store)');

  // ---------------------------------------------------------------- convite do administrador (semente da publicação)
  const ver = await req('POST', 'convite/ver', { corpo: { token: inst.token } });
  check(ver.status === 200 && ver.j.email === 'admin@teste.local' && ver.j.papel === 'admin', 'convite semeado pela publicação é reconhecido');
  check(!fs.existsSync(path.join(inst.dados, 'convites-semente.json')) && !fs.readFileSync(path.join(inst.dados, 'convites.json'), 'utf8').includes(inst.token), 'semente absorvida e apagada; só o hash do token fica guardado');
  check((await req('POST', 'convite/ver', { corpo: { token: 'f'.repeat(40) } })).status === 404, 'convite inexistente recusado');
  check((await req('POST', 'convite/aceitar', { corpo: { token: inst.token, nome: 'Admin', senha: 'curta' } })).status === 400, 'senha com menos de 10 caracteres recusada');
  const senhaAdmin = 'senha-do-admin-' + Date.now();
  const ac = await req('POST', 'convite/aceitar', { corpo: { token: inst.token, nome: 'Admin Teste', senha: senhaAdmin } });
  check(ac.status === 200 && /^w7start=[a-f0-9]{48}$/.test(ac.cookie) && ac.j.papel === 'admin', 'convite aceito: conta criada e sessão aberta');
  const cookieSessao = ac.cab.get('set-cookie') || '';
  check(/HttpOnly/i.test(cookieSessao) && /SameSite=Lax/i.test(cookieSessao), 'cookie de sessão HttpOnly e SameSite');
  check((await req('POST', 'convite/aceitar', { corpo: { token: inst.token, nome: 'De novo', senha: 'outra-senha-longa' } })).status === 404, 'convite usado não vale de novo');
  const usuarios = fs.readFileSync(path.join(inst.dados, 'usuarios.json'), 'utf8');
  check(!usuarios.includes(senhaAdmin) && /\$2y\$/.test(usuarios), 'senha guardada só como hash');
  const sessoes = fs.readFileSync(path.join(inst.dados, 'estado', 'sessoes.json'), 'utf8');
  check(!sessoes.includes(ac.cookie.split('=')[1]), 'sessão guardada pelo hash do token, nunca o token');
  let admin = ac.cookie;
  check((await req('GET', 'eu', { cookie: admin })).j?.nome === 'Admin Teste', '/api/eu devolve quem entrou');
  check((await req('GET', 'sessao', { cookie: admin })).j?.usuario?.papel === 'admin', '/api/sessao devolve quem entrou');

  // ---------------------------------------------------------------- login e limites
  check((await req('POST', 'entrar', { corpo: { email: 'admin@teste.local', senha: 'errada-errada' }, ip: '10.0.0.9' })).status === 401, 'senha errada recusada (401)');
  const espera = await req('POST', 'entrar', { corpo: { email: 'admin@teste.local', senha: senhaAdmin }, ip: '10.0.0.9' });
  check(espera.status === 429 && espera.j.erro.codigo === 'ESPERA', 'depois de errar, espera progressiva antes da próxima tentativa');
  let bloqueou = false;
  for (let i = 0; i < 10; i++) { const r = await req('POST', 'entrar', { corpo: { email: 'ninguem' + i + '@teste.local', senha: 'x' }, ip: '10.0.0.77' }); if (r.status === 429 && r.j.erro.codigo === 'LIMITE') { bloqueou = true; break; } }
  check(bloqueou, 'limite de tentativas por IP (429)');
  const login = await req('POST', 'entrar', { corpo: { email: 'ADMIN@teste.local', senha: senhaAdmin }, ip: '10.0.0.10' });
  check(login.status === 200 && login.cookie.startsWith('w7start='), 'login certo de outro IP entra (e-mail sem diferença de maiúscula)');
  admin = login.cookie;

  // ---------------------------------------------------------------- projetos
  check((await req('POST', 'projetos', { cookie: admin, corpo: { diagnostico: { cliente: {} } } })).status === 400, 'diagnóstico sem nome do cliente recusado');
  check((await req('POST', 'projetos', { cookie: admin, corpo: { diagnostico: diagA, logo: 'javascript:alert(1)' } })).status === 400, 'logo fora de data:image recusada');
  const logo = 'data:image/png;base64,iVBORw0KGgo=';
  const p1 = await req('POST', 'projetos', { cookie: admin, corpo: { diagnostico: diagA, logo } });
  check(p1.status === 200 && /^[a-f0-9]{16}$/.test(p1.j.id) && p1.j.novo === true, 'diagnóstico salvo cria o projeto');
  const id = p1.j.id;
  const diagA2 = { ...diagA, cliente: { ...diagA.cliente, cidade: 'Cidade Nova' } };
  const p2 = await req('POST', 'projetos', { cookie: admin, corpo: { diagnostico: diagA2, logo } });
  check(p2.j.id === id && p2.j.novo === false, 'o mesmo cliente de novo atualiza o mesmo projeto (pelo nome)');
  const p3 = await req('POST', 'projetos', { cookie: admin, corpo: { id, diagnostico: diagB } });
  check(p3.j.id !== id && p3.j.novo === true, 'outro cliente com o id de um projeto vira projeto novo (nunca grava por cima)');
  const lista = await req('GET', 'projetos', { cookie: admin });
  check(lista.j.projetos.length === 2 && lista.j.projetos[0].id === p3.j.id && lista.j.projetos.find((p) => p.id === id).cidade === 'Cidade Nova', 'lista com os dois, o mais recente primeiro, e a cidade atualizada');
  check(lista.j.projetos.every((p) => !('diagnostico' in p) && !('logo' in p)), 'a lista traz só o resumo (sem o diagnóstico nem a logo)');
  check((await req('PUT', `projetos/${id}/onboarding`, { cookie: admin, corpo: { respostas: { schema: 'outro' } } })).status === 400, 'respostas fora do formato do onboarding recusadas');
  check((await req('PUT', `projetos/${id}/onboarding`, { corpo: { respostas: respostas('x') } })).status === 401, 'salvar onboarding sem sessão recusado');
  const o1 = await req('PUT', `projetos/${id}/onboarding`, { cookie: admin, corpo: { respostas: respostas('primeira') } });
  const o2 = await req('PUT', `projetos/${id}/onboarding`, { cookie: admin, corpo: { respostas: respostas('segunda') } });
  check(o1.status === 200 && o2.status === 200, 'respostas do onboarding salvas a cada mudança');
  check((await req('PUT', `projetos/${id}/mapa`, { cookie: admin, corpo: { dados: { schema: 'w7-diagnostico' } } })).status === 400, 'mapeamento fora do formato recusado');
  check((await req('PUT', `projetos/${id}/mapa`, { cookie: admin, corpo: { dados: mapa } })).status === 200, 'mapeamento salvo');
  const g = await req('GET', `projetos/${id}`, { cookie: admin });
  check(g.j.onboarding.respostas.observacoes === 'segunda' && g.j.mapa.dados.schema === 'w7-mapa-onboarding' && g.j.logo === logo, 'projeto reaberto com o diagnóstico, a logo, a última resposta e o mapeamento');
  check(g.j.versoes.length === 1 && !('diagnostico' in g.j.versoes[0]) && g.j.versoes[0].quem === 'Admin Teste', 'versão anterior do diagnóstico guardada (só o resumo, sem ?versoes=1)');
  const gv = await req('GET', `projetos/${id}?versoes=1`, { cookie: admin });
  check(gv.j.versoes[0].diagnostico.cliente.cidade === diagA.cliente.cidade, 'com ?versoes=1, a versão anterior vem inteira');
  check(g.j.historico.filter((h) => h.acao === 'onboarding').length === 1 && g.j.historico[0].acao === 'mapeamento gerado', 'histórico agrupa as respostas da mesma sessão numa linha só');
  const resumo = (await req('GET', 'projetos', { cookie: admin })).j.projetos.find((p) => p.id === id);
  check(resumo.etapa === 'mapeamento' && resumo.atualizado_por === 'Admin Teste', 'etapa do projeto na lista: mapeamento pronto');
  const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const pastas = fs.readdirSync(path.join(inst.dados, 'backups'));
  check(pastas.length >= 1 && fs.existsSync(path.join(inst.dados, 'backups', pastas[0], id + '.json')), `cópia do dia do projeto em backups/ (${pastas.join(', ')} · ${hoje})`);
  check((await req('GET', 'projetos/../usuarios', { cookie: admin })).status === 404 && (await req('GET', 'projetos/zzzz', { cookie: admin })).status === 404, 'id fora do formato nunca vira caminho de arquivo');

  // ---------------------------------------------------------------- equipe
  const cv = await req('POST', 'equipe/convites', { cookie: admin, corpo: { nome: 'Pessoa Equipe', email: 'equipe@teste.local', papel: 'equipe' } });
  const tok = /#convite=([a-f0-9]{40})$/.exec(cv.j?.link || '')?.[1];
  check(cv.status === 200 && tok && cv.j.expira_em_dias === 7, 'administrador gera link de convite (7 dias)');
  check((await req('POST', 'equipe/convites', { cookie: admin, corpo: { nome: 'X', email: 'nao-e-email', papel: 'equipe' } })).status === 400, 'convite com e-mail inválido recusado');
  const ace = await req('POST', 'convite/aceitar', { corpo: { token: tok, nome: 'Pessoa Equipe', senha: 'senha-da-equipe-123' } });
  const equipe = ace.cookie;
  check(ace.status === 200 && ace.j.papel === 'equipe', 'pessoa da equipe cria o acesso pelo link');
  check((await req('POST', 'equipe/convites', { cookie: admin, corpo: { nome: 'Pessoa Equipe', email: 'equipe@teste.local' } })).status === 409, 'quem já tem conta ativa não recebe convite de novo');
  check((await req('GET', 'projetos', { cookie: equipe })).j.projetos.length === 2, 'a equipe vê todos os projetos salvos');
  check((await req('PUT', `projetos/${id}/onboarding`, { cookie: equipe, corpo: { respostas: respostas('terceira, outra pessoa') } })).status === 200, 'a equipe continua o onboarding de outro colega');
  const g2 = await req('GET', `projetos/${id}`, { cookie: equipe });
  check(g2.j.versoes_onboarding.length === 1 && g2.j.versoes_onboarding[0].quem === 'Admin Teste' && g2.j.atualizado_por === 'Pessoa Equipe', 'outra pessoa no onboarding guarda a versão anterior');
  check((await req('GET', 'equipe', { cookie: equipe })).status === 403, 'equipe não gerencia a equipe (403)');
  check((await req('POST', `projetos/${id}/arquivar`, { cookie: equipe, corpo: { arquivar: true } })).status === 403, 'equipe não arquiva projeto (403)');
  const eq = await req('GET', 'equipe', { cookie: admin });
  check(eq.j.usuarios.length === 2 && eq.j.usuarios.every((u) => !('hash' in u)), 'lista da equipe sem hash de senha');
  check((await req('POST', 'equipe/situacao', { cookie: admin, corpo: { email: 'admin@teste.local', ativo: false } })).status === 400, 'administrador não desativa a própria conta');
  check((await req('POST', 'equipe/situacao', { cookie: admin, corpo: { email: 'equipe@teste.local', ativo: false } })).status === 200 && (await req('GET', 'eu', { cookie: equipe })).status === 401, 'conta desativada perde a sessão na hora');
  check((await req('POST', 'entrar', { corpo: { email: 'equipe@teste.local', senha: 'senha-da-equipe-123' }, ip: '10.0.0.20' })).status === 401, 'conta desativada não entra');

  // ---------------------------------------------------------------- arquivar e sair
  check((await req('POST', `projetos/${p3.j.id}/arquivar`, { cookie: admin, corpo: { arquivar: true } })).status === 200, 'administrador arquiva projeto');
  check((await req('GET', 'projetos', { cookie: admin })).j.projetos.length === 1 && (await req('GET', 'projetos?arquivados=1', { cookie: admin })).j.projetos.length === 2, 'arquivado sai da lista e volta com "mostrar arquivados"');
  check((await req('PUT', `projetos/${p3.j.id}/onboarding`, { cookie: admin, corpo: { respostas: respostas('x') } })).status === 404, 'projeto arquivado não recebe gravação');
  const sair = await req('POST', 'sair', { cookie: admin });
  check(sair.status === 200 && (await req('GET', 'eu', { cookie: admin })).status === 401, 'sair encerra a sessão no servidor');

  // ---------------------------------------------------------------- pasta de dados
  const arquivos = fs.readdirSync(inst.dados, { recursive: true }).map(String);
  check(!arquivos.some((a) => a.endsWith('.tmp')), 'nenhum arquivo temporário sobrando (gravação atômica)');
  check(!/PHP (Warning|Fatal|Notice|Deprecated)/.test(inst.saida()), 'PHP sem aviso nem erro durante o teste');
} finally {
  await inst.parar();
}

// ---------------------------------------------------------------- convite do primeiro administrador, sem e-mail (como a publicação semeia)
const inst2 = await subirInstancia({ emailAdmin: '' });
try {
  const r = (rota, corpo) => fetch(inst2.base + '/api/' + rota, { method: 'POST', headers: { 'X-Start': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const v = await (await r('convite/ver', { token: inst2.token })).json();
  check(v.email === '' && v.papel === 'admin', 'convite da publicação chega sem e-mail');
  check((await r('convite/aceitar', { token: inst2.token, nome: 'Primeiro Admin', senha: 'senha-longa-do-admin', email: 'nao-e-email' })).status === 400, 'sem e-mail válido, o convite livre não cria conta');
  const ok = await r('convite/aceitar', { token: inst2.token, nome: 'Primeiro Admin', senha: 'senha-longa-do-admin', email: 'Primeiro@Teste.local' });
  const j = await ok.json();
  check(ok.status === 200 && j.email === 'primeiro@teste.local' && j.papel === 'admin', 'a pessoa escreve o próprio e-mail e vira administradora');
  check((await r('convite/aceitar', { token: inst2.token, nome: 'X', senha: 'senha-longa-do-admin', email: 'outro@teste.local' })).status === 404, 'convite livre usado uma vez não vale de novo');
} finally {
  await inst2.parar();
}

console.log(`\n${total} checagens da API do start · ${falhas ? falhas + ' falha(s)' : 'regressão ok'}`);
process.exit(falhas ? 1 : 0);
