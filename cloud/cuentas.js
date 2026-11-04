/* =====================================================================
   cloud/cuentas.js — lee las cuentas de los secrets (NUNCA del código)
   ---------------------------------------------------------------------
   Dos formas (se pueden usar las dos a la vez):
   1) Secret ED_CUENTAS (la de siempre): una cuenta por línea →  usuario contraseña Nombre
      En "cuentas" se las nombra por su NÚMERO de línea: 1 · 2,3 · todas.
   2) NUEVO v21.16 — un secret POR CUENTA: ED_CUENTA_<APODO> (p. ej. ED_CUENTA_NORE) con UNA línea igual:
      usuario contraseña Nombre. Se nombra por su apodo: NORE · NORE,ROY · todas. Así el panel del teléfono
      (panel/) puede AGREGAR o QUITAR una cuenta sin tocar las demás, y cada cuenta corre en su propia corrida.
   El "Nombre" es opcional: es solo una etiqueta para el resumen (no se muestra usuario ni contraseña).
   También se aceptan  usuario:contraseña  o  usuario,contraseña.
   Si no hay ninguna, se usan los secrets viejos ED_USER_1 / ED_PASS_1 (cuenta 1).
     node cloud/cuentas.js lista    → (job "preparar") qué cuentas correr según el campo "cuentas"
   SEGURIDAD: de los secrets ED_CUENTA_* aquí solo se miran los NOMBRES (nunca se imprime un valor).
   ===================================================================== */
'use strict';
// NUEVO v21.19 — ARCHIVO (Hugo, 04/11: "cuando elimino de mi pantalla deben archivarse ... correr todas menos los
// archivados"): una línea que empieza con "archivada" sigue en ED_CUENTAS con su contraseña y su NÚMERO, pero "todas"
// la salta (pedida por su número, sí corre). "borrada" = línea vacía que solo guarda el lugar (nadie cambia de número).
const RE_ARCH = /^archivad[ao]$/i, RE_BORR = /^borrad[ao]$/i;
function leerCuentas(texto) {
  return String(texto || '').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).map((l, i) => {
    let p = l.split(/[\s:,;]+/).filter(Boolean), archivada = false;
    if (p[0] && RE_ARCH.test(p[0])) { archivada = true; p = p.slice(1); }
    return { n: i + 1, user: p[0] || '', pass: p[1] || '', nombre: p.slice(2).join(' ') || `cuenta ${i + 1}`, archivada };
  }).filter(c => c.user && c.pass && !RE_BORR.test(c.user));
}
// AJUSTADA v21.19 — se elige por las líneas que EXISTEN (antes: por CUÁNTAS cuentas había). Hugo (04/11): "cuando corría
// nuevos usuarios salían fallidos, no encontrados". Con líneas "borrada", "todas" corría las borradas (→ fallidas) y la
// cuenta nueva del final quedaba fuera ("la 8 no existe" si había 5 válidas). Acepta la lista de leerCuentas (o un total).
function elegir(cuentas, campo, apodos = []) {
  const lista = typeof cuentas === 'number' ? [...Array(cuentas).keys()].map(i => ({ n: i + 1 })) : (cuentas || []);
  const existen = new Set(lista.map(c => c.n));
  const sel = String(campo || 'todas').trim().toLowerCase();
  if (!sel || sel === 'todas' || sel === 'all') return [...lista.filter(c => !c.archivada).map(c => c.n), ...apodos];
  const pedidos = sel.split(/[\s,;]+/).filter(Boolean);
  const nums = pedidos.map(Number).filter(x => Number.isInteger(x) && existen.has(x));
  const aps = pedidos.map(p => p.toUpperCase()).filter(p => apodos.includes(p));
  return [...new Set([...nums, ...aps])];
}
// NUEVO v21.19 — lo pedido que NO existe (para decirlo claro en vez de "fallida")
function faltantes(cuentas, campo, apodos = []) {
  const sel = String(campo || 'todas').trim().toLowerCase(); if (!sel || sel === 'todas' || sel === 'all') return [];
  const ok = new Set(elegir(cuentas, campo, apodos).map(x => String(x).toUpperCase()));
  return sel.split(/[\s,;]+/).filter(Boolean).map(x => x.toUpperCase()).filter(x => !ok.has(x));
}
const huellaDe = u => require('crypto').createHash('sha256').update(String(u || '').toLowerCase()).digest('hex').slice(0, 12);
// NUEVO v21.16 — apodos de los secrets ED_CUENTA_<APODO>. `nombres` = lista de nombres de secrets (o un objeto
// {NOMBRE: valor}: solo se usan las claves)
const RE_APODO = /^ED_CUENTA_([A-Z0-9_]{1,40})$/;
function apodosDe(nombres) {
  const lista = Array.isArray(nombres) ? nombres : Object.keys(nombres || {});
  return [...new Set(lista.map(n => (String(n).toUpperCase().match(RE_APODO) || [])[1]).filter(Boolean))].sort();
}
module.exports = { leerCuentas, elegir, faltantes, huellaDe, apodosDe, RE_APODO };

