/* =====================================================================
   cloud/lote.js — VARIAS cuentas en la MISMA máquina de GitHub, a la vez (NUEVO v21.16)
   ---------------------------------------------------------------------
   Hugo (03/11): "hay veces que voy a querer correr hasta 40 cuentas de una sola vez ... ir añadiendo desde el
   teléfono una y otra sin esperar la cola". GitHub gratis deja 20 máquinas a la vez; cada máquina (4 núcleos,
   16 GB) aguanta bien 3 Chrome. Este programa arranca un cloud/runner.js por cuenta (cada uno con su carpeta
   salida/<cuenta>/ y su banco banco-salida/<cuenta>/), espaciados 20 s para no entrar todos juntos al login.
   PARAR UNA cuenta sin tocar las demás: el panel del teléfono deja en el issue del tablero un comentario
   "<!-- orden:parar NORE -->"; aquí se mira cada 2 min y a esa cuenta se le manda SIGTERM → guarda todo, publica
   su tablero final y termina; las demás siguen. (El comentario de la orden se borra después.)
     CUENTAS_LOTE="1,2,NORE" node cloud/lote.js     (las variables de cada cuenta: ver nube.yml)
   ===================================================================== */
'use strict';
const { spawn } = require('child_process');
const path = require('path');
const ids = String(process.env.CUENTAS_LOTE || '').split(',').map(s => s.trim()).filter(Boolean);
const RAIZ = path.join(__dirname, '..');
const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const t0 = new Date();
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}] [lote]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!ids.length) { log('No hay cuentas en este grupo.'); process.exit(0); }

const RUN = process.env.GITHUB_RUN_ID || 'local';
const H = () => ({ Authorization: 'Bearer ' + process.env.GH_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
const hijos = new Map();   // cuenta → { proc, codigo }
// NUEVO v21.16 — si la cuenta YA corre en otra corrida, esta la reemplaza: se le pide a la otra que la pare (orden en el
// issue del tablero) y se espera a que quede libre (máx. 6 min); así nunca hay dos sesiones de la misma cuenta.
async function liberar(id) {
  const { corriendoEnOtras } = require('./cuentas');
  const repo = process.env.GITHUB_REPOSITORY, issue = process.env.TABLERO_ISSUE;
  if (!process.env.GH_TOKEN || !repo) return;
  const ocupada = async () => { try { return (await corriendoEnOtras({ token: process.env.GH_TOKEN, repo, api: API, runId: RUN, issue })).has(id.toUpperCase()); } catch (e) { return false; } };
  if (!(await ocupada())) return;
  log(`🔁 La cuenta ${id} ya corre en otra corrida → le pido que pare y entro yo (para completar lo que falte)`);
  if (issue) { try { await fetch(`${API}/repos/${repo}/issues/${issue}/comments`, { method: 'POST', headers: H(), body: JSON.stringify({ body: `<!-- orden:parar ${id} de:${RUN} -->\n⏹ La corrida ${RUN} toma la cuenta ${id} (la anterior la deja).` }) }); } catch (e) {} }
  const t = Date.now();
  while (Date.now() - t < 6 * 60000) { await sleep(30000); if (!(await ocupada())) { log(`✅ La cuenta ${id} quedó libre`); return; } }
  log(`⚠ La cuenta ${id} sigue ocupada tras 6 min → entro igual (ED cerrará la otra sesión)`);
}
function arrancar(id, k) {
  // cada slot trae su secret: ED_CUENTA_S<k> (secret ED_CUENTA_<APODO>) / ED_USER_S<k> / ED_PASS_S<k> (los viejos)
  const env = Object.assign({}, process.env, {
    CUENTA: id, SALIDA: path.join(RAIZ, 'salida', id), BANCO_SALIDA: path.join(RAIZ, 'banco-salida', id),
    ED_CUENTA: process.env['ED_CUENTA_S' + k] || '', ED_USER: process.env['ED_USER_S' + k] || '', ED_PASS: process.env['ED_PASS_S' + k] || ''
  });
  for (const x of [1, 2, 3, 4]) { delete env['ED_CUENTA_S' + x]; delete env['ED_USER_S' + x]; delete env['ED_PASS_S' + x]; }   // cada cuenta ve SOLO lo suyo
  const proc = spawn(process.execPath, [path.join(__dirname, 'runner.js')], { env, stdio: 'inherit' });
  const h = { proc, codigo: null, parada: false };
  proc.on('exit', c => { h.codigo = c == null ? 1 : c; log(`cuenta ${id} terminó (código ${h.codigo})${h.parada ? ' — parada desde el panel' : ''}`); });
  hijos.set(id.toUpperCase(), h);
}

async function ordenes() {
  const token = process.env.GH_TOKEN, repo = process.env.GITHUB_REPOSITORY, issue = process.env.TABLERO_ISSUE;
  if (!token || !repo || !issue) return;
  let cs = [];
  try { const r = await fetch(`${API}/repos/${repo}/issues/${issue}/comments?since=${t0.toISOString()}&per_page=100`, { headers: H() }); if (r.ok) cs = await r.json(); } catch (e) { return; }
  for (const c of cs) {
    const m = /^<!-- orden:parar ([A-Za-z0-9_,]+)(?: de:(\w+))? -->/.exec(c.body || '');
    if (!m || new Date(c.created_at) < t0 || m[2] === RUN) continue;   // las órdenes de ESTA corrida no son para mí
    for (const id of m[1].split(',').map(x => x.toUpperCase())) {
      const h = hijos.get(id);
      if (h && h.codigo == null && !h.parada) { h.parada = true; log(`⏹ El panel pidió parar la cuenta ${id}`); try { h.proc.kill('SIGTERM'); } catch (e) {} }
    }
    // la orden se borra solo si TODAS sus cuentas son de este grupo y ya pararon (si no, otro grupo todavía la necesita)
    const todas = m[1].split(',').map(x => x.toUpperCase());
    if (todas.every(id => hijos.has(id) && hijos.get(id).parada)) { try { await fetch(`${API}/repos/${repo}/issues/comments/${c.id}`, { method: 'DELETE', headers: H() }); } catch (e) {} }
  }
}

(async () => {
  log(`Grupo de ${ids.length} cuenta(s) en esta máquina: ${ids.join(', ')}`);
  for (let k = 0; k < ids.length; k++) { if (k) await sleep(20000); await liberar(ids[k]); arrancar(ids[k], k + 1); }
  let n = 0;
  while ([...hijos.values()].some(h => h.codigo == null)) {
    await sleep(10000); n++;
    if (n % 12 === 0) await ordenes();   // cada 2 min
  }
  const bien = [...hijos.values()].filter(h => h.codigo === 0 || h.parada).length;
  log(`Listo: ${bien} de ${ids.length} cuenta(s) terminaron bien.`);
  if (!bien) process.exit(1);
  if (bien < ids.length) console.log(`::warning::${ids.length - bien} cuenta(s) de este grupo terminaron con error (mira su zip cuenta-<n>).`);
})();
