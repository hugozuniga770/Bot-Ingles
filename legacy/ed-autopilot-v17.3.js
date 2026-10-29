/* =====================================================================
   ED-Autopilot v17.3 (Cosecha Pausada + Next + Flecha Atrás + Replay)
   ---------------------------------------------------------------------
   Soluciona la duplicación de DONE_WAIT e implementa el flujo exacto:
   Revisión -> Cosecha -> Next -> Flecha Atrás -> Replay al 100%.
   ===================================================================== */
(() => {
  'use strict';
  const V = 17.3;
  if (window.__ed && window.__ed._v === V) { console.log('%c[ED]', 'color:#27ae61', 'v17.3 ya instalado → __ed.help()'); return; }
  try { window.__ed && window.__ed.stop && window.__ed.stop(); } catch (e) {}
  try { document.getElementById('ed-autopilot-hud')?.remove(); } catch (e) {}

  // ===================================================================
  //  CONFIG
  // ===================================================================
  const K_CFG = 'ed:cfg:v17.3';
  const CFG_DEFAULT = {
    writingText: 'I think this is a very interesting topic and I really enjoyed learning about it.',
    shortText: 'yes',
    recordSeconds: 3.5,
    sendToTeacher: true,
    useAIFeedback: true,
    maxTaskAttempts: 2,
    maxTestAttempts: 3,
    tickMs: 1200,
    maxIterations: 1500
  };
  let CFG = Object.assign({}, CFG_DEFAULT, (() => { try { return JSON.parse(localStorage.getItem(K_CFG) || '{}'); } catch (e) { return {}; } })());

  // ===================================================================
  //  STORAGE KEYS
  // ===================================================================
  const K_ANS = 'ed:answers:v1';
  const K_ANS2 = 'ed:testAns:v2';
  const K_KNOWN = 'ed:testKnown:v1';
  const K_MODE = 'ed:mode:v1';
  const K_SCORES = 'ed:testScores:v1';
  const K_RUN = 'ed:testRun:v1';

  // ===================================================================
  //  REGEX EN/ES
  // ===================================================================
  const RE_TEST_STEP = /^(?:Step|Paso)\s*\d+\s*:\s*(Test|Prueba|Examen|Let'?s review|Review|Repasemos|Repaso|Repase)\s*$/i;
  const RE_TEST_ITEM = /^\d+\.\s*(Test|Prueba|Examen|Let'?s review|Review|Repasemos|Repaso|Repase)\b/i;
  const RE_CORRECT_TAB = /^(Correct Answers?|Respuestas? correctas?)$/i;
  const RE_SCORE = /(Your test score|Your score|test score is|calificaci[oó]n|puntaje)/i;
  const RE_SUBMIT_POPUP = /(haven'?t answered|submit the test|no ha respondido|no respondiste|enviar la prueba)/i;
  const RE_DONE = /(Completed|Completad[oa]|Terminad[oa]|Finalizad[oa])/i;
  const RE_ST_DONE = /(Completed|Completad[oa]|Terminad[oa])\s*$/i;
  const RE_RETAKE = /^(Retake( Test)?|Try again|Start again|Start Test|Reintentar|Volver a (intentar|hacer)|Comenzar prueba)$/i;

  // ===================================================================
  //  UTILS
  // ===================================================================
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const q = (s, r = document) => { try { return r.querySelector(s); } catch (e) { return null; } };
  const qa = (s, r = document) => { try { return Array.from(r.querySelectorAll(s)); } catch (e) { return []; } };
  const txt = e => (e ? (e.textContent || '') : '').replace(/\s+/g, ' ').trim();
  const vis = e => {
    if (!e || !e.getBoundingClientRect) return false;
    const r = e.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return false;
    if (e.offsetParent !== null) return true;
    try { const cs = getComputedStyle(e); return cs.position === 'fixed' && cs.visibility !== 'hidden' && cs.display !== 'none'; } catch (_) { return false; }
  };
  const qv = (s, r) => qa(s, r).find(vis) || null;
  const qav = (s, r) => qa(s, r).filter(vis);
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const wc = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
  const log = (...a) => console.log('%c[ED v17.3]', 'color:#27ae61;font-weight:bold', ...a);
  const warn = (...a) => console.warn('%c[ED v17.3]', 'color:#e67e22;font-weight:bold', ...a);

  async function waitFor(fn, timeout = 5000, every = 250) {
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

  // ---- Arrastre por Pointer Events ----
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

  // ===================================================================
  //  STORAGE
  // ===================================================================
  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const loadAns = () => jget(K_ANS, {});
  const loadAns2 = () => jget(K_ANS2, {});
  const loadKnown = () => jget(K_KNOWN, []);
  const loadScores = () => jget(K_SCORES, {});
  const loadRun = () => jget(K_RUN, null);
  const saveRun = v => v ? jset(K_RUN, v) : localStorage.removeItem(K_RUN);
  const loadMode = () => localStorage.getItem(K_MODE) || 'auto';
  function addKnown(k) { const s = new Set(loadKnown()); s.add(k); jset(K_KNOWN, [...s]); }
  function saveScore(k, p) { const o = loadScores(); o[k] = p; jset(K_SCORES, o); }
  function hasAnswers(k) { const a2 = loadAns2()[k]; return loadKnown().includes(k) || !!(a2 && Object.keys(a2).length); }

  // ===================================================================
  //  LECTURA DE LA PANTALLA
  // ===================================================================
  const lessonLabel = () => txt(q('.learning__dropDownListTitleW--lessons'));
  const stepLabel = () => txt(q('.learning__dropDownListTitleW--steps'));
  const testKey = () => lessonLabel() + '||' + stepLabel();
  const lessonNum = l => (String(l).match(/(?:Lesson|Lecci[oó]n)\s*(\d+)/i) || [])[1] || null;
  const stepNum = s => (String(s).match(/(?:Step|Paso)\s*(\d+)/i) || [])[1] || null;

  function counter() {
    const m = [...(document.body.innerText || '').matchAll(/(?<![:\d])(\d{1,2})\s*\/\s*(\d{1,2})(?![:\d])/g)];
    if (!m.length) return null;
    const x = m[m.length - 1];
    return { i: +x[1], n: +x[2], s: x[1] + '/' + x[2] };
  }

  function tasks() {
    const seen = new Set();
    return qa('.learning__tasksNav_task').map(e => {
      const n = parseInt(txt(e), 10);
      const tip = txt(q('.learning__tasksNav_taskTooltip', e));
      return { el: e, n, cur: /--current/.test(e.className), done: /--done/.test(e.className) || RE_DONE.test(tip), tip };
    }).filter(t => !isNaN(t.n) && !seen.has(t.n) && seen.add(t.n));
  }
  const curTask = () => tasks().find(t => t.cur) || null;
  const taskDone = n => { const t = tasks().find(x => x.n === n); return !!(t && t.done); };
  async function gotoTask(n) {
    const t = tasks().find(x => x.n === n);
    if (!t) return false;
    click(q('a', t.el) || t.el);
    return !!(await waitFor(() => curTask()?.n === n, 6000, 300));
  }

  // ===================================================================
  //  MODALES
  // ===================================================================
  async function handleModals() {
    let n = 0;
    for (let k = 0; k < 6; k++) {
      const f = qa('iframe#colorBoxIframe, iframe[id*="colorBox"]').find(x => x.getBoundingClientRect().height > 50);
      if (!f) break;
      let d; try { d = f.contentDocument; } catch (e) { break; }
      if (!d || !d.body) break;
      const body = d.body.innerText || '';
      let b = null;
      if (RE_SUBMIT_POPUP.test(body)) b = d.querySelector('input.okButton');
      if (!b) b = d.querySelector('a.utils__cancelLInk');
      if (!b) b = d.querySelector('input.okButton, a.okButton');
      if (!b) break;
      clickInFrame(b); n++;
      await sleep(1600);
    }
    const cm = qa('.modalW_confirm, .modalW_alert, #alertModal, .confirmPopup__main').find(vis);
    if (cm) {
      const ok = q('input.okButton.utils__BSOKBtn', cm) || q('input.okButton', cm) || qv('input.okButton.utils__BSOKBtn');
      if (ok) { click(ok); n++; await sleep(700); }
    }
    if (n || cm) {
      qa('.modal-backdrop').forEach(e => { try { e.remove(); } catch (_) {} });
      try { document.body.classList.remove('modal-open'); document.body.style.overflow = ''; } catch (e) {}
    }
    return n;
  }
  const modalOpen = () => !!qa('iframe#colorBoxIframe, iframe[id*="colorBox"]').find(x => x.getBoundingClientRect().height > 50) || !!qa('.modalW_confirm, .modalW_alert, #alertModal, .confirmPopup__main').find(vis);

  // ===================================================================
  //  BOTONES DE NAVEGACIÓN
  // ===================================================================
  const nextBtn = () => qv('a.tasksBtnext.learning__nextItemLink') || qv('a.tasksBtnext.learning__submitTestLink') || qv('.learning__submitTest a') || qv('.learning__submitTest');
  async function goNext() {
    const nx = nextBtn();
    if (!nx) return false;
    const isSubmit = /submitTest/.test(nx.className || '') || /submitTest/.test(nx.parentElement?.className || '');
    click(nx);
    await sleep(isSubmit ? 2200 : 1800);
    await handleModals();
    return true;
  }

  // ===================================================================
  //  DROPDOWNS Y GOTO NEXT INCOMPLETE
  // ===================================================================
  const ddItems = which => qa(which === 'lessons' ? '.learning__dropDownListW--lessons .learning__dropDownList_item' : '.learning__dropDownListW--steps .learning__dropDownList_item').map(e => ({ el: e, t: txt(e), cur: /--current/.test(e.className) }));
  async function openDD(which) {
    const d = q(which === 'lessons' ? '.learning__dropDownListTitleW--lessons' : '.learning__dropDownListTitleW--steps');
    if (!d) return null;
    click(d); await sleep(800);
    return d;
  }
  async function closeDD(d) { if (d && d.closest('[class*="--open"], [class*="--active"]')) { click(d); await sleep(300); } }
  async function gotoLesson(n) {
    const d = await openDD('lessons'); if (!d) return false;
    const it = ddItems('lessons').find(x => new RegExp('^' + n + '\\s*\\.').test(x.t));
    if (!it) { await closeDD(d); return false; }
    click(it.el); await sleep(4500); await handleModals();
    return true;
  }
  async function gotoStep(match) {
    const d = await openDD('steps'); if (!d) return false;
    const items = ddItems('steps').filter(x => /^\d+\s*\./.test(x.t));
    let it = null;
    if (typeof match === 'number') it = items.find(x => new RegExp('^' + match + '\\s*\\.').test(x.t));
    else if (match instanceof RegExp) it = items.find(x => match.test(x.t));
    else { const n = stepNum(match); it = n ? items.find(x => new RegExp('^' + n + '\\s*\\.').test(x.t)) : null; }
    if (!it) { await closeDD(d); return false; }
    click(it.el); await sleep(4000); await handleModals();
    return true;
  }
  const exhausted = new Set();
  const stepItemName = t => t.replace(/^\d+\s*\.(\s*)/, '').replace(/\s*(Not Started|In Progress|Completed|No ha empezado|No iniciad[oa]|En progreso|En curso|Completad[oa]|Terminad[oa])\s*$/i, '').trim();
  function stepPending(lessonLbl, itemText) {
    const n = (itemText.match(/^(\d+)/) || [])[1];
    const key = lessonLbl + '||Step ' + n + ': ' + stepItemName(itemText);
    if (exhausted.has(key)) return false;
    if (RE_TEST_ITEM.test(itemText)) {
      const sc = loadScores()[key];
      if (sc === 100) return false;
      if (sc != null && sc < 100) return true;
    }
    return !RE_ST_DONE.test(itemText);
  }
  async function gotoNextIncomplete() {
    let d = await openDD('steps');
    if (d) {
      const items = ddItems('steps').filter(x => /^\d+\s*\./.test(x.t));
      const it = items.find(x => stepPending(lessonLabel(), x.t));
      if (it) {
        if (it.cur && curTask()) { await closeDD(d); const t = firstPendingTask(); if (t) { await gotoTask(t.n); return 'task'; } exhausted.add(testKey()); }
        else { click(it.el); await sleep(4000); await handleModals(); return 'step'; }
      } else await closeDD(d);
    }
    d = await openDD('lessons');
    if (!d) return null;
    const ls = ddItems('lessons').filter(x => /^\d+\s*\./.test(x.t));
    const target = ls.find(x => !x.cur && !RE_ST_DONE.test(x.t)) ||
      ls.find(x => !x.cur && Object.entries(loadScores()).some(([k, v]) => v < 100 && lessonNum(k) === (x.t.match(/^(\d+)/) || [])[1]));
    if (!target) { await closeDD(d); return null; }
    click(target.el); await sleep(4500); await handleModals();
    d = await openDD('steps');
    if (d) {
      const it = ddItems('steps').filter(x => /^\d+\s*\./.test(x.t)).find(x => stepPending(lessonLabel(), x.t));
      if (it && !it.cur) { click(it.el); await sleep(4000); await handleModals(); } else await closeDD(d);
    }
    return 'lesson';
  }

  // ===================================================================
  //  CLASIFICADOR DE PRÁCTICA
  // ===================================================================
  function classifyPractice() {
    if (qv('.openSpeech__AnsW')) return 'open_speech';
    if (qav('a.chooseCaracterArrow').length) return 'interactive_speaking';
    if ((qv('.questionInstructionsSR') || qv('.questionAnswersSet.speaker')) && qv('a.button.continue')) return 'sr_choice';
    if (qv('iframe[id^="mce_"][id$="_ifr"]') || qv('.prWriting__editorW')) return 'tinymce';
    if (qav('span.st.learning__selectTxt_st').length) return 'select_text';
    if (qv('.prSeq__container')) return 'sequence';
    if (qv('.dndZone') && qa('.dnditem').some(vis)) return 'dnd';
    if (qv('.DDLOptions__selected')) return 'fitb';
    if (qv('label.prMCQ__answerLabel')) return 'mcq';
    if (qv('textarea.prOpenEnded__qaItemText--textarea') || textInputs().length) return 'text';
    if (qv('.layout__mediaPlayPause')) return 'media';
    return 'none';
  }
  const textInputs = () => qav('input[type="text"], textarea').filter(i => !i.closest('header, .sitemenu, .learning__header, #ed-autopilot-hud') && !/^mce_/.test(i.id || '') && !i.readOnly && !i.disabled);

  // ===================================================================
  //  HANDLERS DE PRÁCTICA
  // ===================================================================
  function mcqSets() {
    const seen = new Set();
    return qav('.prMCQ__qaInnerSet').filter(s => { const k = Math.round(s.getBoundingClientRect().top + scrollY) + '|' + txt(s).slice(0, 30); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  function questionOf(set) {
    const own = q('.prMCQ__questionText, .prMCQ__questionW, .prMCQ__question', set);
    if (own && txt(own)) return txt(own);
    const all = qav('.prMCQ__questionText, .prMCQ__questionW, .prMCQ__question');
    let best = null;
    for (const e of all) if (e.compareDocumentPosition(set) & Node.DOCUMENT_POSITION_FOLLOWING) best = e;
    return txt(best || all[0]);
  }
  const labelsOf = set => qa('label.prMCQ__answerLabel', set).filter(vis);
  const isChecked = set => !!q('input[type="radio"]:checked, input[type="checkbox"]:checked', set);

  async function solveMCQ(answersFor) {
    let marked = 0, applied = 0;
    for (const s of mcqSets()) {
      const labels = labelsOf(s);
      if (!labels.length) continue;
      let want = answersFor ? answersFor(s) : null;
      if (want && !Array.isArray(want)) want = [want];
      if (want && want.length) {
        for (const w of want) {
          const l = labels.find(x => norm(txt(x)) === norm(w)) || labels.find(x => norm(txt(x)).startsWith(norm(w).slice(0, 25)));
          if (l) { const inp = q('input', l.parentElement) || q('#' + CSS.escape(l.htmlFor || '_none_')); if (!(inp && inp.checked)) { click(l); await sleep(250); } applied++; }
        }
        if (isChecked(s)) { marked++; continue; }
      }
      if (isChecked(s)) continue;
      click(labels[0]); marked++;
      await sleep(300);
    }
    return { did: 'mcq', marked, applied };
  }

  async function solveFITB(values) {
    const drops = qav('.DDLOptions__selected');
    let n = 0;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const want = values ? values[i] : null;
      if (!want && txt(d)) continue;
      click(d); await sleep(350);
      const opts = qav('.DDLOptions__listItem');
      const o = (want && opts.find(x => norm(txt(x)) === norm(want))) || opts[0];
      if (o) { click(o); n++; }
      await sleep(250);
    }
    return { did: 'fitb', n };
  }

  function setNative(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    el.focus(); setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }
  async function solveText() {
    const isLong = !!qv('.prOpenEnded__main--isLongInput');
    let n = 0;
    for (const t of textInputs()) {
      if ((t.value || '').trim()) continue;
      const long = isLong || (t.tagName === 'TEXTAREA' && t.getBoundingClientRect().height > 60);
      setNative(t, long ? CFG.writingText : CFG.shortText); n++;
      await sleep(150);
    }
    return { did: 'text', n, long: isLong };
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
  const zoneLabel = z => { const p = z.parentElement; if (!p) return ''; const c = p.cloneNode(true); qa('.dnditem, .dndZone', c).forEach(e => e.remove()); return txt(c).slice(0, 80); };

  async function solveDnD(mapping, stopWhenDone = true) {
    const m = dndModel();
    if (!m || !m.dests.length) return { did: 'dnd_no_model' };
    const { bank, dests } = m;
    const tn = curTask()?.n;
    let moves = 0;
    if (mapping && mapping.length) {
      for (let i = 0; i < dests.length; i++) {
        const want = mapping.find(x => x.label && x.label === zoneLabel(dests[i]))?.text || (mapping[i] && mapping[i].text);
        if (!want) continue;
        const cur = qa('.dnditem', dests[i]).map(txt);
        if (cur.some(c => norm(c) === norm(want))) continue;
        const it = bankItems(bank).find(x => norm(txt(x)) === norm(want));
        if (it) { await drag(it, dests[i]); moves++; }
      }
      return { did: 'dnd_replay', moves };
    }
    const initial = bankItems(bank).length;
    const bucket = initial > dests.length && dests.every(d => d.getBoundingClientRect().height > 120);
    for (let g = 0; g < Math.max(initial, dests.length) + 4; g++) {
      const items = bankItems(bank);
      if (!items.length) break;
      let dst;
      if (bucket) dst = dests[g % dests.length];
      else dst = dests.find(d => !q('.dnditem', d));
      if (!dst) break;
      const before = bankItems(bank).length;
      await drag(items[0], dst); moves++;
      if (stopWhenDone && tn && taskDone(tn)) break;
    }
    return { did: bucket ? 'dnd_bucket' : 'dnd', moves };
  }

  async function solveSequence() {
    const box = qv('.prSeq__container');
    const items = qa('.dnditem', box).filter(vis);
    const zones = qa('.dndZone', box).filter(vis);
    if (items.length < 2) return { did: 'seq_no_items' };
    const tn = curTask()?.n;
    const src = items[0];
    const dst = zones.find(z => !z.contains(src) && z !== src) || items[1];
    await drag(src, dst);
    if (tn && !(await waitFor(() => taskDone(tn), 2500))) {
      const it2 = qa('.dnditem', box).filter(vis);
      if (it2.length > 1) await drag(it2[it2.length - 1], qa('.dndZone', box).filter(vis)[0] || it2[0]);
    }
    return { did: 'sequence' };
  }

  async function solveSelectText() {
    const ans = () => qav('.selectText.answersWrapper').map(txt).join('|');
    const isDefault = s => !s || /^(Your Answer:?\s*)?(Select Text|Selecciona.*)$/i.test(s.trim());
    const before = ans();
    const spans = qav('span.st.learning__selectTxt_st').filter(s => !/--selected/.test(s.className) && txt(s).length > 1);
    if (!spans.length) return { did: 'select_text_no_spans' };
    const picks = [0, Math.floor(spans.length / 2), spans.length - 1, 1, 2].filter((v, i, a) => v < spans.length && a.indexOf(v) === i);
    for (const i of picks) {
      const s = spans[i];
      click(s);
      const changed = await waitFor(() => { const a = ans(); return a !== before && !isDefault(a.split('|').pop()); }, 2000, 250);
      if (changed || /--selected/.test(s.className)) return { did: 'select_text', ok: true, pick: txt(s).slice(0, 30) };
    }
    return { did: 'select_text', ok: false };
  }

  async function solveMedia() {
    const b = qv('.layout__mediaPlayPause');
    if (!b) return { did: 'media_none' };
    click(b); await sleep(3000);
    const b2 = qv('.layout__mediaPlayPause'); if (b2 && /--pause|pause/i.test(b2.className)) click(b2);
    await sleep(300);
    return { did: 'media_played' };
  }

  async function solveSRChoice() {
    const st = qv('.statusWrapper a.button.continue') || qv('a.button.continue');
    if (st) click(st);
    return { did: 'sr_choice' };
  }

  async function solveInteractive() {
    const arrows = qav('a.chooseCaracterArrow');
    if (arrows[0]) { click(arrows[0]); await sleep(1300); }
    const st = await waitFor(() => { const b = qv('a.button.continue'); return b && !/disable/.test(b.parentElement?.className || '') ? b : null; }, 5000);
    if (st) click(st);
    return { did: 'interactive_speaking', started: !!st };
  }

  async function solveOpenSpeech() {
    const tn = curTask()?.n;
    const state = () => (qv('.openSpeech__AnsW')?.className || '').match(/AnsW--(\w+)/)?.[1] || '';
    if (state() === 'intro') { click(qv('.openSpeech__btnStart')); await waitFor(() => state() !== 'intro', 6000); }
    if (state() === 'prepare') { click(qv('.openSpeech__btnSkip')); }
    if (state() !== 'send' && state() !== 'sent') {
      const rec = await waitFor(() => state() === 'record', 30000, 300);
      if (!rec) return { did: 'open_speech', ok: false, state: state() };
      await sleep(CFG.recordSeconds * 1000);
      const stop = qv('.openSpeech__btnStop'); if (stop) click(stop);
      await waitFor(() => state() !== 'record', 6000, 300);
    }
    let sent = false;
    if (CFG.sendToTeacher) {
      const send = await waitFor(() => qv('.openSpeech__SentTTBtn') || qav('[class*="openSpeech__btn"], a, button').find(b => /^(send to teacher|enviar al profesor|enviar a(l)? (la )?profesor(a)?)$/i.test(txt(b))), 6000, 300);
      if (send) {
        click(send); sent = true;
        await waitFor(() => modalOpen(), 5000, 300);
        await handleModals();
      }
    }
    const done = tn ? await waitFor(() => taskDone(tn), 6000) : false;
    return { did: 'open_speech', ok: !!done, sent, state: state() };
  }

  function requiredWords() {
    const t = txt(qv('.prWriting__main') || qv('.learning__container') || document.body);
    const m = t.match(/at least\s+(\d+)\s+words|m[ií]nimo\s+(?:de\s+)?(\d+)\s+palabras|(\d+)\s*(?:-|–|to)\s*\d+\s+words/i);
    return m ? +(m[1] || m[2] || m[3]) : 0;
  }
  function buildText(min) {
    const extra = ' It shows how people can travel, learn and help nature at the same time.';
    let s = CFG.writingText;
    while (wc(s) < min) s += extra;
    return s;
  }
  async function typeTiny(ifr, text) {
    const doc = ifr.contentDocument, win = ifr.contentWindow, body = doc && doc.body;
    if (!body) return false;
    const id = ifr.id.replace(/_ifr$/, '');
    const ed = (win.tinymce && (win.tinymce.get(id) || win.tinymce.activeEditor)) || (window.tinymce && (window.tinymce.get(id) || window.tinymce.activeEditor));
    body.focus();
    if (ed) { try { ed.setContent('<p>' + text + '</p>'); ed.save && ed.save(); ed.fire && (ed.fire('change'), ed.fire('input'), ed.fire('keyup')); } catch (e) { body.innerHTML = '<p>' + text + '</p>'; } }
    else body.innerHTML = '<p>' + text + '</p>';
    for (let i = 0; i < 3; i++) {
      try {
        body.dispatchEvent(new win.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ', keyCode: 32 }));
        body.dispatchEvent(new win.InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: ' ' }));
        body.dispatchEvent(new win.KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ', keyCode: 32 }));
      } catch (e) {}
      await sleep(90);
    }
    return true;
  }
  async function solveTinyMCE() {
    const edit = qv('.prWriting__editorEditBtn');
    if (edit && !qv('.prWriting__editorSaveBtn')) { click(edit); await sleep(900); }
    const ifr = qv('iframe[id^="mce_"][id$="_ifr"]');
    const min = requiredWords();
    const text = min > wc(CFG.writingText) ? buildText(min) : CFG.writingText;
    if (ifr) {
      const have = wc(ifr.contentDocument?.body?.innerText || '');
      if (have < Math.max(3, min)) await typeTiny(ifr, text);
    }
    await sleep(500);
    const save = qv('.prWriting__editorSaveBtn');
    if (save && !/--saved/.test(save.className)) {
      click(save);
      await waitFor(() => { const s = q('.prWriting__editorSaveBtn'); return !s || !vis(s) || /--saved/.test(s.className); }, 6000);
      await handleModals();
    }
    let ai = false;
    if (CFG.useAIFeedback) {
      const btn = qv('.prWriting__action--AI');
      const triesTxt = txt(qv('.prWriting__actiontrieslabel'));
      if (btn && !/disabled/i.test(btn.className) && !/(^|\D)0\s/.test(triesTxt)) {
        const sig = () => txt(qv('.prWriting__actiontrieslabel')) + '|' + qav('[class*="prWriting__feedback"], [class*="aiFeedback"], [class*="AIFeedback"]').length;
        const s0 = sig();
        click(btn); ai = true;
        await waitFor(() => sig() !== s0, 30000, 500);
        await sleep(1000);
        await handleModals();
      }
    }
    const done = await waitFor(() => { const d = qv('.prWriting__action--submit'); return d && !/disabled/i.test(d.className) ? d : null; }, 8000);
    if (done) { click(done); await sleep(1200); await handleModals(); }
    return { did: 'tinymce', words: wc(text), ai, done: !!done };
  }

  async function solvePractice(kind) {
    switch (kind) {
      case 'open_speech': return solveOpenSpeech();
      case 'interactive_speaking': return solveInteractive();
      case 'sr_choice': return solveSRChoice();
      case 'tinymce': return solveTinyMCE();
      case 'select_text': return solveSelectText();
      case 'sequence': return solveSequence();
      case 'dnd': return solveDnD();
      case 'fitb': return solveFITB();
      case 'mcq': return solveMCQ();
      case 'text': return solveText();
      case 'media': return solveMedia();
      default: return { did: 'nothing_to_do' };
    }
  }
  const DONE_WAIT = { open_speech: 3000, interactive_speaking: 20000, sr_choice: 15000, tinymce: 8000, media: 4000 };

  // ===================================================================
  //  TESTS: COSECHA CON CALMA + NEXT + FLECHA ATRÁS + REPLAY
  // ===================================================================
  const isTestStart = () => !!qv('.btnStartTest');
  const correctTab = () => qa('a, div, span, li, button').find(el => el.children.length <= 2 && RE_CORRECT_TAB.test(txt(el)) && vis(el));
  const isReview = () => !!correctTab();
  function isScore() {
    if (qv('.TestResults') || qv('.testFeedback')) return true;
    const main = qv('.learning__container') || document.body;
    return RE_SCORE.test(txt(main).slice(0, 3000)) && !!(qv('.learning__testReviewLink') || qv('.learning__testReview'));
  }
  function scorePct() {
    const el = qv('.TestResults') || qv('.testFeedback') || qv('.learning__container') || document.body;
    const m = txt(el).match(/(\d{1,3})\s*%/);
    return m ? +m[1] : null;
  }
  const inTest = () => RE_TEST_STEP.test(stepLabel()) || !!qv('a.tasksBtnext.learning__submitTestLink');

  function readScreenAnswers() {
    const out = { mcq: [], fitb: [], dnd: [] };
    for (const s of mcqSets()) {
      const qT = questionOf(s);
      const corr = qa('.prMCQ__answers', s).filter(a => !a.classList.contains('hide') &&
        (a.classList.contains('prMCQ__answers--correct') || a.classList.contains('correct') || q('.correct', a)));
      const labels = corr.map(a => txt(q('label.prMCQ__answerLabel, .multiTextInline, label', a))).filter(Boolean);
      if (qT) out.mcq.push({ q: qT, a: labels });
    }
    out.fitb = qav('.DDLOptions__selected').map(txt);
    const m = dndModel();
    if (m) {
      const dests = qav('.dndBank').length ? m.dests : qav('.dndZone').filter(z => !(qa('.dnditem', z).length >= 2 && qav('.dndZone').length > 2));
      out.dnd = dests.map(z => ({ label: zoneLabel(z), text: txt(q('.dnditem', z)) }));
    }
    return out;
  }

  async function activateCorrectWithPatience() {
    log('⏳ Dándose su tiempito para activar y verificar la respuesta correcta...');
    for (const w of [600, 1200, 2000, 3000]) {
      const tab = correctTab();
      if (tab) { 
        click(tab); 
        await sleep(w); 
        if (q('.prMCQ__answers--correct, .multiRadio.correct, .prMCQ__answers.correct') || !qv('.prMCQ__qaInnerSet')) {
          return true; 
        }
      } else {
        await sleep(w);
      }
    }
    return false;
  }

  async function harvestReview(key) {
    log('📖 Iniciando cosecha paciente y pausada del test:', key);
    const ans = loadAns(), ans2 = loadAns2();
    ans2[key] = ans2[key] || {};
    const lbl0 = stepLabel();
    let total = counter()?.n || 10, got = 0, pending = 0;
    
    for (let loop = 0; loop < total + 2; loop++) {
      await sleep(600);
      await activateCorrectWithPatience();
      await sleep(500);

      const c = counter(); const idx = c ? c.i : loop + 1;
      if (c) total = c.n;
      const r = readScreenAnswers();
      ans2[key][idx] = r;
      
      for (const m of r.mcq) {
        if (m.a.length) { 
          ans[m.q] = m.a.length === 1 ? m.a[0] : m.a; 
          got++; 
        } else if (!ans[m.q]) { 
          ans[m.q] = '__PENDING__'; 
          pending++; 
        }
      }
      got += r.fitb.filter(Boolean).length + r.dnd.filter(x => x.text).length;
      jset(K_ANS, ans); jset(K_ANS2, ans2);
      
      log(`  📖 [Cosecha pausada] Reactivo ${idx}/${total} procesado.`, r.mcq.map(x => x.q.slice(0, 40) + ' → ' + x.a.join(' / ')).join(' · ') || '');
      
      if (idx >= total) break;
      const nx = qv('a.tasksBtnext.learning__nextItemLink');
      if (!nx) break;
      
      await sleep(1000);
      click(nx);
      await waitFor(() => (counter()?.i || 0) !== idx || stepLabel() !== lbl0, 6000, 300);
      if (stepLabel() !== lbl0) break;
    }
    addKnown(key);
    log(`✅ Cosecha pausada completada con éxito. Respuestas obtenidas: ${got} (Pendientes: ${pending}).`);
    await sleep(1500);
    return { got, pending };
  }

  function answersForSet(key, idx) {
    const ans = loadAns(), ans2 = loadAns2()[key] || {};
    return set => {
      const qT = questionOf(set);
      const v = ans[qT];
      if (v && v !== '__PENDING__') return v;
      const scr = ans2[idx];
      if (scr && scr.mcq) {
        const hit = scr.mcq.find(m => norm(m.q) === norm(qT)) || scr.mcq[mcqSets().indexOf(set)];
        if (hit && hit.a && hit.a.length) return hit.a;
      }
      return null;
    };
  }

  async function replayScreen(key) {
    const idx = counter()?.i || 1;
    const scr = (loadAns2()[key] || {})[idx] || {};
    const r = {};
    if (qv('label.prMCQ__answerLabel')) r.mcq = await solveMCQ(answersForSet(key, idx));
    if (qv('.DDLOptions__selected')) r.fitb = await solveFITB(scr.fitb && scr.fitb.length ? scr.fitb : null);
    if (qv('.dndZone') && qa('.dnditem').some(vis)) r.dnd = await solveDnD(scr.dnd && scr.dnd.length ? scr.dnd : null, false);
    return r;
  }

  async function testStep() {
    const mode = loadMode();
    let run = loadRun();

    if (isReview()) {
      const key = run?.key || testKey();
      log('📖 Review → cosechando pacientemente', key);
      const r = await harvestReview(key);
      if (!run) run = { key, lesson: key.split('||')[0], step: key.split('||')[1], attempts: 0 };
      
      // FLUJO SOLICITADO: Al terminar la revisión, va a next, luego a la siguiente lección/paso,
      // y para volver a hacer el test toca la flechita hacia atrás.
      log('✅ Cosecha terminada. Dando clic en Next, luego usando la flechita hacia atrás para volver al test y hacer el Replay...');
      await goNext();
      await sleep(1500);

      // Clic en la flechita hacia atrás (back arrow) de English Discoveries
      const backBtn = qv('a.learning__headerBack') || qv('.learning__headerBack') || qa('a, button').find(el => /back|atras|anterior|volver/i.test(el.className + ' ' + txt(el)) && vis(el));
      if (backBtn) {
        click(backBtn);
        await sleep(2500);
        await handleModals();
      }

      run.phase = 'replay'; 
      saveRun(run);
      if (mode === 'harvest') { saveRun(null); return { did: 'harvested_only', ...r }; }
      return { did: 'harvested_and_back_for_replay', ...r };
    }

    if (isScore()) {
      const key = run?.key || testKey();
      const pct = scorePct();
      if (pct != null) saveScore(key, pct);
      log('🏁 Puntaje', pct + '%', key);
      if (pct === 100 || mode === 'skip') { saveRun(null); const moved = await goNext() || await gotoNextIncomplete(); return { did: 'test_done', pct, moved: !!moved }; }
      if (run && run.attempts >= CFG.maxTestAttempts) { warn('Test sin 100 % tras', run.attempts, 'intentos — sigo'); exhausted.add(key); saveRun(null); await gotoNextIncomplete(); return { did: 'test_gave_up', pct }; }
      const rv = qv('.learning__testReviewLink') || qv('.learning__testReview a') || qv('.learning__testReview');
      saveRun(Object.assign({ key, lesson: key.split('||')[0], step: key.split('||')[1], attempts: 0 }, run || {}, { phase: 'review' }));
      if (rv) { await sleep(800); click(rv); await sleep(3000); return { did: 'opened_review', pct }; }
      return { did: 'score_no_review', pct };
    }

    if (isTestStart()) {
      const key = testKey();
      if (mode === 'skip') { const moved = await gotoNextIncomplete(); return { did: 'test_skipped', moved }; }
      const known = hasAnswers(key);
      const phase = mode === 'harvest' ? 'harvest' : mode === 'replay' ? 'replay' : (known ? 'replay' : 'harvest');
      const prev = run && run.key === key ? run.attempts || 0 : 0;
      saveRun({ key, lesson: lessonLabel(), step: stepLabel(), phase, attempts: prev + (phase === 'replay' ? 1 : 0) });
      click(qv('.btnStartTest'));
      await sleep(3000);
      return { did: 'test_started', phase };
    }

    const key = run?.key || testKey();
    const phase = run?.phase || (hasAnswers(key) ? 'replay' : 'harvest');
    const c = counter();
    let r = {};
    if (phase === 'replay') r = await replayScreen(key);
    await sleep(400);
    const ok = await goNext();
    await handleModals();
    return { did: 'test_q_' + phase, idx: c && c.s, next: ok, ...r };
  }

  // ===================================================================
  //  PASO PRINCIPAL
  // ===================================================================
  const attempts = {};
  const unsolved = new Set();
  let lastAction = '';

  function firstPendingTask() {
    const base = testKey();
    return tasks().find(t => !t.done && (attempts[base + '#' + t.n] || 0) < CFG.maxTaskAttempts) || null;
  }

  async function step() {
    if (!/learningArea/i.test(location.href) && !q('.learning__dropDownListTitleW--steps')) return { did: 'not_in_lesson' };
    if (modalOpen()) return { did: 'modals_closed', n: await handleModals() };

    const base = { lesson: lessonLabel(), step: stepLabel() };

    if (isReview() || isScore() || isTestStart() || inTest()) {
      const r = await testStep();
      return Object.assign(base, r);
    }

    const all = tasks();
    const t = curTask();
    if (!t) {
      const kind = classifyPractice();
      let r = { did: 'intro' };
      if (kind === 'media' && !all.length) r = await solveMedia();
      else if (kind !== 'none' && kind !== 'media') r = await solvePractice(kind);
      const ok = await goNext();
      return Object.assign(base, r, { kind, next: ok });
    }

    const tkey = base.lesson + '||' + base.step + '#' + t.n;
    if (t.done) {
      if (all.length && all.every(x => x.done)) {
        const isLast = t.n === Math.max(...all.map(x => x.n));
        if (isLast || all.length > 3) { const r = await gotoNextIncomplete(); if (r) return Object.assign(base, { did: 'step_complete_jump', to: r }); }
        return Object.assign(base, { did: 'done_next', task: t.n, next: await goNext() });
      }
      const p = firstPendingTask();
      if (p && p.n !== t.n) { await gotoTask(p.n); return Object.assign(base, { did: 'jump_to_task', task: p.n }); }
      return Object.assign(base, { did: 'done_next', task: t.n, next: await goNext() });
    }

    attempts[tkey] = (attempts[tkey] || 0) + 1;
    const kind = classifyPractice();
    log(`🧩 Tarea ${t.n}/${all.length} → ${kind} (intento ${attempts[tkey]})`);
    let r;
    try { r = await solvePractice(kind); } catch (e) { r = { did: 'error', err: e.message }; }
    const done = await waitFor(() => taskDone(t.n), DONE_WAIT[kind] || 3500, 300);
    if (!done) {
      if (attempts[tkey] < CFG.maxTaskAttempts && kind !== 'none') return Object.assign(base, r, { kind, task: t.n, ok: false, retry: true });
      unsolved.add(tkey + ' [' + kind + ']');
      warn('⚠ Tarea sin marcar:', tkey, kind, '→ sigo');
    }
    const p = firstPendingTask();
    if (p && p.n !== t.n) { await gotoTask(p.n); return Object.assign(base, r, { kind, task: t.n, ok: !!done, then: 'task ' + p.n }); }
    const ok = await goNext();
    return Object.assign(base, r, { kind, task: t.n, ok: !!done, next: ok });
  }

  // ===================================================================
  //  API
  // ===================================================================
  let hud = null;
  const api = {
    _v: V, _running: false, _iter: 0,
    async auto(ms) {
      if (this._running) return log('ya está corriendo');
      this._running = true; this._iter = 0;
      const wait = ms || CFG.tickMs;
      let lastSig = '', same = 0, jumps = 0;
      log('🚀 auto — modo', loadMode());
      while (this._running && this._iter < CFG.maxIterations) {
        this._iter++;
        let r;
        try { r = await step(); } catch (e) { r = { did: 'exception', err: e.message }; warn(e); }
        lastAction = r.did + (r.kind ? ' · ' + r.kind : '');
        log('#' + this._iter, r);
        hud && hud.render();
        if (r.did === 'not_in_lesson') { warn('No estás dentro de una lección'); break; }
        const sig = [r.lesson, r.step, curTask()?.n, counter()?.s, r.did].join('|');
        if (sig === lastSig) {
          if (++same >= 4) {
            warn('🛑 atascado en', sig, '→ busco lo siguiente pendiente');
            exhausted.add(testKey());
            const moved = await gotoNextIncomplete();
            same = 0;
            if (!moved || ++jumps > 6) { warn('No encuentro nada más que hacer.'); break; }
          }
        } else { same = 0; lastSig = sig; }
        if (r.did === 'step_complete_jump' || r.did === 'test_done') jumps = 0;
        if (r.did === 'done_next' && r.next === false) {
          const moved = await gotoNextIncomplete();
          if (!moved) { log('🎉 No queda nada pendiente en esta unidad.'); break; }
        }
        await sleep(wait);
      }
      this._running = false;
      log('⏸ detenido tras', this._iter, 'pasos.');
      hud && hud.render();
    },
    stop() { this._running = false; log('⏸ stop pedido'); hud && hud.render(); },
    async step() { const r = await step(); lastAction = r.did; hud && hud.render(); return r; },
    async sweep() { const r = await gotoNextIncomplete(); log('➡ sweep:', r || 'nada pendiente'); if (r) this.auto(); return r; },
    gotoNextIncomplete, gotoLesson, gotoStep, gotoTask,
    setMode(m) { if (!['auto', 'skip', 'harvest', 'replay'].includes(m)) return warn('modos: auto | skip | harvest | replay'); localStorage.setItem(K_MODE, m); log('modo:', m); hud && hud.render(); },
    mode: loadMode,
    setSpeed(ms) { this.cfg({ tickMs: Math.max(300, +ms || 1200) }); },
    cfg(o) { if (o) { CFG = Object.assign({}, CFG, o); jset(K_CFG, CFG); } return CFG; },
    answers: loadAns, testAnswers: loadAns2, knownTests: loadKnown, scores: loadScores,
    status() {
      return {
        version: V, running: this._running, mode: loadMode(), lesson: lessonLabel(), step: stepLabel(),
        tasks: tasks().map(t => t.n + (t.done ? '✓' : '·') + (t.cur ? '*' : '')).join(' '), kind: this.kind(), counter: counter()?.s,
        answers: Object.keys(loadAns()).length, knownTests: loadKnown().length, scores: loadScores()
      };
    },
    kind() { if (modalOpen()) return 'modal'; if (isReview()) return 'test_review'; if (isScore()) return 'test_score'; if (isTestStart()) return 'test_start'; if (inTest()) return 'test_question'; return classifyPractice(); },
    help() {
      console.log('Comandos: __ed.auto(), __ed.stop(), __ed.step(), __ed.sweep(), __ed.status()');
    }
  };
  window.__ed = api;

  window.addEventListener('keydown', e => {
    if ((e.ctrlKey && e.shiftKey && e.code === 'KeyE') || (e.altKey && e.code === 'KeyE')) {
      e.preventDefault();
      api._running ? api.stop() : api.auto();
    }
  });

  class HUD {
    constructor() {
      this.min = false;
      this.el = document.createElement('div');
      this.el.id = 'ed-autopilot-hud';
      Object.assign(this.el.style, { position: 'fixed', bottom: '70px', right: '14px', width: '270px', background: 'rgba(20,26,38,.95)', color: '#f1f2f6', borderRadius: '10px', border: '1px solid rgba(255,255,255,.15)', boxShadow: '0 10px 30px rgba(0,0,0,.45)', zIndex: 999999, font: '12px Segoe UI,system-ui,sans-serif', padding: '10px', userSelect: 'none' });
      document.body.appendChild(this.el);
      this.render();
      setInterval(() => { if (!this.min) this.render(); }, 2500);
    }
    render() {
      const run = api._running;
      const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${run ? '#2ecc71' : '#e74c3c'}"></span>`;
      if (this.min) { this.el.innerHTML = `<div id="edx" style="cursor:pointer">${dot} ED-Bot v17.3 <span style="color:#95a5a6">[abrir]</span></div>`; this.el.querySelector('#edx').onclick = () => { this.min = false; this.render(); }; return; }
      const esc = s => String(s || '').replace(/[<>&]/g, c => ({ '<': '<', '>': '>', '&': '&' }[c]));
      const row = (k, v) => `<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#a4b0be">${k}</span><span style="text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(v)}</span></div>`;
      this.el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b>${dot} ED-Autopilot v17.3</b><span id="edm" style="cursor:pointer;color:#95a5a6">−</span></div>
        ${row('Lección', lessonLabel() || '—')}${row('Step', stepLabel() || '—')}
        ${row('Pantalla', api.kind())}${row('Última acción', lastAction || '—')}
        ${row('Tests cosechados', loadKnown().length)}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:8px">
          <button id="edt" style="background:${run ? '#eb4d4b' : '#2ecc71'};color:#fff;border:0;border-radius:6px;padding:5px;cursor:pointer">${run ? '⏸ Parar' : '▶ Auto'}</button>
          <button id="eds" style="background:#4b6584;color:#fff;border:0;border-radius:6px;padding:5px;cursor:pointer">⏭ Paso</button>
          <button id="edw" style="background:#e1a43a;color:#fff;border:0;border-radius:6px;padding:5px;cursor:pointer">➡ Pendiente</button>
        </div>`;
      this.el.querySelector('#edm').onclick = () => { this.min = true; this.render(); };
      this.el.querySelector('#edt').onclick = () => { api._running ? api.stop() : api.auto(); setTimeout(() => this.render(), 200); };
      this.el.querySelector('#eds').onclick = () => api.step();
      this.el.querySelector('#edw').onclick = () => api.sweep();
    }
  }
  try { hud = new HUD(); } catch (e) { warn('HUD no disponible:', e.message); }

  log('✅ ED-Autopilot v17.3 instalado → __ed.auto() para arrancar o presiona Alt+E');
})();