/* =====================================================================
   tools/regresion.js — prueba de regresión ("¿rompí algo sin querer?")
   ---------------------------------------------------------------------
   Carga dist/ed-autopilot.js en un navegador simulado (jsdom) con pantallas falsas de
   cada tipo de ejercicio, ejecuta UN paso y registra todo lo que hace el bot (clics,
   arrastres, localStorage). Lo compara con tools/regresion.snapshot.json.

     npm test                    → compara (falla si algo cambió)
     npm test -- --actualizar    → guarda el comportamiento actual como el nuevo "correcto"

   Usa --actualizar SOLO cuando cambiaste un tipo A PROPÓSITO y ya lo validaste en ED real.
   El diff del snapshot en el commit muestra exactamente qué tipos cambiaron.
   OJO: es una simulación. Que pase NO garantiza que funcione en ED; que falle SÍ avisa
   de que cambiaste algo que no pretendías.
   ===================================================================== */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const CODE = fs.readFileSync(path.join(__dirname, '..', 'dist', 'ed-autopilot.js'), 'utf8');
const SNAP = path.join(__dirname, 'regresion.snapshot.json');

// ---- ayudantes para las pantallas de "ordenar" (v20.4) ----
const SEQ_OK = ["Dalia asks Gabrielle why she's not ready to go to the party.", "Gabrielle tells Dalia she's not going to the party.", 'Dalia tries to convince Gabrielle to come with her.', 'Gabrielle finally agrees and goes to get ready.', 'Gabrielle and Dalia enter the party.', 'Gabrielle joins the party.'];
const SEQ_KEY = 'Lesson 3: The Party||Step 5: Repasemos';
function SEQ_HTML(items, review) {
  const head = `<div class="learning__dropDownListTitleW--lessons">Lesson 3: The Party</div><div class="learning__dropDownListTitleW--steps">Step 5: Repasemos</div>`;
  const tabs = review ? `<div class="testResultBtnsW"><ul><li id="liY" class="active"><a>&nbsp;Tu respuesta</a></li><li id="liC"><a id="aC">Respuesta correcta</a></li></ul></div>` : `<a class="tasksBtnext learning__submitTestLink">Submit</a>`;
  const zones = items.map((t, k) => `<div class="prSeq__containerW"><div class="containerHeader header--x">${k + 1}</div><div class="sequenceZoneWrapper"><div class="sequenceZone prSeq__zone--txt dndZone"><div class="dnditem${review ? ' dnditem--x' : ''}">${t}</div></div></div></div>`).join('');
  return head + tabs + `<div class="prSeq__main ${review ? 'checkAnswerMode' : ''}">${zones}</div><span>4 / 6</span>` + (review ? `<a class="tasksBtnext learning__nextItemLink">Next</a>` : '');
}
const LS_SEQ = { 'ed:testKnown:v1': JSON.stringify([SEQ_KEY]), 'ed:testAns:v2': JSON.stringify({ [SEQ_KEY]: { 4: { seq: SEQ_OK } } }) };
// Simula cómo ED suelta una ficha sobre otro hueco: 'swap' = intercambia, 'insert' = inserta y corre las demás
function SEQ_DROP(w, modo) {
  const d = w.document; let cogida = null;
  d.addEventListener('mousedown', e => { cogida = e.target.closest && e.target.closest('.dnditem'); });
  d.addEventListener('mouseup', e => {
    const z = e.target.closest && e.target.closest('.dndZone'); if (!cogida || !z) return;
    const zs = [...d.querySelectorAll('.sequenceZone')]; const i = zs.indexOf(cogida.closest('.dndZone')), j = zs.indexOf(z);
    if (i < 0 || j < 0 || i === j) { cogida = null; return; }
    if (modo === 'swap') { const otra = z.querySelector('.dnditem'); z.appendChild(cogida); zs[i].appendChild(otra); }
    else { const its = zs.map(x => x.querySelector('.dnditem')); const [m] = its.splice(i, 1); its.splice(j, 0, m); zs.forEach((x, k) => x.appendChild(its[k])); }
    cogida = null;
  });
}

