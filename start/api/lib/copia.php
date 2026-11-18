<?php
// Cópia do dia do start.win7.ai (ADR-008, adendo de 18/11/2026): um arquivo cifrado com todos os projetos, as contas
// e as pastas, para a tarefa Win7-BackupFora levar para fora da HostGator (Documentos\Backups Win7 e Drive cifrado).
// Formato WCB1: "WCB1" + nonce (12) + tag (16) + AES-256-GCM(gzip(JSON)), AAD = "WCB1". A chave fica em
// chave-copia.txt na pasta de dados (fora da pasta pública) e no .segredos do computador que publica: sem ela, a cópia não abre.
// Partes em base64 de 700 KB (.b64.NNN) e o .sha256 por último: a API do cPanel só lê texto até 1 MB, e é por ela que a
// tarefa baixa, sem SSH. Mesmo esquema do GoogleX (Backup.php de lá). Guarda as 14 mais recentes no servidor.
declare(strict_types=1);

const COPIA_MAGICO = 'WCB1';
const COPIA_GUARDAR = 14;
const COPIA_PARTE = 525000;  // múltiplo de 3: as partes concatenadas formam um base64 único e válido

function chave_copia(): ?string {
    $t = @file_get_contents(caminho('chave-copia.txt'));
    if ($t === false) return null;
    $k = base64_decode(trim($t), true);
    return $k !== false && strlen($k) === 32 ? $k : null;
}

/** Arquivos que voltam numa restauração. Ficam de fora: sessões e limites (estado/), as cópias por projeto (backups/), os logs. */
function copia_arquivos(): array {
    $arquivos = [];
    com_trava(function () use (&$arquivos) {
        foreach (['usuarios.json', 'convites.json', 'pastas.json', 'projetos/indice.json'] as $a) {
            $v = ler_json($a, null);
            if ($v !== null) $arquivos[$a] = $v;
        }
        foreach (glob(DADOS . '/projetos/*.json') ?: [] as $f) {
            $n = 'projetos/' . basename($f);
            if ($n === 'projetos/indice.json' || !preg_match('#^projetos/[a-f0-9]{16}\.json$#', $n)) continue;
            $v = ler_json($n, null);
            if ($v !== null) $arquivos[$n] = $v;
        }
    });
    return $arquivos;
}

/** Gera a cópia de hoje (uma por dia; --forcar gera outra). Devolve o resumo, ou null se já existe ou se falta a chave. */
function copia_do_dia(bool $forcar = false): ?array {
    $chave = chave_copia();
    if (!$chave) { registrar('aviso', 'copia_sem_chave'); return null; }
    $pasta = DADOS . '/copias';
    if (!is_dir($pasta)) @mkdir($pasta, 0750, true);
    if (!$forcar && (glob($pasta . '/cerebro-' . date('Y-m-d') . '-*.json.gz.enc') ?: [])) return null;
    $arquivos = copia_arquivos();
    $projetos = count(array_filter(array_keys($arquivos), fn($a) => $a !== 'projetos/indice.json' && str_starts_with($a, 'projetos/')));
    $json = json_encode(['schema' => 'w7-start-copia', 'versao' => 1, 'gerado_em' => agora(), 'projetos' => $projetos, 'arquivos' => $arquivos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $gz = gzencode($json, 9);
    $nonce = random_bytes(12);
    $tag = '';
    $cifra = openssl_encrypt($gz, 'aes-256-gcm', $chave, OPENSSL_RAW_DATA, $nonce, $tag, COPIA_MAGICO, 16);
    if ($cifra === false || strlen($tag) !== 16) throw new RuntimeException('falha ao cifrar a cópia do dia');
    $bruto = COPIA_MAGICO . $nonce . $tag . $cifra;
    // confere antes de publicar: decifra, descomprime e lê o JSON de volta
    $volta = openssl_decrypt(substr($bruto, 32), 'aes-256-gcm', $chave, OPENSSL_RAW_DATA, substr($bruto, 4, 12), substr($bruto, 16, 16), COPIA_MAGICO);
    $lido = $volta === false ? null : json_decode((string) gzdecode($volta), true);
    if (!is_array($lido) || count($lido['arquivos'] ?? []) !== count($arquivos)) throw new RuntimeException('a cópia do dia não confere depois de decifrar');
    $nome = 'cerebro-' . date('Y-m-d-His') . '.json.gz.enc';
    $arq = $pasta . '/' . $nome;
    if (file_put_contents($arq . '.parcial', $bruto) !== strlen($bruto)) throw new RuntimeException('falha ao gravar a cópia do dia');
    rename($arq . '.parcial', $arq);
    $n = 0;
    foreach (str_split($bruto, COPIA_PARTE) as $pedaco) {
        $n++;
        $b64 = base64_encode($pedaco);
        if (file_put_contents($arq . '.b64.' . str_pad((string) $n, 3, '0', STR_PAD_LEFT), $b64) !== strlen($b64)) throw new RuntimeException('falha ao gravar a parte ' . $n);
    }
    file_put_contents($arq . '.sha256', hash('sha256', $bruto));  // por último: sem ele, a tarefa espera a próxima rodada
    $todas = glob($pasta . '/cerebro-*.json.gz.enc') ?: [];
    sort($todas);
    foreach (array_slice($todas, 0, max(0, count($todas) - COPIA_GUARDAR)) as $velha) {
        @unlink($velha);
        @unlink($velha . '.sha256');
        foreach (glob($velha . '.b64.*') ?: [] as $p) @unlink($p);
    }
    $r = ['arquivo' => $nome, 'projetos' => $projetos, 'arquivos' => count($arquivos), 'kb' => (int) ceil(strlen($bruto) / 1024), 'partes' => $n];
    registrar('info', 'copia_gerada', $r);
    return $r;
}
