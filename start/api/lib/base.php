<?php
// Base do servidor do start.win7.ai (ADR-008): projetos salvos da Análise e do onboarding, com conta por pessoa.
// Mesmo desenho do servidor da Lis (LAC, ADR-004 de lá): PHP sem dependências, dados em JSON fora da pasta pública,
// gravação sob trava de arquivo e renomeio atômico. Só extensões padrão do PHP 8 (json, mbstring, openssl).
declare(strict_types=1);

// HostGator: start-cerebro-dados na pasta da conta (fora da pasta pública). Testes locais: variável DADOS_DIR.
define('DADOS', rtrim(getenv('DADOS_DIR') ?: dirname(__DIR__, 3) . '/start-cerebro-dados', '/\\'));
const HORAS_SESSAO = 72;
const NOME_COOKIE = 'w7start';
date_default_timezone_set('America/Sao_Paulo');

function caminho(string $arq): string { return DADOS . '/' . $arq; }

function ler_json(string $arq, $padrao = null) {
    $p = caminho($arq);
    if (!is_file($p)) return $padrao;
    $t = @file_get_contents($p);
    if ($t === false || $t === '') return $padrao;
    $v = json_decode($t, true);
    return $v === null && trim($t) !== 'null' ? $padrao : $v;
}

/** Grava em arquivo temporário e renomeia: queda no meio da escrita não deixa JSON pela metade. */
function gravar_json(string $arq, $valor): void {
    $p = caminho($arq);
    if (!is_dir(dirname($p))) @mkdir(dirname($p), 0750, true);
    $tmp = $p . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, json_encode($valor, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) throw new RuntimeException('falha ao gravar ' . $arq);
    @chmod($tmp, 0640);
    rename($tmp, $p);
}

/** Trava exclusiva dos dados durante um trecho de ler-alterar-gravar. */
function com_trava(callable $fn) {
    if (!is_dir(DADOS)) @mkdir(DADOS, 0750, true);
    $h = fopen(DADOS . '/.trava', 'c');
    flock($h, LOCK_EX);
    try { return $fn(); } finally { flock($h, LOCK_UN); fclose($h); }
}

function agora(): string { return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z'); }
function agora_ms(): float { return floor(microtime(true) * 1000); }
function novo_id(): string { return bin2hex(random_bytes(8)); }

/** Texto vindo de fora: tira caracteres de controle, apara e corta no tamanho. */
function texto($v, int $max): string {
    if (!is_string($v)) return '';
    $v = trim(preg_replace('/[\x00-\x1f\x7f]/u', ' ', $v) ?? '');
    return mb_substr($v, 0, $max);
}

/** Igual ao slug do motor: minúsculas, sem acento, hífen entre palavras. */
function slug_de($s): string {
    $s = mb_strtolower((string) $s);
    if (class_exists('Normalizer')) $s = Normalizer::normalize($s, Normalizer::FORM_D) ?: $s;
    $s = preg_replace('/\p{Mn}+/u', '', $s) ?? $s;
    return trim(preg_replace('/[^a-z0-9]+/', '-', $s) ?? '', '-');
}

// ---------- registro (log) por dia, 5 MB por dia ----------
function registrar(string $nivel, string $evento, array $dados = []): void {
    $linha = json_encode(['quando' => agora(), 'nivel' => $nivel, 'evento' => $evento] + $dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $pasta = DADOS . '/logs';
    if (!is_dir($pasta)) @mkdir($pasta, 0750, true);
    $arq = $pasta . '/' . date('Y-m-d') . '.log';
    if (!is_file($arq) || filesize($arq) < 5 * 1024 * 1024) @file_put_contents($arq, $linha . "\n", FILE_APPEND | LOCK_EX);
}

// ---------- HTTP ----------
function cabecalhos(array $extras = []): void {
    $base = ['X-Content-Type-Options' => 'nosniff', 'X-Frame-Options' => 'DENY', 'Referrer-Policy' => 'no-referrer', 'X-Robots-Tag' => 'noindex, nofollow, noarchive'];
    foreach (array_merge($base, $extras) as $k => $v) header($k . ': ' . $v);
}
function enviar(int $status, $corpo, array $extras = []): never {
    http_response_code($status);
    cabecalhos(array_merge(['Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store'], $extras));
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function erro(int $status, string $codigo, string $mensagem, array $extras = []): never {
    enviar($status, ['erro' => array_merge(['codigo' => $codigo, 'mensagem' => $mensagem], $extras)]);
}
/** Corpo JSON da requisição, com teto de tamanho. */
function ler_corpo(int $limite = 20000): array {
    $tamanho = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($tamanho > $limite) erro(413, 'REQUISICAO', 'Requisição grande demais.');
    $bruto = file_get_contents('php://input', false, null, 0, $limite + 1);
    if ($bruto === false || $bruto === '') return [];
    if (strlen($bruto) > $limite) erro(413, 'REQUISICAO', 'Requisição grande demais.');
    $v = json_decode($bruto, true);
    if (!is_array($v)) erro(400, 'REQUISICAO', 'Requisição inválida.');
    return $v;
}

// ---------- IP do visitante: atrás da Cloudflare, o CF-Connecting-IP só vale vindo de uma faixa da Cloudflare ----------
const FAIXAS_CLOUDFLARE = ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22'];
function ip_na_faixa(string $ip, string $faixa): bool {
    [$rede, $bits] = explode('/', $faixa);
    $a = ip2long($ip); $b = ip2long($rede);
    if ($a === false || $b === false) return false;
    $mascara = -1 << (32 - (int) $bits);
    return ($a & $mascara) === ($b & $mascara);
}
function ip_visitante(): string {
    $direto = (string) ($_SERVER['REMOTE_ADDR'] ?? '?');
    $cf = (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? '');
    $doCloudflare = (bool) array_filter(FAIXAS_CLOUDFLARE, fn($f) => ip_na_faixa($direto, $f));
    $local = (bool) preg_match('/^(127\.|::1$)/', $direto);
    if ($cf !== '' && ($doCloudflare || $local)) return mb_substr($cf, 0, 64);
    return mb_substr($direto, 0, 64);
}
function eh_https(): bool { return ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' || !empty($_SERVER['HTTP_CF_VISITOR']); }

// ---------- limites por janela de tempo ----------
function cabe(string $chave, int $maximo, int $janela_ms): bool {
    return com_trava(function () use ($chave, $maximo, $janela_ms) {
        $j = ler_json('estado/janelas.json', []);
        $t = agora_ms();
        $lista = array_values(array_filter($j[$chave] ?? [], fn($x) => $t - $x < $janela_ms));
        if (count($lista) >= $maximo) { $j[$chave] = $lista; gravar_json('estado/janelas.json', $j); return false; }
        $lista[] = $t;
        $j[$chave] = $lista;
        foreach ($j as $k => $v) if (!array_filter($v, fn($x) => $t - $x < 36e5)) unset($j[$k]);
        gravar_json('estado/janelas.json', $j);
        return true;
    });
}
function devolver(string $chave): void {
    com_trava(function () use ($chave) {
        $j = ler_json('estado/janelas.json', []);
        if (!empty($j[$chave])) { array_pop($j[$chave]); gravar_json('estado/janelas.json', $j); }
    });
}
