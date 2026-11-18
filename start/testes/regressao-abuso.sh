#!/usr/bin/env bash
# Regressão de abuso da API do start.win7.ai (TEST-ABUSE-01, ADR-008): roda contra uma instância descartável do PHP,
# nunca contra a do ar. Usada pelo audit-runtime.sh (--abuse). Falha vira "FALHOU" para o fiscal.
set -o pipefail
cd "$(dirname "$0")/../.." || exit 2
node start/testes/teste-api-abuso.mjs | sed 's/^❌/FALHOU/'
