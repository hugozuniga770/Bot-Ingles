// =====================================================================
//  BARRIDO DE TESTS — busca tests con nota < 100, lección por lección y unidad por unidad
// ---------------------------------------------------------------------
//  NUEVO v20.8.  __ed.barrer()  → empieza desde donde estés (una lección o el Home).
//                __ed.barrerStop() → lo desactiva.   __ed.barrerEstado() → qué lleva hecho.
//  Dentro de una unidad (usa los desplegables de arriba, ya probados):
//    1) en cada lección entra a su step de test (Test / Prueba / Repasemos / Review)
//    2) si el test está en 100 → lección lista → siguiente lección
//       si es < 100 o nunca se hizo → el flujo normal del bot lo rehace (exprés → review → reintento)
//       si tras los reintentos no llega a 100 → lo anota en el reporte y SIGUE (no se detiene)
//    3) sin más lecciones → unidad lista → va al Home (casita)
//  En el Home: entra a la siguiente unidad desbloqueada (por número) con scroll hasta ella.
//  ⚠ Pasar del Home a una unidad CAMBIA DE PÁGINA: para que el bot siga solo hace falta el
//    cargador de Tampermonkey (tools/cargador.user.js). Sin él, vuelve a cargar el bot y
//    escribe __ed.auto() en cada página nueva (el barrido recuerda por dónde iba).
//  ⚠ SIN CONFIRMAR: qué pantalla aparece al pulsar una unidad en el Home (si es intermedia,
//    el bot la anota en el reporte e intenta abrir la 1.ª lección).
//  DEPENDE DE: core/dropdowns.js, core/navigation.js, tests/test-manager.js, utils/reporter.js
//  EXPONE:     TestSweep
// =====================================================================

const K_SWEEP = 'ed:sweep:v1';

class TestSweep {
  static get() { try { return JSON.parse(localStorage.getItem(K_SWEEP) || 'null'); } catch (e) { return null; } }
  static set(s) { if (s) localStorage.setItem(K_SWEEP, JSON.stringify(s)); else localStorage.removeItem(K_SWEEP); }
  static active() { const s = this.get(); return !!(s && s.active); }

  static start() {
    this.set({ active: true, phase: 'lesson', lessonsDone: [], unitsDone: [], resultados: [], homeUrl: null, inicio: new Date().toISOString() });
    log('🧭 Barrido de tests ACTIVADO. Busca tests < 100 lección por lección. (__ed.barrerStop() para quitarlo)');
  }
  static stop() { const s = this.get(); if (s) { s.active = false; this.set(s); } log('🧭 Barrido desactivado.'); }

  static unitNum() {
    const t = txt(q('.learning__dropDownList_unitName')) || txt(q('.learning__dropDownList_CourseUnitInfo'));
    return +((t.match(/Unit\s*(\d+)/i) || t.match(/(\d+)/) || [])[1] || 0);
  }
  static lessonKey() { return 'U' + this.unitNum() + '||' + NavigationManager.lessonLabel(); }

  static markLesson(pct, nota = '') {
    const s = this.get(); if (!s) return;
    const k = this.lessonKey();
    if (!s.lessonsDone.includes(k)) s.lessonsDone.push(k);
    s.resultados.push({ unidad: this.unitNum(), leccion: NavigationManager.lessonLabel(), pct, nota });
    this.set(s);
  }
  static lessonDone() { const s = this.get(); return !!(s && s.lessonsDone.includes(this.lessonKey())); }

  // Lo llama MainEngine.step() al principio, dentro del área de lecciones. null = sigue el flujo normal.
  static async lessonStep() {
    const s = this.get(); if (!s || !s.active) return null;
    if (s.mode === 'completar') return await this.completarStep(s);   // NUEVO v21.3
    if (s.phase === 'entering_unit' || s.phase === 'home') {
      s.phase = 'lesson'; this.set(s);
      log('🧭 Barrido: unidad', this.unitNum(), '→ empiezo por la lección 1');
      if (lessonNum(NavigationManager.lessonLabel()) !== '1' && await DropdownNav.gotoLesson(1)) return { did: 'sweep_lesson1' };
    }
    const enTest = RE_TEST_STEP.test(NavigationManager.stepLabel()) || TestManager.isTestStart() || TestManager.isScore() || TestManager.isReview() || TestManager.inTest();
    const run = StorageManager.getRun();
    if (enTest || (run && (run.phase === 'review' || run.phase === 'replay'))) {
      if (!(TestManager.isScore() && this.lessonDone())) return null;   // test en curso → flujo normal
    }
    if (!this.lessonDone()) {
      log('🧭 Barrido: voy al test de', NavigationManager.lessonLabel());
      if (await DropdownNav.gotoStep(RE_TEST_ITEM)) return { did: 'sweep_goto_test' };
      this.markLesson(null, 'sin step de test');
    }
    return await this.nextLesson();
  }

