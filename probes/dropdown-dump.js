/* =====================================================================
   probes/dropdown-dump.js — RADIOGRAFÍA del DESPLEGABLE VIEJO ("Select the correct answer
   from the drop-down list.") — abre el PRIMER hueco y anota qué lista aparece.
   ---------------------------------------------------------------------
   Úsala en una pregunta de ese tipo (en test, ANTES de contestar; o en práctica).
   Solo abre la lista: NO elige nada. Copia un JSON al portapapeles → pégamelo en el chat.
   ===================================================================== */
(async () => {
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const txt = e => (e ? e.textContent || '' : '').replace(/\s+/g, ' ').trim();
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed'); };
  const html = (e, n = 1500) => (e ? e.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').slice(0, n) : null);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const zona = document.querySelector('.answersWrapper.fitb, .fillInBlank, .answersWrapper') || document.body;
  const huecos = qa('.questionText', zona).filter(vis);
  const h = huecos[0];
  const antes = new Set(qa('body *').filter(vis));
  if (h) { (h.querySelector('.arrowWrapper') || h).click(); await sleep(700); }
  const nuevos = qa('body *').filter(e => vis(e) && !antes.has(e));
  const raices = nuevos.filter(e => !nuevos.includes(e.parentElement));
  const out = {
    step: txt(document.querySelector('.learning__dropDownListTitleW--steps')),
    contador: ((document.body.innerText || '').match(/(\d{1,2})\s*\/\s*(\d{1,2})(?![:\d])/g) || []).pop() || null,
    huecos: huecos.length,
    zonaHTML: html(zona, 4000),
    primerHuecoHTML: html(h, 800),
    aparecieronAlPulsar: raices.slice(0, 5).map(e => html(e, 1500)),
    textosNuevos: nuevos.map(txt).filter(Boolean).slice(0, 20),
    bot: window.__ed ? { version: window.__ed._v, kind: window.__ed.kind() } : null
  };
  console.log('%c[ED dropdown-dump]', 'color:#3498db;font-weight:bold', out);
  try { copy(JSON.stringify(out, null, 1)); console.log('📋 Copiado. Pégalo en el chat. (La lista quedó abierta: ciérrala con un clic afuera)'); } catch (e) { console.log('Copia el objeto de arriba.'); }
  return out;
})();
