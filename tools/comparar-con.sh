#!/usr/bin/env bash
# comparar-con.sh — corre TODAS las pantallas de tools/regresion.js con OTRO bot (p. ej. la versión anterior)
# y muestra en qué pantallas se comporta distinto que el dist/ actual. Es la prueba de oro de cada arreglo:
#   "la versión vieja falla igual que en ED real  →  la nueva lo resuelve  →  las demás pantallas no cambian".
# Uso:  bash tools/comparar-con.sh ruta/al/ed-autopilot-VIEJO.js [pantalla1 pantalla2 ...]
# Para obtener el viejo:  git show HEAD~1:dist/ed-autopilot.js > /tmp/viejo.js
set -e
cd "$(dirname "$0")/.."
VIEJO="$(realpath "$1")"; shift || true
node build.js >/dev/null
sed "s#path.join(__dirname, '..', 'dist', 'ed-autopilot.js')#'$VIEJO'#; s#path.join(__dirname, 'regresion.snapshot.json')#'/tmp/snap-viejo.json'#" tools/regresion.js > tools/_regresion_viejo.js
rm -f /tmp/snap-viejo.json /tmp/snap-nuevo.json
node tools/_regresion_viejo.js --actualizar >/dev/null 2>&1 || true
sed "s#path.join(__dirname, 'regresion.snapshot.json')#'/tmp/snap-nuevo.json'#" tools/regresion.js > tools/_regresion_nuevo.js
node tools/_regresion_nuevo.js --actualizar >/dev/null 2>&1 || true
rm -f tools/_regresion_viejo.js tools/_regresion_nuevo.js
node -e "
const v=require('/tmp/snap-viejo.json'), n=require('/tmp/snap-nuevo.json'), pedir=process.argv.slice(1);
const ks=[...new Set([...Object.keys(v),...Object.keys(n)])].filter(k=>!pedir.length||pedir.includes(k));
let d=0; for (const k of ks) { if (JSON.stringify(v[k])===JSON.stringify(n[k]) && !pedir.length) continue; d++;
  console.log('■', k); console.log('   viejo:', v[k] ? v[k].r : '(no existía)'); console.log('   nuevo:', n[k] ? n[k].r : '(no existe)'); }
console.log(d ? '' : 'Sin diferencias.', '(' + ks.length + ' pantallas revisadas)');" "$@"
