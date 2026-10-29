// =====================================================================
//  MOTOR DE ARRASTRE + MODELO DnD (de v17, sin cambios)
// ---------------------------------------------------------------------
//  drag(src, dst) simula pointer/mouse down → move ×12 → up.
//  dndModel() separa el "banco" (de donde salen los elementos) de los "dests" (huecos).
//  Lo usan: exercises/sequence.js, exercises/dnd.js y tests/test-manager.js.
//  DEPENDE DE: utils/dom.js
//  EXPONE:     fire dropPoint drag dndModel bankItems zoneLabel
//  OJO: este motor es igual en TODAS las versiones (v17→v19.7). Si el DnD falla,
//  el problema casi seguro está en quién lo llama, no aquí.
// =====================================================================

// ===================================================================
//  MOTOR DE ARRASTRE ORIGINAL (VERSIÓN 17) — IGUAL
// ===================================================================
function fire(el, type, x, y, buttons = 1) {
  for (const [T, C] of [[type, window.PointerEvent || MouseEvent], [type.replace('pointer', 'mouse'), MouseEvent]]) {
    try {
      el.dispatchEvent(new C(T, Object.assign({ bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, buttons, button: 0 },
        C !== MouseEvent ? { pointerType: 'mouse', pointerId: 1, isPrimary: true } : {})));
    } catch (e) {}
  }
}

function dropPoint(dst) {
  let r = dst.getBoundingClientRect();
  const top = Math.max(r.top, 0), bot = Math.min(r.bottom, innerHeight);
  const x = r.left + r.width / 2;
  if (r.height > 150) {
    const items = qa('.dnditem', dst).filter(vis);
    const last = items[items.length - 1];
    let y = last ? last.getBoundingClientRect().bottom + 22 : top + Math.min(60, (bot - top) / 2);
    y = Math.min(Math.max(y, top + 10), bot - 10);
    return { x, y };
  }
  return { x, y: top + (bot - top) / 2 };
}

async function drag(src, dst) {
  try { src.scrollIntoView({ block: 'center' }); } catch (e) {}
  await sleep(150);
  let dr = dst.getBoundingClientRect();
  if (Math.min(dr.bottom, innerHeight) - Math.max(dr.top, 0) < 25) { try { dst.scrollIntoView({ block: 'nearest' }); } catch (e) {} await sleep(150); }
  const sr = src.getBoundingClientRect();
  const sx = sr.left + sr.width / 2, sy = sr.top + sr.height / 2;
  const { x: dx, y: dy } = dropPoint(dst);
  fire(src, 'pointerdown', sx, sy);
  await sleep(70);
  for (let k = 1; k <= 12; k++) {
    const x = sx + (dx - sx) * k / 12, y = sy + (dy - sy) * k / 12;
    fire(document.elementFromPoint(x, y) || src, 'pointermove', x, y);
    await sleep(30);
  }
  fire(document.elementFromPoint(dx, dy) || dst, 'pointerup', dx, dy, 0);
  await sleep(650);
}

// Modelo del ejercicio DnD: "banco" (donde están los elementos) y "dests" (huecos / columnas)
function dndModel() {
  const zones = qav('.dndZone');
  if (!zones.length) return null;
  let bank = qav('.dndBank')[0] || null;
  if (!bank) bank = zones.slice().sort((a, b) => qa('.dnditem', b).length - qa('.dnditem', a).length)[0];
  const dests = zones.filter(z => z !== bank && !bank.contains(z) && !z.contains(bank));
  return { bank, dests };
}
const bankItems = bank => qa('.dnditem', bank).filter(vis);

// NUEVO (de v17): "etiqueta" de una zona = texto del padre sin los elementos arrastrables.
// OJO: si varias zonas comparten padre (huecos de una misma oración) la etiqueta SALE IGUAL
// para todas → por eso placeDndMapping() solo usa etiquetas cuando son únicas.
const zoneLabel = z => { const p = z.parentElement; if (!p) return ''; const c = p.cloneNode(true); qa('.dnditem, .dndZone', c).forEach(e => e.remove()); return txt(c).slice(0, 80); };
