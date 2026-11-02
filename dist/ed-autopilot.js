/* =====================================================================
   ED-Autopilot v21.12  —  ARCHIVO GENERADO, NO LO EDITES A MANO
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

  const V = '21.12';   // ← ÚNICO lugar donde se cambia la versión

  // NUEVO v21.7 — dentro de un MARCO (iframe) NO corre el bot completo. En la nube se inyectaba en todos los
  // marcos y llegaba a haber varios bots a la vez (corrida de Nelson, 01/11). En un marco solo se atiende el aviso
  // de ED "You haven't submitted your test" (MsgPage.html): Continue si el bot está saliendo, Cancel si no.
  if (window.top !== window.self) {
    const atender = () => {
      try {
        const ok = document.querySelector('#popupButtonsWrapper #btnOk, .popupButtonsWrapper #btnOk');
        if (!ok || !/submitted your test|no has enviado|resultados no se/i.test(document.body.innerText || '')) return;
        const saliendo = +(localStorage.getItem('ed:saliendo') || 0) > Date.now() - 120000;
        const b = saliendo ? ok : (document.getElementById('btnCancel') || ok);
        console.log('%c[ED]', 'color:#27ae61', '🪟 Aviso de test sin enviar → ' + (saliendo ? 'Continue (salgo)' : 'Cancel (vuelvo al test)'));
        b.click();
      } catch (e) {}
    };
    setTimeout(atender, 800); setTimeout(atender, 2500);
    return;
  }
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
    maxTestAttempts: 2,        // AJUSTADA v21.11 (regla 4 de Hugo; antes 3): reintentos de un test que no llega a 100 %
    tickMs: 700,               // AJUSTADA v20.7: era 1200 (las esperas ahora son "hasta que cambie la pantalla")
    maxIterations: 1500,
    correctTabSelector: '',
    retakeAfterReview: true,   // NUEVO: tras cosechar el review, usar la flechita atrás para reabrir el test
    solveWithoutTaskNav: true, // NUEVO: resolver ejercicios aunque no haya navegador de tareas (como v17)
    stopIfNot100: true,        // NUEVO v20.1: si tras maxTestAttempts no llega a 100 % → DETENERSE y avisar
    harvestPause: 600,         // RECUPERADO v20.2 (v17.1/17.3): pausa extra antes de leer el review en pantallas no-MCQ
    testExpress: false,        // AJUSTADA v21.7 (antes true): el envío en blanco parece CONTAR en el promedio de ED
                               // (Nelson: 98 % → 96 % con todos los tests terminando en 100). 1.er intento: se responde.
    retakeDoneTests: false,    // NUEVO v21.7: NO rehacer un test que ED ya marca como terminado (salvo puntaje conocido < 100)
    practiceOneAction: true,   // NUEVO v20.7: en prácticas, UNA acción; si ED no marca la tarea como hecha, completa todo
    verifyTasks: true,         // NUEVO v20.8: comprobar que ED marcó la tarea; si no, 1 reintento completo y al reporte
    fakeMic: true,             // NUEVO v21.1: si NO hay micrófono, simular uno (ver utils/fake-mic.js)
    reloadEveryMin: 40,
    maxMinPorUnidad: 45,       // AJUSTADA v21.7 (antes 150): una unidad normal toma ~8 min; 45 es tope de sobra        // NUEVO v21.1: con el cargador de Tampermonkey, recargar la pestaña cada N min (0 = nunca)
    cfgV: 4                    // versión de la config (para migrar valores viejos guardados)
  }, (() => { try { return JSON.parse(localStorage.getItem(K_CFG) || '{}'); } catch (e) { return {}; } })());
  // NUEVO v20.7: __ed.cfg() guardaba TODA la config, incluido tickMs: 1200. Se migra una vez al nuevo valor.
  if (!(CFG.cfgV >= 2)) { if (CFG.tickMs === 1200) CFG.tickMs = 700; CFG.cfgV = 2; }
  if (!(CFG.cfgV >= 3)) { CFG.testExpress = false; CFG.retakeDoneTests = false; CFG.maxMinPorUnidad = 45; CFG.cfgV = 3; }   // NUEVO v21.7
  // NUEVO v21.11 — regla 4 de Hugo: lo que falla 2 veces en una corrida no se reintenta (un test: 2 reintentos)
  if (!(CFG.cfgV >= 4)) { if (CFG.maxTestAttempts > 2) CFG.maxTestAttempts = 2; CFG.cfgV = 4; }

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

  // NUEVO v21.0 — comparar textos RESPETANDO mayúsculas ("Weren't" ≠ "weren't").
  // exacto(): igual tras limpiar espacios. pick(lista, texto, getTxt): primero la coincidencia exacta;
  // solo si no hay, la que coincide sin mayúsculas (norm). Así un banco con "Weren't" y "weren't" elige bien.
  const limpio = s => String(s || '').replace(/\s+/g, ' ').trim();
  const exacto = (a, b) => limpio(a) === limpio(b);
  const pick = (lista, texto, getTxt = txt) => lista.find(x => exacto(getTxt(x), texto)) || lista.find(x => norm(getTxt(x)) === norm(texto)) || null;
  // ¿coincide? Exacto si en la pantalla existe alguna opción con ese texto exacto; si no, sin mayúsculas.
  const coincide = (valor, quiere, hayExacta) => (hayExacta ? exacto(valor, quiere) : norm(valor) === norm(quiere));

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

  // ▼▼▼ src/utils/press.js ▼▼▼
  // =====================================================================
  //  PRESS — clic VERIFICADO (para botones de ED que no siempre responden al primer clic)
  // ---------------------------------------------------------------------
  //  NUEVO v20.8. press(el, ok, espera) prueba en orden hasta que ok() sea true:
  //    1) el.click()   2) secuencia completa pointer/mouse   3) jQuery(el).trigger('click')
  //  Sin ok() hace solo el 1). Devuelve true si funcionó.
  //  DEPENDE DE: utils/dom.js
  //  EXPONE:     press
  // =====================================================================

  async function press(el, ok = null, espera = 1500) {
    if (!el) return false;
    const pasos = [
      () => click(el),
      () => {
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          const Ev = t.startsWith('pointer') && window.PointerEvent ? window.PointerEvent : MouseEvent;
          try { el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0, buttons: t.endsWith('down') ? 1 : 0 })); } catch (e) {}
        }
      },
      () => { if (window.jQuery) { try { window.jQuery(el).trigger('click'); } catch (e) {} } }
    ];
    if (!ok) { pasos[0](); return true; }
    for (const paso of pasos) {
      paso();
      if (await waitFor(() => { try { return ok(); } catch (e) { return false; } }, espera, 150)) return true;
    }
    return false;
  }

  // ▼▼▼ src/utils/reporter.js ▼▼▼
  // =====================================================================
  //  REPORTE AUTOMÁTICO DE FALLOS — "lo que no pude hacer", listo para pegar en el chat
  // ---------------------------------------------------------------------
  //  NUEVO v20.8. Cuando el bot no logra algo (tarea que ED no marcó, tipo desconocido,
  //  replay incompleto, cosecha vacía, error...) guarda una RADIOGRAFÍA de esa pantalla
  //  (como probes/test-dump.js, pero compacta) en localStorage.
  //    __ed.report()       → copia TODO el reporte al portapapeles (y lo devuelve como texto)
  //    __ed.reportFile()   → lo descarga como .txt
  //    __ed.reportClear()  → lo borra
  //  También: botón "📋 Reporte (N)" en la cajita, y al detenerse el bot intenta copiarlo solo.
  //  No guarda datos personales: solo clases, textos de la pregunta y el HTML del ejercicio.
  //  DEPENDE DE: utils/dom.js, core/config.js
  //  EXPONE:     Reporter
  // =====================================================================

  const K_REPORT = 'ed:report:v1';

  class Reporter {
    static all() { try { return JSON.parse(localStorage.getItem(K_REPORT) || '[]'); } catch (e) { return []; } }
    static count() { return this.all().length; }
    static clear() { localStorage.removeItem(K_REPORT); }

    static snapshot() {
      const area = qv('.answersWrapper') || qv('.learning__angPracticeW') || qv('.pmContainer') || qv('.learning__practiceArea') || qv('.layout__mainContent') || document.body;
      const clases = {};
      qa('*', area).filter(vis).forEach(e => (typeof e.className === 'string' ? e.className : '').split(/\s+/).filter(Boolean).forEach(c => { clases[c] = (clases[c] || 0) + 1; }));
      const limpio = e => {
        if (!e) return null;
        const c = e.cloneNode(true);
        qa('script, style, svg, img, video, audio', c).forEach(x => x.remove());
        // NUEVO v21.10 — reportes "tipo_desconocido" de los "Step 1: Explore" (corridas de Jose): sin área conocida se
        // guardaba el <body> y los 3500 caracteres eran SOLO el menú de lecciones; el ejercicio nunca llegaba. Se
        // quitan los menús y, si es el <body>, se guarda más.
        qa('.learning__lessonsStepsNav, .edLADropDownList, [class*="settingsMenu"]', c).forEach(x => x.remove());
        qa('*', c).forEach(x => [...x.attributes].forEach(a => { if (/^(_ng|ng-|style$|src$|href$)/.test(a.name)) x.removeAttribute(a.name); }));
        return c.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').slice(0, e === document.body ? 8000 : 3500);
      };
      let kind = '';
      try { kind = window.__ed.kind(); } catch (e) {}
      const t = (() => { try { return NavigationManager.curTask(); } catch (e) { return null; } })();
      return {
        url: location.href.slice(0, 90), leccion: NavigationManager.lessonLabel(), step: NavigationManager.stepLabel(),
        contador: (NavigationManager.counter() || {}).s || null, tarea: t ? t.n + (t.done ? '✓' : '·') : null, kind,
        instruccion: txt(q('.learning__headerIW')).slice(0, 160),
        // NUEVO v21.7: texto VISIBLE de la pantalla (sin menús) y marcos (iframes) → entender casos raros
        textoVisible: (() => { try { return ((qv('.learning__practiceArea, .learning__body, #mainContent') || document.body).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200); } catch (e) { return ''; } })(),
        marcos: qa('iframe').map(f => (f.getAttribute('src') || f.id || '?').slice(0, 120) + (vis(f) ? ' (visible)' : '')).slice(0, 8),
        clases: Object.fromEntries(Object.entries(clases).sort((a, b) => b[1] - a[1]).slice(0, 45)),
        html: limpio(area),
        // NUEVO v21.11 (regla de Hugo: "cada reporte es un DUMP COMPLETO, sin dumps a mano")
        dump: this.dumpCompleto()
      };
    }

    // NUEVO v21.11 — lo mismo que probes/test-dump.js y más, con tope de tamaño: controles con atributos, caja de la
    // pregunta, DnD (+ eventos de jQuery), pestañas del review, barra de navegación y tareas, panel izquierdo
    // (.learning__resourcesArea: lectura, video, audio), audios/videos y el contenido de los iframes del mismo sitio.
    static dumpCompleto(ligero = false) {
      const cls = e => (e && typeof e.className === 'string' ? e.className : '').trim();
      const corta = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
      const attrs = e => Object.fromEntries([...(e.attributes || [])].filter(a => !/^(class|style|_ng|ng-)/.test(a.name)).slice(0, 12).map(a => [a.name, corta(a.value, 60)]));
      const fuera = e => !!(e.closest && e.closest('.learning__lessonsStepsNav, .edLADropDownList, [class*="settingsMenu"], #ed-autopilot-hud, .learning__header, .learning__headerW, header'));
      const limpio = (e, n) => {
        if (!e) return null;
        const c = e.cloneNode(true);
        qa('script, style, svg, img, video, audio', c).forEach(x => x.remove());
        qa('.learning__lessonsStepsNav, .edLADropDownList, [class*="settingsMenu"], #ed-autopilot-hud', c).forEach(x => x.remove());
        qa('*', c).forEach(x => [...x.attributes].forEach(a => { if (/^(_ng|ng-|style$|src$|href$)/.test(a.name)) x.removeAttribute(a.name); }));
        return c.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').slice(0, n);
      };
      const eventosJQ = el => { try { const ev = window.jQuery && window.jQuery._data && window.jQuery._data(el, 'events'); return ev ? Object.keys(ev) : null; } catch (e) { return null; } };
      const ctrlSel = 'input, select, textarea, button, [contenteditable="true"], .draggable, .droptarget, .dnditem, .dndZone, label, ' +
        '[role="radio"], [role="checkbox"], [role="option"], [role="button"], .memoG__card, .segment, .speaker, .questionText, .optionsWrapper li, ' +
        '.learning__resourcesArea a, .answersWrapper a, [onclick]';
      const ctrls = qa(ctrlSel).filter(e => vis(e) && !fuera(e));
      const controles = ctrls.slice(0, ligero ? 25 : 40).map(e => {
        const o = { tag: e.tagName.toLowerCase(), clase: corta(cls(e), 80), texto: corta(e.textContent, 40) };
        if (!ligero) o.attrs = attrs(e);
        if (e.type) o.tipo = e.type;
        if ('value' in e && e.value) o.valor = corta(e.value, 30);
        if (e.checked) o.marcado = true;
        return o;
      });
      let caja = ctrls[0] || null;
      while (caja && !ctrls.every(c => caja.contains(c))) caja = caja.parentElement;
      if (!caja || caja === document.body || caja === document.documentElement) caja = qv('.answersWrapper') || qv('.learning__angPracticeW') || qv('.pmContainer') || qv('.learning__practiceArea') || caja;
      const out = { controles, nControles: ctrls.length, cajaHTML: limpio(caja, ligero ? 3000 : 5000) };
      if (ligero) return out;
      // DnD (como la sección A de test-dump.js)
      const resumir = (sel, n) => qa(sel).slice(0, n).map(e => ({ clase: corta(cls(e), 70), attrs: attrs(e), texto: corta(e.textContent, 40), visible: vis(e) }));
      const d0 = q('.draggable, .dnditem, .wordBankTile');
      if (d0 || q('.droptarget, .dndZone')) out.dnd = {
        huecos: resumir('.droptarget, .dndZone', 12), fichas: resumir('.draggable, .dnditem', 12),
        eventosFicha: d0 ? eventosJQ(d0) : null, eventosDocumento: eventosJQ(document), jqueryUI: !!(window.jQuery && window.jQuery.ui)
      };
      // Pestañas del review ("Your Answer" / "Correct Answer" y en español)
      const RE_TAB = /^\W*(correct\s*answers?|respuestas?\s*correctas?|your\s*answers?|(tus?|su|mis)\s*respuestas?)(\s*\(?\d+\)?)?\W*$/i;
      out.pestanas = qa('li, a, button, span, div').filter(e => !e.children.length && RE_TAB.test(txt(e))).slice(0, 6).map(e => ({ texto: txt(e), visible: vis(e), padre: limpio(e.parentElement, 300) }));
      // Barra de abajo y tareas
      const nx = q('a.tasksBtnext') || q('.learning__nextItemLink') || q('.learning__submitTestLink');
      out.barra = {
        siguiente: nx ? { clase: corta(cls(nx), 80), texto: corta(nx.textContent, 20), visible: vis(nx) } : null,
        atras: (e => e ? { clase: corta(cls(e), 80), visible: vis(e) } : null)(q('a.tasksBtprev, .learning__prevItemLink')),
        tareas: qa('.learning__tasksNav_task').slice(0, 20).map(e => corta(e.textContent, 4) + (/--done/.test(cls(e)) ? '✓' : '') + (/--current/.test(cls(e)) ? '*' : '')),
        contador: (NavigationManager.counter() || {}).s || null
      };
      // Panel izquierdo (lectura / video / audio)
      const izq = qv('.learning__resourcesArea') || q('.learning__resourcesArea');
      if (izq) out.panelIzq = { html: limpio(izq, 6000), texto: corta(izq.innerText || izq.textContent, 2000) };
      out.medios = qa('audio, video').slice(0, 8).map(m => ({ tag: m.tagName.toLowerCase(), src: corta((m.currentSrc || m.src || '').split('/').pop(), 80), pausado: m.paused, t: Math.round(m.currentTime || 0), dur: Math.round(m.duration || 0), visible: vis(m), clasePadre: corta(cls(m.parentElement), 60) }));
      out.iframes = qa('iframe').slice(0, 6).map(f => { const o = { id: f.id || null, src: corta(f.getAttribute('src'), 120), visible: vis(f) };
        try { const b = f.contentDocument && f.contentDocument.body; if (b) { o.texto = corta(b.innerText || b.textContent, 300); o.html = limpio(b, 1500); } } catch (e) { o.ajeno = true; } return o; });
      return out;
    }

    // NUEVO v21.11 — estado ANTES de que el bot actúe (el engine lo llama justo antes del solver). Si luego hay un
    // fallo en ese mismo lugar, el reporte trae el "antes" y el "después".
    static marcarAntes() {
      try {
        const t = NavigationManager.curTask();
        this._antes = { lugar: [NavigationManager.lessonLabel(), NavigationManager.stepLabel(), (NavigationManager.counter() || {}).s || '', t ? t.n : ''].join('|'),
          hora: Date.now(), dump: this.dumpCompleto(true) };
      } catch (e) { this._antes = null; }
    }

    // motivo: 'tarea_no_marcada' | 'tipo_desconocido' | 'replay_incompleto' | 'cosecha_vacia' | 'error' | ...
    static capture(motivo, extra = null) {
      try {
        const s = this.snapshot();
        const lista = this.all();
        const clave = [motivo, s.leccion, s.step, s.contador, s.tarea].join('|');
        if (lista.some(r => r.clave === clave)) return;                     // ya anotado
        const e = Object.assign({ clave, motivo, hora: new Date().toLocaleTimeString(), v: V, resultado: extra }, s);
        // NUEVO v21.11: el "antes" de la acción del bot, si es del mismo lugar y de hace menos de 3 min
        const t = (() => { try { return NavigationManager.curTask(); } catch (_) { return null; } })();
        const lugar = [s.leccion, s.step, s.contador || '', t ? t.n : ''].join('|');
        if (this._antes && this._antes.lugar === lugar && Date.now() - this._antes.hora < 180000) e.antes = this._antes.dump;
        // Tope por entrada (~45 000 caracteres): se recortan primero los campos más grandes
        const recortar = () => { if (e.html) e.html = e.html.slice(0, 2500); if (e.dump && e.dump.panelIzq) e.dump.panelIzq.html = (e.dump.panelIzq.html || '').slice(0, 3000);
          if (e.dump) { e.dump.cajaHTML = (e.dump.cajaHTML || '').slice(0, 3000); (e.dump.iframes || []).forEach(f => { delete f.html; }); } if (e.antes) e.antes.cajaHTML = (e.antes.cajaHTML || '').slice(0, 2000); };
        if (JSON.stringify(e).length > 45000) recortar();
        lista.push(e);
        // AJUSTADA v21.11: entradas más grandes → tope total mayor; si el navegador no tiene lugar, se sueltan las viejas
        while (lista.length > 40 || JSON.stringify(lista).length > 900000) lista.shift();
        for (;;) { try { localStorage.setItem(K_REPORT, JSON.stringify(lista)); break; } catch (err) { if (lista.length <= 1) throw err; lista.shift(); } }
        warn('📝 Anotado para el reporte (' + motivo + '):', s.leccion, '·', s.step, '·', s.contador || '');
      } catch (e) { warn('Reporter falló:', e.message); }
    }

    static text() {
      const lista = this.all();
      if (!lista.length) return 'ED-Autopilot v' + V + ' — sin fallos anotados.';
      const resumen = lista.map((r, i) => `${i + 1}. [${r.motivo}] ${r.leccion} · ${r.step} · ${r.contador || ''} · kind=${r.kind}`).join('\n');
      return `ED-Autopilot v${V} — REPORTE DE FALLOS (${lista.length})\n${resumen}\n\n--- DETALLE (JSON) ---\n` + JSON.stringify(lista.map(r => { const c = Object.assign({}, r); delete c.clave; return c; }), null, 1);
    }

    static async copy() {
      const t = this.text();
      try { await navigator.clipboard.writeText(t); log('📋 Reporte copiado al portapapeles (' + this.count() + ' fallos). Pégalo en el chat.'); return true; }
      catch (e) { try { copy(t); log('📋 Reporte copiado.'); return true; } catch (_) {} warn('No pude copiar solo (la pestaña debe estar enfocada). Usa el botón 📋 de la cajita o __ed.reportFile().'); return false; }
    }

    static file() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([this.text()], { type: 'text/plain' }));
      a.download = 'ed-reporte-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.txt';
      document.body.appendChild(a); a.click(); a.remove();
    }
  }

  // ▼▼▼ src/utils/corrida.js ▼▼▼
  // =====================================================================
  //  CORRIDA — memoria de "lo que ya falló en ESTA corrida" (regla 4 de Hugo, v21.11)
  // ---------------------------------------------------------------------
  //  "Si algo falla 2 veces en una corrida, el bot lo anota y no lo vuelve a intentar en esa corrida."
  //  Una corrida = un arranque de completar/barrido (su `inicio`); sin barrido activo, 'manual'.
  //  Al empezar una corrida nueva se borran los fallos anotados y el contador de reintentos de tests
  //  (ed:scoreVisits:v1): antes pasaba de una corrida a otra y un test rendido tenía 1 solo intento.
  //  Lugar = lección | paso | contador | tarea.  Tope: 2 fallos; 1 si el tipo es caro (speaking, memoria, Explore...).
  //  DEPENDE DE: core/navigation.js (en tiempo de ejecución)
  //  EXPONE:     Corrida
  // =====================================================================

  const K_CORRIDA = 'ed:corrida:v1';

  class Corrida {
    static idActual() {
      try { const s = JSON.parse(localStorage.getItem('ed:sweep:v1') || 'null'); return (s && (s.inicio || s.corrida)) || 'manual'; } catch (e) { return 'manual'; }
    }
    static get() {
      let c = null; try { c = JSON.parse(localStorage.getItem(K_CORRIDA) || 'null'); } catch (e) {}
      const id = this.idActual();
      if (!c || c.id !== id) {
        c = { id, fallos: {} };
        try { localStorage.removeItem('ed:scoreVisits:v1'); localStorage.setItem(K_CORRIDA, JSON.stringify(c)); } catch (e) {}
      }
      return c;
    }
    static lugar(t) {
      try { return [NavigationManager.lessonLabel(), NavigationManager.stepLabel(), (NavigationManager.counter() || {}).s || '', t ? t.n : ''].join('|'); } catch (e) { return '?'; }
    }
    static fallos(l) { return this.get().fallos[l] || 0; }
    static fallo(l) {
      const c = this.get(); c.fallos[l] = (c.fallos[l] || 0) + 1;
      try { localStorage.setItem(K_CORRIDA, JSON.stringify(c)); } catch (e) {}
      return c.fallos[l];
    }
  }

  // ▼▼▼ src/utils/fake-mic.js ▼▼▼
  // =====================================================================
  //  MICRÓFONO SIMULADO — para PCs sin micrófono ("Your microphone is not available ... Error 505")
  // ---------------------------------------------------------------------
  //  NUEVO v21.1. ED pide el micrófono con getUserMedia. Si no hay ninguno, falla y el botón de grabar
  //  no se activa. installFakeMic() hace que, cuando NO haya micrófono real, el navegador entregue un
  //  audio casi silencioso (ruido muy bajo). Así ED puede grabar y enviar en los speaking al profesor.
  //  ⚠ En "elegir la respuesta hablando" ED escucha silencio: no lo dará por correcto (solo ya no se traba).
  //  Si hay micrófono real, se usa el real. Apagar: __ed.cfg({ fakeMic: false }) y recargar.
  //  Para que funcione desde que carga la página, conviene el cargador de Tampermonkey (lo instala antes).
  //  DEPENDE DE: nada
  //  EXPONE:     installFakeMic, primeFakeMic
  // =====================================================================

  function installFakeMic() {
    try {
      const md = navigator.mediaDevices;
      if (!md || md.__edFake) return false;
      const orig = md.getUserMedia ? md.getUserMedia.bind(md) : null;
      const origEnum = md.enumerateDevices ? md.enumerateDevices.bind(md) : null;
      const falso = () => {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = window.__edMicCtx || (window.__edMicCtx = new Ctx());
        try { ctx.resume(); } catch (e) {}
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.003;   // ruido casi inaudible
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const dst = ctx.createMediaStreamDestination(); src.connect(dst); src.start();
        window.__edMicDst = dst; window.__edFakeActive = true;   // NUEVO v21.2: para el "eco" (ver micEcho)
        return dst.stream;
      };
      md.getUserMedia = async c => {
        if (c && c.audio && !c.video) {
          if (orig) { try { return await orig(c); } catch (e) { /* sin micrófono real → simulado */ } }
          console.log('%c[ED]', 'color:#27ae61', '🎤 sin micrófono real → uso el simulado');
          return falso();
        }
        return orig ? orig(c) : Promise.reject(new Error('getUserMedia no disponible'));
      };
      md.enumerateDevices = async () => {
        const l = origEnum ? [...(await origEnum())] : [];
        if (!l.some(x => x.kind === 'audioinput')) l.push({ deviceId: 'ed-fake-mic', kind: 'audioinput', label: 'ED micrófono simulado', groupId: 'ed', toJSON() { return this; } });
        return l;
      };
      const viejo = (c, ok, err) => md.getUserMedia(c).then(ok, err);   // APIs viejas que usa el código antiguo de ED
      navigator.getUserMedia = navigator.webkitGetUserMedia = navigator.mozGetUserMedia = viejo;
      md.__edFake = true;
      return true;
    } catch (e) { return false; }
  }

  // NUEVO v21.2 — ECO (experimento): mientras window.__edMicEcho esté activo, todo audio que reproduzca la
  // página (p. ej. el botón de audífonos de la opción correcta, dicha por un nativo) también entra al
  // micrófono simulado. Así ED podría "oír" la respuesta correcta. Si el navegador no deja capturar ese
  // audio (restricción de origen), simplemente entra silencio: no rompe nada.
  function installMicEcho() {
    try {
      const P = HTMLMediaElement.prototype;
      if (P.__edEcho) return;
      const play = P.play;
      P.play = function () {
        try {
          if (window.__edMicEcho && window.__edMicCtx && window.__edMicDst) {
            const ctx = window.__edMicCtx;
            if (!this.__edSrc) { this.__edSrc = ctx.createMediaElementSource(this); this.__edSrc.connect(ctx.destination); }
            this.__edSrc.connect(window.__edMicDst);
          }
        } catch (e) {}
        return play.apply(this, arguments);
      };
      P.__edEcho = true;
    } catch (e) {}
  }

  // Chrome deja "activar" el audio solo tras un clic REAL: se llama al pulsar Iniciar en la cajita.
  function primeFakeMic() {
    try { const Ctx = window.AudioContext || window.webkitAudioContext; const ctx = window.__edMicCtx || (window.__edMicCtx = new Ctx()); ctx.resume(); } catch (e) {}
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
      // AJUSTADA v21.10 — 2.ª corrida de Jose (unidad 12, 40 min): un 97 % de "Lesson 3: Present Simple: Review" (unidad
      // 14) mandaba a "3. Drama" (unidad 12, ya completa) porque solo se comparaba el NÚMERO. Ahora número Y nombre.
      const mismaLeccion = (k, x) => lessonNum(k) === (x.t.match(/^(\d+)/) || [])[1] &&
        norm(k.split('||')[0].replace(/^(?:Lesson|Lecci[oó]n)\s*\d+\s*:\s*/i, '')) === norm(this.stepItemName(x.t));
      const target = ls.find(x => !x.cur && !RE_ST_DONE.test(x.t)) ||
        ls.find(x => !x.cur && Object.entries(StorageManager.getScores()).some(([k, v]) => v < 100 && mismaLeccion(k, x)));
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

  // ▼▼▼ src/core/progress-map.js ▼▼▼
  // =====================================================================
  //  MAPA DE PROGRESO — lee "My Progress" (sin dar ningún test)
  // ---------------------------------------------------------------------
  //  NUEVO v21.8 (dumps de Hugo del 01/11). Página #/MyProgress/Course/<id>/Unit/:
  //    .myProgress__unitW → .myProgress__unitTitle ("Unit 1"), .myProgress__unitName, .myProgress__unitCompletionData
  //      ("100%"), bloqueada si .myProgress__unitHeader--locked. Se DESPLIEGA pulsando .myProgress__unitHeader.
  //    Desplegada → .myProgress__unitLesson: _number, _name, _testScore ("100%" | "No test"), _statusLabel
  //      ("Terminado"), pasos .myProgress__unitLesson_step (hecho: .myProgress__unitLesson_stepProgressIW--done).
  //  Guarda el mapa en ed:progress:v1. De ahí salen: unidades sin terminar, lecciones pendientes y los tests < 100
  //  (los únicos que se rehacen: cada intento parece contar en el promedio de ED).
  //  DEPENDE DE: utils/dom.js, utils/press.js
  //  EXPONE:     ProgressMap
  // =====================================================================

  const K_PROGRESS = 'ed:progress:v1';

  class ProgressMap {
    static get() { try { return JSON.parse(localStorage.getItem(K_PROGRESS) || 'null'); } catch (e) { return null; } }
    static set(m) { try { localStorage.setItem(K_PROGRESS, JSON.stringify(m)); } catch (e) {} }
    static isPage() { return /#\/MyProgress/i.test(location.href) || !!qv('.myProgress__main'); }

    // URL de My Progress a partir del Home (id del curso en la clase del carrusel: BSslide--523991431)
    static url() {
      const el = qa('[class*="BSslide--"]')[0];
      const id = el && (el.className.match(/BSslide--(\d+)/) || [])[1];
      return id ? location.href.split('#')[0] + '#/MyProgress/Course/' + id + '/Unit/' : null;
    }
    static async ir() {
      const b = qa('a, button, div, span').filter(e => vis(e) && /^(my progress|mi progreso)$/i.test(txt(e)) && !e.children.length)[0];
      if (b) { click(b); if (await waitFor(() => this.isPage(), 6000, 300)) return true; }
      const u = this.url(); if (u) { location.href = u; return !!(await waitFor(() => this.isPage(), 8000, 300)); }
      return false;
    }

    static async leer() {
      await waitFor(() => qa('.myProgress__unitW').length > 0, 8000, 300);
      const num = (el, d = null) => { const m = txt(el).match(/(\d{1,3})/); return m ? +m[1] : d; };
      const unidades = [];
      for (const uw of qa('.myProgress__unitW')) {
        const u = { n: num(q('.myProgress__unitTitle', uw), 0), nombre: txt(q('.myProgress__unitName', uw)),
          completion: num(q('.myProgress__unitCompletionData', uw)), locked: !!q('.myProgress__unitHeader--locked, .myProgress__unitLock--locked', uw), lecciones: [] };
        if (!u.locked) {
          if (!qa('.myProgress__unitLesson', uw).length) {
            try { uw.scrollIntoView({ block: 'center' }); } catch (e) {}
            await press(q('.myProgress__unitHeaderIW', uw) || q('.myProgress__unitHeader', uw) || uw, () => qa('.myProgress__unitLesson', uw).length > 0, 3000);
          }
          for (const L of qa('.myProgress__unitLesson', uw)) {
            const ts = txt(q('.myProgress__unitLesson_testScore', L)), m = ts.match(/(\d{1,3})\s*%/);
            const pasos = qa('.myProgress__unitLesson_step', L), hechos = pasos.filter(p => q('.myProgress__unitLesson_stepProgressIW--done', p)).length;
            const estado = txt(q('.myProgress__unitLesson_statusLabel', L));
            u.lecciones.push({ n: num(q('.myProgress__unitLesson_number', L), 0), nombre: txt(q('.myProgress__unitLesson_name', L)),
              test: m ? +m[1] : (/no test|sin (test|prueba)|no hay/i.test(ts) ? 'sin' : null),
              terminado: /terminad|complet|done|finaliz/i.test(estado) || (pasos.length > 0 && hechos === pasos.length), pasos: pasos.length, hechos });
          }
        }
        unidades.push(u);
      }
      const w = { completion: num(q('.home__studentWidgetCompletion .home__studentWidgetData, #home__studentWidgetCompletionData')), avg: num(q('.home__studentWidgetTestScores .home__studentWidgetData, #home__studentWidgetTestScoresData')) };
      const mapa = { fecha: new Date().toISOString(), widgets: w, unidades };
      this.set(mapa);
      const bajos = this.testsBajos(mapa), pend = this.leccionesPendientes(mapa);
      log('🗺️ My Progress leído:', unidades.length, 'unidades ·', pend.length, 'lecciones sin terminar ·', bajos.length, 'tests < 100',
        bajos.length ? '→ ' + bajos.map(b => `U${b.unidad} L${b.leccion} (${b.test} %)`).join(', ') : '');
      return mapa;
    }

    static testsBajos(m = this.get()) {
      return !m ? [] : m.unidades.flatMap(u => u.lecciones.filter(l => typeof l.test === 'number' && l.test < 100).map(l => ({ unidad: u.n, leccion: l.n, nombre: l.nombre, test: l.test })));
    }
    static leccionesPendientes(m = this.get()) {
      return !m ? [] : m.unidades.filter(u => !u.locked).flatMap(u => u.lecciones.filter(l => !l.terminado).map(l => ({ unidad: u.n, leccion: l.n, nombre: l.nombre })));
    }
    // ¿El test de esta lección quedó < 100 según My Progress? (permite rehacerlo aunque ED lo marque terminado)
    static testBajo(unidad, leccion) { return this.testsBajos().some(b => b.unidad === unidad && b.leccion === leccion); }
  }

  // ▼▼▼ src/core/sweep.js ▼▼▼
  // =====================================================================
  //  BARRIDO DE TESTS — busca tests con nota < 100, lección por lección y unidad por unidad
  // ---------------------------------------------------------------------
  //  NUEVO v20.8.  __ed.barrer()  → empieza desde donde estés (una lección o el Home).
  //                __ed.barrerStop() → lo desactiva.   __ed.barrerEstado() → qué lleva hecho.
  //  Dentro de una unidad (usa los desplegables de arriba, ya probados):
  //    1) en cada lección entra a su step de test (Test / Prueba / Repasemos / Review)
  //    2) si el test está en 100 → lección lista → siguiente lección
  //       si es < 100 o nunca se hizo → el flujo normal del bot lo rehace (exprés → review → reintento)
  //       si tras los reintentos no llega a 100 → lo anota en el reporte y SIGUE (no se detiene)
  //    3) sin más lecciones → unidad lista → va al Home (casita)
  //  En el Home: entra a la siguiente unidad desbloqueada (por número) con scroll hasta ella.
  //  ⚠ Pasar del Home a una unidad CAMBIA DE PÁGINA: para que el bot siga solo hace falta el
  //    cargador de Tampermonkey (tools/cargador.user.js). Sin él, vuelve a cargar el bot y
  //    escribe __ed.auto() en cada página nueva (el barrido recuerda por dónde iba).
  //  ⚠ SIN CONFIRMAR: qué pantalla aparece al pulsar una unidad en el Home (si es intermedia,
  //    el bot la anota en el reporte e intenta abrir la 1.ª lección).
  //  DEPENDE DE: core/dropdowns.js, core/navigation.js, tests/test-manager.js, utils/reporter.js
  //  EXPONE:     TestSweep
  // =====================================================================

  const K_SWEEP = 'ed:sweep:v1';

  class TestSweep {
    static get() { try { return JSON.parse(localStorage.getItem(K_SWEEP) || 'null'); } catch (e) { return null; } }
    static set(s) { if (s) localStorage.setItem(K_SWEEP, JSON.stringify(s)); else localStorage.removeItem(K_SWEEP); }
    static active() { const s = this.get(); return !!(s && s.active); }

    static start() {
      this.set({ active: true, phase: 'lesson', lessonsDone: [], unitsDone: [], resultados: [], homeUrl: null, inicio: new Date().toISOString() });
      log('🧭 Barrido de tests ACTIVADO. Busca tests < 100 lección por lección. (__ed.barrerStop() para quitarlo)');
    }
    static stop() { const s = this.get(); if (s) { s.active = false; this.set(s); } log('🧭 Barrido desactivado.'); }

    static unitNum() {
      const t = txt(q('.learning__dropDownList_unitName')) || txt(q('.learning__dropDownList_CourseUnitInfo'));
      return +((t.match(/Unit\s*(\d+)/i) || t.match(/(\d+)/) || [])[1] || 0);
    }
    static lessonKey() { return 'U' + this.unitNum() + '||' + NavigationManager.lessonLabel(); }

    static markLesson(pct, nota = '') {
      const s = this.get(); if (!s) return;
      const k = this.lessonKey();
      if (!s.lessonsDone.includes(k)) s.lessonsDone.push(k);
      const ul = this.unitNum() + '|' + (+lessonNum(NavigationManager.lessonLabel()) || 0);   // NUEVO v21.8
      s.objHechos = s.objHechos || []; if (!s.objHechos.includes(ul)) s.objHechos.push(ul);
      s.resultados.push({ unidad: this.unitNum(), leccion: NavigationManager.lessonLabel(), pct, nota });
      this.set(s);
    }
    static lessonDone() { const s = this.get(); return !!(s && s.lessonsDone.includes(this.lessonKey())); }
    // NUEVO v21.9: ¿en ESTA corrida (barrido/completar) ya me rendí con el test de esta lección (< 100 tras reintentos)?
    static rendido() {
      const s = this.get(); if (!s || !s.active) return false;
      const u = this.unitNum(), l = NavigationManager.lessonLabel();
      return (s.resultados || []).some(r => r.unidad === u && r.leccion === l && /sin 100/.test(r.nota || ''));
    }

    // Lo llama MainEngine.step() al principio, dentro del área de lecciones. null = sigue el flujo normal.
    static async lessonStep() {
      const s = this.get(); if (!s || !s.active) return null;
      // NUEVO v21.11: Unit Test en curso (buscarlo en el desplegable o dejar correr el test)
      if (s.ut && s.ut.actual) { const r = await UnitTests.enLeccion(s); if (r !== undefined) return r; }
      if (s.mode === 'completar') return await this.completarStep(s);   // NUEVO v21.3
      if (s.mapaHecho && Array.isArray(s.objetivos)) return await this.objetivosStep(s);   // NUEVO v21.8: con mapa
      if (s.phase === 'entering_unit' || s.phase === 'home') {
        s.phase = 'lesson'; this.set(s);
        log('🧭 Barrido: unidad', this.unitNum(), '→ empiezo por la lección 1');
        if (lessonNum(NavigationManager.lessonLabel()) !== '1' && await DropdownNav.gotoLesson(1)) return { did: 'sweep_lesson1' };
      }
      const enTest = RE_TEST_STEP.test(NavigationManager.stepLabel()) || TestManager.isTestStart() || TestManager.isScore() || TestManager.isReview() || TestManager.inTest();
      const run = StorageManager.getRun();
      if (enTest || (run && (run.phase === 'review' || run.phase === 'replay'))) {
        if (!(TestManager.isScore() && this.lessonDone())) return null;   // test en curso → flujo normal
      }
      if (!this.lessonDone()) {
        log('🧭 Barrido: voy al test de', NavigationManager.lessonLabel());
        if (await DropdownNav.gotoStep(RE_TEST_ITEM)) return { did: 'sweep_goto_test' };
        this.markLesson(null, 'sin step de test');
      }
      return await this.nextLesson();
    }

    // NUEVO v21.8 — barrido con MAPA: solo los tests que My Progress muestra < 100, yendo directo a cada uno
    static pendientesObj(s) { return (s.objetivos || []).filter(o => !(s.objHechos || []).includes(o.unidad + '|' + o.leccion)); }
    static async objetivosStep(s) {
      if (s.phase !== 'lesson') { s.phase = 'lesson'; this.set(s); }
      const u = this.unitNum(), ln = +lessonNum(NavigationManager.lessonLabel()) || 0;
      const pend = this.pendientesObj(s);
      if (pend.some(o => o.unidad === u && o.leccion === ln)) {
        const enTest = RE_TEST_STEP.test(NavigationManager.stepLabel()) || TestManager.isTestStart() || TestManager.isScore() || TestManager.isReview() || TestManager.inTest();
        const run = StorageManager.getRun();
        if (enTest || (run && (run.phase === 'review' || run.phase === 'replay'))) { if (!(TestManager.isScore() && this.lessonDone())) return null; }
        if (!this.lessonDone()) {
          log('🎯 Test < 100 según My Progress →', NavigationManager.lessonLabel());
          if (await DropdownNav.gotoStep(RE_TEST_ITEM)) return { did: 'sweep_goto_test' };
          this.markLesson(null, 'sin step de test');
        }
      }
      const resto = this.pendientesObj(this.get());
      const otra = resto.find(o => o.unidad === u);
      if (otra) { log('🎯 Siguiente test < 100 en esta unidad → lección', otra.leccion); await DropdownNav.gotoLesson(otra.leccion); return { did: 'sweep_next_lesson', leccion: otra.leccion }; }
      log(resto.length ? '🎯 Quedan tests < 100 en otras unidades → Home' : '🏁 Ya no quedan tests < 100 → Home');
      return await this.irHome();
    }

    static async nextLesson() {
      const cur = +lessonNum(NavigationManager.lessonLabel()) || 0;
      const sig = DropdownNav.items('lessons').map(x => +((x.t.match(/^(\d+)\s*\./) || [])[1] || 0)).filter(n => n > cur).sort((a, b) => a - b)[0];
      if (sig) { log('🧭 Barrido: siguiente lección →', sig); await DropdownNav.gotoLesson(sig); return { did: 'sweep_next_lesson', leccion: sig }; }
      const s = this.get();
      if (!s.unitsDone.includes(this.unitNum())) s.unitsDone.push(this.unitNum());
      this.set(s);
      log('🏁 Barrido: unidad', this.unitNum(), 'terminada → voy al Home');
      await this.irHome();
      return { did: 'sweep_unit_done' };
    }

    // ===================== HOME (dumps del 31/10) =====================
    // Tarjetas .home__unitW--notLocked (número .home__detailsNumber, título .home__detailsTitle; las hechas
    // muestran "Completed!"). Al PULSAR una tarjeta NO se entra: se despliega su lista de lecciones
    // (.home__courseListItem > .home__courseListItemLink / Number / Name / Progress). Se entra con la lección.
    // Widgets: .home__studentWidgetCompletion ("25% Course Completion") y .home__studentWidgetTestScores ("95%").
    static leerWidgets() {
      const num = sel => { const m = txt(q(sel)).match(/(\d{1,3})\s*%/); return m ? +m[1] : null; };
      return { completion: num('.home__studentWidgetCompletion'), avg: num('.home__studentWidgetTestScores'), curso: this.curso() };
    }
    // NUEVO v21.12 — Roy (02/11): Hugo vio en el Home "UPB Beginners 1" (51 %) y creyó que se había borrado todo; el bot
    // trabajó en "UPB Beginners 2" (97 %). El Home tiene un carrusel con los cursos (flechas ‹ ›). Ahora el bot anota
    // en qué curso trabaja (registro y resumen).
    static curso() {
      const c = txt(q('.learning__dropDownList_courseName'));
      if (c) return c;
      const t = qa('[class*="BSslide"] h1, [class*="BSslide"] h2, [class*="arousel"] h1, [class*="arousel"] h2, h1, h2').filter(vis).map(e => txt(e))
        .find(x => x && x.length < 60 && /UPB|Beginners|Basic|Intermediate|Advanced|Elementary|Pre-?Intermediate|Level/i.test(x));
      return t || null;
    }
    static unidades() {
      return qa('.home__unitW--notLocked').map(u => ({ el: u, n: +((txt(q('.home__detailsNumber', u)).match(/\d+/) || [0])[0]),
        t: txt(q('.home__detailsTitle', u)), completa: /completed|completad|terminad/i.test(txt(u)) }));   // AJUSTADA v21.6: ED en español dice "¡Terminado!"
    }
    // Progreso de una lección en la lista (si ED lo pone como ancho de una barra); null si no se puede leer
    static progresoLeccion(it) {
      const p = q('.home__courseListItemProgress', it); if (!p) return null;
      const b = [p, ...qa('*', p)].find(e => /width\s*:\s*\d/.test(e.getAttribute('style') || ''));
      const m = b && (b.getAttribute('style') || '').match(/width\s*:\s*([\d.]+)%/);
      return m ? +m[1] : null;
    }
    // Abre la unidad (despliega su lista) y entra a la 1.ª lección no completa (o la 1.ª). false si no pudo.
    static async abrirUnidad(u, preferida = null) {   // AJUSTADA v21.8: preferida = n.º de lección (del mapa)
      try { u.el.scrollIntoView({ block: 'center' }); } catch (e) {}
      await sleep(700);
      const caja = () => u.el.closest('.home__unitW') || u.el;
      let lista = qav('.home__courseListItem', caja());
      // AJUSTADA v21.6 (corrida en la nube del 31/10: "home_no_abre_lista_de_lecciones"): la lista aparece al PASAR
      // EL MOUSE por la tarjeta (sale la franja "Lecciones"), no con un clic. Se prueba: pasar por encima → clic en
      // la franja "Lecciones"/"Lessons" → clic en la tarjeta. Cada intento se comprueba.
      const hay = () => qav('.home__courseListItem', caja()).length > 0 || qav('.home__courseListItem').length > 0;
      const encima = el => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 3;
        for (const t of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'mousemove']) { try { el.dispatchEvent(new MouseEvent(t, { bubbles: !/enter/.test(t), clientX: x, clientY: y, view: window })); } catch (e) {} } };
      if (!hay()) {
        for (const el of [u.el, q('.home__unitIW', u.el), q('.home__unit', u.el)].filter(Boolean)) encima(el);
        await waitFor(hay, 1500, 150);
      }
      if (!hay()) {
        const franja = qa('*', caja().parentElement || caja()).filter(e => vis(e) && /^(lecciones|lessons)$/i.test(txt(e)) && !e.children.length)[0];
        if (franja) await press(franja, hay, 1500);
      }
      if (!hay()) await press(q('.home__unit', u.el) || q('.home__unitIW', u.el) || u.el, hay, 2000);
      lista = qav('.home__courseListItem', caja());
      if (!lista.length) lista = qav('.home__courseListItem');   // por si ED pinta la lista fuera de la tarjeta
      if (!lista.length) return false;
      const numL = x => +((txt(q('.home__courseListItemNumber', x)).match(/\d+/) || [0])[0]);
      // AJUSTADA v21.11: preferida puede ser una función (p. ej. el ítem "Unit Test"); si ninguno cumple → false
      if (typeof preferida === 'function' && !lista.some(preferida)) return false;
      const it = (typeof preferida === 'function' && lista.find(preferida)) || (preferida && lista.find(x => numL(x) === preferida)) || lista.find(x => { const pr = this.progresoLeccion(x); return pr != null && pr < 100; }) || lista[0];
      const link = q('.home__courseListItemLink', it) || it;
      log('🧭 Unidad', u.n, '→ lección', txt(q('.home__courseListItemNumber', it)) + ' ' + txt(q('.home__courseListItemName', it)));
      click(link);
      await sleep(5000);
      return true;
    }
    static async irHome() {
      const s = this.get(); if (s) { s.phase = 'home'; this.set(s); }
      try { localStorage.setItem('ed:saliendo', String(Date.now())); } catch (e) {}   // NUEVO v21.7: el aviso "test sin enviar" → Continue
      const home = qv('.sitemenu__itemHome--learningArea a') || qv('.sitemenu__itemHome--learningArea') || qv('.sitemenu__itemHome a') || qv('.sitemenu__itemHome');
      if (home) click(home); else if (s && s.homeUrl) location.href = s.homeUrl;
      await sleep(4000);
      return { did: 'sweep_home' };
    }

    // ===================== MODO "COMPLETAR" (NUEVO v21.3) =====================
    // Hace TODO el curso unidad por unidad (prácticas + tests); al final, si el promedio de tests < 100,
    // pasa solo al barrido de tests. Lo que no logra queda en el reporte y sigue con lo siguiente.
    static startCompletar() {
      this.set({ active: true, mode: 'completar', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [], homeUrl: null, inicio: new Date().toISOString() });
      log('🚀 Modo COMPLETAR activado: todas las unidades → luego tests < 100. (__ed.barrerStop() para quitarlo)');
    }

    static async completarHome(s) {
      s.widgets = this.leerWidgets(); this.set(s);
      log('📊 Curso:', s.widgets.curso || '(no lo pude leer)', '· Course Completion', s.widgets.completion + '%', '· Average Test Score', s.widgets.avg + '%');
      // AJUSTADA v21.8: con el mapa de My Progress, las unidades pendientes son las de realización < 100 %
      const m = ProgressMap.get(), conMapa = s.mapaHecho && m && m.unidades && m.unidades.length;
      const nums = conMapa ? m.unidades.filter(x => !x.locked && (x.completion == null || x.completion < 100)).map(x => x.n) : null;
      const pend = this.unidades().filter(u => (nums ? nums.includes(u.n) : !u.completa) && !s.unitsDone.includes(u.n)).sort((a, b) => a.n - b.n);
      if (!pend.length) {
        // NUEVO v21.11: unidades recorridas → Unit Tests sin hacer o < 100 (los que están en 100 no)
        { const r = await UnitTests.enHome(s, true); if (r) return r; }
        if (!s.testsHechos && (conMapa ? ProgressMap.testsBajos(m).length > 0 || (s.widgets.avg != null && s.widgets.avg < 100) : s.widgets.avg != null && s.widgets.avg < 100)) {
          // mapaHecho = false → se vuelve a leer My Progress (los puntajes pudieron cambiar) antes del barrido
          Object.assign(s, { mode: 'tests', phase: 'home', unitsDone: [], lessonsDone: [], objHechos: [], testsHechos: true, mapaHecho: false }); this.set(s);
          log('🧭 Unidades recorridas; promedio de tests', s.widgets.avg + '% → barrido de tests < 100');
          return { did: 'completar_a_tests' };
        }
        s.active = false; s.fin = new Date().toISOString(); this.set(s);
        log('🏁 COMPLETAR terminado.', s.widgets);
        window.__ed.stop();
        return { did: 'completar_fin', widgets: s.widgets };
      }
      const u = pend[0];
      const lu = conMapa ? (m.unidades.find(x => x.n === u.n) || { lecciones: [] }).lecciones.find(l => !l.terminado) : null;   // NUEVO v21.8
      Object.assign(s, { phase: 'entering_unit', unitTarget: u.n, unitStart: Date.now() }); this.set(s);
      if (!(await this.abrirUnidad(u, lu ? lu.n : null))) {
        Reporter.capture('home_no_abre_lista_de_lecciones', { unidad: u.n, titulo: u.t });
        const s2 = this.get(); s2.unitsDone.push(u.n); s2.phase = 'home'; this.set(s2);
        return { did: 'completar_unidad_fallida', unidad: u.n };
      }
      return { did: 'completar_abre_unidad', unidad: u.n };
    }

    static async completarStep(s) {
      if (s.phase === 'entering_unit' || s.phase === 'home') { s.phase = 'in_unit'; s.unitStart = s.unitStart || Date.now(); s.unitTarget = s.unitTarget || this.unitNum(); this.set(s); }
      const u = this.unitNum();
      if (s.unitTarget && u && u !== s.unitTarget) {   // ED pasó sola a la unidad siguiente
        if (!s.unitsDone.includes(s.unitTarget)) s.unitsDone.push(s.unitTarget);
        Object.assign(s, { unitTarget: u, unitStart: Date.now() }); this.set(s);
        log('🧭 Pasé a la unidad', u);
      }
      // Atasco: misma pantalla 6 pasos seguidos, o demasiado tiempo en la unidad
      const firma = NavigationManager.screenSig() + '|' + (TestManager.isScore() ? 'score' : '') + '|' + (TestManager.isReview() ? 'rev' : '');
      TestSweep._same = firma === TestSweep._firma ? (TestSweep._same || 0) + 1 : 0; TestSweep._firma = firma;
      const min = (Date.now() - (s.unitStart || Date.now())) / 60000;
      const tope = min > (CFG.maxMinPorUnidad || 150);
      if (TestSweep._same >= 6 || tope) {
        TestSweep._same = 0;
        // AJUSTADA v21.7: si el "pendiente" es siempre el MISMO (corrida de Nelson: el mismo test 257 veces en 2,5 h),
        // a la 3.ª vez se da por perdido y se sigue con la siguiente unidad.
        const dondeAhora = this.unitNum() + '|' + txt(qv('.learning__dropDownListTitleW--lessons')) + '|' + txt(qv('.learning__dropDownListTitleW--steps'));
        // AJUSTADA v21.10 — 2.ª corrida de Jose (unidad 12): saltaba ALTERNANDO Drama ↔ Family y el conteo "seguido" se
        // reiniciaba en cada cambio (40 min). Ahora se cuentan los atascos de CADA lugar.
        // AJUSTADA v21.11 (regla 4 de Hugo): 2 atascos en el mismo lugar (antes 3) → unidad perdida, se sigue.
        TestSweep._saltosPor = TestSweep._saltosPor || {};
        TestSweep._saltos = TestSweep._saltosPor[dondeAhora] = (TestSweep._saltosPor[dondeAhora] || 0) + 1;
        const mismo = TestSweep._saltos >= 2;
        // AJUSTADA v21.12: el reporte (dump completo) se toma en CADA atasco, no solo en el 2.º
        Reporter.capture('atascado_en_el_mismo_lugar', { donde: dondeAhora, veces: TestSweep._saltos });
        try { localStorage.setItem('ed:saliendo', String(Date.now())); } catch (e) {}
        if (!tope) {
          // NUEVO v21.12 — corrida de Mateo (02/11): la UNIDAD 8 ENTERA quedó sin hacer. Atascado en "Lesson 2 · Step 1:
          // Explore" (Next no avanzaba), "voy a lo pendiente" lo devolvía AL MISMO paso y al 3.er atasco se abandonaba
          // la unidad (lecciones 2–6 sin tocar). Igual con Roy y Jose en el test ya hecho de la lección 1 (U3, U5, U7,
          // U8): volvía al Explore pendiente y abandonaba. Ahora PRIMERO se avanza (siguiente paso; si es el último, la
          // siguiente lección) y solo al final de la unidad se vuelve a lo pendiente (una vez por lugar).
          const a = await this.avanzar();
          if (a) { log('🧭 Atasco → avanzo a', a); return { did: 'completar_avance', a }; }
          if (!mismo) { const r = await DropdownNav.gotoNextIncomplete(); if (r) { log('🧭 Atasco → voy a lo pendiente:', r); return { did: 'completar_salto', a: r }; } }
        } else Reporter.capture('unidad_sin_terminar_por_tiempo', { unidad: u, minutos: Math.round(min) });
        const s2 = this.get(); if (!s2.unitsDone.includes(u)) s2.unitsDone.push(u); this.set(s2);
        log('🏁 Unidad', u, tope ? 'cortada por tiempo' : 'sin pendientes', '→ Home');
        return await this.irHome();
      }
      return null;   // flujo normal: prácticas y tests
    }

    // NUEVO v21.12 — avanzar por los desplegables: siguiente paso de esta lección o, si es el último, la siguiente lección.
    // Se VERIFICA que cambió la lección o el paso; si no cambió nada → null.
    static async avanzar() {
      const num = t => +((String(t).match(/^(\d+)\s*\./) || [])[1] || 0);
      const antes = NavigationManager.lessonLabel() + '|' + NavigationManager.stepLabel();
      const cambio = () => NavigationManager.lessonLabel() + '|' + NavigationManager.stepLabel() !== antes;
      const pasoAct = +stepNum(NavigationManager.stepLabel()) || 0;
      const pasos = DropdownNav.items('steps').map(x => num(x.t)).filter(n => n > pasoAct).sort((a, b) => a - b);
      if (pasos.length && await DropdownNav.gotoStep(pasos[0]) && await waitFor(cambio, 4000, 300)) return 'paso ' + pasos[0];
      const lecAct = +lessonNum(NavigationManager.lessonLabel()) || 0;
      const lecs = DropdownNav.items('lessons').map(x => num(x.t)).filter(n => n > lecAct).sort((a, b) => a - b);
      if (lecs.length && await DropdownNav.gotoLesson(lecs[0]) && await waitFor(cambio, 4000, 300)) return 'lección ' + lecs[0];
      return null;
    }

    // Fuera del área de lecciones (Home u otra página)
    static async pageStep() {
      const s = this.get(); if (!s || !s.active) return null;
      if (!/^https?:$/.test(location.protocol)) return { did: 'sweep_pagina_en_blanco' };   // NUEVO v21.6: about:blank no cuenta
      // NUEVO v21.6: "Tu sesión no está más activa en tu dispositivo" (ED cerró la sesión: la cuenta se abrió en otro
      // lugar o venció) → Aceptar y esperar el login (lo hace el robot de la nube, o tú si estás en tu PC).
      if (/no est[aá] m[aá]s activa|no longer active|vuelve a acceder/i.test((document.body && document.body.innerText) || '')) {   // solo texto VISIBLE
        Reporter.capture('sesion_cerrada_por_ed', { nota: '¿Se abrió esta cuenta en otro lugar mientras corría el bot?' });
        const ok = qa('button, a, input[type=button]').filter(vis).find(b => /^(aceptar|accept|ok)$/i.test(txt(b) || b.value || ''));
        if (ok) { click(ok); await sleep(2500); }
        return { did: 'sesion_cerrada_por_ed' };
      }
      if (/#\/login/i.test(location.href) || qv('input[name="userName"]')) return { did: 'esperando_login' };   // sin sesión: no anotar fallos
      // NUEVO v21.8 — My Progress: leer el mapa (unidades, lecciones, Last Test Score) y volver al Home
      if (ProgressMap.isPage()) {
        if (s.mapaHecho) { const r = await UnitTests.enMyProgress(s); if (r) return r; }   // NUEVO v21.11
        const homeUrl = s.homeUrl || location.href.split('#')[0] + '#/home';
        if (!s.mapaHecho) {
          const mapa = await ProgressMap.leer();
          Object.assign(s, { mapaHecho: true, sinMapa: !mapa.unidades.length, objetivos: ProgressMap.testsBajos(mapa).filter(o => o.leccion > 0), objHechos: s.objHechos || [], phase: 'home', homeUrl, widgets: mapa.widgets.completion != null ? mapa.widgets : s.widgets });
          this.set(s);
          if (!mapa.unidades.length) Reporter.capture('my_progress_sin_unidades');
        }
        location.href = homeUrl; await sleep(4000);
        return { did: 'mapa_leido', tests_bajos: (s.objetivos || []).length };
      }
      if (/#\/home/i.test(location.href) || qv('.home__unitW')) {
        s.homeUrl = location.href.split('#')[0] + '#/home'; this.set(s);
        // NUEVO v21.8: antes de nada, leer My Progress (una vez por fase); si no se puede, se sigue sin mapa
        if (!s.mapaHecho && !s.sinMapa) {
          if (await ProgressMap.ir()) return { did: 'voy_a_my_progress' };
          s.sinMapa = true; this.set(s); Reporter.capture('no_pude_abrir_my_progress');
        }
        // NUEVO v21.11: un Unit Test a medio camino (buscándolo o recién salido de él)
        if (s.ut && s.ut.actual) { const r = await UnitTests.enHome(s, s.mode === 'completar'); if (r) return r; }
        if (s.mode !== 'completar' && s.mapaHecho && Array.isArray(s.objetivos)) {   // NUEVO v21.8: barrido con mapa
          const o = this.pendientesObj(s)[0];
          if (!o) {
            // NUEVO v21.11: antes de terminar, los Unit Tests < 100 (según My Progress)
            { const r = await UnitTests.enHome(s, false); if (r) return r; }
            s.active = false; s.fin = new Date().toISOString(); this.set(s);
            // AJUSTADA v21.11: el mensaje decía "no quedan tests < 100" aunque quedara uno del que se rindió
            const rendidos = (s.resultados || []).filter(r => /sin 100/.test(r.nota || ''));
            log(rendidos.length ? '🏁 BARRIDO TERMINADO. Quedaron < 100 (anotados en el reporte): ' + rendidos.map(r => 'U' + r.unidad + ' ' + r.leccion + ' (' + r.pct + ' %)').join(', ') : '🏁 BARRIDO COMPLETO: no quedan tests < 100.');
            window.__ed.stop(); return { did: 'sweep_finished', resultados: s.resultados };
          }
          const u = this.unidades().find(x => x.n === o.unidad);
          if (!u) { s.objHechos.push(o.unidad + '|' + o.leccion); this.set(s); Reporter.capture('objetivo_sin_unidad_en_home', o); return { did: 'objetivo_saltado', o }; }
          Object.assign(s, { phase: 'entering_unit', unitTarget: u.n }); this.set(s);
          log('🎯 Voy al test < 100: unidad', o.unidad, 'lección', o.leccion, '(' + o.test + ' %)');
          if (!(await this.abrirUnidad(u, o.leccion))) { s.objHechos.push(o.unidad + '|' + o.leccion); this.set(s); Reporter.capture('home_no_abre_lista_de_lecciones', { unidad: u.n }); }
          return { did: 'sweep_open_unit', unidad: u.n, leccion: o.leccion };
        }
        if (s.mode === 'completar') return await this.completarHome(s);
        s.widgets = this.leerWidgets(); this.set(s);
        const units = this.unidades();
        // AJUSTADA v21.6: todas las unidades aún no revisadas en este barrido (antes solo las posteriores a la última)
        const sig = units.filter(u => !s.unitsDone.includes(u.n)).sort((a, b) => a.n - b.n)[0];
        if (!sig) {
          s.active = false; s.fin = new Date().toISOString(); this.set(s);
          log('🏁 BARRIDO COMPLETO. Resultados:', s.resultados);
          if (!units.length) Reporter.capture('barrido_home_sin_unidades');
          window.__ed.stop();
          return { did: 'sweep_finished', resultados: s.resultados };
        }
        Object.assign(s, { phase: 'entering_unit', unitTarget: sig.n }); this.set(s);
        log('🧭 Barrido: entrando a la unidad', sig.n, sig.t);
        // AJUSTADA v21.3: pulsar la tarjeta solo DESPLIEGA la lista; hay que pulsar una lección para entrar
        if (!(await this.abrirUnidad(sig))) {
          Reporter.capture('home_no_abre_lista_de_lecciones', { unidad: sig.n });
          const s2 = this.get(); s2.unitsDone.push(sig.n); s2.phase = 'home'; this.set(s2);
        }
        return { did: 'sweep_open_unit', unidad: sig.n };
      }
      // AJUSTADA v21.3: página desconocida → anotar y, si se repite 15 veces, volver al Home (no dar vueltas sin fin)
      Reporter.capture('barrido_pagina_desconocida');
      TestSweep._unk = (TestSweep._unk || 0) + 1;
      if (TestSweep._unk >= 15 && s.homeUrl) { TestSweep._unk = 0; log('🧭 Página desconocida varias veces → vuelvo al Home'); location.href = s.homeUrl; await sleep(5000); return { did: 'sweep_unknown_go_home' }; }
      return { did: 'sweep_unknown_page' };
    }
  }

  // ▼▼▼ src/core/unit-tests.js ▼▼▼
  // =====================================================================
  //  UNIT TESTS — encontrarlos, entrar y hacerlos con la misma política que los tests de lección
  // ---------------------------------------------------------------------
  //  NUEVO v21.11. Corridas de Jose: My Progress lista en cada unidad una fila "Unit Test" (sin número) y el bot
  //  NUNCA entró a ninguno. ⚠ SIN CONFIRMAR dónde se abren. Se prueban candidatos EN ORDEN, verificando cada uno
  //  (regla 3 de Hugo); si ninguno sirve, queda el reporte con dump completo y se sigue:
  //    1) My Progress: la fila "Unit Test" de esa unidad (enlace → nombre → puntaje → fila → botón)
  //    2) Home: la lista de lecciones de la tarjeta (al pasar el mouse) → ítem "Unit Test"
  //    3) dentro de la unidad: el desplegable de lecciones → ítem "Unit Test"
  //  Política (Hugo): completar → los no hechos y los < 100; barrido → solo los < 100. Los que están en 100 NO.
  //  Dentro, el flujo de tests de siempre (Start → cosecha → reintento). Al salir del test → listo → Home.
  //  Estado en el barrido (ed:sweep:v1) → s.ut = { actual, hechos, resultados }.
  //  DEPENDE DE: core/progress-map.js, core/sweep.js, core/dropdowns.js, tests/test-manager.js (en ejecución)
  //  EXPONE:     UnitTests
  // =====================================================================

  class UnitTests {
    static esFila(t) { return /unit\s*test|prueba\s*de\s*(la\s*)?unidad|examen\s*de\s*(la\s*)?unidad/i.test(t || ''); }

    // De My Progress: completar (todos=true) → sin hacer o < 100; barrido → solo < 100. Nunca los que están en 100.
    static pendientes(m, hechos, todos) {
      if (!m || !m.unidades) return [];
      return m.unidades.filter(u => !u.locked).flatMap(u => (u.lecciones || []).filter(l => this.esFila(l.nombre)).map(l => ({ unidad: u.n, test: l.test, terminado: l.terminado })))
        .filter(x => !hechos.includes(x.unidad) && (typeof x.test === 'number' ? x.test < 100 : !!todos && !x.terminado));
    }
    static estado(s) { s.ut = s.ut || {}; s.ut.hechos = s.ut.hechos || []; s.ut.resultados = s.ut.resultados || []; return s.ut; }
    static terminar(s, res) {
      const ut = this.estado(s), a = ut.actual;
      if (a) { ut.hechos.push(a.unidad); ut.resultados.push({ unidad: a.unidad, res, metodo: a.metodo || null }); }
      ut.actual = null; TestSweep.set(s);
      log('📝 Unit Test de la unidad', a ? a.unidad : '?', '→', res);
    }

    // En el Home. Devuelve una acción, o null si no hay Unit Tests que hacer (sigue el flujo de siempre).
    static async enHome(s, todos) {
      const ut = this.estado(s);
      if (!ut.actual) {
        const p = this.pendientes(ProgressMap.get(), ut.hechos, todos);
        if (!p.length) return null;
        ut.actual = { unidad: p[0].unidad, test: p[0].test, fase: 'buscar', intento: 0, pasos: 0 };
        TestSweep.set(s);
        log('📝 Unit Test de la unidad', p[0].unidad, typeof p[0].test === 'number' ? '(' + p[0].test + ' %)' : '(sin hacer)', '→ lo busco');
      }
      const a = ut.actual;
      if (a.fase === 'dentro' || a.fase === 'desplegable') {   // volvió al Home: si llegó a ver el test, está hecho
        if (!a.vioTest) Reporter.capture('unit_test_no_aparecio', { unidad: a.unidad, metodo: a.metodo || a.fase });
        this.terminar(s, a.vioTest ? 'hecho' : 'no_aparecio_el_test');
        return { did: 'unit_test_fin', unidad: a.unidad };
      }
      if (a.intento === 0) {
        if (await ProgressMap.ir()) return { did: 'unit_test_voy_a_my_progress', unidad: a.unidad };
        a.intento = 1; TestSweep.set(s);
      }
      const u = TestSweep.unidades().find(x => x.n === a.unidad);
      if (a.intento === 1) {
        a.intento = 2; TestSweep.set(s);
        if (u && await TestSweep.abrirUnidad(u, it => this.esFila(txt(it)))) {
          Object.assign(a, { fase: 'dentro', metodo: 'home', desde: Date.now() }); TestSweep.set(s);
          return { did: 'unit_test_entrando', unidad: a.unidad, metodo: 'home' };
        }
      }
      if (a.intento === 2) {
        Object.assign(a, { intento: 3, fase: 'desplegable' }); TestSweep.set(s);
        if (u && await TestSweep.abrirUnidad(u)) return { did: 'unit_test_busco_en_desplegable', unidad: a.unidad };
      }
      Reporter.capture('unit_test_no_encontrado', { unidad: a.unidad, donde: 'home', lista: qa('.home__courseListItem').map(x => txt(x).slice(0, 50)).slice(0, 15) });
      this.terminar(s, 'no_encontrado');
      return { did: 'unit_test_no_encontrado', unidad: a.unidad };
    }

    // En My Progress (paso 1). null = no le toca.
    static async enMyProgress(s) {
      const a = s.ut && s.ut.actual;
      if (!a || a.fase !== 'buscar' || a.intento !== 0) return null;
      a.intento = 1; TestSweep.set(s);
      const metodo = await this.desdeMyProgress(a.unidad);
      if (metodo) {
        Object.assign(a, { fase: 'dentro', metodo: 'my_progress:' + metodo, desde: Date.now() }); TestSweep.set(s);
        return { did: 'unit_test_entrando', unidad: a.unidad, metodo: 'my_progress:' + metodo };
      }
      Reporter.capture('unit_test_no_entra_desde_my_progress', { unidad: a.unidad, fila: this._fila || null });
      location.href = s.homeUrl || location.href.split('#')[0] + '#/home'; await sleep(4000);
      return { did: 'unit_test_sigo_buscando', unidad: a.unidad };
    }
    static async desdeMyProgress(n) {
      this._fila = null;
      await waitFor(() => qa('.myProgress__unitW').length > 0, 8000, 300);
      const uw = qa('.myProgress__unitW').find(x => +((txt(q('.myProgress__unitTitle', x)).match(/\d+/) || [0])[0]) === n);
      if (!uw) return null;
      if (!qa('.myProgress__unitLesson', uw).length) {
        try { uw.scrollIntoView({ block: 'center' }); } catch (e) {}
        await press(q('.myProgress__unitHeaderIW', uw) || q('.myProgress__unitHeader', uw) || uw, () => qa('.myProgress__unitLesson', uw).length > 0, 3000);
      }
      const fila = qa('.myProgress__unitLesson', uw).find(L => this.esFila(txt(q('.myProgress__unitLesson_name', L))));
      if (!fila) return null;
      this._fila = (fila.outerHTML || '').replace(/\s+/g, ' ').slice(0, 1500);
      const salio = () => !ProgressMap.isPage() || TestManager.isTestStart() || /learningArea/i.test(location.href);
      const cands = [['enlace', q('a', fila)], ['nombre', q('.myProgress__unitLesson_name', fila)], ['puntaje', q('.myProgress__unitLesson_testScore', fila)],
        ['boton', q('button, [role="button"], [class*="btn" i], [class*="Link"]', fila)], ['fila', fila]].filter(([, e]) => e);
      for (const [nombre, el] of cands) {
        try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
        if (await press(el, salio, 4000)) return nombre;
      }
      return null;
    }

    // En el área de lecciones. undefined = no hay Unit Test en curso; null = flujo normal (el test); objeto = acción.
    static async enLeccion(s) {
      const a = s.ut && s.ut.actual;
      if (!a) return undefined;
      if (a.fase === 'desplegable') {   // paso 3: buscar "Unit Test" en el desplegable de lecciones de la unidad
        const d = await DropdownNav.open('lessons');
        const it = d ? DropdownNav.items('lessons').find(x => this.esFila(x.t)) : null;
        if (it) {
          Object.assign(a, { fase: 'dentro', metodo: 'desplegable', desde: Date.now() }); TestSweep.set(s);
          click(it.el); await sleep(4500); await NavigationManager.handleModals();
          return { did: 'unit_test_entrando', unidad: a.unidad, metodo: 'desplegable' };
        }
        if (d) await DropdownNav.close(d);
        Reporter.capture('unit_test_no_encontrado', { unidad: a.unidad, donde: 'desplegable', lecciones: DropdownNav.items('lessons').map(x => x.t.slice(0, 50)).slice(0, 15) });
        this.terminar(s, 'no_encontrado');
        return await TestSweep.irHome();
      }
      if (a.fase !== 'dentro') return undefined;
      const run = StorageManager.getRun();
      const enTest = TestManager.isTestStart() || TestManager.inTest() || TestManager.isScore() || TestManager.isReview() || !!(run && (run.phase === 'review' || run.phase === 'replay'));
      if (enTest) { if (!a.vioTest) { a.vioTest = true; TestSweep.set(s); log('📝 Dentro del Unit Test de la unidad', a.unidad); } return null; }
      a.pasos = (a.pasos || 0) + 1; TestSweep.set(s);
      if (a.vioTest) { this.terminar(s, 'hecho'); return await TestSweep.irHome(); }
      if (a.pasos >= 6) { Reporter.capture('unit_test_no_aparece', { unidad: a.unidad, metodo: a.metodo }); this.terminar(s, 'no_aparecio_el_test'); return await TestSweep.irHome(); }
      return null;   // p. ej. una pantalla de introducción: el flujo normal pulsa Next
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
          const it = pick(bankItems(m.bank), w);   // AJUSTADA v21.0: exacta (mayúsculas) primero
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
        // NUEVO v21.7 — opciones con IMÁGENES (reporte Watch again · "Choose the correct picture"): no hay labels;
        // se pulsa la imagen (o su caja). Práctica: la 1.ª basta; ED marca la correcta y la tarea.
        if (!labels.length) {
          // AJUSTADA v21.12 — Mateo (U10 L4 · Watch again, "Choose the correct picture"): marked 0. Las imágenes todavía
          // cargaban (sin tamaño = invisibles) → esperar hasta 20 s; pulsar VERIFICANDO (imagen → su caja → la opción)
          // y, si ED no marca la tarea, la siguiente imagen (Hugo: "solo tocar en una imagen que es como seleccionable").
          const ops = () => qa('.prMCQ__answers', s).filter(e => vis(e) && (q('.prMCQ__answerImage', e) ? vis(q('.prMCQ__answerImage', e)) : true));
          await waitFor(() => ops().length > 0, 20000, 400);
          if (q('.selection--v, .prMCQ__answerImage--correct', s)) continue;
          const tn = NavigationManager.curTask()?.n;
          // la verificación: cambió alguna clase de la opción (el dump real trae selection--x, --incorrect, correct,
          // checked) o ED marcó la tarea; mCS_* lo pone el scroll al cargar la imagen, no cuenta
          const firmaOp = op => [op, ...qa('*', op)].map(e => (typeof e.className === 'string' ? e.className : '')).join('|').replace(/\bmCS\w*/g, '');
          for (const op of ops().slice(0, 6)) {
            const yaElegida = () => !!q('.selection--v, .selection--x, .prMCQ__answerImage--correct, .prMCQ__answerImage--incorrect', op) || /selection--|--correct|--incorrect/.test(op.className);
            if (yaElegida()) continue;
            const f0 = firmaOp(op);
            for (const el of [q('.prMCQ__answerImage', op), q('.multiRadioWrapper', op), op].filter(Boolean)) { if (await press(el, () => firmaOp(op) !== f0 || yaElegida() || !!(tn && NavigationManager.taskDone(tn)), 2000)) { marked++; break; } }
            await sleep(400);
            if (TestManager.inTest()) break;   // en un TEST una sola imagen (como v21.11): probar varias cambiaría la respuesta
            if (q('.selection--v, .prMCQ__answerImage--correct', s)) break;
            if (tn && await waitFor(() => NavigationManager.taskDone(tn), 1500, 250)) break;
          }
          continue;
        }
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
        const o = (want && pick(opts, want)) || opts[0];   // AJUSTADA v21.0: exacta (mayúsculas) primero
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
      // NUEVO v21.12 — "Personalized writing" de corregir un e-mail (U10 L3, Nelson y Mateo: n = 0, tarea sin marcar):
      // TODOS los campos ya traen texto (las palabras con error) y el bot solo llenaba los vacíos. Hugo: "escribir una
      // letra cualquiera en el primero y ya". Se agrega una letra al 1.º y se verifica; si no, al siguiente (hasta 5).
      // OJO: SOLO en prácticas. En un TEST los campos llenos son respuestas (del replay): tocarlas bajaría la nota.
      let editados = 0;
      if (!n && !TestManager.inTest()) {
        for (const t of this.textInputs().slice(0, 5)) {
          setNative(t, (t.value || '') + 's'); editados++;
          await sleep(250);
          if (!tn || await waitFor(() => NavigationManager.taskDone(tn), 2000, 250)) break;
        }
      }
      return { did: 'text_solved', n, editados, long: isLong, waitDone: 3500 };
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
      while (Date.now() - t0 < 100000 && !hecho()) {
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
    static tileById(id) { return id ? qa('.draggable[data-id], .wordBankTile[data-id]').find(x => x.getAttribute('data-id') === String(id)) || null : null; }

    // AJUSTADA v20.9: si el hueco no tiene texto y su atributo ans es un NÚMERO, es el data-id de la
    // ficha correcta (reporte Lesson 5: Pronouns · Test · 3/10: el bot guardaba "87" y no hallaba ficha).
    static dropValue(t) {
      const tile = q('.draggable, .wordBankTile', t);
      const v = txt(tile) || txt(t);
      if (v) return v;
      const ans = (t.getAttribute('ans') || '').trim();
      if (/^\d+$/.test(ans)) { const tl = this.tileById(ans); if (tl) return txt(tl); }
      return ans;
    }

    // NUEVO v20.9: buscar la ficha por texto exacto → por data-id → por texto sin signos ni espacios
    static findTile(valor) {
      const want = norm(valor), tiles = this.bankTiles(), solo = s => norm(s).replace(/[^a-z0-9]/g, '');
      return pick(tiles, valor) || tiles.find(x => x.getAttribute('data-id') === String(valor).trim()) ||   // AJUSTADA v21.0: exacta (mayúsculas) primero
        tiles.find(x => solo(txt(x)) && solo(txt(x)) === solo(valor)) || null;
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
        // NUEVO v21.0: si existe una ficha con el texto EXACTO (p. ej. "weren't" y "Weren't"), se exige exacto
        const hayExacta = qa('.draggable, .wordBankTile').some(x => exacto(txt(x), values[i]));
        if (!want) continue;
        for (let intento = 0; intento < 3; intento++) {
          const t = this.dropTargets()[i];
          if (!t) break;
          if (coincide(this.dropValue(t), values[i], hayExacta)) break;
          const tile = this.findTile(values[i]);   // AJUSTADA v20.9
          if (!tile) { warn('DropTarget: no encuentro la ficha', values[i]); break; }
          await revealInBox(t); await revealInBox(tile);
          if (intento < 2) await drag(tile, t);
          else { click(tile); await sleep(300); click(t); await sleep(500); }
          moves++;
          await sleep(300);
        }
        const t = this.dropTargets()[i];
        if (t && coincide(this.dropValue(t), values[i], hayExacta)) ok++;
      }
      const total = values.filter(v => norm(v)).length;
      if (ok < total) warn(`DropTarget: quedaron ${ok}/${total} huecos bien`, { esperado: values, quedó: this.dropTargets().map(t => this.dropValue(t)) });
      const r = { did: 'drop_replay', moves, ok, total };
      if (ok < total) { r.quiere = values; r.banco = this.bankTiles().map(x => txt(x) + '#' + (x.getAttribute('data-id') || '')); r.huecos = this.dropTargets().map(t => this.dropValue(t) + ' [ans=' + (t.getAttribute('ans') || '') + ']'); }   // NUEVO v20.9: para el reporte
      return r;
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
  //  REHECHO v20.9 con la estructura REAL (dump Lesson 5: Nouns: This/That/These/Those · Test · 9/10):
  //    hueco:  <span id="1_1" class="answered|active" ed-trackable-click="...swap...">
  //              <div class="questionText">(palabra elegida)</div>
  //              <div class="arrowWrapper"><div class="arrow-down"></div></div>
  //            </span>   dentro de .answersWrapper.fillInBlank > .fitb
  //    lista:  al pulsar el hueco aparece .optionsWrapper con las opciones (this / these / those / that)
  //  v20.7 pulsaba el div .questionText y buscaba la flecha DENTRO de él (está al lado) → no abría bien.
  //  Ahora: pulsa el <span> (o su flecha) → espera .optionsWrapper → elige por texto → comprueba que el
  //  hueco quedó con esa palabra. Si el clic no la elige, prueba teclado (flechas + Enter).
  //  Práctica: elige la 1.ª opción en UN hueco (y comprueba la tarea). Test: la palabra cosechada.
  //  DEPENDE DE: utils/dom.js, utils/press.js, utils/practice.js
  //  EXPONE:     LegacyDDLSolver (se une a PracticeSolver)
  // =====================================================================

  class LegacyDDLSolver {
    static isLegacyDDL() { return !qv('.DDLOptions__selected') && this.legacyBlanks().length > 0; }

    // Cada hueco = el contenedor del .questionText (el <span id="1_1">)
    static legacyBlanks() {
      return qav('.fillInBlank .questionText, .answersWrapper.fitb .questionText, .fitb .questionText')
        .map(qt => qt.closest('span[id], [ed-trackable-click]') || qt.parentElement)
        .filter((b, i, arr) => b && arr.indexOf(b) === i);
    }

    static legacyBlankValue(b) {
      const qt = q('.questionText', b);
      const c = (qt || b).cloneNode(true);
      qa('.arrowWrapper, .vCheck, .xCheck, [class*="Check"], [class*="icon" i]', c).forEach(e => e.remove());
      return txt(c);
    }

    // Opciones visibles: dentro de .optionsWrapper (lo real); si no hay, lo que apareció nuevo tras el clic
    static openOptions(antes) {
      const w = qav('.optionsWrapper').pop();
      let ops = w ? qa('*', w).filter(e => vis(e) && txt(e) && !qa('*', e).some(h => h !== e && txt(h) === txt(e))) : [];
      if (!ops.length && antes) {
        ops = qa('li, [class*="option" i], [role="option"]').filter(e => vis(e) && !antes.has(e) && txt(e));
        ops = ops.filter(e => !ops.some(o => o !== e && e.contains(o)));
      }
      return ops;
    }

    // AJUSTADA v20.10 — reporte Lesson 5: Nouns · Test · 3, 4, 7 y 9/10: el 1.er hueco salía bien y el 2.º daba
    // "no se abrió la lista". Lo más probable: el 1.º salía porque ED lo ABRE SOLO al cargar, y los clics del bot
    // nunca abrieron una lista (Hugo: "cuando le das Tab baja la lista" → se abre con el FOCO).
    // Ahora prueba, comprobando tras cada intento, hasta que aparezca la lista:
    //   ya abierta → clic en el texto → clic en la flecha → clic en el hueco → FOCO (como Tab) →
    //   secuencia de mouse → jQuery → teclado (Enter / flecha abajo / espacio)
    // y anota qué método funcionó (sale en el reporte si algo falla).
    static listaAbierta(antes) {
      const o = this.openOptions(antes);
      if (o.length) return o;
      if (this.ultimasOpciones && this.ultimasOpciones.length) {   // ¿aparecieron palabras que ya vimos en otra lista?
        const W = this.ultimasOpciones.map(norm);
        let nuevas = qa('body *').filter(e => vis(e) && (!antes || !antes.has(e)) && W.includes(norm(txt(e))) && !e.closest('.fitb, .fillInBlank'));
        nuevas = nuevas.filter(e => !nuevas.some(x => x !== e && e.contains(x)));
        if (nuevas.length >= 2) return nuevas;
      }
      return [];
    }

    static async openLegacy(b) {
      const ya = await waitFor(() => { const o = this.listaAbierta(null); return o.length ? o : null; }, 500, 150);
      if (ya) { this.metodo = 'ya_abierta'; return ya; }
      const qt = q('.questionText', b), ar = q('.arrowWrapper', b), ad = q('.arrow-down', b);
      const foco = el => { try { el.setAttribute('tabindex', el.getAttribute('tabindex') || '0'); el.focus(); } catch (e) {} for (const t of ['focus', 'focusin']) { try { el.dispatchEvent(new FocusEvent(t, { bubbles: t === 'focusin' })); } catch (e) {} } };
      const tecla = (el, key, code) => { for (const t of ['keydown', 'keyup']) { try { el.dispatchEvent(new KeyboardEvent(t, { key, code: key === ' ' ? 'Space' : key, keyCode: code, which: code, bubbles: true })); } catch (e) {} } };
      const raton = el => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) { const Ev = t.startsWith('pointer') && window.PointerEvent ? window.PointerEvent : MouseEvent; try { el.dispatchEvent(new Ev(t, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0, buttons: t.endsWith('down') ? 1 : 0 })); } catch (e) {} } };
      const intentos = [
        ['clic_texto', () => qt && click(qt)],
        ['clic_flecha', () => (ad || ar) && click(ad || ar)],
        ['clic_hueco', () => click(b)],
        ['foco_tab', () => { foco(b); if (qt) foco(qt); }],
        ['raton_texto', () => raton(qt || b)],
        ['jquery', () => { if (window.jQuery) { try { window.jQuery(qt || b).trigger('click'); window.jQuery(b).trigger('focus'); } catch (e) {} } }],
        ['tecla_enter', () => { foco(b); tecla(b, 'Enter', 13); }],
        ['tecla_abajo', () => { foco(b); tecla(b, 'ArrowDown', 40); }],
        ['tecla_espacio', () => { foco(b); tecla(b, ' ', 32); }]
      ];
      for (const [nombre, fn] of intentos) {
        const antes = new Set(qa('body *').filter(vis));
        fn();
        const ops = await waitFor(() => { const o = this.listaAbierta(antes); return o.length ? o : null; }, 700, 120);
        if (ops) { this.metodo = nombre; return ops; }
      }
      this.metodo = 'ninguno';
      return [];
    }

    static cerrarLista() { try { document.body.click(); } catch (e) {} }

    static async chooseLegacy(b, opts, want) {
      this.ultimasOpciones = opts.map(txt);
      const o = want ? pick(opts, want) : opts[0];   // AJUSTADA v21.0: exacta (mayúsculas) primero
      if (!o) return false;
      const elegido = () => exacto(this.legacyBlankValue(b), txt(o));
      if (await press(o, elegido, 1200)) return true;
      // Respaldo: teclado (algunas listas viejas responden a flechas + Enter)
      const k = opts.indexOf(o);
      try { b.focus && b.focus(); } catch (e) {}
      for (let i = 0; i <= k; i++) b.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true }));
      b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      return !!(await waitFor(elegido, 1000, 150));
    }

    static async solveLegacyDDL(values = null) {
      log('🔽 [Desplegable viejo] Eligiendo opciones...');
      const tn = NavigationManager.curTask()?.n;
      const total = this.legacyBlanks().length;
      let n = 0, ok = 0;
      const fallos = [], metodos = [];
      for (let i = 0; i < total; i++) {
        const b = this.legacyBlanks()[i]; if (!b) break;
        const want = values ? values[i] : null;
        if (values && !want) continue;
        if (!values && this.legacyBlankValue(b)) continue;
        if (want && norm(this.legacyBlankValue(b)) === norm(want)) { ok++; continue; }
        let opts = await this.openLegacy(b);
        let metodo = this.metodo;
        let hecho = opts.length ? await this.chooseLegacy(b, opts, want) : false;
        if (!hecho && metodo === 'ya_abierta') {   // NUEVO v20.10: la lista abierta era de otro hueco → cerrar y abrir la suya
          this.cerrarLista(); await sleep(300);
          opts = await this.openLegacy(b); metodo = this.metodo;
          hecho = opts.length ? await this.chooseLegacy(b, opts, want) : false;
        }
        // NUEVO v21.9 — corrida de Jose (01/11, U14 · Present Simple: Review · Test · 12/15: 97 % siete veces) y de
        // Nelson (v21.6, mismo test y Nouns · Test · 3/4/7/9): tras ELEGIR en un hueco, ED no abre la lista de otro
        // hasta que haya un clic FUERA. Patrón real: "1:clic_texto, 2:ninguno✗, 3:clic_texto, 4:ninguno✗" (el hueco
        // que sigue a un fallo salía bien porque el fallo ya hacía cerrarLista). Ahora: si nada la abrió → clic fuera y
        // otra vuelta. En el reporte sale como "fuera+<método>".
        if (!hecho && metodo === 'ninguno') {
          this.cerrarLista(); await sleep(400);
          opts = await this.openLegacy(b); metodo = 'fuera+' + this.metodo;
          hecho = opts.length ? await this.chooseLegacy(b, opts, want) : false;
        }
        metodos.push((i + 1) + ':' + metodo + (hecho ? '' : '✗'));
        if (hecho) { n++; ok++; }
        else { fallos.push({ hueco: i + 1, motivo: opts.length ? 'no se pudo elegir' : 'no se abrió la lista', metodo, quiere: want, opciones: opts.map(txt), huecoHTML: (b.outerHTML || '').replace(/\s+/g, ' ').slice(0, 400) }); this.cerrarLista(); }
        await sleep(400);   // AJUSTADA v20.10: dar tiempo a ED de abrir (o no) la lista del siguiente hueco
        if (!values && n === 1 && await practiceEnough(tn)) break;
      }
      const r = { did: values ? 'ddl_legacy_replay' : 'ddl_legacy', n, ok, total: values ? values.filter(Boolean).length : total };
      r.metodos = metodos;   // NUEVO v20.10: qué forma de abrir la lista funcionó en cada hueco
      if (fallos.length) { r.fallos = fallos; warn('Desplegable viejo:', fallos); }
      return r;
    }

    static readLegacyDDL() { return this.legacyBlanks().map(b => this.legacyBlankValue(b)); }
  }

  // ▼▼▼ src/exercises/memory.js ▼▼▼
  // =====================================================================
  //  MEMORY GAME — "Click on the boxes to match the pairs of words." (memoG)
  // ---------------------------------------------------------------------
  //  NUEVO v20.8. Visto en dump (Lesson 6: Crime · Step 2: Practice · 1/6): 12 cartas
  //  .memoG__card (6 --word + 6 --image) con caras .memoG__cardSideFront / Back.
  //  ⚠ SIN CONFIRMAR cómo marca ED una pareja acertada. Por eso:
  //   1) Práctica: da vuelta 2 cartas → si ED marca la tarea (practiceEnough), listo.
  //   2) Si no: prueba parejas palabra×imagen. Una pareja acertada es la que NO vuelve a su
  //      estado inicial tras ~1,5 s (se compara la clase con la que tenía al principio).
  //  DEPENDE DE: utils/dom.js, utils/practice.js, utils/reporter.js
  //  EXPONE:     MemoryGameSolver (se une a PracticeSolver)
  // =====================================================================

  class MemoryGameSolver {
    static isMemoryGame() { return qav('.memoG__card').length >= 2; }

    static async solveMemoryGame() {
      log('🃏 [Memory] Buscando parejas...');
      const tn = NavigationManager.curTask()?.n;
      const cards = qav('.memoG__card');
      if (cards.length < 2) return { did: 'memory_none' };
      const base = c => (typeof c.className === 'string' ? c.className : '').split(/\s+/).filter(x => !/lastInRow|--word|--image/.test(x)).sort().join(' ');
      const inicial = new Map(cards.map(c => [c, base(c)]));
      const resuelta = c => base(c) !== inicial.get(c);
      // AJUSTADA v21.12 — Hugo (02/11): "es seleccionar dos cuadritos y ya sale hecho". En ED nunca se dio vuelta ninguna
      // carta (67 intentos, 3 corridas): el clic iba al contenedor .memoG__cardIW y el que escucha es lo de adentro.
      // Ahora se prueba, VERIFICANDO que la carta cambie: la cara visible (.memoG__cardSideBack) → .memoG__cardSides →
      // .memoG__cardIW → la carta; lo que funcione se usa en las demás. Más tiempo para que carguen.
      await waitFor(() => qav('.memoG__card').length >= 2, 20000, 400);
      const estado = c => [c, ...qa('*', c)].map(e => (typeof e.className === 'string' ? e.className : '') + (e.style ? e.style.transform || '' : '')).join('|');
      let forma = null;
      const tocar = async c => {
        const cands = [['dorso', q('.memoG__cardSideBack', c)], ['caras', q('.memoG__cardSides', c)], ['IW', q('.memoG__cardIW', c)], ['carta', c]].filter(([, e]) => e);
        const orden = forma ? [cands.find(x => x[0] === forma), ...cands.filter(x => x[0] !== forma)].filter(Boolean) : cands;
        const antes = estado(c);
        for (const [nombre, el] of orden) { if (await press(el, () => estado(c) !== antes, 900)) { forma = nombre; await sleep(300); return true; } }
        await sleep(300);
        return false;
      };

      const g1 = await tocar(cards[0]), g2 = await tocar(cards[1]); await sleep(900);
      if (await practiceEnough(tn)) return { did: 'memory_one_action', forma, giraron: [g1, g2] };

      const words = cards.filter(c => /--word/.test(c.className)), imgs = cards.filter(c => /--image/.test(c.className));
      const A = words.length && imgs.length ? words : cards, B = words.length && imgs.length ? imgs : cards;
      let pares = 0, intentos = 0;
      for (const w of A) {
        if (resuelta(w)) continue;
        for (const i of B) {
          if (i === w || resuelta(i) || resuelta(w)) continue;
          await tocar(w); await tocar(i); await sleep(1500); intentos++;
          if (resuelta(w) && resuelta(i)) { pares++; break; }
          if (tn && NavigationManager.taskDone(tn)) return { did: 'memory_done', pares, intentos };
          // AJUSTADA v21.11 (Hugo: "un solo intento corto por corrida"): antes hasta 60 parejas (~3 min, 3 veces por unidad)
          if (intentos >= 6) break;
        }
        if (intentos >= 6) break;
      }
      // NUEVO v21.11: si no emparejó, el reporte se toma CON DOS CARTAS ABIERTAS (palabra + imagen) para ver cómo
      // las muestra ED y qué clase cambia. El "antes" (todas cerradas) lo guarda el engine.
      if (!pares) {
        const c1 = A.find(c => !resuelta(c)), c2 = B.find(c => c !== c1 && !resuelta(c));
        if (c1) await tocar(c1);
        if (c2) await tocar(c2);
        Reporter.capture('memory_sin_parejas', { intentos, forma, abiertas: [c1, c2].filter(Boolean).map(c => (typeof c.className === 'string' ? c.className : '') + ' | ' + txt(c).slice(0, 30)),
          clasesAlEmpezar: [...inicial.values()].slice(0, 4) });
      }
      return { did: 'memory_tried', pares, intentos, forma };
    }
  }

  // ▼▼▼ src/exercises/add-in-text.js ▼▼▼
  // =====================================================================
  //  "Select the place in the text where this sentence best fits."  (.addInText)
  // ---------------------------------------------------------------------
  //  NUEVO v21.7 (reporte de la nube, Nelson: Tiny Homes · Read again 4/4 y Hobby · Read again 4/5).
  //  A la derecha solo está la frase (.sentenceNoteWrapper); los LUGARES donde insertarla están en el texto de
  //  lectura (izquierda). Su estructura aún no está confirmada → se prueban los candidatos más probables, uno por
  //  uno, hasta que ED marque la tarea. Si no hay candidatos, el reporte guarda el HTML del texto de lectura.
  //  DEPENDE DE: utils/dom.js, utils/press.js, utils/reporter.js, core/navigation.js
  //  EXPONE:     AddInTextSolver (se une a PracticeSolver)
  // =====================================================================

  class AddInTextSolver {
    static isAddInText() { return !!qv('.addInText'); }

    static lugares() {
      const zona = qv('.learning__resourcesArea') || document;
      const sel = '[class*="addIn" i]:not(.addInText):not(.answersWrapper), [class*="insert" i], [class*="place" i], [class*="gap" i], [class*="square" i], [class*="marker" i], [onclick]';
      let c = qa(sel, zona).filter(e => vis(e) && !e.closest('.answersWrapper') && !e.closest('.layout__mediaControlsW, .learning__RAMediaTools'));
      if (!c.length) c = qa('span, a, b, i', zona).filter(e => vis(e) && /^\s*(\[?[A-H1-9]\]?|■|□|▢|\(\s*\))\s*$/.test(txt(e)));   // [A] [B] ■ ...
      return c.filter(e => !c.some(o => o !== e && e.contains(o)));
    }

    static async solveAddInText() {
      log('📍 [Insertar frase] Buscando los lugares en el texto...');
      const tn = NavigationManager.curTask()?.n;
      const ls = this.lugares();
      if (!ls.length) {
        Reporter.capture('insertar_frase_sin_lugares', { textoLectura: (qv('.learning__resourcesArea') || {}).outerHTML ? qv('.learning__resourcesArea').outerHTML.replace(/\s+/g, ' ').slice(0, 2500) : null });
        return { did: 'add_in_text', probados: 0 };
      }
      let i = 0;
      for (const l of ls.slice(0, 8)) {
        i++;
        await press(l, () => tn && NavigationManager.taskDone(tn), 1500);
        if (tn && NavigationManager.taskDone(tn)) return { did: 'add_in_text', probados: i, ok: true };
      }
      return { did: 'add_in_text', probados: i, ok: false, clases: ls.slice(0, 5).map(e => e.className || e.tagName) };
    }
  }

  // ▼▼▼ src/exercises/explore.js ▼▼▼
  // =====================================================================
  //  EXPLORE — pasos "Explore"/"Prepare" que solo hay que ver/escuchar (video, tarjetas de vocabulario, lectura)
  // ---------------------------------------------------------------------
  //  NUEVO v21.11, REHECHO v21.12 con los dumps de Hugo (02/11) y las corridas de Jose, Roy y Mateo:
  //   • VIDEO (U5 L1 "In the Restaurant", U7 L1, U8 L1): .learning__RAMediaResourceW--html5Video con botón grande
  //     .learning__RAMRButton--play y controles #video-controls (.layout__mediaPlayPause). Hugo: "es solo esperar a
  //     que cargue el video y darle play". El bot lo tomaba como mcq_default porque el reproductor aún no cargaba.
  //   • TARJETAS DE VOCABULARIO (U8 L6 "Work"): .learning__vocabularyCards_card (10). Hugo: "darle clic a un
  //     elemento y salir con la x".
  //   • SEGMENTOS / PARLANTES (.segment / .speaker): lectura con audio por frase.
  //  Todo con esperas LARGAS para que cargue (Hugo: "dales más tiempo para que carguen") y verificando tras cada
  //  intento si ED marcó la tarea (regla 3). Si nada la marca, el engine guarda el reporte con dump completo.
  //  DEPENDE DE: utils/dom.js, utils/press.js, core/navigation.js
  //  EXPONE:     ExploreSolver (se une a PracticeSolver)
  // =====================================================================

  class ExploreSolver {
    static esPasoExplore() { return /explore|prepare|explora|prepara/i.test(NavigationManager.stepLabel()); }
    static hayVideo() { return !!q('.learning__RAMediaResourceW--html5Video, .learning__RAMediaResourceW video, .learning__RAMRButton--play'); }
    static hayTarjetas() { return qav('.learning__vocabularyCards_card').length > 0; }
    // Solo en pasos Explore/Prepare (o con tarjetas de vocabulario): en una práctica con video a la izquierda manda la práctica
    static isExplore() {
      if (this.hayTarjetas() && !q('.dnditem, .dndZone .draggable, .prMCQ__qaInnerSet, .DDLOptions__selected')) return true;
      if (!this.esPasoExplore()) return false;
      return this.hayVideo() || qav('.speaker').length > 0 || qav('.segment').length >= 2;
    }

    static async solveExplore() {
      const tn = NavigationManager.curTask()?.n;
      const hecho = () => !!(tn && NavigationManager.taskDone(tn));
      const intentos = [];
      const fin = (marcado, extra) => Object.assign({ did: 'explore', intentos, marcado, waitDone: 3000 }, extra || {});
      if (hecho()) return fin(true);
      if (this.hayTarjetas()) { if (await this.tarjetas(tn, hecho, intentos)) return fin(true); }
      if (this.hayVideo()) { if (await this.video(hecho, intentos)) return fin(true); }
      if (await this.parlantes(hecho, intentos, !tn)) return fin(true);
      return fin(hecho());
    }

    // ---- VIDEO: esperar a que cargue (hasta 30 s), darle play y esperar a que ED marque (hasta 100 s) ----
    static async video(hecho, intentos) {
      log('🎬 [Explore] Video: espero a que cargue y le doy play...');
      const botones = () => [qv('.learning__RAMRButton--play'), qv('.layout__mediaPlayPause--play'), qv('.layout__mediaPlayPause')].filter(Boolean);
      const vid = () => q('.learning__RAMediaResourceW video, .learning__resourcesArea video') || q('video');
      await waitFor(() => botones().length || (vid() && vid().readyState >= 2), 30000, 400);
      const sonando = () => { const v = vid(); return !!(v && !v.paused && !v.ended); };
      let empezo = false;
      for (const b of botones()) {
        if (await press(b, () => sonando() || hecho(), 5000)) { empezo = true; intentos.push('play:' + (typeof b.className === 'string' ? b.className.split(' ')[0] : 'boton')); break; }
      }
      if (!empezo && vid()) {   // último recurso: reproducir el <video> directo (sin sonido)
        try { const v = vid(); v.muted = true; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
        empezo = !!(await waitFor(() => sonando() || hecho(), 5000, 300));
        intentos.push('video.play' + (empezo ? '' : '✗'));
      }
      // dejarlo correr hasta que ED marque la tarea o termine el video (tope 100 s); NO se pausa
      if (await waitFor(() => hecho() || (vid() && vid().ended), 100000, 500) && hecho()) return true;
      if (!hecho()) intentos.push('video_sin_marcar');
      return hecho();
    }

    // ---- TARJETAS DE VOCABULARIO: abrir una, cerrarla con la X y verificar; si ED no marca, la siguiente ----
    // Dumps de Hugo (U8 L6 "Work"): con la tarjeta ABIERTA ("2/10") aparecen elementos .cursor-pointer, .d-flex y
    // .learning__vocabularyCards_textSeparator que con las tarjetas cerradas NO existen → así se sabe si está abierta.
    // La X no trae nombre conocido: se prueban los botones nuevos (primero los que parecen X, luego los de arriba a la
    // derecha) y se verifica que la tarjeta se cerró. Si nada la cierra, el reporte guarda la tarjeta abierta.
    static marcasAbierta() { return qav('.learning__vocabularyCards_textSeparator, .cursor-pointer, .d-flex, .justify-between').filter(e => !e.closest('#ed-autopilot-hud')).length; }
    static async tarjetas(tn, hecho, intentos) {
      log('🗂️ [Explore] Tarjetas de vocabulario: abro una y la cierro con la X...');
      await waitFor(() => qav('.learning__vocabularyCards_card').length > 0, 20000, 400);
      const firma = () => qa('.learning__vocabularyCards *').map(e => (typeof e.className === 'string' ? e.className : '')).join('|').length + ':' + qav('.learning__vocabularyCards_card').length + ':' + txt(q('.learning__vocabularyCards')).length;
      const tarjetas = qav('.learning__vocabularyCards_card').slice(0, 10);
      for (let k = 0; k < tarjetas.length; k++) {
        const c = tarjetas[k]; if (!c.isConnected) continue;
        const antes = firma(), base = this.marcasAbierta();
        try { c.scrollIntoView({ block: 'center' }); } catch (e) {}
        const abrio = await press(q('.learning__vocabularyCards_cardImageWrapper', c) || c, () => this.marcasAbierta() > base || firma() !== antes || hecho(), 4000);
        intentos.push('tarjeta' + (k + 1) + (abrio ? '' : '✗'));
        if (abrio) {
          await sleep(1500);
          if (!hecho()) Reporter.marcarAntes();   // el "antes" del reporte = la tarjeta ABIERTA (por si la X falla)
          await this.cerrarTarjeta(base, intentos);
        }
        if (await waitFor(hecho, 3000, 300)) return true;
        if (!abrio && k >= 1) break;   // dos tarjetas que ni se abren: no insistir
      }
      return hecho();
    }
    static async cerrarTarjeta(base, intentos) {
      // OJO: nada de buscar "full"/"open" en las clases: el <body> real trae learning__body--vocabularyCards Y
      // learning__body--resourcesAreaFull con la tarjeta abierta o cerrada (dumps de Hugo)
      const abierta = () => this.marcasAbierta() > base;
      if (!abierta()) return true;
      const fuera = e => !!e.closest('#ed-autopilot-hud, .learning__lessonsStepsNav, .learning__header, header, .sitemenu, .settingsMenu__main');
      const esX = e => { const c = (typeof e.className === 'string' ? e.className : '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.id || ''); return /close|cerrar|exit|cross|times|x-?btn|btnx|icon-?x/i.test(c) || /^\s*[×✕✖xX]\s*$/.test(txt(e)); };
      const r = e => e.getBoundingClientRect();
      const xs = qa('*').filter(e => vis(e) && !fuera(e) && esX(e));
      // botones nuevos (.cursor-pointer): primero el último de una fila .justify-between (la fila "2/10 … X"), después
      // los sin texto (íconos), y entre ellos los más arriba a la derecha
      const prio = e => (e.parentElement && /justify-between/.test(e.parentElement.className) && !e.nextElementSibling ? 0 : 1) * 2 + (txt(e).trim().length > 2 ? 1 : 0);
      const iconos = qav('.cursor-pointer').filter(e => !fuera(e) && !xs.includes(e) && !/^\s*\d+\s*\/\s*\d+\s*$/.test(txt(e)))
        .sort((a, b) => (prio(a) - prio(b)) || ((r(b).right - r(b).top * 2) - (r(a).right - r(a).top * 2)));
      for (const x of [...xs, ...iconos].slice(0, 8)) {
        if (!abierta()) break;
        if (await press(x, () => !abierta(), 2500)) { intentos.push('cerrar:' + ((typeof x.className === 'string' && x.className.split(' ')[0]) || x.tagName.toLowerCase())); return true; }
      }
      if (!abierta()) return true;
      try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); } catch (e) {}
      if (await waitFor(() => !abierta(), 1500, 200)) { intentos.push('cerrar:Escape'); return true; }
      intentos.push('cerrar✗');
      return false;
    }

    // ---- SEGMENTOS / PARLANTES (lectura con audio): uno por uno, verificando ----
    // AJUSTADA v21.12: SIN barra de tareas (lecturas "Read the e-mail"/"Read the story" de Mateo) no hay nada que
    // verificar: basta con que suene UN audio y como mucho 20 s (antes hasta 75 s por página, regla 4: no perder tiempo).
    // En Roy, las lecturas Explore no quedaron pendientes en My Progress: con visitarlas alcanza.
    static async parlantes(hecho, intentos, sinTarea) {
      const fuera = e => !!e.closest('.learning__lessonsStepsNav, .edLADropDownList, #ed-autopilot-hud, .learning__header, .learning__headerW, header');
      const sonando = () => qa('audio, video').some(m => !m.paused && !m.ended);
      const t0 = Date.now(), TOPE = sinTarea ? 20000 : 75000;
      let basta = false;
      const probar = async (nombre, els, espera) => {
        let n = 0;
        for (const el of els) {
          if (Date.now() - t0 > TOPE) break;
          try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
          click(el); n++;
          const sono = await waitFor(sonando, 1500, 150);
          if (sono) await waitFor(() => !sonando(), espera, 300); else await sleep(400);
          if (hecho()) { intentos.push(nombre + ':' + n); return true; }
          if (sinTarea && sono) { intentos.push(nombre + ':' + n + ' (sin tarea: con un audio basta)'); basta = true; return false; }
        }
        if (n) intentos.push(nombre + ':' + n + '✗');
        return false;
      };
      if (qav('.speaker, .segment').length) log('🎧 [Explore] Parlantes / segmentos...');
      if (await probar('parlantes', qav('.speaker').filter(e => !fuera(e) && !e.closest('#video-controls')), 8000)) return true;
      if (basta) return hecho();
      if (await probar('segmentos', qav('.segment').filter(e => !fuera(e)).slice(0, 30), 6000)) return true;
      return hecho();
    }
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
    LegacyDDLSolver,
    MemoryGameSolver,
    AddInTextSolver,   // NUEVO v21.7
    ExploreSolver     // NUEVO v21.11
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

    // NUEVO v21.7: ¿ED ya marca este test (o su lección) como terminado? Se mira el paso actual en el desplegable de
    // pasos (barra .progressBar__progress--done o texto "Completed/Terminado").
    static yaTerminado() {
      const it = qa('.learning__dropDownListW--steps .learning__dropDownList_item--current, .learning__dropDownListW--steps [class*="item--current"]')[0];
      if (!it) return false;
      return !!q('.progressBar__progress--done', it) || RE_ST_DONE.test(txt(it));
    }

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
      else Reporter.capture('cosecha_vacia', { idx });   // NUEVO v20.8
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
      // NUEVO v21.6 (reporte "replay_sin_accion", Soap Opera · Prueba): a veces se intentaba responder antes de que la
      // pregunta terminara de dibujarse → esperar hasta 4 s a que aparezca algún ejercicio conocido.
      await waitFor(() => qv('label.prMCQ__answerLabel') || qv('.DDLOptions__selected') || PracticeSolver.isDragAndDrop() || PracticeSolver.isDropTargetScreen() ||
        PracticeSolver.isSequenceScreen() || PracticeSolver.isLegacyDDL() || PracticeSolver.isLegacyMCQ(), 4000, 250);
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
      // NUEVO v20.8: anotar en el reporte lo que no salió completo (o una pregunta que el bot no sabe contestar)
      const incompleto = (out.drop && out.drop.ok < out.drop.total) || (out.seq && !out.seq.ok) || (out.lddl && out.lddl.ok < out.lddl.total);
      const nada = !['mcq', 'fitb', 'dnd', 'drop', 'seq', 'lddl', 'lmcq'].some(k => out[k]);
      if (incompleto) Reporter.capture('replay_incompleto', { out, cosechado: scr });   // AJUSTADA v20.9: + lo que se guardó
      else if (nada) Reporter.capture('replay_sin_accion', { cosechado: Object.keys(scr) });
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
    // AJUSTADA v21.7: el conteo se guarda en localStorage (antes en memoria → la recarga periódica lo reiniciaba)
    static tooManyRetries(key) {
      let m = {}; try { m = JSON.parse(localStorage.getItem('ed:scoreVisits:v1') || '{}'); } catch (e) {}
      m[key] = Math.max(m[key] || 0, scoreVisits[key] || 0) + 1; scoreVisits[key] = m[key];
      try { localStorage.setItem('ed:scoreVisits:v1', JSON.stringify(m)); } catch (e) {}
      return m[key] > CFG.maxTestAttempts;
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
        if (TestSweep.rendido()) {
          log('⏭️ Ya me rendí con este test en esta corrida → no lo repito:', key);
          await NavigationManager.goNext();
          return { did: 'test_rendido_no_repito', key };
        }
        // NUEVO v21.7: un test ya terminado NO se rehace (cada intento parece contar en el promedio de ED),
        // salvo que sepamos que quedó < 100 %.
        if (!CFG.retakeDoneTests && TestManager.yaTerminado() && !ProgressMap.testBajo(TestSweep.unitNum(), +lessonNum(NavigationManager.lessonLabel()) || 0)) {   // AJUSTADA v21.8
          const sc = StorageManager.getScores()[key];
          if (!(sc != null && sc < 100)) {
            log('⏭️ Test ya terminado (' + (sc != null ? sc + ' %' : 'puntaje no conocido') + ') → no lo rehago:', key);
            await NavigationManager.goNext();
            return { did: 'test_ya_terminado', key, pct: sc ?? null };
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
        }
        await NavigationManager.goNext();
        return res;
      }
      if (t.done) { await NavigationManager.goNext(); return { did: 'task_already_done_next' }; }

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
      }

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
      try { localStorage.setItem('ed:running:v1', '1'); } catch (e) {}   // NUEVO v21.1: para retomar tras recargar
      const t0 = Date.now();
      log('🚀 ED-Autopilot v' + V + ' iniciado.');
      let n = 0;
      while (this._running) {
        if (++n > CFG.maxIterations && !TestSweep.active()) { this._running = false; break; }   // AJUSTADA v20.8: sin tope en el barrido
        // NUEVO v21.1: con el cargador, recargar cada CFG.reloadEveryMin minutos (libera memoria; el bot retoma solo)
        // AJUSTADA v21.7: nunca a mitad de un test (se perdía la cuenta de intentos)
        if (window.__edCargador && CFG.reloadEveryMin > 0 && Date.now() - t0 > CFG.reloadEveryMin * 60000 && !TestManager.inTest()) { log('♻️ Recargo la pestaña para liberar memoria (sigo solo al volver)'); location.reload(); return; }
        // AJUSTADA v21.1: el paso se imprime como TEXTO (no objetos) → la consola gasta mucha menos memoria
        try { const r = await MainEngine.step(); log('#' + n, JSON.stringify(r).slice(0, 220)); } catch (e) { errLog('🛑 BOT DETENIDO:', e.message); this._lastMsg = e.message; Reporter.capture('error', e.message); this._running = false; break; }
        await sleep(CFG.tickMs);
      }
      log('⏸ Bot detenido.');
      if (Reporter.count()) { log('📝 Hay ' + Reporter.count() + ' fallos anotados. Botón 📋 de la cajita o __ed.report()'); Reporter.copy(); }   // NUEVO v20.8
      hud && hud.render();
    },
    // ---- NUEVO v20.8: reporte automático de fallos ----
    report: () => { Reporter.copy(); return Reporter.text(); },
    reportText: () => Reporter.text(),   // NUEVO v21.2: el reporte como texto (lo usa la nube)
    reportFile: () => Reporter.file(),
    reportClear: () => { Reporter.clear(); log('🧹 Reporte borrado.'); },
    // ---- NUEVO v20.8: barrido de tests < 100 ----
    barrer() { TestSweep.start(); return this.auto(); },
    completar() { TestSweep.startCompletar(); return this.auto(); },   // NUEVO v21.3: todo el curso + tests < 100
    barrerStop: () => TestSweep.stop(),
    barrerEstado: () => { const s = TestSweep.get(); console.table((s && s.resultados) || []); return s; },
    stop() { this._running = false; try { localStorage.removeItem('ed:running:v1'); } catch (e) {} hud && hud.render(); },   // AJUSTADA v21.1

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
        '__ed.barrer() / barrerStop() / barrerEstado()': 'Barrido de tests < 100 por lecciones y unidades',
        '__ed.completar()': 'TODO el curso unidad por unidad y luego tests < 100 (desde el Home)'
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
        ${TestSweep.active() ? '<span style="color:#74b9ff">🧭 Barrido de tests activo</span><br>' : ''}
        <button id="ed_t" style="margin-top:6px;padding:4px 8px;background:${run?'#e74c3c':'#2ecc71'};color:#fff;border:0;border-radius:4px;cursor:pointer">${run?'Parar':'Iniciar'}</button>
        ${Reporter.count() ? `<button id="ed_r" style="margin-top:6px;margin-left:4px;padding:4px 8px;background:#f39c12;color:#fff;border:0;border-radius:4px;cursor:pointer">📋 Reporte (${Reporter.count()})</button>` : ''}`;
      this.el.querySelector('#ed_t').onclick = () => { primeFakeMic(); run ? window.__ed.stop() : window.__ed.auto(); };   // AJUSTADA v21.1: el clic real activa el audio del micrófono simulado
      const rb = this.el.querySelector('#ed_r'); if (rb) rb.onclick = () => Reporter.copy();   // NUEVO v20.8 (clic = el navegador deja copiar)
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

  if (CFG.fakeMic) { installFakeMic(); installMicEcho(); }   // NUEVO v21.1 (+ eco v21.2): micrófono simulado si no hay uno real
  hud = new HUD();

  log('✅ ED-Autopilot v' + V + ' cargado con éxito. Usa __ed.auto() para arrancar · __ed.inspect() para diagnosticar.');
  // NUEVO v20.8: si hay un barrido de tests activo (p. ej. tras cambiar de página con el cargador de
  // Tampermonkey), el bot sigue solo en 3 s.
  if (TestSweep.active() && !window.__edNoAutoResume) { log('🧭 Barrido activo → reanudo en 3 s (__ed.barrerStop() para cancelarlo)'); setTimeout(() => window.__ed.auto(), 3000); }
  // NUEVO v21.1: con el cargador de Tampermonkey, si el bot estaba corriendo antes de recargar, retoma solo
  else if (window.__edCargador && localStorage.getItem('ed:running:v1') && !window.__edNoAutoResume) { log('▶️ El bot estaba corriendo → retomo en 3 s'); setTimeout(() => window.__ed.auto(), 3000); }
})();
