/* =====================================================================
   tools/probar-banco-tablero.js — prueba el BANCO de respuestas por curso y el TABLERO con checks (NUEVO v21.13)
   Corre solo (sin internet ni jsdom): node tools/probar-banco-tablero.js  (también lo corre `npm test`)
   ===================================================================== */
'use strict';
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const B = require('../cloud/banco');
const { dibujar, estadoPaso } = require('../cloud/tablero');

// ---------- BANCO ----------
const A = { curso: 'UPB Beginners 2', answers: { 'What is X?': 'a' }, testAns: { 'Lesson 1: Food||Step 3: Test': { 1: { mcq: 'x' }, 2: { fitb: ['y'] } }, 'Lesson 2: Diet||Step 3: Test': { 1: { mcq: 'z' } } }, known: ['Lesson 1: Food||Step 3: Test', 'Lesson 2: Diet||Step 3: Test'] };
const Bc = { curso: 'UPB Beginners 2', answers: { 'What is X?': 'b', Q2: 'c' }, testAns: { 'Lesson 1: Food||Step 3: Test': { 2: { fitb: ['OTRA'] }, 3: { mcq: 'w' } }, 'Lesson 5: Modals||Step 3: Test': { 1: { mcq: 'm' } } }, known: ['Lesson 5: Modals||Step 3: Test', 'Lesson 9: Vacio||Step 3: Test'] };
const m = B.mezclar(A, Bc);
assert.strictEqual(m.answers['What is X?'], 'a', 'lo de la cuenta manda');
assert.strictEqual(m.answers.Q2, 'c', 'del banco se agrega lo que falta');
assert.deepStrictEqual(m.testAns['Lesson 1: Food||Step 3: Test'][2], { fitb: ['y'] }, 'manda por pregunta');
assert.deepStrictEqual(m.testAns['Lesson 1: Food||Step 3: Test'][3], { mcq: 'w' }, 'pregunta que faltaba');
assert.ok(m.known.includes('Lesson 5: Modals||Step 3: Test'));
assert.ok(!m.known.includes('Lesson 9: Vacio||Step 3: Test'), 'un "known" sin respuestas no entra');
assert.strictEqual(B.contar(m), 3);
assert.deepStrictEqual(A.testAns['Lesson 1: Food||Step 3: Test'], { 1: { mcq: 'x' }, 2: { fitb: ['y'] } }, 'no toca los originales');
assert.strictEqual(B.slug('UPB Beginners 2'), 'upb-beginners-2');
// NUEVO v21.16: lo que aprendió el Explorador viaja en el banco (lo de la cuenta manda)
{ const ma = B.mezclar({ aprendido: { f1: { tipo: 'clic', sel: 'a' } } }, { aprendido: { f1: { tipo: 'clic', sel: 'b' }, f2: { tipo: 'teclear', sel: 'c' } } });
  assert.strictEqual(ma.aprendido.f1.sel, 'a'); assert.strictEqual(ma.aprendido.f2.sel, 'c');
  assert.deepStrictEqual(B.desdeLocal({ 'ed:aprendido:v1': JSON.stringify({ x: { tipo: 'clic' } }) }).aprendido, { x: { tipo: 'clic' } }); }
// NUEVO v21.16: catálogo del nivel — por lugar manda la cuenta, salvo que en el banco se haya marcado; el dump de ejemplo se conserva
{ const mc = B.mezclar({ catalogo: { lugares: { x: { estado: 'falla' }, y: { estado: 'ok', como: 1 } }, firmas: { f: { kind: 'dnd' } } } },
    { catalogo: { lugares: { x: { estado: 'ok', como: 2 }, z: { estado: 'falla' } }, firmas: { f: { kind: 'dnd', ejemplo: { a: 1 } } } } }).catalogo;
  assert.strictEqual(mc.lugares.x.como, 2); assert.strictEqual(mc.lugares.y.como, 1); assert.ok(mc.lugares.z); assert.deepStrictEqual(mc.firmas.f.ejemplo, { a: 1 });
  assert.deepStrictEqual(B.desdeLocal({ 'ed:catalogo:v1': JSON.stringify({ C1: { lugares: { q: 1 } }, C2: {} }) }, 'C1').catalogo, { lugares: { q: 1 } }, 'solo el curso pedido'); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'banco-'));