const NAV = `<div class="learning__dropDownListTitleW--lessons">Lesson 1</div><div class="learning__dropDownListTitleW--steps">STEP</div>
<div class="learning__tasksNav"><a class="learning__tasksNav_task learning__tasksNav_task--current">1<span class="learning__tasksNav_taskTooltip">x</span></a><a class="learning__tasksNav_task">2</a></div>
<a class="tasksBtnext learning__nextItemLink">Next</a>`;
const FIX = {
  mcq: NAV.replace('STEP','Step 2: Practice') + `<div class="prMCQ__qaInnerSet"><div class="prMCQ__questionText">Q1?</div><label class="prMCQ__answerLabel">A</label><label class="prMCQ__answerLabel">B</label></div>`,
  dnd: NAV.replace('STEP','Step 2: Practice') + `<div class="dndBank dndZone"><span class="dnditem">uno</span><span class="dnditem">dos</span><span class="dnditem">tres</span></div><p>a <span class="dndZone"></span> b <span class="dndZone"></span> c <span class="dndZone"></span></p>`,
  seq: NAV.replace('STEP','Step 2: Practice') + `<div class="prSeq__container"><div class="dndZone"><span class="dnditem">1</span></div><div class="dndZone"><span class="dnditem">2</span></div></div>`,
  fitb: NAV.replace('STEP','Step 2: Practice') + `<span class="DDLOptions__selected"></span><ul><li class="DDLOptions__listItem">x</li><li class="DDLOptions__listItem">y</li></ul>`,
  text: NAV.replace('STEP','Step 2: Practice') + `<input type="text" id="t1">`,
  writing: NAV.replace('STEP','Step 3: Write') + `<iframe id="mce_0_ifr"></iframe>`,
  select: NAV.replace('STEP','Step 2: Practice') + `<span class="st learning__selectTxt_st">frase uno</span>`,
  speech: NAV.replace('STEP','Step 2: Speak') + `<div class="openSpeech__AnsW openSpeech__AnsW--intro"></div>`,
  testStart: NAV.replace('STEP','Step 4: Test') + `<a class="btnStartTest">Start</a>`,
  review: NAV.replace('STEP',"Step 4: Test") + `<a class="tab">Your Answer</a><a class="tab">Correct Answer</a><div class="prMCQ__qaInnerSet"><div class="prMCQ__questionText">Q1?</div><div class="prMCQ__answers"><label class="prMCQ__answerLabel">A</label></div><div class="prMCQ__answers prMCQ__answers--correct"><label class="prMCQ__answerLabel">B</label></div></div><span>1/3</span>`,
  score: NAV.replace('STEP','Step 4: Test') + `<div class="TestResults">Your score 40%</div><a class="learning__testReviewLink">Review</a>`,
  replay: `<div class="learning__dropDownListTitleW--lessons">Lesson 1</div><div class="learning__dropDownListTitleW--steps">Step 4: Test</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>2/3</span>` +
    `<div class="dndBank dndZone"><span class="dnditem">uno</span><span class="dnditem">dos</span><span class="dnditem">tres</span></div><p>a <span class="dndZone"></span> b <span class="dndZone"></span> c <span class="dndZone"></span></p>`,
  // NUEVOS v20.1 — fin del review: ED ya saltó a la lección 5; el bot debe volver a Lesson 4 / Step 3
  reviewEndDropdown: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 5: Meeting People</div>
<div class="learning__dropDownListW--lessons"><div class="learning__dropDownList_item" id="L4">4. Past Form of Modals: Review</div><div class="learning__dropDownList_item learning__dropDownList_item--current">5. Meeting People</div></div>
<div class="learning__dropDownListTitleW--steps">Step 1: Explora</div>
<div class="learning__dropDownListW--steps"><div class="learning__dropDownList_item" id="S3">3. Prueba</div></div>
<a class="tasksBtnext learning__nextItemLink">Next</a>`,
    ls: { 'ed:testRun:v1': JSON.stringify({ key: 'Lesson 4: Past Form of Modals: Review||Step 3: Prueba', phase: 'review', attempts: 1 }) },
    setup: w => {
      const d = w.document;
      d.getElementById('L4').addEventListener('click', () => { d.querySelector('.learning__dropDownListTitleW--lessons').textContent = 'Lesson 4: Past Form of Modals: Review'; });
      d.getElementById('S3').addEventListener('click', () => { d.querySelector('.learning__dropDownListTitleW--steps').textContent = 'Step 3: Prueba'; d.body.insertAdjacentHTML('beforeend', '<a class="btnStartTest">Start</a>'); });
    } },
  reviewEndPrev: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 5: Meeting People</div><div class="learning__dropDownListTitleW--steps">Step 1: Explora</div>
<div class="learning__tasksBtns"><a class="tasksBtprev learning__prevItemLink" id="P">&lt;</a><a class="tasksBtnext learning__nextItemLink">Next</a></div>`,
    ls: { 'ed:testRun:v1': JSON.stringify({ key: 'Lesson 4: Past Form of Modals: Review||Step 3: Prueba', phase: 'review', attempts: 1 }) },
    setup: w => {
      const d = w.document;
      d.getElementById('P').addEventListener('click', () => { d.querySelector('.learning__dropDownListTitleW--lessons').textContent = 'Lesson 4: Past Form of Modals: Review'; d.querySelector('.learning__dropDownListTitleW--steps').textContent = 'Step 3: Prueba'; });
    } },
  // NUEVO v20.2 — review DnD (TextToPic, 2/6): la pestaña correcta hay que pulsarla y ED tarda en llenar los huecos
  reviewDnD: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 1: Introduction: Ecotourism</div><div class="learning__dropDownListTitleW--steps">Step 5: Repasemos</div>
