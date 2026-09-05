#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f index.html || ! -f package.json ]]; then
  echo "Ejecuta este script desde la raíz de DEMASY." >&2
  exit 1
fi

echo "Validando DEMASY antes del despliegue..."
npm test

echo
echo "Validación aprobada."
echo "Publicación estática:"
echo "  npx netlify deploy --prod --dir ."
echo "  npx vercel --prod"
echo
echo "Para Gemini remoto despliega el servidor Node o adapta /api/chat"
echo "a una función serverless. Nunca publiques GEMINI_API_KEY."
