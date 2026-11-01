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
    const ul = this.unitNum() + '|' + (+lessonNum(NavigationManager.lessonLabel()) || 0);   // NUEVO v21.8
    s.objHechos = s.objHechos || []; if (!s.objHechos.includes(ul)) s.objHechos.push(ul);
    s.resultados.push({ unidad: this.unitNum(), leccion: NavigationManager.lessonLabel(), pct, nota });
    this.set(s);
  }
  static lessonDone() { const s = this.get(); return !!(s && s.lessonsDone.includes(this.lessonKey())); }

  // Lo llama MainEngine.step() al principio, dentro del área de lecciones. null = sigue el flujo normal.
  static async lessonStep() {
    const s = this.get(); if (!s || !s.active) return null;
    if (s.mode === 'completar') return await this.completarStep(s);   // NUEVO v21.3
    if (s.mapaHecho && Array.isArray(s.objetivos)) return await this.objetivosStep(s);   // NUEVO v21.8: con mapa
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

  // NUEVO v21.8 — barrido con MAPA: solo los tests que My Progress muestra < 100, yendo directo a cada uno
  static pendientesObj(s) { return (s.objetivos || []).filter(o => !(s.objHechos || []).includes(o.unidad + '|' + o.leccion)); }
  static async objetivosStep(s) {
    if (s.phase !== 'lesson') { s.phase = 'lesson'; this.set(s); }
    const u = this.unitNum(), ln = +lessonNum(NavigationManager.lessonLabel()) || 0;
    const pend = this.pendientesObj(s);
    if (pend.some(o => o.unidad === u && o.leccion === ln)) {
      const enTest = RE_TEST_STEP.test(NavigationManager.stepLabel()) || TestManager.isTestStart() || TestManager.isScore() || TestManager.isReview() || TestManager.inTest();
      const run = StorageManager.getRun();
      if (enTest || (run && (run.phase === 'review' || run.phase === 'replay'))) { if (!(TestManager.isScore() && this.lessonDone())) return null; }
      if (!this.lessonDone()) {
        log('🎯 Test < 100 según My Progress →', NavigationManager.lessonLabel());
        if (await DropdownNav.gotoStep(RE_TEST_ITEM)) return { did: 'sweep_goto_test' };
        this.markLesson(null, 'sin step de test');
      }
    }
    const resto = this.pendientesObj(this.get());
    const otra = resto.find(o => o.unidad === u);
    if (otra) { log('🎯 Siguiente test < 100 en esta unidad → lección', otra.leccion); await DropdownNav.gotoLesson(otra.leccion); return { did: 'sweep_next_lesson', leccion: otra.leccion }; }
    log(resto.length ? '🎯 Quedan tests < 100 en otras unidades → Home' : '🏁 Ya no quedan tests < 100 → Home');
    return await this.irHome();
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
      t: txt(q('.home__detailsTitle', u)), completa: /completed|completad|terminad/i.test(txt(u)) }));   // AJUSTADA v21.6: ED en español dice "¡Terminado!"
  }
  // Progreso de una lección en la lista (si ED lo pone como ancho de una barra); null si no se puede leer
  static progresoLeccion(it) {
    const p = q('.home__courseListItemProgress', it); if (!p) return null;
    const b = [p, ...qa('*', p)].find(e => /width\s*:\s*\d/.test(e.getAttribute('style') || ''));
    const m = b && (b.getAttribute('style') || '').match(/width\s*:\s*([\d.]+)%/);
    return m ? +m[1] : null;
  }
  // Abre la unidad (despliega su lista) y entra a la 1.ª lección no completa (o la 1.ª). false si no pudo.
  static async abrirUnidad(u, preferida = null) {   // AJUSTADA v21.8: preferida = n.º de lección (del mapa)
    try { u.el.scrollIntoView({ block: 'center' }); } catch (e) {}
    await sleep(700);
    const caja = () => u.el.closest('.home__unitW') || u.el;
    let lista = qav('.home__courseListItem', caja());
    // AJUSTADA v21.6 (corrida en la nube del 31/10: "home_no_abre_lista_de_lecciones"): la lista aparece al PASAR
    // EL MOUSE por la tarjeta (sale la franja "Lecciones"), no con un clic. Se prueba: pasar por encima → clic en
    // la franja "Lecciones"/"Lessons" → clic en la tarjeta. Cada intento se comprueba.
    const hay = () => qav('.home__courseListItem', caja()).length > 0 || qav('.home__courseListItem').length > 0;
    const encima = el => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 3;
      for (const t of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove']) { try { el.dispatchEvent(new MouseEvent(t, { bubbles: !/enter/.test(t), clientX: x, clientY: y, view: window })); } catch (e) {} } };
    if (!hay()) {
      for (const el of [u.el, q('.home__unitIW', u.el), q('.home__unit', u.el)].filter(Boolean)) encima(el);
      await waitFor(hay, 1500, 150);
    }
    if (!hay()) {
      const franja = qa('*', caja().parentElement || caja()).filter(e => vis(e) && /^(lecciones|lessons)$/i.test(txt(e)) && !e.children.length)[0];
      if (franja) await press(franja, hay, 1500);
    }
    if (!hay()) await press(q('.home__unit', u.el) || q('.home__unitIW', u.el) || u.el, hay, 2000);
    lista = qav('.home__courseListItem', caja());
    if (!lista.length) lista = qav('.home__courseListItem');   // por si ED pinta la lista fuera de la tarjeta
    if (!lista.length) return false;
    const numL = x => +((txt(q('.home__courseListItemNumber', x)).match(/\d+/) || [0])[0]);
    const it = (preferida && lista.find(x => numL(x) === preferida)) || lista.find(x => { const pr = this.progresoLeccion(x); return pr != null && pr < 100; }) || lista[0];
    const link = q('.home__courseListItemLink', it) || it;
    log('🧭 Unidad', u.n, '→ lección', txt(q('.home__courseListItemNumber', it)) + ' ' + txt(q('.home__courseListItemName', it)));
    click(link);
    await sleep(5000);
    return true;
  }
  static async irHome() {
    const s = this.get(); if (s) { s.phase = 'home'; this.set(s); }
    try { localStorage.setItem('ed:saliendo', String(Date.now())); } catch (e) {}   // NUEVO v21.7: el aviso "test sin enviar" → Continue
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
    // AJUSTADA v21.8: con el mapa de My Progress, las unidades pendientes son las de realización < 100 %
    const m = ProgressMap.get(), conMapa = s.mapaHecho && m && m.unidades && m.unidades.length;
    const nums = conMapa ? m.unidades.filter(x => !x.locked && (x.completion == null || x.completion < 100)).map(x => x.n) : null;
    const pend = this.unidades().filter(u => (nums ? nums.includes(u.n) : !u.completa) && !s.unitsDone.includes(u.n)).sort((a, b) => a.n - b.n);
    if (!pend.length) {
      if (!s.testsHechos && (conMapa ? ProgressMap.testsBajos(m).length > 0 || (s.widgets.avg != null && s.widgets.avg < 100) : s.widgets.avg != null && s.widgets.avg < 100)) {
        // mapaHecho = false → se vuelve a leer My Progress (los puntajes pudieron cambiar) antes del barrido
        Object.assign(s, { mode: 'tests', phase: 'home', unitsDone: [], lessonsDone: [], objHechos: [], testsHechos: true, mapaHecho: false }); this.set(s);
        log('🧭 Unidades recorridas; promedio de tests', s.widgets.avg + '% → barrido de tests < 100');
        return { did: 'completar_a_tests' };
      }
      s.active = false; s.fin = new Date().toISOString(); this.set(s);
      log('🏁 COMPLETAR terminado.', s.widgets);
      window.__ed.stop();
      return { did: 'completar_fin', widgets: s.widgets };
    }
    const u = pend[0];
    const lu = conMapa ? (m.unidades.find(x => x.n === u.n) || { lecciones: [] }).lecciones.find(l => !l.terminado) : null;   // NUEVO v21.8
    Object.assign(s, { phase: 'entering_unit', unitTarget: u.n, unitStart: Date.now() }); this.set(s);
    if (!(await this.abrirUnidad(u, lu ? lu.n : null))) {
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
      // AJUSTADA v21.7: si el "pendiente" es siempre el MISMO (corrida de Nelson: el mismo test 257 veces en 2,5 h),
      // a la 3.ª vez se da por perdido y se sigue con la siguiente unidad.
      const dondeAhora = this.unitNum() + '|' + txt(qv('.learning__dropDownListTitleW--lessons')) + '|' + txt(qv('.learning__dropDownListTitleW--steps'));
      TestSweep._saltos = TestSweep._saltosDe === dondeAhora ? (TestSweep._saltos || 0) + 1 : 1; TestSweep._saltosDe = dondeAhora;
      const mismo = TestSweep._saltos >= 3;
      if (mismo) Reporter.capture('atascado_en_el_mismo_lugar', { donde: dondeAhora, veces: TestSweep._saltos });
      if (!tope && !mismo) { try { localStorage.setItem('ed:saliendo', String(Date.now())); } catch (e) {} const r = await DropdownNav.gotoNextIncomplete(); if (r) { log('🧭 Atasco → voy a lo pendiente:', r); return { did: 'completar_salto', a: r }; } }
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
    if (!/^https?:$/.test(location.protocol)) return { did: 'sweep_pagina_en_blanco' };   // NUEVO v21.6: about:blank no cuenta
    // NUEVO v21.6: "Tu sesión no está más activa en tu dispositivo" (ED cerró la sesión: la cuenta se abrió en otro
    // lugar o venció) → Aceptar y esperar el login (lo hace el robot de la nube, o tú si estás en tu PC).
    if (/no est[aá] m[aá]s activa|no longer active|vuelve a acceder/i.test((document.body && document.body.innerText) || '')) {   // solo texto VISIBLE
      Reporter.capture('sesion_cerrada_por_ed', { nota: '¿Se abrió esta cuenta en otro lugar mientras corría el bot?' });
      const ok = qa('button, a, input[type=button]').filter(vis).find(b => /^(aceptar|accept|ok)$/i.test(txt(b) || b.value || ''));
      if (ok) { click(ok); await sleep(2500); }
      return { did: 'sesion_cerrada_por_ed' };
    }
    if (/#\/login/i.test(location.href) || qv('input[name="userName"]')) return { did: 'esperando_login' };   // sin sesión: no anotar fallos
    // NUEVO v21.8 — My Progress: leer el mapa (unidades, lecciones, Last Test Score) y volver al Home
    if (ProgressMap.isPage()) {
      const homeUrl = s.homeUrl || location.href.split('#')[0] + '#/home';
      if (!s.mapaHecho) {
        const mapa = await ProgressMap.leer();
        Object.assign(s, { mapaHecho: true, sinMapa: !mapa.unidades.length, objetivos: ProgressMap.testsBajos(mapa), objHechos: s.objHechos || [], phase: 'home', homeUrl, widgets: mapa.widgets.completion != null ? mapa.widgets : s.widgets });
        this.set(s);
        if (!mapa.unidades.length) Reporter.capture('my_progress_sin_unidades');
      }
      location.href = homeUrl; await sleep(4000);
      return { did: 'mapa_leido', tests_bajos: (s.objetivos || []).length };
    }
    if (/#\/home/i.test(location.href) || qv('.home__unitW')) {
      s.homeUrl = location.href.split('#')[0] + '#/home'; this.set(s);
      // NUEVO v21.8: antes de nada, leer My Progress (una vez por fase); si no se puede, se sigue sin mapa
      if (!s.mapaHecho && !s.sinMapa) {
        if (await ProgressMap.ir()) return { did: 'voy_a_my_progress' };
        s.sinMapa = true; this.set(s); Reporter.capture('no_pude_abrir_my_progress');
      }
      if (s.mode !== 'completar' && s.mapaHecho && Array.isArray(s.objetivos)) {   // NUEVO v21.8: barrido con mapa
        const o = this.pendientesObj(s)[0];
        if (!o) { s.active = false; s.fin = new Date().toISOString(); this.set(s); log('🏁 BARRIDO COMPLETO: no quedan tests < 100.'); window.__ed.stop(); return { did: 'sweep_finished', resultados: s.resultados }; }
        const u = this.unidades().find(x => x.n === o.unidad);
        if (!u) { s.objHechos.push(o.unidad + '|' + o.leccion); this.set(s); Reporter.capture('objetivo_sin_unidad_en_home', o); return { did: 'objetivo_saltado', o }; }
        Object.assign(s, { phase: 'entering_unit', unitTarget: u.n }); this.set(s);
        log('🎯 Voy al test < 100: unidad', o.unidad, 'lección', o.leccion, '(' + o.test + ' %)');
        if (!(await this.abrirUnidad(u, o.leccion))) { s.objHechos.push(o.unidad + '|' + o.leccion); this.set(s); Reporter.capture('home_no_abre_lista_de_lecciones', { unidad: u.n }); }
        return { did: 'sweep_open_unit', unidad: u.n, leccion: o.leccion };
      }
      if (s.mode === 'completar') return await this.completarHome(s);
      s.widgets = this.leerWidgets(); this.set(s);
      const units = this.unidades();
      // AJUSTADA v21.6: todas las unidades aún no revisadas en este barrido (antes solo las posteriores a la última)
      const sig = units.filter(u => !s.unitsDone.includes(u.n)).sort((a, b) => a.n - b.n)[0];
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
