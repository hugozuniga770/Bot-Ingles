// =====================================================================
//  GUÍA — cierra la "guía" de ED (globito con "Got it!" y "Don't show again") que TAPA la página
// ---------------------------------------------------------------------
//  NUEVO v21.16. Causa encontrada en los 6 zips del 02/11 (Nore, UPB High Intermediate 2): en 20 reportes había un
//  globito de la librería driver.js (button.driver-popover-next-btn "Got it!", label #dontShowAgainLbl "Don't show
//  again", input #dontShowAgainCbx, y learning__main con la clase driver-active-element). Mientras ese globito está
//  abierto, driver.js deja TODA la página con pointer-events: none (solo se puede tocar el globito) → los
//  arrastres del bot "caían" en la nada: 7 de 9 DnD sin marcar (reverseColumn "Drag Here" a la izquierda y la tabla
//  True/False de "Career Advisor", "Read again" de "Eco-vacation"), la secuencia del test "Let's review" (replay
//  ok:false → tests en 84 %, 75 %…) y "Preparing for branching speaking". Hugo, en su PC, ya había cerrado ese
//  globito (o marcado "Don't show again") → para él los mismos ejercicios funcionaban.
//  Qué hace: si hay una guía abierta → marca "Don't show again", pulsa "Got it!" (o Done / Close / la X) y VERIFICA
//  que se cerró; si no, Escape; si tampoco, clic en el fondo oscuro; último recurso: quita las capas a mano.
//  Lo llama MainEngine.step() en cada paso (es barato: si no hay guía, no hace nada).
//  DEPENDE DE: utils/dom.js, utils/press.js, utils/logger.js
//  EXPONE:     Guia
// =====================================================================

class Guia {
  // ¿hay una guía/tour abierta encima de la página?
  static abierta() {
    const b = document.body, h = document.documentElement;
    if (qav('.driver-popover, #driver-popover-content, #driver-popover-item, .introjs-tooltip, .shepherd-element').length) return true;
    if ((b && /\bdriver-active\b/.test(b.className)) || (h && /\bdriver-active\b/.test(h.className))) return !!qv('.driver-popover-next-btn, .driver-popover-done-btn, .driver-popover-close-btn, .driver-overlay, #driver-page-overlay');
    return !!qv('.driver-popover-next-btn, .driver-popover-done-btn');
  }

  // lo que el reporte guarda de la guía (para entenderla si alguna no se deja cerrar)
  static info() {
    try {
      const p = q('.driver-popover, #driver-popover-content, #driver-popover-item, .introjs-tooltip, .shepherd-element');
      const act = qa('.driver-active-element, .driver-highlighted-element').slice(0, 3).map(e => (typeof e.className === 'string' ? e.className : '').slice(0, 80));
      const capas = qa('.driver-overlay, #driver-page-overlay, .driver-popover, .introjs-overlay').length;
      if (!p && !act.length && !capas) return null;
      return { abierta: this.abierta(), texto: p ? txt(p).slice(0, 300) : '', html: p ? p.outerHTML.replace(/\s+/g, ' ').slice(0, 1500) : '', resaltado: act,
        bodyClase: (document.body.className || '').slice(0, 120), capas, cerradas: this._n || 0 };
    } catch (e) { return null; }
  }

