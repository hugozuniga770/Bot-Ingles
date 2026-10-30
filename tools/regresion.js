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

// ---- ayudantes para el DnD viejo "span.droptarget" (v20.5), HTML real de Lesson 5 · Step 3 · 7/10 ----
const DROP_KEY = 'Lesson 5: More Conditionals: Review||Step 3: Test';
const DROP_OK = ['brushed', 'be sitting', "'d be"];
function DROP_HTML(review) {
  const head = `<div class="learning__dropDownListTitleW--lessons">Lesson 5: More Conditionals: Review</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div>`;
  const tabs = review ? `<div class="testResultTools"><ul><li id="liY" class="active"><a index="0">Your Answer</a></li><li id="liC"><a index="1" id="aC">Correct Answer</a></li></ul></div>` : `<a class="tasksBtnext learning__submitTestLink">Submit</a>`;
  const hueco = n => `<span qnum="1" data-id="1_${n}" class="TTpanswerDiv droptarget" ans="">&nbsp;&nbsp;&nbsp;&nbsp;</span>`;
  const fichas = ['have sat', "'d be", 'be sitting', 'brushed', "'re"].map((t, k) => `<div id="${k}" class="draggableContainer"><div data-id="${50 + k}" class="draggable wordBankTile">${t}</div></div>`).join('');
  return head + tabs + `<div class="ClozeTxtDiv"><div class="TextDiv" id="1_1">If you'd ${hueco(1)} your teeth, you wouldn't still ${hueco(2)} here. You ${hueco(3)} done.</div></div><div class="wordsBankWrapper"><div class="wordsBankTable" id="TTpTablePlaceHolder">${fichas}</div></div><span>7 / 10</span>` + (review ? `<a class="tasksBtnext learning__nextItemLink">Next</a>` : '');
}
// Simula el arrastre viejo de ED: mousedown en la ficha, mouseup sobre un hueco → la ficha entra al hueco
function DROP_DRAG(w) {
  const d = w.document; let cogida = null;
  d.addEventListener('mousedown', e => { cogida = e.target.closest && e.target.closest('.draggable'); });
  d.addEventListener('mouseup', e => { const t = e.target.closest && e.target.closest('.droptarget'); if (cogida && t && !t.querySelector('.draggable')) { t.innerHTML = ''; t.appendChild(cogida); } cogida = null; });
}

// ---- ayudantes v20.7 ----
// Marca la tarea actual como hecha (lo que hace ED tras UNA acción en prácticas)
const MARCAR_HECHA = w => { const t = w.document.querySelector('.learning__tasksNav_task--current'); if (t) t.classList.add('learning__tasksNav_task--done'); };
const PRACT = (step, cur = 2) => `<div class="learning__dropDownListTitleW--lessons">Lesson 1: An Unusual Guest</div><div class="learning__dropDownListTitleW--steps">${step}</div>
<div class="learning__tasksNav"><a class="learning__tasksNav_task">1</a><a class="learning__tasksNav_task learning__tasksNav_task--current">${cur}</a></div>
<a id="play-pause" class="layout__mediaPlayPause"></a><a class="tasksBtnext learning__nextItemLink">Next</a>`;
const SEQ_PRACT = ['Alex walked from Texas to New York.', "The reception clerk didn't have a reservation for Alex.", 'The reservation clerk found Alex a room.'].map((t, i) => `<div class="prSeq__container regContainer prSeq__containerW prSeq__container--txt"><h2 class="containerHeader">${i + 1}</h2><div class="prSeq__container prSeq__container--txt"><div class="sequenceZone"><ed-la-dndzone><div class="dndZone"><ed-la-dnditem><div class="dnditem draggable">${t}</div></ed-la-dnditem></div></ed-la-dndzone></div></div></div>`).join('');

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
  // NUEVO v20.5 — DnD viejo en el REVIEW: "Your Answer" vacía → clic → "Correct Answer" pone las fichas en los huecos (1,2 s)
  reviewDrop: { html: DROP_HTML(true), setup: w => {
      const d = w.document;
      d.getElementById('aC').addEventListener('click', () => {
        d.getElementById('liC').className = 'active'; d.getElementById('liY').className = '';
        const t0 = w.Date.now(), st = w.setTimeout;
        w.setTimeout = (fn, ms) => st(() => {
          if (w.Date.now() - t0 >= 1200 && !d.querySelector('.droptarget .draggable')) {
            const ts = d.querySelectorAll('.droptarget'), tiles = [...d.querySelectorAll('.wordBankTile')];
            DROP_OK.forEach((v, k) => { ts[k].innerHTML = ''; ts[k].appendChild(tiles.find(x => x.textContent === v)); });
          }
          fn();
        }, ms);
      });
    } },
  // NUEVO v20.5 — DnD viejo en el REINTENTO: coloca las 3 palabras cosechadas
  replayDrop: { html: DROP_HTML(false), setup: DROP_DRAG,
    ls: { 'ed:testKnown:v1': JSON.stringify([DROP_KEY]), 'ed:testAns:v2': JSON.stringify({ [DROP_KEY]: { 7: { drop: DROP_OK } } }) } },
  // NUEVO v20.6 — DnD viejo en una PRÁCTICA con video al lado (Lesson 5 · Step 3: Practice · 11/20). Antes se tomaba como 'media'
  practiceDrop: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 5: Past Simple: Irregular Verbs</div><div class="learning__dropDownListTitleW--steps">Step 3: Practice</div>
