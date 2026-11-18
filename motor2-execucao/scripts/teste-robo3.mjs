// Regressão do robô 3 (ADR-007) com o cliente fictício Clínica Vértice. Uso: node motor2-execucao/scripts/teste-robo3.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregar } from './robo3.mjs';

const M2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = path.resolve(M2, '..');
const EX = path.join(M2, 'exemplos', 'clinica-vertice');
const { L, O, X } = await carregar();
const ler = (p) => fs.readFileSync(p, 'utf8');
const json = (n) => JSON.parse(ler(path.join(EX, n)));
const clone = (o) => JSON.parse(JSON.stringify(o));
let falhas = 0, total = 0;
function check(ok, rotulo) { total++; if (ok) console.log('✅ ' + rotulo); else { falhas++; console.log('❌ ' + rotulo); } }

const diag = json('diagnostico.json'), mapa = json('mapa-onboarding-clinica-vertice-imagem.json'), ficha = json('ficha.json'), plano = json('plano.json');
const trans = ler(path.join(EX, 'transcricao-reuniao.txt'));

// ---------------------------------------------------------------- ficha
const rasc = X.rascunhoFicha(diag, mapa);
check(rasc.paginas.length === 2 && rasc.paginas[0].servico === 'Ressonância magnética' && rasc.paginas[0].slug === '' && rasc.paginas[1].slug === 'tomografia', 'rascunho: uma página por serviço confirmado, a principal na raiz, até o limite da verba');
check(rasc.fatos.rt.status === 'confirmado' && rasc.fatos.cnpj.valor === '00.000.000/0001-91' && rasc.base_banner === 2 && rasc.cores && rasc.cores.marca === '#29527b', 'rascunho: dados conferidos na reunião, base do banner e cores da logo vêm do Mapa e do diagnóstico');
const vf = X.validarFicha(ficha, trans);
check(vf.erros.length === 0, `ficha do exemplo válida ${vf.erros.join(' | ')}`);
const inventada = clone(ficha); inventada.dores[0].citacao = 'o paciente disse que adora esperar seis meses';
check(X.validarFicha(inventada, trans).erros.some((e) => /não está na transcrição/.test(e)), 'citação que não está na transcrição reprova (fato inventado)');
const curta = clone(ficha); curta.fatos.selo.citacao = 'doze anos';
check(X.validarFicha(curta, trans).erros.some((e) => /menos de 3 palavras/.test(e)), 'citação curta demais reprova');
const wa = clone(ficha); wa.fatos.whatsapp.valor = '(64) 9999';
check(X.validarFicha(wa, trans).erros.some((e) => /WhatsApp/.test(e)), 'WhatsApp sem 11 dígitos reprova');
const seloSemFonte = clone(ficha); seloSemFonte.fatos.selo = { valor: '20 anos de referência em Rio Verde', fonte: 'diagnostico', citacao: '', status: 'confirmado' };
check(X.validarFicha(seloSemFonte, trans).erros.some((e) => /Selo/.test(e)), 'selo só com dado confirmado pelo cliente');
const semRt = clone(ficha); delete semRt.fatos.rt;
check(X.validarFicha(semRt, trans).erros.some((e) => /rt/.test(e)), 'página de saúde sem o fato do RT reprova');
const duasPrinc = clone(ficha); duasPrinc.paginas[1].principal = true;
check(X.validarFicha(duasPrinc, trans).erros.some((e) => /principal/.test(e)), 'exatamente uma página principal');
const itens = X.checklist(ficha, mapa, {});
const msg = X.mensagemWhatsApp(ficha, itens);
check(itens.filter((x) => /video da pagina|gravar o video/.test(X.norm(x.texto))).length === 1 && itens.filter((x) => /dominio/.test(X.norm(x.texto)) && !x.interno).length === 1, 'checklist sem item repetido (vídeo e domínio vêm do Mapa)');
check(!/Cadastro do formulário/.test(msg.principal) && itens.some((x) => x.interno && /formulário Win7/.test(x.texto)), 'tarefas internas da Win7 ficam fora da mensagem do grupo');
check(!/[–—]/.test(msg.principal + msg.confirmacoes) && !/\p{Extended_Pictographic}/u.test(msg.principal) && /Encaixe no mesmo dia/.test(msg.confirmacoes), 'mensagem do WhatsApp sem travessão nem emoji, com as perguntas de confirmação');

