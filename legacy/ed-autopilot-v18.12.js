/* =====================================================================
   ED-Autopilot v18.12 (Cosecha Quirúrgica — Pestaña Correct Answer Forzada y Verificada)
   ---------------------------------------------------------------------
   CAMBIOS RESPECTO A v18.11 (todo lo demás queda idéntico):
   1. TestManager.findTab(): localiza la pestaña por TEXTO EXACTO en el nodo de
      texto más interno (TreeWalker). Ya no devuelve <div> contenedores.
   2. TestManager.ensureCorrectAnswerTab(): clic obligatorio con 3 estrategias
      + verificación (clase activa o cambio en el DOM). Si no existe → error
      controlado ED_CORRECT_TAB_MISSING con diagnóstico.
   3. TestManager.isReview(): usa la misma detección estricta de pestañas.
   4. TestManager.isScore(): guarda de 1 línea → si hay pestañas de revisión,
      NO es la pantalla de puntaje (evita reabrir Review en bucle / error).
   5. harvestReview(): ignora respuestas sin texto de pregunta, excluye
      "incorrect/wrong", prefiere elementos visibles y avisa si no cosechó.
   6. PracticeSolver.solveMCQ(): usa las respuestas cosechadas (si existen);
      si no hay, el comportamiento es idéntico al anterior (1ª opción).
   7. Menores: regex del popup en español, getRun() nulo, id/timer del HUD,
      tope maxIterations, __ed.debugReview() y __ed.answers().
   Intactos: clases, módulo Writing/TinyMCE/AI Feedback, entrada a Review,
   lógica de Score 100%, navegación y modales.
   ===================================================================== */
