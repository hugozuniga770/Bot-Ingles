/* =====================================================================
   cloud/tablero.js — el TABLERO con checks: cuenta por cuenta, unidad por unidad, paso por paso (NUEVO v21.13)
   ---------------------------------------------------------------------
   Pedido de Hugo (02/11): "que se vaya viendo todo bonito, unidad por unidad, step por step y test por test, qué
   funcionó y qué falló". Junta tres cosas que guarda el bot en el navegador:
     · ed:progress:v1  (My Progress al empezar: qué lecciones ya estaban hechas y su Last Test Score)
     · ed:tablero:v1   (lo que hizo el bot EN ESTA corrida, paso por paso: ok / falla + reporte / saltado / visto)
     · ed:sweep:v1     (porcentajes del Home y curso)
   y dibuja una tabla en Markdown. La nube la publica:
     · EN VIVO en un "issue" del repo (cada ~3 min, un comentario por cuenta, con el NOMBRE del secret ED_CUENTAS).
       El repo es PÚBLICO: nunca usuario ni contraseña; si no quieres nombres reales, usa apodos en el secret.
     · Al final, en el resumen de la ejecución (con el nombre) y en salida/tablero.md (dentro del zip).
   node cloud/tablero.js issue   → (job "preparar") busca o crea el issue del tablero y lo pasa a los jobs.
   ===================================================================== */
'use strict';
const TITULO = '📊 Tablero del bot (se actualiza solo mientras corre la nube)';
const ICON = { ok: '✅', falla: '❌', saltado: '⏭️', visto: '👁️' };
// el motivo del reporte en palabras simples (el nombre técnico queda entre paréntesis para buscarlo en reporte.txt)
const MOTIVO = { tarea_no_marcada: 'ED no la marcó', tipo_desconocido: 'pantalla que el bot no reconoce', atascado_en_el_mismo_lugar: 'atascado (no avanzaba)',
  memory_sin_parejas: 'memoria sin parejas', replay_incompleto: 'test: faltó contestar algo', replay_sin_accion: 'test: no pudo contestar',
  test_sin_100: 'test quedó < 100', test_sin_preguntas: 'test sin preguntas', unidad_sin_terminar_por_tiempo: 'unidad cortada' };
const motivo = m => (MOTIVO[m] ? `${MOTIVO[m]} (${m})` : m);
const LEYENDA = '✅ hecho · ❌ falló (el n.º es el del reporte, con el dump) · ⚠️ test < 100 · ⏭️ ya falló, no se repite · 👁️ visto (sin tarea) · 🟡 empezada · ⬜ pendiente · 🔄 aquí está ahora · 🔒 bloqueada';