<div class="learning__tasksNav"><a class="learning__tasksNav_task learning__tasksNav_task--current">11<span class="learning__tasksNav_taskTooltip">x</span></a><a class="learning__tasksNav_task">12</a></div>
<a id="play-pause" class="layout__mediaPlayPause layout__mediaPlayPause--play"></a>
<div class="ClozeTxtDiv"><div class="TextDiv">- I <span qnum="1" data-id="1_1" class="TTpanswerDiv droptarget" ans="">&nbsp;&nbsp;&nbsp;&nbsp;</span> yesterday and hurt my ankle.</div></div>
<div class="wordsBankWrapper"><div class="wordsBankTable" id="TTpTablePlaceHolder">${['feel', 'did fall', 'felt', 'fell'].map((t, k) => `<div id="${k}" class="draggableContainer"><div class="draggable wordBankTile">${t}</div></div>`).join('')}</div></div>
<span>11 / 20</span><a class="tasksBtnext learning__nextItemLink">Next</a>`, setup: DROP_DRAG },
  // NUEVO v20.7 — ORDENAR en PRÁCTICA con el diseño nuevo (cada recuadro con 1 ficha). Antes: seq_no_items
  practiceSeq: { html: PRACT('Step 2: Practice') + `<div class="prSeq__main prSeq__main--txt"><div class="prSeq__mainIW">${SEQ_PRACT}</div></div>`,
    setup: w => { const d = w.document; let c = null;
      d.addEventListener('mousedown', e => { c = e.target.closest && e.target.closest('.dnditem'); });
      d.addEventListener('mouseup', e => { const z = e.target.closest && e.target.closest('.dndZone'); if (c && z && !z.contains(c)) { const o = z.querySelector('.dnditem'); const from = c.closest('.dndZone'); z.appendChild(c); if (o) from.appendChild(o); MARCAR_HECHA(w); } c = null; }); } },
  // NUEVO v20.7 — MCQ VIEJO en práctica (lessonMultipleAnswer, con audio al lado). Antes: 'media'
  practiceLegacyMCQ: { html: PRACT('Step 2: Practice', 1) + `<div class="answersWrapper mcq"><div class="lessonAnswersWrapper sentence">${['Betty likes the factory.', "The announcer's name is Don.", 'There is a lot of noise.'].map((t, i) => `<div class="${i === 1 ? 'c ' : ''}ADUMClass lessonMultipleAnswer"><div class="multiRadio"><input class="lessonMultipleCheck" type="checkbox"><label class="overlayCheckbox"></label></div><div class="multiText"><span class="multiTextInline">${t}</span></div></div>`).join('')}</div></div>`,
    setup: w => w.document.querySelectorAll('.lessonMultipleAnswer').forEach(o => o.addEventListener('click', () => { const i = o.querySelector('input'); i.checked = !i.checked; o.classList.toggle('check', i.checked); MARCAR_HECHA(w); })) },
  // NUEVO v20.7 — DnD de práctica: ED marca la tarea tras la 1.ª ficha → el bot se detiene (antes ponía las 3)
  practiceDnDOne: { html: PRACT('Step 2: Practice') + `<div class="dndBank dndZone"><span class="dnditem">uno</span><span class="dnditem">dos</span><span class="dnditem">tres</span></div><p>a <span class="dndZone"></span> b <span class="dndZone"></span> c <span class="dndZone"></span></p>`,
    setup: w => w.document.addEventListener('mouseup', () => MARCAR_HECHA(w)) },
  // NUEVO v20.7 — TEST EXPRÉS: 1.er intento sin respuestas → salta a la última pregunta y Submit
  testExpress: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 9: Express</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div>
<div class="learning__tasksNav">${[1, 2, 3, 4, 5].map(n => `<a class="learning__tasksNav_task${n === 1 ? ' learning__tasksNav_task--current' : ''}" id="t${n}">${n}</a>`).join('')}</div>
<div class="learning__headerIW">Choose the correct answer.</div><label class="prMCQ__answerLabel">A</label><span>1 / 5</span><a class="tasksBtnext learning__nextItemLink" id="nx">Next</a>`,
    setup: w => { const d = w.document; d.getElementById('t5').addEventListener('click', () => {
      d.querySelectorAll('.learning__tasksNav_task').forEach(t => t.classList.remove('learning__tasksNav_task--current'));
      d.getElementById('t5').classList.add('learning__tasksNav_task--current');
      d.getElementById('nx').className = 'tasksBtnext learning__submitTestLink'; d.getElementById('nx').textContent = 'Submit'; }); } },
  // NUEVO v20.7 — DESPLEGABLE VIEJO en el reintento (estructura SUPUESTA: hueco .questionText + lista <li> al pulsar)
  replayLegacyDDL: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 3: Present Simple: Review</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>12 / 15</span>
