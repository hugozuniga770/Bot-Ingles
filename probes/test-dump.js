/* =====================================================================
   probes/test-dump.js — RADIOGRAFÍA de una pantalla de TEST (SOLO LECTURA)
   ---------------------------------------------------------------------
   No hace clic, no arrastra, no guarda nada. Captura de una vez:
     A) el DnD de los tests (.droptarget / .draggable / .draggableContainer)
     B) las pestañas "Your Answer" / "Correct Answer" (solo existen en el Review)
     C) la barra de abajo: la flechita "<", el contador "5 / 10" y la ">"
     D) [v2] CUALQUIER tipo de pregunta: inventario de clases, controles y HTML de la zona de la pregunta
   Úsala en (una de cada TIPO distinto que veas en el test):
     1) la pregunta del test, ANTES de contestarla
     2) esa misma pregunta en el Review, con "Correct Answer" ACTIVA (púlsala tú a mano)
   Copia un JSON al portapapeles → pégamelo en el chat (los dos).
   ===================================================================== */
(() => {
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const txt = e => (e ? e.textContent || '' : '').replace(/\s+/g, ' ').trim();
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed'); };
  const cls = e => (e && typeof e.className === 'string' ? e.className : '').trim();
  const html = (e, n = 600) => (e ? e.outerHTML.replace(/\s+/g, ' ').slice(0, n) : null);
  const attrs = e => Object.fromEntries([...(e.attributes || [])].filter(a => a.name !== 'class' && a.name !== 'style').map(a => [a.name, a.value.slice(0, 60)]));
  const chain = e => { const out = []; for (let n = e, i = 0; n && n !== document.body && i < 5; n = n.parentElement, i++) out.push(n.tagName.toLowerCase() + (cls(n) ? '.' + cls(n).split(/\s+/).join('.') : '')); return out; };
  const rect = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(','); };
  const listeners = e => { try { return typeof getEventListeners === 'function' ? Object.keys(getEventListeners(e)) : 'n/a'; } catch (_) { return 'n/a'; } };

  // ---- A) DnD de tests ----
  const targets = qa('.droptarget').map((e, i) => ({ i, visible: vis(e), clase: cls(e), attrs: attrs(e), texto: txt(e).slice(0, 60), rect: rect(e), hijos: [...e.children].map(c => c.tagName.toLowerCase() + '.' + cls(c).split(/\s+/).join('.') + ' "' + txt(c).slice(0, 25) + '"'), cadena: chain(e).slice(1, 4) }));
  const drags = qa('.draggable').map((e, i) => ({ i, visible: vis(e), clase: cls(e), attrs: attrs(e), texto: txt(e).slice(0, 40), rect: rect(e), dentroDeDroptarget: !!e.closest('.droptarget'), contenedor: cls(e.closest('.draggableContainer')).slice(0, 80) }));
  const conts = qa('.draggableContainer').map((e, i) => ({ i, clase: cls(e), attrs: attrs(e), texto: txt(e).slice(0, 40), rect: rect(e), padre: cls(e.parentElement).slice(0, 80) }));
  const d0 = qa('.draggable')[0], t0 = qa('.droptarget')[0];
  const dnd = {
    targets, drags, conts,
    ejemploDroptarget: html(t0), ejemploDraggable: html(d0), ejemploContenedor: html(qa('.draggableContainer')[0]),
    cadenaDraggable: d0 ? chain(d0) : null,
    eventosDraggable: d0 ? listeners(d0) : null, eventosDocumento: listeners(document),
    jqueryUI: !!(window.jQuery && window.jQuery.ui), jqueryDataDraggable: d0 && window.jQuery ? Object.keys(window.jQuery(d0).data() || {}) : null
  };

  // ---- B) pestañas del Review (texto EXACTO, como las busca el bot) ----
  const RE_TAB = /^\W*(correct\s*answers?|respuestas?\s*correctas?|your\s*answers?|(tus?|su|mis)\s*respuestas?)(\s*\(?\d+\)?)?\W*$/i;
  const tabs = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode, p = n.parentElement; const t = (n.nodeValue || '').trim(); if (p && t && t.length < 40 && RE_TAB.test(t)) tabs.push({ texto: t, visible: vis(p), elemento: html(p, 300), padre: html(p.parentElement, 500), cadena: chain(p) }); }
  qa('input[type=button], input[type=submit]').forEach(i => { if (RE_TAB.test((i.value || '').trim())) tabs.push({ texto: i.value, visible: vis(i), elemento: html(i, 300) }); });

  // ---- C) barra de abajo (flechita "<", contador y ">") ----
  const nx = document.querySelector('a.tasksBtnext') || document.querySelector('.learning__nextItemLink') || document.querySelector('.learning__submitTestLink');
  let bar = nx; for (let i = 0; bar && i < 3 && bar.parentElement && bar.parentElement !== document.body; i++) bar = bar.parentElement;
  const barra = { next: html(nx, 300), barra: html(bar, 1500), botones: bar ? qa('a, button', bar).map(b => ({ clase: cls(b), texto: txt(b).slice(0, 20), visible: vis(b), rect: rect(b) })) : [] };

  // ---- D) [v2] zona de la pregunta, sirva para cualquier tipo ----
  const fuera = e => !!e.closest('.learning__header, .learning__headerW, [class*="dropDownList"], .learning__allToolsW, #ed-autopilot-hud, header');
  const visibles = qa('body *').filter(e => vis(e) && !fuera(e));
  const clases = {};
  visibles.forEach(e => cls(e).split(/\s+/).filter(Boolean).forEach(c => { clases[c] = (clases[c] || 0) + 1; }));
  const topClases = Object.fromEntries(Object.entries(clases).sort((a, b) => b[1] - a[1]).slice(0, 90));
  const ctrlSel = 'input, select, textarea, [contenteditable="true"], .draggable, .droptarget, label, [role="radio"], [role="checkbox"], [role="option"]';
  const ctrls = qa(ctrlSel).filter(e => vis(e) && !fuera(e));
  const controles = {};
  ctrls.forEach(e => { const k = e.tagName.toLowerCase() + (e.type ? '[' + e.type + ']' : '') + (cls(e) ? '.' + cls(e).split(/\s+/)[0] : ''); controles[k] = (controles[k] || 0) + 1; });
  // ancestro común de los controles = la "caja" de la pregunta
  let caja = null;
  if (ctrls.length) { caja = ctrls[0]; while (caja && !ctrls.every(c => caja.contains(c))) caja = caja.parentElement; }
  const limpio = e => { if (!e) return null; const c = e.cloneNode(true); qa('script, style, svg, img', c).forEach(x => x.remove()); qa('*', c).forEach(x => [...x.attributes].forEach(a => { if (/^(_ng|ng-|style$|src$|href$)/.test(a.name)) x.removeAttribute(a.name); })); return c.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').slice(0, 5000); };
  // v3: si no hay controles (desplegables viejos, etc.), usar la zona de respuestas como caja
  if (!caja) caja = document.querySelector('.answersWrapper') || document.querySelector('.pmContainer');
  const pregunta = { controles, clases: topClases, cajaCadena: caja ? chain(caja) : null, cajaHTML: limpio(caja) };

  const out = {
    url: location.href.slice(0, 100),
    leccion: txt(document.querySelector('.learning__dropDownListTitleW--lessons')),
    step: txt(document.querySelector('.learning__dropDownListTitleW--steps')),
    contador: ((document.body.innerText || '').match(/(\d{1,2})\s*\/\s*(\d{1,2})(?![:\d])/g) || []).pop() || null,
    instruccion: txt(document.querySelector('.learning__headerIW')),
    pregunta, dnd, tabs, barra,
    bot: window.__ed ? { version: window.__ed._v, kind: (() => { try { return window.__ed.kind(); } catch (e) { return 'error'; } })() } : null
  };
  console.log('%c[ED test-dump]', 'color:#3498db;font-weight:bold', out);
  console.table(targets.map(t => ({ i: t.i, visible: t.visible, texto: t.texto, clase: t.clase.slice(0, 40), hijos: t.hijos.join(' | ').slice(0, 60) })));
  console.table(drags.map(d => ({ i: d.i, visible: d.visible, texto: d.texto, enHueco: d.dentroDeDroptarget, clase: d.clase.slice(0, 40) })));
  try { copy(JSON.stringify(out, null, 1)); console.log('📋 Copiado al portapapeles. Pégalo en el chat.'); }
  catch (e) { console.log('No pude copiar; clic derecho sobre el objeto de arriba → Copy object.'); }
  return out;
})();
