// =====================================================================
//  SPEAKING — integrated (openSpeech), elegir respuesta (SR) e interactive
// ---------------------------------------------------------------------
//  Tipo(s) en detectKind(): open_speech, sr_choice, interactive_speaking
//  Se detecta por: .openSpeech__AnsW / .questionInstructionsSR / a.chooseCaracterArrow
//  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
//  EXPONE:     SpeakingSolver (se une a PracticeSolver en exercises/index.js)
// =====================================================================

class SpeakingSolver {
  // ---------------------------------------------------------------
  // INTEGRATED SPEAKING ("Click Start when you are ready")   [AJUSTADA]
  // PARA QUÉ: Start → (Skip) → graba unos segundos → Stop → Send to teacher → OK.
  // CAMBIO: v19.6 hacía clic en cualquier "a.button" visible si el estado no era 'intro'
  //         (podía pulsar "grabar de nuevo"). Ahora solo pulsa el Start real (como v17).
  // ---------------------------------------------------------------
  static async solveOpenSpeech() {
    log('🎙️ [Integrated Speaking] Iniciando grabación y envío al profesor...');
    const tn = NavigationManager.curTask()?.n;
    const state = () => (qv('.openSpeech__AnsW')?.className || '').match(/AnsW--(\w+)/)?.[1] || '';

    const startBtn = qv('.openSpeech__btnStart') || (state() === 'intro' ? qv('a.button.start, button.start, a.button') : null);
    if (startBtn) {
      click(startBtn);
      await waitFor(() => state() !== 'intro', 6000);
    }

    const skipBtn = qv('.openSpeech__btnSkip');
    if (state() === 'prepare' || skipBtn) {
      click(skipBtn);
    }

    if (state() !== 'send' && state() !== 'sent') {
      const rec = await waitFor(() => state() === 'record', 30000, 300);
      if (!rec) return { did: 'open_speech', ok: false, state: state() };

      await sleep(CFG.recordSeconds * 1000);

      const stop = qv('.openSpeech__btnStop');
      if (stop) click(stop);

      await waitFor(() => state() !== 'record', 6000, 300);
    }

    if (CFG.sendToTeacher) {
      const send = await waitFor(() => qv('.openSpeech__SentTTBtn, .sendRecordingBtn') || qav('[class*="openSpeech__btn"], a, button').find(b => /^(send to teacher|send recording|enviar al profesor|enviar a(l)? (la )?profesor(a)?)$/i.test(txt(b))), 6000, 300);
      if (send) {
        click(send);
        await waitFor(() => NavigationManager.handleModals(), 5000, 300);
      }
    }

    const done = tn ? await waitFor(() => NavigationManager.taskDone(tn), 6000) : true;
    return { did: 'open_speech_solved', ok: !!done };
  }

  // ---------------------------------------------------------------
  // SPEAKING DE ELEGIR RESPUESTA (SR)                        [NUEVA — de v17]
  // PARA QUÉ: pulsa Start/Continue y deja que ED avance solo (waitDone lo espera).
  // ---------------------------------------------------------------
  static async solveSRChoice() {
    log('🗣️ [SR Choice] Pulsando Start...');
    const st = qv('.statusWrapper a.button.continue') || qv('a.button.continue');
    if (st) click(st);
    return { did: 'sr_choice', waitDone: 15000 };
  }

  // ---------------------------------------------------------------
  // INTERACTIVE SPEAKING (personajes)                        [NUEVA — de v17]
  // PARA QUÉ: elige el personaje (flecha) y pulsa Start.
  // ---------------------------------------------------------------
  static async solveInteractive() {
    log('🎭 [Interactive Speaking] Eligiendo personaje y pulsando Start...');
    const arrows = qav('a.chooseCaracterArrow');
    if (arrows[0]) { click(arrows[0]); await sleep(1300); }
    const st = await waitFor(() => { const b = qv('a.button.continue'); return b && !/disable/.test(b.parentElement?.className || '') ? b : null; }, 5000);
    if (st) click(st);
    return { did: 'interactive_speaking', started: !!st, waitDone: 20000 };
  }
}
