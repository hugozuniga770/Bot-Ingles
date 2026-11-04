/* =====================================================================
   cloud/baul.js — el BAÚL: lo que el bot aprendió vive DENTRO de tu proyecto, cifrado, para siempre (NUEVO v21.19)
   ---------------------------------------------------------------------
   Hugo (04/11): "lo único que se guarda no es de cada persona, sino los tipos de ejercicios, cómo los hizo y cómo
   hacerlos la próxima vez, y las respuestas de los tests, para que vivan directo en mi proyecto y se actualicen según
   pase el tiempo ... un servicio para mucho tiempo".
   Antes el banco vivía SOLO en la caché de GitHub Actions, que GitHub borra si pasan 7 días sin usarla.
   Ahora, además, el job "juntar" lo guarda en la rama `datos` del repo, en UN archivo (baul.bin):
     • qué guarda: el banco de cada curso = respuestas de los tests, qué tests ya dieron 100, el catálogo del nivel
       (qué ejercicio hay en cada paso y cómo se marcó) y lo que aprendió el Explorador. NADA de cada persona
       (ni usuarios, ni contraseñas, ni nombres, ni sus porcentajes).
     • cifrado: AES-256-GCM con la llave del secret ED_BAUL_LLAVE (el panel la crea solo la primera vez que lo abres).
       El repo es público: sin esa llave el archivo es ruido.
     • la rama `datos` tiene UN solo commit (se reemplaza cada vez): el repo no crece con el tiempo.
     • si dos corridas terminan a la vez, la segunda vuelve a leer, mezcla y guarda (nadie pisa a nadie).
       node cloud/baul.js abrir   <baul.bin> <carpeta-banco>   → mezcla lo del baúl en banco/ (lo de la caché manda)
       node cloud/baul.js cerrar  <carpeta-banco> <baul.bin>   → cifra todo banco/ en baul.bin
   ===================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const Banco = require('./banco');
const MAGIA = Buffer.from('EDBAUL1');

function llave() {
  const k = String(process.env.ED_BAUL_LLAVE || '').trim();
  if (!k) return null;
  return crypto.createHash('sha256').update(k).digest();   // cualquier texto largo sirve de llave (el panel pone 32 bytes al azar)
}
function cifrar(obj, k) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const datos = Buffer.concat([c.update(zlib.gzipSync(Buffer.from(JSON.stringify(obj)), { level: 9 })), c.final()]);
  return Buffer.concat([MAGIA, iv, c.getAuthTag(), datos]);
}
function descifrar(buf, k) {
  if (!buf || buf.length < MAGIA.length + 28 || !buf.subarray(0, MAGIA.length).equals(MAGIA)) throw new Error('no es un baúl');
  const iv = buf.subarray(7, 19), tag = buf.subarray(19, 35), d = crypto.createDecipheriv('aes-256-gcm', k, iv);
  d.setAuthTag(tag);
  return JSON.parse(zlib.gunzipSync(Buffer.concat([d.update(buf.subarray(35)), d.final()])).toString('utf8'));
}
// { version, actualizado, cursos: { <slug>: banco } }
function leerCarpeta(dir) {
  const cursos = {};
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
    try { const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); if (b && Banco.slug(b.curso)) cursos[Banco.slug(b.curso)] = b; } catch (e) {}
  }
  return cursos;
}
module.exports = { cifrar, descifrar, leerCarpeta };

if (require.main === module) {
  const [cmd, a, b] = process.argv.slice(2), k = llave();
  if (!k) { console.log('::warning::Falta el secret ED_BAUL_LLAVE → el banco vive solo en la caché (GitHub la borra tras 7 días sin correr). Abre el panel del teléfono una vez y se crea solo.'); process.exit(0); }
  if (cmd === 'abrir') {
    if (!fs.existsSync(a)) { console.log('🧳 Baúl: todavía vacío (se llena al final de esta corrida).'); process.exit(0); }
    let baul;
    try { baul = descifrar(fs.readFileSync(a), k); } catch (e) { console.log('::warning::No pude abrir el baúl (' + e.message + '). ¿Cambiaste ED_BAUL_LLAVE? Sigo con la caché.'); process.exit(0); }
    const actual = leerCarpeta(b); let n = 0;
    for (const [s, bb] of Object.entries(baul.cursos || {})) {
      const m = actual[s] ? Banco.mezclar(actual[s], bb) : Object.assign(Banco.vacio(bb.curso), bb);
      m.curso = bb.curso; Banco.escribir(b, m); n++;
      console.log(`🧳 Baúl → ${bb.curso}: ${Banco.contar(bb)} tests con respuestas, ${Object.keys((bb.catalogo || {}).lugares || {}).length} lugares en el catálogo`);
    }
    console.log(`🧳 Baúl abierto: ${n} curso(s) (guardado ${baul.actualizado || '?'}).`);
  } else if (cmd === 'cerrar') {
    const cursos = leerCarpeta(a);
    if (!Object.keys(cursos).length) { console.log('🧳 Nada que guardar en el baúl.'); process.exit(0); }
    const buf = cifrar({ version: 1, actualizado: new Date().toISOString(), cursos }, k);
    fs.writeFileSync(b, buf);
    console.log(`🧳 Baúl cerrado: ${Object.keys(cursos).length} curso(s), ${(buf.length / 1024).toFixed(0)} KB cifrados.`);
    if (buf.length > 60 * 1024 * 1024) console.log('::warning::El baúl pasa de 60 MB (GitHub acepta hasta 100 MB por archivo).');
  } else { console.log('uso: node cloud/baul.js abrir|cerrar ...'); process.exit(1); }
}
