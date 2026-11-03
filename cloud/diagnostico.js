/* =====================================================================
   cloud/diagnostico.js — REPORTES Y DIAGNÓSTICO de una corrida (NUEVO v21.16, ideas 18–28 de Hugo)
   ---------------------------------------------------------------------
   Funciones puras (sin navegador) que usa cloud/runner.js al final de cada cuenta:
     agrupar(reportes, catalogo)  → fallos agrupados por tipo (motivo + ejercicio), con conteo, unidades/lecciones y
                                    si cada grupo es NUEVO o YA CONOCIDO de corridas anteriores (#18, #19)
     salud(tablero, reportes)     → puntaje de salud 0–100 de la corrida (#20)
     tiempos(tablero)             → minutos por unidad: dónde se pierde más tiempo (#22, #25)
     nuevas(catalogo, desde)      → pantallas (tipos de ejercicio) que el bot vio por PRIMERA vez (#26)
     paraIA(...)                  → texto corto listo para pegarle a la IA: un dump por grupo, no 40 (#23)
   Lo prueba tools/probar-banco-tablero.js.
   ===================================================================== */
'use strict';
const clave = r => `${r.motivo}${r.kind ? ' · ' + r.kind : ''}`;
const sinU = l => String(l || '').replace(/^U\d+\|/, '');

function agrupar(reportes, catalogo, corrida) {
  const lugares = (catalogo && catalogo.lugares) || {};
  const g = new Map();
  for (const r of reportes || []) {
    const k = clave(r);
    const e = g.get(k) || { tipo: k, motivo: r.motivo, kind: r.kind || null, veces: 0, donde: [], nums: [], conocido: false };
    e.veces++; if (r.num) e.nums.push(r.num);
    const d = [r.leccion, r.step].filter(Boolean).join(' · ');
    if (d && !e.donde.includes(d) && e.donde.length < 6) e.donde.push(d);
    // ¿ya había fallado en una corrida ANTERIOR en ese mismo lugar? (catálogo del nivel)
    const lu = Object.entries(lugares).find(([key]) => sinU(key).startsWith([r.leccion, r.step].join('|')));
    if (lu && (lu[1].fallas || []).some(c => c && c !== corrida)) e.conocido = true;
    g.set(k, e);
  }
  return [...g.values()].sort((a, b) => b.veces - a.veces);
}

function salud(tablero, reportes) {
  const pasos = Object.values((tablero && tablero.pasos) || {});
  let ok = 0, mal = 0;
  for (const p of pasos) for (const v of Object.values(p.tareas || {})) { if (v === 'ok') ok++; else if (v === 'falla' || v === 'saltado') mal++; }
  const tests = pasos.filter(p => p.test != null), bajos = tests.filter(p => p.test < 100).length;
  const atascos = (reportes || []).filter(r => /^atascado/.test(r.motivo)).length;
  if (!ok && !mal && !tests.length) return null;
  const base = (ok + tests.length - bajos) / Math.max(1, ok + mal + tests.length);
  return Math.max(0, Math.min(100, Math.round(base * 100 - atascos * 2)));
}

function tiempos(tablero) {
  const U = {};
  for (const p of Object.values((tablero && tablero.pasos) || {})) {
    if (!p.u) continue;
    const a = Date.parse(p.desde || p.hora), b = Date.parse(p.hora);
    if (isNaN(a) || isNaN(b)) continue;
    const u = U[p.u] = U[p.u] || { desde: a, hasta: b };
    u.desde = Math.min(u.desde, a); u.hasta = Math.max(u.hasta, b);
  }
  return Object.entries(U).map(([u, x]) => ({ unidad: +u, minutos: Math.round((x.hasta - x.desde) / 60000) })).sort((a, b) => b.minutos - a.minutos);
}

function nuevas(catalogo, desde) {
  const t = Date.parse(desde || 0) || 0;
  return Object.entries((catalogo && catalogo.firmas) || {}).filter(([, f]) => Date.parse(f.primera || 0) >= t)
    .map(([firma, f]) => ({ firma, kind: f.kind, donde: f.donde, ok: f.ok || 0, falla: f.falla || 0 }));
}

function paraIA({ nombre, curso, version, grupos, reportes, salud: s, widgets }) {
  const L = [`ED-Autopilot v${version} · ${nombre} · ${curso || 'curso ?'} · Realización ${widgets && widgets.completion != null ? widgets.completion + ' %' : '?'} · Promedio ${widgets && widgets.avg != null ? widgets.avg + ' %' : '?'} · salud ${s ?? '?'}/100`, ''];
  L.push('FALLOS AGRUPADOS (tipo → veces → dónde → ¿ya pasaba antes?):');
  for (const g of grupos) L.push(`- ${g.tipo} → ${g.veces} → ${g.donde.join(' | ')} → ${g.conocido ? 'ya conocido' : 'NUEVO'} (reportes #${g.nums.slice(0, 8).join(', #')})`);
  L.push('', 'UN DUMP POR GRUPO (el primero de cada uno):');
  for (const g of grupos) {
    const r = (reportes || []).find(x => clave(x) === g.tipo);
    if (!r) continue;
    const d = Object.assign({}, r); delete d.clave; delete d.antes;
    if (d.dump) { d.dump = Object.assign({}, d.dump); delete d.dump.iframes; if (d.dump.panelIzq) d.dump.panelIzq = { texto: String(d.dump.panelIzq.texto || '').slice(0, 600) }; }
    L.push(`\n### ${g.tipo} (#${r.num})`, JSON.stringify(d).slice(0, 12000));
  }
  return L.join('\n');
}

module.exports = { agrupar, salud, tiempos, nuevas, paraIA };
