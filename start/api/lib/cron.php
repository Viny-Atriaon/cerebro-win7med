<?php
// Cron do start.win7.ai (ADR-008): o cPanel chama uma vez por dia pela linha de comando e gera a cópia do dia.
// Pela web nunca roda: api/lib/ é proibido no .htaccess e, mesmo assim, aqui só a linha de comando passa.
//   php api/lib/cron.php [--forcar]        (DADOS_DIR aponta a pasta de dados nos testes)
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require __DIR__ . '/base.php';
require __DIR__ . '/copia.php';
$r = copia_do_dia(in_array('--forcar', $argv ?? [], true));
echo json_encode(['quando' => agora(), 'copia' => $r ?? (chave_copia() ? 'a de hoje já existe' : 'falta a chave-copia.txt')], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
