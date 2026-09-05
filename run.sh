#!/usr/bin/env bash
set -euo pipefail

echo "Iniciando DEMASY en http://127.0.0.1:${PORT:-8000}"
exec npm start
