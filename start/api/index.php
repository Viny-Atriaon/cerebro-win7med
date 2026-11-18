<?php
// API do start.win7.ai (ADR-008): projetos salvos (diagnóstico, onboarding e mapeamento) e a equipe que usa o Cérebro.
// Tudo passa por aqui (/api/*, regra no .htaccess). Conta por pessoa, por convite; sessão por cookie HttpOnly.
//   /api/saude · /api/sessao · /api/eu · /api/entrar · /api/sair · /api/convite/ver · /api/convite/aceitar
//   /api/projetos (lista e salvar diagnóstico) · /api/projetos/<id> · .../onboarding · .../mapa · .../arquivar
//   /api/equipe · /api/equipe/convites · /api/equipe/convites/cancelar · /api/equipe/situacao   (só administrador)
declare(strict_types=1);
require_once __DIR__ . '/lib/base.php';

set_exception_handler(function (Throwable $e) {
    registrar('erro', 'excecao', ['mensagem' => mb_substr($e->getMessage(), 0, 300), 'linha' => $e->getLine()]);
    erro(500, 'INTERNO', 'Algo deu errado aqui. Tente de novo em instantes.');
});

const SCHEMA_RESPOSTAS = 'w7-onboarding-respostas';
const SCHEMA_MAPA = 'w7-mapa-onboarding';
const VERSOES_DIAGNOSTICO = 5;
const DIAS_BACKUP = 30;

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$caminho = '/' . ltrim((string) (parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/'), '/');
$caminho = rtrim($caminho, '/') ?: '/';

// Escrita só do próprio site: exige o cabeçalho X-Start (um formulário de outro site não consegue mandar) e Origin igual.
if ($metodo !== 'GET') {
    if (($_SERVER['HTTP_X_START'] ?? '') !== '1') erro(403, 'ORIGEM', 'Requisição recusada.');
    $origem = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origem !== '' && parse_url($origem, PHP_URL_HOST) !== explode(':', (string) ($_SERVER['HTTP_HOST'] ?? ''))[0]) erro(403, 'ORIGEM', 'Requisição recusada.');
}

// ---------------------------------------------------------------- contas e sessões
function usuarios(): array { return ler_json('usuarios.json', []); }
function achar_usuario(string $email): ?array { foreach (usuarios() as $u) if ($u['email'] === $email) return $u; return null; }
function usuario_publico(array $u): array { return ['email' => $u['email'], 'nome' => $u['nome'], 'papel' => $u['papel'], 'ativo' => !empty($u['ativo']), 'criado_em' => $u['criado_em'] ?? null, 'ultimoAcesso' => $u['ultimoAcesso'] ?? null]; }

/** Convites: só o hash do token fica guardado. O primeiro convite chega pela publicação (convites-semente.json). */
function convites(): array {
    return com_trava(function () {
        $c = ler_json('convites.json', []);
        $semente = ler_json('convites-semente.json', null);
        if (is_array($semente)) {
            foreach ($semente as $h => $x) if (!isset($c[$h])) $c[$h] = $x;
            @unlink(caminho('convites-semente.json'));
        }
        foreach ($c as $h => $x) if (($x['expira'] ?? 0) < agora_ms()) unset($c[$h]);
        gravar_json('convites.json', $c);
        return $c;
    });
}
function convite_do_token(string $token): ?array {
    if (!preg_match('/^[a-f0-9]{40}$/', $token)) return null;
    return convites()[hash('sha256', $token)] ?? null;
}

function sessao(): ?array {
    if (!preg_match('/(?:^|;\s*)' . NOME_COOKIE . '=([a-f0-9]{48})/', (string) ($_SERVER['HTTP_COOKIE'] ?? ''), $m)) return null;
    $chave = hash('sha256', $m[1]);
    $s = ler_json('estado/sessoes.json', [])[$chave] ?? null;
    if (!$s || $s['expira'] < agora_ms()) return null;
    $u = achar_usuario($s['email']);
    if (!$u || empty($u['ativo'])) return null;
    return ['chave' => $chave, 'email' => $u['email'], 'nome' => $u['nome'], 'papel' => $u['papel']];
}
function criar_sessao(array $u): string {
    $token = bin2hex(random_bytes(24));
    com_trava(function () use ($token, $u) {
        $s = array_filter(ler_json('estado/sessoes.json', []), fn($v) => $v['expira'] > agora_ms());
        $s[hash('sha256', $token)] = ['email' => $u['email'], 'expira' => agora_ms() + HORAS_SESSAO * 3600e3, 'criada' => agora()];
        gravar_json('estado/sessoes.json', $s);
        $lista = usuarios();
        foreach ($lista as &$x) if ($x['email'] === $u['email']) $x['ultimoAcesso'] = agora();
        unset($x);
        gravar_json('usuarios.json', $lista);
    });
    return NOME_COOKIE . '=' . $token . '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' . (HORAS_SESSAO * 3600) . (eh_https() ? '; Secure' : '');
}
function senha_valida(string $s): bool { return mb_strlen($s) >= 10 && mb_strlen($s) <= 200; }

// ---------------------------------------------------------------- projetos
function etapa_do(array $p): string { return !empty($p['mapa']) ? 'mapeamento' : (!empty($p['onboarding']) ? 'onboarding' : 'diagnostico'); }
function resumo_do(array $p): array {
    $c = $p['diagnostico']['cliente'] ?? [];
    return ['id' => $p['id'], 'slug' => $p['slug'], 'nome' => texto($c['nome'] ?? '', 160), 'cidade' => texto($c['cidade'] ?? '', 80), 'uf' => texto($c['uf'] ?? '', 4),
        'setor' => ($c['setor'] ?? '') === 'geral' ? 'geral' : 'saude', 'etapa' => etapa_do($p), 'modelo' => texto($p['diagnostico']['lp_modelo']['url'] ?? '', 200),
        'criado_em' => $p['criado_em'], 'criado_por' => $p['criado_por'], 'atualizado_em' => $p['atualizado_em'], 'atualizado_por' => $p['atualizado_por'], 'arquivado' => !empty($p['arquivado'])];
}
function ler_projeto(string $id): ?array { return preg_match('/^[a-f0-9]{16}$/', $id) ? ler_json('projetos/' . $id . '.json', null) : null; }
/** Grava o projeto, o índice e a cópia do dia (backup: um arquivo por projeto por dia, 30 dias). Chamar dentro da trava. */
function gravar_projeto(array $p): void {
    gravar_json('projetos/' . $p['id'] . '.json', $p);
    $indice = array_values(array_filter(ler_json('projetos/indice.json', []), fn($x) => $x['id'] !== $p['id']));
    array_unshift($indice, resumo_do($p));
    gravar_json('projetos/indice.json', $indice);
    gravar_json('backups/' . date('Y-m-d') . '/' . $p['id'] . '.json', $p);
    if (mt_rand(1, 20) === 1) foreach (glob(DADOS . '/backups/*', GLOB_ONLYDIR) ?: [] as $d) {
        if (preg_match('/(\d{4}-\d{2}-\d{2})$/', $d, $m) && strtotime($m[1]) < time() - DIAS_BACKUP * 86400) { array_map('unlink', glob($d . '/*') ?: []); @rmdir($d); }
    }
}
function anotar(array &$p, array $s, string $acao, bool $agrupar = false): void {
    $h = $p['historico'] ?? [];
    $ultimo = $h[0] ?? null;
    // respostas do onboarding salvam a cada clique: a mesma pessoa, a mesma ação, em 15 minutos, vira uma linha só
    if ($agrupar && $ultimo && $ultimo['acao'] === $acao && $ultimo['quem'] === $s['nome'] && strtotime($ultimo['quando']) > time() - 900) { $h[0]['quando'] = agora(); }
    else array_unshift($h, ['quando' => agora(), 'quem' => $s['nome'], 'acao' => $acao]);
    $p['historico'] = array_slice($h, 0, 300);
    $p['atualizado_em'] = agora(); $p['atualizado_por'] = $s['nome'];
}

// ---------------------------------------------------------------- rotas abertas
if ($metodo === 'GET' && $caminho === '/api/saude') {
    $ok = @file_put_contents(caminho('.saude'), agora()) !== false;
    enviar($ok ? 200 : 503, ['ok' => $ok, 'quando' => agora()]);
}

if ($metodo === 'POST' && $caminho === '/api/entrar') {
    $c = ler_corpo(2000);
    $ip = ip_visitante();
    $email = mb_strtolower(texto($c['email'] ?? '', 160));
    $chaveIp = 'login:' . $ip; $chaveConta = 'login-conta:' . $email; $chaveEspera = $email . '|' . $ip;
    $e = ler_json('estado/esperas.json', [])[$chaveEspera] ?? null;
    $espera = $e && $e['ate'] > agora_ms() ? (int) ceil(($e['ate'] - agora_ms()) / 1000) : 0;
    if ($espera) erro(429, 'ESPERA', 'Aguarde ' . $espera . ' s para tentar de novo.', ['esperaSegundos' => $espera]);
    if (!cabe($chaveIp, 8, 900000)) erro(429, 'LIMITE', 'Muitas tentativas. Espere 15 minutos.');
    if (!cabe($chaveConta, 20, 3600000)) { devolver($chaveIp); erro(429, 'LIMITE', 'Muitas tentativas. Espere 15 minutos.'); }
    $u = achar_usuario($email);
    // sem conta, confere contra um hash qualquer: o tempo de resposta não revela se o e-mail existe
    $confere = password_verify((string) ($c['senha'] ?? ''), $u['hash'] ?? '$2y$10$abcdefghijklmnopqrstuuJmK5m3nLqG7d1Q2wR4tY6uI8oP0aSdF');
    if (!$u || !$confere || empty($u['ativo'])) {
        com_trava(function () use ($chaveEspera) {
            $es = ler_json('estado/esperas.json', []);
            $x = $es[$chaveEspera] ?? ['falhas' => 0, 'ate' => 0];
            $x['falhas']++;
            $x['ate'] = agora_ms() + min(30, 2 ** ($x['falhas'] - 1)) * 1000;
            $es[$chaveEspera] = $x;
            foreach ($es as $k => $v) if (agora_ms() - $v['ate'] > 9e5) unset($es[$k]);
            gravar_json('estado/esperas.json', $es);
        });
        registrar('aviso', 'login_recusado', ['ip' => $ip]);
        erro(401, 'ACESSO', 'E-mail ou senha incorretos.');
    }
    com_trava(function () use ($chaveEspera) { $es = ler_json('estado/esperas.json', []); unset($es[$chaveEspera]); gravar_json('estado/esperas.json', $es); });
    devolver($chaveIp); devolver($chaveConta);
    if (password_needs_rehash($u['hash'], PASSWORD_DEFAULT)) com_trava(function () use ($u, $c) { $l = usuarios(); foreach ($l as &$x) if ($x['email'] === $u['email']) $x['hash'] = password_hash((string) $c['senha'], PASSWORD_DEFAULT); unset($x); gravar_json('usuarios.json', $l); });
    enviar(200, ['nome' => $u['nome'], 'papel' => $u['papel'], 'email' => $u['email']], ['Set-Cookie' => criar_sessao($u)]);
}

if ($metodo === 'POST' && $caminho === '/api/convite/ver') {
    if (!cabe('convite:' . ip_visitante(), 30, 900000)) erro(429, 'LIMITE', 'Muitas tentativas. Espere 15 minutos.');
    $cv = convite_do_token(texto(ler_corpo(500)['token'] ?? '', 60));
    if (!$cv) erro(404, 'CONVITE', 'Convite inválido ou vencido. Peça um novo ao administrador.');
    enviar(200, ['email' => $cv['email'], 'nome' => $cv['nome'], 'papel' => $cv['papel']]);
}

if ($metodo === 'POST' && $caminho === '/api/convite/aceitar') {
    if (!cabe('convite:' . ip_visitante(), 30, 900000)) erro(429, 'LIMITE', 'Muitas tentativas. Espere 15 minutos.');
    $c = ler_corpo(2000);
    $token = texto($c['token'] ?? '', 60);
    $senha = (string) ($c['senha'] ?? '');
    $nome = texto($c['nome'] ?? '', 80);
    if (!senha_valida($senha)) erro(400, 'SENHA', 'A senha precisa ter pelo menos 10 caracteres.');
    // traz o convite da publicação (semente), se houver; fora da trava de baixo
    $previo = convite_do_token($token);
    if (!$previo) erro(404, 'CONVITE', 'Convite inválido ou vencido. Peça um novo ao administrador.');
    // convite do primeiro administrador sai sem e-mail (quem publica não precisa saber): a pessoa escreve o dela
    $emailLivre = '';
    if (($previo['email'] ?? '') === '') {
        $emailLivre = mb_strtolower(texto($c['email'] ?? '', 160));
        if (!filter_var($emailLivre, FILTER_VALIDATE_EMAIL)) erro(400, 'EMAIL', 'Escreva um e-mail válido.');
        $ja = achar_usuario($emailLivre);
        if ($ja && !empty($ja['ativo'])) erro(409, 'CONTA', 'Esse e-mail já tem conta ativa: entre com ele.');
    }
    $u = com_trava(function () use ($token, $senha, $nome, $emailLivre) {
        $todos = ler_json('convites.json', []);
        $h = hash('sha256', $token);
        $cv = $todos[$h] ?? null;
        if (!preg_match('/^[a-f0-9]{40}$/', $token) || !$cv || $cv['expira'] < agora_ms()) return null;
        if ($cv['email'] === '') $cv['email'] = $emailLivre;
        $lista = array_values(array_filter(usuarios(), fn($x) => $x['email'] !== $cv['email']));
        $u = ['email' => $cv['email'], 'nome' => $nome ?: $cv['nome'], 'papel' => $cv['papel'], 'hash' => password_hash($senha, PASSWORD_DEFAULT), 'ativo' => true, 'criado_em' => agora(), 'convidado_por' => $cv['criado_por'] ?? '', 'ultimoAcesso' => null];
        $lista[] = $u;
        gravar_json('usuarios.json', $lista);
        unset($todos[$h]);
        gravar_json('convites.json', $todos);
        return $u;
    });
    if (!$u) erro(404, 'CONVITE', 'Convite inválido ou vencido. Peça um novo ao administrador.');
    registrar('info', 'conta_criada', ['email' => $u['email'], 'papel' => $u['papel']]);
    enviar(200, ['nome' => $u['nome'], 'papel' => $u['papel'], 'email' => $u['email']], ['Set-Cookie' => criar_sessao($u)]);
}

// ---------------------------------------------------------------- daqui para baixo, só com sessão
$s = sessao();
if ($metodo === 'POST' && $caminho === '/api/sair') {
    if ($s) com_trava(function () use ($s) { $x = ler_json('estado/sessoes.json', []); unset($x[$s['chave']]); gravar_json('estado/sessoes.json', $x); });
    enviar(200, ['ok' => true], ['Set-Cookie' => NOME_COOKIE . '=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0']);
}
// a tela do start pergunta na abertura se já há sessão: resposta 200 nos dois casos (sem erro no console do navegador)
if ($metodo === 'GET' && $caminho === '/api/sessao') enviar(200, ['usuario' => $s ? ['nome' => $s['nome'], 'email' => $s['email'], 'papel' => $s['papel']] : null]);
if (!$s) erro(401, 'SEM_SESSAO', 'Entre para continuar.');
if ($metodo === 'GET' && $caminho === '/api/eu') enviar(200, ['nome' => $s['nome'], 'email' => $s['email'], 'papel' => $s['papel']]);

// lista de projetos (o mais recente primeiro); arquivados só para o administrador, com ?arquivados=1
if ($metodo === 'GET' && $caminho === '/api/projetos') {
    $todos = ler_json('projetos/indice.json', []);
    $comArquivados = ($_GET['arquivados'] ?? '') === '1' && $s['papel'] === 'admin';
    enviar(200, ['projetos' => array_values(array_filter($todos, fn($x) => $comArquivados || empty($x['arquivado'])))]);
}

// salvar o diagnóstico: cria o projeto ou atualiza o mesmo cliente (pelo id ou pelo nome)
if ($metodo === 'POST' && $caminho === '/api/projetos') {
    $c = ler_corpo(6 * 1024 * 1024);
    $diag = $c['diagnostico'] ?? null;
    if (!is_array($diag) || !is_array($diag['cliente'] ?? null) || texto($diag['cliente']['nome'] ?? '', 160) === '') erro(400, 'DIAGNOSTICO', 'O diagnóstico precisa ter o nome do cliente.');
    $logo = (string) ($c['logo'] ?? '');
    if ($logo !== '' && !preg_match('#^data:image/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$#', $logo)) erro(400, 'LOGO', 'Logo em formato não aceito.');
    $id = texto($c['id'] ?? '', 16);
    $r = com_trava(function () use ($diag, $logo, $id, $s) {
        $slug = slug_de($diag['cliente']['nome']);
        $p = $id !== '' ? ler_projeto($id) : null;
        // o id só vale para o mesmo cliente: outro bloco colado na mesma página nunca grava por cima de outro projeto
        if ($p && ($p['slug'] !== $slug || !empty($p['arquivado']))) $p = null;
        if (!$p) foreach (ler_json('projetos/indice.json', []) as $x) if ($x['slug'] === $slug && empty($x['arquivado'])) { $p = ler_projeto($x['id']); break; }
        $novo = !$p;
        if ($novo) $p = ['id' => novo_id(), 'slug' => $slug, 'criado_em' => agora(), 'criado_por' => $s['nome'], 'versoes' => [], 'historico' => []];
        elseif (json_encode($p['diagnostico'] ?? null) !== json_encode($diag)) {
            $p['versoes'] = array_slice(array_merge([['quando' => $p['atualizado_em'] ?? agora(), 'quem' => $p['atualizado_por'] ?? '', 'diagnostico' => $p['diagnostico']]], $p['versoes'] ?? []), 0, VERSOES_DIAGNOSTICO);
        }
        $p['slug'] = $slug;
        $p['diagnostico'] = $diag;
        if ($logo !== '') $p['logo'] = $logo; else unset($p['logo']);
        anotar($p, $s, $novo ? 'diagnóstico criado' : 'diagnóstico atualizado');
        gravar_projeto($p);
        return ['id' => $p['id'], 'novo' => $novo, 'atualizado_em' => $p['atualizado_em']];
    });
    registrar('info', 'diagnostico_salvo', ['id' => $r['id'], 'quem' => $s['email']]);
    enviar(200, $r);
}

if (preg_match('#^/api/projetos/([a-f0-9]{16})(?:/(onboarding|mapa|arquivar))?$#', $caminho, $m)) {
    [$tudo, $id] = $m; $parte = $m[2] ?? '';
    if ($metodo === 'GET' && $parte === '') {
        $p = ler_projeto($id);
        if (!$p || (!empty($p['arquivado']) && $s['papel'] !== 'admin')) erro(404, 'PROJETO', 'Projeto não encontrado.');
        // as versões anteriores só vêm inteiras com ?versoes=1 (rede de segurança, não o dia a dia)
        if (($_GET['versoes'] ?? '') !== '1') foreach (['versoes', 'versoes_onboarding'] as $k) $p[$k] = array_map(fn($v) => ['quando' => $v['quando'] ?? '', 'quem' => $v['quem'] ?? ''], $p[$k] ?? []);
        enviar(200, $p);
    }
    if ($metodo === 'PUT' && ($parte === 'onboarding' || $parte === 'mapa')) {
        $c = ler_corpo(3 * 1024 * 1024);
        $valor = $parte === 'onboarding' ? ($c['respostas'] ?? null) : ($c['dados'] ?? null);
        $schema = $parte === 'onboarding' ? SCHEMA_RESPOSTAS : SCHEMA_MAPA;
        if (!is_array($valor) || ($valor['schema'] ?? '') !== $schema) erro(400, 'FORMATO', 'Formato desconhecido.');
        $r = com_trava(function () use ($id, $parte, $valor, $s) {
            $p = ler_projeto($id);
            if (!$p || !empty($p['arquivado'])) return null;
            if ($parte === 'onboarding') {
                // cada sessão de onboarding (outra pessoa, ou 15 minutos parado) guarda a anterior: "Apagar respostas" nunca perde nada
                $ant = $p['onboarding'] ?? null;
                if ($ant && (($ant['atualizado_por'] ?? '') !== $s['nome'] || strtotime($ant['atualizado_em']) < time() - 900))
                    $p['versoes_onboarding'] = array_slice(array_merge([['quando' => $ant['atualizado_em'], 'quem' => $ant['atualizado_por'] ?? '', 'respostas' => $ant['respostas']]], $p['versoes_onboarding'] ?? []), 0, VERSOES_DIAGNOSTICO);
                $p['onboarding'] = ['respostas' => $valor, 'atualizado_em' => agora(), 'atualizado_por' => $s['nome']];
                anotar($p, $s, 'onboarding', true);
            }
            else { $p['mapa'] = ['dados' => $valor, 'gerado_em' => agora(), 'gerado_por' => $s['nome']]; anotar($p, $s, 'mapeamento gerado'); }
            gravar_projeto($p);
            return ['ok' => true, 'atualizado_em' => $p['atualizado_em']];
        });
        if (!$r) erro(404, 'PROJETO', 'Projeto não encontrado.');
        enviar(200, $r);
    }
    if ($metodo === 'POST' && $parte === 'arquivar') {
        if ($s['papel'] !== 'admin') erro(403, 'PAPEL', 'Só o administrador arquiva projetos.');
        $arquivar = !empty(ler_corpo(500)['arquivar']);
        $ok = com_trava(function () use ($id, $arquivar, $s) {
            $p = ler_projeto($id);
            if (!$p) return false;
            $p['arquivado'] = $arquivar;
            anotar($p, $s, $arquivar ? 'arquivado' : 'desarquivado');
            gravar_projeto($p);
            return true;
        });
        if (!$ok) erro(404, 'PROJETO', 'Projeto não encontrado.');
        enviar(200, ['ok' => true]);
    }
}

// ---------------------------------------------------------------- equipe (só administrador)
if (str_starts_with($caminho, '/api/equipe')) {
    if ($s['papel'] !== 'admin') erro(403, 'PAPEL', 'Só o administrador gerencia a equipe.');
    if ($metodo === 'GET' && $caminho === '/api/equipe') {
        $pend = array_values(array_map(fn($x) => ['email' => $x['email'], 'nome' => $x['nome'], 'papel' => $x['papel'], 'expira' => $x['expira'], 'criado_por' => $x['criado_por'] ?? ''], convites()));
        enviar(200, ['usuarios' => array_map('usuario_publico', usuarios()), 'convites' => $pend]);
    }
    if ($metodo === 'POST' && $caminho === '/api/equipe/convites') {
        $c = ler_corpo(2000);
        $email = mb_strtolower(texto($c['email'] ?? '', 160));
        $nome = texto($c['nome'] ?? '', 80);
        $papel = ($c['papel'] ?? '') === 'admin' ? 'admin' : 'equipe';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) erro(400, 'EMAIL', 'E-mail inválido.');
        if ($nome === '') erro(400, 'NOME', 'Informe o nome da pessoa.');
        $existe = achar_usuario($email);
        if ($existe && !empty($existe['ativo'])) erro(409, 'CONTA', 'Essa pessoa já tem conta ativa.');
        $token = bin2hex(random_bytes(20));
        com_trava(function () use ($token, $email, $nome, $papel, $s) {
            $todos = array_filter(ler_json('convites.json', []), fn($x) => $x['email'] !== $email);
            $todos[hash('sha256', $token)] = ['email' => $email, 'nome' => $nome, 'papel' => $papel, 'expira' => agora_ms() + 7 * 86400e3, 'criado_por' => $s['nome']];
            gravar_json('convites.json', $todos);
        });
        $host = preg_replace('/[^a-z0-9.:-]/i', '', (string) ($_SERVER['HTTP_HOST'] ?? 'start.win7.ai'));
        registrar('info', 'convite_criado', ['para' => $email, 'por' => $s['email']]);
        enviar(200, ['link' => (eh_https() ? 'https' : 'http') . '://' . $host . '/#convite=' . $token, 'expira_em_dias' => 7]);
    }
    if ($metodo === 'POST' && $caminho === '/api/equipe/convites/cancelar') {
        $email = mb_strtolower(texto(ler_corpo(500)['email'] ?? '', 160));
        com_trava(function () use ($email) { gravar_json('convites.json', array_filter(ler_json('convites.json', []), fn($x) => $x['email'] !== $email)); });
        enviar(200, ['ok' => true]);
    }
    if ($metodo === 'POST' && $caminho === '/api/equipe/situacao') {
        $c = ler_corpo(500);
        $email = mb_strtolower(texto($c['email'] ?? '', 160));
        $ativo = !empty($c['ativo']);
        if ($email === $s['email']) erro(400, 'PROPRIA', 'Você não pode desativar a própria conta.');
        $ok = com_trava(function () use ($email, $ativo) {
            $l = usuarios(); $achou = false;
            foreach ($l as &$x) if ($x['email'] === $email) { $x['ativo'] = $ativo; $achou = true; }
            unset($x);
            if ($achou) gravar_json('usuarios.json', $l);
            return $achou;
        });
        if (!$ok) erro(404, 'CONTA', 'Conta não encontrada.');
        enviar(200, ['ok' => true]);
    }
}

erro(404, 'NAO_ENCONTRADO', 'Não encontrado.');