  static async nextLesson() {
    const cur = +lessonNum(NavigationManager.lessonLabel()) || 0;
    const sig = DropdownNav.items('lessons').map(x => +((x.t.match(/^(\d+)\s*\./) || [])[1] || 0)).filter(n => n > cur).sort((a, b) => a - b)[0];
    if (sig) { log('🧭 Barrido: siguiente lección →', sig); await DropdownNav.gotoLesson(sig); return { did: 'sweep_next_lesson', leccion: sig }; }
    const s = this.get();
    if (!s.unitsDone.includes(this.unitNum())) s.unitsDone.push(this.unitNum());
    this.set(s);
    log('🏁 Barrido: unidad', this.unitNum(), 'terminada → voy al Home');
    await this.irHome();
    return { did: 'sweep_unit_done' };
  }

  // ===================== HOME (dumps del 31/10) =====================
  // Tarjetas .home__unitW--notLocked (número .home__detailsNumber, título .home__detailsTitle; las hechas
  // muestran "Completed!"). Al PULSAR una tarjeta NO se entra: se despliega su lista de lecciones
  // (.home__courseListItem > .home__courseListItemLink / Number / Name / Progress). Se entra con la lección.
  // Widgets: .home__studentWidgetCompletion ("25% Course Completion") y .home__studentWidgetTestScores ("95%").
  static leerWidgets() {
    const num = sel => { const m = txt(q(sel)).match(/(\d{1,3})\s*%/); return m ? +m[1] : null; };
    return { completion: num('.home__studentWidgetCompletion'), avg: num('.home__studentWidgetTestScores') };
  }
  static unidades() {
    return qa('.home__unitW--notLocked').map(u => ({ el: u, n: +((txt(q('.home__detailsNumber', u)).match(/\d+/) || [0])[0]),
      t: txt(q('.home__detailsTitle', u)), completa: /completed|completad/i.test(txt(u)) }));
  }
  // Progreso de una lección en la lista (si ED lo pone como ancho de una barra); null si no se puede leer
  static progresoLeccion(it) {
    const p = q('.home__courseListItemProgress', it); if (!p) return null;
    const b = [p, ...qa('*', p)].find(e => /width\s*:\s*\d/.test(e.getAttribute('style') || ''));
    const m = b && (b.getAttribute('style') || '').match(/width\s*:\s*([\d.]+)%/);
    return m ? +m[1] : null;
  }
  // Abre la unidad (despliega su lista) y entra a la 1.ª lección no completa (o la 1.ª). false si no pudo.
  static async abrirUnidad(u) {
    try { u.el.scrollIntoView({ block: 'center' }); } catch (e) {}
    await sleep(700);
    const caja = () => u.el.closest('.home__unitW') || u.el;
    let lista = qav('.home__courseListItem', caja());
    if (!lista.length) { await press(q('.home__unit', u.el) || q('.home__unitIW', u.el) || u.el, () => qav('.home__courseListItem', caja()).length > 0, 2500); lista = qav('.home__courseListItem', caja()); }
    if (!lista.length) lista = qav('.home__courseListItem');   // por si ED pinta la lista fuera de la tarjeta
    if (!lista.length) return false;
    const it = lista.find(x => { const pr = this.progresoLeccion(x); return pr != null && pr < 100; }) || lista[0];
    const link = q('.home__courseListItemLink', it) || it;
    log('🧭 Unidad', u.n, '→ lección', txt(q('.home__courseListItemNumber', it)) + ' ' + txt(q('.home__courseListItemName', it)));
    click(link);
    await sleep(5000);
    return true;
  }
  static async irHome() {
    const s = this.get(); if (s) { s.phase = 'home'; this.set(s); }
    const home = qv('.sitemenu__itemHome--learningArea a') || qv('.sitemenu__itemHome--learningArea') || qv('.sitemenu__itemHome a') || qv('.sitemenu__itemHome');
    if (home) click(home); else if (s && s.homeUrl) location.href = s.homeUrl;
    await sleep(4000);
    return { did: 'sweep_home' };
  }

  // ===================== MODO "COMPLETAR" (NUEVO v21.3) =====================
  // Hace TODO el curso unidad por unidad (prácticas + tests); al final, si el promedio de tests < 100,
  // pasa solo al barrido de tests. Lo que no logra queda en el reporte y sigue con lo siguiente.
  static startCompletar() {
    this.set({ active: true, mode: 'completar', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [], homeUrl: null, inicio: new Date().toISOString() });
    log('🚀 Modo COMPLETAR activado: todas las unidades → luego tests < 100. (__ed.barrerStop() para quitarlo)');
  }

