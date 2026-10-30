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
    s.phase = 'home'; this.set(s);
    log('🏁 Barrido: unidad', this.unitNum(), 'terminada → voy al Home');
    const home = qv('.sitemenu__itemHome--learningArea a') || qv('.sitemenu__itemHome--learningArea') || qv('.sitemenu__itemHome a') || qv('.sitemenu__itemHome');
    if (home) click(home); else if (s.homeUrl) location.href = s.homeUrl;
    await sleep(4000);
    return { did: 'sweep_unit_done' };
  }

  // Fuera del área de lecciones (Home u otra página)
  static async pageStep() {
    const s = this.get(); if (!s || !s.active) return null;
    if (/#\/home/i.test(location.href) || qv('.home__unitW')) {
      s.homeUrl = location.href.split('#')[0] + '#/home';
      const units = qa('.home__unitW--notLocked').map(u => ({ el: u, n: +((txt(q('.home__detailsNumber', u)).match(/\d+/) || [0])[0]), t: txt(q('.home__detailsTitle', u)) }));
      const ult = s.unitsDone.length ? Math.max(...s.unitsDone) : 0;
      const sig = units.filter(u => u.n > ult && !s.unitsDone.includes(u.n)).sort((a, b) => a.n - b.n)[0];
      if (!sig) {
        s.active = false; this.set(s);
        log('🏁 BARRIDO COMPLETO. Resultados:', s.resultados);
        if (!units.length) Reporter.capture('barrido_home_sin_unidades');
        window.__ed.stop();
        return { did: 'sweep_finished', resultados: s.resultados };
      }
      try { sig.el.scrollIntoView({ block: 'center' }); } catch (e) {}
      await sleep(700);
      s.phase = 'entering_unit'; s.unitTarget = sig.n; this.set(s);
      log('🧭 Barrido: entrando a la unidad', sig.n, sig.t);
      click(q('.home__unit', sig.el) || q('.home__unitIW', sig.el) || sig.el);
      await sleep(4500);
      return { did: 'sweep_open_unit', unidad: sig.n };
    }
    // Página intermedia desconocida (p. ej. la lista de lecciones de la unidad)
    Reporter.capture('barrido_pagina_desconocida');
    const lec = qav('a, button, [ng-click], [class*="lesson" i]').find(e => /lesson|lecci/i.test((e.className || '') + ' ' + txt(e)));
    if (lec) { log('🧭 Barrido: página intermedia → pruebo abrir', txt(lec).slice(0, 40)); click(lec); await sleep(4500); return { did: 'sweep_try_lesson' }; }
    return { did: 'sweep_unknown_page' };
  }
}
