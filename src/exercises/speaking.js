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
  // AJUSTADA v20.8 (dumps de Lesson 2 · Step 5: Personalized speaking, estados intro → prepare → record):
  //   botones son <div class="openSpeech__btn openSpeech__btnStart|btnSkip|btnStop|SentTTBtn">.
  //   Cada clic ahora se VERIFICA (el estado tiene que cambiar) con press(); si la preparación
  //   no se puede saltar, espera hasta 75 s; graba mínimo 2,5 s. Si algo falla → al reporte.
  //   Tip: deja el micrófono PERMITIDO para ed.engdis.com o no empieza a grabar.
  static async solveOpenSpeech() {
    log('🎙️ [Integrated Speaking] Start → Skip → grabar → Stop → Send...');
    const tn = NavigationManager.curTask()?.n;
    const state = () => (qv('.openSpeech__AnsW')?.className || '').match(/AnsW--(\w+)/)?.[1] || '';

    if (state() === 'intro' || qv('.openSpeech__btnStart')) {
      const st = await waitFor(() => qv('.openSpeech__btnStart'), 4000, 200);
      if (!(await press(st, () => state() !== 'intro', 2500))) { Reporter.capture('speaking_start_no_responde', { state: state() }); return { did: 'open_speech', ok: false, state: state() }; }
    }
    if (state() === 'prepare') {
      const sk = await waitFor(() => qv('.openSpeech__btnSkip'), 3000, 200);
      if (sk) await press(sk, () => state() !== 'prepare', 2500);
    }
    if (state() !== 'send' && state() !== 'sent') {
      const rec = await waitFor(() => state() === 'record', 75000, 300);
      if (!rec) { Reporter.capture('speaking_no_graba', { state: state() }); return { did: 'open_speech', ok: false, state: state() }; }
      await sleep(Math.max(2500, CFG.recordSeconds * 1000));
      const stop = qv('.openSpeech__btnStop');
      if (stop) await press(stop, () => state() !== 'record', 2500);
      await waitFor(() => state() !== 'record', 6000, 300);
    }

    if (CFG.sendToTeacher) {
      const send = await waitFor(() => qv('.openSpeech__SentTTBtn:not(.disabled), .sendRecordingBtn') || qav('[class*="openSpeech__btn"], a, button').find(b => !/disabled/.test(b.className) && /^(send to teacher|send recording|enviar al profesor|enviar a(l)? (la )?profesor(a)?)$/i.test(txt(b))), 8000, 300);
      if (send) {
        await press(send, () => /disabled/.test(send.className) || !send.isConnected || NavigationManager.modalOpen() || state() === 'sent', 2500);
        await waitFor(() => NavigationManager.handleModals(), 5000, 300);
      }
    }

    const done = tn ? await waitFor(() => NavigationManager.taskDone(tn), 8000, 300) : true;
    return { did: 'open_speech_solved', ok: !!done };
  }

  // ---------------------------------------------------------------
  // SPEAKING DE ELEGIR RESPUESTA (SR)                        [NUEVA — de v17]
  // PARA QUÉ: pulsa Start/Continue y deja que ED avance solo (waitDone lo espera).
  // ---------------------------------------------------------------
  // AJUSTADA v20.8: el Start se verifica y se da MÁS tiempo (ED reproduce y escucha; no deja hacer nada mientras)
  static async solveSRChoice() {
    log('🗣️ [SR Choice] Pulsando Start y esperando a que ED termine...');
    const st = qv('.statusWrapper a.button.continue') || qv('a.button.continue');
    const antes = st ? txt(st) + '|' + (q('.status', st.closest('.statusWrapper') || document)?.className || '') : '';
    if (st) await press(st, () => { const b = qv('.statusWrapper a.button.continue') || qv('a.button.continue'); return !b || txt(b) + '|' + (q('.status', b.closest('.statusWrapper') || document)?.className || '') !== antes; }, 2500);
    return { did: 'sr_choice', started: !!st, waitDone: 25000 };
  }

  // ---------------------------------------------------------------
  // INTERACTIVE SPEAKING (personajes)                        [NUEVA — de v17]
  // PARA QUÉ: elige el personaje (flecha) y pulsa Start.
  // ---------------------------------------------------------------
  // AJUSTADA v20.8 (dump Lesson 3 · Step 3: Interact 1): elige personaje con la flecha ">" que NO está
  // deshabilitada, pulsa Start (verificado); si no hay Start, pulsa la 1.ª frase. Luego espera mucho más
  // (ED reproduce el diálogo y no deja hacer nada hasta terminar).
  static async solveInteractive() {
    log('🎭 [Interactive Speaking] Personaje → Start → esperar el diálogo...');
    const flecha = qav('a.chooseCaracterArrow').find(a => !/disable/.test(a.parentElement?.className || '')) || qav('a.chooseCaracterArrow')[0];
    if (flecha) { click(flecha); await sleep(1300); }
    const st = await waitFor(() => { const b = qv('a.button.continue'); return b && !/disable/.test(b.parentElement?.className || '') ? b : null; }, 6000);
    let started = false;
    if (st) {
      const antes = txt(st);
      started = await press(st, () => { const b = qv('a.button.continue'); return !b || txt(b) !== antes || !!qv('.recordingPanelSentence .statusIcon[class*="--"], .recIndicator, [class*="recording"]'); }, 2500);
    } else {
      const frase = qv('.recordingPanelSentence');
      if (frase) { click(frase); started = true; }
    }
    return { did: 'interactive_speaking', started, waitDone: 40000 };
  }
}
