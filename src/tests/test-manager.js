// =====================================================================
//  TEST MANAGER — tests: inicio, puntaje, review (cosecha) y replay
// ---------------------------------------------------------------------
//  Flujo: Start → 1.er intento en blanco → Score <100 % → Review → pestaña "Correct Answer"
//  → cosechar cada pantalla → flechita atrás → reintento aplicando lo cosechado (replay).
//  DEPENDE DE: core/*, utils/*, exercises/index.js (PracticeSolver), core/dropdowns.js (DropdownNav)
//  EXPONE:     TestManager, scoreVisits
//  CON PINZAS: isScore(), isReview() y la entrada a Review están CONGELADAS.
// =====================================================================

// ===================================================================
//  TEST MANAGER — entrada a Review y Score 100 % congeladas
// ===================================================================
const scoreVisits = {};   // veces que se vio la pantalla de puntaje de cada test (tope de reintentos)

class TestManager {
  static isTestStart() { return !!qv('.btnStartTest'); }

  // NUEVA (de v17): ¿estamos contestando preguntas de un test?
  static inTest() { return RE_TEST_STEP.test(NavigationManager.stepLabel()) || !!qv('a.tasksBtnext.learning__submitTestLink'); }

  // NUEVA: ¿ya hay respuestas cosechadas de este test?
  static hasAnswers(key) {
    const a2 = StorageManager.getAns2()[key];
    return StorageManager.getKnown().includes(key) || !!(a2 && Object.keys(a2).length);
  }

