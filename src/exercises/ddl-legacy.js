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

  // AJUSTADA v20.10 — reporte Lesson 5: Nouns · Test · 3, 4, 7 y 9/10: el 1.er hueco salía bien y el 2.º daba
  // "no se abrió la lista". Lo más probable: el 1.º salía porque ED lo ABRE SOLO al cargar, y los clics del bot
  // nunca abrieron una lista (Hugo: "cuando le das Tab baja la lista" → se abre con el FOCO).
  // Ahora prueba, comprobando tras cada intento, hasta que aparezca la lista:
  //   ya abierta → clic en el texto → clic en la flecha → clic en el hueco → FOCO (como Tab) →
  //   secuencia de mouse → jQuery → teclado (Enter / flecha abajo / espacio)
  // y anota qué método funcionó (sale en el reporte si algo falla).
  static listaAbierta(antes) {
    const o = this.openOptions(antes);
    if (o.length) return o;
    if (this.ultimasOpciones && this.ultimasOpciones.length) {   // ¿aparecieron palabras que ya vimos en otra lista?
      const W = this.ultimasOpciones.map(norm);
      let nuevas = qa('body *').filter(e => vis(e) && (!antes || !antes.has(e)) && W.includes(norm(txt(e))) && !e.closest('.fitb, .fillInBlank'));
      nuevas = nuevas.filter(e => !nuevas.some(x => x !== e && e.contains(x)));
      if (nuevas.length >= 2) return nuevas;
    }
    return [];
  }

  static async openLegacy(b) {
    const ya = await waitFor(() => { const o = this.listaAbierta(null); return o.length ? o : null; }, 500, 150);
    if (ya) { this.metodo = 'ya_abierta'; return ya; }
    const qt = q('.questionText', b), ar = q('.arrowWrapper', b), ad = q('.arrow-down', b);
    const foco = el => { try { el.setAttribute('tabindex', el.getAttribute('tabindex') || '0'); el.focus(); } catch (e) {} for (const t of ['focus', 'focusin']) { try { el.dispatchEvent(new FocusEvent(t, { bubbles: t === 'focusin' })); } catch (e) {} } };
    const tecla = (el, key, code) => { for (const t of ['keydown', 'keyup']) { try { el.dispatchEvent(new KeyboardEvent(t, { key, code: key === ' ' ? 'Space' : key, keyCode: code, which: code, bubbles: true })); } catch (e) {} } };
    const raton = el => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) { const Ev = t.startsWith('pointer') && window.PointerEvent ? window.PointerEvent : MouseEvent; try { el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0, buttons: t.endsWith('down') ? 1 : 0 })); } catch (e) {} } };
    const intentos = [
      ['clic_texto', () => qt && click(qt)],
      ['clic_flecha', () => (ad || ar) && click(ad || ar)],
      ['clic_hueco', () => click(b)],
      ['foco_tab', () => { foco(b); if (qt) foco(qt); }],
      ['raton_texto', () => raton(qt || b)],
      ['jquery', () => { if (window.jQuery) { try { window.jQuery(qt || b).trigger('click'); window.jQuery(b).trigger('focus'); } catch (e) {} } }],
      ['tecla_enter', () => { foco(b); tecla(b, 'Enter', 13); }],
      ['tecla_abajo', () => { foco(b); tecla(b, 'ArrowDown', 40); }],
      ['tecla_espacio', () => { foco(b); tecla(b, ' ', 32); }]
    ];
    for (const [nombre, fn] of intentos) {
      const antes = new Set(qa('body *').filter(vis));
      fn();
      const ops = await waitFor(() => { const o = this.listaAbierta(antes); return o.length ? o : null; }, 700, 120);
      if (ops) { this.metodo = nombre; return ops; }
    }
    this.metodo = 'ninguno';
    return [];
  }

  static cerrarLista() { try { document.body.click(); } catch (e) {} }

  static async chooseLegacy(b, opts, want) {
    this.ultimasOpciones = opts.map(txt);
    const o = want ? pick(opts, want) : opts[0];   // AJUSTADA v21.0: exacta (mayúsculas) primero
    if (!o) return false;
    const elegido = () => exacto(this.legacyBlankValue(b), txt(o));
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
    const fallos = [], metodos = [];
    for (let i = 0; i < total; i++) {
      const b = this.legacyBlanks()[i]; if (!b) break;
      const want = values ? values[i] : null;
      if (values && !want) continue;
      if (!values && this.legacyBlankValue(b)) continue;
      if (want && norm(this.legacyBlankValue(b)) === norm(want)) { ok++; continue; }
      let opts = await this.openLegacy(b);
      let metodo = this.metodo;
      let hecho = opts.length ? await this.chooseLegacy(b, opts, want) : false;
      if (!hecho && metodo === 'ya_abierta') {   // NUEVO v20.10: la lista abierta era de otro hueco → cerrar y abrir la suya
        this.cerrarLista(); await sleep(300);
        opts = await this.openLegacy(b); metodo = this.metodo;
        hecho = opts.length ? await this.chooseLegacy(b, opts, want) : false;
      }
      // NUEVO v21.9 — corrida de Jose (01/11, U14 · Present Simple: Review · Test · 12/15: 97 % siete veces) y de
      // Nelson (v21.6, mismo test y Nouns · Test · 3/4/7/9): tras ELEGIR en un hueco, ED no abre la lista de otro
      // hasta que haya un clic FUERA. Patrón real: "1:clic_texto, 2:ninguno✗, 3:clic_texto, 4:ninguno✗" (el hueco
      // que sigue a un fallo salía bien porque el fallo ya hacía cerrarLista). Ahora: si nada la abrió → clic fuera y
      // otra vuelta. En el reporte sale como "fuera+<método>".
      if (!hecho && metodo === 'ninguno') {
        this.cerrarLista(); await sleep(400);
        opts = await this.openLegacy(b); metodo = 'fuera+' + this.metodo;
        hecho = opts.length ? await this.chooseLegacy(b, opts, want) : false;
      }
      metodos.push((i + 1) + ':' + metodo + (hecho ? '' : '✗'));
      if (hecho) { n++; ok++; }
      else { fallos.push({ hueco: i + 1, motivo: opts.length ? 'no se pudo elegir' : 'no se abrió la lista', metodo, quiere: want, opciones: opts.map(txt), huecoHTML: (b.outerHTML || '').replace(/\s+/g, ' ').slice(0, 400) }); this.cerrarLista(); }
      await sleep(400);   // AJUSTADA v20.10: dar tiempo a ED de abrir (o no) la lista del siguiente hueco
      if (!values && n === 1 && await practiceEnough(tn)) break;
    }
    const r = { did: values ? 'ddl_legacy_replay' : 'ddl_legacy', n, ok, total: values ? values.filter(Boolean).length : total };
    r.metodos = metodos;   // NUEVO v20.10: qué forma de abrir la lista funcionó en cada hueco
    if (fallos.length) { r.fallos = fallos; warn('Desplegable viejo:', fallos); }
    return r;
  }

  static readLegacyDDL() { return this.legacyBlanks().map(b => this.legacyBlankValue(b)); }
}
