// =====================================================================
//  SCROLL DENTRO DE CAJAS — cajas con barra propia de ED (mCustomScrollbar)
// ---------------------------------------------------------------------
//  NUEVO v20.2. En algunas preguntas (ej. el e-mail para completar) el texto está en una
//  caja con scroll propio: las fichas/huecos de abajo existen pero están TAPADOS, y el
//  motor de arrastre (que solo mira la ventana) soltaba encima de otra cosa.
//  revealInBox(el): 1) API de mCustomScrollbar (jQuery) → 2) scrollIntoView como respaldo.
//  Lo usa: DnDSolver.placeDndMapping (replay de tests). El DnD de práctica NO lo usa todavía.
//  DEPENDE DE: utils/dom.js
//  EXPONE:     revealInBox
// =====================================================================

async function revealInBox(el) {
  if (!el || !el.closest) return false;
  const box = el.closest('.mCustomScrollbar');
  const visibleEnCaja = () => {
    const area = box ? (box.querySelector('.mCustomScrollBox') || box).getBoundingClientRect() : { top: 0, bottom: innerHeight };
    const r = el.getBoundingClientRect();
    return r.top >= area.top - 2 && r.bottom <= area.bottom + 2 && r.top >= 0 && r.bottom <= innerHeight;
  };
  if (visibleEnCaja()) return true;
  if (box && window.jQuery && window.jQuery.fn && window.jQuery.fn.mCustomScrollbar) {
    try { window.jQuery(box).mCustomScrollbar('scrollTo', el, { scrollInertia: 0, timeout: 0 }); } catch (e) {}
    await sleep(400);
    if (visibleEnCaja()) return true;
  }
  try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
  await sleep(250);
  return visibleEnCaja();
}
