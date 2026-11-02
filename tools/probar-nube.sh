#!/usr/bin/env bash
# probar-nube.sh — prueba cloud/runner.js con Chrome REAL (Playwright) contra una COPIA FALSA de ED
# (tools/sitio-prueba/index.html: login con campo trampa, Home en español con lista de lecciones,
#  aviso "sesión no activa" a los 5 s y popup "You are already logged in" al volver a entrar).
# Requisitos: npm install --no-save playwright@1.48.2 && npx playwright install chromium
# Uso: bash tools/probar-nube.sh [minutos=0.8]
set -e
cd "$(dirname "$0")/.."
node build.js >/dev/null
( cd tools/sitio-prueba && nohup setsid python3 -m http.server 8765 >/dev/null 2>&1 < /dev/null & ) ; sleep 2
rm -rf salida estado
CUENTA=1 ED_CUENTAS="hugo secreta123 Hugo" ED_HOST_EXTRA=localhost MINUTOS="${1:-0.8}" \
  ED_LOGIN="http://localhost:8765/#/login" GITHUB_STEP_SUMMARY=/tmp/resumen-prueba.md timeout 300 node cloud/runner.js || true
echo "---- salida/ ----"; ls salida
python3 tools/analizar-registro.py salida/registro.txt | head -60
# NUEVO v21.8c: apagar la copia falsa de ED al terminar. Si queda prendida, una terminal que lee la salida
# del script por una tubería (p. ej. "| tail") se queda esperando para siempre (revisión del 01/11).
pkill -f "http[.]server 8765" || true