// NUEVO v21.16 — grupos de hasta `porMaquina` cuentas (cada grupo = UNA máquina de GitHub con varios Chrome a la vez).
// GitHub gratis deja 20 máquinas al mismo tiempo: con 3 por máquina, 40 cuentas ocupan 14 y no hay cola.
function agrupar(lista, porMaquina) {
  const k = Math.max(1, Math.min(4, +porMaquina || 3)), out = [];
  for (let i = 0; i < lista.length; i += k) {
    const g = lista.slice(i, i + k).map(String), o = { nombre: g.join(',') };
    for (let j = 0; j < 4; j++) o['c' + (j + 1)] = g[j] || '';
    out.push(o);
  }
  return out;
}
// NUEVO v21.16 — ¿qué cuentas ya están corriendo en OTRA corrida? (así no se abre la misma cuenta dos veces y no hay
// que esperar: la que ya corre se salta). Los jobs se llaman "correr 1,2,NORE"; si el tablero de esa cuenta dice
// estado:fin / estado:parado para esa corrida, la cuenta ya está libre aunque las otras del grupo sigan.
async function corriendoEnOtras({ token, repo, api = 'https://api.github.com', runId, issue }) {
  if (!token || !repo) return new Set();
  const get = async u => { const r = await fetch(api + u, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }); if (!r.ok) throw new Error(u + ' → ' + r.status); return r.json(); };
  const ocupadas = new Map();   // cuenta → run
  for (const st of ['in_progress', 'queued']) {
    const runs = (await get(`/repos/${repo}/actions/runs?status=${st}&per_page=50`)).workflow_runs || [];
    for (const r of runs.filter(r => r.name === 'nube' && String(r.id) !== String(runId))) {
      const jobs = (await get(`/repos/${repo}/actions/runs/${r.id}/jobs?per_page=100`)).jobs || [];
      for (const j of jobs) { const m = /^correr\s+(.+)$/.exec(j.name || ''); if (m && j.status !== 'completed') for (const c of m[1].split(',').map(x => x.trim().toUpperCase()).filter(Boolean)) ocupadas.set(c, String(r.id)); }
    }
  }
  if (ocupadas.size && issue) {
    try {
      const cs = await get(`/repos/${repo}/issues/${issue}/comments?per_page=100`);
      for (const c of cs) { const m = /<!-- estado:(fin|parado) run:(\d*) cuenta:([^ ]+) -->/.exec(c.body || ''); if (m && ocupadas.get(m[3].toUpperCase()) === m[2]) ocupadas.delete(m[3].toUpperCase()); }
    } catch (e) {}
  }
  return new Set(ocupadas.keys());
}
// NUEVO v21.19 — LIMPIAR EL TABLERO (Hugo, 04/11: "los registros se mantienen ... deberían eliminarse cuando elimino el
// usuario"). Aquí SÍ se conoce ED_CUENTAS de verdad: se borran del issue los cuadros de cuentas archivadas, borradas,
// que ya no existen, o cuya línea ahora es OTRA persona (huella distinta). Nunca el de una cuenta corriendo ahora.
async function limpiarTablero({ token, repo, api = 'https://api.github.com', issue, cuentas, apodos = [], log = console.log }) {
  if (!token || !repo || !issue) return 0;
  const H = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const r = await fetch(`${api}/repos/${repo}/issues/${issue}/comments?per_page=100`, { headers: H }); if (!r.ok) return 0;
  const porN = new Map(cuentas.map(c => [String(c.n), c])), aps = new Set(apodos.map(a => String(a).toUpperCase()));
  let n = 0;
  for (const c of await r.json()) {
    const b = c.body || '';
    const m = /<!-- datos:([A-Za-z0-9+/=]+) -->/.exec(b), mk = /<!-- tablero-cuenta-([A-Za-z0-9_]+) -->/.exec(b);
    if (!m && !mk) continue;
    let d = null; if (m) { try { d = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8')); } catch (e) {} }
    const id = String((d && d.cuenta) || (mk && mk[1]) || '').toUpperCase(); if (!id) continue;
    if (d && d.estado === 'corriendo' && Date.now() - Date.parse(d.hora) < 15 * 60000) continue;
    const linea = porN.get(id);
    const motivo = /^\d+$/.test(id) ? (!linea ? 'ya no existe' : linea.archivada ? 'archivada' : d && d.huella && d.huella !== huellaDe(linea.user) ? 'la línea ahora es otra persona' : null)
      : (!aps.has(id) ? 'ya no existe' : null);
    if (!motivo) continue;
    const del = await fetch(`${api}/repos/${repo}/issues/comments/${c.id}`, { method: 'DELETE', headers: H });
    if (del.ok || del.status === 204) { n++; log(`🧹 Tablero: quito el cuadro de la cuenta ${id}${d && d.nombre ? ' (' + d.nombre + ')' : ''} — ${motivo}`); }
  }
  return n;
}
module.exports.agrupar = agrupar; module.exports.corriendoEnOtras = corriendoEnOtras; module.exports.limpiarTablero = limpiarTablero;

if (require.main === module && process.argv[2] === 'lista') {
  const cuentas = leerCuentas(process.env.ED_CUENTAS);
  let apodos = [];
  try { apodos = apodosDe(JSON.parse(process.env.SECRETOS || '{}')); } catch (e) {}   // solo los NOMBRES
  const base = cuentas.length ? cuentas : (!apodos.length && process.env.HAY_USER_1 === 'true' ? 1 : []);
  const lista = elegir(base, process.env.ELEGIDAS, apodos);
  // NUEVO v21.19: lo pedido que no existe se dice CLARO (antes salía "fallida" sin explicar por qué)
  const nohay = faltantes(base, process.env.ELEGIDAS, apodos);
  if (nohay.length) console.log(`::warning::No existen en ED_CUENTAS: ${nohay.join(', ')} (líneas válidas: ${cuentas.map(c => c.n + (c.archivada ? '📦' : '')).join(', ') || '—'}). Si cambiaste el secret a mano, pega la misma lista en el panel (⚙ Ajustes).`);
  if (!lista.length) { console.log('::error::No hay cuentas para correr. Revisa el secret ED_CUENTAS (una cuenta por línea: usuario contraseña Nombre), los secrets ED_CUENTA_<APODO> o el campo "cuentas".'); process.exit(1); }
  const arch = cuentas.filter(c => c.archivada).length;
  console.log(`Cuentas: ${cuentas.length - arch} activas${arch ? ` + ${arch} archivada(s) 📦` : ''} en ED_CUENTAS (líneas ${cuentas.map(c => c.n).join(', ') || '—'}) + ${apodos.length} sueltas (${apodos.join(', ') || '—'}) · se corren: ${lista.join(', ')}`);
  (async () => {
    try { await limpiarTablero({ token: process.env.GH_TOKEN, repo: process.env.GITHUB_REPOSITORY, api: process.env.GITHUB_API_URL || 'https://api.github.com', issue: process.env.TABLERO_ISSUE, cuentas, apodos }); } catch (e) {}   // NUEVO v21.19
    let ocupadas = new Set();
    try { ocupadas = await corriendoEnOtras({ token: process.env.GH_TOKEN, repo: process.env.GITHUB_REPOSITORY, api: process.env.GITHUB_API_URL || 'https://api.github.com', runId: process.env.GITHUB_RUN_ID, issue: process.env.TABLERO_ISSUE }); }
    catch (e) { console.log('::warning::No pude ver qué cuentas ya corren (' + e.message + '); corro todas las pedidas.'); }
    // AJUSTADA v21.16 (Hugo: "no importa cuántas veces entre a esa cuenta, capaz es para que complete lo que faltó"):
    // una cuenta que YA corre en otra corrida NO se salta: esta corrida la REEMPLAZA (cloud/lote.js le pide a la otra
    // que la pare, espera a que se libere y recién entra → nunca dos sesiones de la misma cuenta a la vez).
    const libres = lista;
    const saltadas = lista.filter(c => ocupadas.has(String(c).toUpperCase()));
    if (saltadas.length) console.log(`::notice::Ya corren en otra corrida y esta las reemplaza (la otra las para primero): ${saltadas.join(', ')}`);
    const grupos = agrupar(libres, process.env.POR_MAQUINA);
    const cada = libres.length <= 6 ? 3 : libres.length <= 15 ? 5 : 8;   // minutos entre actualizaciones del tablero
    console.log(`Se corren ${libres.length} cuenta(s) en ${grupos.length} máquina(s): ${grupos.map(g => '[' + g.nombre + ']').join(' ') || '—'}`);
    if (process.env.GITHUB_OUTPUT) require('fs').appendFileSync(process.env.GITHUB_OUTPUT, 'lista=' + JSON.stringify(libres) + '\ngrupos=' + JSON.stringify(grupos) + '\nhay=' + (grupos.length ? 'si' : 'no') + '\ncada=' + cada + '\n');
  })();
}