<div class="testResultBtnsW"><ul><li id="liY" class="active"><a>&nbsp;Tu respuesta</a></li><li id="liC"><a id="aC">Respuesta correcta</a></li></ul></div>
<div class="prTextToPic__wordsBankWrapper"><div class="dndBank dndZone" id="bank"><span class="dnditem">coastline</span><span class="dnditem">debris</span></div></div>
<div class="prTextToPic__zoneWrapper"><div class="dndZone" id="z1"></div></div><div class="prTextToPic__zoneWrapper"><div class="dndZone" id="z2"></div></div>
<span>2 / 6</span><a class="tasksBtnext learning__nextItemLink">Next</a>`,
    setup: w => {
      const d = w.document;
      d.getElementById('aC').addEventListener('click', () => {
        d.getElementById('liC').className = 'active'; d.getElementById('liY').className = '';
        const t0 = w.Date.now(), st = w.setTimeout;   // ED llena los huecos 1,2 s DESPUÉS del clic (reloj simulado)
        w.setTimeout = (fn, ms) => st(() => {
          if (w.Date.now() - t0 >= 1200 && d.querySelector('#bank .dnditem')) { const its = d.querySelectorAll('#bank .dnditem'); d.getElementById('z1').appendChild(its[1]); d.getElementById('z2').appendChild(its[0]); }
          fn();
        }, ms);
      });
    } },
  // NUEVO v20.3 — clasificación True/False (prCl) en el REVIEW con "Respuesta correcta": banco vacío, columnas con fichas
  reviewClassif: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 2: The Experience of a Lifetime</div><div class="learning__dropDownListTitleW--steps">Step 5: Repasemos</div>
<div class="testResultBtnsW"><ul><li><a>&nbsp;Tu respuesta</a></li><li class="active"><a>Respuesta correcta</a></li></ul></div>
<div class="prCl__container prCl__container--normal"><div class="containerHeader">True</div><div class="prCl__col"><ed-la-dndzone class="prCl__zone"><div class="dndZone"><div class="dnditem draggable">Volunteer vacations help.</div><div class="dnditem draggable">Ulithi has turtles.</div></div></ed-la-dndzone></div></div>
<div class="prCl__container prCl__container--normal"><div class="containerHeader">False</div><div class="prCl__col"><ed-la-dndzone class="prCl__zone"><div class="dndZone"><div class="dnditem draggable">You must snorkel.</div></div></ed-la-dndzone></div></div>
<div class="prCl__container prCl__container--bank"><div class="prCl__col"><ed-la-dndzone class="prCl__zone"><div class="dndZone"></div></ed-la-dndzone></div></div>
<span>5 / 6</span><a class="tasksBtnext learning__nextItemLink">Next</a>` },
  // NUEVO v20.3 — la misma clasificación en la PREGUNTA (replay): todo en el banco, columnas vacías
  replayClassif: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 2: The Experience of a Lifetime</div><div class="learning__dropDownListTitleW--steps">Step 5: Repasemos</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>5 / 6</span>
