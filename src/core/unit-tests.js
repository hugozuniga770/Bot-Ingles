// =====================================================================
//  UNIT TESTS — encontrarlos, entrar y hacerlos con la misma política que los tests de lección
// ---------------------------------------------------------------------
//  NUEVO v21.11. Corridas de Jose: My Progress lista en cada unidad una fila "Unit Test" (sin número) y el bot
//  NUNCA entró a ninguno. ⚠ SIN CONFIRMAR dónde se abren. Se prueban candidatos EN ORDEN, verificando cada uno
//  (regla 3 de Hugo); si ninguno sirve, queda el reporte con dump completo y se sigue:
//    1) My Progress: la fila "Unit Test" de esa unidad (enlace → nombre → puntaje → fila → botón)
//    2) Home: la lista de lecciones de la tarjeta (al pasar el mouse) → ítem "Unit Test"
//    3) dentro de la unidad: el desplegable de lecciones → ítem "Unit Test"
//  Política (Hugo): completar → los no hechos y los < 100; barrido → solo los < 100. Los que están en 100 NO.
//  Dentro, el flujo de tests de siempre (Start → cosecha → reintento). Al salir del test → listo → Home.
//  Estado en el barrido (ed:sweep:v1) → s.ut = { actual, hechos, resultados }.
//  DEPENDE DE: core/progress-map.js, core/sweep.js, core/dropdowns.js, tests/test-manager.js (en ejecución)
//  EXPONE:     UnitTests
// =====================================================================

class UnitTests {
  static esFila(t) { return /unit\s*test|prueba\s*de\s*(la\s*)?unidad|examen\s*de\s*(la\s*)?unidad/i.test(t || ''); }

  // De My Progress: completar (todos=true) → sin hacer o < 100; barrido → solo < 100. Nunca los que están en 100.
  static pendientes(m, hechos, todos) {
    if (!m || !m.unidades) return [];
    return m.unidades.filter(u => !u.locked).flatMap(u => (u.lecciones || []).filter(l => this.esFila(l.nombre)).map(l => ({ unidad: u.n, test: l.test, terminado: l.terminado })))
      .filter(x => !hechos.includes(x.unidad) && (typeof x.test === 'number' ? x.test < 100 : !!todos && !x.terminado));
  }
  static estado(s) { s.ut = s.ut || {}; s.ut.hechos = s.ut.hechos || []; s.ut.resultados = s.ut.resultados || []; return s.ut; }
  static terminar(s, res) {
    const ut = this.estado(s), a = ut.actual;
    if (a) { ut.hechos.push(a.unidad); ut.resultados.push({ unidad: a.unidad, res, metodo: a.metodo || null }); }
    ut.actual = null; TestSweep.set(s);
    log('📝 Unit Test de la unidad', a ? a.unidad : '?', '→', res);
  }

  // En el Home. Devuelve una acción, o null si no hay Unit Tests que hacer (sigue el flujo de siempre).
  static async enHome(s, todos) {
    const ut = this.estado(s);
    if (!ut.actual) {
      const p = this.pendientes(ProgressMap.get(), ut.hechos, todos);
      if (!p.length) return null;
      ut.actual = { unidad: p[0].unidad, test: p[0].test, fase: 'buscar', intento: 0, pasos: 0 };
      TestSweep.set(s);
      log('📝 Unit Test de la unidad', p[0].unidad, typeof p[0].test === 'number' ? '(' + p[0].test + ' %)' : '(sin hacer)', '→ lo busco');
    }
    const a = ut.actual;
    if (a.fase === 'dentro' || a.fase === 'desplegable') {   // volvió al Home: si llegó a ver el test, está hecho
      if (!a.vioTest) Reporter.capture('unit_test_no_aparecio', { unidad: a.unidad, metodo: a.metodo || a.fase });
      this.terminar(s, a.vioTest ? 'hecho' : 'no_aparecio_el_test');
      return { did: 'unit_test_fin', unidad: a.unidad };
    }
    if (a.intento === 0) {
      if (await ProgressMap.ir()) return { did: 'unit_test_voy_a_my_progress', unidad: a.unidad };
      a.intento = 1; TestSweep.set(s);
    }
    const u = TestSweep.unidades().find(x => x.n === a.unidad);
    if (a.intento === 1) {
      a.intento = 2; TestSweep.set(s);
      if (u && await TestSweep.abrirUnidad(u, it => this.esFila(txt(it)))) {
        Object.assign(a, { fase: 'dentro', metodo: 'home', desde: Date.now() }); TestSweep.set(s);
        return { did: 'unit_test_entrando', unidad: a.unidad, metodo: 'home' };
      }
    }
    if (a.intento === 2) {
      Object.assign(a, { intento: 3, fase: 'desplegable' }); TestSweep.set(s);
      if (u && await TestSweep.abrirUnidad(u)) return { did: 'unit_test_busco_en_desplegable', unidad: a.unidad };
    }
    Reporter.capture('unit_test_no_encontrado', { unidad: a.unidad, donde: 'home', lista: qa('.home__courseListItem').map(x => txt(x).slice(0, 50)).slice(0, 15) });
    this.terminar(s, 'no_encontrado');
    return { did: 'unit_test_no_encontrado', unidad: a.unidad };
  }

