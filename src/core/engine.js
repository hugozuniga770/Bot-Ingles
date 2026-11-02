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
// Tipos que NO se repiten solos si ED no marca la tarea (caros, o repetirlos no ayuda)
const NO_RETRY_KINDS = new Set(['writing', 'open_speech', 'interactive_speaking', 'sr_choice', 'media', 'memory', 'explore']);   // AJUSTADA v21.11: + explore

class MainEngine {

  // PARA QUÉ: dice qué tipo de ejercicio hay en pantalla. Lo usan step() y __ed.inspect(),
  // así que lo que ves en inspect() es EXACTAMENTE lo que decide el bot.
  // Orden: lo más específico primero. `sequence` va ANTES que `open_speech` (v19.6 lo tenía después).
  static detectKind() {
    if (qv('iframe[id^="mce_"][id$="_ifr"]') || qv('.prWriting__main')) return 'writing';   // AJUSTADA v21.0: + .prWriting__main (el editor tarda en aparecer)
    if (qav('span.st.learning__selectTxt_st').length) return 'select_text';
    if (qv('.prSeq__container')) return 'sequence';
    if (qv('.openSpeech__AnsW')) return 'open_speech';
    if (qav('a.chooseCaracterArrow').length || qv('.speakingInteract') || qv('.answersWrapper.interact2')) return 'interactive_speaking';   // AJUSTADA v21.2: Interact 2 no trae flechas
    if ((qv('.questionInstructionsSR') || qv('.questionAnswersSet.speaker')) && qv('a.button.continue')) return 'sr_choice';
    if (PracticeSolver.isMemoryGame()) return 'memory';               // NUEVO v20.8
    if (PracticeSolver.isAddInText()) return 'add_in_text';           // NUEVO v21.7
    if (PracticeSolver.isDropTargetScreen()) return 'droptarget';   // NUEVO v20.6: antes caía en 'media' (por el video)
    if (PracticeSolver.isDragAndDrop()) return 'dnd';
    if (qv('.DDLOptions__selected')) return 'fitb';
    if (PracticeSolver.isLegacyDDL()) return 'ddl_legacy';   // NUEVO v20.7 (antes caía en 'media')
    if (qv('label.prMCQ__answerLabel') || qv('.prMCQ__qaInnerSet')) return 'mcq';
    if (PracticeSolver.isLegacyMCQ()) return 'mcq_legacy';   // NUEVO v20.7 (antes caía en 'media')
    if (PracticeSolver.textInputs().length) return 'text';
    // AJUSTADA v21.12: Explore ANTES que media (dumps de Hugo 02/11: los "Step 1: Explore" con video se tomaban como
    // mcq_default porque el reproductor tardaba en cargar; y si cargaba, media lo pausaba a los 3 s)
    if (PracticeSolver.isExplore()) return 'explore';   // NUEVO v21.11: video, tarjetas de vocabulario, segmentos
    if (qv('.layout__mediaPlayPause')) return 'media';
    return 'mcq_default';   // nada reconocido: se comporta como v19.6 (solveMCQ → checkboxes sueltos)
  }

  // PARA QUÉ: llama al solver del tipo detectado.
  static async runKind(kind) {
    switch (kind) {
      case 'writing': await waitFor(() => qv('iframe[id^="mce_"][id$="_ifr"]'), 6000, 250); return PracticeSolver.solveWriting();   // AJUSTADA v21.0: esperar al editor
      case 'select_text': return PracticeSolver.solveSelectText();
      case 'sequence': return PracticeSolver.solveSequence();
      case 'open_speech': return PracticeSolver.solveOpenSpeech();
      case 'interactive_speaking': return PracticeSolver.solveInteractive();
      case 'sr_choice': return PracticeSolver.solveSRChoice();
      case 'memory': return PracticeSolver.solveMemoryGame();         // NUEVO v20.8
      case 'add_in_text': return PracticeSolver.solveAddInText();     // NUEVO v21.7
      case 'droptarget': return PracticeSolver.solveDropTarget();      // NUEVO v20.6
      case 'dnd': return PracticeSolver.solveDragAndDrop(false);   // false = colocar TODOS los elementos
      case 'fitb': return PracticeSolver.solveFITB();
      case 'ddl_legacy': return PracticeSolver.solveLegacyDDL();      // NUEVO v20.7
      case 'mcq_legacy': return PracticeSolver.solveLegacyMCQ();      // NUEVO v20.7
      case 'text': return PracticeSolver.solveText();
      case 'media': return PracticeSolver.solveMedia();
      case 'explore': return PracticeSolver.solveExplore();          // NUEVO v21.11
      default: return PracticeSolver.solveMCQ();                   // 'mcq' y 'mcq_default'
    }
  }