  static async completarHome(s) {
    s.widgets = this.leerWidgets(); this.set(s);
    log('📊 Course Completion', s.widgets.completion + '%', '· Average Test Score', s.widgets.avg + '%');
    const pend = this.unidades().filter(u => !u.completa && !s.unitsDone.includes(u.n)).sort((a, b) => a.n - b.n);
    if (!pend.length) {
      if (s.widgets.avg != null && s.widgets.avg < 100 && !s.testsHechos) {
        Object.assign(s, { mode: 'tests', phase: 'home', unitsDone: [], lessonsDone: [], testsHechos: true }); this.set(s);
        log('🧭 Unidades recorridas; promedio de tests', s.widgets.avg + '% → barrido de tests < 100');
        return { did: 'completar_a_tests' };
      }
      s.active = false; s.fin = new Date().toISOString(); this.set(s);
      log('🏁 COMPLETAR terminado.', s.widgets);
      window.__ed.stop();
      return { did: 'completar_fin', widgets: s.widgets };
    }
    const u = pend[0];
    Object.assign(s, { phase: 'entering_unit', unitTarget: u.n, unitStart: Date.now() }); this.set(s);
    if (!(await this.abrirUnidad(u))) {
      Reporter.capture('home_no_abre_lista_de_lecciones', { unidad: u.n, titulo: u.t });
      const s2 = this.get(); s2.unitsDone.push(u.n); s2.phase = 'home'; this.set(s2);
      return { did: 'completar_unidad_fallida', unidad: u.n };
    }
    return { did: 'completar_abre_unidad', unidad: u.n };
  }

  static async completarStep(s) {
    if (s.phase === 'entering_unit' || s.phase === 'home') { s.phase = 'in_unit'; s.unitStart = s.unitStart || Date.now(); s.unitTarget = s.unitTarget || this.unitNum(); this.set(s); }
    const u = this.unitNum();
    if (s.unitTarget && u && u !== s.unitTarget) {   // ED pasó sola a la unidad siguiente
      if (!s.unitsDone.includes(s.unitTarget)) s.unitsDone.push(s.unitTarget);
      Object.assign(s, { unitTarget: u, unitStart: Date.now() }); this.set(s);
      log('🧭 Pasé a la unidad', u);
    }
    // Atasco: misma pantalla 6 pasos seguidos, o demasiado tiempo en la unidad
    const firma = NavigationManager.screenSig() + '|' + (TestManager.isScore() ? 'score' : '') + '|' + (TestManager.isReview() ? 'rev' : '');
    TestSweep._same = firma === TestSweep._firma ? (TestSweep._same || 0) + 1 : 0; TestSweep._firma = firma;
    const min = (Date.now() - (s.unitStart || Date.now())) / 60000;
    const tope = min > (CFG.maxMinPorUnidad || 150);
    if (TestSweep._same >= 6 || tope) {
      TestSweep._same = 0;
      if (!tope) { const r = await DropdownNav.gotoNextIncomplete(); if (r) { log('🧭 Atasco → voy a lo pendiente:', r); return { did: 'completar_salto', a: r }; } }
      else Reporter.capture('unidad_sin_terminar_por_tiempo', { unidad: u, minutos: Math.round(min) });
      const s2 = this.get(); if (!s2.unitsDone.includes(u)) s2.unitsDone.push(u); this.set(s2);
      log('🏁 Unidad', u, tope ? 'cortada por tiempo' : 'sin pendientes', '→ Home');
      return await this.irHome();
    }
    return null;   // flujo normal: prácticas y tests
  }

  // Fuera del área de lecciones (Home u otra página)
  static async pageStep() {
    const s = this.get(); if (!s || !s.active) return null;
    if (/#\/home/i.test(location.href) || qv('.home__unitW')) {
      s.homeUrl = location.href.split('#')[0] + '#/home'; this.set(s);
      if (s.mode === 'completar') return await this.completarHome(s);
      s.widgets = this.leerWidgets(); this.set(s);
      const units = this.unidades();
      const ult = s.unitsDone.length ? Math.max(...s.unitsDone) : 0;
      const sig = units.filter(u => u.n > ult && !s.unitsDone.includes(u.n)).sort((a, b) => a.n - b.n)[0];
      if (!sig) {
        s.active = false; s.fin = new Date().toISOString(); this.set(s);
        log('🏁 BARRIDO COMPLETO. Resultados:', s.resultados);
        if (!units.length) Reporter.capture('barrido_home_sin_unidades');
        window.__ed.stop();
        return { did: 'sweep_finished', resultados: s.resultados };
      }
      Object.assign(s, { phase: 'entering_unit', unitTarget: sig.n }); this.set(s);
      log('🧭 Barrido: entrando a la unidad', sig.n, sig.t);
      // AJUSTADA v21.3: pulsar la tarjeta solo DESPLIEGA la lista; hay que pulsar una lección para entrar
      if (!(await this.abrirUnidad(sig))) {
        Reporter.capture('home_no_abre_lista_de_lecciones', { unidad: sig.n });
        const s2 = this.get(); s2.unitsDone.push(sig.n); s2.phase = 'home'; this.set(s2);
      }
      return { did: 'sweep_open_unit', unidad: sig.n };
    }
    // AJUSTADA v21.3: página desconocida → anotar y, si se repite 15 veces, volver al Home (no dar vueltas sin fin)
    Reporter.capture('barrido_pagina_desconocida');
    TestSweep._unk = (TestSweep._unk || 0) + 1;
    if (TestSweep._unk >= 15 && s.homeUrl) { TestSweep._unk = 0; log('🧭 Página desconocida varias veces → vuelvo al Home'); location.href = s.homeUrl; await sleep(5000); return { did: 'sweep_unknown_go_home' }; }
    return { did: 'sweep_unknown_page' };
  }
}