  static findTab(re) {
    if (CFG.correctTabSelector && re === RE_TAB_CORRECT) {
      const ov = qv(CFG.correctTabSelector);
      if (ov) return ov;
    }
    const found = [];
    const skip = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode; const p = n.parentElement;
      if (!p || skip.test(p.tagName)) continue;
      const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length > 40 || !re.test(t)) continue;
      if (vis(p)) found.push(p);
    }
    qa('input[type="button"], input[type="submit"]').forEach(i => { if (vis(i) && re.test((i.value || '').trim())) found.push(i); });
    if (!found.length) return null;
    const rank = el => (el.closest('a, button, li, [role="tab"], [onclick], [class*="tab" i]') ? 0 : 1);
    return found.sort((a, b) => rank(a) - rank(b))[0];
  }

  static hasReviewTabs() { return !!this.findTab(RE_TAB_CORRECT); }

  static tabIsActive(el) {
    let n = el;
    for (let i = 0; n && n !== document.body && i < 3; i++, n = n.parentElement) {
      const a = k => (n.getAttribute ? n.getAttribute(k) : null);
      if (a('aria-selected') === 'true' || a('aria-pressed') === 'true' || a('aria-current') === 'true' || a('aria-current') === 'page') return true;
      const cn = typeof n.className === 'string' ? n.className : (a('class') || '');
      if (RE_ACTIVE.test(cn)) return true;
      if (n.tagName === 'INPUT' && n.checked) return true;
    }
    return false;
  }

  static reviewSig() {
    return qa('.prMCQ__qaInnerSet').map(s =>
      qa('.prMCQ__answers', s).map(a => (vis(a) ? 'v' : 'h') + a.className).join(',')
    ).join('|');
  }

  // ---------------------------------------------------------------
  // PARA QUÉ: asegura que la pestaña "Correct Answer" quede activa ANTES de leer.   [AJUSTADA]
  // ANTES: 1 solo clic sin comprobar nada → a veces el clic no "pegaba" y se cosechaba la
  //        vista "Your Answer" (o nada) → "a veces lo salta".
  // AHORA: hasta 3 estrategias de clic (click normal → secuencia pointer/mouse → ancestro clicable),
  //        comprobando tras cada una que cambió la vista o que la pestaña quedó activa.
  //        Atajos: si ya estaba activa o la pantalla no es MCQ (no se puede verificar) → 1 clic.
  //        Si tras 3 intentos no se confirma, avisa pero NO detiene el bot.
  // ---------------------------------------------------------------
  static async ensureCorrectAnswerTab() {
    let tab = await waitFor(() => this.findTab(RE_TAB_CORRECT), 5000, 250);
    if (!tab) throw new Error('ED_CORRECT_TAB_MISSING');

    const wasActive = this.tabIsActive(tab);
    const verifiable = qa('.prMCQ__qaInnerSet').length > 0;

    const strategies = [
      el => click(el),
      el => {
        const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
        for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          const Ev = (t.startsWith('pointer') && window.PointerEvent) ? window.PointerEvent : MouseEvent;
          try { el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, button: 0 })); } catch (e) {}
        }
      },
      el => { const a = el.closest('a, button, li, [role="tab"], [onclick]'); if (a && a !== el) click(a); }
    ];

    for (let i = 0; i < strategies.length; i++) {
      const before = this.reviewSig();
      strategies[i](tab);
      // AJUSTADA v20.2 — pantallas NO-MCQ (DnD, desplegables): antes era "1 clic + 600 ms" SIN comprobar,
      // y a veces se cosechaba "Tu respuesta" (vacía). Ahora espera a que el <li> de la pestaña quede
      // .active (confirmado en ED: <li class="active"><a>Respuesta correcta</a></li>) y a que se vean
      // las respuestas en los huecos. La rama MCQ de abajo NO cambió.
      if (!verifiable) {
        const act = await waitFor(() => { const t2 = this.findTab(RE_TAB_CORRECT); return !!(t2 && this.tabIsActive(t2)); }, 2000, 200);
        if (!act && i < strategies.length - 1) { tab = this.findTab(RE_TAB_CORRECT) || tab; continue; }
        await waitFor(() => this.answersShown(), 2500, 250);
        await sleep(CFG.harvestPause);
        return tab;
      }
      if (wasActive) { await sleep(600); return tab; }
      const ok = await waitFor(() => {
        if (this.reviewSig() !== before) return true;
        const t2 = this.findTab(RE_TAB_CORRECT);
        return !!(t2 && this.tabIsActive(t2));
      }, 1500, 200);
      if (ok) return tab;
      tab = this.findTab(RE_TAB_CORRECT) || tab;
    }
    warn('No pude confirmar que la pestaña "Correct Answer" quedó activa; sigo con lo que se ve.');
    return tab;
  }

  // NUEVA v20.2: ¿ya se ven respuestas en pantalla? (huecos DnD con fichas, desplegables o droptargets con texto)
  static answersShown() {
    const m = testDndModel();
    if (m && m.dests.some(d => qa('.dnditem', d).length)) return true;
    if (qav('.DDLOptions__selected').some(e => txt(e))) return true;
    if (qav('.droptarget').some(e => txt(e))) return true;
    return false;
  }

  // ESTAS DOS NO SE TOCAN: entrada a Score y a Review (congeladas)
  static isScore() {
    if (this.isTestStart()) return false;
    if (this.hasReviewTabs()) return false;
    if (qv('.TestResults') || qv('.testFeedback')) return true;
    const main = qv('.learning__container') || document.body;
    return RE_SCORE.test(txt(main).slice(0, 3000));
  }

  static isReview() {
    if (this.isTestStart()) return false;
    if (this.isScore()) return false;
    return this.hasReviewTabs();
  }

  static scorePct() {
    const el = qv('.TestResults') || qv('.testFeedback') || qv('.learning__container') || document.body;
    const m = txt(el).match(/(\d{1,3})\s*%/);
    return m ? +m[1] : null;
  }

  static correctLabels(set) {
    const pick = onlyVisible => qa('.prMCQ__answers', set).filter(a =>
      !a.classList.contains('hide') &&
      (!onlyVisible || vis(a)) &&
      !/incorrect|wrong/i.test(a.className) &&
      (a.classList.contains('prMCQ__answers--correct') || q('.correct', a))
    );
    let corr = pick(true);
    if (!corr.length) corr = pick(false);
    return [...new Set(corr.map(a => txt(q('label.prMCQ__answerLabel, .multiTextInline, label', a))).filter(Boolean))];
  }

  // NUEVA (de v17): lee los desplegables de la pantalla de review (con "Correct Answer" activo)
  static readFitb() { return qav('.DDLOptions__selected').map(txt); }

  // NUEVA (de v17, mejorada): lee dónde quedó cada elemento DnD en el review.
  // Guarda TODOS los elementos de cada zona (`texts`) y el primero (`text`, compatibilidad con v17).
  // AJUSTADA v20.3: usa testDndModel(); en la clasificación (columnas con encabezado) toma las columnas
  // como huecos aunque tengan 2+ fichas. Para el resto de pantallas hace exactamente lo de antes.
  static readDnd() {
    const m = testDndModel();
    if (!m) return [];
    const zones = qav('.dndZone');
    const dests = (qav('.dndBank').length || m.byHeader) ? m.dests : zones.filter(z => !(qa('.dnditem', z).length >= 2 && zones.length > 2));
    return dests.map(z => { const texts = qa('.dnditem', z).map(txt).filter(Boolean); return { label: zoneLabel(z), texts, text: texts[0] || '' }; });
  }

  // ---------------------------------------------------------------
  // PARA QUÉ: cosecha la pantalla de review actual y pasa a la siguiente.        [AJUSTADA]
  // MCQ: igual que v19.6. NUEVO: también FITB y DnD (se guardan en ed:testAns:v2[key][idx]).
  // NUEVO: al salir de la última pantalla del review, usa la flechita atrás (backToTest).
  // ---------------------------------------------------------------
  static async harvestReview(key) {
    log('📖 [Review Cosecha] Extrayendo respuestas correctas:', key);
    await this.ensureCorrectAnswerTab();
    const ans = StorageManager.getAns();
    const ans2 = StorageManager.getAns2();
    ans2[key] = ans2[key] || {};
    const c = NavigationManager.counter(); const idx = c ? c.i : 1;
    const items = qa('.prMCQ__qaInnerSet').map(s => ({ q: mcqQuestionText(s), a: this.correctLabels(s) }));
    const fitb = this.readFitb();
    const dnd = this.readDnd();
    let saved = 0;
    const entry = {};
    if (items.length) {
      entry.mcq = items;
      for (const m of items) {
        if (m.q && m.a.length) { ans[m.q] = m.a.length === 1 ? m.a[0] : m.a; saved++; }
      }
    }
    if (fitb.some(Boolean)) { entry.fitb = fitb; saved += fitb.filter(Boolean).length; }
    if (dnd.some(d => d.texts.length)) { entry.dnd = dnd; saved += dnd.filter(d => d.texts.length).length; }
    if (Object.keys(entry).length) {
      ans2[key][idx] = entry;
      try {
        localStorage.setItem(K_ANS, JSON.stringify(ans));
        localStorage.setItem(K_ANS2, JSON.stringify(ans2));
      } catch (e) {}
    }
    if (saved) StorageManager.addKnown(key);
    await NavigationManager.goNext();
    await sleep(1500);

    // ¿Terminó el review? (ya no hay pestañas tras esperar un poco y el contador estaba en la última)
    const stillReview = await waitFor(() => this.hasReviewTabs(), 2500, 300);
    const looksLast = !c || c.i >= c.n;
    if (!stillReview && looksLast && CFG.retakeAfterReview) await this.reopenAfterReview(key);   // AJUSTADA v20.1
    return { harvested: true, idx, saved };
  }

  // ---------------------------------------------------------------
  // PARA QUÉ: terminado el review, VOLVER AL TEST para hacer el replay.            [NUEVA v20.1]
  // Lo llaman harvestReview() (última pantalla) y la guardia de MainEngine.step()
  // (cuando el review termina y ED ya saltó a la siguiente lección).
  // Prueba en orden y VERIFICA cada intento (¿estoy en la lección y el step del test?):
  //   1) la flechita "<" de abajo a la derecha (como lo haces a mano)  — selectores SIN confirmar
  //   2) los desplegables de lección/step (reopenTest, RECUPERADO de v17)
  //   3) la flechita de la cabecera (backToTest, la de v19.7)
  // Si cae en la pantalla de puntaje, pulsa Retake. Si nada funciona, avisa y devuelve false.
  // ---------------------------------------------------------------
  static async reopenAfterReview(key) {
    const [lessonLbl, stepLbl] = String(key || '').split('||');
    const run = Object.assign({ key, lesson: lessonLbl, step: stepLbl }, StorageManager.getRun() || {}, { key, phase: 'replay' });
    StorageManager.setRun(run);
    const enElTest = () => lessonNum(NavigationManager.lessonLabel()) === lessonNum(lessonLbl) && stepNum(NavigationManager.stepLabel()) === stepNum(stepLbl);
    const intentos = [
      ['flechita <', () => this.prevArrow()],
      ['desplegables', () => this.reopenTest(lessonLbl, stepLbl)],
      ['flechita cabecera', () => this.backToTest()]
    ];
    for (const [nombre, fn] of intentos) {
      if (enElTest()) break;
      let ok = false;
      try { ok = await fn(); } catch (e) { warn('reopen', nombre, e.message); }
      if (ok) await waitFor(() => enElTest(), 6000, 300);
      log(enElTest() ? `↩️ De vuelta en el test (${nombre}).` : `↩️ ${nombre}: no me llevó al test.`);
    }
    if (!enElTest()) { warn('No pude volver al test', key, '→ ábrelo a mano y __ed.auto() hará el replay.'); return false; }
    await this.retakeIfScore();
    return true;
  }

  // PARA QUÉ: pulsa la flechita "<" de la barra de abajo (al lado de "5 / 10").    [NUEVA v20.1]
  // Los selectores son una SUPOSICIÓN por analogía con el Next (a.tasksBtnext.learning__nextItemLink).
  static async prevArrow() {
    const nx = q('a.tasksBtnext') || q('.learning__nextItemLink');
    const bar = nx ? (nx.parentElement?.closest('[class*="tasksBtn" i], [class*="footer" i], [class*="bottom" i]') || nx.parentElement?.parentElement) : null;
    const prev = qv('a.tasksBtprev') || qv('a[class*="prevItemLink" i]') || qv('a[class*="tasksBtprev" i]') ||
      (bar ? qa('a, button', bar).filter(vis).find(e => /prev|back/i.test(e.className || '')) : null);
    if (!prev) return false;
    log('↩️ Pulsando la flechita "<"');
    click(prev); await sleep(2500); await NavigationManager.handleModals();
    return true;
  }

  // PARA QUÉ: reabre el test con los desplegables (lección → step).               [RECUPERADA de v17]
  static async reopenTest(lessonLbl, stepLbl) {
    const ln = lessonNum(lessonLbl);
    if (ln && lessonNum(NavigationManager.lessonLabel()) !== ln) { if (!(await DropdownNav.gotoLesson(ln))) return false; }
    if (stepNum(NavigationManager.stepLabel()) !== stepNum(stepLbl)) { if (!(await DropdownNav.gotoStep(stepLbl))) return false; }
    return true;
  }

  // PARA QUÉ: si al volver aparece el puntaje viejo, pulsa Retake.                 [RECUPERADA de v17]
  static async retakeIfScore() {
    await waitFor(() => this.isTestStart() || this.isScore() || this.inTest(), 6000, 300);
    if (this.isTestStart() || !this.isScore()) return false;
    const re = qa('a, button, input[type=button]').filter(vis).find(b => RE_RETAKE.test(txt(b) || b.value || ''));
    if (!re) { warn('Estoy en el puntaje del test pero no veo botón Retake.'); return false; }
    log('🔁 Retake'); click(re); await sleep(2500);
    return true;
  }

  // ---------------------------------------------------------------
  // PARA QUÉ: tras la revisión, pulsa la flechita "atrás" para reabrir el test.  [NUEVA]
  // Solo usa selectores específicos (no busca textos genéricos) para no salir de la lección
  // por error. Si no la encuentra, avisa y deja todo como estaba (no rompe nada).
  // ---------------------------------------------------------------
  static async backToTest() {
    const back = qv('a.learning__headerBack') || qv('.learning__headerBack') ||
      qv('a[class*="headerBack" i]') || qv('a[class*="learning__back" i]') ||
      qv('a[title="Back" i], a[aria-label="Back" i], button[title="Back" i], button[aria-label="Back" i]');
    if (!back) { warn('Review terminado, pero no encontré la flechita atrás. Abre el test a mano y __ed.auto() hará el replay.'); return false; }
    log('↩️ Review terminado → flechita atrás para reabrir el test');
    click(back);
    await sleep(2500);
    await NavigationManager.handleModals();
    const run = StorageManager.getRun();
    if (run) { run.phase = 'replay'; StorageManager.setRun(run); }
    return true;
  }

  // ---------------------------------------------------------------
  // PARA QUÉ: en el REINTENTO de un test aplica lo cosechado en la pregunta actual.  [NUEVA]
  // Si todavía no hay nada cosechado devuelve null → el flujo es el de siempre (v19.6).
  // Usa SIEMPRE la clave del test actual (lección||step), nunca un `run` viejo, para no
  // aplicar respuestas de otro test.
  // ---------------------------------------------------------------
  static async replayQuestion() {
    const key = NavigationManager.testKey();
    if (!this.hasAnswers(key)) {
      const run = StorageManager.getRun();
      if (run && run.key && run.key !== key) warn('Hay un run con otra clave:', run.key, '≠', key, '(no se aplica replay)');
      return null;
    }
    const c = NavigationManager.counter();
    const idx = c ? c.i : 1;
    const scr = (StorageManager.getAns2()[key] || {})[idx] || {};
    const out = { did: 'test_replay', idx: c && c.s };
    if (qv('label.prMCQ__answerLabel')) out.mcq = await PracticeSolver.solveMCQ(scr.mcq || null);
    if (qv('.DDLOptions__selected')) out.fitb = await PracticeSolver.solveFITB(scr.fitb && scr.fitb.length ? scr.fitb : null);
    if (PracticeSolver.isDragAndDrop()) out.dnd = await PracticeSolver.solveDragAndDrop(false, scr.dnd && scr.dnd.length ? scr.dnd : null);
    await sleep(500);
    await NavigationManager.goNext();
    return out;
  }

  // NUEVA: tope de reintentos. Cuenta las veces que se ve la pantalla de puntaje < 100 %.
  static tooManyRetries(key) {
    scoreVisits[key] = (scoreVisits[key] || 0) + 1;
    return scoreVisits[key] > CFG.maxTestAttempts;
  }
}
