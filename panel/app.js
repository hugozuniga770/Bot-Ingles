/* =====================================================================
   panel/app.js — el panel del bot en el teléfono (NUEVO v21.16)
   ---------------------------------------------------------------------
   Habla SOLO con api.github.com, con TU token (fine-grained, solo el repo del bot):
     • correr: workflow "nube" (workflow_dispatch) — una cuenta, varias o todas; cada pedido arranca YA (sin cola)
     • parar: una cuenta → orden en el issue del tablero (cloud/lote.js la para y las demás de su máquina siguen);
              una corrida entera → cancel
     • agregar / quitar cuentas: reescribe el secret ED_CUENTAS (cifrado para GitHub con su llave pública)
     • ver: corridas, máquinas y el tablero de cada cuenta (los comentarios del issue, con sus datos invisibles)
   Todo lo que cambia algo pide TU clave otra vez (pedido de Hugo: "que me la pida cada que haga un running").
   ===================================================================== */
'use strict';
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K = 'edpanel:v1', TITULO = '📊 Tablero del bot (se actualiza solo mientras corre la nube)';
  const leer = () => { try { return JSON.parse(localStorage.getItem(K) || 'null') || {}; } catch (e) { return {}; } };
  const escribir = o => localStorage.setItem(K, JSON.stringify(o));
  // para probar en la PC: ?api=http://localhost:8767 (solo desde localhost)
  const qs = new URLSearchParams(location.search);
  const API = (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && qs.get('api')) || 'https://api.github.com';
  const S = { token: null, lista: [], cfg: leer(), rama: 'main', issue: null, runs: [], ocup: {}, tab: {}, secretos: [], sel: new Set(), cargando: false, ultimo: 0 };

  // ---------------------------------------------------------------- utilidades
  function aviso(t, ms = 3200) { const a = $('#aviso'); a.textContent = t; a.hidden = false; clearTimeout(aviso._t); aviso._t = setTimeout(() => { a.hidden = true; }, ms); }
  // NUEVO v21.18 (idea 63): aviso con "Deshacer" — lo que cambia algo espera unos segundos antes de hacerse
  function avisoDeshacer(t, alDeshacer, ms = 6000) {
    const a = $('#aviso'); a.innerHTML = esc(t) + ' <button class="btn chico" id="b-deshacer">↩ Deshacer</button>'; a.hidden = false; clearTimeout(aviso._t);
    $('#b-deshacer').onclick = () => { a.hidden = true; alDeshacer(); }; aviso._t = setTimeout(() => { a.hidden = true; }, ms);
  }
  const esperarDeshacer = (t, ms = 5000) => new Promise(res => { let no = false; avisoDeshacer(t, () => { no = true; aviso('↩ Cancelado, no se hizo nada'); res(false); }, ms); setTimeout(() => { if (!no) res(true); }, ms); });
  // NUEVO v21.18 (idea 68): vibración distinta según lo que pasó (sin mirar el teléfono sabes si es bueno o malo)
  const VIBRA = { fin: [120, 60, 120], mal: [400, 120, 400, 120, 400], cien: [60, 40, 60, 40, 60, 40, 300], toque: [15] };
  const vibrar = k => { try { navigator.vibrate && navigator.vibrate(VIBRA[k] || VIBRA.toque); } catch (e) {} };
  function vista(id) { $$('.vista').forEach(v => { v.hidden = v.id !== id; }); }
  function hoja(html) { $('#hoja-contenido').innerHTML = html; $('#hoja').hidden = false; return $('#hoja-contenido'); }
  function cerrarHoja() { $('#hoja').hidden = true; $('#hoja-contenido').innerHTML = ''; }
  const hace = iso => { if (!iso) return ''; const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h ${m % 60} min`; };
  const dura = (a, b) => { const m = Math.max(0, Math.round(((b ? Date.parse(b) : Date.now()) - Date.parse(a)) / 60000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
  const b64json = s => { try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)))); } catch (e) { return null; } };

  async function gh(metodo, url, cuerpo, accept) {
    const r = await fetch(API + url, { method: metodo, headers: Object.assign({ Authorization: 'Bearer ' + S.token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, cuerpo ? { 'Content-Type': 'application/json' } : {}), body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    if (r.status === 204) return null;
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
    if (!r.ok) { const e = new Error((j && j.message) || ('GitHub respondió ' + r.status)); e.status = r.status; throw e; }
    return j;
  }
  const repo = () => S.cfg.repo;

  // ---------------------------------------------------------------- lista ED_CUENTAS (igual que cloud/cuentas.js)
  function cuentasDeLista(lista) {
    return lista.map(l => l.trim()).filter(l => l && !l.startsWith('#')).map((l, i) => { const p = l.split(/[\s:,;]+/).filter(Boolean); return { n: String(i + 1), user: p[0] || '', ok: !!(p[0] && p[1]), nombre: p.slice(2).join(' ') || `cuenta ${i + 1}` }; }).filter(c => c.ok);
  }
  async function subirLista(lista) {
    const k = await gh('GET', `/repos/${repo()}/actions/secrets/public-key`);
    await gh('PUT', `/repos/${repo()}/actions/secrets/ED_CUENTAS`, { encrypted_value: Cripto.sellar(lista.join('\n'), k.key), key_id: k.key_id });
  }
  async function guardarCaja(clave) { S.cfg.caja = await Cripto.cifrar(JSON.stringify({ token: S.token, lista: S.lista }), clave); escribir(S.cfg); }

  // ---------------------------------------------------------------- clave (al abrir y antes de cada acción)
  function pedirClave(motivo) {
    return new Promise(res => {
      const h = hoja(`<h2>🔒 ${esc(motivo)}</h2><form id="f-clave"><label>Tu clave <input name="c" type="password" autocomplete="current-password" required></label><button class="btn grande verde">Confirmar</button><p class="error" id="e-clave"></p></form>`);
      const f = $('#f-clave', h); setTimeout(() => f.c.focus(), 50);
      $('.cerrar-hoja').onclick = () => { cerrarHoja(); res(null); };
      f.onsubmit = async ev => { ev.preventDefault(); const c = f.c.value;
        try { await Cripto.descifrar(S.cfg.caja, c); cerrarHoja(); res(c); } catch (e) { $('#e-clave', h).textContent = 'Clave incorrecta'; } };
    });
  }

  // ---------------------------------------------------------------- datos (cada 20 s mientras se ve)
  async function refrescar(silencio) {
    if (S.cargando || !S.token) return; S.cargando = true; $('#b-refrescar').classList.add('girando');
    try {
      if (!S.issue) { const is = await gh('GET', `/repos/${repo()}/issues?state=open&per_page=50`); const i = (is || []).find(x => x.title === TITULO && !x.pull_request); S.issue = i ? i.number : null; }
      const runs = (await gh('GET', `/repos/${repo()}/actions/workflows/nube.yml/runs?per_page=25`)).workflow_runs || [];
      S.runs = runs;
      // qué cuenta corre en qué máquina (jobs "correr 1,2,NORE")
      const ocup = {};
      for (const r of runs.filter(r => r.status !== 'completed').slice(0, 15)) {
        const js = (await gh('GET', `/repos/${repo()}/actions/runs/${r.id}/jobs?per_page=100`)).jobs || [];
        for (const j of js) { const m = /^correr\s+(.+)$/.exec(j.name || ''); if (!m || j.status === 'completed') continue;
          const ids = m[1].split(',').map(x => x.trim().toUpperCase()); for (const id of ids) ocup[id] = { run: r.id, url: j.html_url, estado: j.status, desde: j.started_at || r.created_at, grupo: ids }; }
        if (!js.some(j => /^correr/.test(j.name || ''))) ocup['__run' + r.id] = { run: r.id, preparando: true, desde: r.created_at };
      }
      S.ocup = ocup;
      // tableros (con los datos invisibles que deja cloud/runner.js)
      const tab = {};
      if (S.issue) {
        const cs = await gh('GET', `/repos/${repo()}/issues/${S.issue}/comments?per_page=100`, null, 'application/vnd.github.full+json');
        for (const c of cs || []) { const m = /<!-- datos:([A-Za-z0-9+/=]+) -->/.exec(c.body || ''); if (!m) continue; const d = b64json(m[1]); if (!d) continue;
          const id = String(d.cuenta).toUpperCase(); if (!tab[id] || Date.parse(d.hora) > Date.parse(tab[id].d.hora)) tab[id] = { d, html: c.body_html, url: c.html_url }; }
      }
      S.tab = tab;
      try { S.secretos = ((await gh('GET', `/repos/${repo()}/actions/secrets?per_page=100`)).secrets || []).map(x => x.name); } catch (e) { S.secretos = []; }
      S.ultimo = Date.now(); pintar();
    } catch (e) { if (!silencio) aviso('⚠ ' + e.message); $('#estado-linea').textContent = '⚠ ' + e.message; }
    finally { S.cargando = false; $('#b-refrescar').classList.remove('girando'); }
  }

  // ---------------------------------------------------------------- dibujar
  function todasLasCuentas() {
    const m = new Map();
    for (const c of cuentasDeLista(S.lista)) m.set(c.n, { id: c.n, nombre: c.nombre, origen: 'lista' });
    for (const s of S.secretos) { const a = (/^ED_CUENTA_([A-Z0-9_]+)$/.exec(s) || [])[1]; if (a && !m.has(a)) m.set(a, { id: a, nombre: a, origen: 'secret' }); }
    for (const [id, t] of Object.entries(S.tab)) if (!m.has(id)) m.set(id, { id, nombre: t.d.nombre || id, origen: 'tablero' });
    for (const id of Object.keys(S.ocup)) if (!/^__/.test(id) && !m.has(id)) m.set(id, { id, nombre: 'cuenta ' + id, origen: 'corriendo' });
    return [...m.values()].map(c => { const t = S.tab[c.id.toUpperCase()]; if (t && t.d.nombre && c.origen !== 'lista') c.nombre = t.d.nombre; return c; });
  }
  function estadoDe(c) {
    const o = S.ocup[c.id.toUpperCase()], t = S.tab[c.id.toUpperCase()], d = t && t.d;
    if (o && d && String(d.run) === String(o.run) && (d.estado === 'parado' || d.estado === 'fin')) return { k: 'fin', txt: d.estado === 'parado' ? 'parada' : 'terminó', o };
    if (o) return o.estado === 'queued' || o.estado === 'waiting' ? { k: 'cola', txt: 'esperando máquina', o } : { k: 'corre', txt: 'corriendo · ' + dura(o.desde), o };
    if (d && d.login === 'falla') return { k: 'mal', txt: 'no pudo entrar' };
    if (d && d.freno) return { k: 'mal', txt: 'frenada' };
    if (d && (d.estado === 'fin' || d.estado === 'parado')) return { k: 'fin', txt: (d.estado === 'parado' ? 'parada ' : 'terminó ') + hace(d.hora) };
    return { k: 'quieta', txt: 'quieta' };
  }
  // NUEVO v21.17 (visual): anillos de progreso, color propio por persona, resumen con anillo grande y confeti al 100/100
  const tono = t => { let h = 0; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  function anillo(v, etiqueta, ini, cls, tam = 64) {
    const r = (tam - 8) / 2, L = 2 * Math.PI * r, x = v == null ? 0 : Math.max(0, Math.min(100, v));
    const sube = ini != null && v != null && v > ini ? `<em>+${v - ini}</em>` : '';
    return `<div class="anillo ${cls || ''}" style="--tam:${tam}px"><svg viewBox="0 0 ${tam} ${tam}"><circle class="fondo-a" cx="${tam / 2}" cy="${tam / 2}" r="${r}"/><circle class="valor-a" cx="${tam / 2}" cy="${tam / 2}" r="${r}" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - x / 100)}"/></svg><b>${v == null ? '—' : v}<small>%</small></b><span>${etiqueta}${sube}</span></div>`;
  }
  function confeti() {
    const c = document.createElement('div'); c.className = 'confeti';
    c.innerHTML = Array.from({ length: 60 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:hsl(${(i * 47) % 360} 90% 60%);animation-delay:${Math.random() * .6}s;animation-duration:${1.6 + Math.random() * 1.4}s"></i>`).join('');
    document.body.appendChild(c); setTimeout(() => c.remove(), 3500);
  }
  function barra(nombre, v, ini, cls) {
    const x = v == null ? 0 : v;
    return `<div class="barra-p"><div><span>${nombre}</span><b>${v == null ? '—' : v + ' %'}${ini != null && v != null && ini !== v ? ` <small style="display:inline;color:var(--verde)">(+${v - ini})</small>` : ''}</b></div><div class="pista ${cls || ''}"><i style="width:${x}%"></i></div></div>`;
  }
  // NUEVO v21.17 — AVISOS: si una cuenta termina, se para o se traba, el teléfono avisa (mientras el panel está abierto
  // o en segundo plano reciente; GitHub Pages no puede mandar avisos con el panel cerrado)
  function avisos(cs) {
    S.prev = S.prev || {};
    for (const c of cs) {
      const e = estadoDe(c), t = S.tab[c.id.toUpperCase()], d = (t && t.d) || {}, antes = S.prev[c.id];
      S.prev[c.id] = e.k;
      if (!antes || antes === e.k || antes !== 'corre') continue;
      const msg = e.k === 'fin' ? `🏁 ${c.nombre} ${e.txt}: ${d.comp ?? '?'} % · ${d.avg ?? '?'} %` : e.k === 'mal' ? `⚠️ ${c.nombre}: ${e.txt}` : null;
      if (!msg) continue;
      aviso(msg, 6000); vibrar(e.k === 'fin' ? 'fin' : 'mal');   // AJUSTADA v21.18 (idea 68)
      try { if (window.Notification && Notification.permission === 'granted') new Notification('Bot ED', { body: msg, icon: 'icono.svg', tag: 'ed-' + c.id }); } catch (er) {}
    }
  }
  // NUEVO v21.18 (ideas 51, 52, 59): buscar, filtrar y ordenar (con 40 cuentas hace falta)
  const datosDe = c => (S.tab[c.id.toUpperCase()] || {}).d || {};
  const perfecta = d => d.comp === 100 && d.avg === 100;
  const FILTROS = { '': () => true, corre: (c, e) => e === 'corre' || e === 'cola', faltan: (c, e, d) => !perfecta(d), listas: (c, e, d) => perfecta(d), mal: (c, e, d) => e === 'mal' || (d.salud != null && d.salud < 60) };
  function filtrar(cs) {
    const f = S.cfg.filtro || {}, b = String(f.q || '').toLowerCase().trim();
    let r = cs.filter(c => { const d = datosDe(c);
      if (b && !`${c.nombre} ${c.id} ${d.curso || ''}`.toLowerCase().includes(b)) return false;
      return (FILTROS[f.k || ''] || FILTROS[''])(c, estadoDe(c).k, d); });
    const avance = c => { const d = datosDe(c); return d.comp == null ? -1 : (d.comp || 0) + (d.avg || 0); };
    const rango = c => ({ corre: 0, cola: 1, mal: 2, quieta: 3, fin: 4 }[estadoDe(c).k] ?? 5);
    const orden = { nombre: (a, x) => a.nombre.localeCompare(x.nombre, 'es'), progreso: (a, x) => avance(a) - avance(x), estado: (a, x) => rango(a) - rango(x) }[f.orden || ''];
    return orden ? r.slice().sort(orden) : r;
  }
  // NUEVO v21.18 (idea 48): historial de avance de cada cuenta, guardado en ESTE teléfono (solo números)
  function anotarHistorial(cs) {
    const H = S.cfg.hist = S.cfg.hist || {}; let cambio = false;
    for (const c of cs) { const d = datosDe(c); if (d.comp == null && d.avg == null) continue;
      const a = H[c.id] = H[c.id] || [], u = a[a.length - 1];
      if (!u || u.c !== d.comp || u.a !== d.avg) { a.push({ t: Date.now(), c: d.comp, a: d.avg }); if (a.length > 60) a.splice(0, a.length - 60); cambio = true; } }
    if (cambio) escribir(S.cfg);
  }
  function historial(id) {
    const a = ((S.cfg.hist || {})[id] || []); if (a.length < 2) return '<p class="nota">Todavía no hay historial: se arma solo cada vez que abres el panel y la cuenta avanza.</p>';
    const W = 300, Hh = 90, t0 = a[0].t, t1 = a[a.length - 1].t || t0 + 1, X = t => 6 + (W - 12) * (t - t0) / Math.max(1, t1 - t0), Y = v => Hh - 6 - (Hh - 12) * (v || 0) / 100;
    const linea = k => a.filter(p => p[k] != null).map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(' ');
    const f = t => new Date(t).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' });
    return `<svg class="historial" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Historial"><line x1="6" x2="${W - 6}" y1="${Y(100)}" y2="${Y(100)}" class="h-100"/><path d="${linea('c')}" class="h-comp"/><path d="${linea('a')}" class="h-prom"/></svg>
      <div class="h-ley"><span><i class="h-comp"></i>Realización</span><span><i class="h-prom"></i>Promedio</span><span>${f(t0)} → ${f(t1)}</span></div>`;
  }
  function pintar() {
    const cs = todasLasCuentas();
    avisos(cs); anotarHistorial(cs);
    $('#lista-cuentas').classList.toggle('compacto', !!S.cfg.compacto);
    const corren = cs.filter(c => estadoDe(c).k === 'corre').length, cola = cs.filter(c => estadoDe(c).k === 'cola').length;
    const maquinas = new Set(Object.values(S.ocup).map(o => o.run + ':' + (o.grupo || []).join(','))).size;
    $('#estado-linea').textContent = `${repo()} · actualizado ${new Date(S.ultimo).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`;
    const conDatos = cs.map(c => (S.tab[c.id.toUpperCase()] || {}).d).filter(d => d && d.comp != null);
    const prom = k => conDatos.length ? Math.round(conDatos.reduce((a, d) => a + (d[k] || 0), 0) / conDatos.length) : null;
    const listas = conDatos.filter(d => d.comp === 100 && d.avg === 100).length;
    $('#resumen').innerHTML = `<div class="hero-panel"><div class="anillos-hero">${anillo(prom('comp'), 'Realización', null, '', 92)}${anillo(prom('avg'), 'Promedio', null, 'prom', 92)}</div>
      <div class="hero-cifras"><div><b>${cs.length}</b><span>cuentas</span></div><div><b class="v">${corren}</b><span>corriendo${cola ? ` · ${cola} esperan` : ''}</span></div><div><b>${maquinas}<small>/20</small></b><span>máquinas</span></div><div><b class="oro">${listas}</b><span>al 100 %</span></div></div></div>`;
    for (const d of conDatos) { const k = d.cuenta + ':' + d.run; S.festejadas = S.festejadas || new Set(JSON.parse(localStorage.getItem('edpanel:fiesta') || '[]'));
      if (d.comp === 100 && d.avg === 100 && !S.festejadas.has(k)) { S.festejadas.add(k); try { localStorage.setItem('edpanel:fiesta', JSON.stringify([...S.festejadas].slice(-200))); } catch (e) {} if (S.yaPinto) { confeti(); vibrar('cien'); aviso('🎉 ' + (d.nombre || d.cuenta) + ' llegó a 100 % y 100 %'); } } }
    S.yaPinto = true;
    // NUEVO v21.18 (idea 67): el número de cuentas corriendo en el ícono de la app (si el teléfono lo deja)
    try { if (navigator.setAppBadge) { if (corren) navigator.setAppBadge(corren); else navigator.clearAppBadge(); } } catch (e) {}
    const f = S.cfg.filtro || {};
    $$('#chips button').forEach(b => { const n = cs.filter(c => (FILTROS[b.dataset.k] || FILTROS[''])(c, estadoDe(c).k, datosDe(c))).length; b.classList.toggle('activo', (f.k || '') === b.dataset.k); b.querySelector('em').textContent = n; });
    const vis = filtrar(cs);
    $('#lista-cuentas').innerHTML = !cs.length ? '<div class="vacio">No hay cuentas todavía.<br>Toca <b>＋ Cuenta</b> o pega tu lista en ⚙ Ajustes.</div>' : !vis.length ? '<div class="vacio">Ninguna cuenta con ese filtro.</div>' : vis.map(c => {
      const e = estadoDe(c), t = S.tab[c.id.toUpperCase()], d = (t && t.d) || {};
      const ini = d.ini || {};
      return `<article class="cuenta est-${e.k} ${S.sel.has(c.id) ? 'elegida' : ''} ${d.comp === 100 && d.avg === 100 ? 'perfecta' : ''}" data-id="${esc(c.id)}">
        <div class="cab"><input type="checkbox" class="marca" ${S.sel.has(c.id) ? 'checked' : ''} aria-label="elegir"><div class="avatar" style="--h:${tono(c.nombre || c.id)}">${esc((c.nombre || c.id).trim().charAt(0).toUpperCase())}</div>
          <div class="quien"><b>${esc(c.nombre)}</b><span>${c.origen === 'lista' ? 'línea ' + esc(c.id) : esc(c.id)}${d.curso ? ' · ' + esc(d.curso) : ''}</span></div>
          <span class="pill ${e.k}"><span class="punto"></span>${esc(e.txt)}</span></div>
        ${d.comp != null || d.avg != null ? `<div class="anillos">${anillo(d.comp, 'Realización', ini.completion, '')}${anillo(d.avg, 'Promedio', ini.avg, 'prom')}<div class="datos-c">${d.salud != null ? `<div><span>Salud</span><b>${d.salud >= 85 ? '💚' : d.salud >= 60 ? '💛' : '❤️‍🩹'} ${d.salud}</b></div>` : ''}${d.tot ? `<div><span>En ED</span><b>🕓 ${esc(d.tot)}</b></div>` : ''}${d.min != null ? `<div><span>Esta corrida</span><b>⏱ ${Math.floor(d.min / 60)} h ${d.min % 60} m</b></div>` : ''}</div></div>` : ''}
        <div class="ahora">${e.k === 'corre' && d.ahora ? `🔄 <b>${esc(d.ahora)}</b>` : d.hora ? `Último dato ${hace(d.hora)}` : 'Todavía no corrió con esta versión'}${d.comp == null && d.salud != null ? ` · salud ${d.salud}` : ''}</div>
        <div class="botones">${e.k === 'corre' || e.k === 'cola' ? '<button class="btn rojo" data-a="parar">⏹ Parar</button><button class="btn" data-a="reiniciar">🔁 Otra vez</button>' : '<button class="btn verde" data-a="correr">▶ Correr</button>'}
          <button class="btn" data-a="tablero">📊 Tablero</button><button class="btn" data-a="mas" aria-label="Más opciones">⋯</button>${e.o && e.o.url ? `<a class="btn" href="${esc(e.o.url)}" target="_blank" rel="noopener">⚡ Máquina</a>` : ''}</div>
      </article>`;
    }).join('');
    $('#lista-corridas').innerHTML = S.runs.length ? S.runs.map(r => {
      const k = r.status !== 'completed' ? (r.status === 'in_progress' ? 'corre' : 'cola') : r.conclusion === 'success' ? 'fin' : r.conclusion === 'cancelled' ? 'quieta' : 'mal';
      const t = { corre: 'corriendo', cola: 'en espera', fin: 'terminó', quieta: 'cancelada', mal: r.conclusion || 'falló' }[k];
      return `<div class="corrida"><div class="quien"><b>${esc((r.display_title || r.name).replace(/^nube · /, ''))}</b><span>${new Date(r.created_at).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${dura(r.run_started_at || r.created_at, r.status === 'completed' ? r.updated_at : null)}</span></div>
        <span class="pill ${k}"><span class="punto"></span>${t}</span>${r.status !== 'completed' ? `<button class="btn chico rojo" data-run="${r.id}">⏹</button>` : ''}<a class="btn chico" href="${esc(r.html_url)}" target="_blank" rel="noopener">↗</a></div>`;
    }).join('') : '<div class="vacio">Todavía no hay corridas.</div>';
    $('#seleccion').hidden = !S.sel.size; $('#sel-n').textContent = `${S.sel.size} elegida${S.sel.size === 1 ? '' : 's'}`;
  }

  // ---------------------------------------------------------------- acciones
  const ajustes = () => Object.assign({ modo: 'completar', minutos: '330', ritmo: '5', por_maquina: '3' }, S.cfg.ajustes || {});
  async function correr(ids, txt, extra) {
    const a = Object.assign(ajustes(), extra || {});   // AJUSTADA v21.18 (ideas 55–58): modo/minutos propios por botón o por cuenta
    const c = await pedirClave(`Correr ${txt}`); if (!c) return;
    if (ids === 'todas' && !(await esperarDeshacer(`▶ Lanzando TODAS las cuentas en 5 s…`))) return;   // NUEVO v21.18 (idea 63)
    try {
      await gh('POST', `/repos/${repo()}/actions/workflows/nube.yml/dispatches`, { ref: S.rama, inputs: { cuentas: ids, modo: a.modo, minutos: String(a.minutos), ritmo: String(a.ritmo), por_maquina: String(a.por_maquina) } });
      aviso(`▶ ¡Listo! ${txt} arranca en unos segundos`); setTimeout(() => refrescar(true), 6000); setTimeout(() => refrescar(true), 20000);
    } catch (e) { aviso('⚠ No pude lanzar: ' + e.message, 6000); }
  }
  async function parar(ids) {
    const c = await pedirClave(`Parar ${ids.length === 1 ? 'la cuenta ' + ids[0] : ids.length + ' cuentas'}`); if (!c) return;
    try {
      for (const id of ids) {
        const o = S.ocup[String(id).toUpperCase()];
        if (o && o.grupo && o.grupo.length === 1 && Object.values(S.ocup).filter(x => x.run === o.run).length <= 1) { await gh('POST', `/repos/${repo()}/actions/runs/${o.run}/cancel`); continue; }
        if (!S.issue) throw new Error('no encuentro el issue del tablero');
        await gh('POST', `/repos/${repo()}/issues/${S.issue}/comments`, { body: `<!-- orden:parar ${String(id).toUpperCase()} de:panel -->\n⏹ Parar la cuenta ${id} (pedido desde el panel)` });
      }
      aviso('⏹ Pedido enviado: para en 1–3 minutos (guarda todo antes)', 5000); setTimeout(() => refrescar(true), 8000);
    } catch (e) { aviso('⚠ ' + e.message, 6000); }
  }
  function tablero(id) {
    const t = S.tab[String(id).toUpperCase()];
    const h = hoja(`<h2>📊 ${esc(t ? t.d.nombre : id)}</h2>${t ? `<div class="tablero-html">${t.html || ''}</div><p><a class="btn" href="${esc(t.url)}" target="_blank" rel="noopener">Abrir en GitHub ↗</a></p>` : '<p class="nota">Esta cuenta todavía no tiene tablero (aparece cuando corre con la v21.16).</p>'}`);
    $('.cerrar-hoja').onclick = cerrarHoja; return h;
  }
  // NUEVO v21.18 (ideas 55–58): opciones de UNA cuenta — arreglar lo que falta, solo tests, explorar, revisar, historial
  function mas(id) {
    const c = todasLasCuentas().find(x => x.id === id) || { id, nombre: id }, d = datosDe(c), pc = ((S.cfg.porCuenta || {})[id]) || {};
    const h = hoja(`<h2>${esc(c.nombre)}</h2><p class="nota">${d.curso ? esc(d.curso) + ' · ' : ''}${d.comp != null ? `Realización ${d.comp} % · Promedio ${d.avg ?? '—'} %` : 'Sin datos todavía'}</p>
      <div class="acciones-cuenta">
        <button class="btn grande verde" data-m="completar" data-min="330">🧩 Arreglar lo que falta<small>prácticas pendientes y después los tests &lt; 100</small></button>
        <button class="btn grande" data-m="barrer" data-min="330">🎯 Solo tests &lt; 100<small>no toca las prácticas</small></button>
        <button class="btn grande" data-m="explorar" data-min="330">🧭 Explorar el nivel<small>recorre todas las unidades y las cataloga (sin tests)</small></button>
        <button class="btn grande" data-m="auditoria" data-min="20">📋 Solo revisar<small>lee My Progress, actualiza el tablero y termina (~10 min)</small></button>
      </div>
      <h3>Historial</h3>${historial(id)}
      <h3>Para esta cuenta</h3><form id="f-pc" class="dos"><label>Ritmo (s) <input name="ritmo" type="number" min="0" max="30" value="${esc(pc.ritmo || '')}" placeholder="${esc(ajustes().ritmo)}"></label><label>Minutos <input name="minutos" type="number" min="5" max="330" value="${esc(pc.minutos || '')}" placeholder="${esc(ajustes().minutos)}"></label><button class="btn" style="grid-column:1/-1">Guardar para ${esc(c.nombre)}</button></form>
      ${c.origen === 'lista' ? '<button class="btn rojo" data-quitar="1" style="margin-top:14px">🗑 Quitar de la lista</button>' : ''}`);
    $('.cerrar-hoja').onclick = cerrarHoja;
    $('#f-pc', h).onsubmit = ev => { ev.preventDefault(); const f = ev.target; S.cfg.porCuenta = S.cfg.porCuenta || {}; S.cfg.porCuenta[id] = { ritmo: f.ritmo.value, minutos: f.minutos.value }; escribir(S.cfg); aviso('✓ Guardado para ' + c.nombre); };
    h.onclick = ev => {
      const b = ev.target.closest('[data-m]');
      if (b) { cerrarHoja(); const x = Object.assign({ modo: b.dataset.m, minutos: b.dataset.min }, extraDe(id)); if (b.dataset.m === 'auditoria') x.minutos = '20';
        correr(id, `${c.nombre}: ${b.firstChild.textContent.trim()}`, x); }
      if (ev.target.closest('[data-quitar]')) { cerrarHoja(); quitar(id, c.nombre); }
    };
  }
  const extraDe = id => { const pc = (S.cfg.porCuenta || {})[id] || {}, x = {}; if (pc.ritmo) x.ritmo = pc.ritmo; if (pc.minutos) x.minutos = pc.minutos; return x; };
  async function quitar(id, nombre) {
    const c = await pedirClave(`Quitar a ${nombre} de ED_CUENTAS`); if (!c) return;
    if (!(await esperarDeshacer(`🗑 Quito a ${nombre} en 6 s…`, 6000))) return;
    const lineas = S.lista.slice(); let k = 0;
    const i = lineas.findIndex(l => { const t = l.trim(); if (!t || t.startsWith('#')) return false; k++; return String(k) === String(id); });
    if (i < 0) return aviso('No encontré esa línea');
    lineas[i] = 'borrada';   // la línea queda → las demás conservan su número
    try { await subirLista(lineas); S.lista = lineas; await guardarCaja(c); aviso(`✓ ${nombre} quitada (las demás conservan su número)`); pintar(); } catch (e) { aviso('⚠ ' + e.message, 6000); }
  }
  // NUEVO v21.18 (idea 30): revisar la lista ANTES de subirla (sin mostrar contraseñas)
  function revisarLista(lista) {
    const prob = [], vistos = {}; let n = 0;
    for (const l of lista) { const t = l.trim(); if (!t || t.startsWith('#')) continue; n++; const p = t.split(/[\s:,;]+/).filter(Boolean);
      if (p[0] === 'borrada') continue;
      if (p.length < 2) { prob.push(`Línea ${n}: le falta la contraseña (o el usuario)`); continue; }
      const u = p[0].toLowerCase(); if (vistos[u]) prob.push(`Línea ${n} (${esc(p.slice(2).join(' ') || p[0])}): el mismo usuario que la línea ${vistos[u]}`); else vistos[u] = n; }
    return prob;
  }
  function confirmar(titulo, items, boton) {
    return new Promise(res => { const h = hoja(`<h2>${titulo}</h2><ul class="problemas">${items.map(i => `<li>${i}</li>`).join('')}</ul><div class="fila-botones"><button class="btn grande" data-r="0">Corregir</button><button class="btn grande rojo" data-r="1">${boton}</button></div>`);
      $('.cerrar-hoja').onclick = () => { cerrarHoja(); res(false); }; h.onclick = ev => { const b = ev.target.closest('[data-r]'); if (b) { cerrarHoja(); res(b.dataset.r === '1'); } }; });
  }
  // NUEVO v21.18 (ideas 96–98): ayuda y primera vez
  function ayuda(primera) {
    const h = hoja(`<h2>${primera ? '👋 ¡Bienvenido al panel!' : '❓ Cómo se usa'}</h2>
      <div class="ayuda-pasos">
        <div><b>▶ Correr</b><span>Arranca esa cuenta YA, en su propia máquina (no espera cola). Si ya corría, la nueva la reemplaza para completar lo que falte.</span></div>
        <div><b>⏹ Parar</b><span>La para en 1–3 minutos, guardando todo. Las otras cuentas de su máquina siguen.</span></div>
        <div><b>⋯ Más</b><span>Arreglar lo que falta · solo tests &lt; 100 · explorar el nivel · solo revisar · historial · ritmo propio · quitarla.</span></div>
        <div><b>＋ Cuenta</b><span>Agrega una persona y la corre al toque, sin cancelar lo que ya corre.</span></div>
        <div><b>🔎 Filtros</b><span>Busca por nombre o curso; toca “Les falta” para ver solo las que no están en 100/100.</span></div>
        <div><b>⇣ Tirar hacia abajo</b><span>Actualiza. Solo se actualiza cada 20 s mientras lo miras.</span></div>
        <div><b>💚 Salud</b><span>Qué tan bien le va al bot en esa cuenta (100 = nada falló). ❤️‍🩹 = hay que mirar el tablero.</span></div>
        <div><b>🔔 Avisos</b><span>En ⚙ Ajustes: el teléfono vibra distinto si una cuenta termina (2 toques), se traba (3 largos) o llega a 100/100 (fiesta).</span></div>
        <div><b>📲 Como app</b><span>En el navegador: Compartir → “Agregar a inicio”. Así abre en pantalla completa y funciona aunque se corte el internet (muestra el panel; los datos llegan al volver).</span></div>
        <div><b>💬 Sin el panel</b><span>En el issue del tablero puedes escribir <code>/correr 3</code>, <code>/parar 3</code>, <code>/explorar 3</code> o <code>/auditoria 3</code>.</span></div>
      </div><button class="btn grande verde" id="b-ok-ayuda">Entendido</button>`);
    const fin = () => { cerrarHoja(); if (primera) { S.cfg.visto = 1; escribir(S.cfg); } };
    $('.cerrar-hoja').onclick = fin; $('#b-ok-ayuda', h).onclick = fin;
  }
  function formAgregar() {
    const h = hoja(`<h2>＋ Agregar cuenta</h2><form id="f-ag" autocomplete="off">
      <label>Usuario de ED <input name="u" required autocapitalize="off" spellcheck="false"></label>
      <label>Contraseña de ED <input name="p" type="password" required autocomplete="off"></label>
      <label>Nombre (lo que se ve en el tablero) <input name="n" placeholder="Apodo o nombre" spellcheck="false"></label>
      <label style="display:flex;gap:10px;align-items:center;font-weight:600"><input type="checkbox" name="ya" checked style="width:auto;margin:0"> Correrla ya</label>
      <button class="btn grande verde">Agregar</button></form>`);
    $('.cerrar-hoja').onclick = cerrarHoja;
    $('#f-ag', h).onsubmit = async ev => {
      ev.preventDefault(); const f = ev.target;
      const linea = [f.u.value.trim(), f.p.value.trim(), f.n.value.trim().replace(/\s+/g, ' ')].filter(Boolean).join(' ');
      if (/\s/.test(f.u.value.trim()) || /\s/.test(f.p.value.trim())) return aviso('El usuario y la contraseña no pueden tener espacios');
      // NUEVO v21.18 (idea 30): ¿esa persona ya está en la lista? → no se duplica (se corre la que ya está)
      const dup = cuentasDeLista(S.lista).find(x => x.user.toLowerCase() === f.u.value.trim().toLowerCase());
      if (dup) { cerrarHoja(); aviso(`Ese usuario ya está (línea ${dup.n}, ${dup.nombre}) → toca ▶ en su tarjeta`, 6000); return; }
      const ya = f.ya.checked; cerrarHoja();
      const c = await pedirClave('Agregar la cuenta' + (ya ? ' y correrla' : '')); if (!c) return;
      try {
        const nueva = S.lista.concat([linea]); await subirLista(nueva); S.lista = nueva; await guardarCaja(c);
        const n = cuentasDeLista(S.lista).slice(-1)[0].n;
        aviso(`✓ Cuenta agregada (línea ${n})`);
        if (ya) { const a = ajustes(); vibrar(); await gh('POST', `/repos/${repo()}/actions/workflows/nube.yml/dispatches`, { ref: S.rama, inputs: { cuentas: n, modo: a.modo, minutos: String(a.minutos), ritmo: String(a.ritmo), por_maquina: '1' } }); aviso(`▶ La cuenta ${n} arranca ya, en su propia máquina`); }
        pintar(); setTimeout(() => refrescar(true), 8000);
      } catch (e) { aviso('⚠ ' + e.message, 6000); }
    };
  }

  // ---------------------------------------------------------------- arranque y eventos
  async function entrar(clave) {
    const o = JSON.parse(await Cripto.descifrar(S.cfg.caja, clave));
    S.token = o.token; S.lista = o.lista || [];
    try { const r = await gh('GET', `/repos/${repo()}`); S.rama = r.default_branch || 'main'; } catch (e) { if (e.status === 401) throw new Error('El token ya no sirve (¿venció?). Bórralo en ⚙ y configúralo de nuevo.'); }
    vista('v-app'); pintar(); refrescar();
    clearInterval(S.reloj); S.reloj = setInterval(() => { if (!document.hidden) refrescar(true); }, 20000);
    const acc = qs.get('accion'); if (acc === 'todas') setTimeout(() => $('#b-todas').click(), 400);
    if (!S.cfg.visto) setTimeout(() => ayuda(true), 600);   // NUEVO v21.18 (idea 97)
  }
  function bloquear() { S.token = null; S.lista = []; clearInterval(S.reloj); vista('v-abrir'); $('#abrir-repo').textContent = S.cfg.repo || ''; }

  document.addEventListener('DOMContentLoaded', () => {
    if (!S.cfg.caja) vista('v-setup'); else bloquear();
    $('#f-setup').onsubmit = async ev => {
      ev.preventDefault(); const f = ev.target, e = $('#e-setup'); e.textContent = '';
      if (f.c1.value !== f.c2.value) return void (e.textContent = 'Las claves no son iguales');
      S.token = f.token.value.trim(); S.cfg.repo = f.repo.value.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
      S.lista = f.lista.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      try { const r = await gh('GET', `/repos/${S.cfg.repo}`); if (!r.permissions || !r.permissions.push) { /* fine-grained: no siempre trae permissions */ } }
      catch (err) { return void (e.textContent = 'GitHub no acepta ese token para ese repo: ' + err.message); }
      const clave = f.c1.value; await guardarCaja(clave); f.reset();
      try { await entrar(clave); aviso('✓ Listo: el panel quedó guardado (cifrado) en este teléfono'); } catch (err) { bloquear(); aviso('⚠ ' + err.message, 6000); }
    };
    $('#f-abrir').onsubmit = async ev => { ev.preventDefault(); const f = ev.target; $('#e-abrir').textContent = '';
      try { await entrar(f.clave.value); f.reset(); } catch (e) { $('#e-abrir').textContent = e.message && !/operation|decrypt/i.test(e.message) ? e.message : 'Clave incorrecta'; } };
    $('#b-cerrar').onclick = bloquear; $('#b-refrescar').onclick = () => refrescar();
    // NUEVO v21.17: vista compacta (40 cuentas en una pantalla), avisos y parar todo
    $('#b-vista').onclick = () => { S.cfg.compacto = !S.cfg.compacto; escribir(S.cfg); pintar(); };
    $('#b-avisos').onclick = async () => { try { const p = await Notification.requestPermission(); aviso(p === 'granted' ? '🔔 Listo: te aviso aquí cuando una cuenta termine o se trabe' : 'El navegador no dio permiso para avisos'); } catch (e) { aviso('Este navegador no tiene avisos'); } };
    $('#b-parar-todo').onclick = async () => { const act = S.runs.filter(r => r.status !== 'completed'); if (!act.length) return aviso('No hay nada corriendo');
      const c = await pedirClave(`Parar TODO (${act.length} corrida${act.length === 1 ? '' : 's'})`); if (!c) return;
      let n = 0; for (const r of act) { try { await gh('POST', `/repos/${repo()}/actions/runs/${r.id}/cancel`); n++; } catch (e) {} }
      aviso(`⏹ ${n} corrida(s) paradas. Lo hecho en ED queda guardado.`); setTimeout(() => refrescar(true), 6000); };
    $$('.tabs button').forEach(b => b.onclick = () => { $$('.tabs button').forEach(x => x.classList.toggle('activo', x === b)); $$('.pestana').forEach(p => { p.hidden = p.id !== b.dataset.t; });
      if (b.dataset.t === 't-ajustes') { const a = ajustes(), f = $('#f-ajustes'); for (const k of ['modo', 'minutos', 'ritmo', 'por_maquina']) f[k].value = a[k]; $('#f-lista').lista.value = S.lista.join('\n'); } });
    $('#b-todas').onclick = () => correr('todas', `TODAS las cuentas (${todasLasCuentas().length})`);
    $('#b-agregar').onclick = formAgregar;
    $('#lista-cuentas').onclick = ev => {
      const art = ev.target.closest('.cuenta'); if (!art) return; const id = art.dataset.id;
      if (ev.target.classList.contains('marca')) { if (ev.target.checked) S.sel.add(id); else S.sel.delete(id); pintar(); return; }
      const a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'correr') correr(id, 'la cuenta ' + id, extraDe(id));
      if (a.dataset.a === 'mas') mas(id);
      if (a.dataset.a === 'parar') parar([id]);
      if (a.dataset.a === 'reiniciar') correr(id, 'otra vez la cuenta ' + id + ' (la que corre se para sola y entra la nueva)', extraDe(id));
      if (a.dataset.a === 'tablero') tablero(id);
    };
    $('#lista-corridas').onclick = async ev => { const b = ev.target.closest('[data-run]'); if (!b) return; const c = await pedirClave('Cancelar esa corrida entera'); if (!c) return;
      try { await gh('POST', `/repos/${repo()}/actions/runs/${b.dataset.run}/cancel`); aviso('⏹ Corrida cancelada'); setTimeout(() => refrescar(true), 5000); } catch (e) { aviso('⚠ ' + e.message); } };
    $('#b-correr-sel').onclick = () => { const ids = [...S.sel]; S.sel.clear(); correr(ids.join(','), `${ids.length} cuenta(s): ${ids.join(', ')}`); };
    $('#b-parar-sel').onclick = () => { const ids = [...S.sel]; S.sel.clear(); parar(ids); };
    $('#b-sel-x').onclick = () => { S.sel.clear(); pintar(); };
    $('#f-ajustes').onsubmit = ev => { ev.preventDefault(); const f = ev.target; S.cfg.ajustes = { modo: f.modo.value, minutos: f.minutos.value, ritmo: f.ritmo.value, por_maquina: f.por_maquina.value }; escribir(S.cfg); aviso('✓ Guardado'); };
    $('#f-lista').onsubmit = async ev => { ev.preventDefault(); const nueva = ev.target.lista.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      const prob = revisarLista(nueva); if (prob.length && !(await confirmar('⚠ Revisa la lista', prob, 'Subir igual'))) return;   // NUEVO v21.18 (idea 30)
      const c = await pedirClave('Subir la lista a GitHub (ED_CUENTAS)'); if (!c) return;
      try { await subirLista(nueva); S.lista = nueva; await guardarCaja(c); aviso(`✓ ED_CUENTAS actualizado (${cuentasDeLista(nueva).length} cuentas)`); pintar(); } catch (e) { aviso('⚠ ' + e.message, 6000); } };
    $('#b-cambiar-clave').onclick = async () => { const c = await pedirClave('Primero tu clave actual'); if (!c) return;
      const h = hoja('<h2>Clave nueva</h2><form id="f-cc"><label>Nueva <input name="a" type="password" minlength="6" required></label><label>Repite <input name="b" type="password" minlength="6" required></label><button class="btn grande verde">Cambiar</button></form>');
      $('.cerrar-hoja').onclick = cerrarHoja;
      $('#f-cc', h).onsubmit = async ev => { ev.preventDefault(); const f = ev.target; if (f.a.value !== f.b.value) return aviso('No son iguales'); await guardarCaja(f.a.value); cerrarHoja(); aviso('✓ Clave cambiada'); }; };
    $('#b-olvidar').onclick = async () => { if (!confirm('¿Borrar el token y la lista de este teléfono? (en GitHub no se borra nada)')) return; localStorage.removeItem(K); location.reload(); };
    $('#hoja').onclick = ev => { if (ev.target.id === 'hoja') cerrarHoja(); };
    // NUEVO v21.18: buscar / filtros / orden / ayuda
    const fl = () => (S.cfg.filtro = S.cfg.filtro || {});
    $('#buscar').value = (S.cfg.filtro || {}).q || ''; $('#orden').value = (S.cfg.filtro || {}).orden || '';
    $('#buscar').oninput = ev => { fl().q = ev.target.value; escribir(S.cfg); pintar(); };
    $('#orden').onchange = ev => { fl().orden = ev.target.value; escribir(S.cfg); pintar(); };
    $('#chips').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; fl().k = b.dataset.k; escribir(S.cfg); vibrar(); pintar(); };
    $('#b-ayuda').onclick = () => ayuda(false);
    // NUEVO v21.18 (idea 70): tirar hacia abajo para actualizar
    const ind = $('#tirar'); let y0 = null;
    document.addEventListener('touchstart', e => { y0 = S.token && window.scrollY <= 0 && $('#hoja').hidden && !$('#v-app').hidden ? e.touches[0].clientY : null; }, { passive: true });
    document.addEventListener('touchmove', e => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy <= 0) return; ind.hidden = false; ind.style.transform = `translate(-50%, ${Math.min(dy / 2, 80)}px) rotate(${dy * 2}deg)`; ind.classList.toggle('listo', dy > 140); }, { passive: true });
    document.addEventListener('touchend', () => { if (y0 == null) return; const listo = ind.classList.contains('listo'); ind.hidden = true; ind.style.transform = ''; ind.classList.remove('listo'); y0 = null; if (listo) { vibrar(); refrescar(); } });
    // NUEVO v21.18 (idea 66): funciona sin internet (el panel abre igual; los datos llegan al volver)
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
    window.addEventListener('offline', () => aviso('📴 Sin internet: te muestro lo último que vi', 5000));
    window.addEventListener('online', () => { aviso('📶 Volvió el internet'); refrescar(true); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) S.oculto = Date.now(); else if (S.token && S.oculto && Date.now() - S.oculto > 15 * 60000) bloquear(); });
  });
})();