// ---------------------------------------------------------------- plano
const vp = X.validarPlano(plano, ficha);
check(vp.erros.length === 0, `plano do exemplo válido ${vp.erros.join(' | ')}`);
function errosCom(mut) { const p = clone(plano); mut(p); return X.validarPlano(p, ficha).erros; }
check(errosCom((p) => { p.paginas[0].roteiro.blocos[0].fala = 'Procurando ressonância em Rio Verde? Chegou ao lugar certo!'; }).some((e) => /abertura do vídeo é fixa/.test(e)), 'abertura do vídeo alterada reprova');
check(errosCom((p) => { p.paginas[0].roteiro.blocos[0].fala = 'Se você estava no google procurando por ressonância magnética em Rio Verde GO, você chegou ao lugar certo!'; }).some((e) => /estado|fixa/.test(e)), 'abertura com o estado reprova');
check(errosCom((p) => { p.paginas[0].roteiro.blocos.pop(); }).some((e) => /9 blocos|são 9/.test(e)), 'roteiro sem os 9 blocos reprova');
check(errosCom((p) => { p.paginas[0].roteiro.blocos[3].fala = 'Na Clínica Vértice você faz ressonância magnética com conforto, atendimento humano, equipe treinada, laudo rápido, parcelamento e estacionamento para toda a família de Rio Verde e região.'; }).some((e) => /não cabe/.test(e)), 'fala que não cabe no tempo do bloco reprova');
check(errosCom((p) => { p.paginas[0].copy.title = 'Ressonância Magnética em Rio Verde com laudo rápido e parcelamento | Clínica'; }).some((e) => /máximo 60/.test(e)), 'title acima de 60 caracteres reprova');
check(errosCom((p) => { p.paginas[0].copy.subtitulo = 'A ressonância magnética mais moderna e completa da região, com laudo em até 48 horas, resultado online e parcelamento em até 10x.'; }).some((e) => /20/.test(e)), 'subtítulo acima de 20 palavras reprova');
check(errosCom((p) => { p.paginas[0].copy.subtitulo = 'O melhor exame de ressonância de Rio Verde.'; }).some((e) => /melhor/.test(e)), 'superlativo ("melhor") reprova');
check(errosCom((p) => { p.paginas[0].anuncios.titulos[0] = 'Resultado garantido em 48h'; }).some((e) => /garantia/.test(e)), 'promessa de resultado reprova');
check(errosCom((p) => { p.paginas[0].copy.subtitulo = 'Ressonância de 1,5 Tesla — laudo em até 48 horas.'; }).some((e) => /travessão/.test(e)), 'travessão reprova');
check(errosCom((p) => { p.paginas[0].anuncios.descricoes[0] = 'Ressonância a partir de R$ 450 em Rio Verde.'; }).some((e) => /preço/.test(e)), 'preço sem autorização do cliente reprova');
check(errosCom((p) => { p.paginas[0].anuncios.titulos[1] = 'Ressonância Magnética Rio Verde GO'; }).some((e) => /máximo 30/.test(e)), 'título de anúncio acima de 30 caracteres reprova');
check(errosCom((p) => { p.paginas[0].anuncios.titulos[1] = 'Agende Já!'; }).some((e) => /exclamação/.test(e)), 'título com exclamação reprova (regra do Google)');
check(errosCom((p) => { p.paginas[0].grupos[0].palavras.push('+ressonância [rio verde]'); }).some((e) => /símbolo/.test(e)), 'palavra-chave com operador de correspondência reprova (só exata e frase, pelo motor)');
check(errosCom((p) => { p.paginas[0].grupos = p.paginas[0].grupos.filter((g) => g.intencao !== 'geral'); }).some((e) => /geral/.test(e)), 'sem o grupo "geral" (serviço e cidade) reprova');
check(errosCom((p) => { p.paginas[1].servico = 'Ultrassonografia'; }).some((e) => /diferente da ficha/.test(e)), 'página do plano diferente da ficha reprova');