const art = path.join(tmp, 'art'), ban = path.join(tmp, 'banco');
for (const d of ['banco-1', 'banco-2']) fs.mkdirSync(path.join(art, d), { recursive: true });
fs.mkdirSync(ban);
fs.writeFileSync(path.join(ban, 'upb-beginners-2.json'), JSON.stringify(Object.assign(B.vacio('UPB Beginners 2'), { testAns: { 'Lesson 7: Old||Step 3: Test': { 1: { mcq: 'o' } } } })));
fs.writeFileSync(path.join(art, 'banco-1', 'upb-beginners-2.json'), JSON.stringify(A));
fs.writeFileSync(path.join(art, 'banco-2', 'upb-beginners-2.json'), JSON.stringify(Bc));
fs.writeFileSync(path.join(art, 'banco-2', 'upb-intermediate-1.json'), JSON.stringify({ curso: 'UPB Intermediate 1', testAns: { 'Lesson 1: Job||Step 3: Test': { 1: { mcq: 'j' } } }, known: [] }));
execFileSync('node', [path.join(__dirname, '..', 'cloud', 'banco.js'), 'juntar', art, ban], { stdio: 'ignore' });
assert.strictEqual(B.contar(JSON.parse(fs.readFileSync(path.join(ban, 'upb-beginners-2.json'), 'utf8'))), 4, 'juntar: banco previo + 2 cuentas');
assert.ok(fs.existsSync(path.join(ban, 'upb-intermediate-1.json')), 'juntar: un archivo por curso');
execFileSync('node', [path.join(__dirname, '..', 'cloud', 'banco.js'), 'juntar', path.join(tmp, 'nada'), path.join(tmp, 'vacio')], { stdio: 'ignore' });
assert.ok(fs.existsSync(path.join(tmp, 'vacio', 'LEEME.txt')), 'la caché necesita la carpeta aunque esté vacía');

// ---------- TABLERO ----------
const mapa = { unidades: [
  { n: 1, completion: 100, locked: false, lecciones: [{ n: 1, nombre: 'Phone Sales', test: 100, terminado: true, pasos: 3, hechos: 3 }, { n: 0, nombre: '', terminado: false }, { n: 0, nombre: 'Unit Test', test: 90, terminado: true }] },
  { n: 8, completion: 20, locked: false, lecciones: [{ n: 1, nombre: 'Lost Report', test: 100, terminado: true, pasos: 3, hechos: 3 }, { n: 2, nombre: "Grumble's Department Store", test: null, terminado: false, pasos: 3, hechos: 0 }] },
  { n: 9, completion: 0, locked: true, lecciones: [] }] };
const tablero = { corrida: 'c1', ultimo: '8|2|2', pasos: {
  '8|2|1': { u: 8, l: 2, p: 1, paso: 'Step 1: Explore', tareas: { '-': 'falla' }, motivo: 'atascado_en_el_mismo_lugar', reporte: 5 },
  '8|2|2': { u: 8, l: 2, p: 2, paso: 'Step 2: Practice', tareas: { 1: 'ok', 2: 'falla', 3: 'saltado' }, kind: 'memory' },
  '8|2|3': { u: 8, l: 2, p: 3, paso: 'Step 3: Test', tareas: {}, test: 97, esTest: true } } };
