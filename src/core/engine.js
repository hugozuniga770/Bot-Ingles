// =====================================================================
//  MOTOR PRINCIPAL — decide qué hacer en cada "paso"
// ---------------------------------------------------------------------
//  detectKind() clasifica la pantalla; runKind() llama al solver; step() es UN paso:
//  popups → test start → score → review → replay → ejercicio pendiente → Next.
//  DEPENDE DE: todo lo anterior
//  EXPONE:     MainEngine
// =====================================================================

// ===================================================================
//  MOTOR PRINCIPAL (MAIN ENGINE)
// ===================================================================
class MainEngine {

  // PARA QUÉ: dice qué tipo de ejercicio hay en pantalla. Lo usan step() y __ed.inspect(),
  // así que lo que ves en inspect() es EXACTAMENTE lo que decide el bot.
  // Orden: lo más específico primero. `sequence` va ANTES que `open_speech` (v19.6 lo tenía después).
  static detectKind() {
    if (qv('iframe[id^="mce_"][id$="_ifr"]')) return 'writing';
    if (qav('span.st.learning__selectTxt_st').length) return 'select_text';
    if (qv('.prSeq__container')) return 'sequence';
    if (qv('.openSpeech__AnsW')) return 'open_speech';
    if (qav('a.chooseCaracterArrow').length) return 'interactive_speaking';
    if ((qv('.questionInstructionsSR') || qv('.questionAnswersSet.speaker')) && qv('a.button.continue')) return 'sr_choice';
    if (PracticeSolver.isDragAndDrop()) return 'dnd';
    if (qv('.DDLOptions__selected')) return 'fitb';
    if (qv('label.prMCQ__answerLabel') || qv('.prMCQ__qaInnerSet')) return 'mcq';
    if (PracticeSolver.textInputs().length) return 'text';
    if (qv('.layout__mediaPlayPause')) return 'media';
    return 'mcq_default';   // nada reconocido: se comporta como v19.6 (solveMCQ → checkboxes sueltos)
  }

  // PARA QUÉ: llama al solver del tipo detectado.
  static async runKind(kind) {
    switch (kind) {
      case 'writing': return PracticeSolver.solveWriting();
      case 'select_text': return PracticeSolver.solveSelectText();
      case 'sequence': return PracticeSolver.solveSequence();
      case 'open_speech': return PracticeSolver.solveOpenSpeech();
      case 'interactive_speaking': return PracticeSolver.solveInteractive();
      case 'sr_choice': return PracticeSolver.solveSRChoice();
      case 'dnd': return PracticeSolver.solveDragAndDrop(false);   // false = colocar TODOS los elementos
      case 'fitb': return PracticeSolver.solveFITB();
      case 'text': return PracticeSolver.solveText();
      case 'media': return PracticeSolver.solveMedia();
      default: return PracticeSolver.solveMCQ();                   // 'mcq' y 'mcq_default'
    }
  }

