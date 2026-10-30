// =====================================================================
//  PRESS — clic VERIFICADO (para botones de ED que no siempre responden al primer clic)
// ---------------------------------------------------------------------
//  NUEVO v20.8. press(el, ok, espera) prueba en orden hasta que ok() sea true:
//    1) el.click()   2) secuencia completa pointer/mouse   3) jQuery(el).trigger('click')
//  Sin ok() hace solo el 1). Devuelve true si funcionó.
//  DEPENDE DE: utils/dom.js
//  EXPONE:     press
// =====================================================================

async function press(el, ok = null, espera = 1500) {
  if (!el) return false;
  const pasos = [
    () => click(el),
    () => {
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        const Ev = t.startsWith('pointer') && window.PointerEvent ? window.PointerEvent : MouseEvent;
        try { el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0, buttons: t.endsWith('down') ? 1 : 0 })); } catch (e) {}
      }
    },
    () => { if (window.jQuery) { try { window.jQuery(el).trigger('click'); } catch (e) {} } }
  ];
  if (!ok) { pasos[0](); return true; }
  for (const paso of pasos) {
    paso();
    if (await waitFor(() => { try { return ok(); } catch (e) { return false; } }, espera, 150)) return true;
  }
  return false;
}
