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
    // NUEVO v21.0: ED espera que DIGAS la respuesta; con silencio no marca la tarea (reporte: Dress from
    // Paris · 5/6). Las opciones registran el clic como respuesta (at:User_Answer) y la correcta tiene la
    // clase "c": primero se prueba un clic en ella; si ED marca la tarea, no hace falta grabar.
    const tn = NavigationManager.curTask()?.n;
    const correcta = qv('.lessonMultipleAnswer.c') || null;
    if (correcta && tn) {
      click(q('.multiText', correcta) || correcta);
      if (await waitFor(() => NavigationManager.taskDone(tn), 2000, 200)) return { did: 'sr_choice_click', clicked: true };
    }
    // NUEVO v21.2 — ECO (experimento, solo con micrófono simulado): Start → reproducir el audio de la opción
    // correcta → ese audio entra al micrófono → ED "oye" la respuesta dicha por un nativo.
    if (window.__edFakeActive || !navigator.mediaDevices) {
      const st0 = qv('.statusWrapper a.button.continue') || qv('a.button.continue');
      const aud = correcta && q('.headphonesBt, .clickMedia', correcta);
      if (st0 && aud) {
        log('🗣️ [SR Choice] Eco: Start + audio de la respuesta correcta al micrófono simulado');
        window.__edMicEcho = true;
        try { click(st0); await sleep(900); click(aud); if (tn && await waitFor(() => NavigationManager.taskDone(tn), 15000, 300)) return { did: 'sr_choice_eco' }; }
        finally { window.__edMicEcho = false; }
      }
    }
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
    const tn = NavigationManager.curTask()?.n;
    const hecho = () => !!(tn && NavigationManager.taskDone(tn));
    const startHabil = () => { const b = qv('a.button.continue'); return b && !/disable/.test((b.parentElement?.className || '') + ' ' + b.className) ? b : null; };
    // NUEVO v21.12 — BRANCHING (dump de Hugo, U9 L4 · Step 6: .answersWrapper.interact2.webRtc con .RecordButtonWrapper).
    // Hugo: "solo tocas Start y esperas a que salga el botón y grabe; cuando graba sale marcada".
    if (!qav('a.chooseCaracterArrow').length && qv('.answersWrapper.interact2, .RecordButtonWrapper')) return await this.solveBranching(hecho, startHabil);
    log('🎭 [Interactive Speaking] Personaje → Start → esperar el diálogo...');
    const flecha = qav('a.chooseCaracterArrow').find(a => !/disable/.test(a.parentElement?.className || '')) || qav('a.chooseCaracterArrow')[0];
    if (flecha) { click(flecha); await sleep(1300); }
    // AJUSTADA v21.2 (reporte Piece of Cake · Interact 2): el panel viene con clase "disable" mientras ED
    // reproduce la frase del otro personaje → esperar a que se habilite antes de pulsar Start.
    // AJUSTADA v21.12 (Hugo: "dales más tiempo para que carguen"): esperas de 10/6 s → 20/10 s
    await waitFor(() => !qv('.speakingInteractPanelsWrapper.disable'), 20000, 300);
    const pulsarStart = async b => { const antes = txt(b); return await press(b, () => { const x = qv('a.button.continue'); return !x || txt(x) !== antes || hecho() || !!qv('.recordingPanelSentence .statusIcon[class*="--"], .recIndicator, [class*="recording"]'); }, 3000); };
    const st = await waitFor(startHabil, 10000, 300);
    let started = false, metodo = '';
    if (st) { started = await pulsarStart(st); metodo = 'start'; }
    else {
      // AJUSTADA v21.12 (Hugo, U9 L4 · Step 4 "Interactive speaking practice": "tocas en el primer texto y luego Start
      // cuando se habilita"). Antes pulsaba la frase y ahí terminaba: el Start nunca se pulsaba → tarea sin marcar.
      const frase = qv('.recordingPanelSentence .recordingPanelSentenceText') || qv('.recordingPanelSentence');
      if (frase) {
        await press(frase, () => !!startHabil(), 3000);
        const st2 = await waitFor(startHabil, 20000, 400);
        if (st2) { started = await pulsarStart(st2); metodo = 'frase+start'; } else { started = true; metodo = 'frase✗start'; }
      }
    }
    return { did: 'interactive_speaking', started, metodo, waitDone: 60000 };
  }

  // NUEVO v21.12 — BRANCHING SPEAKING: Start → ED reproduce al personaje → turno del alumno: aparece el botón de grabar
  // (o vuelve el Start) → se pulsa lo que aparezca, verificando, hasta que ED marque la tarea (tope 100 s).
  static async solveBranching(hecho, startHabil) {
    log('🎭 [Branching speaking] Start → espero mi turno → grabar...');
    const grabar = () => qav('.RecordButtonWrapper a, .RecordButtonWrapper .panelButton, a.panelButton.speakIcon').find(b => !/disable/.test(b.className + ' ' + (b.parentElement?.className || ''))) || null;
    const pasos = [];
    const t0 = Date.now();
    let nStart = 0, nGrabar = 0, ultimo = 0;
    const st = await waitFor(startHabil, 20000, 400);
    if (st) { await press(st, () => !startHabil() || hecho(), 3000); nStart++; ultimo = Date.now(); pasos.push('start'); }
    while (Date.now() - t0 < 150000 && !hecho()) {   // AJUSTADA v21.14: 150 s (antes 100) para que ED procese la grabación
      const r = grabar();
      if (r && nGrabar < 4 && Date.now() - ultimo > 6000) {
        await press(r, () => hecho() || /record|activ|pressed/i.test(r.className + ' ' + (r.parentElement?.className || '')), 3000);
        nGrabar++; ultimo = Date.now(); pasos.push('grabar');
        await sleep(Math.max(3500, CFG.recordSeconds * 1000));
        continue;
      }
      const s2 = startHabil();
      if (s2 && nStart < 3 && Date.now() - ultimo > 8000) { await press(s2, () => !startHabil() || hecho(), 3000); nStart++; ultimo = Date.now(); pasos.push('start'); continue; }
      await sleep(800);
    }
    return { did: 'branching_speaking', pasos, marcado: hecho(), waitDone: 5000 };
  }
}