<div class="answersWrapper fillInBlank fitb">School <span class="questionText" id="b1"><span class="arrowWrapper"></span></span> in half an hour. I <span class="questionText" id="b2"><span class="arrowWrapper"></span></span> feel well.</div>`,
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 3: Present Simple: Review||Step 3: Test']), 'ed:testAns:v2': JSON.stringify({ 'Lesson 3: Present Simple: Review||Step 3: Test': { 12: { lddl: ['starts', "don't"] } } }) },
    setup: w => { const d = w.document;
      d.querySelectorAll('.questionText').forEach(b => b.addEventListener('click', () => {
        d.querySelectorAll('ul.lista').forEach(u => u.remove());
        const u = d.createElement('ul'); u.className = 'lista';
        ['start', 'starts', "don't", 'am not'].forEach(t => { const li = d.createElement('li'); li.textContent = t; li.addEventListener('click', ev => { ev.stopPropagation(); b.firstChild && b.firstChild.nodeType === 3 ? b.firstChild.textContent = t : b.insertBefore(d.createTextNode(t), b.firstChild); u.remove(); }); u.appendChild(li); });
        d.body.appendChild(u); })); } },
  // NUEVO v20.8 — MEMORY GAME (estructura memoG; cómo marca ED una pareja es SUPUESTO)
  practiceMemory: { html: PRACT('Step 2: Practice', 3).replace('<a class="learning__tasksNav_task">1</a>', '<a class="learning__tasksNav_task">1</a><a class="learning__tasksNav_task">2</a>') + `<div class="memoG__wrapper">${[['word', 'A', 'judge'], ['word', 'B', 'thief'], ['image', 'B', ''], ['image', 'A', '']].map(([t, p, w]) => `<div class="memoG__card memoG__card--${t}" data-p="${p}"><div class="memoG__cardIW"><div class="memoG__cardSideFront">${w}</div></div></div>`).join('')}</div>`,
    setup: w => { const d = w.document; let abiertas = [];
      d.querySelectorAll('.memoG__card').forEach(c => c.addEventListener('click', () => {
        if (/matched/.test(c.className) || abiertas.includes(c)) return;
        c.classList.add('memoG__card--flipped'); abiertas.push(c);
        if (abiertas.length === 2) { const [a, b] = abiertas; abiertas = [];
          if (a.dataset.p === b.dataset.p && a !== b) { [a, b].forEach(x => { x.classList.remove('memoG__card--flipped'); x.classList.add('memoG__card--matched'); }); if (d.querySelectorAll('.memoG__card--matched').length === 4) MARCAR_HECHA(w); }
          else w.setTimeout(() => [a, b].forEach(x => x.classList.remove('memoG__card--flipped')), 800); } })); } },
  // NUEVO v20.8 — SPEAKING completo: Start → (prepare) Skip → (record) Stop → Send to teacher
  speechFlow: { html: PRACT('Step 5: Personalized speaking', 1).replace('<a class="learning__tasksNav_task">1</a>', '') + `<div class="answersWrapper openSpeech"><div class="openSpeech__AnsW openSpeech__AnsW--intro" id="aw"><div id="stateDiv"><div class="openSpeech__btn openSpeech__btnStart" id="b">Start</div></div><div class="openSpeech__btn openSpeech__SentTTBtn disabled" id="send">Send to teacher</div></div></div>`,
    setup: w => { const d = w.document, aw = d.getElementById('aw'), b = d.getElementById('b'), send = d.getElementById('send');
      b.addEventListener('click', () => {
        if (/intro/.test(aw.className)) { aw.className = 'openSpeech__AnsW openSpeech__AnsW--prepare'; b.className = 'openSpeech__btn openSpeech__btnSkip'; b.textContent = 'Skip'; }
        else if (/prepare/.test(aw.className)) { aw.className = 'openSpeech__AnsW openSpeech__AnsW--record'; b.className = 'openSpeech__btn openSpeech__btnStop'; b.textContent = 'Stop'; }
        else if (/record/.test(aw.className)) { aw.className = 'openSpeech__AnsW openSpeech__AnsW--send'; b.remove(); send.classList.remove('disabled'); } });
      send.addEventListener('click', () => { if (!send.classList.contains('disabled')) { send.classList.add('disabled'); aw.className = 'openSpeech__AnsW openSpeech__AnsW--sent'; MARCAR_HECHA(w); } }); } },
  // NUEVO v20.8 — BARRIDO dentro de una lección: no está en el test → va al step de test por el desplegable
  sweepLesson: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 2: Call-in</div><div class="learning__dropDownListW--lessons"><div class="learning__dropDownList_unitName">Unit 3: Media</div><div class="learning__dropDownList_item learning__dropDownList_item--current">2. Call-in</div><div class="learning__dropDownList_item">3. Next one</div></div>
<div class="learning__dropDownListTitleW--steps">Step 1: Explore</div><div class="learning__dropDownListW--steps"><div class="learning__dropDownList_item learning__dropDownList_item--current">1. Explore</div><div class="learning__dropDownList_item" id="st">3. Test</div></div><a class="tasksBtnext learning__nextItemLink">Next</a>`,
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, phase: 'lesson', lessonsDone: [], unitsDone: [], resultados: [] }) },
    setup: w => w.document.getElementById('st').addEventListener('click', () => { w.document.querySelector('.learning__dropDownListTitleW--steps').textContent = 'Step 3: Test'; }) },
  // NUEVO v20.8 — BARRIDO en el HOME: unidad 1 ya hecha → entra a la 2 (con scroll)
  sweepHome: { url: 'https://ed.engdis.com/upbstacruz#/home', html: `<div class="layout__mainContent">${[1, 2, 3].map(n => `<div class="home__unitW home__unitW--notLocked"><div class="home__unitIW"><div class="home__unit" id="u${n}"><div class="home__details"><span class="home__detailsNumber">${n}</span><span class="home__detailsTitle">Unit title ${n}</span></div></div></div></div>`).join('')}</div>`,
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, phase: 'home', lessonsDone: [], unitsDone: [1], resultados: [] }) } },
  // NUEVO v20.1 — 4 visitas al puntaje < 100 % → debe DETENERSE (ED_TEST_NO_100)
  scoreGiveUp: { html: NAV.replace('STEP', 'Step 4: Test') + `<div class="TestResults">Your score 40%</div><a class="learning__testReviewLink">Review</a>`, steps: 4 },
};
const LS_REPLAY = { 'ed:testKnown:v1': JSON.stringify(['Lesson 1||Step 4: Test']),
  'ed:testAns:v2': JSON.stringify({ 'Lesson 1||Step 4: Test': { 2: { dnd: [{label:'x',texts:['tres'],text:'tres'},{label:'x',texts:['uno'],text:'uno'},{label:'x',texts:['dos'],text:'dos'}] } } }) };

// Pantallas falsas mínimas (solo las clases que el bot mira).
async function run(code, fixture, ls, opts = {}) {
  const dom = new JSDOM(`<body>${fixture}</body>`, { url: opts.url || 'https://ed.engdis.com/upbstacruz/learningArea', runScripts: 'outside-only', pretendToBeVisual: true });
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
  w.__edNoAutoResume = true;   // las pruebas no deben arrancar el bucle auto() solas
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