<div class="prCl__container prCl__container--normal"><div class="containerHeader">True</div><div class="prCl__col"><ed-la-dndzone class="prCl__zone"><div class="dndZone" id="T"></div></ed-la-dndzone></div></div>
<div class="prCl__container prCl__container--normal"><div class="containerHeader">False</div><div class="prCl__col"><ed-la-dndzone class="prCl__zone"><div class="dndZone" id="F"></div></ed-la-dndzone></div></div>
<div class="prCl__container prCl__container--bank"><div class="prCl__col"><ed-la-dndzone class="prCl__zone"><div class="dndZone"><div class="dnditem draggable">You must snorkel.</div><div class="dnditem draggable">Volunteer vacations help.</div><div class="dnditem draggable">Ulithi has turtles.</div></div></ed-la-dndzone></div></div>`,
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 2: The Experience of a Lifetime||Step 5: Repasemos']),
      'ed:testAns:v2': JSON.stringify({ 'Lesson 2: The Experience of a Lifetime||Step 5: Repasemos': { 5: { dnd: [{ label: '', texts: ['Volunteer vacations help.', 'Ulithi has turtles.'], text: 'Volunteer vacations help.' }, { label: '', texts: ['You must snorkel.'], text: 'You must snorkel.' }] } } }) } },
  // NUEVO v20.4 — ORDENAR en el review (Lesson 3 · Step 5 · 4/6): "Tu respuesta" (checkAnswerMode) → clic → "Respuesta correcta" (seeAnswerMode), ED tarda 1,2 s
  reviewSeq: { html: SEQ_HTML(['Gabrielle joins the party.', 'Gabrielle finally agrees and goes to get ready.', "Gabrielle tells Dalia she's not going to the party.", "Dalia asks Gabrielle why she's not ready to go to the party.", 'Dalia tries to convince Gabrielle to come with her.', 'Gabrielle and Dalia enter the party.'], true),
    setup: w => {
      const d = w.document;
      d.getElementById('aC').addEventListener('click', () => {
        d.getElementById('liC').className = 'active'; d.getElementById('liY').className = '';
        const t0 = w.Date.now(), st = w.setTimeout;
        w.setTimeout = (fn, ms) => st(() => {
          const main = d.querySelector('.prSeq__main');
          if (w.Date.now() - t0 >= 1200 && main.classList.contains('checkAnswerMode')) {
            main.className = 'prSeq__main seeAnswerMode';
            const ok = SEQ_OK; d.querySelectorAll('.sequenceZone .dnditem').forEach((it, k) => { it.textContent = ok[k]; it.className = 'dnditem'; });
          }
          fn();
        }, ms);
      });
    } },
  // NUEVO v20.4 — ORDENAR en el reintento, si ED INTERCAMBIA las fichas al soltar
  replaySeqSwap: { html: SEQ_HTML(['Gabrielle joins the party.', 'Gabrielle finally agrees and goes to get ready.', "Gabrielle tells Dalia she's not going to the party.", "Dalia asks Gabrielle why she's not ready to go to the party.", 'Dalia tries to convince Gabrielle to come with her.', 'Gabrielle and Dalia enter the party.'], false),
    ls: LS_SEQ, setup: w => SEQ_DROP(w, 'swap') },
  // NUEVO v20.4 — ORDENAR en el reintento, si ED INSERTA y corre las demás
  replaySeqInsert: { html: SEQ_HTML(['Gabrielle joins the party.', 'Gabrielle finally agrees and goes to get ready.', "Gabrielle tells Dalia she's not going to the party.", "Dalia asks Gabrielle why she's not ready to go to the party.", 'Dalia tries to convince Gabrielle to come with her.', 'Gabrielle and Dalia enter the party.'], false),
    ls: LS_SEQ, setup: w => SEQ_DROP(w, 'insert') },
  // NUEVO v20.1 — 4 visitas al puntaje < 100 % → debe DETENERSE (ED_TEST_NO_100)
  scoreGiveUp: { html: NAV.replace('STEP', 'Step 4: Test') + `<div class="TestResults">Your score 40%</div><a class="learning__testReviewLink">Review</a>`, steps: 4 },
};
const LS_REPLAY = { 'ed:testKnown:v1': JSON.stringify(['Lesson 1||Step 4: Test']),
  'ed:testAns:v2': JSON.stringify({ 'Lesson 1||Step 4: Test': { 2: { dnd: [{label:'x',texts:['tres'],text:'tres'},{label:'x',texts:['uno'],text:'uno'},{label:'x',texts:['dos'],text:'dos'}] } } }) };

// Pantallas falsas mínimas (solo las clases que el bot mira).
async function run(code, fixture, ls, opts = {}) {
  const dom = new JSDOM(`<body>${fixture}</body>`, { url: 'https://ed.engdis.com/upbstacruz/learningArea', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, trace = [];
  let now = 1e12;
  w.Date.now = () => now;
  w.setTimeout = (fn, ms) => { now += (ms || 0); setImmediate(fn); return 1; };
  w.setInterval = () => 0; w.clearInterval = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  Object.defineProperty(w.HTMLElement.prototype, 'innerText', { get() { return this.textContent; } });
  w.document.elementFromPoint = () => null;
  w.Element.prototype.getBoundingClientRect = function () { return { left: 10, top: 10, right: 110, bottom: 40, width: 100, height: 30 }; };
  Object.defineProperty(w.HTMLElement.prototype, 'offsetParent', { get() { return this.parentElement; } });
  const lbl = el => (el.className || el.tagName) + ':' + (el.textContent || '').trim().slice(0, 15);
  const oc = w.HTMLElement.prototype.click;
  w.HTMLElement.prototype.click = function () { trace.push('click ' + lbl(this)); return oc.call(this); };
  const od = w.EventTarget.prototype.dispatchEvent;
  w.EventTarget.prototype.dispatchEvent = function (e) { if (e.type === 'pointerdown' || e.type === 'pointerup') trace.push(e.type + ' ' + (this.className ? lbl(this) : 'doc')); return od.call(this, e); };
  w.console.log = w.console.warn = w.console.error = w.console.table = () => {};
  for (const [k, v] of Object.entries(ls || {})) w.localStorage.setItem(k, v);
  w.eval(code);
  if (opts.setup) opts.setup(w);
  const kind = w.__ed.kind();
  let r; for (let i = 0; i < (opts.steps || 1); i++) { try { r = await w.__ed.step(); } catch (e) { r = 'ERR ' + e.message; } }
  return { kind, r: JSON.stringify(r), trace: trace.join(' | '), ls: w.localStorage.getItem('ed:testAns:v2') };
}
(async () => {
  const actual = {};
  for (const [name, fx] of Object.entries(FIX)) actual[name] = typeof fx === 'string'
    ? await run(CODE, fx, name === 'replay' ? LS_REPLAY : null)
    : await run(CODE, fx.html, fx.ls, fx);
  if (process.argv.includes('--actualizar') || !fs.existsSync(SNAP)) {
    fs.writeFileSync(SNAP, JSON.stringify(actual, null, 2) + '\n');
    console.log('✓ snapshot guardado (' + Object.keys(actual).length + ' pantallas)');
    return;
  }
  const esperado = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  let fallos = 0;
  for (const name of new Set([...Object.keys(esperado), ...Object.keys(actual)])) {
    const ok = JSON.stringify(esperado[name]) === JSON.stringify(actual[name]);
    console.log((ok ? '  ✓ ' : '  ✗ ') + name.padEnd(10) + (actual[name] ? actual[name].kind : '(falta)'));
    if (!ok) { fallos++; console.log('     esperado:', esperado[name], '\n     actual:  ', actual[name]); }
  }
  if (fallos) { console.error(`✗ ${fallos} pantalla(s) cambiaron de comportamiento`); process.exit(1); }
  console.log('✓ mismo comportamiento que el snapshot');
})();
