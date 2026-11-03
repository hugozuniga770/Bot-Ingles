// =====================================================================
//  MANOS — teclado y mouse "de verdad" cuando el bot corre en la nube (y teclado completo en tu PC)
// ---------------------------------------------------------------------
//  NUEVO v21.16. Algunas pantallas de ED no "ven" lo que el bot escribe o arrastra con eventos simulados:
//   • "Personalized writing" (corregir el e-mail, writingEditFrame): el bot agregaba una "s" a 5 campos (editados: 5)
//     y ED NO marcaba la tarea (Maria, Luis, Thiago, Nore: U10 L3 · Step 4, "I'm an Extrovert!" · Step 7,
//     "The Experience of a Lifetime" · Step 3). Hugo: "ejemplo 'was' ahí añádele 'wasa' y ya sale completo" — él
//     TECLEA. El bot ponía el valor de golpe (sin keydown/keypress) y ED escucha el teclado.
//  En la nube, cloud/runner.js le da al bot window.__edReal(op): Playwright mueve el mouse y teclea como una persona
//  (eventos reales del navegador, isTrusted). En tu PC (consola/Tampermonkey) no existe → se usa el teclado simulado
//  COMPLETO: keydown → keypress → beforeinput → insertText → input → keyup, y luego el campo pierde el foco.
//  DEPENDE DE: utils/dom.js, utils/drag.js (dropPoint)
//  EXPONE:     Manos
// =====================================================================

class Manos {
  static hay() { return typeof window.__edReal === 'function'; }
  static async real(op) {
    try { const r = await window.__edReal(op); return r || { ok: true }; } catch (e) { return { ok: false, error: String((e && e.message) || e).slice(0, 120) }; }
  }

  // escribir `texto` AL FINAL de un input/textarea. Devuelve cómo lo hizo ('real' | 'simulado' | null)
  static async teclear(el, texto) {
    if (!el) return null;
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
    const v0 = el.value || '';
    try { el.focus(); } catch (e) {}
    try { const n = (el.value || '').length; el.setSelectionRange(n, n); } catch (e) {}
    if (this.hay() && document.activeElement === el) {
      const r = await this.real({ tipo: 'teclear', texto });
      await sleep(200);
      if (r && r.ok !== false && (el.value || '') !== v0) return 'real';
    }
    this.teclearSimulado(el, texto);
    return (el.value || '') !== v0 ? 'simulado' : null;
  }

  static teclearSimulado(el, texto) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    const tecla = (tipo, ch, codigo) => {
      const e = new KeyboardEvent(tipo, { key: ch, code: /[a-z]/i.test(ch) ? 'Key' + ch.toUpperCase() : '', bubbles: true, cancelable: true, composed: true, view: window });
      // keyCode/which/charCode no se pueden poner en el constructor: se definen en el evento (jQuery los lee de ahí)
      for (const [k, val] of [['keyCode', codigo], ['which', codigo], ['charCode', tipo === 'keypress' ? ch.charCodeAt(0) : 0]]) { try { Object.defineProperty(e, k, { get: () => val }); } catch (_) {} }
      return el.dispatchEvent(e);
    };
    try { el.focus(); } catch (e) {}
    for (const ch of String(texto)) {
      const kc = ch.toUpperCase().charCodeAt(0);
      tecla('keydown', ch, kc);
      tecla('keypress', ch, ch.charCodeAt(0));
      const antes = el.value || '';
      let ok = false;
      try { ok = document.execCommand && document.execCommand('insertText', false, ch) && (el.value || '') !== antes; } catch (e) { ok = false; }
      if (!ok) {
        try { el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: ch })); } catch (e) {}
        setter.call(el, antes + ch);
        try { el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch })); } catch (e) { el.dispatchEvent(new Event('input', { bubbles: true })); }
      }
      tecla('keyup', ch, kc);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // el campo pierde el foco "de verdad" (blur + focusout reales) para que ED registre el cambio
  static soltarFoco(el) {
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    try { el.blur(); } catch (e) {}
    try { if (document.activeElement === el) document.body.focus(); } catch (e) {}
  }

  // arrastre con el mouse real (solo en la nube). true si Playwright lo hizo
  static async arrastrar(src, dst) {
    if (!this.hay() || !src || !dst) return false;
    try { src.scrollIntoView({ block: 'center' }); } catch (e) {}
    await sleep(200);
    const sr = src.getBoundingClientRect();
    const { x, y } = dropPoint(dst);
    const r = await this.real({ tipo: 'arrastrar', de: [Math.round(sr.left + sr.width / 2), Math.round(sr.top + sr.height / 2)], a: [Math.round(x), Math.round(y)], pasos: 18 });
    await sleep(600);
    return !!(r && r.ok !== false);
  }

  // clic con el mouse real en el centro de un elemento (solo en la nube)
  static async clic(el) {
    if (!this.hay() || !el) return false;
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
    await sleep(150);
    const r = el.getBoundingClientRect();
    const res = await this.real({ tipo: 'clic', x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
    return !!(res && res.ok !== false);
  }
}