  static async step() {
    if (!/learningArea/i.test(location.href) && !q('.learning__dropDownListTitleW--steps')) return { did: 'not_in_lesson' };
    await NavigationManager.handleModals();

    if (TestManager.isTestStart()) {
      const key = NavigationManager.testKey();
      log('🚀 [Test Start] Iniciando test:', key);
      click(qv('.btnStartTest'));
      await sleep(3000);
      return { did: 'test_started' };
    }

    if (TestManager.isScore()) {
      const pct = TestManager.scorePct() ?? 0;
      const key = NavigationManager.testKey();
      StorageManager.saveScore(key, pct);

      // NUEVO: si ya se reintentó el máximo y sigue < 100 %, se rinde (evita bucle infinito)
      if (pct < 100 && TestManager.tooManyRetries(key)) {
        // AJUSTADA v20.1 (decisión de Hugo): DETENERSE y avisar, en vez de seguir con lo siguiente.
        // Para volver al comportamiento anterior: __ed.cfg({ stopIfNot100: false })
        if (CFG.stopIfNot100) {
          scoreVisits[key] = 0;
          StorageManager.setRun(null);
          throw new Error(`ED_TEST_NO_100: ${key} quedó en ${pct}% tras ${CFG.maxTestAttempts} reintentos. Revísalo y vuelve a __ed.auto().`);
        }
        warn(`Test sin 100 % tras ${CFG.maxTestAttempts} reintentos (${pct}%) → sigo con lo siguiente.`);
        scoreVisits[key] = 0;
        StorageManager.setRun(null);
        await NavigationManager.goNext();
        return { did: 'test_gave_up', pct };
      }

      if (pct === 100) {
        scoreVisits[key] = 0;
        StorageManager.setRun(null);
        await NavigationManager.goNext();
        return { did: 'test_passed_100', pct };
      } else {
        log(`⚠️ Test con puntaje menor a 100% (${pct}%). Buscando el botón Review...`);
        StorageManager.setRun({ key, phase: 'review', attempts: 1 });
        let rv = null;
        for (let attempt = 1; attempt <= 15; attempt++) {
          rv = qv('.learning__testReviewLink') || qv('.learning__testReview a') || qv('.learning__testReview') ||
               qa('button, a, div, span').find(el => vis(el) && /^(review|revisar)$/i.test(txt(el)));
          if (rv) break;
          await sleep(400);
        }
        if (rv) {
          click(rv);
          await sleep(3000);
          return { did: 'opened_review_forced', pct };
        }
        throw new Error('ED_REVIEW_LINK_MISSING');
      }
    }

    if (TestManager.isReview()) {
      const run = StorageManager.getRun();
      const key = (run && run.key) ? run.key : NavigationManager.testKey();
      return await TestManager.harvestReview(key);
    }

    // NUEVO — guardia anti-salto: si estamos en pleno review y las pestañas "desaparecen" un instante
    // (ED recargando la siguiente pantalla), antes el bot caía en "no_task_navigated" y SALTABA esa
    // pantalla sin cosechar. Ahora espera hasta 6 s a que reaparezca; si no reaparece, el review terminó.
    const run0 = StorageManager.getRun();
    if (run0 && run0.phase === 'review') {
      const back = await waitFor(() => TestManager.hasReviewTabs() || TestManager.isScore() || TestManager.isTestStart(), 6000, 300);
      if (back) return { did: 'review_wait_retry' };
      // AJUSTADA v20.1: antes solo limpiaba el run y el bot seguía con la lección siguiente
      // (eso es lo que pasaba en tu captura). Ahora VUELVE AL TEST para el replay.
      if (CFG.retakeAfterReview && run0.key) {
        log('Review terminado (sin pestañas) → vuelvo al test para el replay.');
        const ok = await TestManager.reopenAfterReview(run0.key);
        if (!ok) StorageManager.setRun(null);
        return { did: ok ? 'test_reopened' : 'test_reopen_failed' };
      }
      StorageManager.setRun(null);
      log('Review terminado (sin pestañas) → run limpiado.');
    }

    // NUEVO — replay: si ya hay respuestas cosechadas, contesta la pregunta actual del test.
    // Si no hay (primer intento) devuelve null y todo sigue como en v19.6.
    if (TestManager.inTest()) {
      const rp = await TestManager.replayQuestion();
      if (rp) return rp;
    }

    const t = NavigationManager.curTask();
    if (!t) {
      // NUEVO (de v17): pantallas sin navegador de tareas también se resuelven (salvo tests).
      let res = { did: 'no_task_navigated' };
      if (CFG.solveWithoutTaskNav && !TestManager.inTest()) {
        const kind = MainEngine.detectKind();
        const noTasksAtAll = !NavigationManager.tasks().length;
        if (kind !== 'mcq_default' && (kind !== 'media' || noTasksAtAll)) {
          res = Object.assign({}, await MainEngine.runKind(kind), { kind });
          if (res.waitDone) await sleep(Math.min(res.waitDone, 4000));
        }
      }
      await NavigationManager.goNext();
      return res;
    }
    if (t.done) { await NavigationManager.goNext(); return { did: 'task_already_done_next' }; }

    // ENRUTAMIENTO DE EJERCICIOS (tarea pendiente)
    const kind = MainEngine.detectKind();
    const res = Object.assign({}, await MainEngine.runKind(kind), { kind });

    // NUEVO: los ejercicios de habla/audio necesitan tiempo hasta que ED los marque como hechos
    if (res.waitDone) await waitFor(() => NavigationManager.taskDone(t.n), res.waitDone, 300);

    await sleep(800);
    await NavigationManager.goNext();
    return res;
  }
}
