/* =====================================================================
   probes/dnd-dump.js — RADIOGRAFÍA de un ejercicio Drag & Drop (SOLO LECTURA)
   ---------------------------------------------------------------------
   No hace clic, no arrastra, no guarda nada. Solo describe lo que hay en pantalla
   y lo que el bot "creería" que es el banco y los huecos.

   Úsala en DOS pantallas del MISMO test:
     1) Una pregunta DnD del test (antes de contestar).
     2) Esa misma pregunta en el Review, con la pestaña "Correct Answer" ACTIVA.
   Pega el script en la consola (F12). Copia al portapapeles un JSON → pégamelo en el chat.
   ===================================================================== */
(() => {
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const txt = e => (e ? e.textContent || '' : '').replace(/\s+/g, ' ').trim();
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed'); };
  const cls = e => (typeof e.className === 'string' ? e.className : '').trim();
  const zoneLabel = z => { const p = z.parentElement; if (!p) return ''; const c = p.cloneNode(true); qa('.dnditem, .dndZone', c).forEach(e => e.remove()); return txt(c).slice(0, 80); };

  // Lo que el bot v20 elegiría como banco (misma regla que utils/drag.js → dndModel)
  const zonesVis = qa('.dndZone').filter(vis);
  let bank = qa('.dndBank').filter(vis)[0] || null;
  const bankByRule = bank ? 'dndBank visible' : 'zona con MÁS elementos (no hay .dndBank visible)';
  if (!bank && zonesVis.length) bank = zonesVis.slice().sort((a, b) => qa('.dnditem', b).length - qa('.dnditem', a).length)[0];

  const zonas = qa('.dndZone').map((z, i) => {
    const r = z.getBoundingClientRect();
    return {
      i, visible: vis(z), esBancoSegunBot: z === bank,
      clase: cls(z).slice(0, 90), padre: cls(z.parentElement || {}).slice(0, 60),
      etiqueta: zoneLabel(z), alto: Math.round(r.height),
      items: qa('.dnditem', z).map(it => txt(it) + (vis(it) ? '' : ' [oculto]') + ' {' + cls(it).replace(/\bdnditem\b/, '').trim().slice(0, 50) + '}')
    };
  });
  const sueltos = qa('.dnditem').filter(it => !it.closest('.dndZone')).map(it => txt(it) + ' {' + cls(it).slice(0, 60) + '}');

  // Pestañas del review y su estado
  const pestañas = qa('a, button, li, span, div, input').filter(e => {
    const t = (e.value || txt(e)); return t.length < 40 && /correct\s*answer|your\s*answer|respuestas?\s*correctas?|tus?\s*respuestas?/i.test(t);
  }).filter(e => !qa('*', e).some(h => h !== e && /answer|respuesta/i.test(txt(h)))).map(e => ({
    texto: e.value || txt(e), tag: e.tagName, clase: cls(e).slice(0, 80), padre: cls(e.parentElement || {}).slice(0, 80), visible: vis(e)
  }));

  // Todas las clases que contienen "dnd", "drag" o "drop" (para descubrir markup del review)
  const clasesDnd = {};
  qa('[class]').forEach(e => cls(e).split(/\s+/).forEach(c => { if (/dnd|drag|drop/i.test(c)) clasesDnd[c] = (clasesDnd[c] || 0) + 1; }));

  const out = {
    url: location.href.slice(0, 120),
    step: txt(document.querySelector('.learning__dropDownListTitleW--steps')),
    contador: ((document.body.innerText || '').match(/(\d{1,2})\s*\/\s*(\d{1,2})(?![:\d])/g) || []).pop() || null,
    bancoSegunBot: bankByRule, hayDndBank: qa('.dndBank').length, zonasTotales: zonas.length, zonasVisibles: zonesVis.length,
    zonas, itemsFueraDeZonas: sueltos, pestañas, clasesDnd,
    botCargado: !!window.__ed, kindSegunBot: (() => { try { return window.__ed ? window.__ed.kind() : null; } catch (e) { return 'error: ' + e.message; } })()
  };

  console.log('%c[ED dnd-dump]', 'color:#3498db;font-weight:bold', out);
  console.table(zonas.map(z => ({ i: z.i, visible: z.visible, banco: z.esBancoSegunBot, alto: z.alto, etiqueta: z.etiqueta.slice(0, 30), items: z.items.join(' · ').slice(0, 80) })));
  try { copy(JSON.stringify(out, null, 1)); console.log('📋 Copiado al portapapeles. Pégalo en el chat.'); }
  catch (e) { console.log('No pude copiar automáticamente; copia el objeto de arriba (clic derecho → Copy object).'); }
  return out;
})();
