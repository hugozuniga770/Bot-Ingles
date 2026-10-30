// =====================================================================
//  CONSOLA — window.__ed (comandos que escribes en F12)
// ---------------------------------------------------------------------
//  __ed.auto() / stop() / step() / inspect() / cfg({...}) / answers() / help()
//  DEPENDE DE: MainEngine, TestManager, StorageManager
//  EXPONE:     window.__ed, hud
// =====================================================================

let hud = null;
window.__ed = {
  _v: V, _running: false, _hudTimer: null, _lastMsg: '',
  async auto() {
    if (this._running) return log('ya está corriendo');
    this._running = true; this._lastMsg = '';
    log('🚀 ED-Autopilot v' + V + ' iniciado.');
    let n = 0;
    while (this._running) {
      if (++n > CFG.maxIterations && !TestSweep.active()) { this._running = false; break; }   // AJUSTADA v20.8: sin tope en el barrido
      try { const r = await MainEngine.step(); log('#' + n, r); } catch (e) { errLog('🛑 BOT DETENIDO:', e.message); this._lastMsg = e.message; Reporter.capture('error', e.message); this._running = false; break; }
      await sleep(CFG.tickMs);
    }
    log('⏸ Bot detenido.');
    if (Reporter.count()) { log('📝 Hay ' + Reporter.count() + ' fallos anotados. Botón 📋 de la cajita o __ed.report()'); Reporter.copy(); }   // NUEVO v20.8
    hud && hud.render();
  },
  // ---- NUEVO v20.8: reporte automático de fallos ----
  report: () => { Reporter.copy(); return Reporter.text(); },
  reportFile: () => Reporter.file(),
  reportClear: () => { Reporter.clear(); log('🧹 Reporte borrado.'); },
  // ---- NUEVO v20.8: barrido de tests < 100 ----
  barrer() { TestSweep.start(); return this.auto(); },
  barrerStop: () => TestSweep.stop(),
  barrerEstado: () => { const s = TestSweep.get(); console.table((s && s.resultados) || []); return s; },
  stop() { this._running = false; hud && hud.render(); },

  // Un solo paso (para depurar)
  async step() { const r = await MainEngine.step(); log(r); return r; },

  // NUEVO v20.0 — PRUEBA DE UN SOLO TIPO: resuelve el ejercicio de esta pantalla SIN pulsar Next.
  // Sirve para validar cada tipo por separado (ver docs/ejercicios.md). No lo usa auto().
  //   __ed.solve()        → detecta el tipo y lo resuelve
  //   __ed.solve('dnd')   → fuerza un tipo concreto
  async solve(kind) {
    const k = kind || MainEngine.detectKind();
    log('🧪 solve →', k);
    const r = Object.assign({ kind: k }, await MainEngine.runKind(k));
    log(r); return r;
  },

  // Qué pantalla ve el bot
  kind() {
    if (TestManager.isTestStart()) return 'test_start';
    if (TestManager.isScore()) return 'test_score';
    if (TestManager.isReview()) return 'test_review';
    if (TestManager.inTest()) return 'test_question';
    return MainEngine.detectKind();
  },

  // DIAGNÓSTICO: ejecútalo en la pantalla que falla y pásame la salida
  inspect() {
    const sels = ['.openSpeech__AnsW', 'a.chooseCaracterArrow', '.questionInstructionsSR', '.questionAnswersSet.speaker', 'a.button.continue',
      'iframe[id^="mce_"]', 'span.st.learning__selectTxt_st', '.prSeq__container', '.dndZone', '.dndBank', '.dnditem', '.DDLOptions__selected',
      'label.prMCQ__answerLabel', '.prMCQ__qaInnerSet', 'textarea', 'input[type="text"]', '.layout__mediaPlayPause', '.btnStartTest',
      'a.tasksBtnext.learning__nextItemLink', 'a.tasksBtnext.learning__submitTestLink', '.droptarget', '.draggable', '.sequenceZone'];
    const found = {}; sels.forEach(s => { const c = qav(s).length; if (c) found[s] = c; });
    const info = {
      kind: this.kind(), lesson: NavigationManager.lessonLabel(), step: NavigationManager.stepLabel(),
      tasks: NavigationManager.tasks().map(t => t.n + (t.done ? '✓' : '·') + (t.cur ? '*' : '')).join(' '),
      counter: NavigationManager.counter()?.s, found, run: StorageManager.getRun(),
      answers: Object.keys(StorageManager.getAns()).length, knownTests: StorageManager.getKnown().length,
      hasAnswersHere: TestManager.hasAnswers(NavigationManager.testKey())
    };
    console.log('%c[ED inspect]', 'color:#3498db;font-weight:bold', info);
    return info;
  },
  status() { return this.inspect(); },

  // Config persistente: __ed.cfg({ retakeAfterReview:false })
  // NUEVO v20.3 — PRUEBA DEL ARRASTRE: mueve UNA ficha del banco al primer hueco y dice si funcionó
  // y qué elemento hay justo donde suelta (si no es el hueco, algo lo tapa, p. ej. el "Drag Here").
  // Úsalo en una pregunta DnD que puedas ensuciar (práctica, o test antes de enviarlo).
  async dragTest(hueco = 0) {
    // NUEVO v20.5: DnD viejo (span.droptarget): mueve la 1.ª ficha al hueco y dice si quedó
    if (PracticeSolver.isDropTargetScreen()) {
      const t = PracticeSolver.dropTargets()[hueco], tile = PracticeSolver.bankTiles()[0];
      if (!t || !tile) { warn('dragTest: no hay hueco o ficha libre'); return null; }
      const ficha = txt(tile), p = dropPoint(t), debajo = document.elementFromPoint(p.x, p.y);
      await drag(tile, t); await sleep(500);
      const r = { tipo: 'droptarget', movido: norm(PracticeSolver.dropValue(PracticeSolver.dropTargets()[hueco])) === norm(ficha), ficha,
        quedóEnElHueco: PracticeSolver.dropValue(PracticeSolver.dropTargets()[hueco]),
        debajoDelPunto: debajo ? (debajo.tagName.toLowerCase() + '.' + String(debajo.className || '').split(/\s+/).join('.')).slice(0, 90) : null };
      log('🧪 dragTest', r); return r;
    }
    const m = testDndModel();
    if (!m || !m.dests.length) { warn('dragTest: no veo DnD (.dndZone) en esta pantalla'); return null; }
    const it = bankItems(m.bank)[0], dst = m.dests[hueco];
    if (!it || !dst) { warn('dragTest: no hay ficha en el banco o no existe ese hueco'); return null; }
    const antes = qa('.dnditem', dst).length;
    await revealInBox(dst); await revealInBox(it);
    const p = dropPoint(dst), debajo = document.elementFromPoint(p.x, p.y);
    const ficha = txt(it).slice(0, 40);
    await drag(it, dst);
    await sleep(500);
    const m2 = testDndModel(); const dst2 = (m2 && m2.dests[hueco]) || dst;
    const r = {
      movido: qa('.dnditem', dst2).length > antes, ficha, huecos: m.dests.length, bancoPorEncabezado: !!m.byHeader,
      puntoDeSoltado: { x: Math.round(p.x), y: Math.round(p.y) },
      debajoDelPunto: debajo ? (debajo.tagName.toLowerCase() + '.' + String(debajo.className || '').split(/\s+/).join('.')).slice(0, 90) : null,
      puntoDentroDelHueco: !!(debajo && dst.contains(debajo))
    };
    log('🧪 dragTest', r); return r;
  },

  // ---- RECUPERADOS de v17 (v20.1) ----
  // Navegación por desplegables
  async sweep() { const r = await DropdownNav.gotoNextIncomplete(); log('➡ sweep:', r || 'nada pendiente'); if (r) this.auto(); return r; },
  gotoNextIncomplete: () => DropdownNav.gotoNextIncomplete(),
  gotoLesson: n => DropdownNav.gotoLesson(n),
  gotoStep: m => DropdownNav.gotoStep(m),
  gotoTask: n => DropdownNav.gotoTask(n),
  dropdowns: () => DropdownNav.dump(),            // NUEVO: diagnóstico de los desplegables
  reopenTest() { const r = StorageManager.getRun(); return TestManager.reopenAfterReview((r && r.key) || NavigationManager.testKey()); },
  setSpeed(ms) { return this.cfg({ tickMs: Math.max(300, +ms || 1200) }); },
  // Respaldo de respuestas (pasar a otra PC / navegador)
  async copyAnswers() {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify({ v: V, mcq: StorageManager.getAns(), v2: StorageManager.getAns2(), known: StorageManager.getKnown(), scores: StorageManager.getScores() }))));
    try { await navigator.clipboard.writeText(b64); log('📋 copiado al portapapeles'); } catch (e) { log('📋 copia esto:', b64); }
    return b64;
  },
  async pasteAnswers(b64) {
    const raw = b64 || await navigator.clipboard.readText();
    this.import(JSON.parse(decodeURIComponent(escape(atob(raw.trim())))));
  },
  export() {
    const data = { version: V, exportedAt: new Date().toISOString(), answers: StorageManager.getAns(), testAnswers: StorageManager.getAns2(), knownTests: StorageManager.getKnown(), scores: StorageManager.getScores() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'ed-answers-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
  },
  import(d) {
    if (typeof d === 'string') d = JSON.parse(d);
    const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    set(K_ANS, Object.assign(StorageManager.getAns(), d.answers || d.mcq || {}));
    set(K_ANS2, Object.assign(StorageManager.getAns2(), d.testAnswers || d.v2 || {}));
    set(K_KNOWN, [...new Set([...StorageManager.getKnown(), ...(d.knownTests || d.known || [])])]);
    set(K_SCORES, Object.assign(StorageManager.getScores(), d.scores || {}));
    log('📥 importado');
  },

  cfg(o) { if (o) { Object.assign(CFG, o); try { localStorage.setItem(K_CFG, JSON.stringify(CFG)); } catch (e) {} } return CFG; },
  answers: () => StorageManager.getAns(),
  testAnswers: () => StorageManager.getAns2(),
  scores: () => StorageManager.getScores(),
  help() {
    console.table({
      '__ed.auto()': 'Arranca', '__ed.stop()': 'Pausa', '__ed.step()': 'Un solo paso', '__ed.solve()': 'Resuelve SOLO esta pantalla, sin Next (para probar)',
      '__ed.inspect()': 'Qué ve el bot en esta pantalla (pásame esto si algo falla)',
      '__ed.cfg({...})': 'Cambiar config (retakeAfterReview, solveWithoutTaskNav, recordSeconds, ...)',
      '__ed.answers()': 'Respuestas cosechadas', '__ed.scores()': 'Puntajes vistos',
      '__ed.sweep()': 'Ir a lo primero pendiente de la unidad y arrancar', '__ed.reopenTest()': 'Volver al test (tras el review)',
      '__ed.gotoLesson(n) / gotoStep(n) / gotoTask(n)': 'Saltar por los desplegables', '__ed.dropdowns()': 'Ver los desplegables (diagnóstico)',
      '__ed.copyAnswers() / pasteAnswers()': 'Pasar respuestas a otra PC', '__ed.export() / import(json)': 'Respaldo en archivo',
      'Alt+E': 'Iniciar / parar', '__ed.dragTest()': 'Prueba UN arrastre y dice si funcionó',
      '__ed.report() / reportFile() / reportClear()': 'Reporte de fallos: copiar / descargar / borrar',
      '__ed.barrer() / barrerStop() / barrerEstado()': 'Barrido de tests < 100 por lecciones y unidades'
    });
  }
};
