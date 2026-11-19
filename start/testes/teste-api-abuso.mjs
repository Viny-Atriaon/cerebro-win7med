// Regressão da API do start.win7.ai (ADR-008): contas por convite, sessão, limites, projetos salvos e equipe.
// Roda contra uma instância descartável do PHP (start/testes/instancia.mjs). Uso: node start/testes/teste-api-abuso.mjs
// Precisa de `npm run build` antes (o roteador serve dist/start) e do PHP 8 (no Windows, o do winget).
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { subirInstancia, comandoPhp } from './instancia.mjs';
import { abrirCopia, conferirCopia } from './restaurar-copia.mjs';

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
  // ---------------------------------------------------------------- pastas, quem fez, salvar e versões (18/11)
  check((await req('POST', 'pastas', { cookie: equipe, corpo: { nome: '  ' } })).status === 400, 'pasta sem nome recusada');
  const pa = await req('POST', 'pastas', { cookie: equipe, corpo: { nome: 'Onboardings de novembro' } });
  check(pa.status === 200 && /^[a-f0-9]{12}$/.test(pa.j.id) && pa.j.criada_por === 'Pessoa Equipe', 'a equipe cria pasta (com o nome de quem criou)');
  check((await req('POST', 'pastas', { cookie: admin, corpo: { nome: 'ONBOARDINGS DE NOVEMBRO' } })).status === 409, 'pasta com nome repetido recusada');
  const pb = await req('POST', 'pastas', { cookie: admin, corpo: { nome: 'Antigos' } });
  check((await req('GET', 'pastas', { cookie: equipe })).j.pastas.map((x) => x.nome).join() === 'Antigos,Onboardings de novembro', 'lista de pastas em ordem alfabética');
  check((await req('POST', 'projetos', { cookie: equipe, corpo: { diagnostico: diagA2, logo, pasta: 'abcdefabcdef' } })).status === 400, 'salvar em pasta que não existe recusado');
  const sv = await req('POST', 'projetos', { cookie: equipe, corpo: { id, diagnostico: diagA2, logo, pasta: pa.j.id } });
  const gs = await req('GET', `projetos/${id}`, { cookie: equipe });
  check(sv.status === 200 && sv.j.pasta === pa.j.id && gs.j.historico[0].acao === 'guardado na pasta Onboardings de novembro' && gs.j.historico[1].acao === 'diagnóstico salvo', 'botão Salvar sem mudança registra "diagnóstico salvo" e guarda na pasta escolhida');
  const res = (await req('GET', 'projetos', { cookie: equipe })).j.projetos.find((x) => x.id === id);
  check(res.pasta === pa.j.id && res.criado_por === 'Admin Teste' && res.atualizado_por === 'Pessoa Equipe', 'a lista mostra a pasta, quem fez e quem atualizou');
  check((await req('POST', 'projetos', { cookie: equipe, corpo: { id, diagnostico: diagA2, logo } })).j.pasta === pa.j.id, 'salvar sem escolher pasta mantém a pasta');
  check((await req('PUT', `projetos/${id}/pasta`, { cookie: equipe, corpo: { pasta: 'abcdefabcdef' } })).status === 400, 'mover para pasta inexistente recusado');
  check((await req('PUT', `projetos/${id}/pasta`, { cookie: equipe, corpo: { pasta: pb.j.id } })).status === 200 && (await req('GET', 'projetos', { cookie: equipe })).j.projetos.find((x) => x.id === id).pasta === pb.j.id, 'mover o projeto de pasta');
  check((await req('POST', `pastas/${pb.j.id}/apagar`, { cookie: equipe })).status === 409, 'pasta com projeto não é apagada');
  check((await req('POST', `pastas/${pb.j.id}/renomear`, { cookie: equipe, corpo: { nome: 'Antigos 2025' } })).status === 200 && (await req('GET', 'pastas', { cookie: equipe })).j.pastas.some((x) => x.nome === 'Antigos 2025'), 'renomear pasta');
  check((await req('POST', `pastas/${pa.j.id}/apagar`, { cookie: equipe })).status === 200 && !(await req('GET', 'pastas', { cookie: equipe })).j.pastas.some((x) => x.id === pa.j.id), 'pasta vazia apagada');
  for (let i = 1; i <= 22; i++) await req('POST', 'projetos', { cookie: equipe, corpo: { id, diagnostico: { ...diagA, cliente: { ...diagA.cliente, cidade: 'Cidade ' + i } }, logo } });
  const gv2 = await req('GET', `projetos/${id}?versoes=1`, { cookie: equipe });
  check(gv2.j.versoes.length === 20 && gv2.j.versoes[0].diagnostico.cliente.cidade === 'Cidade 21', 'guarda as 20 versões anteriores do diagnóstico, a mais recente primeiro');
  const alvo = gv2.j.versoes[5];
  const volta = await req('POST', 'projetos', { cookie: equipe, corpo: { id, diagnostico: alvo.diagnostico, logo, versao_de: alvo.quando } });
  const gvolta = await req('GET', `projetos/${id}`, { cookie: equipe });
  check(volta.status === 200 && gvolta.j.diagnostico.cliente.cidade === alvo.diagnostico.cliente.cidade && /^voltou para a versão de \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(gvolta.j.historico[0].acao), 'abrir uma versão antiga e salvar volta o projeto para ela (e registra no histórico)');
  check((await req('POST', `projetos/${id}/arquivar`, { cookie: equipe, corpo: { arquivar: true } })).status === 200 && (await req('GET', `projetos/${id}`, { cookie: equipe })).status === 200, 'a equipe arquiva (nada é apagado) e ainda abre o arquivado');
  check((await req('GET', 'projetos?arquivados=1', { cookie: equipe })).j.projetos.some((x) => x.id === id && x.arquivado) && (await req('POST', `projetos/${id}/arquivar`, { cookie: equipe, corpo: { arquivar: false } })).status === 200, 'a equipe vê os arquivados e desarquiva');
  const eq = await req('GET', 'equipe', { cookie: admin });
  check(eq.j.usuarios.length === 2 && eq.j.usuarios.every((u) => !('hash' in u)), 'lista da equipe sem hash de senha');
  check((await req('POST', 'equipe/situacao', { cookie: admin, corpo: { email: 'admin@teste.local', ativo: false } })).status === 400, 'administrador não desativa a própria conta');
  check((await req('POST', 'equipe/situacao', { cookie: admin, corpo: { email: 'equipe@teste.local', ativo: false } })).status === 200 && (await req('GET', 'eu', { cookie: equipe })).status === 401, 'conta desativada perde a sessão na hora');
  check((await req('POST', 'entrar', { corpo: { email: 'equipe@teste.local', senha: 'senha-da-equipe-123' }, ip: '10.0.0.20' })).status === 401, 'conta desativada não entra');

  // ---------------------------------------------------------------- arquivar e sair
  check((await req('POST', `projetos/${p3.j.id}/arquivar`, { cookie: admin, corpo: { arquivar: true } })).status === 200, 'administrador arquiva projeto');
  // ---------------------------------------------------------------- cópia do dia (cron do cPanel) para a tarefa Win7-BackupFora
  const php = comandoPhp();
  const cron = (args = []) => spawnSync(php.exe, [...php.args, path.join(RAIZ, 'start', 'api', 'lib', 'cron.php'), ...args], { env: { ...process.env, DADOS_DIR: inst.dados }, encoding: 'utf8', windowsHide: true });
  check(/falta a chave-copia/.test(cron().stdout), 'sem a chave, o cron não gera cópia (e avisa)');
  const chave = crypto.randomBytes(32);
  fs.writeFileSync(path.join(inst.dados, 'chave-copia.txt'), chave.toString('base64'));
  const c1 = JSON.parse(cron().stdout || '{}');
  const pastaCopias = path.join(inst.dados, 'copias');
  const enc = c1.copia?.arquivo ? path.join(pastaCopias, c1.copia.arquivo) : '';
  check(enc && fs.existsSync(enc) && fs.existsSync(enc + '.sha256') && fs.existsSync(enc + '.b64.001'), 'o cron gera a cópia do dia cifrada, as partes em base64 e o .sha256');
  if (enc) {
    const bruto = fs.readFileSync(enc);
    const partes = fs.readdirSync(pastaCopias).filter((f) => f.startsWith(c1.copia.arquivo + '.b64.')).sort();
    const remontado = Buffer.from(partes.map((f) => fs.readFileSync(path.join(pastaCopias, f), 'utf8')).join(''), 'base64');
    check(remontado.equals(bruto) && crypto.createHash('sha256').update(bruto).digest('hex') === fs.readFileSync(enc + '.sha256', 'utf8').trim(), 'as partes remontam o arquivo e o SHA-256 bate (como a tarefa baixa)');
    check(bruto.subarray(0, 4).toString() === 'WCB1' && !bruto.includes(Buffer.from('Clínica Teste')) && !bruto.includes(Buffer.from('usuarios')), 'a cópia é ilegível sem a chave');
    const copia = abrirCopia(bruto, chave), conf = conferirCopia(copia);
    check(conf.projetos === 2 && conf.contas === 2 && conf.pastas === 1 && conf.problemas.length === 0 && !copia.arquivos['estado/sessoes.json'], 'decifrada com a chave: projetos, contas e pastas coerentes, sem as sessões');
    let errada = false; try { abrirCopia(bruto, crypto.randomBytes(32)); } catch { errada = true; }
    check(errada, 'com outra chave a cópia não abre');
  }
  check(/já existe/.test(cron().stdout) && JSON.parse(cron(['--forcar']).stdout).copia.arquivo, 'uma cópia por dia; --forcar gera outra');
  check((await fetch(B + '/api/lib/cron.php')).status === 403, 'o cron não roda pela web');
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

