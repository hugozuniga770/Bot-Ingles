/* =====================================================================
   ED-Autopilot v19.7  (base v19.6 intacta + funciones nuevas por tipo de ejercicio)
   ---------------------------------------------------------------------
   MAPA RÁPIDO — cada función = un tipo de ejercicio (marcadas NUEVA / AJUSTADA / IGUAL a v19.6)

   PracticeSolver (ejercicios de práctica)
     solveWriting()        IGUAL   Writing con TinyMCE + AI Feedback (congelada)
     solveSelectText()     IGUAL   "Select Text" (subrayar texto)
     solveSequence()       AJUSTADA Ordenar (prSeq). Los 2 primeros intentos son los de v19.5;
                                   se añaden 2 más y verificación con el navegador de tareas
     solveOpenSpeech()     AJUSTADA Integrated Speaking. Ya no hace clic en "a.button" genérico
     solveDragAndDrop()    AJUSTADA "Drag here": ahora coloca TODOS los elementos y acepta un mapa
                                   de respuestas (para el replay de tests)
     placeDndMapping()     NUEVA   Coloca elementos en las zonas según lo cosechado (1 por zona o varios)
     solveMCQ()            AJUSTADA Opción múltiple / checkbox; añade respaldo por posición y por prefijo
     solveFITB()           NUEVA   Rellenar con desplegables (.DDLOptions__selected)
     solveText()           NUEVA   Inputs de texto / textarea cortos
     solveMedia()          NUEVA   Audio/video "solo escuchar" (play unos segundos)
     solveSRChoice()       NUEVA   Speaking de elegir respuesta (botón Start)
     solveInteractive()    NUEVA   Interactive speaking (personajes + flecha + Start)

   TestManager (tests — tocado con pinzas)
     ensureCorrectAnswerTab()  AJUSTADA 3 estrategias de clic + verificación (antes: 1 clic sin verificar)
     harvestReview()           AJUSTADA además de MCQ cosecha FITB y DnD; al terminar vuelve al test
     readFitb()/readDnd()      NUEVAS  leen la pantalla de review (respuestas correctas)
     replayQuestion()          NUEVA   en el reintento aplica lo cosechado pregunta por pregunta
     backToTest()              NUEVA   flechita "atrás" tras la revisión para reabrir el test
     tooManyRetries()          NUEVA   tope de reintentos (evita bucle infinito si nunca llega a 100%)
     isScore / isReview / entrada a Review / score 100%  → IGUAL (congelados)

   MainEngine
     detectKind()   NUEVA   clasifica la pantalla (la usan step() y __ed.inspect())
     runKind()      NUEVA   despacha al solver correcto
     step()         AJUSTADA guardia anti-salto de review + replay de test + enrutado por detectKind()

   Consola:  __ed.auto()  __ed.stop()  __ed.step()  __ed.inspect()  __ed.status()  __ed.cfg({...})
   ===================================================================== */
