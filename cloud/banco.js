/* =====================================================================
   cloud/banco.js — BANCO DE RESPUESTAS por curso, compartido entre TODAS las cuentas (NUEVO v21.13)
   ---------------------------------------------------------------------
   Idea de Hugo (02/11): las cuentas se dividen por curso (UPB Beginners 1/2, Intermediate 1/2, High Intermediate
   1/2, Advanced 1/2...). Si una cuenta ya cosechó las respuestas de un test, las otras cuentas del MISMO curso no
   necesitan cosechar: entran al test con las respuestas y sacan 100 a la primera.
   - Se guarda en la memoria PRIVADA de GitHub Actions (caché), NUNCA en el repo (el repo es público).
   - Un archivo por curso: banco/<curso>.json = { curso, actualizado, answers, testAns, known } (las mismas claves
     que usa el bot: ed:answers:v1, ed:testAns:v2, ed:testKnown:v1).
   - Lo de la cuenta MANDA (es su cosecha más reciente); del banco solo se agrega lo que le falta (tests enteros o
     preguntas sueltas). Si una respuesta del banco no sirviera, el bot hace lo de siempre: review → cosecha → 100.
   - Al final de cada corrida el job "juntar" mezcla los bancos de todas las cuentas; la corrida SIGUIENTE ya los
     usa (las cuentas que corren al mismo tiempo no se pasan respuestas entre sí).
       node cloud/banco.js juntar <carpeta-con-bancos-de-esta-corrida> <carpeta-banco>
   ===================================================================== */
'use strict';
const fs = require('fs'), path = require('path');

const K = { answers: 'ed:answers:v1', testAns: 'ed:testAns:v2', known: 'ed:testKnown:v1', aprendido: 'ed:aprendido:v1', catalogo: 'ed:catalogo:v1' };   // AJUSTADA v21.16: + aprendido, catálogo
const slug = c => String(c || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const parse = (s, def) => { try { const v = typeof s === 'string' ? JSON.parse(s) : s; return v == null ? def : v; } catch (e) { return def; } };
const vacio = curso => ({ curso: curso || null, actualizado: null, answers: {}, testAns: {}, known: [], aprendido: {}, catalogo: { lugares: {}, firmas: {} } });
const tieneRespuestas = (b, k) => !!(b.testAns && b.testAns[k] && Object.keys(b.testAns[k]).length);
const contar = b => Object.keys((b && b.testAns) || {}).filter(k => tieneRespuestas(b, k)).length;

// a MANDA; de b se agrega solo lo que a no tiene (tests enteros o preguntas sueltas)
function mezclar(a, b) {
  a = Object.assign(vacio(), a || {}); b = Object.assign(vacio(), b || {});
  const r = { curso: a.curso || b.curso, actualizado: new Date().toISOString(), answers: Object.assign({}, b.answers, a.answers), testAns: {}, known: [] };
  // AJUSTADA v21.17 — CONFIANZA: un test que en b sacó 100 % (y en a no) usa las respuestas de b (dieron 100 de verdad)
  const ba = new Set(a.buenos || []), bb = new Set(b.buenos || []);
  for (const k of new Set([...Object.keys(b.testAns || {}), ...Object.keys(a.testAns || {})])) {
    const orden = bb.has(k) && !ba.has(k) ? [a.testAns, b.testAns] : [b.testAns, a.testAns];
    for (const src of orden) if (src && src[k]) r.testAns[k] = Object.assign(r.testAns[k] || {}, src[k]);
  }
  r.buenos = [...new Set([...ba, ...bb])];
  // "known" de b solo si b trae respuestas de ese test (un "known" sin respuestas haría un replay a ciegas)
  r.known = [...new Set([...(a.known || []), ...(b.known || []).filter(k => tieneRespuestas(b, k))])];
  // NUEVO v21.16: lo que aprendió el Explorador (qué acción marca cada tipo de pantalla); lo de a manda
  r.aprendido = Object.assign({}, b.aprendido || {}, a.aprendido || {});
  // NUEVO v21.16: catálogo del nivel. Por lugar manda a, salvo que en b se marcó y en a no; por tipo de pantalla manda
  // a, pero se conserva el dump de ejemplo de cualquiera de los dos
  const ca = (a.catalogo || {}), cb = (b.catalogo || {});
  r.catalogo = { lugares: {}, firmas: {} };
  for (const k of new Set([...Object.keys(cb.lugares || {}), ...Object.keys(ca.lugares || {})])) {
    const x = (ca.lugares || {})[k], y = (cb.lugares || {})[k];
    r.catalogo.lugares[k] = x && (x.estado === 'ok' || !y || y.estado !== 'ok') ? x : y;
  }
  for (const k of new Set([...Object.keys(cb.firmas || {}), ...Object.keys(ca.firmas || {})])) {
    const x = (ca.firmas || {})[k], y = (cb.firmas || {})[k];
    r.catalogo.firmas[k] = Object.assign({}, y || {}, x || {}, { ejemplo: (x && x.ejemplo) || (y && y.ejemplo) || undefined });
  }
  return r;
}
const desdeLocal = (datos, curso) => ({ answers: parse(datos[K.answers], {}), testAns: parse(datos[K.testAns], {}), known: parse(datos[K.known], []), aprendido: parse(datos[K.aprendido], {}),
  buenos: Object.entries(parse(datos['ed:testScores:v1'], {})).filter(([, v]) => v === 100).map(([k]) => k),   // NUEVO v21.17: tests que dieron 100
  catalogo: (curso && parse(datos[K.catalogo], {})[curso]) || { lugares: {}, firmas: {} } });   // AJUSTADA v21.16: + catálogo de ESE curso
function leer(dir, curso) {
  const f = path.join(dir, slug(curso) + '.json');
  return fs.existsSync(f) ? Object.assign(vacio(curso), parse(fs.readFileSync(f, 'utf8'), {}), { curso }) : vacio(curso);
}
function escribir(dir, b) {
  if (!b || !slug(b.curso)) return null;
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, slug(b.curso) + '.json');
  fs.writeFileSync(f, JSON.stringify(b));
  return f;
}
module.exports = { K, slug, vacio, mezclar, desdeLocal, leer, escribir, contar };

