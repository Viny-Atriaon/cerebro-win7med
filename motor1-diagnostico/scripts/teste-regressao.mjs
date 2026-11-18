// Cérebro Win7 Med · Motor 1 · regressão (npm test). Roda no pre-push e no CI.
// Cobre: matemática, placar de prontidão para Google Ads, diagnóstico do exemplo, regras invioláveis,
// ausência de dados pessoais da equipe, entrada suja, coerência entre o agente (Markdown) e o motor, regra de verba,
// segmento fora da saúde, onboarding ao vivo e Mapa, referência por hash do exemplo e o Gerador.
// npm run golden: regrava a referência depois de revisar os prints de uma mudança visual intencional.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregarMotor, carregarAtivos, carregarCss } from './gerar.mjs';
import { montarGerador, montarReadme } from '../../scripts/build.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const M = await carregarMotor();
const css = carregarCss(), ativos = carregarAtivos();
const exemplo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'motor1-diagnostico', 'exemplos', 'exemplo-ficticio.json'), 'utf8'));
const agente = fs.readFileSync(path.join(RAIZ, 'agente', 'AGENTE-DIAGNOSTICO-WIN7MED.md'), 'utf8');
let falhas = 0;
const check = (cond, msg) => { console.log((cond ? '✅ ' : '❌ ') + msg); if (!cond) falhas++; };
const gerar = (dados) => M.gerarLaudo(dados, { css, ativos });
// Dados da equipe e de clientes reais que nunca podem aparecer (ADR-004). A lista é de hashes: o repositório é público (ADR-009)
// e o teste barra sem expor os nomes. Para acrescentar: sha256 do termo em minúsculas (telefone só com os dígitos), 16 primeiros caracteres.
const PROIBIDOS = new Set(['06cfd87f21ddf14d', '4b4058057a1e8ac0', '5f1f2d36e13b550a']);
const temProibido = (texto) => String(texto).toLowerCase().replace(/(\d)[\s.-](?=\d)/g, '$1').match(/[a-z0-9.]+/g)?.some((t) => [t, t.replace(/\.+$/, '')].some((x) => PROIBIDOS.has(crypto.createHash('sha256').update(x).digest('hex').slice(0, 16)))) || false;
const clone = (x) => JSON.parse(JSON.stringify(x));

// 1. matemática
check(M.avaliacoesParaNota(187, 4.2, 4.5) === 113, 'nota: 187 avaliações a 4,2 pedem 113 cinco estrelas para 4,5');
check(M.avaliacoesParaNota(100, 3.6, 4.0) === 40, 'nota: 100 avaliações a 3,6 pedem 40 para 4,0');
check(M.avaliacoesParaNota(50, 4.6, 4.5) === 0, 'nota: acima do alvo pede 0');
check(JSON.stringify(M.alvosNota(3.8)) === '[4,4.3]' && JSON.stringify(M.alvosNota(4.2)) === '[4.5,4.7]' && M.alvosNota(4.9).length === 0, 'alvos de nota se adaptam à nota atual');
const p = M.projetar(3000, 8, 0.2, 650);
check(p.contatos === 375 && p.exames === 75 && p.faturamento === 48750, 'projeção: 3.000 ÷ 8 = 375 contatos, 75 exames, R$ 48.750');

// 2. placar de prontidão para Google Ads
check(JSON.stringify(M.ORDEM_PILARES) === '["busca","site","google"]', 'pilares do placar: Busca, Site e página de destino, Google Meu Negócio');
check(M.ORDEM_PILARES.reduce((a, k) => a + M.PILARES[k].peso, 0) === 100, 'pesos somam 100');
const placar = M.pontuar(exemplo);
const porChave = Object.fromEntries(placar.pilares.map((x) => [x.chave, x.pontos]));
check(porChave.busca === 42 && porChave.site === 40 && porChave.google === 55, 'placar por pilar: Busca 42, Site 40, Google 55');
check(placar.geral === 45 && placar.nivel === 'atencao' && placar.classe.nome === 'Base frágil', 'placar geral ponderado = 45 (base frágil)');
const semSite = clone(exemplo); semSite.presenca.site.criterios = { existe: 'nao' };
check(M.pontuar(semSite).pilares.find((x) => x.chave === 'site').pontos === 0, 'site que não existe zera o pilar');
const comRedes = clone(exemplo); comRedes.presenca.instagram = { criterios: { existe: 'sim' } };
check(M.pontuar(comRedes).geral === placar.geral, 'redes sociais não entram no placar');