  static async cerrar() {
    if (!this.abierta()) return null;
    const intentos = [];
    const cerrada = () => !this.abierta();
    const texto = txt(q('.driver-popover, .introjs-tooltip, .shepherd-element')).slice(0, 120);
    log('🪧 Hay una guía de ED tapando la página ("' + texto.slice(0, 60) + '") → la cierro');
    // 1) "Don't show again" (así no vuelve a salir en esta cuenta)
    const cb = q('#dontShowAgainCbx') || qa('.driver-popover input[type="checkbox"]')[0];
    if (cb && !cb.checked) {
      const lb = q('#dontShowAgainLbl') || (cb.id && q('label[for="' + cb.id + '"]'));
      if (await press(cb, () => cb.checked, 800) || (lb && await press(lb, () => cb.checked, 800))) intentos.push('no_mostrar');
      else { try { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); intentos.push('no_mostrar(forzado)'); } catch (e) {} }
    }
    // 2) los botones de la guía, de a uno, verificando (una guía de varios globitos: "Got it!" pasa al siguiente → otra vuelta)
    for (let vuelta = 0; vuelta < 5 && !cerrada(); vuelta++) {
      const firma = txt(q('.driver-popover, .introjs-tooltip, .shepherd-element'));
      const botones = [...qa('.driver-popover-next-btn, .driver-popover-done-btn, .driver-popover-close-btn, .driver-close-btn, .driver-next-btn, .introjs-donebutton, .introjs-skipbutton, .shepherd-cancel-icon'),
        ...qa('.driver-popover button, .driver-popover a').filter(b => /got it|ok|entendido|close|cerrar|done|listo|skip|omitir/i.test(txt(b) + ' ' + (b.getAttribute('aria-label') || '')))].filter((b, i, a) => vis(b) && a.indexOf(b) === i);
      let avanzo = false;
      for (const b of botones) {
        const cambio = () => cerrada() || txt(q('.driver-popover, .introjs-tooltip, .shepherd-element')) !== firma;
        if (await press(b, cambio, 1500)) { intentos.push('boton:' + ((typeof b.className === 'string' && b.className.split(' ')[0]) || b.tagName.toLowerCase())); avanzo = true; break; }
      }
      if (!avanzo) break;
    }
    // 3) Escape (driver.js lo escucha en window/document)
    if (!cerrada()) {
      for (const t of [window, document]) { try { for (const ty of ['keydown', 'keyup']) t.dispatchEvent(new KeyboardEvent(ty, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true })); } catch (e) {} }
      if (await waitFor(cerrada, 1200, 200)) intentos.push('escape');
    }
    // 4) clic en el fondo oscuro
    if (!cerrada()) {
      const ov = qv('.driver-overlay, #driver-page-overlay, .introjs-overlay');
      if (ov && await press(ov, cerrada, 1200)) intentos.push('fondo');
    }
    // 5) último recurso: quitar las capas (la página vuelve a recibir clics y arrastres)
    if (!cerrada()) {
      qa('.driver-popover, .driver-overlay, #driver-page-overlay, #driver-popover-item, .introjs-overlay, .introjs-tooltip').forEach(e => { try { e.remove(); } catch (_) {} });
      for (const e of [document.body, document.documentElement]) { if (e) e.className = e.className.replace(/\bdriver-(active|fade|simple|no-interaction)\b/g, ' ').replace(/\s+/g, ' ').trim(); }
      qa('.driver-active-element').forEach(e => e.classList.remove('driver-active-element'));
      intentos.push('capas_quitadas');
    }
    this._n = (this._n || 0) + 1;
    const ok = cerrada();
    log(ok ? '🪧 Guía cerrada (' + intentos.join(', ') + ')' : '🪧 No pude cerrar la guía', intentos);
    await sleep(500);
    return { guia: ok ? 'cerrada' : 'sigue', intentos, texto };
  }

  // NUEVO v21.16 (idea 13 de Hugo) — VENTANA DESCONOCIDA: un popup que el bot no conoce y que tapa la página (diálogo,
  // modal...). Se guarda su dump UNA vez (reporte popup_desconocido) y se pulsa SOLO un botón inofensivo: OK / Close /
  // Aceptar / Cerrar / Got it / Entendido / ×. Nunca el aviso "You haven't submitted your test" (ese lo maneja el engine).
  static async popup() {
    const cands = qav('[role="dialog"], [role="alertdialog"], .modal.show, .modal.in, .ui-dialog, .swal2-popup, .popupWrapper')
      .filter(e => !e.closest('#ed-autopilot-hud, .driver-popover') && !q('#btnOk', e) && !e.closest('.modalW_confirm, .modalW_alert, #alertModal, .confirmPopup__main'));
    for (const p of cands) {
      const r = p.getBoundingClientRect(); if (r.width * r.height < innerWidth * innerHeight * 0.04) continue;
      const t = txt(p); if (/submitted your test|no has enviado|exit now|log ?out|cerrar sesi/i.test(t)) continue;
      const b = qa('button, a, input[type="button"], input[type="submit"], [role="button"]', p).filter(vis)
        .find(x => /^(ok|okay|close|cerrar|aceptar|accept|got it!?|entendido|listo|done|×|✕|x)$/i.test(String(txt(x) || x.value || x.getAttribute('aria-label') || '').trim()));
      if (!b) continue;
      this._vistos = this._vistos || new Set();
      const firma = t.slice(0, 80);
      if (!this._vistos.has(firma)) { this._vistos.add(firma); Reporter.capture('popup_desconocido', { texto: t.slice(0, 300), boton: txt(b) || b.value || '', html: p.outerHTML.replace(/\s+/g, ' ').slice(0, 2000) }); }
      const ok = await press(b, () => !p.isConnected || !vis(p), 1500);
      log('🪟 Ventana desconocida ("' + t.slice(0, 50) + '") → ' + (txt(b) || b.value || 'botón') + (ok ? ' ✓' : ' ✗'));
      return { popup: ok ? 'cerrada' : 'sigue', texto: t.slice(0, 80) };
    }
    return null;
  }
}