// node cloud/banco.js juntar <entrada> <salida>: los bancos de esta corrida (más nuevos) mandan sobre el de la caché
if (require.main === module && process.argv[2] === 'juntar') {
  const [entrada, salida] = process.argv.slice(3);
  const archivos = [];
  const recorrer = d => { if (!fs.existsSync(d)) return; for (const x of fs.readdirSync(d)) { const p = path.join(d, x); if (fs.statSync(p).isDirectory()) recorrer(p); else if (x.endsWith('.json')) archivos.push(p); } };
  recorrer(entrada);
  const porCurso = {};
  for (const f of archivos) { const b = parse(fs.readFileSync(f, 'utf8'), null); if (b && slug(b.curso)) (porCurso[slug(b.curso)] = porCurso[slug(b.curso)] || []).push(b); }
  for (const lista of Object.values(porCurso)) {
    let acc = leer(salida, lista[0].curso);
    const antes = contar(acc);
    for (const b of lista) acc = mezclar(b, acc);
    escribir(salida, acc);
    console.log(`📚 ${acc.curso}: ${antes} → ${contar(acc)} tests con respuestas (${lista.length} cuenta/s)`);
  }
  if (!archivos.length) console.log('📚 Ninguna cuenta dejó banco en esta corrida (queda el anterior).');
  // la caché no guarda carpetas inexistentes: que siempre haya algo
  fs.mkdirSync(salida, { recursive: true });
  if (!fs.readdirSync(salida).length) fs.writeFileSync(path.join(salida, 'LEEME.txt'), 'Banco de respuestas por curso (lo llena la nube).\n');
}