// 3. diagnóstico do exemplo
const r = gerar(exemplo);
check(r.validacao.erros.length === 0, `exemplo sem erros ${r.validacao.erros.join(' | ')}`);
for (const a of ['Diagnóstico para Google Ads', 'Prontidão para Google Ads', 'Clínica Vértice Imagem', 'Etapa 1', '[ressonância magnética rio verde]', '"ressonância ipasgo"', 'pago direto ao Google', 'Total sugerido: R$ 3.000', 'Para confirmar na reunião de onboarding', 'Elaborado por', '+113', 'Tag do Google']) check(r.html.includes(a), `diagnóstico contém "${a}"`);
check(!temProibido(r.html) && !/wa\.me|consultora|app\.win7med\.com\.br|Proposta válida|Investimento Win7/i.test(r.html), 'diagnóstico sem consultora, contato, case, painel ou proposta');
check(!/<script/i.test(r.html) && !/https?:\/\/[^"']+\.(css|js|woff2?|png|jpe?g)/i.test(r.html), 'diagnóstico sem script e sem recurso externo');
check(r.html.length < 400 * 1024, `diagnóstico leve: ${Math.round(r.html.length / 1024)} KB`);

// 4. regras invioláveis
const comTravessao = clone(exemplo); comTravessao.impressao.frase = 'A clínica é boa — mas some na busca. Zona de 0–25 km.';
const rt = gerar(comTravessao);
check(rt.travessoes_corrigidos >= 1 && !/[–—]/.test(rt.html.replace(/<style[\s\S]*?<\/style>/, '')) && rt.html.includes('0 a 25 km'), 'travessão corrigido automaticamente');
const verde = clone(exemplo); verde.restricoes.cores_vetadas = ['verde'];
const rv = gerar(verde);
check(rv.validacao.erros.length === 0 && rv.validacao.ok.includes('Zero ocorrências das cores vetadas'), 'cor vetada (verde): zero ocorrências');
const dourado = clone(exemplo); dourado.restricoes.cores_vetadas = ['dourado', 'vermelho'];
check(gerar(dourado).validacao.erros.length === 0, 'vetos combinados (dourado e vermelho) também passam');
const ampla = clone(exemplo); ampla.termos.frentes[0].grupos[0].termos[0].correspondencias = ['ampla'];
check(gerar(ampla).validacao.erros.some((e) => /ampla/i.test(e)), 'correspondência ampla é recusada');
const meses = clone(exemplo); meses.etapas[0].nome = 'Mês 1 · Calibração';
check(gerar(meses).validacao.erros.length > 0, 'etapa por mês é recusada');
const duas = clone(exemplo); duas.etapas.pop();
check(gerar(duas).validacao.erros.some((e) => /3 etapas/.test(e)), 'menos de 3 etapas é recusado');
const zonas = clone(exemplo); zonas.raio.zonas[2].km_ate = zonas.raio.zonas[1].km_ate;
check(gerar(zonas).validacao.erros.some((e) => /faixas de distância crescentes/.test(e)), 'zonas do raio fora de ordem são recusadas');
const foraFaixa = clone(exemplo); foraFaixa.raio.zonas[2].cidades.push({ nome: 'Cidade Perto', uf: 'GO', km: 20 });
check(gerar(foraFaixa).validacao.avisos.some((a) => /fora da faixa/.test(a)), 'cidade fora da faixa da zona gera aviso');
const xss = clone(exemplo); xss.cliente.nome = 'Clínica <script>alert(1)</script>'; xss.impressao.frase = '<img src=x onerror=alert(1)>';
const rx = gerar(xss);
check(!/<script>alert/.test(rx.html) && !/<img src=x/.test(rx.html), 'texto do agente é escapado (sem injeção de HTML)');
const vazio = gerar({ cliente: { nome: 'x' } });
check(!vazio.html && vazio.validacao.erros.length >= 2, 'dados incompletos não geram diagnóstico e listam os erros');
const comContato = clone(exemplo); comContato.conclusao.texto = 'Fale com a gente: https://wa.me/5561999999999';
check(gerar(comContato).validacao.erros.some((e) => /WhatsApp/.test(e)), 'link de WhatsApp da equipe no diagnóstico é recusado');

// 5. entrada suja colada da conversa
const sujo = 'Aqui está o bloco:\n```json\n' + JSON.stringify(exemplo).replace(/}$/, ',}') + '\n```\nCole no Gerador.';
let extraido = null; try { extraido = M.extrairJson(sujo); } catch { extraido = null; }
check(extraido && extraido.cliente.nome === exemplo.cliente.nome, 'extrai o JSON de dentro da resposta do agente');
let erroClaro = ''; try { M.extrairJson('não tem bloco aqui'); } catch (e) { erroClaro = e.message; }
check(/bloco de dados/.test(erroClaro), 'sem JSON: mensagem clara para a equipe');
check(M.extrairJson('{"a": 1, "b": [1, 2,],}').b.length === 2, 'tolera vírgula sobrando');

// 6. coerência agente × motor
for (const k of M.ORDEM_PILARES) {
  const marca = '**`presenca.' + k + '.criterios`**';
  const resto = agente.slice(agente.indexOf(marca) + marca.length);
  const bloco = resto.slice(0, resto.search(/\*\*`presenca\.|\nA nota e o volume|\n## 6/));
  const doAgente = [...bloco.matchAll(/^\| `([a-z_0-9]+)` \|/gm)].map((m) => m[1]).sort();
  const doMotor = M.PILARES[k].itens.filter((i) => !i.auto).map((i) => i.chave).sort();
  check(JSON.stringify(doAgente) === JSON.stringify(doMotor), `agente e motor com as mesmas chaves em ${k} (${doMotor.length})`);
}
const modelo = agente.match(/## 11\. Modelo do bloco de dados[\s\S]*?```json\n([\s\S]*?)```/);
let modeloOk = false; try { modeloOk = gerar(JSON.parse(modelo[1])).validacao.erros.length === 0; } catch { modeloOk = false; }
check(modeloOk, 'o modelo de bloco de dados do agente é JSON válido e o Gerador aceita');
check(agente.includes('https://viny-atriaon.github.io/diagnostico-win7med/') && agente.includes('Diagnóstico para Google Ads'), 'agente aponta para o Gerador e tem o foco em Google Ads');
check(!temProibido(agente) && !/wa\.me|painel ao vivo:/i.test(agente), 'agente sem dados pessoais nem contato da equipe');
check(agente.includes('"setor": "saude"') && agente.includes('`geral`') && agente.includes('Apresentar no onboarding') && agente.includes('R$ 1.500 por mês'), 'agente v4: setor como dado, apresentação ao vivo e regra de verba');

// 8. regra de verba (ADR-005): R$ 1.500 por mês (cerca de R$ 50 por dia) por página e campanha, até 3
const rv0 = M.regraVerba(0), rv1499 = M.regraVerba(1499), rv1500 = M.regraVerba(1500), rv3000 = M.regraVerba(3000), rv4500 = M.regraVerba(4500), rv9000 = M.regraVerba(9000);
check(rv0.paginas === 0 && rv0.abaixo_do_minimo && rv1499.paginas === 0 && rv1499.abaixo_do_minimo, 'verba: zero e R$ 1.499 não comportam página');
check(rv1500.paginas === 1 && !rv1500.abaixo_do_minimo, 'verba: R$ 1.500 = 1 página');
check(rv3000.paginas === 2 && Math.round(rv3000.por_pagina_dia) === 50, 'verba: R$ 3.000 = 2 páginas, cerca de R$ 50 por dia em cada (exemplo do Viny)');
check(rv4500.paginas === 3 && rv9000.paginas === 3, 'verba: R$ 4.500 = 3 páginas e o teto é 3');
check(M.verbaDiariaParaMensal(50, 3) === 4500 && M.regraVerba(M.verbaDiariaParaMensal(50, 3)).paginas === 3, 'verba por dia: R$ 50 × 3 serviços × 30 dias = R$ 4.500, 3 páginas');
check(M.verbaDiariaParaMensal(59, 3) === 5310 && M.regraVerba(5310).paginas === 3, 'verba por dia: R$ 59 por segmento, em 3 = 3 páginas (exemplo do Viny)');
check(M.regraVerba(3000, 1800).paginas === 1, 'verba: o piso por página é editável');

// 9. segmento como dado (ADR-005): qualquer segmento, não só saúde
const exGeral = JSON.parse(fs.readFileSync(path.join(RAIZ, 'motor1-diagnostico', 'exemplos', 'exemplo-geral.json'), 'utf8'));
const visivel = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/data:[^"')]+/g, '').replace(/<[^>]+>/g, ' ');
check(M.vocabDe(exemplo).setor === 'saude' && M.vocabDe(exGeral).setor === 'geral' && M.vocabDe(exGeral).servico === 'serviço', 'sem setor = saúde; setor "geral" troca o vocabulário');
check(M.itensDo('site', M.VOCAB.saude).some((i) => i.chave === 'rt_visivel') && !M.itensDo('site', M.VOCAB.geral).some((i) => i.chave === 'rt_visivel'), 'critério de responsável técnico só em saúde');
const plGeral = M.pontuar(exGeral), pcGeral = Object.fromEntries(plGeral.pilares.map((x) => [x.chave, x.pontos]));
check(plGeral.geral === 53 && pcGeral.busca === 50 && pcGeral.site === 45 && pcGeral.google === 65, 'placar do exemplo geral: 53 (Busca 50, Site 45, Google 65)');
const comRt = clone(exGeral); comRt.presenca.site.criterios.rt_visivel = 'nao';
const rRt = gerar(comRt);
check(M.pontuar(comRt).geral === plGeral.geral && rRt.validacao.avisos.some((a) => /só vale para saúde/.test(a)), 'responsável técnico informado fora da saúde: ignorado, com aviso');
const rg = gerar(exGeral);
const avG = rg.validacao.avisos.filter((x) => !/Sem o link da página modelo/.test(x));
check(rg.validacao.erros.length === 0 && avG.length === 0, `exemplo geral sem erros nem avisos (fora o do link da página modelo) ${rg.validacao.erros.concat(avG).join(' | ')}`);
check(rg.validacao.avisos.some((x) => /Sem o link da página modelo/.test(x)), 'bloco sem lp_modelo.url avisa que o modelo é montado no navegador');
check(rg.html.includes(ativos.logoGeral) && !rg.html.includes(ativos.logo), 'exemplo geral usa a logo Win7, não a Win7 Med');
check(!/clínica|paciente|exame|Win7 Med|convênio|responsável técnico/i.test(visivel(rg.html)), 'exemplo geral sem nenhum termo de saúde no texto');
for (const a of ['Formas de pagamento e condições visíveis', 'Serviços e produtos cadastrados no perfil', 'Placar do método Win7', '<th>Vendas</th>', 'no cartão da empresa']) check(rg.html.includes(a), `exemplo geral contém "${a}"`);

// 10. onboarding ao vivo (ADR-005): roteiro, respostas, Mapa
await import(pathToFileURL(path.join(RAIZ, 'motor1-diagnostico', 'onboarding', 'onboarding.js')).href);
const O = globalThis.OnboardingW7;
const sl = O.slidesPara(exemplo);
check(sl.length === 15 && sl.map((s) => s.id).join(',') === 'capa,verba,ouvimos,oportunidades,busca,site,pagina,servicos,regioes,diferenciais,convenios,depoimentos,video,confirmacoes,fim', 'roteiro: 15 passos na ordem do Viny (verba, diagnóstico, página principal, outros serviços, regiões, diferenciais, convênios, depoimentos, vídeo, confirmar os dados)');
check(sl.filter((s) => s.numero).map((s) => s.numero).join() === '1,2,3,4,5,6,7,8' && sl.filter((s) => s.curto).length === 10, 'perguntas numeradas de 1 a 8 e trilha da capa com 10 etapas');
const semRaio = clone(exemplo); delete semRaio.raio;
const semRaioNemGoogle = clone(semRaio); delete semRaioNemGoogle.presenca.google;
check(O.slidesPara(semRaio).some((s) => s.id === 'regioes') && !O.slidesPara(semRaioNemGoogle).some((s) => s.id === 'regioes'), 'regiões aparece com raio ou com perfil do Google; sem os dois, some');
check([exemplo, exGeral].every((d) => O.slidesPara(d).every((s) => !/\{\w+\}/.test(s.titulo + s.nota) && s.nota.length > 20)), 'todo passo tem nota de condução e nenhum marcador sem trocar');
check(O.slidesPara(exGeral).every((s) => !/clínica|paciente|exame/i.test(s.titulo + s.nota)), 'roteiro do segmento geral sem termo de saúde');
const r0 = O.estadoInicial(exemplo);
check(r0.servicos.map((s) => s.nome).join('|') === 'Ressonância magnética|Tomografia|Ultrassonografia' && r0.servicos.every((s) => !s.confirmado) && r0.servicos[0].principal && !r0.servicos[1].principal, 'estado inicial: serviços do diagnóstico, sem duplicar, nenhum confirmado, o primeiro como página principal');
const comPrincipal = clone(exemplo); comPrincipal.lp_modelo = { servico: 'Tomografia' };
check(O.estadoInicial(comPrincipal).servicos.map((s) => s.nome + (s.principal ? '*' : '')).join('|') === 'Tomografia*|Ressonância magnética|Ultrassonografia', 'o serviço do modelo de página vira a página principal e sobe para o topo');
check(r0.dados_cliente.map((x) => x.campo).join() === 'nome,endereco,telefone,whatsapp,horario,site,rt,razao_social,cnpj,email_privacidade' && r0.dados_cliente.find((x) => x.campo === 'telefone').valor === '(64) 0000-0000' && r0.dados_cliente.find((x) => x.campo === 'whatsapp').editavel, 'dados do cliente para confirmar vêm do diagnóstico; WhatsApp, RT e dados da empresa ficam para preencher');
const antigo = clone(r0); delete antigo.dados_cliente; antigo.servicos.forEach((x) => { delete x.principal; }); antigo.verba.mensal = 4500;
const migrado = O.migrar(antigo, exemplo);
const semEmpresa = clone(r0); semEmpresa.dados_cliente = semEmpresa.dados_cliente.slice(0, 6); semEmpresa.dados_cliente[0].status = 'ok';
const migrado2 = O.migrar(semEmpresa, exemplo);
check(migrado2.dados_cliente.length === 10 && migrado2.dados_cliente[0].status === 'ok' && migrado2.lp_base >= 1, 'rascunho da F1.8 ganha RT, dados da empresa e a base do banner sem perder respostas');
check(migrado.dados_cliente.length === 10 && migrado.servicos[0].principal && migrado.verba.mensal === 4500, 'rascunho de versão anterior ganha os campos novos sem perder respostas');
check(r0.cidades.length === 7 && r0.cidades.filter((c) => c.atuar === true).map((c) => c.nome).join('|') === 'Rio Verde|Santa Helena de Goiás' && r0.cidades.filter((c) => c.atuar === null).length === 5, 'estado inicial: sede e cidades até o raio sugerido já marcadas para atuar');
check(r0.verba.sugestao_mensal === 3000 && r0.verba.minimo === 1500 && r0.confirmacoes.length === 2, 'estado inicial: sugestão de verba e pontos para confirmar vêm do diagnóstico');
const v0 = O.validarMapa(O.montarMapa(exemplo, r0));
check(v0.erros.length === 6 && ['verba', 'domínio', 'exame', 'convênios', 'depoimentos', 'vídeo'].every((w) => v0.erros.some((e) => e.includes(w))), 'Mapa vazio bloqueado: falta verba, domínio, serviço, convênios, depoimentos e vídeo');
const resp = clone(r0);
resp.data_reuniao = '22/10/2026'; resp.verba.mensal = '3.000';
resp.dominio.modo = 'escolhido'; resp.dominio.escolhido = 'ressonanciarioverde.com.br';
resp.servicos[0].confirmado = true; resp.servicos[1].confirmado = true;
resp.diferenciais.parcelamento = { tem: 'sim', vezes: '12', sem_juros: '6' }; resp.diferenciais.pagamento.pix = true;
resp.convenios.situacao = 'sim'; resp.depoimentos = { tem: 'nao', vai_gravar: 'sim', responsavel: '', prazo: '30/10' };
resp.video_home.opcao = 'cliente'; resp.cidades.forEach((c) => { if (c.atuar === null) c.atuar = c.km < 100; });
resp.confirmacoes.forEach((c) => { c.status = 'ok'; }); resp.participantes = 'Equipe do cliente e Win7 (teste)';
const VALORES_TESTE = { rt: 'Dra. Fulana de Teste · CRM/GO 00000', razao_social: 'Clínica Vértice Imagem Ltda (fictícia)', cnpj: '00.000.000/0001-91', email_privacidade: 'privacidade@exemplo.com.br' };
resp.dados_cliente.forEach((x) => { x.status = 'ok'; if (!x.valor) x.valor = VALORES_TESTE[x.campo] || '(64) 99000-0000'; });
const mapa = O.montarMapa(exemplo, resp), vm = O.validarMapa(mapa);
check(vm.erros.length === 0 && vm.avisos.length === 0, `Mapa completo sem erros nem avisos ${vm.erros.concat(vm.avisos).join(' | ')}`);
check(mapa.schema === 'w7-mapa-onboarding' && mapa.versao === 1 && mapa.decisoes.verba.mensal === 3000 && mapa.decisoes.verba.paginas === 2, 'Mapa: R$ 3.000 por mês = 2 páginas');
check(mapa.decisoes.servicos.join('|') === 'Ressonância magnética|Tomografia' && mapa.decisoes.servicos_proxima_etapa.join('|') === 'Ultrassonografia', 'Mapa: serviços confirmados e os da próxima etapa');
check(mapa.decisoes.cidades.atuar.length === 6 && mapa.decisoes.cidades.nao_atuar.map((c) => c.nome).join() === 'Paraúna', 'Mapa: cidades para atuar e fora do raio');
check(mapa.pendencias.map((p) => p.responsavel).join('|') === 'Win7|Cliente|Cliente|Win7|Cliente' && mapa.pendencias[2].prazo === '30/10' && /Registrar o domínio ressonanciarioverde\.com\.br/.test(mapa.pendencias[0].texto), 'Mapa: 5 pendências com responsável (domínio, lista de convênios, depoimentos, roteiro, gravação)');
check(O.sugerirDominios(exemplo).join() === 'ressonanciarioverde.com.br,ressonanciaemrioverde.com.br,rioverderessonancia.com.br,ressonanciarioverdego.com.br' && O.sugerirDominios(exGeral)[0] === 'alinhamentoanapolis.com.br' && O.sugerirDominios(exemplo).every((d) => d.split('.')[0].length <= 26), 'domínios sugeridos pelo serviço principal e pela cidade, até 26 caracteres (limite do Registro.br)');
check(O.normalizarDominio('https://www.Clinica-X.com.br/') === 'clinica-x.com.br' && O.normalizarDominio('minha clínica') === 'minhaclinica.com.br' && O.normalizarDominio('ressonanciamagneticarioverde.com.br') === '', 'domínio digitado é normalizado; nome acima de 26 caracteres é recusado');
const viaZap = clone(resp); viaZap.dominio = { modo: 'whatsapp', escolhido: '', sugestoes: resp.dominio.sugestoes };
check(O.montarMapa(exemplo, viaZap).pendencias.slice(0, 2).map((p) => p.responsavel).join() === 'Win7,Cliente' && O.validarMapa(O.montarMapa(exemplo, viaZap)).erros.length === 0, 'domínio pelo WhatsApp: a Win7 envia as sugestões e o cliente aprova no grupo');
const regist = clone(resp); regist.dominio.sugestoes = [{ dominio: 'ressonanciarioverde.com.br', status: 'registrado' }];
check(O.validarMapa(O.montarMapa(exemplo, regist)).avisos.some((a) => /já está registrado/.test(a)), 'aviso quando o domínio escolhido já está registrado');
check(mapa.decisoes.pagina_principal === 'Ressonância magnética' && mapa.decisoes.dados_cliente.every((x) => x.status === 'ok'), 'Mapa: página principal e dados do cliente conferidos');
const corrige = clone(resp); corrige.dados_cliente[2].status = 'corrigir'; corrige.dados_cliente[2].correcao = '(64) 3333-4444';
check(O.montarMapa(exemplo, corrige).pendencias.some((p) => /Corrigir telefone/.test(p.texto) && p.obs === '(64) 3333-4444' && p.responsavel === 'Win7'), 'dado a corrigir vira pendência da Win7 com a correção');
const semPrincipal = clone(resp); semPrincipal.servicos[0].confirmado = false;
check(O.validarMapa(O.montarMapa(exemplo, semPrincipal)).avisos.some((a) => /página principal \(Ressonância magnética\) não está marcada para anunciar/.test(a)), 'aviso quando a página principal fica de fora');
check(O.validarMapa(O.montarMapa(exemplo, r0)).pontos.map((p) => p.passo).slice(0, 6).join() === 'verba,pagina,servicos,convenios,depoimentos,video' && O.validarMapa(O.montarMapa(exemplo, r0)).pontos.every((p) => p.passo), 'cada ponto do resumo aponta o passo que o ajusta, obrigatórios primeiro e na ordem do roteiro');
check(mapa.termos.map((f) => f.frente).join('|') === 'Ressonância magnética|Tomografia', 'Mapa: termos só dos serviços confirmados');
const tres = clone(resp); tres.servicos[2].confirmado = true;
check(O.validarMapa(O.montarMapa(exemplo, tres)).avisos.some((a) => /3 exames confirmados para 2 páginas/.test(a)), 'aviso quando há mais serviços do que páginas');
const pouca = clone(resp); pouca.verba.mensal = 1000;
check(O.validarMapa(O.montarMapa(exemplo, pouca)).erros.some((e) => /abaixo de R\$ 1\.500/.test(e)), 'verba abaixo do piso bloqueia o Mapa');
const diaria = clone(resp); diaria.verba = { modo: 'diaria', por_dia: '100', minimo: 1500 };
const diaria2 = clone(diaria); diaria2.verba.por_dia = '150';
check(O.calcularVerba(diaria).mensal === 3000 && O.calcularVerba(diaria).paginas === 2 && O.calcularVerba(diaria2).paginas === 3, 'verba por dia: R$ 100 × 30 = R$ 3.000 por mês, 2 páginas; R$ 150 por dia, 3 páginas');
const depEnvia = clone(resp); depEnvia.depoimentos = { tem: 'sim', vai_enviar: 'sim', vai_gravar: null, responsavel: '', prazo: '', prazo_envio: '20/10' };
check(O.montarMapa(exemplo, depEnvia).pendencias.some((p) => /Enviar os depoimentos/.test(p.texto) && p.prazo === '20/10') && O.validarMapa(O.montarMapa(exemplo, Object.assign(clone(depEnvia), { depoimentos: { tem: 'sim' } }))).avisos.some((a) => /envio dos vídeos/.test(a)), 'quem já tem depoimentos combina o envio no grupo (pendência com prazo)');
const semCidade = clone(resp); semCidade.cidades.forEach((c) => { c.atuar = false; });
check(O.validarMapa(O.montarMapa(exemplo, semCidade)).erros.some((e) => /cidade/.test(e)), 'nenhuma cidade para atuar bloqueia o Mapa');
const mh = O.gerarMapaHtml(mapa, exemplo, { css, ativos, data: '22/10/2026' });
check(mh.includes('Mapa do Onboarding') && mh.includes('Validado na reunião de 22/10/2026') && mh.includes('noindex') && mh.includes('2 páginas e campanhas'), 'Mapa em HTML: título, data da reunião, noindex e verba');
check(mh.includes('Domínio da página') && mh.includes('ressonanciarioverde.com.br') && mh.includes('Página principal') && mh.includes('Mapa esquemático do raio') && mh.includes('class="ponto z3 fora"') && mh.includes('Dados conferidos'), 'Mapa em HTML: página principal, mapa do raio com as cidades de fora apagadas e dados conferidos');
check(M.svgRaio(exemplo).indexOf('fora') < 0 && M.svgRaio(exemplo, { 'parauna': false }).includes('.fora{opacity'), 'mapa do raio sem decisões é o mesmo do diagnóstico; com decisões apaga as cidades de fora');
check(!mh.includes('Como conduzir') && O.slidesPara(exemplo).every((s) => !mh.includes(s.nota.slice(0, 40))), 'Mapa sem nenhuma nota de condução');
check(!/<script|wa\.me/i.test(mh) && !/https?:\/\/[^"']+\.(css|js|woff2?|png|jpe?g)/i.test(mh) && !/[–—]/.test(visivel(mh)), 'Mapa sem script, sem WhatsApp da equipe, sem recurso externo e sem travessão');
const rG = O.estadoInicial(exGeral);
rG.verba.mensal = 3000; rG.video_home.opcao = 'ia';
rG.servicos[0].confirmado = true; rG.convenios.situacao = 'na'; rG.depoimentos.tem = 'sim'; rG.dominio.modo = 'whatsapp';
const mG = O.montarMapa(exGeral, rG), mhG = O.gerarMapaHtml(mG, exGeral, { css, ativos, data: '22/10/2026' });
check(O.validarMapa(mG).erros.length === 0 && mhG.includes(ativos.logoGeral) && !/clínica|paciente|exame|Win7 Med/i.test(visivel(mhG)), 'Mapa do segmento geral: logo Win7 e nenhum termo de saúde');

// 13. prazos (7 dias úteis a partir do brainstorm), datas e telefone com máscara
const base22 = O.lerData('22/10/2026', new Date());
check(O.formatarData(O.somarDiasUteis(base22, 7)) === '03/11/2026' && O.formatarData(O.somarDiasUteis(O.lerData('14/10/2026', new Date()), 7)) === '23/10/2026', '7 dias úteis pulam fim de semana e feriado nacional (Finados)');
check(O.checarPrazo('31/02', base22).invalida && O.checarPrazo('10/10', base22).passado && O.checarPrazo('04/11', base22).alem && !O.checarPrazo('03/11', base22).alem && O.checarPrazo('03/11', base22).data === '03/11/2026', 'prazo: data inválida, passada, além do limite ou dentro dos 7 dias úteis');
check(O.mascaraTelefone('61999999999999999') === '(61) 99999-9999' && O.mascaraTelefone('6133334444') === '(61) 3333-4444' && O.mascaraTelefone('5561999998888') === '(61) 99999-8888' && O.mascaraData('03112026') === '03/11/2026', 'máscaras de telefone e de data');
const longo = clone(resp); longo.depoimentos.prazo = '20/11';
check(O.validarMapa(O.montarMapa(exemplo, longo)).erros.some((e) => /além de 7 dias úteis \(limite 03\/11\/2026\) sem justificativa/.test(e)), 'prazo além de 7 dias úteis sem justificativa bloqueia o mapeamento');
longo.depoimentos.prazo_justificativa = 'Pacientes só no fim do mês';
check(O.validarMapa(O.montarMapa(exemplo, longo)).erros.length === 0 && O.montarMapa(exemplo, longo).pendencias.some((p) => /Pacientes só no fim do mês/.test(p.obs || '')), 'com justificativa, o prazo longo passa e a justificativa vai para a pendência');
const errada = clone(resp); errada.video_home.prazo = '31/02';
check(O.validarMapa(O.montarMapa(exemplo, errada)).erros.some((e) => /Data inválida no prazo para o vídeo/.test(e)), 'data inválida no prazo bloqueia o mapeamento');
const waCurto = clone(resp); waCurto.dados_cliente.find((x) => x.campo === 'whatsapp').valor = '(64) 9000';
check(O.validarMapa(O.montarMapa(exemplo, waCurto)).avisos.some((a) => /WhatsApp que recebe os contatos está incompleto/.test(a)), 'WhatsApp incompleto gera aviso');

// 12. LP modelo (ADR-006, CONSELHO-03): uma página de demonstração por cliente, com as travas por máquina
await import(pathToFileURL(path.join(RAIZ, 'motor1-diagnostico', 'lp-modelo', 'lp-modelo.js')).href);
const L = globalThis.LpModeloW7;
const modeloLp = fs.readFileSync(path.join(RAIZ, 'motor1-diagnostico', 'lp-modelo', 'modelo.html'), 'utf8');
const waLp = fs.readFileSync(path.join(RAIZ, 'motor1-diagnostico', 'lp-modelo', 'icone-whatsapp.txt'), 'utf8').trim();
const montarLp = (diag, extra = {}, midia = {}) => L.montar(L.variaveis(diag, extra), { modelo: modeloLp, base: '../../base/', midia, wa: waLp });
const lpS = montarLp(exemplo, { token: 'abcdefghijkl' });
check(lpS.html && L.conferir(lpS.html).erros.length === 0, `LP modelo de saúde montada e aprovada nas travas ${lpS.erros.concat(lpS.html ? L.conferir(lpS.html).erros : []).join(' | ')}`);
check(lpS.html.includes('Ressonância magnética <span class="cidade">em Rio Verde</span>') && lpS.html.includes('Agendar exame') && !/nota no Google/.test(lpS.html) && lpS.html.includes('<p class="rt">RT: ') && lpS.html.includes('data-abre="aviso-politica">Política de privacidade'), 'LP de saúde: serviço na cidade, CTA de exame, sem a nota do Google, com RT e política no rodapé');
check(lpS.html.includes('Modelo para aprovação') && lpS.html.includes('noindex, nofollow') && lpS.html.includes('Convênio A') && lpS.html.includes('Depoimentos de pacientes'), 'LP de saúde: faixa de modelo, noindex, convênios genéricos e depoimentos ilustrativos');
check(lpS.html.includes('../../base/logo-win7med.png') && lpS.avisos.some((a) => /logo da Win7 Med/.test(a)), 'sem logo do cliente, entra a logo da Win7 Med (com aviso)');
check(!/data-win7-form|win7-form\.js|googletagmanager|gtag\(|href="tel:|wa\.me|api\.whatsapp/.test(lpS.html), 'LP modelo sem formulário ativo, sem rastreamento e sem telefone ou WhatsApp clicável');
check(montarLp(exemplo, { logo: 'logo.png' }).html.includes('src="logo.png"'), 'com logo do cliente, a página usa a logo dele');
const lpG = montarLp(exGeral);
check(lpG.html && L.conferir(lpG.html).erros.length === 0 && lpG.html.includes('Parceiro A') && lpG.html.includes('Agendar serviço') && lpG.html.includes('Depoimentos de clientes') && lpG.html.includes('logo-win7.png'), 'LP do segmento geral: parceiros, "Agendar serviço", depoimentos de clientes e logo Win7');
check(!/clínica|paciente|exame|convênio/i.test(visivel(lpG.html)), 'LP do segmento geral sem termo de saúde');
check(!lpG.html.includes('class="rt"') && lpG.html.includes('Política de privacidade'), 'LP do segmento geral sem RT e com a política no rodapé');
// etapa A (ADR-007): cores da logo, bases do banner, campos da página real
const pVert = L.paletaDaLogo([{ hex: '#29527b', peso: 0.81 }, { hex: '#f0aa27', peso: 0.19 }]);
check(pVert && L.paleta(pVert).erros.length === 0 && L.contraste('#ffffff', pVert.marca_escura) >= 7.5 && pVert.destaque === '#f0aa27', 'cores da logo: fundo escuro do mesmo tom (7,5:1) e a segunda cor como destaque, sem alterar se já tem contraste');
const pTresCores = L.paletaDaLogo([{ hex: '#24645e', peso: 0.57 }, { hex: '#ed964d', peso: 0.29 }, { hex: '#fbb901', peso: 0.14 }]);
check(pTresCores.destaque === '#fbb901' && L.contraste('#ffffff', pTresCores.marca_escura) >= 7.5 && L.contraste('#ffffff', pTresCores.apoio) >= 3, 'logo de três cores: a mais clara vira destaque e a seguinte vira apoio, com branco legível');
check(L.paletaDaLogo([{ hex: '#777777', peso: 1 }]) === null && L.paletaDaLogo(['#c8102e'], ['vermelho']) === null, 'logo sem cor ou só com cor vetada fica com a paleta da Win7');
const pAmar = L.paletaDaLogo(['#f2c200']);
check(pAmar.marca_escura === '#1d2328' && L.paleta(pAmar).erros.length === 0, 'logo só amarela: fundo grafite e a cor da logo no destaque');
// identidade do site do cliente: fundo escuro neutro e fontes próprias
const pSite = L.paletaDaLogo(['#5eb04f'], [], { escura: '#262626' });
check(pSite.marca_escura === '#262626' && pSite.destaque === '#5eb04f' && L.paleta(pSite).erros.length === 0, 'fundo escuro do site (grafite) entra como está e a cor da marca vira o destaque');
check(L.paletaDaLogo(['#5eb04f'], [], { escura: '#888888' }).marca_escura !== '#888888', 'fundo do site sem contraste 7:1 com o branco é ignorado');
const lpPadrao = montarLp(exemplo).html;
check(lpPadrao.includes('family=Outfit:wght@400;500;600;700;800') && lpPadrao.includes('--fonte-titulo:"Outfit"') && lpPadrao.includes('--peso-titulo:800'), 'sem fontes do cliente, a página segue com a Outfit');
const lpFontes = montarLp(exemplo, { fontes: { titulo: 'bebas neue', texto: 'Montserrat' } });
check(lpFontes.erros.length === 0 && lpFontes.html.includes('family=Bebas+Neue&amp;family=Montserrat:wght@') && lpFontes.html.includes('--fonte-titulo:"Bebas Neue",Impact') && lpFontes.html.includes('--peso-titulo:400') && !lpFontes.html.includes('family=Outfit') && L.conferir(lpFontes.html).erros.length === 0, 'fontes do cliente: título condensado sem negrito falso, texto na fonte do site, travas aprovadas');
check(montarLp(exemplo, { fontes: { titulo: 'Comic Neue"><script>' } }).erros.some((e) => /fora da lista/.test(e)), 'fonte fora da lista fechada é recusada');
check([0, 0.5, 0.99].every((x) => L.sortearBase(2, x) !== 2) && L.sortearBase(0, 0) === 1 && L.baseValida('3') === 3 && L.baseValida(4) === 0, 'sorteio da base nunca repete a base do cliente anterior');
const lpBase = montarLp(exemplo, { base: 2 });
check(/data-base="2"/.test(lpBase.html) && ['class="campo b1"', 'class="ondas b2"', 'class="grade b3"'].every((c) => lpBase.html.includes(c)) && /#base\(\[123\]\)/.test(lpBase.html), 'modelo traz as 3 bases, abre na escolhida e troca pelo endereço (#base1, #base2, #base3)');
check(L.heroBases(3, false).includes('grade b3') && !L.heroBases(3, false).includes('campo b1'), 'página real leva só a base escolhida');
check(/prefers-reduced-motion:no-preference\)\{[\s\S]*?deslizar/.test(lpBase.html), 'movimento contínuo só quando o aparelho não pede menos movimento');
const xssLp = clone(exemplo); xssLp.cliente.nome = 'Clínica <script>alert(1)</script>';
check(!/<script>alert/.test(montarLp(xssLp).html), 'LP modelo escapa o texto do cliente');
check(montarLp(exemplo, { cores: { marca: '#cccccc', marca_escura: '#dddddd', destaque: '#eeeeee', apoio: '#ffffff' } }).erros.some((e) => /contraste/.test(e)), 'cores sem contraste são recusadas');
check(montarLp(exemplo, { token: 'Curto' }).erros.length > 0 && L.TOKEN.test('abcdefghij12'), 'endereço do modelo só com 12 letras minúsculas ou números');
check(L.conferir(lpS.html.replace('</head>', '<script>gtag("config","AW-1")</script></head>')).erros.length > 0 && L.conferir(lpS.html.replace('Convênio A</span>', 'Unimed</span>')).erros.some((e) => /unimed/.test(e)) && L.conferir(lpS.html.replace('</footer>', '<a href="tel:0800">x</a></footer>')).erros.length > 0, 'a conferência barra rastreamento, convênio real e telefone clicável');
check(L.midiaPermitida('base/hero.mp4') && L.midiaPermitida('m/abcdefghij12/logo.png') && !L.midiaPermitida('base/video-720.mp4') && !L.midiaPermitida('m/abc/index.html') && !L.midiaPermitida('m/abcdefghij12/depoimento.mp4'), 'lista fechada de mídia: só a base da Win7 e a logo do cliente');
const comVideo = montarLp(exemplo, {}, { hero: true, heroPoster: true, depoimentos: [true, false, false] }).html;
check(comVideo.includes('data-video="../../base/hero.mp4"') && comVideo.includes('data-video="../../base/depoimento-1.mp4"') && !comVideo.includes('depoimento-2.mp4'), 'vídeos base entram só quando existem na pasta base');
const comLink = clone(exemplo); comLink.lp_modelo = { url: 'https://modelo.win7.ai/m/abcdefghij12/' };
const rLink = gerar(comLink);
check(rLink.html.includes('O modelo da sua página') && rLink.html.includes('href="https://modelo.win7.ai/m/abcdefghij12/"') && rLink.validacao.erros.length === 0, 'diagnóstico com o link do modelo ganha a seção "O modelo da sua página"');
const linkRuim = clone(exemplo); linkRuim.lp_modelo = { url: 'https://exemplo.com/qualquer' };
check(!gerar(linkRuim).html.includes('O modelo da sua página') && gerar(linkRuim).validacao.avisos.some((a) => /modelo de página fora do padrão/.test(a)), 'link do modelo fora do padrão é ignorado, com aviso');
check(O.slidesPara(comLink).some((s) => s.id === 'pagina') && O.slidesPara(exemplo).some((s) => s.id === 'pagina') && O.slidesPara(comLink).length === O.slidesPara(exemplo).length, 'a recomendação da página principal aparece sempre; com link, mostra o modelo');

// 11. referência: o diagnóstico do exemplo não muda sem querer (npm run golden atualiza depois de revisar os prints)
const ARQ_REF = path.join(RAIZ, 'motor1-diagnostico', 'exemplos', 'referencia-sha256.txt');
const htmlRef = M.gerarLaudo(exemplo, { css, ativos, data: '14/10/2026', dataIso: '2026-10-14' }).html.replace(/\r\n/g, '\n');
const hashRef = crypto.createHash('sha256').update(htmlRef, 'utf8').digest('hex');
if (process.argv.includes('--atualizar-referencia')) { fs.writeFileSync(ARQ_REF, hashRef + '\n', 'utf8'); console.log('ℹ️  referência atualizada: ' + hashRef); }
const refSalva = fs.existsSync(ARQ_REF) ? fs.readFileSync(ARQ_REF, 'utf8').trim() : '';
check(refSalva === hashRef, `diagnóstico do exemplo idêntico à referência ${refSalva === hashRef ? '' : '(mudou: revise os prints e rode npm run golden)'}`);

// 7. Gerador
const g = await montarGerador();
check(!temProibido(g) && !/wa\.me|app\.win7med\.com\.br\/painel|cfg-/i.test(g), 'Gerador sem consultora, contato, painel, case ou configuração da equipe');
check(!/<script[^>]+src=/i.test(g) && !/<link[^>]+href="https?:/i.test(g), 'Gerador abre offline (sem script nem estilo externo)');
check(montarReadme(agente).startsWith('# Agente de Diagnóstico Win7 Med'), 'README público começa pelo agente (ativa pelo link)');
check(g.includes('OnboardingW7') && g.includes('OnboardingDeck') && g.includes('Apresentar no onboarding'), 'Gerador traz a apresentação do onboarding');

console.log(falhas ? `\n${falhas} falha(s)` : '\nregressão ok');
process.exit(falhas ? 1 : 0);