// ---------------------------------------------------------------- campanhas e CSV
const camp = X.campanhas(plano, ficha);
const nPadrao = plano.paginas.reduce((a, p) => a + p.grupos.length, 0), nSkag = plano.paginas.reduce((a, p) => a + X.palavrasDaPagina(p).length, 0);
check(camp.campanhas[0].grupos.length === nPadrao && camp.campanhas[1].grupos.length === nSkag && camp.campanhas.every((c) => c.status === 'Pausada'), 'campanha padrão por intenção e SKAG com um grupo por palavra-chave, as duas pausadas');
const todas = camp.campanhas.flatMap((c) => c.grupos.flatMap((g) => g.palavras));
check(todas.every((k) => k.tipo === 'Exata' || k.tipo === 'Frase') && camp.campanhas[1].grupos.every((g) => g.palavras.length === 2), 'só exata e frase; nenhuma ampla');
check(camp.campanhas.every((c) => c.grupos.every((g) => g.anuncio.titulos.length <= 15 && g.anuncio.titulos.every((t) => t.length <= 30) && g.anuncio.descricoes.length <= 4 && g.anuncio.descricoes.every((t) => t.length <= 90))), 'anúncios dentro dos limites do Google (15 títulos de 30, 4 descrições de 90)');
check(camp.campanhas[0].grupos[0].url_final === 'https://ressonanciarioverde.com.br/' && camp.campanhas[0].grupos.find((g) => g.pagina === 'Tomografia').url_final === 'https://ressonanciarioverde.com.br/tomografia/', 'URL final: principal na raiz do domínio escolhido, demais em subcaminhos');
check(camp.orcamento.mensal === 3000 && camp.orcamento.diario === 98.68, 'orçamento diário da verba do Mapa (R$ 3.000 / 30,4)');
const csv = X.csvEditor(camp);
const cab = csv.slice(1).split('\r\n')[0];
check(csv.charCodeAt(0) === 0xfeff && ['Campaign', 'Ad Group', 'Keyword', 'Criterion Type', 'Headline 15', 'Description 4', 'Final URL'].every((c) => cab.includes('"' + c + '"')), 'CSV do Google Ads Editor com BOM e as colunas de campanha, grupo, palavra-chave e anúncio');
check(!/Broad/i.test(csv) && /"Paused"/.test(csv) && (csv.match(/"Exact"/g) || []).length === (csv.match(/"Phrase"/g) || []).length, 'CSV sem ampla, campanhas pausadas, uma exata para cada frase');

