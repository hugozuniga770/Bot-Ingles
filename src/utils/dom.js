// =====================================================================
//  DOM — utilidades para leer y tocar la página
// ---------------------------------------------------------------------
//  Selectores cortos (q, qa, qv, qav), visibilidad (vis), texto (txt, norm, wc),
//  esperas (sleep, waitFor) y clics (click, clickInFrame, setNative).
//  DEPENDE DE: nada
//  EXPONE:     sleep q qa txt norm vis qv qav wc mcqQuestionText waitFor click clickInFrame setNative
// =====================================================================

const sleep = ms => new Promise(r => setTimeout(r, ms));
const q = (s, r = document) => { try { return r.querySelector(s); } catch (e) { return null; } };
const qa = (s, r = document) => { try { return Array.from(r.querySelectorAll(s)); } catch (e) { return []; } };
const txt = e => (e ? (e.textContent || '') : '').replace(/\s+/g, ' ').trim();
const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const vis = e => {
  if (!e || !e.getBoundingClientRect) return false;
  const r = e.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return false;
  if (e.offsetParent !== null) return true;
  try { const cs = getComputedStyle(e); return cs.position === 'fixed' && cs.visibility !== 'hidden' && cs.display !== 'none'; } catch (_) { return false; }
};
const qv = (s, r) => qa(s, r).find(vis) || null;
const qav = (s, r) => qa(s, r).filter(vis);
const wc = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;


// AJUSTADA v20.1 — RECUPERADA de v17 (questionOf, venía en v19.8): si el texto de la pregunta NO está
// dentro del set, usa la pregunta que aparece justo antes en la página. Si está dentro → igual que antes.
const mcqQuestionText = set => {
  const own = q('.prMCQ__questionText, .prMCQ__questionW, .prMCQ__question', set);
  if (own && txt(own)) return txt(own);
  const all = qav('.prMCQ__questionText, .prMCQ__questionW, .prMCQ__question');
  let best = null;
  for (const e of all) if (e.compareDocumentPosition(set) & Node.DOCUMENT_POSITION_FOLLOWING) best = e;
  return txt(best || all[0]);
};

async function waitFor(fn, timeout = 6000, every = 250) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { const v = fn(); if (v) return v; } catch (e) {}
    await sleep(every);
  }
  try { return fn() || null; } catch (e) { return null; }
}
function click(el) {
  if (!el) return false;
  try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) {}
  try { el.click(); return true; } catch (e) { return false; }
}
function clickInFrame(el) {
  try {
    const w = el.ownerDocument.defaultView; const r = el.getBoundingClientRect();
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w, clientX: r.left + 5, clientY: r.top + 5 }));
    return true;
  } catch (e) { try { el.click(); return true; } catch (_) { return false; } }
}

// NUEVO (de v17): escribe en un input/textarea de forma que la página detecte el cambio
function setNative(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  el.focus(); setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}