(() => {
  'use strict';
  const V = 19.7;
  if (window.__ed && window.__ed._v === V) { console.log('%c[ED]', 'color:#27ae61', 'v19.7 ya instalado → __ed.help()'); return; }
  try { window.__ed && window.__ed.stop && window.__ed.stop(); } catch (e) {}
  try { clearInterval(window.__ed && window.__ed._hudTimer); } catch (e) {}
  try { document.getElementById('ed-autopilot-hud')?.remove(); } catch (e) {}
  try {
    document.querySelectorAll('body > div').forEach(d => {
      if (d.style && d.style.position === 'fixed' && /^ED v\d+\.\d+ OOP/.test(d.textContent || '')) d.remove();
    });
  } catch (e) {}

  // Misma clave de config que v18.11/19.x para conservar lo que ya tengas guardado
  const K_CFG = 'ed:cfg:v18.11';
  const CFG = Object.assign({
    writingText: 'I think this is a very interesting topic and I really enjoyed learning about it because it helps us understand new perspectives.',
    shortText: 'yes',
    recordSeconds: 3.5,
    sendToTeacher: true,
    useAIFeedback: true,
    maxTaskAttempts: 4,
    maxTestAttempts: 3,        // ahora SÍ se usa: tope de reintentos de un test que no llega a 100 %
    tickMs: 1200,
    maxIterations: 1500,
    correctTabSelector: '',
    retakeAfterReview: true,   // NUEVO: tras cosechar el review, usar la flechita atrás para reabrir el test
    solveWithoutTaskNav: true  // NUEVO: resolver ejercicios aunque no haya navegador de tareas (como v17)
  }, (() => { try { return JSON.parse(localStorage.getItem(K_CFG) || '{}'); } catch (e) { return {}; } })());

  const K_ANS = 'ed:answers:v1';
  const K_ANS2 = 'ed:testAns:v2';
  const K_KNOWN = 'ed:testKnown:v1';
  const K_SCORES = 'ed:testScores:v1';
  const K_RUN = 'ed:testRun:v1';

  const RE_SCORE = /(Your test score|Your score|test score is|calificaci[oó]n|puntaje)/i;
  const RE_SUBMIT_POPUP = /(haven'?t answered|submit the test|no ha responder|no respondiste|enviar la prueba)/i;
  const RE_DONE = /(Completed|Completad[oa]|Terminad[oa]|Finalizad[oa])/i;
  // NUEVO (de v17): etiqueta de step que corresponde a un test
  const RE_TEST_STEP = /^(?:Step|Paso)\s*\d+\s*:\s*(Test|Prueba|Examen|Let'?s review|Review|Repasemos|Repaso|Repase)\s*$/i;

  const RE_TAB_CORRECT = /^\W*(correct\s*answers?|respuestas?\s*correctas?)(\s*\(?\d+\)?)?\W*$/i;
  const RE_TAB_YOURS = /^\W*(your\s*answers?|(tus?|su|mis)\s*respuestas?)(\s*\(?\d+\)?)?\W*$/i;
  const RE_ACTIVE = /(?<!(?:in|un|non|not)[-_]?)(active|current|selected|checked|chosen)/i;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const q = (s, r = document) => { try { return r.querySelector(s); } catch (e) { return null; } };
  const qa = (s, r = document) => { try { return Array.from(r.querySelectorAll(s)); } catch (e) { return []; } };
  const txt = e => (e ? (e.textContent || '') : '').replace(/\s+/g, ' ').trim();
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const vis = e => {
    if (!e || !e.getBoundingClientRect) return false;
    const r = e.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return false;
    if (e.offsetParent !== null) return true;
    try { const cs = getComputedStyle(e); return cs.position === 'fixed' && cs.visibility !== 'hidden' && cs.display !== 'none'; } catch (_) { return false; }
  };
  const qv = (s, r) => qa(s, r).find(vis) || null;
  const qav = (s, r) => qa(s, r).filter(vis);
  const wc = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
  const log = (...a) => console.log('%c[ED v19.7]', 'color:#27ae61;font-weight:bold', ...a);
  const warn = (...a) => console.warn('%c[ED v19.7]', 'color:#e67e22;font-weight:bold', ...a);
  const errLog = (...a) => { console.error('%c[ED ERROR]', 'color:#c0392b;font-weight:bold', ...a); };

  const mcqQuestionText = set => txt(q('.prMCQ__questionText, .prMCQ__questionW, .prMCQ__question', set));

  async function waitFor(fn, timeout = 6000, every = 250) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try { const v = fn(); if (v) return v; } catch (e) {}
      await sleep(every);
    }
    try { return fn() || null; } catch (e) { return null; }
  }
  function click(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) {}
    try { el.click(); return true; } catch (e) { return false; }
  }
  function clickInFrame(el) {
    try {
      const w = el.ownerDocument.defaultView; const r = el.getBoundingClientRect();
      el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w, clientX: r.left + 5, clientY: r.top + 5 }));
      return true;
    } catch (e) { try { el.click(); return true; } catch (_) { return false; } }
  }

  // NUEVO (de v17): escribe en un input/textarea de forma que la página detecte el cambio
  function setNative(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    el.focus(); setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // ===================================================================
  //  MOTOR DE ARRASTRE ORIGINAL (VERSIÓN 17) — IGUAL
  // ===================================================================
  function fire(el, type, x, y, buttons = 1) {
    for (const [T, C] of [[type, window.PointerEvent || MouseEvent], [type.replace('pointer', 'mouse'), MouseEvent]]) {
      try {
        el.dispatchEvent(new C(T, Object.assign({ bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, buttons, button: 0 },
          C !== MouseEvent ? { pointerType: 'mouse', pointerId: 1, isPrimary: true } : {})));
      } catch (e) {}
    }
  }

  function dropPoint(dst) {
    let r = dst.getBoundingClientRect();
    const top = Math.max(r.top, 0), bot = Math.min(r.bottom, innerHeight);
    const x = r.left + r.width / 2;
    if (r.height > 150) {
      const items = qa('.dnditem', dst).filter(vis);
      const last = items[items.length - 1];
      let y = last ? last.getBoundingClientRect().bottom + 22 : top + Math.min(60, (bot - top) / 2);
      y = Math.min(Math.max(y, top + 10), bot - 10);
      return { x, y };
    }
    return { x, y: top + (bot - top) / 2 };
  }

  async function drag(src, dst) {
    try { src.scrollIntoView({ block: 'center' }); } catch (e) {}
    await sleep(150);
    let dr = dst.getBoundingClientRect();
    if (Math.min(dr.bottom, innerHeight) - Math.max(dr.top, 0) < 25) { try { dst.scrollIntoView({ block: 'nearest' }); } catch (e) {} await sleep(150); }
    const sr = src.getBoundingClientRect();
    const sx = sr.left + sr.width / 2, sy = sr.top + sr.height / 2;
    const { x: dx, y: dy } = dropPoint(dst);
    fire(src, 'pointerdown', sx, sy);
    await sleep(70);
    for (let k = 1; k <= 12; k++) {
      const x = sx + (dx - sx) * k / 12, y = sy + (dy - sy) * k / 12;
      fire(document.elementFromPoint(x, y) || src, 'pointermove', x, y);
      await sleep(30);
    }
    fire(document.elementFromPoint(dx, dy) || dst, 'pointerup', dx, dy, 0);
    await sleep(650);
  }

  // Modelo del ejercicio DnD: "banco" (donde están los elementos) y "dests" (huecos / columnas)
  function dndModel() {
    const zones = qav('.dndZone');
    if (!zones.length) return null;
    let bank = qav('.dndBank')[0] || null;
    if (!bank) bank = zones.slice().sort((a, b) => qa('.dnditem', b).length - qa('.dnditem', a).length)[0];
    const dests = zones.filter(z => z !== bank && !bank.contains(z) && !z.contains(bank));
    return { bank, dests };
  }
  const bankItems = bank => qa('.dnditem', bank).filter(vis);

  // NUEVO (de v17): "etiqueta" de una zona = texto del padre sin los elementos arrastrables.
  // OJO: si varias zonas comparten padre (huecos de una misma oración) la etiqueta SALE IGUAL
  // para todas → por eso placeDndMapping() solo usa etiquetas cuando son únicas.
  const zoneLabel = z => { const p = z.parentElement; if (!p) return ''; const c = p.cloneNode(true); qa('.dnditem, .dndZone', c).forEach(e => e.remove()); return txt(c).slice(0, 80); };

  class StorageManager {
    static getAns() { try { return JSON.parse(localStorage.getItem(K_ANS) || '{}'); } catch (e) { return {}; } }
    static getAns2() { try { return JSON.parse(localStorage.getItem(K_ANS2) || '{}'); } catch (e) { return {}; } }
    static getKnown() { try { return JSON.parse(localStorage.getItem(K_KNOWN) || '[]'); } catch (e) { return []; } }
    static getScores() { try { return JSON.parse(localStorage.getItem(K_SCORES) || '{}'); } catch (e) { return {}; } }
    static getRun() { try { return JSON.parse(localStorage.getItem(K_RUN) || 'null'); } catch (e) { return null; } }
    static setRun(v) { if (v) localStorage.setItem(K_RUN, JSON.stringify(v)); else localStorage.removeItem(K_RUN); }
    static addKnown(k) { const s = new Set(this.getKnown()); s.add(k); localStorage.setItem(K_KNOWN, JSON.stringify([...s])); }
    static saveScore(k, p) { let o = {}; try { o = JSON.parse(localStorage.getItem(K_SCORES) || '{}'); } catch (e) {} o[k] = p; localStorage.setItem(K_SCORES, JSON.stringify(o)); }
  }

  class NavigationManager {
    static lessonLabel() { return txt(q('.learning__dropDownListTitleW--lessons')); }
    static stepLabel() { return txt(q('.learning__dropDownListTitleW--steps')); }
    static testKey() { return this.lessonLabel() + '||' + this.stepLabel(); }

    static counter() {
      const m = [...(document.body.innerText || '').matchAll(/(?<![:\d])(\d{1,2})\s*\/\s*(\d{1,2})(?![:\d])/g)];
      if (!m.length) return null;
      const x = m[m.length - 1];
      return { i: +x[1], n: +x[2], s: x[1] + '/' + x[2] };
    }

    static tasks() {
      const seen = new Set();
      return qa('.learning__tasksNav_task').map(e => {
        const n = parseInt(txt(e), 10);
        const tip = txt(q('.learning__tasksNav_taskTooltip', e));
        return { el: e, n, cur: /--current/.test(e.className), done: /--done/.test(e.className) || RE_DONE.test(tip), tip };
      }).filter(t => !isNaN(t.n) && !seen.has(t.n) && seen.add(t.n));
    }

    static curTask() { return this.tasks().find(t => t.cur) || null; }
    static taskDone(n) { const t = this.tasks().find(x => x.n === n); return !!(t && t.done); }

    static nextBtn() { return qv('a.tasksBtnext.learning__nextItemLink') || qv('a.tasksBtnext.learning__submitTestLink') || qv('.learning__submitTest a') || qv('.learning__submitTest') || qa('a, button').find(el => vis(el) && /submit|next|siguiente/i.test(txt(el))); }

    // PARA QUÉ: cierra los popups. Parte 1 (igual que v19.6): popups en iframe colorbox
    // ("haven't answered" → Submit). Parte 2 (NUEVA, de v17): popups Bootstrap
    // ("Are you sure…", "The recording has been sent to your teacher") → OK.
    static async handleModals() {
      let handled = false;
      for (let k = 0; k < 4; k++) {
        const f = qa('iframe#colorBoxIframe, iframe[id*="colorBox"]').find(x => x.getBoundingClientRect().height > 50);
        if (!f) break;
        let d; try { d = f.contentDocument; } catch (e) { break; }
        if (!d || !d.body) break;
        const body = d.body.innerText || '';
        let b = null;
        if (RE_SUBMIT_POPUP.test(body)) {
          b = d.querySelector('input.okButton, a.okButton, input[value*="Submit" i], a[class*="submit" i], button');
        }
        if (!b) b = d.querySelector('input.okButton, a.okButton');
        if (!b) break;
        clickInFrame(b); handled = true;
        await sleep(1500);
      }
      if (await this.handleBootstrapModals()) handled = true;
      return handled;
    }

    // NUEVA: popups Bootstrap (no iframe). Sin esto el aviso de "enviado al profesor" se quedaba abierto.
    static async handleBootstrapModals() {
      const cm = qa('.modalW_confirm, .modalW_alert, #alertModal, .confirmPopup__main').find(vis);
      if (!cm) return false;
      const ok = q('input.okButton.utils__BSOKBtn', cm) || q('input.okButton', cm) || qv('input.okButton.utils__BSOKBtn');
      let did = false;
      if (ok) { click(ok); did = true; await sleep(700); }
      qa('.modal-backdrop').forEach(e => { try { e.remove(); } catch (_) {} });
      try { document.body.classList.remove('modal-open'); document.body.style.overflow = ''; } catch (e) {}
      return did;
    }

    static async goNext() {
      await this.handleModals();
      const nx = this.nextBtn();
      if (!nx) return false;
      const isSubmit = /submitTest|submit/i.test(nx.className || '') || /submitTest|submit/i.test(nx.parentElement?.className || '') || /submit/i.test(txt(nx));
      click(nx);
      await sleep(isSubmit ? 2500 : 1800);
      await this.handleModals();
      return true;
    }
  }

  // ===================================================================
  //  PRACTICE SOLVERS — una función por tipo de ejercicio
  // ===================================================================
  class PracticeSolver {

    // ---------------------------------------------------------------
    // WRITING (TinyMCE + AI Feedback)                         [IGUAL — congelada]
    // PARA QUÉ: escribe el texto, guarda, pide AI Feedback y pulsa Done.
    // ---------------------------------------------------------------
    static async solveWriting() {
      log('✍️ [Writing] Escribiendo texto y solicitando AI feedback...');
      const edit = qv('.prWriting__editorEditBtn');
      if (edit && !qv('.prWriting__editorSaveBtn')) { click(edit); await sleep(900); }

      const ifr = qv('iframe[id^="mce_"][id$="_ifr"]');
      const text = CFG.writingText + ' This is a great experience for personal growth.';

      if (ifr) {
        const doc = ifr.contentDocument, win = ifr.contentWindow, body = doc && doc.body;
        if (body) {
          body.focus();
          body.innerHTML = `<p>${text}.</p>`;
          for (const evType of ['input', 'change', 'keyup']) {
            try { body.dispatchEvent(new win.Event(evType, { bubbles: true })); } catch (e) {}
          }
          await sleep(400);
        }
      }

      const save = qv('.prWriting__editorSaveBtn');
      if (save) {
        click(save);
        await waitFor(() => { const s = q('.prWriting__editorSaveBtn'); return !s || !vis(s) || /--saved/.test(s.className); }, 6000);
      }
      await sleep(800);

      if (CFG.useAIFeedback) {
        const btn = qv('.prWriting__action--AI, .prWriting__AIFeedbackBtn, .prWriting__btnAI');
        if (btn && !/disabled/i.test(btn.className)) {
          click(btn);
          await sleep(2500);
          const doneAI = await waitFor(() => qv('.prWriting__AIDoneBtn, .prWriting__action--submit, a.button.done, input.okButton'), 25000, 500);
          if (doneAI) { click(doneAI); await sleep(1500); }
        }
      }

      const doneBtn = await waitFor(() => qv('.prWriting__action--submit, .prWriting__doneBtn, a.button.done'), 8000, 400);
      if (doneBtn) { click(doneBtn); await sleep(1500); }
      return { did: 'writing_solved', words: wc(text) };
    }

    // ---------------------------------------------------------------
    // SELECT TEXT (subrayar texto)                             [IGUAL]
    // PARA QUÉ: hace clic en los fragmentos subrayables.
    // ---------------------------------------------------------------
    static async solveSelectText() {
      log('🔍 [Select Text] Subrayando oraciones clave...');
      const spans = qav('span.st.learning__selectTxt_st').filter(s => !/--selected/.test(s.className) && txt(s).length > 1);
      if (!spans.length) return { did: 'select_text_no_spans' };
      let selectedCount = 0;
      for (const s of spans) {
        click(s); await sleep(400);
        if (/--selected/.test(s.className)) selectedCount++;
      }
      return { did: 'select_text_solved', selectedCount };
    }

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
    // ORDENAR / SECUENCIA (.prSeq__container)                  [AJUSTADA]
    // PARA QUÉ: reordena arrastrando elementos.
    // Intentos 1 y 2 = EXACTAMENTE los de v19.5 (los que ya te funcionaban).
    // Intentos 3 y 4 = NUEVOS, solo se usan si el navegador de tareas sigue sin marcar la tarea.
    // Sin navegador de tareas (tn indefinido) hace UN arrastre, igual que antes.
    // ---------------------------------------------------------------
    static async solveSequence() {
      log('🔢 [Sequence / Ordering] Ordenando pasos secuenciales...');
      const box = qv('.prSeq__container');
      if (!box) return { did: 'seq_not_found' };
      const items0 = () => qa('.dnditem', box).filter(vis);
      const zones0 = () => qa('.dndZone', box).filter(vis);
      if (items0().length < 2) return { did: 'seq_no_items' };
      const tn = NavigationManager.curTask()?.n;

      const strategies = [
        // 1) v19.5: primer ítem → otra zona (o al 2.º ítem)
        () => { const it = items0(), zn = zones0(); const src = it[0]; const dst = zn.find(z => !z.contains(src) && z !== src) || it[1]; return [src, dst]; },
        // 2) v19.5: último ítem → primera zona
        () => { const it = items0(); if (it.length < 2) return null; return [it[it.length - 1], zones0()[0] || it[0]]; },
        // 3) NUEVO: primer ítem → último ítem
        () => { const it = items0(); return it.length > 1 ? [it[0], it[it.length - 1]] : null; },
        // 4) NUEVO: segundo ítem → primer ítem
        () => { const it = items0(); return it.length > 1 ? [it[1], it[0]] : null; }
      ];

      for (let i = 0; i < strategies.length; i++) {
        const pair = strategies[i]();
        if (!pair || !pair[0] || !pair[1]) continue;
        await drag(pair[0], pair[1]);
        if (!tn) return { did: 'sequence_solved', attempt: i + 1 };
        if (await waitFor(() => NavigationManager.taskDone(tn), 2500)) return { did: 'sequence_solved', attempt: i + 1, verified: true };
      }
      return { did: 'sequence_unverified' };
    }

    // ---------------------------------------------------------------
    // DRAG HERE / DnD                                          [AJUSTADA]
    // PARA QUÉ: arrastra los elementos del banco a los huecos o columnas.
    // CAMBIOS: (a) con stopWhenDone=false NO se detiene cuando ED marca la tarea como hecha
    //              (antes se detenía tras el primer elemento → "solo coloca uno");
    //          (b) con `mapping` coloca según lo cosechado (replay de tests).
    // ---------------------------------------------------------------
    static isDragAndDrop() {
      return !!(qv('.dndZone') && qa('.dnditem').some(vis)) || document.body.innerText.includes('Drag Here');
    }

    static async solveDragAndDrop(stopWhenDone = true, mapping = null) {
      log('🧩 [Drag & Drop] Ejecutando solver DnD...');
      if (mapping && mapping.length) return this.placeDndMapping(mapping);
      const m = dndModel();
      if (!m || !m.dests.length) return { did: 'dnd_no_model' };
      const { bank, dests } = m;
      const tn = NavigationManager.curTask()?.n;
      let moves = 0;
      const initial = bankItems(bank).length;
      const bucket = initial > dests.length && dests.every(d => d.getBoundingClientRect().height > 120);
      for (let g = 0; g < Math.max(initial, dests.length) + 4; g++) {
        const items = bankItems(bank);
        if (!items.length) break;
        let dst;
        if (bucket) dst = dests[g % dests.length];
        else dst = dests.find(d => !q('.dnditem', d));
        if (!dst) break;
        await drag(items[0], dst); moves++;
        if (stopWhenDone && tn && NavigationManager.taskDone(tn)) break;
      }
      return { did: bucket ? 'dnd_bucket_solved' : 'dnd_solved', moves };
    }

    // ---------------------------------------------------------------
    // DnD con respuestas conocidas (replay de test)            [NUEVA]
    // PARA QUÉ: coloca en cada zona el/los elemento(s) que se cosecharon en el review.
    // BUG QUE CORRIGE: v17 buscaba la zona por "etiqueta"; cuando varias zonas comparten padre
    //   la etiqueta es idéntica y todas recibían la MISMA respuesta (solo se colocaba 1 elemento).
    //   Ahora se usa la etiqueta solo si es única; si no, la posición (índice) de la zona.
    // ---------------------------------------------------------------
    static async placeDndMapping(mapping) {
      let m = dndModel();
      if (!m || !m.dests.length) return { did: 'dnd_no_model' };
      const labels = m.dests.map(zoneLabel);
      const useLabels = new Set(labels).size === labels.length && new Set(mapping.map(x => x.label)).size === mapping.length;
      let moves = 0;
      for (let i = 0; i < m.dests.length; i++) {
        let entry = useLabels ? mapping.find(x => x.label && x.label === labels[i]) : null;
        entry = entry || mapping[i];
        if (!entry) continue;
        const wants = (entry.texts && entry.texts.length ? entry.texts : [entry.text]).filter(Boolean);
        const present = qa('.dnditem', m.dests[i]).map(e => norm(txt(e)));
        const missing = [];
        for (const w of wants) {
          const k = present.indexOf(norm(w));
          if (k >= 0) present.splice(k, 1); else missing.push(w);
        }
        for (const w of missing) {
          // si ED re-renderizó el DOM, recalcular el modelo (mismo orden de zonas)
          if (!m.bank.isConnected || m.dests.some(d => !d.isConnected)) m = dndModel() || m;
          const dst = m.dests[i];
          if (!dst) break;
          const it = bankItems(m.bank).find(x => norm(txt(x)) === norm(w));
          if (it) { await drag(it, dst); moves++; }
        }
      }
      return { did: 'dnd_replay', moves };
    }

    // ---------------------------------------------------------------
    // OPCIÓN MÚLTIPLE / TRUE-FALSE / CHECKBOX                  [AJUSTADA]
    // PARA QUÉ: marca la respuesta cosechada; si no la conoce marca la 1.ª opción.
    // CAMBIOS (solo se activan si hay datos; sin datos hace exactamente lo de v19.6):
    //   - `fallback`: respuestas del review por posición, por si el texto de la pregunta no coincide.
    //   - si el texto exacto de la opción no coincide, prueba por prefijo.
    // ---------------------------------------------------------------
    static async solveMCQ(fallback = null) {
      log('☑️ [MCQ / Checkboxes] Seleccionando opciones correctas...');
      let marked = 0, fromKnown = 0;
      const known = StorageManager.getAns();
      const sets = qa('.prMCQ__qaInnerSet');

      if (!sets.length) {
        const checkboxes = qav('input[type="checkbox"]');
        for (const cb of checkboxes) {
          if (!cb.checked) { click(cb); marked++; await sleep(250); }
        }
        return { did: 'checkboxes_solved', marked };
      }

      for (const s of sets) {
        const labels = qa('label.prMCQ__answerLabel, input[type="checkbox"], input[type="radio"]', s).filter(vis);
        if (!labels.length) continue;
        const checked = q('input[type="radio"]:checked, input[type="checkbox"]:checked', s);
        if (checked) continue;

        const qText = mcqQuestionText(s);
        let kv = known[qText];
        if (kv == null && fallback) {
          const hit = fallback.find(m => norm(m.q) === norm(qText)) || fallback[sets.indexOf(s)];
          if (hit && hit.a && hit.a.length) kv = hit.a.length === 1 ? hit.a[0] : hit.a;
        }
        const wanted = (kv == null ? [] : (Array.isArray(kv) ? kv : [kv])).map(norm);
        let targets = wanted.length ? labels.filter(l => wanted.includes(norm(txt(l)))) : [];
        if (!targets.length && wanted.length) {
          targets = labels.filter(l => { const t = norm(txt(l)); return t && wanted.some(w => w.length >= 8 && t.startsWith(w.slice(0, 25))); });
        }
        if (targets.length) fromKnown++; else targets = [labels[0]];

        for (const l of targets) { click(l); marked++; await sleep(300); }
      }
      return { did: 'mcq_solved', marked, fromKnown };
    }

    // ---------------------------------------------------------------
    // RELLENAR CON DESPLEGABLES (FITB)                         [NUEVA — de v17]
    // PARA QUÉ: abre cada desplegable (.DDLOptions__selected) y elige la opción conocida
    //           (replay de test) o la primera.
    // ---------------------------------------------------------------
    static async solveFITB(values = null) {
      log('🔽 [FITB] Rellenando desplegables...');
      const drops = qav('.DDLOptions__selected');
      let n = 0;
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        const want = values ? values[i] : null;
        if (!want && txt(d)) continue;                    // ya tiene algo y no hay respuesta conocida
        click(d); await sleep(350);
        const opts = qav('.DDLOptions__listItem');
        const o = (want && opts.find(x => norm(txt(x)) === norm(want))) || opts[0];
        if (o) { click(o); n++; }
        await sleep(250);
      }
      return { did: 'fitb_solved', n, waitDone: 3500 };
    }

    // ---------------------------------------------------------------
    // INPUTS DE TEXTO / TEXTAREA                               [NUEVA — de v17]
    // PARA QUÉ: respuestas cortas ("yes") o largas (writingText) en campos de texto normales
    //           (NO TinyMCE, ese lo hace solveWriting).
    // ---------------------------------------------------------------
    static textInputs() {
      return qav('input[type="text"], textarea').filter(i => !i.closest('header, .sitemenu, .learning__header, #ed-autopilot-hud') && !/^mce_/.test(i.id || '') && !i.readOnly && !i.disabled);
    }

    static async solveText() {
      log('⌨️ [Texto] Rellenando campos de texto...');
      const isLong = !!qv('.prOpenEnded__main--isLongInput');
      let n = 0;
      for (const t of this.textInputs()) {
        if ((t.value || '').trim()) continue;
        const long = isLong || (t.tagName === 'TEXTAREA' && t.getBoundingClientRect().height > 60);
        setNative(t, long ? CFG.writingText : CFG.shortText); n++;
        await sleep(150);
      }
      return { did: 'text_solved', n, long: isLong, waitDone: 3500 };
    }

    // ---------------------------------------------------------------
    // AUDIO / VIDEO SOLO                                       [NUEVA — de v17]
    // PARA QUÉ: pulsa play unos segundos y luego pausa (algunas pantallas lo exigen).
    // ---------------------------------------------------------------
    static async solveMedia() {
      const b = qv('.layout__mediaPlayPause');
      if (!b) return { did: 'media_none' };
      log('▶️ [Media] Reproduciendo audio/video...');
      click(b); await sleep(3000);
      const b2 = qv('.layout__mediaPlayPause'); if (b2 && /--pause|pause/i.test(b2.className)) click(b2);
      await sleep(300);
      return { did: 'media_played', waitDone: 4000 };
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
        if (wasActive || !verifiable) { await sleep(600); return tab; }
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
    static readDnd() {
      const m = dndModel();
      if (!m) return [];
      const zones = qav('.dndZone');
      const dests = qav('.dndBank').length ? m.dests : zones.filter(z => !(qa('.dnditem', z).length >= 2 && zones.length > 2));
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
      if (!stillReview && looksLast && CFG.retakeAfterReview) await this.backToTest();
      return { harvested: true, idx, saved };
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

        // NUEVO: si ya se reintentó el máximo y sigue < 100 %, se rinde y sigue (evita bucle infinito)
        if (pct < 100 && TestManager.tooManyRetries(key)) {
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

  let hud = null;
  window.__ed = {
    _v: V, _running: false, _hudTimer: null,
    async auto() {
      if (this._running) return log('ya está corriendo');
      this._running = true;
      log('🚀 ED-Autopilot v19.7 iniciado.');
      let n = 0;
      while (this._running) {
        if (++n > CFG.maxIterations) { this._running = false; break; }
        try { const r = await MainEngine.step(); log('#' + n, r); } catch (e) { errLog('🛑 BOT DETENIDO:', e.message); this._running = false; break; }
        await sleep(CFG.tickMs);
      }
      log('⏸ Bot detenido.');
      hud && hud.render();
    },
    stop() { this._running = false; hud && hud.render(); },

    // Un solo paso (para depurar)
    async step() { const r = await MainEngine.step(); log(r); return r; },

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
        'a.tasksBtnext.learning__nextItemLink', 'a.tasksBtnext.learning__submitTestLink'];
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
    cfg(o) { if (o) { Object.assign(CFG, o); try { localStorage.setItem(K_CFG, JSON.stringify(CFG)); } catch (e) {} } return CFG; },
    answers: () => StorageManager.getAns(),
    testAnswers: () => StorageManager.getAns2(),
    scores: () => StorageManager.getScores(),
    help() {
      console.table({
        '__ed.auto()': 'Arranca', '__ed.stop()': 'Pausa', '__ed.step()': 'Un solo paso',
        '__ed.inspect()': 'Qué ve el bot en esta pantalla (pásame esto si algo falla)',
        '__ed.cfg({...})': 'Cambiar config (retakeAfterReview, solveWithoutTaskNav, recordSeconds, ...)',
        '__ed.answers()': 'Respuestas cosechadas', '__ed.scores()': 'Puntajes vistos'
      });
    }
  };

  class HUD {
    constructor() {
      this.el = document.createElement('div');
      this.el.id = 'ed-autopilot-hud';
      Object.assign(this.el.style, { position: 'fixed', bottom: '70px', right: '14px', width: '250px', background: 'rgba(20,26,38,.95)', color: '#f1f2f6', borderRadius: '10px', border: '1px solid rgba(255,255,255,.15)', zIndex: 999999, font: '12px sans-serif', padding: '10px' });
      document.body.appendChild(this.el);
      this.render();
      window.__ed._hudTimer = setInterval(() => this.render(), 2000);
    }
    render() {
      const run = window.__ed._running;
      let kind = '';
      try { kind = window.__ed.kind(); } catch (e) {}
      this.el.innerHTML = `<b>ED v19.7 OOP</b> [${run ? '🟢 Activo' : '🔴 Pausa'}]<br><span style="color:#a4b0be">${kind}</span><br>
        <button id="ed_t" style="margin-top:6px;padding:4px 8px;background:${run?'#e74c3c':'#2ecc71'};color:#fff;border:0;border-radius:4px;cursor:pointer">${run?'Parar':'Iniciar'}</button>`;
      this.el.querySelector('#ed_t').onclick = () => { run ? window.__ed.stop() : window.__ed.auto(); };
    }
  }
  hud = new HUD();

  log('✅ ED-Autopilot v19.7 cargado con éxito. Usa __ed.auto() para arrancar · __ed.inspect() para diagnosticar.');
})();