  // En My Progress (paso 1). null = no le toca.
  static async enMyProgress(s) {
    const a = s.ut && s.ut.actual;
    if (!a || a.fase !== 'buscar' || a.intento !== 0) return null;
    a.intento = 1; TestSweep.set(s);
    const metodo = await this.desdeMyProgress(a.unidad);
    if (metodo) {
      Object.assign(a, { fase: 'dentro', metodo: 'my_progress:' + metodo, desde: Date.now() }); TestSweep.set(s);
      return { did: 'unit_test_entrando', unidad: a.unidad, metodo: 'my_progress:' + metodo };
    }
    Reporter.capture('unit_test_no_entra_desde_my_progress', { unidad: a.unidad, fila: this._fila || null });
    location.href = s.homeUrl || location.href.split('#')[0] + '#/home'; await sleep(4000);
    return { did: 'unit_test_sigo_buscando', unidad: a.unidad };
  }
  static async desdeMyProgress(n) {
    this._fila = null;
    await waitFor(() => qa('.myProgress__unitW').length > 0, 8000, 300);
    const uw = qa('.myProgress__unitW').find(x => +((txt(q('.myProgress__unitTitle', x)).match(/\d+/) || [0])[0]) === n);
    if (!uw) return null;
    if (!qa('.myProgress__unitLesson', uw).length) {
      try { uw.scrollIntoView({ block: 'center' }); } catch (e) {}
      await press(q('.myProgress__unitHeaderIW', uw) || q('.myProgress__unitHeader', uw) || uw, () => qa('.myProgress__unitLesson', uw).length > 0, 3000);
    }
    const fila = qa('.myProgress__unitLesson', uw).find(L => this.esFila(txt(q('.myProgress__unitLesson_name', L))));
    if (!fila) return null;
    this._fila = (fila.outerHTML || '').replace(/\s+/g, ' ').slice(0, 1500);
    const salio = () => !ProgressMap.isPage() || TestManager.isTestStart() || /learningArea/i.test(location.href);
    const cands = [['enlace', q('a', fila)], ['nombre', q('.myProgress__unitLesson_name', fila)], ['puntaje', q('.myProgress__unitLesson_testScore', fila)],
      ['boton', q('button, [role="button"], [class*="btn" i], [class*="Link"]', fila)], ['fila', fila]].filter(([, e]) => e);
    for (const [nombre, el] of cands) {
      try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
      if (await press(el, salio, 4000)) return nombre;
    }
    return null;
  }

  // En el área de lecciones. undefined = no hay Unit Test en curso; null = flujo normal (el test); objeto = acción.
  static async enLeccion(s) {
    const a = s.ut && s.ut.actual;
    if (!a) return undefined;
    if (a.fase === 'desplegable') {   // paso 3: buscar "Unit Test" en el desplegable de lecciones de la unidad
      const d = await DropdownNav.open('lessons');
      const it = d ? DropdownNav.items('lessons').find(x => this.esFila(x.t)) : null;
      if (it) {
        Object.assign(a, { fase: 'dentro', metodo: 'desplegable', desde: Date.now() }); TestSweep.set(s);
        click(it.el); await sleep(4500); await NavigationManager.handleModals();
        return { did: 'unit_test_entrando', unidad: a.unidad, metodo: 'desplegable' };
      }
      if (d) await DropdownNav.close(d);
      Reporter.capture('unit_test_no_encontrado', { unidad: a.unidad, donde: 'desplegable', lecciones: DropdownNav.items('lessons').map(x => x.t.slice(0, 50)).slice(0, 15) });
      this.terminar(s, 'no_encontrado');
      return await TestSweep.irHome();
    }
    if (a.fase !== 'dentro') return undefined;
    const run = StorageManager.getRun();
    const enTest = TestManager.isTestStart() || TestManager.inTest() || TestManager.isScore() || TestManager.isReview() || !!(run && (run.phase === 'review' || run.phase === 'replay'));
    if (enTest) { if (!a.vioTest) { a.vioTest = true; TestSweep.set(s); log('📝 Dentro del Unit Test de la unidad', a.unidad); } return null; }
    a.pasos = (a.pasos || 0) + 1; TestSweep.set(s);
    if (a.vioTest) { this.terminar(s, 'hecho'); return await TestSweep.irHome(); }
    if (a.pasos >= 6) { Reporter.capture('unit_test_no_aparece', { unidad: a.unidad, metodo: a.metodo }); this.terminar(s, 'no_aparecio_el_test'); return await TestSweep.irHome(); }
    return null;   // p. ej. una pantalla de introducción: el flujo normal pulsa Next
  }
}
