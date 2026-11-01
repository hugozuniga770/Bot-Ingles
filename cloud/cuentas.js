/* =====================================================================
   cloud/cuentas.js — lee las cuentas del secret ED_CUENTAS (NUNCA del código)
   ---------------------------------------------------------------------
   Formato del secret (una cuenta por línea; las líneas que empiezan con # se ignoran):
       usuario contraseña Nombre
   El "Nombre" es opcional: es solo una etiqueta para el resumen (no se muestra usuario ni contraseña).
   También se aceptan  usuario:contraseña  o  usuario,contraseña.
   Si ED_CUENTAS está vacío, se usan los secrets viejos ED_USER_1 / ED_PASS_1 (cuenta 1).
     node cloud/cuentas.js lista    → (job "preparar") qué números correr según el campo "cuentas"
   ===================================================================== */
'use strict';
function leerCuentas(texto) {
  return String(texto || '').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).map((l, i) => {
    const p = l.split(/[\s:,;]+/).filter(Boolean);
    return { n: i + 1, user: p[0] || '', pass: p[1] || '', nombre: p.slice(2).join(' ') || `cuenta ${i + 1}` };
  }).filter(c => c.user && c.pass);
}
function elegir(total, campo) {
  const sel = String(campo || 'todas').trim().toLowerCase();
  if (!sel || sel === 'todas' || sel === 'all') return [...Array(total).keys()].map(i => i + 1);
  return [...new Set(sel.split(/[\s,;]+/).map(Number).filter(x => Number.isInteger(x) && x >= 1 && x <= total))];
}
module.exports = { leerCuentas, elegir };

if (require.main === module && process.argv[2] === 'lista') {
  const cuentas = leerCuentas(process.env.ED_CUENTAS);
  const total = cuentas.length || (process.env.HAY_USER_1 === 'true' ? 1 : 0);
  const lista = elegir(total, process.env.ELEGIDAS);
  if (!lista.length) { console.log('::error::No hay cuentas para correr. Revisa el secret ED_CUENTAS (una cuenta por línea: usuario contraseña Nombre) o el campo "cuentas".'); process.exit(1); }
  console.log(`Cuentas en el secret: ${total} · se van a correr: ${lista.join(', ')}`);
  if (process.env.GITHUB_OUTPUT) require('fs').appendFileSync(process.env.GITHUB_OUTPUT, 'lista=' + JSON.stringify(lista) + '\n');
}
