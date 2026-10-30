// =====================================================================
//  DESPLEGABLES VIEJOS — "Select the correct answer from the drop-down list." (no-Angular)
// ---------------------------------------------------------------------
//  REHECHO v20.9 con la estructura REAL (dump Lesson 5: Nouns: This/That/These/Those · Test · 9/10):
//    hueco:  <span id="1_1" class="answered|active" ed-trackable-click="...swap...">
//              <div class="questionText">(palabra elegida)</div>
//              <div class="arrowWrapper"><div class="arrow-down"></div></div>
//            </span>   dentro de .answersWrapper.fillInBlank > .fitb
//    lista:  al pulsar el hueco aparece .optionsWrapper con las opciones (this / these / those / that)
//  v20.7 pulsaba el div .questionText y buscaba la flecha DENTRO de él (está al lado) → no abría bien.
//  Ahora: pulsa el <span> (o su flecha) → espera .optionsWrapper → elige por texto → comprueba que el
//  hueco quedó con esa palabra. Si el clic no la elige, prueba teclado (flechas + Enter).
//  Práctica: elige la 1.ª opción en UN hueco (y comprueba la tarea). Test: la palabra cosechada.
//  DEPENDE DE: utils/dom.js, utils/press.js, utils/practice.js
//  EXPONE:     LegacyDDLSolver (se une a PracticeSolver)
// =====================================================================

class LegacyDDLSolver {
  static isLegacyDDL() { return !qv('.DDLOptions__selected') && this.legacyBlanks().length > 0; }

  // Cada hueco = el contenedor del .questionText (el <span id="1_1">)
  static legacyBlanks() {
    return qav('.fillInBlank .questionText, .answersWrapper.fitb .questionText, .fitb .questionText')
      .map(qt => qt.closest('span[id], [ed-trackable-click]') || qt.parentElement)
      .filter((b, i, arr) => b && arr.indexOf(b) === i);
  }

  static legacyBlankValue(b) {
    const qt = q('.questionText', b);
    const c = (qt || b).cloneNode(true);
    qa('.arrowWrapper, .vCheck, .xCheck, [class*="Check"], [class*="icon" i]', c).forEach(e => e.remove());
    return txt(c);
  }

  // Opciones visibles: dentro de .optionsWrapper (lo real); si no hay, lo que apareció nuevo tras el clic
  static openOptions(antes) {
    const w = qav('.optionsWrapper').pop();
    let ops = w ? qa('*', w).filter(e => vis(e) && txt(e) && !qa('*', e).some(h => h !== e && txt(h) === txt(e))) : [];
    if (!ops.length && antes) {
      ops = qa('li, [class*="option" i], [role="option"]').filter(e => vis(e) && !antes.has(e) && txt(e));
      ops = ops.filter(e => !ops.some(o => o !== e && e.contains(o)));
    }
    return ops;
  }

  static async openLegacy(b) {
    const antes = new Set(qa('li, [class*="option" i], [role="option"]').filter(vis));
    for (const el of [b, q('.arrowWrapper', b), q('.questionText', b)]) {
      if (!el) continue;
      const ok = await press(el, () => this.openOptions(antes).length > 0, 1200);
      if (ok) return this.openOptions(antes);
    }
    return [];
  }

  static async chooseLegacy(b, opts, want) {
    const o = want ? opts.find(x => norm(txt(x)) === norm(want)) : opts[0];
    if (!o) return false;
    const elegido = () => norm(this.legacyBlankValue(b)) === norm(txt(o));
    if (await press(o, elegido, 1200)) return true;
    // Respaldo: teclado (algunas listas viejas responden a flechas + Enter)
    const k = opts.indexOf(o);
    try { b.focus && b.focus(); } catch (e) {}
    for (let i = 0; i <= k; i++) b.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true }));
    b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    return !!(await waitFor(elegido, 1000, 150));
  }

  static async solveLegacyDDL(values = null) {
    log('🔽 [Desplegable viejo] Eligiendo opciones...');
    const tn = NavigationManager.curTask()?.n;
    const total = this.legacyBlanks().length;
    let n = 0, ok = 0;
    const fallos = [];
    for (let i = 0; i < total; i++) {
      const b = this.legacyBlanks()[i]; if (!b) break;
      const want = values ? values[i] : null;
      if (values && !want) continue;
      if (!values && this.legacyBlankValue(b)) continue;
      if (want && norm(this.legacyBlankValue(b)) === norm(want)) { ok++; continue; }
      const opts = await this.openLegacy(b);
      if (!opts.length) { fallos.push({ hueco: i + 1, motivo: 'no se abrió la lista' }); continue; }
      if (await this.chooseLegacy(b, opts, want)) { n++; ok++; }
      else { fallos.push({ hueco: i + 1, motivo: 'no se pudo elegir', quiere: want, opciones: opts.map(txt) }); try { document.body.click(); } catch (e) {} }
      await sleep(250);
      if (!values && n === 1 && await practiceEnough(tn)) break;
    }
    const r = { did: values ? 'ddl_legacy_replay' : 'ddl_legacy', n, ok, total: values ? values.filter(Boolean).length : total };
    if (fallos.length) { r.fallos = fallos; warn('Desplegable viejo:', fallos); }
    return r;
  }

  static readLegacyDDL() { return this.legacyBlanks().map(b => this.legacyBlankValue(b)); }
}