// ---------------------------------------------------------------- página real
const modelo = ler(path.join(RAIZ, 'motor1-diagnostico', 'lp-modelo', 'modelo.html'));
const waIco = ler(path.join(RAIZ, 'motor1-diagnostico', 'lp-modelo', 'icone-whatsapp.txt')).trim();
function pagina(i, midia = { logo: 'logo.png' }, ig = {}, f = ficha) {
  const d = X.dadosPagina(f, plano, plano.paginas[i], midia, ig);
  return L.montar(d.v, { modelo, wa: waIco, modo: 'real', base: d.real.raiz + 'assets/', real: d.real });
}
const p0 = pagina(0), p1 = pagina(1);
check(p0.html && L.conferirReal(p0.html, { publicar: true }).erros.length === 0 && p1.html && L.conferirReal(p1.html, { publicar: true }).erros.length === 0, `páginas reais montadas e aprovadas na conferência ${p0.erros.concat(p0.html ? L.conferirReal(p0.html, { publicar: true }).erros : []).join(' | ')}`);
check(/<meta name="robots" content="noindex/.test(p0.html) && /<p class="rt">RT: Dra\. Helena Prado/.test(p0.html) && /href="politica-de-privacidade\/"/.test(p0.html) && /href="\.\.\/politica-de-privacidade\/"/.test(p1.html), 'página real: noindex, RT verdadeiro no topo e link da política (raiz e subcaminho)');
check(!/faixa-modelo"|data-modelo|Convênio A<|Exemplo ilustrativo/.test(p0.html.replace(/<style[\s\S]*?<\/style>/, '')) && /Plano Vale Saúde/.test(p0.html) && /Ver lista completa \(4\)/.test(p0.html), 'nada do modelo na página real; convênios reais com o total');
check(/<p class="selo"><b>12<\/b>anos de referência em Rio Verde<\/p>/.test(p0.html) && /<ul class="pontos">/.test(p0.html) && /Atendemos também quem vem de Santa Helena de Goiás/.test(p0.html), 'selo confirmado, os 3 pontos e as cidades atendidas aparecem');
check(/data-pre-integracao data-whatsapp="5564999990000"/.test(p0.html) && !/win7-form\.js/.test(p0.html) && /href="tel:\+556400000000"/.test(p0.html), 'pré-integração: formulário abre o WhatsApp sem o script de lead; telefone clicável');
const pIg = pagina(0, { logo: 'logo.png' }, { data_cliente: 'ABC123', data_form: '999X1', data_token: 'win7_site_teste', gtm: 'GTM-TESTE01' });
check(/data-win7-form data-cliente="ABC123" data-form="999X1"/.test(pIg.html) && /src="assets\/win7-form\.js" data-token="win7_site_teste" defer/.test(pIg.html) && /googletagmanager\.com\/gtm\.js/.test(pIg.html) && /ns\.html\?id=GTM-TESTE01/.test(pIg.html), 'com integrações: formulário Win7, token do Portal e GTM');
check((p0.html.match(/class="campo b1"|class="ondas b2"|class="grade b3"/g) || []).join() === 'class="ondas b2"', 'página real leva só a base escolhida na reunião (2, Ondas)');
const fRt = clone(ficha); fRt.fatos.rt.status = 'a_confirmar';
const pSemRt = pagina(0, { logo: 'logo.png' }, {}, fRt);
check(pSemRt.html && L.conferirReal(pSemRt.html, { publicar: true }).erros.some((e) => /RT/.test(e)) && L.conferirReal(pSemRt.html, { publicar: false }).erros.length === 0, 'sem RT confirmado: a prévia sobe, o domínio não');
check(pagina(0, {}).erros.some((e) => /logo/.test(e)), 'página real sem a logo do cliente reprova');

// ---------------------------------------------------------------- cobertura
const cob = X.cobertura(plano, { '': p0.html, tomografia: p1.html });
check(cob.every((p) => p.nao_cobertas === 0) && cob[0].itens.find((x) => x.palavra === 'ressonância de joelho rio verde').status === 'coberta' && cob[0].itens.find((x) => x.palavra === 'ressonância perto de mim').status === 'parcial', 'cobertura: núcleo de toda palavra-chave na página; intenção faltando vira parcial');
const semJoelho = X.cobertura(plano, { '': p0.html.replace(/joelho, /g, ''), tomografia: p1.html });
check(semJoelho[0].itens.find((x) => x.palavra === 'ressonância de joelho rio verde').status === 'nao_coberta', 'palavra sem o núcleo na página é apontada');

// ---------------------------------------------------------------- política e documentos
const pol = X.politicaHtml(ficha, { logo: 'logo.png' });
check(/Vértice Diagnóstico por Imagem Ltda/.test(pol) && /00\.000\.000\/0001-91/.test(pol) && /privacidade@verticeimagem/.test(pol) && /art\. 18/.test(pol) && /Dados de saúde/.test(pol) && /noindex/.test(pol), 'política: controlador, CNPJ, e-mail, direitos do titular e o parágrafo de saúde');
const fGeral = clone(ficha); fGeral.cliente.setor = 'geral';
check(!/Dados de saúde/.test(X.politicaHtml(fGeral, {})) && !/[–—]/.test(pol.replace(/<[^>]+>/g, ' ')), 'política do segmento geral sem o parágrafo de saúde; sem travessão');
const docs = [X.docFicha(ficha, itens, msg, {}), X.docCopy(ficha, plano.paginas[0], {}), X.docRoteiro(ficha, plano.paginas[0], {}), X.docAds(ficha, camp, cob, {}, plano)];
check(docs.every((h) => /<h1>/.test(h) && !/[–—]/.test(h.replace(/<style[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' '))), 'documentos com título e sem travessão');
check(/RESSONÂNCIA MAGNÉTICA EM RIO VERDE/.test(docs[1]) && /0 a 7 s/.test(docs[2]) && /51 a 58 s/.test(docs[2]), 'landing page formatada com o H1 em caixa alta; roteiro com o tempo de cada bloco (58 s)');

check(fs.statSync(path.join(RAIZ, 'servidor', 'win7-form.js')).size === 14362, 'formulário Win7 copiado byte a byte do padrão (14.362 bytes, número vindo do sistema)');

// ---------------------------------------------------------------- ativação (como a do robô 1)
const atv = O.ativacaoRobo3();
check(/^A partir de agora você é o Robô 3/.test(atv) && atv.includes(O.REPO_CEREBRO) && atv.includes('robo3/SKILL.md') && /pedindo o endereço da pasta do cliente/.test(atv) && atv.split('\n').length === 4 && !/[–—]/.test(atv), 'comando inicial do robô 3: curto, com o repositório, e pede a pasta do cliente');
const { montarPaginaRobo3 } = await import('../../scripts/build.mjs');
const pagR3 = await montarPaginaRobo3();
check(/id="copiar">Copiar comando inicial</.test(pagR3) && pagR3.includes('A partir de agora você é o Robô 3') && /noindex/.test(pagR3) && !/\{\{/.test(pagR3), 'página do robô 3 com o botão "Copiar comando inicial" (como o Gerador do robô 1)');

// ---------------------------------------------------------------- entrada em qualquer formato (pedido do Viny, 14/10)
{
  const { carregarAtivos, carregarCss } = await import('../../motor1-diagnostico/scripts/gerar.mjs');
  const { inventario } = await import('./robo3.mjs');
  const Mm = globalThis.MotorDiagnostico;
  const laudo = Mm.gerarLaudo(diag, { css: carregarCss(), ativos: carregarAtivos() }).html;
  const embD = X.dadosEmbutidos(laudo);
  check(embD && embD.tipo === 'diagnostico' && embD.dados.cliente.nome === 'Clínica Vértice Imagem' && embD.dados.lp_modelo.base === 2 && !('ouvimos' in embD.dados) && !('presenca' in embD.dados), 'diagnóstico em HTML carrega os dados que o robô 3 usa (sem a conversa comercial)');
  const mapaHtml = O.gerarMapaHtml(mapa, diag, { css: carregarCss(), ativos: carregarAtivos() });
  const embM = X.dadosEmbutidos(mapaHtml);
  check(embM && embM.tipo === 'mapa' && embM.dados.schema === 'w7-mapa-onboarding' && embM.dados.decisoes.verba.mensal === 3000, 'mapeamento em HTML carrega o Mapa inteiro');
  check(X.classificarTexto('M A PA D O O N B OA R D I N G\nValidado na reunião', 'qualquer.pdf') === 'mapa' && X.classificarTexto('D I AG N Ó S T I C O PA R A G O O G L E A D S\nNº W7M', 'x.pdf') === 'diagnostico' &&
    X.classificarTexto('Anotações do Gemini · Transcrição\nFulano: bom dia', 'reuniao.pdf') === 'transcricao' && X.classificarTexto('qualquer coisa', 'Transcrição da reunião.docx') === 'transcricao' && X.classificarTexto('proposta comercial', 'proposta.pdf') === 'texto',
    'documento reconhecido pelo conteúdo, mesmo com as letras espaçadas do PDF');
  check(X.classificarJson(mapa) === 'mapa' && X.classificarJson(diag) === 'diagnostico' && X.classificarJson({ diagnostico: diag, respostas: {} }) === 'rascunho' && X.classificarJson(ficha) === '' && X.classificarJson(embD.dados) === 'diagnostico', 'JSON reconhecido pelo conteúdo (mapa, diagnóstico, rascunho da apresentação)');
  const tmp = fs.mkdtempSync(path.join((await import('node:os')).tmpdir(), 'robo3-'));
  fs.writeFileSync(path.join(tmp, 'Diagnostico baixado.html'), laudo);
  fs.writeFileSync(path.join(tmp, 'mapeamento final.html'), mapaHtml);
  fs.writeFileSync(path.join(tmp, 'reuniao.txt'), trans);
  const inv = inventario(tmp, X, O);
  check(inv.diag && inv.diag.dados && inv.mapa && inv.mapa.dados && /reuniao\.txt$/.test(inv.transcricao) && inv.dados.mapa.decisoes.pagina_principal === 'Ressonância magnética', 'pasta com HTML e TXT de nomes livres: diagnóstico, mapeamento e transcrição achados');
  fs.rmSync(tmp, { recursive: true, force: true });
  const so = X.rascunhoFicha(diag, null);
  check(so.paginas.length === 1 && so.paginas[0].servico === 'Ressonância magnética' && so.cliente.cidade === 'Rio Verde', 'sem o mapeamento estruturado, o rascunho sai do diagnóstico (a IA completa pelo texto)');
}

// ---------------------------------------------------------------- coerência agente x motor
const agente = ler(path.join(RAIZ, 'agente', 'AGENTE-EXECUCAO-WIN7MED.md'));
const chaves = ['w7-ficha', 'w7-plano', 'title', 'description', 'subtitulo', 'pontos', 'cta', 'texto_whatsapp', 'legenda_video', 'conv_titulo', 'dep_titulo', 'alt_poster', 'alt_logo', 'integracoes.json', 'previa.win7.ai']
  .concat(Object.keys(X.INTENCOES)).concat([...new Set(X.ROTEIRO_TIPOS)]);
const faltam = chaves.filter((k) => !agente.includes('`' + k + '`') && !agente.includes(k));
check(faltam.length === 0 && agente.includes('7, 6, 6, 6, 6, 6, 7, 7 e 7') && X.TEMPOS.join() === '7,6,6,6,6,6,7,7,7', `agente do robô 3 coerente com o motor ${faltam.join(', ')}`);

console.log(`\n${total} checagens do robô 3 · ${falhas ? falhas + ' falha(s)' : 'regressão ok'}`);
process.exit(falhas ? 1 : 0);
