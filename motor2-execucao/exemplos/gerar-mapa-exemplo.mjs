// Monta o mapeamento do onboarding da Clínica Vértice (cliente fictício) como se a reunião tivesse acontecido.
// Uso: node motor2-execucao/exemplos/gerar-mapa-exemplo.mjs   (grava em motor2-execucao/exemplos/clinica-vertice/)
// Dados todos fictícios: CRM 00000, CNPJ de teste e e-mail em domínio de exemplo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
for (const f of ['motor/motor-diagnostico.js', 'onboarding/onboarding.js']) await import(pathToFileURL(path.join(RAIZ, 'motor1-diagnostico', f)).href);
const O = globalThis.OnboardingW7;
const pasta = path.join(AQUI, 'clinica-vertice');
const diag = JSON.parse(fs.readFileSync(path.join(pasta, 'diagnostico.json'), 'utf8'));

const r = O.estadoInicial(diag);
r.data_reuniao = '21/10/2026';
r.verba.mensal = '3.000';
r.servicos.forEach((s) => { s.confirmado = /resson|tomogra/i.test(s.nome); });
r.lp_base = 2;
r.dominio.modo = 'escolhido'; r.dominio.escolhido = 'ressonanciarioverde.com.br';
r.diferenciais.parcelamento = { tem: 'sim', vezes: '10', sem_juros: '10' };
Object.assign(r.diferenciais.pagamento, { pix: true, cartao_credito: true, cartao_debito: true });
r.diferenciais.estacionamento = { tem: 'sim', detalhe: 'estacionamento próprio para pacientes' };
r.diferenciais.equipamento = { tem: 'sim', detalhe: 'ressonância de 1,5 Tesla' };
r.convenios.situacao = 'sim';
r.depoimentos = { tem: 'nao', vai_enviar: null, vai_gravar: 'sim', responsavel: 'Recepção', prazo: '28/10/2026', prazo_envio: '' };
r.video_home = { opcao: 'cliente', responsavel: 'Dra. Helena', prazo: '30/10/2026', observacao: '' };
r.cidades.forEach((c) => { if (c.atuar === null) c.atuar = c.km < 100; });
const valores = { whatsapp: '(64) 99999-0000', rt: 'Dra. Helena Prado · CRM/GO 00000', razao_social: 'Vértice Diagnóstico por Imagem Ltda (fictícia)', cnpj: '00.000.000/0001-91', email_privacidade: 'privacidade@verticeimagem.exemplo.com.br' };
r.dados_cliente.forEach((x) => { if (!x.valor && valores[x.campo]) x.valor = valores[x.campo]; x.status = 'ok'; });
r.confirmacoes.forEach((c) => { c.status = 'ok'; });
r.participantes = 'Dra. Helena Prado (diretora), Marcos (gerente) e Win7 (fictício)';
const mapa = O.montarMapa(diag, r);
const v = O.validarMapa(mapa);
fs.writeFileSync(path.join(pasta, 'mapa-onboarding-clinica-vertice-imagem.json'), JSON.stringify(mapa, null, 2) + '\n', 'utf8');
console.log('mapa gravado · erros', v.erros.length, '· avisos', v.avisos.length, v.erros.concat(v.avisos).join(' | '));
