/* =====================================================================
   ED-Autopilot v20.7  —  ARCHIVO GENERADO, NO LO EDITES A MANO
   ---------------------------------------------------------------------
   Fuente: src/ del repo github.com/hugozuniga770/Bot-Ingles  →  node build.js
   Pégalo en la consola (F12) de English Discoveries y luego: __ed.auto()
   Comandos: __ed.help()  ·  Diagnóstico: __ed.inspect()
   ===================================================================== */
(() => {
  'use strict';
  // ▼▼▼ src/bootstrap.js ▼▼▼
  // =====================================================================
  //  BOOTSTRAP — versión y limpieza de instalaciones anteriores
  // ---------------------------------------------------------------------
  //  Si ya hay una versión del bot cargada en la pestaña, la detiene y borra su HUD
  //  antes de instalar esta. Si es la MISMA versión, no hace nada.
  //  DEPENDE DE: nada (es lo primero que se ejecuta)
  //  EXPONE:     V
  // =====================================================================

  const V = '20.7';   // ← ÚNICO lugar donde se cambia la versión
  if (window.__ed && window.__ed._v === V) { console.log('%c[ED]', 'color:#27ae61', 'v' + V + ' ya instalado → __ed.help()'); return; }
  try { window.__ed && window.__ed.stop && window.__ed.stop(); } catch (e) {}
  try { clearInterval(window.__ed && window.__ed._hudTimer); } catch (e) {}
  try { document.getElementById('ed-autopilot-hud')?.remove(); } catch (e) {}
  try {
    document.querySelectorAll('body > div').forEach(d => {
      if (d.style && d.style.position === 'fixed' && /^ED v\d+\.\d+ OOP/.test(d.textContent || '')) d.remove();
    });
  } catch (e) {}

  // ▼▼▼ src/core/config.js ▼▼▼
  // =====================================================================
  //  CONFIG — configuración, claves de localStorage y expresiones regulares
  // ---------------------------------------------------------------------
  //  Valores por defecto + lo que guardaste con __ed.cfg({...}).
  //  Las claves de localStorage NO se cambian: así conservas respuestas cosechadas.
  //  DEPENDE DE: nada
  //  EXPONE:     CFG, K_*, RE_*
  // =====================================================================

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
    tickMs: 700,               // AJUSTADA v20.7: era 1200 (las esperas ahora son "hasta que cambie la pantalla")
    maxIterations: 1500,
    correctTabSelector: '',
    retakeAfterReview: true,   // NUEVO: tras cosechar el review, usar la flechita atrás para reabrir el test
    solveWithoutTaskNav: true, // NUEVO: resolver ejercicios aunque no haya navegador de tareas (como v17)
    stopIfNot100: true,        // NUEVO v20.1: si tras maxTestAttempts no llega a 100 % → DETENERSE y avisar
    harvestPause: 600,         // RECUPERADO v20.2 (v17.1/17.3): pausa extra antes de leer el review en pantallas no-MCQ
    testExpress: true,         // NUEVO v20.7: 1.er intento del test (sin respuestas) → directo al Submit, sin resolver
    practiceOneAction: true,   // NUEVO v20.7: en prácticas, UNA acción; si ED no marca la tarea como hecha, completa todo
    cfgV: 2                    // versión de la config (para migrar valores viejos guardados)
  }, (() => { try { return JSON.parse(localStorage.getItem(K_CFG) || '{}'); } catch (e) { return {}; } })());
  // NUEVO v20.7: __ed.cfg() guardaba TODA la config, incluido tickMs: 1200. Se migra una vez al nuevo valor.
  if (!(CFG.cfgV >= 2)) { if (CFG.tickMs === 1200) CFG.tickMs = 700; CFG.cfgV = 2; }

  const K_ANS = 'ed:answers:v1';
  const K_ANS2 = 'ed:testAns:v2';
  const K_KNOWN = 'ed:testKnown:v1';
  const K_SCORES = 'ed:testScores:v1';
  const K_RUN = 'ed:testRun:v1';

  const RE_SCORE = /(Your test score|Your score|test score is|calificaci[oó]n|puntaje)/i;
  // AJUSTADA v20.1 (fix de v18.12 que estaba en v19.8): "no ha respondido" — antes decía "no ha responder"
  const RE_SUBMIT_POPUP = /(haven'?t answered|submit the test|no ha respond(?:ido|er)|no respondiste|enviar la prueba)/i;
  // RECUPERADAS de v17 (v20.1): ítems de los desplegables y botón para repetir un test
  const RE_TEST_ITEM = /^\d+\.\s*(Test|Prueba|Examen|Let'?s review|Review|Repasemos|Repaso|Repase)\b/i;
  const RE_ST_DONE = /(Completed|Completad[oa]|Terminad[oa]|\b100\s*%)\s*$/i;   // "100 %" es NUEVO (sin confirmar en ED)
  const RE_RETAKE = /^(Retake( Test)?|Try again|Start again|Start Test|Reintentar|Volver a (intentar|hacer)|Comenzar prueba)$/i;
  const RE_DONE = /(Completed|Completad[oa]|Terminad[oa]|Finalizad[oa])/i;
  // NUEVO (de v17): etiqueta de step que corresponde a un test
  const RE_TEST_STEP = /^(?:Step|Paso)\s*\d+\s*:\s*(Test|Prueba|Examen|Let'?s review|Review|Repasemos|Repaso|Repase)\s*$/i;

  const RE_TAB_CORRECT = /^\W*(correct\s*answers?|respuestas?\s*correctas?)(\s*\(?\d+\)?)?\W*$/i;
  const RE_TAB_YOURS = /^\W*(your\s*answers?|(tus?|su|mis)\s*respuestas?)(\s*\(?\d+\)?)?\W*$/i;
  const RE_ACTIVE = /(?<!(?:in|un|non|not)[-_]?)(active|current|selected|checked|chosen)/i;

  // ▼▼▼ src/utils/dom.js ▼▼▼
  // =====================================================================
  //  DOM — utilidades para leer y tocar la página
  // ---------------------------------------------------------------------
  //  Selectores cortos (q, qa, qv, qav), visibilidad (vis), texto (txt, norm, wc),
  //  esperas (sleep, waitFor) y clics (click, clickInFrame, setNative).
  //  DEPENDE DE: nada
  //  EXPONE:     sleep q qa txt norm vis qv qav wc mcqQuestionText waitFor click clickInFrame setNative
  // =====================================================================

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


  // AJUSTADA v20.1 — RECUPERADA de v17 (questionOf, venía en v19.8): si el texto de la pregunta NO está
  // dentro del set, usa la pregunta que aparece justo antes en la página. Si está dentro → igual que antes.
  const mcqQuestionText = set => {
    const own = q('.prMCQ__questionText, .prMCQ__questionW, .prMCQ__question', set);
    if (own && txt(own)) return txt(own);
    const all = qav('.prMCQ__questionText, .prMCQ__questionW, .prMCQ__question');
    let best = null;
    for (const e of all) if (e.compareDocumentPosition(set) & Node.DOCUMENT_POSITION_FOLLOWING) best = e;
    return txt(best || all[0]);
  };

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

  // ▼▼▼ src/utils/logger.js ▼▼▼
  // =====================================================================
  //  LOGGER — mensajes en consola
  // ---------------------------------------------------------------------
  //  log (verde), warn (naranja), errLog (rojo).
  //  DEPENDE DE: V
  //  EXPONE:     log, warn, errLog
  // =====================================================================

  const log = (...a) => console.log('%c[ED v' + V + ']', 'color:#27ae61;font-weight:bold', ...a);
  const warn = (...a) => console.warn('%c[ED v' + V + ']', 'color:#e67e22;font-weight:bold', ...a);
  const errLog = (...a) => { console.error('%c[ED ERROR]', 'color:#c0392b;font-weight:bold', ...a); };

  // ▼▼▼ src/utils/drag.js ▼▼▼
  // =====================================================================
  //  MOTOR DE ARRASTRE + MODELO DnD (de v17, sin cambios)
  // ---------------------------------------------------------------------
  //  drag(src, dst) simula pointer/mouse down → move ×12 → up.
  //  dndModel() separa el "banco" (de donde salen los elementos) de los "dests" (huecos).
  //  Lo usan: exercises/sequence.js, exercises/dnd.js y tests/test-manager.js.
  //  DEPENDE DE: utils/dom.js
  //  EXPONE:     fire dropPoint drag dndModel bankItems zoneLabel
  //  OJO: este motor es igual en TODAS las versiones (v17→v19.7). Si el DnD falla,
  //  el problema casi seguro está en quién lo llama, no aquí.
  // =====================================================================

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

  // ▼▼▼ src/utils/scroll.js ▼▼▼
  // =====================================================================
  //  SCROLL DENTRO DE CAJAS — cajas con barra propia de ED (mCustomScrollbar)
  // ---------------------------------------------------------------------
  //  NUEVO v20.2. En algunas preguntas (ej. el e-mail para completar) el texto está en una
  //  caja con scroll propio: las fichas/huecos de abajo existen pero están TAPADOS, y el
  //  motor de arrastre (que solo mira la ventana) soltaba encima de otra cosa.
  //  revealInBox(el): 1) API de mCustomScrollbar (jQuery) → 2) scrollIntoView como respaldo.
  //  Lo usa: DnDSolver.placeDndMapping (replay de tests). El DnD de práctica NO lo usa todavía.
  //  DEPENDE DE: utils/dom.js
  //  EXPONE:     revealInBox
  // =====================================================================

  async function revealInBox(el) {
    if (!el || !el.closest) return false;
    const box = el.closest('.mCustomScrollbar');
    const visibleEnCaja = () => {
      const area = box ? (box.querySelector('.mCustomScrollBox') || box).getBoundingClientRect() : { top: 0, bottom: innerHeight };
      const r = el.getBoundingClientRect();
      return r.top >= area.top - 2 && r.bottom <= area.bottom + 2 && r.top >= 0 && r.bottom <= innerHeight;
    };
    if (visibleEnCaja()) return true;
    if (box && window.jQuery && window.jQuery.fn && window.jQuery.fn.mCustomScrollbar) {
      try { window.jQuery(box).mCustomScrollbar('scrollTo', el, { scrollInertia: 0, timeout: 0 }); } catch (e) {}
      await sleep(400);
      if (visibleEnCaja()) return true;
    }
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
    await sleep(250);
    return visibleEnCaja();
  }

  // ▼▼▼ src/utils/dnd-model.js ▼▼▼
  // =====================================================================
  //  MODELO DnD PARA TESTS — quién es el "banco" y quiénes los huecos
  // ---------------------------------------------------------------------
  //  NUEVO v20.3. dndModel() (utils/drag.js, de v17) adivina el banco como "la zona con MÁS fichas".
  //  En el Review con "Respuesta correcta" eso FALLA en la clasificación (True / False):
  //  las fichas están repartidas en las columnas y el banco quedó vacío → el bot tomaba la
  //  columna "True" como banco y no cosechaba nada (confirmado con dump, Lesson 2 · Step 5 · 5/6).
  //  Regla nueva (sin .dndBank): las columnas de respuesta tienen encabezado (.containerHeader)
  //  y el banco NO → si exactamente una zona no tiene encabezado, esa es el banco.
  //  Si la regla no aplica, devuelve EXACTAMENTE lo mismo que dndModel().
  //  Lo usan: TestManager.readDnd / answersShown, DnDSolver.placeDndMapping, __ed.dragTest().
  //  NO lo usa el DnD de práctica (solveDragAndDrop sigue con dndModel).
  //  DEPENDE DE: utils/dom.js, utils/drag.js
  //  EXPONE:     testDndModel
  // =====================================================================

  function testDndModel() {
    const zones = qav('.dndZone');
    if (!zones.length) return null;
    if (qav('.dndBank').length) return dndModel();
    const header = z => { const c = z.closest('[class*="__container"]'); return !!(c && q('.containerHeader', c)); };
    const conTitulo = zones.filter(header);
    const sinTitulo = zones.filter(z => !header(z));
    if (conTitulo.length && sinTitulo.length === 1) {
      const bank = sinTitulo[0];
      return { bank, dests: zones.filter(z => z !== bank && !bank.contains(z) && !z.contains(bank)), byHeader: true };
    }
    return dndModel();
  }

  // ▼▼▼ src/utils/practice.js ▼▼▼
  // =====================================================================
  //  PRÁCTICAS — "con UNA acción basta"
  // ---------------------------------------------------------------------
  //  NUEVO v20.7. En las prácticas ED marca la tarea como hecha apenas haces UNA acción
  //  (una ficha, un desplegable, una casilla...). practiceEnough(tn) se llama después de la
  //  1.ª acción: si ED ya marcó la tarea (máx. 1,5 s) → el solver se detiene ahí.
  //  Si NO la marcó → devuelve false y el solver sigue como antes (completa todo). Blindado.
  //  Nunca se activa en tests (ahí cada respuesta cuenta).
  //  Apagar: __ed.cfg({ practiceOneAction: false })
  //  DEPENDE DE: core/config.js, core/navigation.js, tests/test-manager.js (en tiempo de ejecución)
  //  EXPONE:     practiceEnough
  // =====================================================================

  async function practiceEnough(tn) {
    if (!CFG.practiceOneAction || !tn) return false;
    try { if (TestManager.inTest()) return false; } catch (e) { return false; }
    return !!(await waitFor(() => NavigationManager.taskDone(tn), 1500, 200));
  }

  // ▼▼▼ src/core/storage.js ▼▼▼
  // =====================================================================
  //  STORAGE — respuestas cosechadas, puntajes y estado del test en curso
  // ---------------------------------------------------------------------
  //  Todo vive en localStorage (sobrevive a recargar la página).
  //  DEPENDE DE: core/config.js
  //  EXPONE:     StorageManager
  // =====================================================================

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

  // ▼▼▼ src/core/navigation.js ▼▼▼
  // =====================================================================
  //  NAVEGACIÓN — lección/step actual, navegador de tareas, Next y popups
  // ---------------------------------------------------------------------
  //  handleModals() cierra popups (iframe colorbox + Bootstrap).
  //  goNext() pulsa Next/Submit y vuelve a cerrar popups.
  //  DEPENDE DE: utils/dom.js, core/config.js
  //  EXPONE:     NavigationManager
  // =====================================================================

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
        if (!b) b = d.querySelector('a.utils__cancelLInk');      // RECUPERADA de v17: "Reminder" → Continue (NO "Stay")
        if (!b) b = d.querySelector('input.okButton, a.okButton');
        if (!b) break;
        clickInFrame(b); handled = true;
        // AJUSTADA v20.7: antes 1,5 s fijos; ahora hasta que el popup se cierre (mismo tope) + respiro
        await waitFor(() => !qa('iframe#colorBoxIframe, iframe[id*="colorBox"]').some(x => x.getBoundingClientRect().height > 50), 1500, 150);
        await sleep(300);
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

    // NUEVA v20.7: "foto" de la pantalla (lección, step, contador, tarea actual) para saber si ya cambió
    static screenSig() { const c = this.counter(), t = this.curTask(); return [this.lessonLabel(), this.stepLabel(), c && c.s, t && t.n].join('|'); }
    static modalOpen() {
      return qa('iframe#colorBoxIframe, iframe[id*="colorBox"]').some(x => x.getBoundingClientRect().height > 50) ||
        qa('.modalW_confirm, .modalW_alert, #alertModal, .confirmPopup__main').some(vis);
    }

    static async goNext() {
      await this.handleModals();
      const nx = this.nextBtn();
      if (!nx) return false;
      const isSubmit = /submitTest|submit/i.test(nx.className || '') || /submitTest|submit/i.test(nx.parentElement?.className || '') || /submit/i.test(txt(nx));
      const sig = this.screenSig();
      click(nx);
      // AJUSTADA v20.7: antes espera FIJA de 1,8 s (2,5 s en Submit). Ahora espera solo hasta que la
      // pantalla cambie o aparezca un popup (mismo tope), + un respiro corto para que termine de dibujarse.
      const cambio = await waitFor(() => this.screenSig() !== sig || this.modalOpen(), isSubmit ? 2500 : 1800, 150);
      if (cambio) await sleep(isSubmit ? 700 : 350);
      await this.handleModals();
      return true;
    }
  }

  // ▼▼▼ src/core/dropdowns.js ▼▼▼
  // =====================================================================
  //  DESPLEGABLES — ir a una lección / step / tarea, y "ir a lo que falta"
  // ---------------------------------------------------------------------
  //  RECUPERADO de v17 (v20.1). Usa los dos menús de arriba:
  //  "Lesson 4: …" (lecciones) y "Step 3: Prueba" (steps).
  //  Lo usan: TestManager.reopenTest() (volver al test tras el review) y
  //  los comandos de consola __ed.sweep() / gotoLesson() / gotoStep() / gotoTask().
  //  OJO: el bucle auto() TODAVÍA no salta solo a lo pendiente (eso es el grupo 2).
  //  DEPENDE DE: utils/dom.js, core/config.js, core/storage.js, core/navigation.js
  //  EXPONE:     DropdownNav, lessonNum, stepNum
  // =====================================================================

  const lessonNum = l => (String(l).match(/(?:Lesson|Lecci[oó]n)\s*(\d+)/i) || [])[1] || null;
  const stepNum = s => (String(s).match(/(?:Step|Paso)\s*(\d+)/i) || [])[1] || null;

  class DropdownNav {
    // Las dos listas están siempre en el DOM → se filtra por contenedor
    static items(which) {
      const sel = which === 'lessons'
        ? '.learning__dropDownListW--lessons .learning__dropDownList_item'
        : '.learning__dropDownListW--steps .learning__dropDownList_item';
      return qa(sel).map(e => ({ el: e, t: txt(e), cur: /--current/.test(e.className) }));
    }

    static async open(which) {
      const d = q(which === 'lessons' ? '.learning__dropDownListTitleW--lessons' : '.learning__dropDownListTitleW--steps');
      if (!d) return null;
      click(d); await sleep(800);
      return d;
    }

    static async close(d) { if (d && d.closest('[class*="--open"], [class*="--active"]')) { click(d); await sleep(300); } }

    // PARA QUÉ: abre el desplegable de lecciones y entra a la lección número n.
    static async gotoLesson(n) {
      const d = await this.open('lessons'); if (!d) return false;
      const it = this.items('lessons').find(x => new RegExp('^' + n + '\\s*\\.').test(x.t));
      if (!it) { await this.close(d); return false; }
      click(it.el); await sleep(4500); await NavigationManager.handleModals();
      return true;
    }

    // PARA QUÉ: entra a un step por número (3), por regex o por etiqueta ("Step 3: Prueba").
    static async gotoStep(match) {
      const d = await this.open('steps'); if (!d) return false;
      const items = this.items('steps').filter(x => /^\d+\s*\./.test(x.t));
      let it = null;
      if (typeof match === 'number') it = items.find(x => new RegExp('^' + match + '\\s*\\.').test(x.t));
      else if (match instanceof RegExp) it = items.find(x => match.test(x.t));
      else { const n = stepNum(match); it = n ? items.find(x => new RegExp('^' + n + '\\s*\\.').test(x.t)) : null; }
      if (!it) { await this.close(d); return false; }
      click(it.el); await sleep(4000); await NavigationManager.handleModals();
      return true;
    }

    // PARA QUÉ: salta a la tarea n del navegador de tareas (los numeritos 1 2 3…).
    static async gotoTask(n) {
      const t = NavigationManager.tasks().find(x => x.n === n);
      if (!t) return false;
      click(q('a', t.el) || t.el);
      return !!(await waitFor(() => NavigationManager.curTask()?.n === n, 6000, 300));
    }

    static firstPendingTask() { return NavigationManager.tasks().find(t => !t.done) || null; }

    static stepItemName(t) {
      return t.replace(/^\d+\s*\.(\s*)/, '').replace(/\s*(Not Started|In Progress|Completed|No ha empezado|No iniciad[oa]|En progreso|En curso|Completad[oa]|Terminad[oa]|\d{1,3}\s*%)\s*$/i, '').trim();
    }

    // ¿Este step del desplegable está pendiente? (los tests con puntaje < 100 cuentan como pendientes)
    static stepPending(lessonLbl, itemText) {
      const n = (itemText.match(/^(\d+)/) || [])[1];
      const key = lessonLbl + '||Step ' + n + ': ' + this.stepItemName(itemText);
      if (RE_TEST_ITEM.test(itemText)) {
        const sc = StorageManager.getScores()[key];
        if (sc === 100) return false;
        if (sc != null && sc < 100) return true;
      }
      return !RE_ST_DONE.test(itemText);
    }

    // PARA QUÉ: va a lo primero pendiente: 1) otro step de esta lección, 2) otra lección de la unidad.
    // Devuelve 'task' | 'step' | 'lesson' | null (null = no queda nada).
    static async gotoNextIncomplete() {
      let d = await this.open('steps');
      if (d) {
        const items = this.items('steps').filter(x => /^\d+\s*\./.test(x.t));
        const it = items.find(x => this.stepPending(NavigationManager.lessonLabel(), x.t));
        if (it) {
          if (it.cur && NavigationManager.curTask()) {
            await this.close(d);
            const t = this.firstPendingTask();
            if (t) { await this.gotoTask(t.n); return 'task'; }
          } else { click(it.el); await sleep(4000); await NavigationManager.handleModals(); return 'step'; }
        } else await this.close(d);
      }
      d = await this.open('lessons');
      if (!d) return null;
      const ls = this.items('lessons').filter(x => /^\d+\s*\./.test(x.t));
      const target = ls.find(x => !x.cur && !RE_ST_DONE.test(x.t)) ||
        ls.find(x => !x.cur && Object.entries(StorageManager.getScores()).some(([k, v]) => v < 100 && lessonNum(k) === (x.t.match(/^(\d+)/) || [])[1]));
      if (!target) { await this.close(d); return null; }
      click(target.el); await sleep(4500); await NavigationManager.handleModals();
      d = await this.open('steps');
      if (d) {
        const it = this.items('steps').filter(x => /^\d+\s*\./.test(x.t)).find(x => this.stepPending(NavigationManager.lessonLabel(), x.t));
        if (it && !it.cur) { click(it.el); await sleep(4000); await NavigationManager.handleModals(); } else await this.close(d);
      }
      return 'lesson';
    }

    // DIAGNÓSTICO: qué texto tiene cada ítem de los desplegables (para confirmar cómo marca ED lo terminado)
    static dump() {
      const out = { lecciones: this.items('lessons').map(x => (x.cur ? '* ' : '  ') + x.t), steps: this.items('steps').map(x => (x.cur ? '* ' : '  ') + x.t) };
      console.log('%c[ED desplegables]', 'color:#3498db;font-weight:bold', out);
      return out;
    }
  }

  // ▼▼▼ src/exercises/writing.js ▼▼▼
  // =====================================================================
  //  WRITING — TinyMCE + AI Feedback
  // ---------------------------------------------------------------------
  //  Tipo(s) en detectKind(): writing
  //  Se detecta por: iframe[id^="mce_"][id$="_ifr"]
  //  CONGELADO — funciona, no tocar.
  //  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
  //  EXPONE:     WritingSolver (se une a PracticeSolver en exercises/index.js)
  // =====================================================================

  class WritingSolver {
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
  }

  // ▼▼▼ src/exercises/select-text.js ▼▼▼
  // =====================================================================
  //  SELECT TEXT — subrayar fragmentos
  // ---------------------------------------------------------------------
  //  Tipo(s) en detectKind(): select_text
  //  Se detecta por: span.st.learning__selectTxt_st
  //  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
  //  EXPONE:     SelectTextSolver (se une a PracticeSolver en exercises/index.js)
  // =====================================================================

  class SelectTextSolver {
    // ---------------------------------------------------------------
    // SELECT TEXT (subrayar texto)                             [IGUAL]
    // PARA QUÉ: hace clic en los fragmentos subrayables.
    // ---------------------------------------------------------------
    static async solveSelectText() {
      log('🔍 [Select Text] Subrayando oraciones clave...');
      const spans = qav('span.st.learning__selectTxt_st').filter(s => !/--selected/.test(s.className) && txt(s).length > 1);
      if (!spans.length) return { did: 'select_text_no_spans' };
      let selectedCount = 0;
      const tn = NavigationManager.curTask()?.n;
      for (const s of spans) {
        click(s); await sleep(400);
        if (/--selected/.test(s.className)) selectedCount++;
        if (selectedCount === 1 && await practiceEnough(tn)) break;   // NUEVO v20.7: con uno basta
      }
      return { did: 'select_text_solved', selectedCount };
    }
  }

  // ▼▼▼ src/exercises/sequence.js ▼▼▼
  // =====================================================================
  //  SEQUENCE — ordenar pasos (prSeq)
  // ---------------------------------------------------------------------
  //  Tipo(s) en detectKind(): sequence
  //  Se detecta por: .prSeq__container
  //  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
  //  EXPONE:     SequenceSolver (se une a PracticeSolver en exercises/index.js)
  // =====================================================================

  class SequenceSolver {
    // ---------------------------------------------------------------
    // ORDENAR / SECUENCIA (.prSeq__container)                  [AJUSTADA]
    // PARA QUÉ: reordena arrastrando elementos.
    // Intentos 1 y 2 = EXACTAMENTE los de v19.5 (los que ya te funcionaban).
    // Intentos 3 y 4 = NUEVOS, solo se usan si el navegador de tareas sigue sin marcar la tarea.
    // Sin navegador de tareas (tn indefinido) hace UN arrastre, igual que antes.
    // ---------------------------------------------------------------
    static async solveSequence() {
      log('🔢 [Sequence / Ordering] Ordenando pasos secuenciales...');
      // AJUSTADA v20.7: antes box = el PRIMER .prSeq__container; en el diseño nuevo cada recuadro tiene
      // 1 sola ficha → "seq_no_items" y no ordenaba (dump: Lesson 1 · Step 2: Practice · 2/2).
      const box = qv('.prSeq__main') || qv('.prSeq__mainIW') || qv('.prSeq__container');
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
    // SECUENCIA EN TESTS (replay)                               [NUEVA v20.4]
    // PARA QUÉ: deja las fichas en el orden cosechado del review ("Respuesta correcta").
    // En ordenar NO hay banco: cada hueco (.sequenceZone) ya tiene una ficha, hay que intercambiarlas.
    // Método: de izquierda a derecha, si en la posición i no está la ficha correcta, se arrastra
    // la correcta encima del hueco i y se RELEE el orden (sirve tanto si ED intercambia como si
    // inserta: las posiciones ya colocadas no se mueven). Hasta 2 intentos por posición.
    // ---------------------------------------------------------------
    static isSequenceScreen() { return !!(qv('.prSeq__main') || qv('.sequenceZone')); }

    static seqZones() {
      const z = qav('.sequenceZone.dndZone');
      return z.length ? z : qav('.dndZone').filter(e => e.closest('.prSeq__main, .prSeq__container'));
    }

    static seqOrder() { return this.seqZones().map(z => txt(q('.dnditem', z))); }

    static async placeSequence(wanted) {
      log('🔢 [Sequence test] Ordenando según lo cosechado...');
      const W = (wanted || []).map(norm);
      let moves = 0;
      for (let i = 0; i < W.length; i++) {
        for (let intento = 0; intento < 2; intento++) {
          const zs = this.seqZones();
          const cur = zs.map(z => norm(txt(q('.dnditem', z))));
          if (cur[i] === W[i]) break;
          const j = cur.indexOf(W[i]);
          if (j < 0 || !zs[i]) break;
          const src = q('.dnditem', zs[j]);
          const dst = intento === 0 ? zs[i] : (q('.dnditem', zs[i]) || zs[i]);   // 2.º intento: soltar sobre la ficha
          await revealInBox(dst); await revealInBox(src);
          await drag(src, dst); moves++;
          await sleep(300);
        }
      }
      const final = this.seqOrder().map(norm);
      const ok = W.length > 0 && W.every((w, k) => final[k] === w);
      if (!ok) warn('Secuencia: no quedó en el orden cosechado', { esperado: wanted, quedó: this.seqOrder() });
      return { did: 'seq_replay', moves, ok };
    }
  }

  // ▼▼▼ src/exercises/dnd.js ▼▼▼
  // =====================================================================
  //  DRAG & DROP — "Drag here", columnas y replay de tests
  // ---------------------------------------------------------------------
  //  Tipo(s) en detectKind(): dnd
  //  Se detecta por: .dndZone + .dnditem visibles
  //  PENDIENTE: en TESTS no siempre coloca bien (ver docs/pendientes.md).
  //  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
  //  EXPONE:     DnDSolver (se une a PracticeSolver en exercises/index.js)
  // =====================================================================

  class DnDSolver {
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
        if (moves === 1 && await practiceEnough(tn)) return { did: 'dnd_one_action', moves };   // NUEVO v20.7
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
      let m = testDndModel();   // AJUSTADA v20.3 (antes dndModel): mismo banco/huecos que en la cosecha
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
          if (!m.bank.isConnected || m.dests.some(d => !d.isConnected)) m = testDndModel() || m;
          const dst = m.dests[i];
          if (!dst) break;
          const it = bankItems(m.bank).find(x => norm(txt(x)) === norm(w));
          // AJUSTADA v20.2: si el hueco o la ficha están dentro de una caja con scroll propio (cloze del
          // e-mail, etc.), primero se desplaza esa caja; si no, el arrastre soltaba sobre algo tapado.
          if (it) { await revealInBox(dst); await revealInBox(it); await drag(it, dst); moves++; }
        }
      }
      return { did: 'dnd_replay', moves };
    }
  }

  // ▼▼▼ src/exercises/mcq.js ▼▼▼
  // =====================================================================
  //  MCQ — opción múltiple / true-false / checkbox
  // ---------------------------------------------------------------------
  //  Tipo(s) en detectKind(): mcq
  //  Se detecta por: label.prMCQ__answerLabel o .prMCQ__qaInnerSet
  //  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
  //  EXPONE:     MCQSolver (se une a PracticeSolver en exercises/index.js)
  // =====================================================================

  class MCQSolver {
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
        const tn0 = NavigationManager.curTask()?.n;
        for (const cb of checkboxes) {
          if (!cb.checked) { click(cb); marked++; await sleep(250); }
          if (marked === 1 && await practiceEnough(tn0)) break;   // NUEVO v20.7
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
        if (!fallback && !fromKnown && marked && await practiceEnough(NavigationManager.curTask()?.n)) break;   // NUEVO v20.7
      }
      return { did: 'mcq_solved', marked, fromKnown };
    }
  }

  // ▼▼▼ src/exercises/fitb.js ▼▼▼
  // =====================================================================
  //  FITB — rellenar con desplegables
  // ---------------------------------------------------------------------
  //  Tipo(s) en detectKind(): fitb
  //  Se detecta por: .DDLOptions__selected
  //  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
  //  EXPONE:     FITBSolver (se une a PracticeSolver en exercises/index.js)
  // =====================================================================

  class FITBSolver {
    // ---------------------------------------------------------------
    // RELLENAR CON DESPLEGABLES (FITB)                         [NUEVA — de v17]
    // PARA QUÉ: abre cada desplegable (.DDLOptions__selected) y elige la opción conocida
    //           (replay de test) o la primera.
    // ---------------------------------------------------------------
    static async solveFITB(values = null) {
      log('🔽 [FITB] Rellenando desplegables...');
      const drops = qav('.DDLOptions__selected');
      const tn = NavigationManager.curTask()?.n;
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
        if (!values && n === 1 && await practiceEnough(tn)) break;   // NUEVO v20.7: práctica → con uno basta
      }
      return { did: 'fitb_solved', n, waitDone: 3500 };
    }
  }

  // ▼▼▼ src/exercises/text.js ▼▼▼
  // =====================================================================
  //  TEXTO — inputs y textareas (no TinyMCE)
  // ---------------------------------------------------------------------
  //  Tipo(s) en detectKind(): text
  //  Se detecta por: input[type=text] / textarea
  //  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
  //  EXPONE:     TextSolver (se une a PracticeSolver en exercises/index.js)
  // =====================================================================

  class TextSolver {
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
      const tn = NavigationManager.curTask()?.n;
      for (const t of this.textInputs()) {
        if ((t.value || '').trim()) continue;
        const long = isLong || (t.tagName === 'TEXTAREA' && t.getBoundingClientRect().height > 60);
        setNative(t, long ? CFG.writingText : CFG.shortText); n++;
        await sleep(150);
        if (n === 1 && await practiceEnough(tn)) break;   // NUEVO v20.7: con uno basta
      }
      return { did: 'text_solved', n, long: isLong, waitDone: 3500 };
    }
  }

  // ▼▼▼ src/exercises/media.js ▼▼▼
  // =====================================================================
  //  MEDIA — audio/video "solo escuchar"
  // ---------------------------------------------------------------------
  //  Tipo(s) en detectKind(): media
  //  Se detecta por: .layout__mediaPlayPause
  //  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
  //  EXPONE:     MediaSolver (se une a PracticeSolver en exercises/index.js)
  // =====================================================================

  class MediaSolver {
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
  }

  // ▼▼▼ src/exercises/speaking.js ▼▼▼
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

  // ▼▼▼ src/exercises/droptarget.js ▼▼▼
  // =====================================================================
  //  DROPTARGET — "Drag the correct answer/s into place." (componente VIEJO de ED, no-Angular)
  // ---------------------------------------------------------------------
  //  NUEVO v20.5. Confirmado con dumps (Lesson 4 y 5 · Step 3: Test):
  //    huecos:  span.TTpanswerDiv.droptarget[data-id="1_1"] dentro del texto (cloze o globos)
  //    fichas:  #TTpTablePlaceHolder .draggableContainer > div.draggable.wordBankTile
  //  NO usa .dndZone/.dnditem → ninguna versión anterior lo veía.
  //    tests:     cosecha → TestManager.readDropTargets() · replay → placeDropTargets(valores)
  //    prácticas: solveDropTarget() (v20.6) — antes se detectaba como "media" por el video de al lado
  //  Cada ficha: 1) arrastre normal  2) arrastre otra vez  3) clic en la ficha + clic en el hueco.
  //  Tras cada intento se comprueba que el hueco quedó con esa palabra.
  //  DEPENDE DE: utils/dom.js, utils/drag.js, utils/scroll.js
  //  EXPONE:     DropTargetSolver (se une a PracticeSolver)
  // =====================================================================

  class DropTargetSolver {
    static isDropTargetScreen() { return !!(qv('.droptarget') && qa('.draggable, .wordBankTile').some(vis)); }

    static dropTargets() { return qav('.droptarget'); }

    // Qué dice un hueco: ficha dentro → su texto; si no, texto del hueco; si no, atributo ans
    static dropValue(t) {
      const tile = q('.draggable, .wordBankTile', t);
      return txt(tile) || txt(t) || (t.getAttribute('ans') || '').trim();
    }

    static bankTiles() { return qa('.draggable, .wordBankTile').filter(e => vis(e) && !e.closest('.droptarget')); }

    // ---------------------------------------------------------------
    // PRÁCTICA (sin respuestas conocidas)                       [NUEVA v20.6]
    // PARA QUÉ: llena cada hueco vacío con una ficha distinta del banco (como el DnD de práctica).
    // Usa el mismo placeDropTargets() que el replay de tests (arrastre → 2.º arrastre → clic+clic).
    // ---------------------------------------------------------------
    static async solveDropTarget() {
      const libres = this.bankTiles().map(t => txt(t));
      const values = this.dropTargets().map(t => (norm(this.dropValue(t)) ? '' : libres.shift() || ''));
      if (!values.some(Boolean)) return { did: 'drop_nothing_to_do' };
      // NUEVO v20.7: primero UNA ficha; si ED ya marcó la tarea, listo. Si no, el resto.
      const k = values.findIndex(Boolean);
      const uno = values.map((v, i) => (i === k ? v : ''));
      let r = await this.placeDropTargets(uno);
      if (await practiceEnough(NavigationManager.curTask()?.n)) return Object.assign(r, { did: 'drop_one_action' });
      const resto = values.map((v, i) => (i === k ? '' : v));
      if (resto.some(Boolean)) { const r2 = await this.placeDropTargets(resto); r = { moves: r.moves + r2.moves, ok: r.ok + r2.ok, total: r.total + r2.total }; }
      return Object.assign(r, { did: 'drop_practice' });
    }

    static async placeDropTargets(values) {
      log('🎯 [DropTarget] Colocando palabras cosechadas en los huecos...');
      let moves = 0, ok = 0;
      for (let i = 0; i < values.length; i++) {
        const want = norm(values[i]);
        if (!want) continue;
        for (let intento = 0; intento < 3; intento++) {
          const t = this.dropTargets()[i];
          if (!t) break;
          if (norm(this.dropValue(t)) === want) break;
          const tile = this.bankTiles().find(x => norm(txt(x)) === want);
          if (!tile) { warn('DropTarget: no encuentro la ficha', values[i]); break; }
          await revealInBox(t); await revealInBox(tile);
          if (intento < 2) await drag(tile, t);
          else { click(tile); await sleep(300); click(t); await sleep(500); }
          moves++;
          await sleep(300);
        }
        const t = this.dropTargets()[i];
        if (t && norm(this.dropValue(t)) === want) ok++;
      }
      const total = values.filter(v => norm(v)).length;
      if (ok < total) warn(`DropTarget: quedaron ${ok}/${total} huecos bien`, { esperado: values, quedó: this.dropTargets().map(t => this.dropValue(t)) });
      return { did: 'drop_replay', moves, ok, total };
    }
  }

  // ▼▼▼ src/exercises/mcq-legacy.js ▼▼▼
  // =====================================================================
  //  MCQ VIEJO — casillas / radios "lessonMultipleAnswer" (componente no-Angular)
  // ---------------------------------------------------------------------
  //  NUEVO v20.7. Confirmado con dump (Lesson 2: Call-in · Step 2: Practice · 1/2,
  //  "select the sentences that are true"):
  //    div.ADUMClass.lessonMultipleAnswer > ... input.lessonMultipleCheck + span.multiTextInline
  //  Antes NO se detectaba: con audio al lado caía en 'media' y la tarea quedaba sin hacer.
  //  Práctica: marca UNA (prefiere las que ED marca con clase "c") y comprueba.
  //  Test: cosecha `lmcq` (textos marcados en "Correct Answer") y los marca en el reintento.
  //       ⚠ La parte de test está SIN CONFIRMAR en ED real (falta dump del review de este tipo).
  //  DEPENDE DE: utils/dom.js, utils/practice.js
  //  EXPONE:     LegacyMCQSolver (se une a PracticeSolver)
  // =====================================================================

  class LegacyMCQSolver {
    static isLegacyMCQ() { return qav('.lessonMultipleAnswer').length > 0; }
    static legacyOptions() { return qav('.lessonMultipleAnswer'); }
    static legacyText(o) { return txt(q('.multiTextInline', o) || q('.multiText', o) || o); }
    static legacyChecked(o) {
      const i = q('input', o);
      return !!(i && (i.checked || /\bselected\b/.test(i.className))) || /\b(check|selected|checked)\b/.test(o.className);
    }

    // Marca una opción probando: clic en el bloque → clic en la etiqueta encima → clic en el input
    static async markLegacy(o) {
      for (const el of [o, q('label.overlayCheckbox, label', o), q('input', o)]) {
        if (!el) continue;
        click(el); await sleep(300);
        if (this.legacyChecked(o)) return true;
      }
      return false;
    }

    static async solveLegacyMCQ(wanted = null) {
      log('☑️ [MCQ viejo] Marcando opciones...');
      const opts = this.legacyOptions();
      if (!opts.length) return { did: 'mcq_legacy_none' };
      const tn = NavigationManager.curTask()?.n;
      let targets;
      if (wanted && wanted.length) {
        const W = wanted.map(norm);
        targets = opts.filter(o => W.includes(norm(this.legacyText(o))));
        opts.filter(o => this.legacyChecked(o) && !W.includes(norm(this.legacyText(o)))).forEach(o => targets.push(o));   // desmarcar sobrantes
      } else {
        targets = [opts.find(o => o.classList.contains('c')) || opts[0]];
      }
      let marked = 0;
      for (const o of targets) {
        const debe = !wanted || wanted.map(norm).includes(norm(this.legacyText(o)));
        if (this.legacyChecked(o) === debe) continue;
        if (debe) { if (await this.markLegacy(o)) marked++; } else { click(o); await sleep(300); }
        if (!wanted && marked === 1 && await practiceEnough(tn)) break;
      }
      return { did: wanted ? 'mcq_legacy_replay' : 'mcq_legacy', marked };
    }

    // Lectura para la cosecha del review: textos marcados
    static readLegacyMCQ() { return this.legacyOptions().filter(o => this.legacyChecked(o)).map(o => this.legacyText(o)); }
  }

  // ▼▼▼ src/exercises/ddl-legacy.js ▼▼▼
  // =====================================================================
  //  DESPLEGABLES VIEJOS — "Select the correct answer from the drop-down list." (no-Angular)
  // ---------------------------------------------------------------------
  //  NUEVO v20.7. Visto en dump (Lesson 3: Present Simple: Review · Step 3: Test · 12/15):
  //    .answersWrapper.fillInBlank.fitb con 4 huecos (.questionText, .arrowWrapper, .answered)
  //    y NINGÚN .DDLOptions__selected → el solver de desplegables de siempre no lo veía.
  //  ⚠ SIN CONFIRMAR: el dump no traía el HTML interno ni la lista que aparece al pulsar.
  //    Por eso: se abre el hueco, se buscan los elementos que APARECEN (la lista) y se elige
  //    por texto; tras cada elección se comprueba que el hueco quedó con ese texto.
  //    Para confirmarlo: probes/dropdown-dump.js en esa pantalla.
  //  DEPENDE DE: utils/dom.js, utils/practice.js
  //  EXPONE:     LegacyDDLSolver (se une a PracticeSolver)
  // =====================================================================

  class LegacyDDLSolver {
    static isLegacyDDL() { return !qv('.DDLOptions__selected') && this.legacyBlanks().length > 0; }
    static legacyBlanks() { return qav('.fillInBlank .questionText, .answersWrapper.fitb .questionText'); }

    // Texto elegido en un hueco (sin la flechita ni los íconos ✓/✗)
    static legacyBlankValue(b) {
      const c = b.cloneNode(true);
      qa('.arrowWrapper, .vCheck, .xCheck, [class*="Check"], [class*="icon" i]', c).forEach(e => e.remove());
      return txt(c);
    }

    static optionCandidates() { return qa('li, [class*="option" i], [class*="Option"], [role="option"]').filter(vis); }

    // Abre el hueco y devuelve las opciones que aparecieron
    static async openLegacy(b) {
      const antes = new Set(this.optionCandidates());
      for (const el of [q('.arrowWrapper', b), b]) {
        if (!el) continue;
        click(el); await sleep(400);
        let nuevas = this.optionCandidates().filter(e => !antes.has(e) && txt(e) && !e.contains(b) && !b.contains(e));
        nuevas = nuevas.filter(e => !nuevas.some(o => o !== e && e.contains(o)));   // solo las hojas
        if (nuevas.length) return nuevas;
      }
      return [];
    }

    static async solveLegacyDDL(values = null) {
      log('🔽 [Desplegable viejo] Eligiendo opciones...');
      const tn = NavigationManager.curTask()?.n;
      const blanks = this.legacyBlanks();
      let n = 0, ok = 0;
      for (let i = 0; i < blanks.length; i++) {
        const b = this.legacyBlanks()[i]; if (!b) break;
        const want = values ? values[i] : null;
        if (values && !want) continue;
        if (!values && this.legacyBlankValue(b)) continue;
        if (want && norm(this.legacyBlankValue(b)) === norm(want)) { ok++; continue; }
        const opts = await this.openLegacy(b);
        if (!opts.length) { warn('Desplegable viejo: no apareció la lista de opciones (hueco', i + 1, ')'); continue; }
        const o = (want && opts.find(x => norm(txt(x)) === norm(want))) || (!want ? opts[0] : null);
        if (!o) { warn('Desplegable viejo: no encuentro la opción', want, 'entre', opts.map(txt)); try { document.body.click(); } catch (e) {} continue; }
        click(o); n++; await sleep(350);
        if (!want || norm(this.legacyBlankValue(this.legacyBlanks()[i] || b)) === norm(want)) ok++;
        if (!values && n === 1 && await practiceEnough(tn)) break;
      }
      return { did: values ? 'ddl_legacy_replay' : 'ddl_legacy', n, ok, total: values ? values.filter(Boolean).length : blanks.length };
    }

    static readLegacyDDL() { return this.legacyBlanks().map(b => this.legacyBlankValue(b)); }
  }

  // ▼▼▼ src/exercises/index.js ▼▼▼
  // =====================================================================
  //  EXERCISES INDEX — junta todos los solvers en PracticeSolver
  // ---------------------------------------------------------------------
  //  Antes PracticeSolver era UNA clase gigante; ahora cada tipo vive en su archivo.
  //  DEPENDE DE: exercises/*.js
  //  EXPONE:     PracticeSolver
  // =====================================================================

  // Une todas las clases de ejercicios en un solo objeto PracticeSolver.
  // Dentro de cada método, `this` es PracticeSolver, así que this.placeDndMapping(),
  // this.textInputs(), etc. siguen funcionando igual que cuando todo era una sola clase.
  // Si dos archivos definen un método con el MISMO nombre, el bot se niega a arrancar
  // (así un archivo nuevo nunca pisa en silencio a otro).
  function mixStatics(...classes) {
    const target = class PracticeSolver {};
    for (const C of classes) {
      for (const k of Object.getOwnPropertyNames(C)) {
        if (k === 'length' || k === 'name' || k === 'prototype') continue;
        if (Object.prototype.hasOwnProperty.call(target, k)) throw new Error('ED_DUPLICATE_SOLVER_METHOD: ' + k + ' (' + C.name + ')');
        Object.defineProperty(target, k, Object.getOwnPropertyDescriptor(C, k));
      }
    }
    return target;
  }

  // PARA AÑADIR UN TIPO NUEVO: crea exercises/mi-tipo.js con `class MiTipoSolver { static async solveMiTipo() {...} }`,
  // agrégalo en build.js (lista ORDEN, antes de este archivo) y aquí abajo.
  const PracticeSolver = mixStatics(
    WritingSolver,
    SelectTextSolver,
    SequenceSolver,
    DnDSolver,
    MCQSolver,
    FITBSolver,
    TextSolver,
    MediaSolver,
    SpeakingSolver,
    DropTargetSolver,
    LegacyMCQSolver,
    LegacyDDLSolver
  );

  // ▼▼▼ src/tests/test-manager.js ▼▼▼
  // =====================================================================
  //  TEST MANAGER — tests: inicio, puntaje, review (cosecha) y replay
  // ---------------------------------------------------------------------
  //  Flujo: Start → 1.er intento en blanco → Score <100 % → Review → pestaña "Correct Answer"
  //  → cosechar cada pantalla → flechita atrás → reintento aplicando lo cosechado (replay).
  //  DEPENDE DE: core/*, utils/*, exercises/index.js (PracticeSolver), core/dropdowns.js (DropdownNav)
  //  EXPONE:     TestManager, scoreVisits
  //  CON PINZAS: isScore(), isReview() y la entrada a Review están CONGELADAS.
  // =====================================================================

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
      const sig0 = this.contentSig();   // NUEVO v20.5: contenido en la vista "Your Answer", para ver que cambie

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
        // AJUSTADA v20.2 — pantallas NO-MCQ (DnD, desplegables): antes era "1 clic + 600 ms" SIN comprobar,
        // y a veces se cosechaba "Tu respuesta" (vacía). Ahora espera a que el <li> de la pestaña quede
        // .active (confirmado en ED: <li class="active"><a>Respuesta correcta</a></li>) y a que se vean
        // las respuestas en los huecos. La rama MCQ de abajo NO cambió.
        if (!verifiable) {
          const act = await waitFor(() => { const t2 = this.findTab(RE_TAB_CORRECT); return !!(t2 && this.tabIsActive(t2)); }, 2000, 200);
          if (!act && i < strategies.length - 1) { tab = this.findTab(RE_TAB_CORRECT) || tab; continue; }
          // AJUSTADA v20.5: también espera que el contenido CAMBIE (en un 2.º review "Your Answer" ya trae palabras)
          await waitFor(() => this.answersShown() && (wasActive || this.contentSig() !== sig0), 2500, 250);
          await sleep(CFG.harvestPause);
          return tab;
        }
        if (wasActive) { await sleep(600); return tab; }
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

    // NUEVA v20.2: ¿ya se ven respuestas en pantalla? (huecos DnD con fichas, desplegables o droptargets con texto)
    static answersShown() {
      // AJUSTADA v20.4: ED marca la vista "Tu respuesta" con .checkAnswerMode y la vista
      // "Respuesta correcta" con .seeAnswerMode (confirmado en dumps de TextToPic, cloze y secuencia).
      if (qv('.checkAnswerMode')) return false;
      if (qv('.seeAnswerMode')) return true;
      const m = testDndModel();
      if (m && m.dests.some(d => qa('.dnditem', d).length)) return true;
      if (qav('.DDLOptions__selected').some(e => txt(e))) return true;
      if (qav('.droptarget').some(e => txt(e))) return true;
      if (PracticeSolver.readLegacyDDL().some(Boolean)) return true;   // NUEVO v20.7
      if (PracticeSolver.readLegacyMCQ().length) return true;           // NUEVO v20.7
      return false;
    }

    // NUEVA v20.5: "foto" de lo que hay en huecos, desplegables y droptargets (para saber si la vista cambió)
    static contentSig() {
      return JSON.stringify([
        qav('.dndZone').map(z => qa('.dnditem', z).map(txt).join('|')),
        qav('.DDLOptions__selected').map(txt),
        qav('.droptarget').map(t => PracticeSolver.dropValue(t)),
        PracticeSolver.readLegacyDDL(), PracticeSolver.readLegacyMCQ()   // NUEVO v20.7
      ]);
    }

    // NUEVA v20.5: lee los huecos del DnD viejo (span.droptarget) en "Correct Answer"
    static readDropTargets() { return PracticeSolver.dropTargets().map(t => PracticeSolver.dropValue(t)); }

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
    // AJUSTADA v20.3: usa testDndModel(); en la clasificación (columnas con encabezado) toma las columnas
    // como huecos aunque tengan 2+ fichas. Para el resto de pantallas hace exactamente lo de antes.
    static readDnd() {
      const m = testDndModel();
      if (!m) return [];
      const zones = qav('.dndZone');
      const dests = (qav('.dndBank').length || m.byHeader) ? m.dests : zones.filter(z => !(qa('.dnditem', z).length >= 2 && zones.length > 2));
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
      // NUEVO v20.4: en "ordenar" se guarda el ORDEN correcto (texto de cada hueco, de arriba a abajo)
      // NUEVO v20.7: desplegables viejos y MCQ viejo (lessonMultipleAnswer)  ⚠ sin confirmar en ED real
      if (PracticeSolver.isLegacyDDL()) { const l = PracticeSolver.readLegacyDDL(); if (l.some(Boolean)) { entry.lddl = l; saved += l.filter(Boolean).length; } }
      if (PracticeSolver.isLegacyMCQ()) { const l = PracticeSolver.readLegacyMCQ(); if (l.length) { entry.lmcq = l; saved += l.length; } }
      // NUEVO v20.5: DnD viejo (span.droptarget)
      if (PracticeSolver.isDropTargetScreen() || qv('.droptarget')) { const drop = this.readDropTargets(); if (drop.some(Boolean)) { entry.drop = drop; saved += drop.filter(Boolean).length; } }
      if (PracticeSolver.isSequenceScreen()) { const seq = PracticeSolver.seqOrder(); if (seq.length && seq.every(Boolean)) { entry.seq = seq; saved++; } }
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
      if (!stillReview && looksLast && CFG.retakeAfterReview) await this.reopenAfterReview(key);   // AJUSTADA v20.1
      return { harvested: true, idx, saved };
    }

    // ---------------------------------------------------------------
    // PARA QUÉ: terminado el review, VOLVER AL TEST para hacer el replay.            [NUEVA v20.1]
    // Lo llaman harvestReview() (última pantalla) y la guardia de MainEngine.step()
    // (cuando el review termina y ED ya saltó a la siguiente lección).
    // Prueba en orden y VERIFICA cada intento (¿estoy en la lección y el step del test?):
    //   1) la flechita "<" de abajo a la derecha (como lo haces a mano)  — selectores SIN confirmar
    //   2) los desplegables de lección/step (reopenTest, RECUPERADO de v17)
    //   3) la flechita de la cabecera (backToTest, la de v19.7)
    // Si cae en la pantalla de puntaje, pulsa Retake. Si nada funciona, avisa y devuelve false.
    // ---------------------------------------------------------------
    static async reopenAfterReview(key) {
      const [lessonLbl, stepLbl] = String(key || '').split('||');
      const run = Object.assign({ key, lesson: lessonLbl, step: stepLbl }, StorageManager.getRun() || {}, { key, phase: 'replay' });
      StorageManager.setRun(run);
      const enElTest = () => lessonNum(NavigationManager.lessonLabel()) === lessonNum(lessonLbl) && stepNum(NavigationManager.stepLabel()) === stepNum(stepLbl);
      const intentos = [
        ['flechita <', () => this.prevArrow()],
        ['desplegables', () => this.reopenTest(lessonLbl, stepLbl)],
        ['flechita cabecera', () => this.backToTest()]
      ];
      for (const [nombre, fn] of intentos) {
        if (enElTest()) break;
        let ok = false;
        try { ok = await fn(); } catch (e) { warn('reopen', nombre, e.message); }
        if (ok) await waitFor(() => enElTest(), 6000, 300);
        log(enElTest() ? `↩️ De vuelta en el test (${nombre}).` : `↩️ ${nombre}: no me llevó al test.`);
      }
      if (!enElTest()) { warn('No pude volver al test', key, '→ ábrelo a mano y __ed.auto() hará el replay.'); return false; }
      await this.retakeIfScore();
      return true;
    }

    // PARA QUÉ: pulsa la flechita "<" de la barra de abajo (al lado de "5 / 10").    [NUEVA v20.1]
    // Los selectores son una SUPOSICIÓN por analogía con el Next (a.tasksBtnext.learning__nextItemLink).
    static async prevArrow() {
      const nx = q('a.tasksBtnext') || q('.learning__nextItemLink');
      const bar = nx ? (nx.parentElement?.closest('[class*="tasksBtn" i], [class*="footer" i], [class*="bottom" i]') || nx.parentElement?.parentElement) : null;
      const prev = qv('a.tasksBtprev') || qv('a[class*="prevItemLink" i]') || qv('a[class*="tasksBtprev" i]') ||
        (bar ? qa('a, button', bar).filter(vis).find(e => /prev|back/i.test(e.className || '')) : null);
      if (!prev) return false;
      log('↩️ Pulsando la flechita "<"');
      click(prev); await sleep(2500); await NavigationManager.handleModals();
      return true;
    }

    // PARA QUÉ: reabre el test con los desplegables (lección → step).               [RECUPERADA de v17]
    static async reopenTest(lessonLbl, stepLbl) {
      const ln = lessonNum(lessonLbl);
      if (ln && lessonNum(NavigationManager.lessonLabel()) !== ln) { if (!(await DropdownNav.gotoLesson(ln))) return false; }
      if (stepNum(NavigationManager.stepLabel()) !== stepNum(stepLbl)) { if (!(await DropdownNav.gotoStep(stepLbl))) return false; }
      return true;
    }

    // PARA QUÉ: si al volver aparece el puntaje viejo, pulsa Retake.                 [RECUPERADA de v17]
    static async retakeIfScore() {
      await waitFor(() => this.isTestStart() || this.isScore() || this.inTest(), 6000, 300);
      if (this.isTestStart() || !this.isScore()) return false;
      const re = qa('a, button, input[type=button]').filter(vis).find(b => RE_RETAKE.test(txt(b) || b.value || ''));
      if (!re) { warn('Estoy en el puntaje del test pero no veo botón Retake.'); return false; }
      log('🔁 Retake'); click(re); await sleep(2500);
      return true;
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
      // NUEVO v20.4: "ordenar" no es banco→huecos; se reordena con placeSequence(scr.seq).
      // OJO: NO se usa `scr.dnd` de cosechas viejas en ordenar: hasta v20.3 se cosechaba la vista
      // "Tu respuesta" (orden equivocado). Sin `seq` se deja como está → el review vuelve a cosechar bien.
      // NUEVO v20.7: desplegables viejos y MCQ viejo
      if (PracticeSolver.isLegacyDDL() && scr.lddl && scr.lddl.some(Boolean)) out.lddl = await PracticeSolver.solveLegacyDDL(scr.lddl);
      if (PracticeSolver.isLegacyMCQ() && scr.lmcq && scr.lmcq.length) out.lmcq = await PracticeSolver.solveLegacyMCQ(scr.lmcq);
      // NUEVO v20.5: DnD viejo (span.droptarget) — antes ninguna rama lo veía y quedaba vacío
      if (PracticeSolver.isDropTargetScreen()) { if (scr.drop && scr.drop.some(Boolean)) out.drop = await PracticeSolver.placeDropTargets(scr.drop); }
      else if (PracticeSolver.isSequenceScreen()) { if (scr.seq && scr.seq.length) out.seq = await PracticeSolver.placeSequence(scr.seq); }
      else if (PracticeSolver.isDragAndDrop()) out.dnd = await PracticeSolver.solveDragAndDrop(false, scr.dnd && scr.dnd.length ? scr.dnd : null);
      await sleep(500);
      await NavigationManager.goNext();
      return out;
    }

    // ---------------------------------------------------------------
    // TEST EXPRÉS (1.er intento, sin respuestas todavía)              [NUEVA v20.7]
    // PARA QUÉ: llegar al Submit lo antes posible. 1) Si el Submit ya está, se pulsa.
    // 2) Si no, se salta con los numeritos de tareas a la ÚLTIMA pregunta. 3) Si eso no
    // funciona, Next normal (sin resolver nada). El popup "no respondiste todo" se acepta solo.
    // ---------------------------------------------------------------
    static submitBtn() { return qv('a.tasksBtnext.learning__submitTestLink') || qv('.learning__submitTest a') || qv('.learning__submitTest'); }

    static async expressSubmit() {
      let salto = false;
      if (!this.submitBtn()) {
        const ts = NavigationManager.tasks(), last = ts[ts.length - 1], cur = NavigationManager.curTask();
        if (last && (!cur || cur.n !== last.n)) {
          log('⚡ Test exprés: salto a la última pregunta (' + last.n + ')');
          salto = await DropdownNav.gotoTask(last.n);
        }
      }
      const sub = !!this.submitBtn();
      if (sub) log('⚡ Test exprés: Submit');
      await NavigationManager.goNext();
      return { did: 'test_express', salto, submit: sub };
    }

    // NUEVA: tope de reintentos. Cuenta las veces que se ve la pantalla de puntaje < 100 %.
    static tooManyRetries(key) {
      scoreVisits[key] = (scoreVisits[key] || 0) + 1;
      return scoreVisits[key] > CFG.maxTestAttempts;
    }
  }

  // ▼▼▼ src/core/engine.js ▼▼▼
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
      if (PracticeSolver.isDropTargetScreen()) return 'droptarget';   // NUEVO v20.6: antes caía en 'media' (por el video)
      if (PracticeSolver.isDragAndDrop()) return 'dnd';
      if (qv('.DDLOptions__selected')) return 'fitb';
      if (PracticeSolver.isLegacyDDL()) return 'ddl_legacy';   // NUEVO v20.7 (antes caía en 'media')
      if (qv('label.prMCQ__answerLabel') || qv('.prMCQ__qaInnerSet')) return 'mcq';
      if (PracticeSolver.isLegacyMCQ()) return 'mcq_legacy';   // NUEVO v20.7 (antes caía en 'media')
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
        case 'droptarget': return PracticeSolver.solveDropTarget();      // NUEVO v20.6
        case 'dnd': return PracticeSolver.solveDragAndDrop(false);   // false = colocar TODOS los elementos
        case 'fitb': return PracticeSolver.solveFITB();
        case 'ddl_legacy': return PracticeSolver.solveLegacyDDL();      // NUEVO v20.7
        case 'mcq_legacy': return PracticeSolver.solveLegacyMCQ();      // NUEVO v20.7
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
        const rp = await TestManager.replayQuestion();
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

      await sleep(400);   // AJUSTADA v20.7: era 800
      await NavigationManager.goNext();
      return res;
    }
  }

  // ▼▼▼ src/ui/console-api.js ▼▼▼
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
        if (++n > CFG.maxIterations) { this._running = false; break; }
        try { const r = await MainEngine.step(); log('#' + n, r); } catch (e) { errLog('🛑 BOT DETENIDO:', e.message); this._lastMsg = e.message; this._running = false; break; }
        await sleep(CFG.tickMs);
      }
      log('⏸ Bot detenido.');
      hud && hud.render();
    },
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
        'Alt+E': 'Iniciar / parar', '__ed.dragTest()': 'Prueba UN arrastre y dice si funcionó'
      });
    }
  };

  // ▼▼▼ src/ui/hud.js ▼▼▼
  // =====================================================================
  //  HUD — cajita flotante con estado y botón Iniciar/Parar
  // ---------------------------------------------------------------------
  //  
  //  DEPENDE DE: window.__ed
  //  EXPONE:     HUD
  // =====================================================================

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
      this.el.innerHTML = `<b>ED v${V} OOP</b> [${run ? '🟢 Activo' : '🔴 Pausa'}]<br><span style="color:#a4b0be">${kind}</span><br>${window.__ed._lastMsg ? `<span style="color:#ff6b6b">🛑 ${window.__ed._lastMsg.slice(0, 160)}</span><br>` : ''}
        <button id="ed_t" style="margin-top:6px;padding:4px 8px;background:${run?'#e74c3c':'#2ecc71'};color:#fff;border:0;border-radius:4px;cursor:pointer">${run?'Parar':'Iniciar'}</button>`;
      this.el.querySelector('#ed_t').onclick = () => { run ? window.__ed.stop() : window.__ed.auto(); };
    }
  }

  // ▼▼▼ src/ui/shortcuts.js ▼▼▼
  // =====================================================================
  //  ATAJO DE TECLADO — Alt+E (o Ctrl+Shift+E) inicia / para el bot
  // ---------------------------------------------------------------------
  //  RECUPERADO de v17 (v20.1). Al reinstalar se quita el atajo viejo para no duplicarlo.
  //  DEPENDE DE: window.__ed
  //  EXPONE:     window.__edKeyHandler
  // =====================================================================

  try { if (window.__edKeyHandler) window.removeEventListener('keydown', window.__edKeyHandler); } catch (e) {}
  window.__edKeyHandler = e => {
    if ((e.ctrlKey && e.shiftKey && e.code === 'KeyE') || (e.altKey && e.code === 'KeyE')) {
      e.preventDefault();
      window.__ed._running ? window.__ed.stop() : window.__ed.auto();
    }
  };
  window.addEventListener('keydown', window.__edKeyHandler);

  // ▼▼▼ src/main.js ▼▼▼
  // =====================================================================
  //  MAIN — arranque
  // ---------------------------------------------------------------------
  //  Crea el HUD y avisa en consola. NO arranca solo: usa __ed.auto().
  //  DEPENDE DE: todo
  //  EXPONE:     —
  // =====================================================================

  hud = new HUD();

  log('✅ ED-Autopilot v' + V + ' cargado con éxito. Usa __ed.auto() para arrancar · __ed.inspect() para diagnosticar.');
})();