(() => {
  'use strict';
  const V = 18.12;
  if (window.__ed && window.__ed._v === V) { console.log('%c[ED]', 'color:#27ae61', 'v18.12 ya instalado → __ed.help()'); return; }
  try { window.__ed && window.__ed.stop && window.__ed.stop(); } catch (e) {}
  try { clearInterval(window.__ed && window.__ed._hudTimer); } catch (e) {}
  try { document.getElementById('ed-autopilot-hud')?.remove(); } catch (e) {}
  // Limpia HUDs de versiones anteriores que no tenían id
  try {
    document.querySelectorAll('body > div').forEach(d => {
      if (d.style && d.style.position === 'fixed' && /^ED v\d+\.\d+ OOP/.test(d.textContent || '')) d.remove();
    });
  } catch (e) {}

  // ===================================================================
  //  CONFIG & STORAGE
  // ===================================================================
  const K_CFG = 'ed:cfg:v18.11'; // se mantiene la clave para no perder tu configuración guardada
  const CFG = Object.assign({
    writingText: 'I think this is a very interesting topic and I really enjoyed learning about it because it helps us understand new perspectives.',
    shortText: 'yes',
    recordSeconds: 3.5,
    sendToTeacher: true,
    useAIFeedback: true,
    maxTaskAttempts: 4,
    maxTestAttempts: 3,
    tickMs: 1200,
    maxIterations: 1500,
    correctTabSelector: '' // opcional: selector CSS manual de la pestaña "Correct Answer" si la detección por texto fallara
  }, (() => { try { return JSON.parse(localStorage.getItem(K_CFG) || '{}'); } catch (e) { return {}; } })());

  const K_ANS = 'ed:answers:v1';
  const K_ANS2 = 'ed:testAns:v2';
  const K_KNOWN = 'ed:testKnown:v1';
  const K_SCORES = 'ed:testScores:v1';
  const K_RUN = 'ed:testRun:v1';

  const RE_SCORE = /(Your test score|Your score|test score is|calificaci[oó]n|puntaje)/i;
  const RE_SUBMIT_POPUP = /(haven'?t answered|submit the test|no ha respond|no respondiste|enviar la prueba)/i;
  const RE_DONE = /(Completed|Completad[oa]|Terminad[oa]|Finalizad[oa])/i;

  // Texto EXACTO de las pestañas de la pantalla de revisión (se compara contra un nodo de texto, no contra contenedores)
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
  const log = (...a) => console.log('%c[ED v18.12]', 'color:#27ae61;font-weight:bold', ...a);
  const warn = (...a) => console.warn('%c[ED v18.12]', 'color:#e67e22;font-weight:bold', ...a);
  const errLog = (...a) => { console.error('%c[ED ERROR]', 'color:#c0392b;font-weight:bold', ...a); };

  // Texto de la pregunta de un bloque MCQ (misma función para cosechar y para responder → las claves coinciden)
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
  // Clic "duro": secuencia completa pointer/mouse + click nativo (para handlers en mousedown/pointerdown)
  function hardClick(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) {}
    try {
      const w = el.ownerDocument.defaultView || window;
      const r = el.getBoundingClientRect();
      const o = { bubbles: true, cancelable: true, view: w, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
        const Ctor = (t.startsWith('pointer') && w.PointerEvent) ? w.PointerEvent : w.MouseEvent;
        el.dispatchEvent(new Ctor(t, o));
      }
      el.click();
      return true;
    } catch (e) { try { el.click(); return true; } catch (_) { return false; } }
  }
  function clickInFrame(el) {
    try {
      const w = el.ownerDocument.defaultView; const r = el.getBoundingClientRect();
      el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w, clientX: r.left + 5, clientY: r.top + 5 }));
      return true;
    } catch (e) { try { el.click(); return true; } catch (_) { return false; } }
  }

  // ===================================================================
  //  CLASES MODULARES
  // ===================================================================

  class StorageManager {
    static getAns() { try { return JSON.parse(localStorage.getItem(K_ANS) || '{}'); } catch (e) { return {}; } }
    static getAns2() { try { return JSON.parse(localStorage.getItem(K_ANS2) || '{}'); } catch (e) { return {}; } }
    static getKnown() { try { return JSON.parse(localStorage.getItem(K_KNOWN) || '[]'); } catch (e) { return []; } }
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
      return handled;
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

  class PracticeSolver {
    static async solveWriting() {
      log('✍️ [Writing Intacto] Escribiendo texto y solicitando AI feedback...');
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
      return { did: 'tinymce_intacto', words: wc(text) };
    }

    static async solveSelectText() {
      const spans = qav('span.st.learning__selectTxt_st').filter(s => !/--selected/.test(s.className) && txt(s).length > 1);
      if (!spans.length) return { did: 'select_text_no_spans' };
      let selectedCount = 0;
      for (const s of spans) {
        click(s); await sleep(400);
        if (/--selected/.test(s.className)) selectedCount++;
      }
      return { did: 'select_text', selectedCount };
    }

    // v18.12: si la pregunta ya fue cosechada en una revisión, marca la(s) opción(es) correcta(s);
    // si no, comportamiento idéntico a v18.11 (primera opción).
    static async solveMCQ() {
      let marked = 0, fromKnown = 0;
      const known = StorageManager.getAns();
      const sets = qa('.prMCQ__qaInnerSet');
      for (const s of sets) {
        const labels = qa('label.prMCQ__answerLabel', s).filter(vis);
        if (!labels.length) continue;
        const checked = q('input[type="radio"]:checked, input[type="checkbox"]:checked', s);
        if (checked) continue;

        const kv = known[mcqQuestionText(s)];
        const wanted = (kv == null ? [] : (Array.isArray(kv) ? kv : [kv])).map(norm);
        let targets = wanted.length ? labels.filter(l => wanted.includes(norm(txt(l)))) : [];
        if (targets.length) fromKnown++; else targets = [labels[0]];

        for (const l of targets) { click(l); marked++; await sleep(300); }
      }
      return { did: 'mcq', marked, fromKnown };
    }
  }

  class TestManager {
    static isTestStart() { return !!qv('.btnStartTest'); }

    // ---- Detección estricta de las pestañas "Your Answer" / "Correct Answer" -------------
    // Busca el NODO DE TEXTO cuyo contenido es exactamente el nombre de la pestaña y devuelve
    // su elemento padre (el más interno). Nunca devuelve contenedores grandes.
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
      // Prioriza lo que parece una pestaña/botón; a igualdad, el orden del documento (sort estable)
      const rank = el => (el.closest('a, button, li, [role="tab"], [onclick], [class*="tab" i]') ? 0 : 1);
      return found.sort((a, b) => rank(a) - rank(b))[0];
    }

    static hasReviewTabs() { return !!(this.findTab(RE_TAB_CORRECT) || this.findTab(RE_TAB_YOURS)); }

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

    // Firma del estado visible de las respuestas: cambia al cambiar de pestaña
    static reviewSig() {
      return qa('.prMCQ__qaInnerSet').map(s =>
        qa('.prMCQ__answers', s).map(a => (vis(a) ? 'v' : 'h') + a.className).join(',')
      ).join('|');
    }

    static dumpReviewCandidates() {
      const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) {
        const n = w.currentNode; const p = n.parentElement;
        const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (!p || !t || t.length > 60 || !/answer|respuesta/i.test(t)) continue;
        out.push({ text: t, tag: p.tagName, class: String(p.className || ''), visible: vis(p), parent: p.parentElement ? p.parentElement.tagName + '.' + String(p.parentElement.className || '') : '', html: p.outerHTML.slice(0, 160) });
      }
      console.table(out);
      return out;
    }

    // Clic OBLIGATORIO en la pestaña "Correct Answer". 3 estrategias + verificación.
    static async ensureCorrectAnswerTab() {
      let tab = await waitFor(() => this.findTab(RE_TAB_CORRECT), 5000, 250);
      if (!tab) {
        errLog('❌ No se encontró la pestaña "Correct Answer". Candidatos visibles con "answer/respuesta":');
        try { this.dumpReviewCandidates(); } catch (e) {}
        throw new Error('ED_CORRECT_TAB_MISSING: No se encontró la pestaña "Correct Answer". Ejecuta __ed.debugReview() y/o define correctTabSelector.');
      }

      const before = this.reviewSig();
      const strategies = [
        ['click', el => click(el)],
        ['hardClick', el => hardClick(el)],
        ['hardClick(ancestro clicable)', el => hardClick(el.closest('a, button, li, [role="tab"]') || el)]
      ];

      for (let i = 0; i < strategies.length; i++) {
        const [name, fn] = strategies[i];
        log(`🎯 [Review] Pestaña "Correct Answer" → clic (${name}) sobre <${tab.tagName.toLowerCase()}${tab.className ? '.' + String(tab.className).trim().split(/\s+/).join('.') : ''}>`);
        fn(tab);
        const ok = await waitFor(() => {
          const cur = this.findTab(RE_TAB_CORRECT);
          return (cur && this.tabIsActive(cur)) || this.reviewSig() !== before;
        }, 2500, 200);
        if (ok) { log('✅ [Review] Pestaña "Correct Answer" activa.'); await sleep(500); return tab; }
        tab = this.findTab(RE_TAB_CORRECT) || tab; // por si la pestaña se re-renderizó
      }

      warn('⚠️ [Review] Clic realizado pero no pude confirmar el cambio de pestaña (puede ser una pregunta 100% acertada). Continúo.');
      await sleep(500);
      return tab;
    }

    static isScore() {
      if (this.isTestStart()) return false;
      // v18.12: si están las pestañas de revisión, esto es la REVISIÓN, no el puntaje
      if (this.hasReviewTabs()) return false;
      if (qv('.TestResults') || qv('.testFeedback')) return true;
      const main = qv('.learning__container') || document.body;
      return RE_SCORE.test(txt(main).slice(0, 3000));
    }

    static isReview() {
      if (this.isTestStart()) return false;
      if (this.hasReviewTabs()) return true;
      if (this.isScore()) return false;
      return /review|let'?s review/i.test(NavigationManager.stepLabel());
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
      const labels = corr.map(a => txt(q('label.prMCQ__answerLabel, .multiTextInline, label', a))).filter(Boolean);
      return [...new Set(labels)];
    }

    static async harvestReview(key) {
      log('📖 [Review Cosecha] Extrayendo respuestas correctas:', key);

      // PASO 1 (obligatorio): pasar de "Your Answer" a "Correct Answer" ANTES de leer nada
      await this.ensureCorrectAnswerTab();

      // PASO 2: cosechar
      const ans = StorageManager.getAns();
      const ans2 = StorageManager.getAns2();
      ans2[key] = ans2[key] || {};

      const c = NavigationManager.counter(); const idx = c ? c.i : 1;

      const items = qa('.prMCQ__qaInnerSet').map(s => ({ q: mcqQuestionText(s), a: this.correctLabels(s) }));

      let saved = 0;
      if (items.length) {
        ans2[key][idx] = { mcq: items };
        for (const m of items) {
          if (m.q && m.a.length) { ans[m.q] = m.a.length === 1 ? m.a[0] : m.a; saved++; }
        }
        try {
          localStorage.setItem(K_ANS, JSON.stringify(ans));
          localStorage.setItem(K_ANS2, JSON.stringify(ans2));
        } catch (e) { warn('No se pudo guardar en localStorage:', e.message); }
      }

      if (saved) StorageManager.addKnown(key);
      if (items.length && !saved) warn(`⚠️ [Review] Reactivo ${idx}: hay ${items.length} bloque(s) MCQ pero NO se detectó ninguna respuesta correcta. Revisa __ed.debugReview().`);
      log(`  📖 [Review] Reactivo ${idx} cosechado: ${saved}/${items.length} respuestas correctas guardadas.`);

      // PASO 3: avanzar
      await NavigationManager.goNext();
      await sleep(1500);
      return { harvested: true, idx, saved };
    }
  }

  class MainEngine {
    static async step() {
      if (!/learningArea/i.test(location.href) && !q('.learning__dropDownListTitleW--steps')) return { did: 'not_in_lesson' };

      await NavigationManager.handleModals();

      // 1. START TEST (CONGELADO Y SEGURO)
      if (TestManager.isTestStart()) {
        const key = NavigationManager.testKey();
        log('🚀 [Test Start] Iniciando test:', key);
        click(qv('.btnStartTest'));
        await sleep(3000);
        return { did: 'test_started' };
      }

      // 2. PANTALLA DE PUNTAJE (CONGELADA Y SEGURA)
      if (TestManager.isScore()) {
        const pct = TestManager.scorePct() ?? 0;
        const key = NavigationManager.testKey();
        StorageManager.saveScore(key, pct);

        if (pct === 100) {
          StorageManager.setRun(null);
          await NavigationManager.goNext();
          return { did: 'test_passed_100', pct };
        } else {
          log(`⚠️ Test con puntaje menor a 100% (${pct}%). Buscando el botón Review inferior con prioridad absoluta...`);

          StorageManager.setRun({ key, phase: 'review', attempts: 1 });

          let rv = null;
          for (let attempt = 1; attempt <= 15; attempt++) {
            rv = qv('.learning__testReviewLink') || qv('.learning__testReview a') || qv('.learning__testReview') ||
                 qa('button, a, div, span').find(el => vis(el) && /^(review|revisar)$/i.test(txt(el)));
            if (rv) break;
            await sleep(400);
          }

          if (rv) {
            log('✅ ¡Botón Review encontrado! Haciendo clic obligatorio...');
            click(rv);
            await sleep(3000);
            return { did: 'opened_review_forced', pct };
          }

          errLog('❌ ERROR CRÍTICO: El test no tiene 100% y el bot no pudo presionar el botón Review.');
          throw new Error('ED_REVIEW_LINK_MISSING: Imposible hacer clic en Review. Bot detenido.');
        }
      }

      // 3. PANTALLA DE REVISIÓN / COSECHA
      if (TestManager.isReview()) {
        const run = StorageManager.getRun();
        const key = (run && run.key) ? run.key : NavigationManager.testKey();
        const r = await TestManager.harvestReview(key);
        return { did: 'review_harvest_item_processed', ...r };
      }

      // 4. PRÁCTICAS NORMALES
      const t = NavigationManager.curTask();
      if (!t) { await NavigationManager.goNext(); return { did: 'no_task_navigated' }; }
      if (t.done) { await NavigationManager.goNext(); return { did: 'task_already_done_next' }; }

      let res = { did: 'unknown_task' };
      if (qv('iframe[id^="mce_"][id$="_ifr"]')) {
        res = await PracticeSolver.solveWriting();
      } else if (qav('span.st.learning__selectTxt_st').length) {
        res = await PracticeSolver.solveSelectText();
      } else {
        res = await PracticeSolver.solveMCQ();
      }

      await sleep(800);

      if (!NavigationManager.taskDone(t.n)) {
        errLog(`❌ BLOQUEO ESTRICTO: La tarea ${t.n} no se marcó como completada.`);
        throw new Error(`ED_TASK_NOT_COMPLETED: La tarea #${t.n} no pudo completarse automáticamente.`);
      }

      await NavigationManager.goNext();
      return res;
    }
  }

  // ===================================================================
  //  API & HUD
  // ===================================================================
  let hud = null;
  window.__ed = {
    _v: V, _running: false, _hudTimer: null,
    async auto() {
      if (this._running) return log('ya está corriendo');
      this._running = true;
      log('🚀 ED-Autopilot v18.12 iniciado.');
      let n = 0;
      while (this._running) {
        if (++n > CFG.maxIterations) {
          warn(`Límite de ${CFG.maxIterations} iteraciones alcanzado. Bot detenido.`);
          this._running = false;
          break;
        }
        try {
          const r = await MainEngine.step();
          log('Paso ejecutado:', r);
        } catch (e) {
          errLog('🛑 BOT DETENIDO POR ERROR CONTROLADO:', e.message);
          this._running = false;
          break;
        }
        await sleep(CFG.tickMs);
      }
      log('⏸ Bot detenido.');
      hud && hud.render();
    },
    stop() { this._running = false; log('⏸ Stop solicitado.'); hud && hud.render(); },
    debugReview() { return TestManager.dumpReviewCandidates(); },
    answers() { return StorageManager.getAns(); },
    help() { console.log('Comandos: __ed.auto(), __ed.stop(), __ed.debugReview() [lista candidatos de pestaña], __ed.answers() [respuestas cosechadas]'); }
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
      this.el.innerHTML = `<b>ED v18.12 OOP</b> [${run ? '🟢 Activo' : '🔴 Pausa'}]<br>
        <button id="ed_t" style="margin-top:6px;padding:4px 8px;background:${run?'#e74c3c':'#2ecc71'};color:#fff;border:0;border-radius:4px;cursor:pointer">${run?'Parar':'Iniciar'}</button>`;
      this.el.querySelector('#ed_t').onclick = () => { run ? window.__ed.stop() : window.__ed.auto(); };
    }
  }
  hud = new HUD();

  log('✅ ED-Autopilot v18.12 cargado con éxito. Usa __ed.auto() para arrancar.');
})();
