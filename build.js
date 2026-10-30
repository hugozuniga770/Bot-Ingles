#!/usr/bin/env node
/* =====================================================================
   build.js — une los archivos de src/ en UN solo script para pegar en la consola
   ---------------------------------------------------------------------
   Uso:
     node build.js           → genera dist/ed-autopilot.js
     node build.js --check   → falla si dist/ no está al día con src/ (lo usa GitHub Actions)

   Sin dependencias: no hace falta npm install.

   CÓMO FUNCIONA: no hay import/export. Los archivos se pegan uno detrás de otro, en el
   ORDEN de abajo, dentro de un único (() => { 'use strict'; ... })(). Por eso todos los
   archivos "se ven" entre sí, igual que cuando el bot era un solo archivo.
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// El orden IMPORTA: cada archivo puede usar lo que definen los de arriba.
// Para añadir un tipo de ejercicio nuevo, ponlo antes de 'exercises/index.js'.
const ORDEN = [
  'bootstrap.js',
  'core/config.js',
  'utils/dom.js',
  'utils/logger.js',
  'utils/drag.js',
  'utils/scroll.js',
  'utils/dnd-model.js',
  'utils/practice.js',
  'utils/press.js',
  'utils/reporter.js',
  'core/storage.js',
  'core/navigation.js',
  'core/dropdowns.js',
  'core/sweep.js',
  'exercises/writing.js',
  'exercises/select-text.js',
  'exercises/sequence.js',
  'exercises/dnd.js',
  'exercises/mcq.js',
  'exercises/fitb.js',
  'exercises/text.js',
  'exercises/media.js',
  'exercises/speaking.js',
  'exercises/droptarget.js',
  'exercises/mcq-legacy.js',
  'exercises/ddl-legacy.js',
  'exercises/memory.js',
  'exercises/index.js',
  'tests/test-manager.js',
  'core/engine.js',
  'ui/console-api.js',
  'ui/hud.js',
  'ui/shortcuts.js',
  'main.js'
];

const SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'dist', 'ed-autopilot.js');

// Avisar si hay un archivo en src/ que no está en ORDEN (se te olvidó agregarlo)
function listar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? listar(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}
const sobrantes = listar(SRC).map(f => path.relative(SRC, f).split(path.sep).join('/'))
  .filter(f => f.endsWith('.js') && !ORDEN.includes(f));
if (sobrantes.length) { console.error('✗ Archivos en src/ que NO están en ORDEN:', sobrantes.join(', ')); process.exit(1); }

const indent = s => s.split('\n').map(l => (l ? '  ' + l : l)).join('\n');
const partes = ORDEN.map(f => {
  const p = path.join(SRC, f);
  if (!fs.existsSync(p)) { console.error('✗ Falta', f); process.exit(1); }
  const code = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
  return indent(`// ▼▼▼ src/${f} ▼▼▼\n${code}`);
});

const version = (fs.readFileSync(path.join(SRC, 'bootstrap.js'), 'utf8').match(/const V = '([^']+)'/) || [])[1] || '?';
const banner = `/* =====================================================================
   ED-Autopilot v${version}  —  ARCHIVO GENERADO, NO LO EDITES A MANO
   ---------------------------------------------------------------------
   Fuente: src/ del repo github.com/hugozuniga770/Bot-Ingles  →  node build.js
   Pégalo en la consola (F12) de English Discoveries y luego: __ed.auto()
   Comandos: __ed.help()  ·  Diagnóstico: __ed.inspect()
   ===================================================================== */`;

const salida = `${banner}\n(() => {\n  'use strict';\n${partes.join('\n\n')}\n})();\n`;

// Verificación de sintaxis antes de escribir (no ejecuta nada, solo compila)
try { new vm.Script(salida, { filename: 'ed-autopilot.js' }); }
catch (e) { console.error('✗ Error de sintaxis en el resultado:', e.message); process.exit(1); }

if (process.argv.includes('--check')) {
  const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (actual !== salida) { console.error('✗ dist/ed-autopilot.js NO está al día. Corre: node build.js'); process.exit(1); }
  console.log(`✓ dist/ed-autopilot.js al día (v${version})`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, salida);
  console.log(`✓ dist/ed-autopilot.js generado (v${version}, ${ORDEN.length} archivos, ${salida.split('\n').length} líneas)`);
}
