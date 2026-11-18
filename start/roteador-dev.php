<?php
// Roteador para rodar o start.win7.ai localmente com o servidor embutido do PHP, igual ao .htaccess do servidor (ADR-008):
//   php -c start/php-dev.ini -d extension_dir=<pasta ext do PHP> -S 127.0.0.1:4770 start/roteador-dev.php
// Da raiz do cerebro-win7med, depois de `npm run build`. DADOS_DIR aponta a pasta de dados (nunca a do servidor).
// /api/* → start/api/index.php (a fonte) · /api/lib/ → 403 · o resto: arquivos do build em dist/start (ou START_DIST).
$caminho = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
if (str_starts_with($caminho, '/api/lib/')) { http_response_code(403); return true; }
if (str_starts_with($caminho, '/api/')) { require __DIR__ . '/api/index.php'; return true; }

$tipos = ['html' => 'text/html; charset=utf-8', 'txt' => 'text/plain; charset=utf-8', 'js' => 'text/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8', 'png' => 'image/png', 'svg' => 'image/svg+xml'];
$base = realpath(getenv('START_DIST') ?: dirname(__DIR__) . '/dist/start');
$alvo = $base ? realpath($base . ($caminho === '/' ? '/index.html' : $caminho)) : false;
if ($alvo && str_starts_with($alvo, $base . DIRECTORY_SEPARATOR) && is_file($alvo) && !str_starts_with(basename($alvo), '.') && !str_contains($alvo, DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR)) {
    $ext = strtolower(pathinfo($alvo, PATHINFO_EXTENSION));
    header('Content-Type: ' . ($tipos[$ext] ?? 'application/octet-stream'));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-cache');
    header('Referrer-Policy: no-referrer');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    if ($ext === 'html') header('X-Frame-Options: SAMEORIGIN');
    readfile($alvo);
    return true;
}
http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Não encontrado.';
return true;