  static async step() {
    // NUEVO v21.11: ¿empezó una corrida nueva? → se olvidan los fallos y reintentos de la anterior (regla 4)
    Corrida.get();
    Tablero.aqui();   // NUEVO v21.13: el tablero muestra por dónde va (unidad → lección → paso/test)
    // NUEVO v21.7: aviso de ED "You haven't submitted your test" en la página o en un marco de la misma web
    for (const d of [document, ...qa('iframe').map(f => { try { return f.contentDocument; } catch (e) { return null; } }).filter(Boolean)]) {
      const ok = d.querySelector && d.querySelector('#popupButtonsWrapper #btnOk');
      if (ok && /submitted your test|no has enviado/i.test((d.body && d.body.innerText) || '')) {
        const saliendo = +(localStorage.getItem('ed:saliendo') || 0) > Date.now() - 120000;
        const b = saliendo ? ok : (d.getElementById('btnCancel') || ok);
        log('🪟 Aviso de test sin enviar →', saliendo ? 'Continue (salgo)' : 'Cancel (vuelvo al test)'); b.click(); await sleep(1500);
        return { did: 'aviso_test_sin_enviar', boton: saliendo ? 'Continue' : 'Cancel' };
      }
    }
    if (!/learningArea/i.test(location.href) && !q('.learning__dropDownListTitleW--steps')) {
      const sw = await TestSweep.pageStep();   // NUEVO v20.8: barrido (Home y páginas intermedias)
      return sw || { did: 'not_in_lesson' };
    }
    await NavigationManager.handleModals();
    { const sw = await TestSweep.lessonStep(); if (sw) return sw; }   // NUEVO v20.8: barrido de tests

    if (TestManager.isTestStart()) {
      const key = NavigationManager.testKey();
      // NUEVO v21.9 — corrida de Jose (01/11): tras rendirse con un test (97 % tras los reintentos), "voy a lo
      // pendiente" lo volvía a abrir y lo hacía ENTERO 4 veces más (~10 min y 4 intentos más en ED, que podrían
      // bajar la nota si ED cuenta el último). Si ya me rendí con él en esta corrida → no lo empiezo otra vez.
      // NUEVO v21.15 — en la pantalla "Start Test" de un test ya hecho, Next no lleva a ningún lado: el bot repetía
      // "test_ya_terminado" 6 veces (~1 min) hasta el atasco (22 veces en las 6 corridas). Ahora avanza enseguida.
      const salir = async () => {
        const sg = NavigationManager.screenSig();
        await NavigationManager.goNext();
        if (NavigationManager.screenSig() === sg && TestSweep.active()) { const a = await TestSweep.avanzar(); if (a) { log('➡️ Test ya hecho y Next no avanza → paso a', a); return a; } }
        return null;
      };
      if (TestSweep.rendido()) {
        log('⏭️ Ya me rendí con este test en esta corrida → no lo repito:', key);
        const a = await salir();
        return Object.assign({ did: 'test_rendido_no_repito', key }, a ? { avance: a } : {});
      }
      // NUEVO v21.7: un test ya terminado NO se rehace (cada intento parece contar en el promedio de ED),
      // salvo que sepamos que quedó < 100 %.
      if (!CFG.retakeDoneTests && TestManager.yaTerminado() && !ProgressMap.testBajo(TestSweep.unitNum(), +lessonNum(NavigationManager.lessonLabel()) || 0)) {   // AJUSTADA v21.8
        const sc = StorageManager.getScores()[key];
        if (!(sc != null && sc < 100)) {
          log('⏭️ Test ya terminado (' + (sc != null ? sc + ' %' : 'puntaje no conocido') + ') → no lo rehago:', key);
          const a = await salir();
          return Object.assign({ did: 'test_ya_terminado', key, pct: sc ?? null }, a ? { avance: a } : {});
        }
      }
      log('🚀 [Test Start] Iniciando test:', key);
      click(qv('.btnStartTest'));
      // AJUSTADA v20.7: antes 3 s fijos; ahora hasta que desaparezca el botón Start (mismo tope)
      if (await waitFor(() => !TestManager.isTestStart(), 3000, 200)) await sleep(600);
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
        if (TestSweep.active()) {   // NUEVO v20.8: en el barrido NO se detiene: anota y sigue
          scoreVisits[key] = 0; StorageManager.setRun(null);
          TestSweep.markLesson(pct, 'sin 100 tras reintentos');
          Reporter.capture('test_sin_100', { pct, key });
          await NavigationManager.goNext();
          return { did: 'sweep_test_gave_up', pct };
        }
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
        if (TestSweep.active()) TestSweep.markLesson(100);   // NUEVO v20.8
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
          // AJUSTADA v20.7: antes 3 s fijos; ahora hasta que aparezcan las pestañas del review (tope 4 s)
          if (await waitFor(() => TestManager.hasReviewTabs(), 4000, 250)) await sleep(400);
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
      Reporter.marcarAntes();   // NUEVO v21.11: si el replay falla, el reporte trae la pregunta antes y después
      const rp = await TestManager.replayQuestion();
      // NUEVO v21.12 — corrida de Mateo (U14 L5 "Modals: Review" y L3): tras Start el test NO mostró ninguna pregunta
      // (idx null, pantalla vacía, 5 veces seguidas) y se perdió (igual que Nelson en v21.6). A la 3.ª vez: reporte con
      // dump completo y recargar la página UNA vez por corrida (un test sin enviar no cuenta en la nota).
      if (rp && rp.idx == null) {
        const clave = NavigationManager.testKey(), veces = Corrida.fallo('sinPreguntas|' + clave);
        if (veces === 3) {
          Reporter.capture('test_sin_preguntas', { veces, marcos: qa('iframe').length });
          if (!Corrida.fallos('recarga|' + clave)) {
            Corrida.fallo('recarga|' + clave);
            log('🔄 El test no muestra preguntas → recargo la página una vez');
            try { localStorage.setItem('ed:saliendo', String(Date.now())); } catch (e) {}
            // AJUSTADA v21.15: recargar NO lo arregla (ED queda sin cargar); con el barrido → Home y volver a entrar
            if (TestSweep.active()) { log('🏠 El test no muestra preguntas → voy al Home y vuelvo a entrar'); await TestSweep.irHome(); return { did: 'test_sin_preguntas_al_home', veces }; }
            (window.__edRecargar || (() => location.reload()))(); await sleep(8000);
            return { did: 'test_sin_preguntas_recargo', veces };
          }
        }
      }
      if (rp) return rp;
      // NUEVO v20.7 — TEST EXPRÉS: 1.er intento (aún sin respuestas cosechadas) → no se resuelve nada,
      // se va directo al Submit. Lo que importa es el review y el reintento. Apagar: cfg({testExpress:false})
      if (CFG.testExpress && !TestManager.hasAnswers(NavigationManager.testKey())) return await TestManager.expressSubmit();
    }

    const t = NavigationManager.curTask();
    if (!t) {
      // NUEVO (de v17): pantallas sin navegador de tareas también se resuelven (salvo tests).
      let res = { did: 'no_task_navigated' };
      if (CFG.solveWithoutTaskNav && !TestManager.inTest()) {
        let kind = MainEngine.detectKind();
        const noTasksAtAll = !NavigationManager.tasks().length;
        // NUEVO v21.11 (regla 4): lo caro sin tarea que verificar (p. ej. Explore) se intenta UNA vez por corrida
        const lugar0 = Corrida.lugar(null);
        // NUEVO v21.12 (Hugo: "dales más tiempo para que carguen"): Explore/Prepare sin barra de tareas (Mateo: "Listen to
        // the recording", "Listen to the examples") con un reproductor que aún carga → esperar hasta 25 s, UNA vez por lugar
        if (kind === 'mcq_default' && ExploreSolver.esPasoExplore() && q('.learning__RAMediaResourceW, .learning__resourcesArea audio, .learning__resourcesArea video, .learning__vocabularyCards') && !Corrida.fallos('carga|' + lugar0)) {
          Corrida.fallo('carga|' + lugar0);
          const k2 = await waitFor(() => { const k = MainEngine.detectKind(); return k !== 'mcq_default' ? k : null; }, 25000, 300); if (k2) kind = k2;
        }
        if (NO_RETRY_KINDS.has(kind) && Corrida.fallos(lugar0) >= 1) res = { did: 'saltado_ya_intentado', kind };
        else if (kind !== 'mcq_default' && (kind !== 'media' || noTasksAtAll)) {
          Reporter.marcarAntes();
          res = Object.assign({}, await MainEngine.runKind(kind), { kind });
          if (res.waitDone) await sleep(Math.min(res.waitDone, 4000));
          if (NO_RETRY_KINDS.has(kind)) Corrida.fallo(lugar0);
        }
        // NUEVO v21.13: tablero (paso sin tareas: "visto", u "ok" si el solver confirmó que ED lo marcó)
        Tablero.anotar(res.marcado ? 'ok' : 'visto', { kind });
      }
      await NavigationManager.goNext();
      return res;
    }
    if (t.done) { Tablero.anotar('ok', { tarea: t.n }); await NavigationManager.goNext(); return { did: 'task_already_done_next' }; }

    // ENRUTAMIENTO DE EJERCICIOS (tarea pendiente)
    let kind = MainEngine.detectKind();
    // NUEVO v21.0: si no se reconoce nada, puede que la pantalla aún esté cargando (reporte: Writing de
    // "Wrong Color" se tomó como 'mcq_default' y en la radiografía de 1 s después ya era 'writing').
    // AJUSTADA v21.12 (Hugo: "dales más tiempo para que carguen"): si hay un video, tarjetas o imágenes cargando, hasta 25 s
    if (kind === 'mcq_default') {
      const cargando = !!q('.learning__RAMediaResourceW, .learning__resourcesArea video, .learning__vocabularyCards, .prMCQ__answerImage, .memoG__card, .speakingInteract');
      const k2 = await waitFor(() => { const k = MainEngine.detectKind(); return k !== 'mcq_default' ? k : null; }, cargando ? 25000 : 4000, 300); if (k2) kind = k2;
    }
    // NUEVO v21.11 — REGLA 4 de Hugo: si esta tarea ya falló 2 veces en esta corrida (1 si es de las caras/imposibles:
    // speaking, memoria, Explore...), no se vuelve a intentar: ya está en el reporte.
    const lugar = Corrida.lugar(t), previos = Corrida.fallos(lugar);
    if (previos >= (NO_RETRY_KINDS.has(kind) ? 1 : 2)) {
      log('⏭️ Ya falló ' + previos + ' vez/veces en esta corrida → no lo repito:', lugar);
      Tablero.anotar('saltado', { tarea: t.n, kind });
      await NavigationManager.goNext();
      return { did: 'saltado_ya_fallo', kind, veces: previos };
    }
    Reporter.marcarAntes();   // NUEVO v21.11: estado ANTES de actuar (sale en el reporte si falla)
    const res = Object.assign({}, await MainEngine.runKind(kind), { kind });

    // NUEVO: los ejercicios de habla/audio necesitan tiempo hasta que ED los marque como hechos
    if (res.waitDone) await waitFor(() => NavigationManager.taskDone(t.n), res.waitDone, 300);

    // NUEVO v20.8 — VERIFICAR que ED marcó la tarea. Si no: 1 reintento COMPLETO (sin "una acción");
    // si sigue sin marcar → al reporte automático y se sigue. (Los de audio/speaking no se repiten.)
    if (CFG.verifyTasks && !TestManager.inTest()) {
      let done = await waitFor(() => NavigationManager.taskDone(t.n), 1500, 200);
      if (!done && !NO_RETRY_KINDS.has(kind)) {
        log('🔁 La tarea', t.n, 'no quedó marcada → reintento completo');
        const prev = CFG.practiceOneAction; CFG.practiceOneAction = false;
        try { res.retry = await MainEngine.runKind(kind); } catch (e) { res.retryError = e.message; } finally { CFG.practiceOneAction = prev; }
        done = await waitFor(() => NavigationManager.taskDone(t.n), 2500, 250);
      }
      res.taskMarked = !!done;
      if (!done && kind !== 'media') Reporter.capture(kind === 'mcq_default' ? 'tipo_desconocido' : 'tarea_no_marcada', res);
      if (!done) Corrida.fallo(lugar);   // NUEVO v21.11 (regla 4)
      Tablero.anotar(done ? 'ok' : 'falla', { tarea: t.n, kind });   // NUEVO v21.13
    }

    await sleep(400);   // AJUSTADA v20.7: era 800
    await NavigationManager.goNext();
    return res;
  }
}