function estadoPaso(e) {
  const v = Object.values((e && e.tareas) || {});
  if (v.includes('falla')) return 'falla';
  if (v.includes('ok')) return 'ok';
  if (v.includes('saltado')) return 'saltado';
  return v.length ? 'visto' : null;
}
const horaBO = d => { try { return new Date(d || Date.now()).toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit' }); } catch (e) { return new Date(d || Date.now()).toISOString().slice(11, 16) + ' UTC'; } };

// o: { titulo, curso, login: 'ok'|'falla'|'esperando', loginMsg, widgets: {completion, avg}, mapa, tablero, fin }
// AJUSTADA v21.13 (Hugo: "que se vea como un desplegable unidad por unidad y, al tocar la unidad, lección por
// lección"): cada unidad es un <details> que se abre con un clic; adentro, cada lección con sus pasos y su test.
function dibujar(o) {
  const T = (o.tablero && o.tablero.pasos) ? o.tablero : { pasos: {} };
  const pasos = Object.values(T.pasos);
  const L = [];
  const w = o.widgets || {};
  const login = o.login === 'ok' ? '✅ Login' : o.login === 'falla' ? `❌ Login${o.loginMsg ? ' (' + o.loginMsg + ')' : ''}` : '⏳ Entrando…';
  const ahora = o.fin ? null : (T.ahora || (T.ultimo && T.pasos[T.ultimo]) || null);
  const pasoCorto = a => (/test/i.test(a.paso || '') ? 'Test' : 'Step ' + a.p) + (a.contador ? ' ' + a.contador : '');
  L.push(`## 👤 ${o.titulo}${o.curso ? ' — ' + o.curso : ''}`);
  L.push([login, w.completion != null ? `Realización **${w.completion} %**` : '', w.avg != null ? `Promedio de tests **${w.avg} %**` : '',
    o.fin ? '🏁 terminó' : (ahora ? `🔄 **ahora: Unidad ${ahora.u} → Lección ${ahora.l} → ${ahora.paso}${ahora.contador ? ' (' + ahora.contador + ')' : ''}**` : ''), `actualizado ${horaBO()} (Bolivia)`].filter(Boolean).join(' · '));
  if (o.login !== 'ok') {
    // la fila de cuadritos igual se ve: el 1.º es el login
    L.push('', '| 1 · Login |', '|:-:|', `| ${o.login === 'falla' ? '❌' : '⏳'} |`);
    return L.join('\n') + '\n';
  }

  // unidades: las de My Progress + las que tocó el bot
  const U = new Map();
  for (const u of ((o.mapa && o.mapa.unidades) || [])) U.set(u.n, { n: u.n, nombre: u.nombre || '', locked: u.locked, lecciones: (u.lecciones || []).filter(l => (l.nombre || '').trim()) });
  for (const e of pasos) if (e.u && !U.has(e.u)) U.set(e.u, { n: e.u, nombre: '', lecciones: [] });
  if (!U.size) { L.push('', '| 1 · Login | Unidades |', '|:-:|:-:|', '| ✅ | ⏳ |', '', '_Todavía no hay datos de unidades (el bot está leyendo My Progress o entrando a la primera lección)._', '', LEYENDA); return L.join('\n') + '\n'; }
  const unidades = [...U.values()].sort((a, b) => a.n - b.n);

  // una lección: sus pasos (lo que hizo el bot en esta corrida; si no la tocó, lo que decía My Progress) y su test
  const leccion = (u, n) => {
    const mapL = u.lecciones.find(l => l.n === n);
    const tab = pasos.filter(e => e.u === u.n && e.l === n);
    const nombre = mapL ? mapL.nombre : String((tab[0] && tab[0].leccion) || '').replace(/^Lesson\s*\d+\s*:\s*/i, '');
    const nP = Math.max(mapL ? mapL.pasos || 0 : 0, 0, ...tab.map(e => e.p || 0));
    let test = mapL && typeof mapL.test === 'number' ? mapL.test : null;
    const steps = [];
    for (let p = 1; p <= nP; p++) {
      const e = tab.find(x => x.p === p);
      let ic, det = '';
      if (e && e.test != null) { test = e.test; ic = e.test >= 100 ? '✅' : '⚠️'; det = `${e.test} %`; }
      else if (e && estadoPaso(e)) {
        const es = estadoPaso(e); ic = ICON[es];
        if (es === 'falla') det = `_${e.motivo ? (MOTIVO[e.motivo] || e.motivo) : 'ED no la marcó'}${e.reporte ? ` · reporte #${e.reporte}` : ''}_`;
        if (es === 'saltado') det = '_ya falló, no se repitió_';
      } else ic = mapL && (mapL.terminado || p <= (mapL.hechos || 0)) ? '✅' : '⬜';
      // el paso donde está AHORA: 🔄 (con el contador del test, p. ej. "4/10")
      const aquiP = !!(ahora && ahora.u === u.n && ahora.l === n && ahora.p === p);
      const marca = aquiP ? (ic === '⬜' ? '' : ' ') + '🔄' + (ahora.contador ? ' ' + ahora.contador : '') : '';
      steps.push({ ic, txt: `${e ? e.paso : aquiP && ahora.paso ? ahora.paso : 'Step ' + p} ${ic === '⬜' && aquiP ? '' : ic}${marca}${det ? ' ' + det : ''}` });
    }
    const hecha = !!(mapL && mapL.terminado) || (steps.length > 0 && steps.every(s => s.ic === '✅'));
    const aqui = !!(ahora && ahora.u === u.n && ahora.l === n);
    const icono = aqui ? '🔄' : steps.some(s => s.ic === '❌') ? '❌' : hecha ? '✅' : steps.some(s => s.ic === '⚠️') ? '⚠️' : steps.some(s => s.ic !== '⬜') ? '🟡' : '⬜';
    const linea = hecha && !tab.length
      ? `- ✅ **L${n} · ${nombre}** — ya estaba hecha${test != null ? ` · test ${test} %` : ''}`
      : `- ${icono} **L${n} · ${nombre}**${aqui ? ' ← aquí está ahora' : ''} — ${steps.length ? steps.map(s => s.txt).join(' · ') : 'sin datos todavía'}${test != null && !tab.some(e => e.test != null) ? ` · test ${test} %` : ''}`;
    return { hecha, aqui, icono, test, linea };
  };

  const cajas = [], bloques = [];
  for (const u of unidades) {
    const nums = [...new Set([...u.lecciones.map(l => l.n).filter(n => n > 0), ...pasos.filter(e => e.u === u.n).map(e => e.l).filter(n => n > 0)])].sort((a, b) => a - b);
    const lec = nums.map(n => Object.assign({ n }, leccion(u, n)));
    const ut = u.lecciones.find(l => /unit\s*test/i.test(l.nombre || ''));
    const aqui = lec.some(x => x.aqui), fallas = lec.filter(x => x.icono === '❌').length, hechas = lec.filter(x => x.hecha).length;
    const icono = u.locked ? '🔒' : (lec.length && hechas === lec.length) ? '✅' : aqui ? '🔄' : fallas ? '❌' : lec.some(x => x.icono !== '⬜') ? '🟡' : '⬜';
    const bajos = lec.filter(x => typeof x.test === 'number' && x.test < 100).map(x => `L${x.n} ${x.test} %`);
    const conTest = lec.filter(x => typeof x.test === 'number');
    const aquiL = aqui ? lec.find(x => x.aqui) : null;
    cajas.push({ cab: `U${u.n}`, val: icono + (aquiL && ahora ? ` L${aquiL.n} · ${pasoCorto(ahora)}` : (!u.locked && lec.length ? ` ${hechas}/${lec.length}` : '')) });
    const sum = [`${icono} <b>Unidad ${u.n}${u.nombre ? ': ' + u.nombre : ''}</b>`, u.locked ? 'bloqueada' : `${hechas}/${lec.length} lecciones`,
      bajos.length ? `⚠️ tests: ${bajos.join(', ')}` : (conTest.length && conTest.length === lec.length ? 'tests 100 %' : ''),
      ut ? `Unit Test ${ut.terminado ? '✅' : '⬜'}${typeof ut.test === 'number' ? ' ' + ut.test + ' %' : ''}` : '',
      fallas ? `❌ ${fallas} con fallos` : '', aqui ? '🔄 aquí está ahora' : ''].filter(Boolean).join(' · ');
    const cuerpo = u.locked ? ['- 🔒 Unidad bloqueada'] : [...lec.map(x => x.linea), ...(ut ? [`- ${ut.terminado ? '✅' : '⬜'} **Unit Test**${typeof ut.test === 'number' ? ' — ' + ut.test + ' %' : ut.terminado ? '' : ' — sin hacer'}`] : [])];
    bloques.push(`<details${aqui ? ' open' : ''}><summary>${sum}</summary>`, '', ...(cuerpo.length ? cuerpo : ['- (sin lecciones leídas todavía)']), '', '</details>');
  }
  // fila de cuadritos, como el gráfico de GitHub Actions: Login → U1 → U2 → … (con por dónde va)
  L.push('', '| 1 · Login | ' + cajas.map(c => c.cab).join(' | ') + ' |', '|:-:|' + cajas.map(() => ':-:').join('|') + '|', '| ✅ | ' + cajas.map(c => c.val).join(' | ') + ' |');
  L.push('', '_Toca una unidad para ver lección por lección, paso por paso y cada test._', '', ...bloques, '', LEYENDA);

  // problemas: el lugar exacto y el n.º de reporte (ahí está el dump completo tomado en ese momento)
  const malos = pasos.filter(e => estadoPaso(e) === 'falla' || estadoPaso(e) === 'saltado' || (e.test != null && e.test < 100))
    .sort((a, b) => a.u - b.u || a.l - b.l || a.p - b.p);
  if (malos.length) {
    L.push('', `<details><summary>📋 Qué falló en esta corrida (${malos.length})</summary>`, '');
    for (const e of malos.slice(0, 60)) {
      const est = estadoPaso(e);
      const que = e.test != null && e.test < 100 ? `test en ${e.test} %` : est === 'saltado' ? 'ya había fallado: no se repitió (regla 4)' : (e.motivo ? motivo(e.motivo) : 'ED no la marcó');
      L.push(`- ${est === 'saltado' ? '⏭️' : e.test != null && e.test < 100 ? '⚠️' : '❌'} U${e.u} L${e.l} · ${e.paso}${e.kind ? ` (${e.kind})` : ''} — ${que}${e.reporte ? ` · reporte #${e.reporte}` : ''}`);
    }
    L.push('', '</details>');
  }
  return L.join('\n') + '\n';
}

// ---- GitHub: un comentario por cuenta en el issue del tablero, que se edita (no se llena de mensajes) ----
async function api(token, method, url, body) {
  const r = await fetch((process.env.GITHUB_API_URL || 'https://api.github.com') + url, { method, headers: Object.assign({ Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'ed-autopilot', 'X-GitHub-Api-Version': '2022-11-28' }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${method} ${url.split('?')[0]} → ${r.status}`);
  return r.status === 204 ? null : r.json();
}
class Publicador {
  constructor({ token, repo, issue, cuenta }) { Object.assign(this, { token, repo, issue, cuenta, id: null, errores: 0, ultimoError: null }); }
  activo() { return !!(this.token && this.repo && this.issue && this.errores < 5); }
  async publicar(md) {
    if (!this.activo()) return false;
    const marca = `<!-- tablero-cuenta-${this.cuenta} -->`, body = (marca + '\n' + md).slice(0, 60000);
    try {
      if (!this.id) {
        const cs = await api(this.token, 'GET', `/repos/${this.repo}/issues/${this.issue}/comments?per_page=100`);
        const c = (cs || []).find(x => (x.body || '').startsWith(marca));
        if (!c) { this.id = (await api(this.token, 'POST', `/repos/${this.repo}/issues/${this.issue}/comments`, { body })).id; return true; }
        this.id = c.id;
      }
      await api(this.token, 'PATCH', `/repos/${this.repo}/issues/comments/${this.id}`, { body });
      return true;
    } catch (e) { this.errores++; this.ultimoError = e.message; return false; }
  }
}
module.exports = { dibujar, Publicador, estadoPaso, TITULO };

// node cloud/tablero.js issue → busca (o crea) el issue del tablero y deja su número en GITHUB_OUTPUT (issue=N)
if (require.main === module && process.argv[2] === 'issue') {
  (async () => {
    const token = process.env.GH_TOKEN, repo = process.env.GITHUB_REPOSITORY;
    let n = '';
    try {
      if (!token || !repo) throw new Error('sin GH_TOKEN o GITHUB_REPOSITORY');
      const abiertos = await api(token, 'GET', `/repos/${repo}/issues?state=open&per_page=100`);
      const ya = (abiertos || []).find(i => i.title === TITULO && !i.pull_request);
      n = ya ? ya.number : (await api(token, 'POST', `/repos/${repo}/issues`, { title: TITULO, body:
        'Aquí cada cuenta tiene su comentario con una tabla de checks (unidad por unidad, paso por paso, test por test) ' +
        'que el bot actualiza solo cada ~3 minutos mientras corre la nube.\n\n' + LEYENDA + '\n\n' +
        '🔒 El repo es público: aquí sale el NOMBRE que pusiste en el secret ED_CUENTAS (la 3.ª palabra de cada línea), ' +
        'nunca usuarios ni contraseñas. Si prefieres que no se vean nombres reales, pon apodos o iniciales ahí.' })).number;
      console.log(`📊 Tablero: issue #${n} · https://github.com/${repo}/issues/${n}`);
    } catch (e) { console.log(`::warning::No pude preparar el tablero en vivo (${e.message}). El bot corre igual; la tabla sale al final en el resumen.`); }
    if (process.env.GITHUB_OUTPUT) require('fs').appendFileSync(process.env.GITHUB_OUTPUT, `issue=${n}\n`);
  })();
}