// ---------------------------------------------------------------- senha temporária (19/11): conta semeada pela publicação, troca obrigatória
const inst3 = await subirInstancia();
try {
  const php = comandoPhp();
  const hashDe = (senha) => spawnSync(php.exe, [...php.args, '-r', "echo password_hash(getenv('W7_S'), PASSWORD_DEFAULT);"], { env: { ...process.env, W7_S: senha }, encoding: 'utf8', windowsHide: true }).stdout.trim();
  const temp = 'Abcd-Efgh-Jk23';
  fs.writeFileSync(path.join(inst3.dados, 'usuarios-semente.json'), JSON.stringify([{ email: 'Admin@Teste.Local', nome: 'Administrador', papel: 'admin', hash: hashDe(temp) }]));
  const R = async (metodo, rota, corpo, cookie = '') => {
    const r = await fetch(inst3.base + '/api/' + rota, { method: metodo, headers: { 'X-Start': '1', ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { j = null; }
    return { status: r.status, j, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
  };
  const l1 = await R('POST', 'entrar', { email: 'admin@teste.local', senha: temp });
  check(l1.status === 200 && l1.j.trocar_senha === true && l1.j.papel === 'admin', 'conta semeada pela publicação entra com a senha temporária e vem marcada para trocar');
  const usu = fs.readFileSync(path.join(inst3.dados, 'usuarios.json'), 'utf8');
  check(!fs.existsSync(path.join(inst3.dados, 'usuarios-semente.json')) && !usu.includes(temp), 'semente absorvida e apagada; a senha temporária não fica guardada, só o hash');
  const ck = l1.cookie;
  check((await R('GET', 'projetos', null, ck)).j?.erro?.codigo === 'TROCAR_SENHA' && (await R('POST', 'pastas', { nome: 'x' }, ck)).status === 403, 'com a senha temporária, nada além de trocar a senha (403 TROCAR_SENHA)');
  check((await R('GET', 'sessao', null, ck)).j?.usuario?.trocar_senha === true, 'a sessão avisa a tela que precisa trocar a senha');
  check((await R('POST', 'senha', { atual: 'errada-errada', nova: 'nova-senha-do-admin' }, ck)).j?.erro?.codigo === 'SENHA_ATUAL', 'troca com a senha atual errada recusada');
  check((await R('POST', 'senha', { atual: temp, nova: 'curta' }, ck)).status === 400 && (await R('POST', 'senha', { atual: temp, nova: temp }, ck)).status === 400, 'senha nova curta ou igual à temporária recusada');
  const tr = await R('POST', 'senha', { atual: temp, nova: 'nova-senha-do-admin' }, ck);
  check(tr.status === 200 && tr.j.trocar_senha === false && (await R('GET', 'projetos', null, ck)).status === 200, 'depois de trocar, a mesma sessão segue e o sistema abre');
  const espera = () => new Promise((r) => setTimeout(r, 1100));  // a espera progressiva depois de uma senha errada (defesa contra força bruta)
  const velha = (await R('POST', 'entrar', { email: 'admin@teste.local', senha: temp })).status;
  await espera();
  check(velha === 401 && (await R('POST', 'entrar', { email: 'admin@teste.local', senha: 'nova-senha-do-admin' })).status === 200, 'a temporária deixa de valer; a senha nova entra');
  // o administrador cria uma pessoa já com senha temporária
  const cu = await R('POST', 'equipe/usuarios', { nome: 'Pessoa Nova', email: 'nova@teste.local', papel: 'equipe' }, ck);
  check(cu.status === 200 && /^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/.test(cu.j.senha_temporaria) && cu.j.expira_em_dias === 7, 'administrador adiciona pessoa com senha temporária (12 caracteres, sem os que confundem, 7 dias)');
  check((await R('POST', 'equipe/usuarios', { nome: 'Pessoa Nova', email: 'nova@teste.local' }, ck)).status === 409, 'pessoa com conta ativa não é criada de novo');
  const eqv = await R('GET', 'equipe', null, ck);
  check(eqv.j.usuarios.find((u) => u.email === 'nova@teste.local')?.trocar_senha === true && eqv.j.usuarios.every((u) => !('hash' in u) && !('temporaria_expira' in u)), 'a equipe mostra quem ainda está com a senha temporária, sem hash');
  const ln = await R('POST', 'entrar', { email: 'nova@teste.local', senha: cu.j.senha_temporaria });
  check(ln.status === 200 && ln.j.trocar_senha === true && (await R('POST', 'senha', { atual: cu.j.senha_temporaria, nova: 'senha-da-pessoa-nova' }, ln.cookie)).status === 200, 'a pessoa entra com a temporária e cria a própria senha');
  // redefinir: senha nova temporária, sessão derrubada
  const rd = await R('POST', 'equipe/redefinir', { email: 'nova@teste.local' }, ck);
  check(rd.status === 200 && rd.j.senha_temporaria && (await R('GET', 'eu', null, ln.cookie)).status === 401, 'redefinir senha gera uma temporária nova e derruba as sessões da pessoa');
  const antiga = (await R('POST', 'entrar', { email: 'nova@teste.local', senha: 'senha-da-pessoa-nova' })).status;
  await espera();
  check(antiga === 401 && (await R('POST', 'entrar', { email: 'nova@teste.local', senha: rd.j.senha_temporaria })).j?.trocar_senha === true, 'depois de redefinir, só a temporária nova entra (e pede a troca)');
  check((await R('POST', 'equipe/redefinir', { email: 'admin@teste.local' }, ck)).status === 400, 'o administrador não redefine a própria senha por ali (usa Trocar minha senha)');
  const eq2 = (await R('POST', 'entrar', { email: 'nova@teste.local', senha: 'x' })).status;
  check(eq2 === 401, 'senha errada continua recusada');
  // temporária vencida
  const arqU = path.join(inst3.dados, 'usuarios.json');
  const lista = JSON.parse(fs.readFileSync(arqU, 'utf8'));
  lista.find((u) => u.email === 'nova@teste.local').temporaria_expira = Date.now() - 1000;
  fs.writeFileSync(arqU, JSON.stringify(lista));
  await new Promise((r) => setTimeout(r, 1100));  // a espera progressiva da senha errada de cima
  check((await R('POST', 'entrar', { email: 'nova@teste.local', senha: rd.j.senha_temporaria })).j?.erro?.codigo === 'TEMPORARIA_VENCIDA', 'senha temporária vencida (7 dias) não entra');
  check((await R('POST', 'equipe/usuarios', { nome: 'Sem email', email: 'nao-e-email' }, ck)).status === 400, 'pessoa com e-mail inválido recusada');
  const semPapel = await R('POST', 'equipe/usuarios', { nome: 'Pessoa Comum', email: 'comum@teste.local' }, ck);
  const lc = await R('POST', 'entrar', { email: 'comum@teste.local', senha: semPapel.j.senha_temporaria });
  await R('POST', 'senha', { atual: semPapel.j.senha_temporaria, nova: 'senha-da-pessoa-comum' }, lc.cookie);
  check((await R('POST', 'equipe/usuarios', { nome: 'X', email: 'x@teste.local' }, lc.cookie)).status === 403 && (await R('POST', 'equipe/redefinir', { email: 'nova@teste.local' }, lc.cookie)).status === 403, 'só o administrador cria pessoas e redefine senhas');
} finally {
  await inst3.parar();
}

console.log(`\n${total} checagens da API do start · ${falhas ? falhas + ' falha(s)' : 'regressão ok'}`);
process.exit(falhas ? 1 : 0);
