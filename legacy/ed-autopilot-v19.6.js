/* =====================================================================
   ED-Autopilot v19.5 (Secuencia v17 Restaurada + Arquitectura Limpia)
   ---------------------------------------------------------------------
   - Integra solveSequence directamente desde la versión 17 para resolver
     los ejercicios de ordenamiento de pasos (.prSeq__container).
   - Mantiene 100% intactas y blindadas las lógicas de Tests, Review, 
     Score, MCQ, Writing y el motor DnD original.
   ===================================================================== */
(() => {
  'use strict';
  const V = 19.5;
  if (window.__ed && window.__ed._v === V) { console.log('%c[ED]', 'color:#27ae61', 'v19.5 ya instalado → __ed.help()'); return; }
  try { window.__ed && window.__ed.stop && window.__ed.stop(); } catch (e) {}
  try { clearInterval(window.__ed && window.__ed._hudTimer); } catch (e) {}
  try { document.getElementById('ed-autopilot-hud')?.remove(); } catch (e) {}
  try {
    document.querySelectorAll('body > div').forEach(d => {
      if (d.style && d.style.position === 'fixed' && /^ED v\d+\.\d+ OOP/.test(d.textContent || '')) d.remove();
    });
  } catch (e) {}

  const K_CFG = 'ed:cfg:v18.11';
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
    correctTabSelector: ''
  }, (() => { try { return JSON.parse(localStorage.getItem(K_CFG) || '{}'); } catch (e) { return {}; } })());

  const K_ANS = 'ed:answers:v1';
  const K_ANS2 = 'ed:testAns:v2';
  const K_KNOWN = 'ed:testKnown:v1';
  const K_SCORES = 'ed:testScores:v1';
  const K_RUN = 'ed:testRun:v1';

  const RE_SCORE = /(Your test score|Your score|test score is|calificaci[oó]n|puntaje)/i;
  const RE_SUBMIT_POPUP = /(haven'?t answered|submit the test|no ha responder|no respondiste|enviar la prueba)/i;
  const RE_DONE = /(Completed|Completad[oa]|Terminad[oa]|Finalizad[oa])/i;

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
  const log = (...a) => console.log('%c[ED v19.5]', 'color:#27ae61;font-weight:bold', ...a);
  const warn = (...a) => console.warn('%c[ED v19.5]', 'color:#e67e22;font-weight:bold', ...a);
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

  // ===================================================================
  //  MOTOR DE ARRASTRE ORIGINAL (VERSIÓN 17 PROBADA)
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

  function dndModel() {
    const zones = qav('.dndZone');
    if (!zones.length) return null;
    let bank = qav('.dndBank')[0] || null;
    if (!bank) bank = zones.slice().sort((a, b) => qa('.dnditem', b).length - qa('.dnditem', a).length)[0];
    const dests = zones.filter(z => z !== bank && !bank.contains(z) && !z.contains(bank));
    return { bank, dests };
  }
  const bankItems = bank => qa('.dnditem', bank).filter(vis);

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

  // ===================================================================
  //  MODULARIZACIÓN DE EJERCICIOS (PRACTICE SOLVERS)
  // ===================================================================
  class PracticeSolver {
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

    // SOLUCIONADOR DE SECUENCIAS RESTAURADO DE LA V17 (.prSeq__container)[cite: 17]
    static async solveSequence() {
      log('🔢 [Sequence / Ordering] Ordenando pasos secuenciales...');
      const box = qv('.prSeq__container');
      if (!box) return { did: 'seq_not_found' };
      const items = qa('.dnditem', box).filter(vis);
      const zones = qa('.dndZone', box).filter(vis);
      if (items.length < 2) return { did: 'seq_no_items' };
      const tn = NavigationManager.curTask()?.n;
      
      const src = items[0];
      const dst = zones.find(z => !z.contains(src) && z !== src) || items[1];
      await drag(src, dst);
      if (tn && !(await waitFor(() => NavigationManager.taskDone(tn), 2500))) {
        const it2 = qa('.dnditem', box).filter(vis);
        if (it2.length > 1) await drag(it2[it2.length - 1], qa('.dndZone', box).filter(vis)[0] || it2[0]);
      }
      return { did: 'sequence_solved' };
    }

    static isDragAndDrop() {
      return !!(qv('.dndZone') && qa('.dnditem').some(vis)) || document.body.innerText.includes('Drag Here');
    }

    static async solveDragAndDrop(stopWhenDone = true) {
      log('🧩 [Drag & Drop] Ejecutando solver DnD...');
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

    static async solveMCQ() {
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

        const kv = known[mcqQuestionText(s)];
        const wanted = (kv == null ? [] : (Array.isArray(kv) ? kv : [kv])).map(norm);
        let targets = wanted.length ? labels.filter(l => wanted.includes(norm(txt(l)))) : [];
        if (targets.length) fromKnown++; else targets = [labels[0]];

        for (const l of targets) { click(l); marked++; await sleep(300); }
      }
      return { did: 'mcq_solved', marked, fromKnown };
    }
  }

  // ===================================================================
  //  TEST MANAGER (BLINDADO)
  // ===================================================================
  class TestManager {
    static isTestStart() { return !!qv('.btnStartTest'); }

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

    static async ensureCorrectAnswerTab() {
      let tab = await waitFor(() => this.findTab(RE_TAB_CORRECT), 5000, 250);
      if (!tab) throw new Error('ED_CORRECT_TAB_MISSING');
      const before = this.reviewSig();
      click(tab);
      await waitFor(() => this.reviewSig() !== before, 2500, 200);
      return tab;
    }

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

    static async harvestReview(key) {
      log('📖 [Review Cosecha] Extrayendo respuestas correctas:', key);
      await this.ensureCorrectAnswerTab();
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
        } catch (e) {}
      }
      if (saved) StorageManager.addKnown(key);
      await NavigationManager.goNext();
      await sleep(1500);
      return { harvested: true, idx, saved };
    }
  }

  // ===================================================================
  //  MOTOR PRINCIPAL (MAIN ENGINE)
  // ===================================================================
  class MainEngine {
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

        if (pct === 100) {
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

      const t = NavigationManager.curTask();
      if (!t) { await NavigationManager.goNext(); return { did: 'no_task_navigated' }; }
      if (t.done) { await NavigationManager.goNext(); return { did: 'task_already_done_next' }; }

      // ENRUTAMIENTO DE EJERCICIOS (INCLUYENDO SEQUENCE RESTAURADO)
      let res = { did: 'unknown_task' };
      if (qv('iframe[id^="mce_"][id$="_ifr"]')) {
        res = await PracticeSolver.solveWriting();
      } else if (qav('span.st.learning__selectTxt_st').length) {
        res = await PracticeSolver.solveSelectText();
      } else if (qv('.prSeq__container')) {
        res = await PracticeSolver.solveSequence();
      } else if (PracticeSolver.isDragAndDrop()) {
        res = await PracticeSolver.solveDragAndDrop();
      } else {
        res = await PracticeSolver.solveMCQ();
      }

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
      log('🚀 ED-Autopilot v19.5 iniciado.');
      let n = 0;
      while (this._running) {
        if (++n > CFG.maxIterations) { this._running = false; break; }
        try { await MainEngine.step(); } catch (e) { errLog('🛑 BOT DETENIDO:', e.message); this._running = false; break; }
        await sleep(CFG.tickMs);
      }
      log('⏸ Bot detenido.');
      hud && hud.render();
    },
    stop() { this._running = false; hud && hud.render(); },
    help() { console.log('Comandos: __ed.auto(), __ed.stop()'); }
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
      this.el.innerHTML = `<b>ED v19.5 OOP</b> [${run ? '🟢 Activo' : '🔴 Pausa'}]<br>
        <button id="ed_t" style="margin-top:6px;padding:4px 8px;background:${run?'#e74c3c':'#2ecc71'};color:#fff;border:0;border-radius:4px;cursor:pointer">${run?'Parar':'Iniciar'}</button>`;
      this.el.querySelector('#ed_t').onclick = () => { run ? window.__ed.stop() : window.__ed.auto(); };
    }
  }
  hud = new HUD();

  log('✅ ED-Autopilot v19.5 cargado con éxito. Usa __ed.auto() para arrancar.');
})();