assert.strictEqual(estadoPaso(tablero.pasos['8|2|2']), 'falla');
assert.strictEqual(estadoPaso({ tareas: { 1: 'falla', 2: 'ok' } }), 'falla');
assert.strictEqual(estadoPaso({ tareas: { '-': 'visto' } }), 'visto');
const md = dibujar({ titulo: 'Cuenta 2', curso: 'UPB Beginners 2', login: 'ok', widgets: { completion: 54, avg: 94 }, mapa, tablero });
const tiene = x => assert.ok(md.includes(x), 'falta: ' + x + '\n\n' + md);
tiene('## 👤 Cuenta 2 — UPB Beginners 2');
tiene('🔄 **ahora: Unidad 8 → Lección 2 → Step 2: Practice**');
tiene('Realización **54 %**'); tiene('Promedio de tests **94 %**');
// fila de cuadritos: Login → U1 → U8 → U9, con por dónde va
tiene('| 1 · Login | U1 | U8 | U9 |'); tiene('| ✅ | ✅ 1/1 | 🔄 L2 · Step 2 | 🔒 |');
// desplegable por unidad (la de ahora, abierta); adentro, lección por lección
tiene('<details><summary>✅ <b>Unidad 1</b> · 1/1 lecciones · tests 100 % · Unit Test ✅ 90 %</summary>');
tiene('- ✅ **L1 · Phone Sales** — ya estaba hecha · test 100 %');
tiene('- ✅ **Unit Test** — 90 %');
tiene('<details open><summary>🔄 <b>Unidad 8</b> · 1/2 lecciones · ⚠️ tests: L2 97 % · 🔄 aquí está ahora</summary>');
tiene("- 🔄 **L2 · Grumble's Department Store** ← aquí está ahora — Step 1: Explore ❌ _atascado (no avanzaba) · reporte #5_ · Step 2: Practice ❌ 🔄 _ED no la marcó_ · Step 3: Test ⚠️ 97 %");
tiene('<details><summary>🔒 <b>Unidad 9</b> · bloqueada</summary>');
tiene('atascado (no avanzaba) (atascado_en_el_mismo_lugar) · reporte #5');
tiene('test en 97 %');
const fin = dibujar({ titulo: 'Cuenta 2', login: 'ok', mapa, tablero, fin: true });
assert.ok(fin.includes('🏁 terminó') && !fin.includes('<details open') && !fin.includes('← aquí está ahora'), 'al terminar nada queda "ahora"');
const malLogin = dibujar({ titulo: 'Cuenta 1', login: 'falla', loginMsg: 'Invalid user name or password' });
assert.ok(malLogin.includes('❌ Login (Invalid user name or password)') && malLogin.includes('| 1 · Login |') && malLogin.includes('| ❌ |') && !malLogin.includes('<details'));
const enTest = dibujar({ titulo: 'Roy (cuenta 3)', login: 'ok', mapa, tablero: Object.assign({}, tablero, { ahora: { u: 8, l: 2, p: 3, paso: 'Step 3: Test', contador: '5/10' } }) });
assert.ok(enTest.includes('## 👤 Roy (cuenta 3)') && enTest.includes('→ Step 3: Test (5/10)**') && enTest.includes('🔄 L2 · Test 5/10') && enTest.includes('Step 3: Test ⚠️ 🔄 5/10'), enTest);
const sinDatos = dibujar({ titulo: 'Cuenta 3', login: 'ok' });
assert.ok(sinDatos.includes('Todavía no hay datos'));
console.log('✓ banco de respuestas y tablero: OK');

// ---------- DIAGNÓSTICO (NUEVO v21.16, ideas 18–28) ----------
{
  const D = require('../cloud/diagnostico');
  const reps = [{ num: 1, motivo: 'tarea_no_marcada', kind: 'dnd', leccion: 'Lesson 6: Career', step: 'Step 2: Listen again' }, { num: 2, motivo: 'tarea_no_marcada', kind: 'dnd', leccion: 'Lesson 6: Career', step: 'Step 2: Listen again' },
    { num: 3, motivo: 'atascado_en_el_mismo_lugar', kind: 'test_start', leccion: 'Lesson 5: Sports 2', step: 'Step 3: Test' }];
  const cat = { lugares: { 'U10|Lesson 6: Career|Step 2: Listen again|T1': { estado: 'falla', fallas: ['corridaVieja', 'c2'] } }, firmas: { a: { kind: 'dnd', primera: '2026-11-03T10:00:00Z' }, b: { kind: 'mcq', primera: '2026-10-01T00:00:00Z' } } };
  const g = D.agrupar(reps, cat, 'c2');
  assert.strictEqual(g[0].tipo, 'tarea_no_marcada · dnd'); assert.strictEqual(g[0].veces, 2); assert.strictEqual(g[0].conocido, true, 'ya fallaba en otra corrida');
  assert.strictEqual(g[1].conocido, false, 'nuevo');
  const tab = { pasos: { a: { u: 1, tareas: { 1: 'ok', 2: 'ok', 3: 'falla' }, desde: '2026-11-03T10:00:00Z', hora: '2026-11-03T10:30:00Z' }, b: { u: 2, test: 100, tareas: {}, desde: '2026-11-03T10:40:00Z', hora: '2026-11-03T10:45:00Z' } } };
  assert.strictEqual(D.salud(tab, reps), 73, 'salud: 3 de 4 bien, menos 2 por el atasco');
  assert.deepStrictEqual(D.tiempos(tab), [{ unidad: 1, minutos: 30 }, { unidad: 2, minutos: 5 }]);
  assert.deepStrictEqual(D.nuevas(cat, '2026-11-03T09:00:00Z').map(x => x.firma), ['a']);
  assert.ok(/UN DUMP POR GRUPO/.test(D.paraIA({ nombre: 'X', curso: 'C', version: '21.16', grupos: g, reportes: reps, salud: 73, widgets: {} })));
  console.log('✓ diagnóstico (agrupar, nuevo/conocido, salud, tiempos, pantallas nuevas, texto para la IA): OK');
}
