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

// ---- ayudantes del HOME (v21.3), con las clases reales de los dumps del 31/10 ----
function HOME_HTML(unidades, avg, comp) {
  return `<div class="home__studentWidgetCompletion"><span class="home__studentWidgetData">${comp}%</span> Course Completion</div>
<div class="home__studentWidgetTestScores"><span class="home__studentWidgetData">${avg}%</span> Average Test Score</div>
<div class="home__units">${unidades.map(([n, t, hecha]) => `<div class="home__unitW home__unitW--notLocked"><div class="home__unitIW"><div class="home__unit" id="u${n}">${hecha ? '<div class="home__statusW"><span class="home__status">Completed!</span></div>' : '<div class="home__statusW"></div>'}<div class="home__details"><span class="home__detailsNumber">${n}</span><span class="home__detailsTitle">${t}</span></div></div></div></div>`).join('')}</div>`;
}
// Al pulsar una tarjeta aparece su lista de lecciones; la lección 1 al 100 %, la 2 al 40 %
function HOME_SETUP(w) {
  const d = w.document;
  d.querySelectorAll('.home__unit').forEach(u => u.addEventListener('click', () => {
    if (u.parentElement.querySelector('.home__courseListItem')) return;
    u.parentElement.insertAdjacentHTML('beforeend', [[1, 'Directions to the Museum', 100], [2, 'Clean-House Agency', 40], [3, 'Newsstand', 0]].map(([n, t, p]) =>
      `<div class="home__courseListItem"><a class="home__courseListItemLink" id="L${u.id}_${n}"><span class="home__courseListItemNumber">${n}.</span> <span class="home__courseListItemName">${t}</span></a><span class="home__courseListItemProgress"><span style="width: ${p}%"></span></span></div>`).join(''));
  }));
}

// ---- My Progress (v21.8), con las clases reales de los dumps del 01/11 ----
const MP_UNIT = (n, nombre, comp, locked) => `<div class="myProgress__unitW" id="mu${n}"><div class="myProgress__unitHeader${locked ? ' myProgress__unitHeader--locked' : ''}"><div class="myProgress__unitHeaderIW">
<span class="myProgress__unitTitle">Unit ${n}</span><span class="myProgress__unitName">${nombre}</span><span class="myProgress__unitCompletionData">${comp}%</span><span class="myProgress__unitArrow myProgress__unitArrow--closed"></span></div></div></div>`;
const MP_HTML = `<div class="myProgress__main"><div class="home__studentWidgetCompletion"><div class="home__studentWidgetData">83</div></div><div class="home__studentWidgetTestScores"><div class="home__studentWidgetData">94</div></div>
${MP_UNIT(1, 'Couples', 100)}${MP_UNIT(2, 'Sport And Fitness', 60)}${MP_UNIT(3, 'Locked', 0, true)}</div>`;
const MP_LECC = { 1: [[1, 'Nick and Emily', '100%', 'Terminado', 3], [2, 'A New Acquaintance', '80%', 'Terminado', 3], [3, 'Divorced', 'No test', 'Terminado', 3]],
  2: [[1, 'Food', '100%', 'Terminado', 3], [2, 'Gym', '', 'En progreso', 1]] };
function MP_SETUP(w) {
  const d = w.document;
  d.querySelectorAll('.myProgress__unitW').forEach(uw => { const n = +uw.id.slice(2); uw.querySelector('.myProgress__unitHeaderIW').addEventListener('click', () => {
    if (uw.querySelector('.myProgress__unitLesson') || !MP_LECC[n]) return;
    uw.insertAdjacentHTML('beforeend', MP_LECC[n].map(([ln, nm, ts, st, hechos]) => `<div class="myProgress__unitLesson"><span class="myProgress__unitLesson_number">${ln}</span><span class="myProgress__unitLesson_name">${nm}</span>
${[1, 2, 3].map(k => `<div class="myProgress__unitLesson_step"><div class="myProgress__unitLesson_stepProgressIW${k <= hechos ? ' myProgress__unitLesson_stepProgressIW--done' : ''}"></div></div>`).join('')}
<span class="myProgress__unitLesson_testScore">${ts}</span><span class="myProgress__unitLesson_statusLabel">${st}</span></div>`).join('')); }); });
}

// ---- ayudantes v21.10: unidad 12 de Jose con los desplegables REALES (reporte 1:07 AM, 2.ª corrida) ----
const COMPL_ESTADO = { done: ['progressBar__progress--done', 'Completed'], inProgress: ['progressBar__progress--inProgress', 'In Progress'] };
const COMPL_ITEM = (texto, estado, actual) => `<div class="learning__dropDownList_item${actual ? ' learning__dropDownList_item--current' : ''}"><div class="learning__dropDownList_itemName"><div class="learning__dropDownList_itemNameText">${texto}</div></div><div class="learning__dropDownList_itemProgress"><ed-progress-bar><div class="progressBar__main progressBar__main--steppedWide progressBar__main--stepped notSupportedMobiles"><div class="progressBar__wrapper" title=""><div class="progressBar__progress ${COMPL_ESTADO[estado][0]}"><span class="progressBar__tooltip">${COMPL_ESTADO[estado][1]}</span></div></div></div></ed-progress-bar></div></div>`;
function COMPL_U12(leccion, actual, estados) {
  const nombres = ['Ad', 'Call-in', 'Drama', 'Family', 'Friends'];
  return `<section class="learning__dropDownListTitleW learning__dropDownListTitleW--lessons"><div class="learning__dropDownListTitle">${leccion}</div></section>
<section class="learning__dropDownListW learning__dropDownListW--lessons"><div class="learning__dropDownList_CourseUnitInfo"><div class="learning__dropDownList_courseName">UPB Beginners 2</div><div class="learning__dropDownList_unitName">Unit 12: Additional Listening</div></div>
${nombres.map((t, k) => COMPL_ITEM((k + 1) + '. ' + t, estados[k], k + 1 === actual)).join('')}</section>
<section class="learning__dropDownListTitleW learning__dropDownListTitleW--steps"><div class="learning__dropDownListTitle">Step 3: Test</div></section>
<section class="learning__dropDownListW learning__dropDownListW--steps">${COMPL_ITEM('1. Explore', 'done')}${COMPL_ITEM('2. Practice', 'done')}${COMPL_ITEM('3. Test', 'done', true)}</section>
<div class="sitemenu__itemHome"><a>Home</a></div><a class="btnStartTest">Start Test</a><a class="tasksBtnext learning__nextItemLink">Next</a>`;
}
const COMPL_SWEEP = JSON.stringify({ active: true, mode: 'completar', phase: 'in_unit', unitTarget: 12, lessonsDone: [], unitsDone: [], resultados: [] });

// ---- ayudantes v21.11 ----
// Desplegable viejo con el comportamiento REAL de ED: tras elegir una opción, no abre otra lista hasta un clic FUERA
function LDDL_BLOQUEO(w, ops) {
  const d = w.document; let bloqueada = false;
  const cerrar = () => d.querySelectorAll('.optionsWrapper').forEach(u => u.remove());
  d.querySelectorAll('.fitb span[id]').forEach(sp => sp.addEventListener('click', () => {
    if (bloqueada) return;
    cerrar(); const ow = d.createElement('div'); ow.className = 'optionsWrapper'; const ul = d.createElement('ul'); ow.appendChild(ul);
    ops.forEach(t => { const li = d.createElement('li'); li.textContent = t; li.addEventListener('click', ev => { ev.stopPropagation(); sp.querySelector('.questionText').textContent = t; cerrar(); bloqueada = true; }); ul.appendChild(li); });
    d.body.appendChild(ow); }));
  d.addEventListener('click', e => { if (!(e.target.closest && e.target.closest('.fitb span[id], .optionsWrapper'))) bloqueada = false; });
}
// Pantalla de práctica SIN botón de audio (las de "Explore" no lo tienen)
const PRACT_SIN_AUDIO = (leccion, step) => `<div class="learning__dropDownList_unitName">Unit 3: Getting Help</div><div class="learning__dropDownListTitleW--lessons">${leccion}</div><div class="learning__dropDownListTitleW--steps">${step}</div>
<div class="learning__tasksNav"><a class="learning__tasksNav_task learning__tasksNav_task--current">1</a></div><a class="tasksBtnext learning__nextItemLink">Next</a>`;
// Resumen estable de la última entrada del reporte (sin la hora)
function REP_ULTIMA(w) {
  const l = JSON.parse(w.localStorage.getItem('ed:report:v1') || '[]'); const e = l[l.length - 1]; if (!e) return null;
  const d = e.dump || {};
  return { motivo: e.motivo, kind: e.kind, panelIzq: d.panelIzq ? d.panelIzq.texto.slice(0, 40) : null, controles: (d.controles || []).map(c => c.tag + '.' + c.clase.split(' ')[0] + (c.attrs && c.attrs['data-id'] ? '#' + c.attrs['data-id'] : '')).slice(0, 6),
    caja: !!d.cajaHTML, tareas: d.barra ? d.barra.tareas : null, antes: e.antes ? (e.antes.controles || []).length : null, resultado: e.resultado ? Object.keys(e.resultado).sort() : null };
}
// Home con todas las unidades hechas, un enlace "My Progress" y el mapa con la fila "Unit Test" de la unidad 1
const UT_MAPA = JSON.stringify({ unidades: [{ n: 1, completion: 100, locked: false, lecciones: [{ n: 1, nombre: 'Phone Sales', test: 100, terminado: true }, { n: 0, nombre: '', test: null, terminado: false }, { n: 0, nombre: 'Unit Test', test: null, terminado: false }] },
  { n: 2, completion: 100, locked: false, lecciones: [{ n: 1, nombre: 'Food', test: 100, terminado: true }, { n: 0, nombre: 'Unit Test', test: 100, terminado: true }] }] });
const UT_SWEEP = extra => JSON.stringify(Object.assign({ active: true, mode: 'completar', phase: 'home', mapaHecho: true, objetivos: [], objHechos: [], lessonsDone: [], unitsDone: [], resultados: [], homeUrl: 'https://ed.engdis.com/upbstacruz#/home', inicio: 'c1' }, extra || {}));

// ---- ayudantes v21.12: HTML REAL de los dumps de Hugo (02/11) ----
// Desplegable viejo, variante de Roy (U14 L3 12/15): ED abre SOLA la lista del 1.er hueco; el bloqueo solo se arma
// cuando la lista se abrió con un CLIC. Patrón real: "1:ya_abierta, 2:clic_texto, 3:ninguno✗, 4:clic_texto".
function LDDL_ROY(w, ops) {
  const d = w.document; let bloqueada = false;
  const cerrar = () => d.querySelectorAll('.optionsWrapper').forEach(u => u.remove());
  const abrir = (sp, porClic) => { cerrar(); const ow = d.createElement('div'); ow.className = 'optionsWrapper'; const ul = d.createElement('ul'); ow.appendChild(ul);
    ops.forEach(t => { const li = d.createElement('li'); li.textContent = t; li.addEventListener('click', ev => { ev.stopPropagation(); sp.querySelector('.questionText').textContent = t; cerrar(); if (porClic) bloqueada = true; }); ul.appendChild(li); });
    d.body.appendChild(ow); };
  const spans = [...d.querySelectorAll('.fitb span[id]')];
  spans.forEach(sp => sp.addEventListener('click', () => { if (!bloqueada) abrir(sp, true); }));
  d.addEventListener('click', e => { if (!(e.target.closest && e.target.closest('.fitb span[id], .optionsWrapper'))) bloqueada = false; });
  abrir(spans[0], false);
}
// Elemento que "carga" tarde: sin tamaño (invisible) hasta que pasan ms del reloj de la prueba
function CARGA_TARDE(w, el, ms) { const t0 = w.Date.now(); el.getBoundingClientRect = () => (w.Date.now() - t0 < ms ? { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 } : { left: 10, top: 10, right: 110, bottom: 40, width: 100, height: 30 }); }
const PRACT_U = (unidad, leccion, step, tareas) => `<div class="learning__dropDownList_unitName">${unidad}</div><div class="learning__dropDownListTitleW--lessons">${leccion}</div><div class="learning__dropDownListTitleW--steps">${step}</div>
<div class="learning__tasksNav">${tareas || '<a class="learning__tasksNav_task learning__tasksNav_task--current">1</a>'}</div><a class="tasksBtnext learning__nextItemLink">Next</a>`;
const VIDEO_CTRL = `<div id="video-controls" class="layout__mediaControlsW layout__videoControlsW" style=""><a id="play-pause" class="layout__mediaPlayPause layout__mediaPlayPause--play"></a><span class="layout__mediaTimeW"><span id="playing-time" class="layout__mediaPlayTime">00:00</span>/<span id="total-time" class="layout__mediaTotalTime">01:07</span></span><span class="layout__mediaSeekBarW"><input type="range" id="seek-bar" value="0" class="layout__mediaSeekBar"></span><a id="speaker" class="layout__mediaSpeaker"><span class="layout__mediaVolumeBarW"><input type="range" id="volume-bar" min="0" max="1" step="0.1" value="1" class="layout__mediaVolumeBar"></span></a><a id="mediaSettings" class="layout__mediaSettings"><span class="layout__mediaSettingsSpeeds"><span class="speed" id="mediaSpeed_0-5">0.5x</span><span class="speed" id="mediaSpeed_0-75">0.75x</span><span class="speed speed--selected" id="mediaSpeed_1">Normal</span><span class="speed" id="mediaSpeed_1-25">1.25x</span><span class="speed" id="mediaSpeed_1-5">1.5x</span><span class="speed" id="mediaSpeed_2">2x</span></span></a><a id="full-screen" class="layout__mediafullScreen"></a></div>`;
const SPEAK_INTERACT1 = `<div class="answersWrapper" style="height: 755px;"><div class="speakingInteract"><div class="mediaContainerWrapper"><div class="mediaContainer"><div class="bgImgContainerWrapper"><div class="generalIcon leftIcon left"><a class="chooseCaracterArrow"></a></div><div id="bgImgContainer" class="bgImgContainer"><video id="Practice1" type="video/mp4" width="300" height="200" preload="auto"><source></video></div><div id="video-controls" class="layout__mediaControlsW layout__videoControlsW"><a id="play-pause" class="layout__mediaPlayPause layout__mediaPlayPause--play"></a><span class="layout__mediaTimeW"><span id="playing-time" class="layout__mediaPlayTime">00:00</span>/<span id="total-time" class="layout__mediaTotalTime">00:35</span></span><span class="layout__mediaSeekBarW"><input type="range" id="seek-bar" value="0" class="layout__mediaSeekBar"></span><a id="speaker" class="layout__mediaSpeaker"><span class="layout__mediaVolumeBarW"><input type="range" id="volume-bar" min="0" max="1" step="0.1" value="1" class="layout__mediaVolumeBar"></span></a><a id="mediaSettings" class="layout__mediaSettings"><span class="layout__mediaSettingsSpeeds"><span class="speed" id="mediaSpeed_0-5">0.5x</span><span class="speed" id="mediaSpeed_0-75">0.75x</span><span class="speed speed--selected" id="mediaSpeed_1">Normal</span><span class="speed" id="mediaSpeed_1-25">1.25x</span><span class="speed" id="mediaSpeed_1-5">1.5x</span><span class="speed" id="mediaSpeed_2">2x</span></span></a><a id="full-screen" class="layout__mediafullScreen"></a></div><div class="generalIcon rightIcon right"><a class="chooseCaracterArrow"></a></div></div></div><div class=""></div><div class="speakingInteractPanelsWrapper"><div class="buttonWrapper continueWrapper disable"><a class="button continue">Start</a></div><div class="recordingPanelWrapper"><div class="recordingPanelSentence"><div class="sentenceWrapper"><div class="recordingPanelSentenceText">So, what kind of student housing are you interested in?</div></div><div class="statusIcon"></div></div><div class="recordingPanelSentence"><div class="sentenceWrapper"><div class="recordingPanelSentenceText">I think I want to live in a dormitory.</div></div><div class="statusIcon"></div></div></div></div></div><div class="speakingInteractButtonWrapper"><div class="buttonWrapper startAgainWrapper left disable"><a class="button startAgain pressed"><span>Restart</span></a></div></div></div></div>`;
const SPEAK_BRANCHING = `<div class="answersWrapper interact2 webRtc" style="height: 755px;"><div class="speakingInteract"><div class="mediaContainerWrapper"><div class="mediaContainer"><div class="bubblesContainer"><div class="bubble"><div class="bubbleTextWrapper"><div class="bubbleTextInnerWrapper"><span class="bubbleTxt">- So, what kind of student housing are you interested in?</span></div></div><div class="speakerButtonWrapper"><div class="generalIcon speaker"></div></div></div><div class="arrow-down"></div></div><div class="bgImgContainer" id="bgImgContainer"><video id="Practice2" type="video/mp4" width="300" height="200" preload="auto"><source></video></div><div id="video-controls" class="layout__mediaControlsW layout__videoControlsW"><a id="play-pause" class="layout__mediaPlayPause layout__mediaPlayPause--play"></a><span class="layout__mediaTimeW"><span id="playing-time" class="layout__mediaPlayTime">00:04</span>/<span id="total-time" class="layout__mediaTotalTime">01:18</span></span><span class="layout__mediaSeekBarW"><input type="range" id="seek-bar" value="0" class="layout__mediaSeekBar"></span><a id="speaker" class="layout__mediaSpeaker"><span class="layout__mediaVolumeBarW"><input type="range" id="volume-bar" min="0" max="1" step="0.1" value="1" class="layout__mediaVolumeBar"></span></a><a id="mediaSettings" class="layout__mediaSettings"><span class="layout__mediaSettingsSpeeds"><span class="speed" id="mediaSpeed_0-5">0.5x</span><span class="speed" id="mediaSpeed_0-75">0.75x</span><span class="speed speed--selected" id="mediaSpeed_1">Normal</span><span class="speed" id="mediaSpeed_1-25">1.25x</span><span class="speed" id="mediaSpeed_1-5">1.5x</span><span class="speed" id="mediaSpeed_2">2x</span></span></a><a id="full-screen" class="layout__mediafullScreen"></a></div></div><div class="speakingInteractPanelsWrapper counter"><div class="buttonWrapper continueWrapper"><a class="button continue">Start</a></div><div class="recordingPanelWrapper"><div class="recordingPanelSentencesWrapper"><div class="recordingPanelSentence"><div class="sentenceWrapper"><div class="recordingPanelSentenceText">- I think I want to live in a dormitory.</div></div></div><div class="recordingPanelSentence"><div class="sentenceWrapper"><div class="recordingPanelSentenceText">- I'd like an apartment, please.</div></div></div></div><div class="recordPanelWrapperJoint"><div class="RecordButtonWrapper disable"><a class="panelButton speakIcon"></a></div></div></div></div></div><div class="speakingInteractButtonWrapper"><div class="buttonWrapper startAgainWrapper left"><a class="button startAgain"><span>Restart</span></a></div></div></div></div>`;
const WRITING_EDIT = `<p> <span class="segment"> </span> <span class="segment">What do I like to do on the <input type="text" value="weekend." autocapitalize="off" autocorrect="off" class=""></span> <span class="segment">Well, I <input type="text" value="alway" autocapitalize="off" autocorrect="off" class=""> sleep late on Saturday morning!</span> <span class="segment">I <input type="text" value="usual" autocapitalize="off" autocorrect="off" class=""> visit my family.</span> <span class="segment"><input type="text" value="Sometime" autocapitalize="off" autocorrect="off" class=""> I go bike riding in the park with my friends.</span> <span class="segment">It's a great park.</span> <span class="segment">I also like going for long <input type="text" value="walks?" autocapitalize="off" autocorrect="off" class=""></span></p>`;
// Unidad 8 de Mateo: desplegables de lecciones y pasos (lección 2, paso 1 "Explore" sin tareas)
function U8_HTML(leccion, paso) {
  const lecs = ['Lost Report', "Grumble's Department Store", "Don't Do That", 'Modals: Have To', 'Modals: May', 'Work'];
  const pasos = ['Explore', 'Practice', 'Test'];
  const it = (t, cur, done) => `<div class="learning__dropDownList_item${cur ? ' learning__dropDownList_item--current' : ''}"><div class="learning__dropDownList_itemName"><div class="learning__dropDownList_itemNameText">${t}</div></div><div class="learning__dropDownList_itemProgress"><div class="progressBar__progress progressBar__progress--${done ? 'done' : 'notStarted'}"><span class="progressBar__tooltip">${done ? 'Completed' : 'Not Started'}</span></div></div></div>`;
  return `<section class="learning__dropDownListTitleW learning__dropDownListTitleW--lessons"><div class="learning__dropDownListTitle">Lesson ${leccion}: ${lecs[leccion - 1]}</div></section>
<section class="learning__dropDownListW learning__dropDownListW--lessons"><div class="learning__dropDownList_CourseUnitInfo"><div class="learning__dropDownList_courseName">UPB Beginners 2</div><div class="learning__dropDownList_unitName">Unit 8: A Bad Day</div></div>${lecs.map((t, k) => it((k + 1) + '. ' + t, k + 1 === leccion, k === 0)).join('')}</section>
<section class="learning__dropDownListTitleW learning__dropDownListTitleW--steps"><div class="learning__dropDownListTitle">Step ${paso}: ${pasos[paso - 1]}</div></section>
<section class="learning__dropDownListW learning__dropDownListW--steps">${pasos.map((t, k) => it((k + 1) + '. ' + t, k + 1 === paso, false)).join('')}</section>
<div class="learning__unitW--noTaskInstructions"><div class="readingExploreWrapper"><p>Dear Customer Service, ...</p></div></div><div class="sitemenu__itemHome"><a>Home</a></div><a class="tasksBtnext learning__nextItemLink">Next</a>`;
}

// NUEVO v21.13: lo que el bot dejó en el tablero (ed:tablero:v1)
const TABLERO = w => { const t = JSON.parse(w.localStorage.getItem('ed:tablero:v1') || '{}'); return Object.fromEntries(Object.entries(t.pasos || {}).map(([k, e]) => [k, { tareas: e.tareas, motivo: e.motivo || null, reporte: e.reporte || null }])); };
const NAV = `<div class="learning__dropDownListTitleW--lessons">Lesson 1</div><div class="learning__dropDownListTitleW--steps">STEP</div>
<div class="learning__tasksNav"><a class="learning__tasksNav_task learning__tasksNav_task--current">1<span class="learning__tasksNav_taskTooltip">x</span></a><a class="learning__tasksNav_task">2</a></div>
<a class="tasksBtnext learning__nextItemLink">Next</a>`;
// ---- ayudantes v21.16: HTML REAL de los reportes de Nore / Maria y de los dumps de Hugo (02–03/11) ----
// Guía de ED (driver.js) tal como sale en 20 reportes de Nore: "Got it!", "Don't show again". Mientras está abierta,
// driver.js deja la página sin clics (pointer-events: none) → un arrastre suelta "en la nada".
const GUIA_HTML = `<div class="driver-popover" role="dialog"><div class="driver-popover-title">View Resource</div><div class="driver-popover-description">Click here to read or listen again.</div><footer class="driver-popover-footer"><input type="checkbox" name="dontShowAgainCbx" id="dontShowAgainCbx"><label for="dontShowAgainCbx" id="dontShowAgainLbl">Don't show again</label><span class="driver-popover-navigation-btns"><button type="button" class="driver-popover-next-btn">Got it!</button></span></footer></div>`;
function GUIA(w) {
  const d = w.document; d.body.classList.add('driver-active'); d.body.insertAdjacentHTML('beforeend', GUIA_HTML);
  d.querySelector('.driver-popover-next-btn').addEventListener('click', () => { d.querySelector('.driver-popover').remove(); d.body.classList.remove('driver-active'); });
}
// Arrastre de ED (dragula, ed-la-dnditem): la ficha entra al hueco donde se suelta; con la guía abierta, no entra
function DRAGULA(w) {
  const d = w.document; let c = null;
  d.addEventListener('mousedown', e => { c = e.target.closest && e.target.closest('ed-la-dnditem'); });
  d.addEventListener('mouseup', e => {
    const it = c; c = null; if (!it || d.body.classList.contains('driver-active')) return;
    const caja = e.target.closest && e.target.closest('.prMT_T2T__regContainer, .prCl__col');
    const z = (e.target.closest && e.target.closest('.dndZone')) || (caja && caja.querySelector('.dndZone'));
    if (!z || z.contains(it) || z.getAttribute('dg_name') === 'TTpTablePlaceHolder') return;
    z.appendChild(it); MARCAR_HECHA(w);
  });
}
const CAREER = (k) => PRACT_U('Unit 10: Personality Types', 'Lesson 6: An Interview With a Career Advisor', 'Step 2: Listen again', [1, 2, 3, 4, 5, 6].map(n => `<a class="learning__tasksNav_task${n === k ? ' learning__tasksNav_task--current' : ''}">${n}</a>`).join('')) + `<span>${k} / 6</span>`;
const DND_REVERSE = `<div _ngcontent-c2="" class="learning__angPracticeW"> <ed-la-matching><div class="prMT_T2T__main prMT_T2T__main--banksize_short"> <div class="prMT_T2T__answersWrapper"> <div class="prMT_T2T__answers"> <div class="prMT_T2T__answersRowTitle prMT_T2T__answersRowTitle--reverseColumn"> <div class="prMT_T2T__answersTextTitle"> <h2 class="prMT_T2T__containerHeader containerHeader">Words/Phrases </h2> </div> <div class="prMT_T2T__regContainerTitle"> <h2 class="containerHeader">Definitions</h2> </div> </div> <div class="prMT_T2T__answersRowsBody mCustomScrollbar _mCS_69 mCS_no_scrollbar"><div id="mCSB_69" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_69_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <div class="prMT_T2T__answersRow prMT_T2T__answersRow--first prMT_T2T__answersRow--reverseColumn"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">person who pays a professional for&nbsp;a service or help</span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="0" id="undefined_0"> </div> </ed-la-dndzone> </div> </div><div class="prMT_T2T__answersRow prMT_T2T__answersRow--reverseColumn"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">psychological category that a person belongs to</span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="1" id="undefined_1"> </div> </ed-la-dndzone> </div> </div><div class="prMT_T2T__answersRow prMT_T2T__answersRow--reverseColumn"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">large selection of options to choose from</span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="2" id="undefined_2"> </div> </ed-la-dndzone> </div> </div><div class="prMT_T2T__answersRow prMT_T2T__answersRow--reverseColumn"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">group of things that are similar</span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="3" id="undefined_3"> </div> </ed-la-dndzone> </div> </div><div class="prMT_T2T__answersRow prMT_T2T__answersRow--reverseColumn"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">find out or locate exactly</span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="4" id="undefined_4"> </div> </ed-la-dndzone> </div> </div><div class="prMT_T2T__answersRow prMT_T2T__answersRow--reverseColumn"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">focus your attention on </span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="5" id="undefined_5"> </div> </ed-la-dndzone> </div> </div> </div><div id="mCSB_69_scrollbar_vertical" class="mCSB_scrollTools mCSB_69_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_69_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> </div> </div> <div class="prMT_T2T__wordsBankWrapper mCustomScrollbar _mCS_70 mCS_no_scrollbar" id="bankContainer"><div id="mCSB_70" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_70_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <ed-la-dndzone><div class="dndZone" style="min-height:40px" dg_name="TTpTablePlaceHolder" id="undefined_6"> <ed-la-dnditem> <div class="dnditem draggable" ans_id="9"> personality type </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="58"> pinpoint </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="81"> category </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="2"> wide range </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="55"> zero in on </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="7"> client </div></ed-la-dnditem> </div> </ed-la-dndzone> </div><div id="mCSB_70_scrollbar_vertical" class="mCSB_scrollTools mCSB_70_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_70_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> </div> </ed-la-matching> </div>`;
const DND_TRUEFALSE = `<div _ngcontent-c2="" class="learning__angPracticeW"> <ed-la-dndclassification><div class="prCl__main classification prCl__main--col-3"> <div class="prCl__container prCl__container--normal regContainer"> <h2 class="containerHeader">True</h2> <div class="prCl__col mCustomScrollbar _mCS_71 mCS_no_scrollbar"><div id="mCSB_71" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_71_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <ed-la-dndzone class="prCl__zone"><div class="dndZone" style="min-height:60px" dg_name="0" id="undefined_0"> </div> </ed-la-dndzone> </div><div id="mCSB_71_scrollbar_vertical" class="mCSB_scrollTools mCSB_71_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_71_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> <div class="itemsCounter"> <ul> <li></li><li></li><li></li> </ul> </div> </div><div class="prCl__container prCl__container--normal regContainer"> <h2 class="containerHeader">False</h2> <div class="prCl__col mCustomScrollbar _mCS_72 mCS_no_scrollbar"><div id="mCSB_72" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_72_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <ed-la-dndzone class="prCl__zone"><div class="dndZone" style="min-height:60px" dg_name="1" id="undefined_1"> </div> </ed-la-dndzone> </div><div id="mCSB_72_scrollbar_vertical" class="mCSB_scrollTools mCSB_72_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_72_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> <div class="itemsCounter"> <ul> <li></li><li></li><li></li> </ul> </div> </div> <div class="prCl__container prCl__container--bank bankContainer" id="bankContainer"> <div class="prCl__col mCustomScrollbar _mCS_73 mCS_no_scrollbar"><div id="mCSB_73" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_73_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <ed-la-dndzone class="prCl__zone"><div class="dndZone" style="min-height:60px" dg_name="TTpTablePlaceHolder" id="undefined_2"> <ed-la-dnditem> <div class="dnditem draggable" ans_id="47"> Bob invented the&amp;nbsp;Holland Personality Types. </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="80"> Bob categorizes his clients into personality types. </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="23"> Bob usually only needs to meet with clients once. </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="45"> Most of Bob's clients already know their personality type </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="76"> There are many different jobs suitable for each personality type. </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="60"> Bob's services are helpful for people interested in switching careers. </div></ed-la-dnditem> </div> </ed-la-dndzone> </div><div id="mCSB_73_scrollbar_vertical" class="mCSB_scrollTools mCSB_73_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_73_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> </div> </div></ed-la-dndclassification> </div>`;
// "Personalized writing" de Nore (dump de Hugo 7be35758): el e-mail de Ariella con 6 campos ya escritos
const WRITING_ARIELLA = `<div class="readingExploreMainContent"> <h3><span class="segment">Sonya!</span></h3> <p> <span class="segment">At first I was surprised that the personality quiz said you <input type="text" value="was" autocapitalize="off" autocorrect="off"> an introvert!</span> <span class="segment">We have a great time when you come with me <input type="text" value="too" autocapitalize="off" autocorrect="off"> parties.</span> <span class="segment">You seem to have a lot of fun.</span> <span class="segment">But I guess it's true that you like to be alone.</span> <span class="segment">Sometimes you <input type="text" value="didn't" autocapitalize="off" autocorrect="off"> even pick up the phone when I call.</span> <span class="segment">You prefer to text.</span> <span class="segment">Perhaps you really are an introvert.</span> <span class="segment">The quiz said I am an extrovert and I think that <input type="text" value="be" autocapitalize="off" autocorrect="off"> correct.</span> <span class="segment">If I am alone for too long, I <input type="text" value="getting" autocapitalize="off" autocorrect="off"> really bored.</span></p> <p><span class="segment">Tomorrow there is a study group for our psychology class.</span> <span class="segment">Will you <input type="text" value="to come" autocapitalize="off" autocorrect="off"> with me?</span> </p><br><br><span class="segment">Give me a call,<br> Ariella</span> </div>`;
// ED escucha el TECLADO en esos campos (Hugo: "a 'was' añádele 'wasa' y ya sale completo"): sin keydown no marca
function ED_TECLADO(w) {
  const d = w.document; let tecla = false;
  d.addEventListener('keydown', e => { if (e.target.closest && e.target.closest('.writingEditFrame')) tecla = true; });
  d.querySelectorAll('.writingEditFrame input').forEach(i => i.addEventListener('input', () => { if (tecla) MARCAR_HECHA(w); }));
}
// Explore de gramática con AUDIO (dump de Hugo 87575023, clases reales): play → a los 3 s ED marca la tarea
const AUDIO_GRAMATICA = `<div class="learning__resourcesArea learning__resourcesArea--jQuery leftDiv learning__resourcesArea--full learning__resourcesArea--seeTextOpen"><div id="bgContainer" class="learning__RAIWrapper left"><div class="learning__RAMediaResourceW learning__RAMediaResourceW--html5Audio"><div class="mediaContainer"><div class="learning__RAMediaOW"><div class="bgImgContainerWrapper"></div></div></div><div id="trContainer" class="trContainer"><div class="CTrackerCtrl layout__mediaControlsW layout__audioControlsW"><div class="layout__mediaPlayPause layout__mediaPlayPause--play CTrackerPlayBtnD" id="CTrackerPlayBtn"></div><div class="CTrackerSlideContainer layout__mediaSeekBarW"><div class="CTrackerSlide" id="sl0base"></div><div class="CTrackerSlider layout__mediaSliderThumb" id="sl0slider"><div class="layout__mediaSliderThumbBtn"></div></div></div><span class="layout__mediaTimeW"><span id="playing-time" class="layout__mediaPlayTime">00:00</span>/<span id="total-time" class="layout__mediaTotalTime">00:09</span></span><a id="mediaSettings" class="layout__mediaSettings"></a><a id="speaker" class="layout__mediaSpeaker"></a></div></div></div><div class="learning__RATextResourceW"><div class="learning__RATextOW"><div class="learning__RATextMiddleWrapper"><div id="textContainer" class="learning__RATextW"><div class="seeTextContainer selected"><table><tr><td class="alignTop">-</td><td><span class="segment">Don't you think <span class="hlgrammar">you should have asked</span> your father for permission to take his car?</span></td></tr><tr><td class="alignTop">-</td><td><span class="segment">Even if I'd wanted to <span class="hlgrammar">I couldn't have</span>. He wasn't at home.</span></td></tr></table></div></div></div></div></div></div></div><div class="learning__practiceArea rightDiv"><ed-la-practicearea><div class="stepTasksAndPmContainer"><div class="pmContainer" id="pmContainer"></div></div></ed-la-practicearea></div>`;
function ED_AUDIO(w) {
  const d = w.document, b = d.querySelector('#CTrackerPlayBtn');
  b.addEventListener('click', () => { b.className = b.className.replace('--play', '--pause'); w.setTimeout(() => { d.querySelector('#playing-time').textContent = '00:03'; MARCAR_HECHA(w); }, 3000); });
}
// "Watch again" con imágenes (reporte #51 de Maria): cada opción trae el ícono ✓/✗ ESCONDIDO desde antes de contestar
const MCQ_IMG_OCULTOS = `<div _ngcontent-c2="" class="learning__angPracticeW"> <ng-component><div class="prMCQ__main prMCQ__main--ansImages mCustomScrollbar _mCS_18 mCS_no_scrollbar"><div id="mCSB_18" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_18_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <div class="prMCQ__mainIW"> <div class="prMCQ__qaSet"> <div class="prMCQ__qaInnerSet"> <div class="prMCQ__questionW"> <div class="prMCQ__questionText">What does Molly suggest they do together? </div> </div> <div class="prMCQ__answersW"> <div class="prMCQ__answers"> <div class="multiRadioWrapper"> <img class="prMCQ__answerImage"><div style="display:none" class="checkAnswerIcon selection--x"></div> </div> </div><div class="prMCQ__answers"> <div class="multiRadioWrapper"> <img class="prMCQ__answerImage"><div style="display:none" class="checkAnswerIcon selection--x"></div> </div> </div><div class="prMCQ__answers"> <div class="multiRadioWrapper correct"> <img class="prMCQ__answerImage"><div style="display:none" class="checkAnswerIcon selection--v"></div> </div> </div><div class="prMCQ__answers"> <div class="multiRadioWrapper"> <img class="prMCQ__answerImage"><div style="display:none" class="checkAnswerIcon selection--x"></div> </div> </div> </div> </div> </div> </div> </div><div id="mCSB_18_scrollbar_vertical" class="mCSB_scrollTools mCSB_18_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_18_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> </ng-component> </div>`;
function ED_IMAGENES(w) {
  w.document.querySelectorAll('.prMCQ__answers').forEach(op => op.addEventListener('click', () => { const i = op.querySelector('.checkAnswerIcon'); i.style.display = ''; op.querySelector('.multiRadioWrapper').classList.add('checked'); MARCAR_HECHA(w); }));
}
// Home con DOS cursos en el carrusel (Roy y Mateo: "UPB Beginners 1" y "UPB Beginners 2"): la flecha › cambia el curso
const CARRUSEL = `<div class="home__carousel carousel slide"><div class="carousel-inner"><div class="carousel-item active"><h2 class="home__courseTitle">UPB Beginners 1</h2><div class="carouselStartBtnW"><a>Continue</a></div></div></div><a class="carousel-control-prev"><span class="carousel-control-prev-icon"></span></a><a class="carousel-control-next"><span class="carousel-control-next-icon"></span></a></div>`;
function ED_CARRUSEL(w) {
  const d = w.document, t = d.querySelector('.home__courseTitle'), cursos = ['UPB Beginners 1', 'UPB Beginners 2'];
  d.querySelector('.carousel-control-next').addEventListener('click', () => { t.textContent = cursos[(cursos.indexOf(t.textContent) + 1) % cursos.length]; });
}

// ---- ayudantes v21.17: HTML REAL del zip de Caro (03/11, v21.16) ----
const JOLT_TABLA = `<div _ngcontent-c2="" class="learning__angPracticeW"> <ed-la-matching><div class="prMT_T2T__main prMT_T2T__main--banksize_short"> <div class="prMT_T2T__answersWrapper"> <div class="prMT_T2T__answers"> <div class="prMT_T2T__answersRowTitle"> <div class="prMT_T2T__answersTextTitle"> <h2 class="prMT_T2T__containerHeader containerHeader">Category</h2> </div> <div class="prMT_T2T__regContainerTitle"> <h2 class="containerHeader">Infomation</h2> </div> </div> <div class="prMT_T2T__answersRowsBody mCustomScrollbar _mCS_29 mCS_no_scrollbar"><div id="mCSB_29" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_29_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <div class="prMT_T2T__answersRow prMT_T2T__answersRow--first prMT_T2T__answersRow--full"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">Phone number</span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="0" id="undefined_0">  </div> </ed-la-dndzone> </div> </div><div class="prMT_T2T__answersRow prMT_T2T__answersRow--full"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">Address</span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="1" id="undefined_1">  </div> </ed-la-dndzone> </div> </div><div class="prMT_T2T__answersRow prMT_T2T__answersRow--full"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">Web site</span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="2" id="undefined_2">  </div> </ed-la-dndzone> </div> </div><div class="prMT_T2T__answersRow prMT_T2T__answersRow--full"> <div class="prMT_T2T__answersTextW"> <span class="prMT_T2T__answersText">E-mail</span> </div> <div class="prMT_T2T__regContainer"> <ed-la-dndzone class="prMT_T2T__regContainerIW"><div class="dndZone" style="min-height:40px" dg_name="3" id="undefined_3">  </div> </ed-la-dndzone> </div> </div> </div><div id="mCSB_29_scrollbar_vertical" class="mCSB_scrollTools mCSB_29_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_29_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> </div> </div> <div class="prMT_T2T__wordsBankWrapper mCustomScrollbar _mCS_30 mCS_no_scrollbar" id="bankContainer"><div id="mCSB_30" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_30_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <ed-la-dndzone><div class="dndZone" style="min-height:40px" dg_name="TTpTablePlaceHolder" style="min-height:60px" id="undefined_4"><ed-la-dnditem> <div class="dnditem draggable" ans_id="62"> 344-555-9089 </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="43"> 7743 N. Broadway </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="63"> JoltGym.com </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="52"> info@joltgym.com </div></ed-la-dnditem> </div> </ed-la-dndzone> </div><div id="mCSB_30_scrollbar_vertical" class="mCSB_scrollTools mCSB_30_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_30_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> </div> </ed-la-matching> </div>`;
const AD_CLOZE = `<div _ngcontent-c2="" class="learning__angPracticeW"> <ed-la-dndcloze><div class="prCLZ__main"> <div class="prCLZ__answersWrapper answersWrapper1 cloze"> <div class="prCLZ__frame closeFrame mCustomScrollbar _mCS_34 mCS_no_scrollbar"><div id="mCSB_34" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_34_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <div class="prCLZ__questionW"> <div class="prCLZ__question"> <div> <span>Fred is </span> <div class="prCLZ__regContainer"> <ed-la-dndzone><div class="dndZone" dg_name="0" id="0_0"> </div> </ed-la-dndzone> </div> </div><div> <span> furniture.</span> </div> </div> </div> </div><div id="mCSB_34_scrollbar_vertical" class="mCSB_scrollTools mCSB_34_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_34_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> <div class="prCLZ__wordsBankWrapper wordsBankWrapper1 mCustomScrollbar _mCS_35 mCS_no_scrollbar" id="bankContainer"><div id="mCSB_35" class="mCustomScrollBox mCS-light mCSB_vertical mCSB_inside" tabindex="0"><div id="mCSB_35_container" class="mCSB_container mCS_no_scrollbar_y" dir="ltr"> <ed-la-dndzone class="dndBank" ed-la-clozetilewidth=""><div class="dndZone" dg_name="TTpTablePlaceHolder" id="bank_1"> <ed-la-dnditem> <div class="dnditem draggable" ans_id="77"> selling </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="38"> buying </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="85"> painting </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="97"> renting </div></ed-la-dnditem> </div> </ed-la-dndzone> </div><div id="mCSB_35_scrollbar_vertical" class="mCSB_scrollTools mCSB_35_scrollbar mCS-light mCSB_scrollTools_vertical mCSB_scrollTools_onDrag_expand"><div class="mCSB_draggerContainer"><div id="mCSB_35_dragger_vertical" class="mCSB_dragger"><div class="mCSB_dragger_bar"></div></div><div class="mCSB_draggerRail"></div></div></div></div></div> </div> </div> </ed-la-dndcloze> </div>`;
const TEST_HEAD = (lec, paso, k, n) => `<div class="learning__dropDownListTitleW--lessons">${lec}</div><div class="learning__dropDownListTitleW--steps">${paso}</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>${k} / ${n}</span>`;
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
    ls: { 'ed:cfg:v18.11': JSON.stringify({ testExpress: true, cfgV: 3 }) },   // AJUSTADA v21.7: el exprés ahora viene apagado; aquí se activa a mano
    setup: w => { const d = w.document; d.getElementById('t5').addEventListener('click', () => {
      d.querySelectorAll('.learning__tasksNav_task').forEach(t => t.classList.remove('learning__tasksNav_task--current'));
      d.getElementById('t5').classList.add('learning__tasksNav_task--current');
      d.getElementById('nx').className = 'tasksBtnext learning__submitTestLink'; d.getElementById('nx').textContent = 'Submit'; }); } },
  // AJUSTADA v20.9 — DESPLEGABLE VIEJO en el reintento, con la estructura REAL (dump Lesson 5: Nouns · Test · 9/10):
  // <span id="1_1"><div class="questionText"></div><div class="arrowWrapper">…</div></span> y al pulsar aparece .optionsWrapper
  replayLegacyDDL: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 5: Nouns: This/That/These/Those</div><div class="learning__dropDownListTitleW--steps">Step 4: Test</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>9 / 10</span>
<div class="answersWrapper fillInBlank"><div class="fitb"><div class="bubbleLeft bubbleItem">Is <span id="1_1" class="answered"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> boat safe?</div><div class="bubbleRight bubbleItem">Yes, but <span id="1_2" class="active"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> boats aren't.</div></div></div>`,
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 5: Nouns: This/That/These/Those||Step 4: Test']), 'ed:testAns:v2': JSON.stringify({ 'Lesson 5: Nouns: This/That/These/Those||Step 4: Test': { 9: { lddl: ['this', 'those'] } } }) },
    setup: w => { const d = w.document;
      d.querySelectorAll('.fitb span[id]').forEach(sp => sp.addEventListener('click', () => {
        d.querySelectorAll('.optionsWrapper').forEach(u => u.remove());
        const ow = d.createElement('div'); ow.className = 'optionsWrapper'; const ul = d.createElement('ul'); ow.appendChild(ul);
        ['this', 'these', 'those', 'that'].forEach(t => { const li = d.createElement('li'); li.textContent = t; li.addEventListener('click', ev => { ev.stopPropagation(); sp.querySelector('.questionText').textContent = t; ow.remove(); }); ul.appendChild(li); });
        d.body.appendChild(ow); })); } },
  // NUEVO v21.0 — tu REPORTE (Lesson 5: Be-Past: Questions · Test · 7/10, quedó en 97 %): el banco tiene
  // "Weren't" y "weren't"; lo correcto es "weren't". Antes se elegía la 1.ª sin mirar mayúsculas.
  replayDropCase: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 5: Be-Past: Questions</div><div class="learning__dropDownListTitleW--steps">Step 4: Test</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>7 / 10</span>
<div class="ClozeTxtDiv"><div class="TextDiv">- <span class="TTpanswerDiv droptarget" ans="">&nbsp;</span> <span class="TTpanswerDiv droptarget" ans="">&nbsp;</span> you at home last night?</div></div>
<div class="wordsBankTable" id="TTpTablePlaceHolder">${['Why', "Weren't", "weren't", 'Were'].map((t, k) => `<div id="${k}" class="draggableContainer"><div data-id="${60 + k}" class="draggable wordBankTile">${t}</div></div>`).join('')}</div>`,
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 5: Be-Past: Questions||Step 4: Test']), 'ed:testAns:v2': JSON.stringify({ 'Lesson 5: Be-Past: Questions||Step 4: Test': { 7: { drop: ['Why', "weren't"] } } }) },
    setup: DROP_DRAG },
  // NUEVO v20.10 — tu REPORTE (Lesson 5: Nouns · Test · 3/4/7/9): ED abre SOLA la lista del 1.er hueco al cargar,
  // y las demás se abren con el FOCO (Tab), no con clic. Patrón real: 1.er hueco bien, 2.º "no se abrió la lista".
  replayLegacyDDLAuto: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 5: Nouns: This/That/These/Those</div><div class="learning__dropDownListTitleW--steps">Step 4: Test</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>3 / 10</span>
<div class="answersWrapper fillInBlank"><div class="fitb"><div class="bubbleLeft bubbleItem">Are you enjoying <span id="1_1" class="answered"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> hamburger?</div><div class="bubbleRight bubbleItem">Yes, and <span id="1_2" class="answered"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> pizza, too.</div></div></div>`,
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 5: Nouns: This/That/These/Those||Step 4: Test']), 'ed:testAns:v2': JSON.stringify({ 'Lesson 5: Nouns: This/That/These/Those||Step 4: Test': { 3: { lddl: ['that', 'this'] } } }) },
    setup: w => { const d = w.document; const spans = [...d.querySelectorAll('.fitb span[id]')];
      const cerrar = () => { d.querySelectorAll('.optionsWrapper').forEach(u => u.remove()); spans.forEach(x => x.classList.remove('active')); };
      const abrir = sp => { cerrar(); sp.classList.add('active'); const ow = d.createElement('div'); ow.className = 'optionsWrapper'; const ul = d.createElement('ul'); ow.appendChild(ul);
        ['this', 'these', 'those', 'that'].forEach(t => { const li = d.createElement('li'); li.textContent = t; li.addEventListener('click', ev => { ev.stopPropagation(); sp.querySelector('.questionText').textContent = t; cerrar(); }); ul.appendChild(li); });
        d.body.appendChild(ow); };
      spans.forEach(sp => sp.addEventListener('focus', () => abrir(sp)));   // SOLO con el foco (Tab)
      abrir(spans[0]); } },
  // NUEVO v21.9 — corrida de Jose (01/11) y de Nelson (v21.6): U14 · Lesson 3: Present Simple: Review · Test · 12/15,
  // HTML REAL del reporte. 4 huecos; patrón real en ED, siempre igual: "1:clic_texto, 2:ninguno✗, 3:clic_texto,
  // 4:ninguno✗" → test en 97 % 7 veces. Lo que reproduce ese patrón: después de ELEGIR una opción, ED no abre
  // otra lista hasta que haya un clic FUERA (el bot sí lo hacía tras un fallo con cerrarLista → por eso el
  // hueco siguiente al fallido salía bien). La v21.8 deja 2/4; la v21.9 cierra (clic fuera) y reintenta → 4/4.
  replayLegacyDDL4: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 3: Present Simple: Review</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>12 / 15</span>
<div class="answersWrapper fillInBlank"><div class="fitb"><div class="bubbleDiv"><div class="wrapBubbleLeft wrapBubbleItem"><div class="bubbleLeft bubbleItem">School <span id="1_1" class="answered" ed-trackable-click="at:User_Action;swap;id:29070"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> in half an hour, Ellen.</div><div class="bubbleLeftBottom bubbleItemBottom"></div></div><div class="wrapBubbleRight wrapBubbleItem"><div class="bubbleRight bubbleItem">I know. I <span id="1_2" class="answered" ed-trackable-click="at:User_Action;swap;id:29070"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> feel very well. I <span id="1_3" class="answered" ed-trackable-click="at:User_Action;swap;id:29070"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span><space width="8"><span id="1_4" class="answered" ed-trackable-click="at:User_Action;swap;id:29070"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span>.</space></div><div class="bubbleRightBottom bubbleItemBottom"></div></div><div class="wrapPicDiv"></div></div></div></div>`,
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 3: Present Simple: Review||Step 3: Test']), 'ed:testAns:v2': JSON.stringify({ 'Lesson 3: Present Simple: Review||Step 3: Test': { 12: { lddl: ['starts', "don't", 'am not', 'going'] } } }) },
    setup: w => { const d = w.document; let bloqueada = false;
      const ops = { '1_1': ['start', 'starts', 'is starting'], '1_2': ["don't", "doesn't", 'am not'], '1_3': ['am not', "don't", "isn't"], '1_4': ['go', 'going', 'goes'] };
      const cerrar = () => d.querySelectorAll('.optionsWrapper').forEach(u => u.remove());
      d.querySelectorAll('.fitb span[id]').forEach(sp => sp.addEventListener('click', () => {
        if (bloqueada) return;   // tras elegir, ED ignora los huecos hasta un clic fuera
        cerrar(); const ow = d.createElement('div'); ow.className = 'optionsWrapper'; const ul = d.createElement('ul'); ow.appendChild(ul);
        ops[sp.id].forEach(t => { const li = d.createElement('li'); li.textContent = t; li.addEventListener('click', ev => { ev.stopPropagation(); sp.querySelector('.questionText').textContent = t; cerrar(); bloqueada = true; }); ul.appendChild(li); });
        d.body.appendChild(ow); }));
      d.addEventListener('click', e => { if (!(e.target.closest && e.target.closest('.fitb span[id], .optionsWrapper'))) bloqueada = false; }); } },
  // NUEVO v20.9 — tu REPORTE (Lesson 5: Pronouns · Test · 3/10): en "Correct Answer" el hueco NO trae texto, solo ans="87"
  // (= data-id de la ficha "me"). Antes se guardaba "87" y en el reintento no hallaba ficha (moves: 0).
  reviewDropAnsId: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 5: Pronouns: Object</div><div class="learning__dropDownListTitleW--steps">Step 4: Test</div>
<div class="testResultTools"><ul><li id="liY" class="active"><a index="0">Your Answer</a></li><li id="liC"><a index="1" id="aC">Correct Answer</a></li></ul></div>
<div class="ClozeTxtDiv"><div class="TextDiv" id="1_1">Oh, Alan! Is this for <span qnum="1" data-id="1_1" class="TTpanswerDiv droptarget" id="h">&nbsp;&nbsp;&nbsp;</span>?</div></div>
<div class="wordsBankTable" id="TTpTablePlaceHolder">${[['75', 'mine'], ['87', 'me'], ['46', 'my']].map(([i, t], k) => `<div id="${k}" class="draggableContainer"><div data-id="${i}" class="draggable wordBankTile">${t}</div></div>`).join('')}</div>
<span>3 / 10</span><a class="tasksBtnext learning__nextItemLink">Next</a>`,
    setup: w => { const d = w.document; d.getElementById('aC').addEventListener('click', () => { d.getElementById('liC').className = 'active'; d.getElementById('liY').className = ''; d.getElementById('h').setAttribute('ans', '87'); }); } },
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
  // AJUSTADA v21.3 — HOME real (dumps del 31/10): pulsar una tarjeta DESPLIEGA su lista de lecciones; se entra con la lección
  sweepHome: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', false], [3, 'Getting Help', false]], 100, 25),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, phase: 'home', lessonsDone: [], unitsDone: [1], resultados: [] }) }, setup: HOME_SETUP },
  // NUEVO v21.3 — MODO COMPLETAR en el Home: salta la unidad 1 (Completed!), abre la 2 y entra a la 1.ª lección NO completa
  completarHome: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', false], [3, 'Getting Help', false]], 95, 25),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [] }) }, setup: HOME_SETUP },
  // NUEVO v21.7 — reporte de la nube (Nelson): "Choose the correct picture" → opciones con IMÁGENES, sin labels
  mcqImagenes: { html: `${NAV}<div class="learning__dropDownListTitleW--steps">Step 3: Watch again</div><div class="learning__tasksNav_task learning__tasksNav_task--current">2</div>
<div class="prMCQ__main prMCQ__main--ansImages"><div class="prMCQ__qaInnerSet"><div class="prMCQ__questionText">What does Molly suggest they do together?</div>
<div class="prMCQ__answersW"><div class="prMCQ__answers"><div class="multiRadioWrapper"><div class="checkAnswerIcon"></div><img class="prMCQ__answerImage" id="i1" src="a.png"></div></div><div class="prMCQ__answers"><div class="multiRadioWrapper"><img class="prMCQ__answerImage" id="i2" src="b.png"></div></div></div></div></div>` },
  // NUEVO v21.8 — MY PROGRESS (dumps del 01/11): despliega cada unidad y lee Last Test Score / Terminado
  myProgressLeer: { url: 'https://ed.engdis.com/upbstacruz#/MyProgress/Course/523991431/Unit/', html: MP_HTML,
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'tests', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [], homeUrl: 'https://ed.engdis.com/upbstacruz#/home' }) },
    setup: MP_SETUP },
  // NUEVO v21.8 — barrido CON MAPA en el Home: va directo a la unidad 1, lección 2 (único test < 100)
  barridoMapaHome: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Couples', true], [2, 'Sport', false]], 96, 83),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'tests', phase: 'home', mapaHecho: true, objetivos: [{ unidad: 1, leccion: 2, nombre: 'Clean-House Agency', test: 80 }], objHechos: [], lessonsDone: [], unitsDone: [], resultados: [] }) }, setup: HOME_SETUP },
  // NUEVO v21.8 — completar CON MAPA: la unidad 2 está al 60 % y su 1.ª lección sin terminar es la 1 (no la 2 que diría la barrita)
  completarMapaHome: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Couples', false], [2, 'Sport', false]], 96, 83),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'home', mapaHecho: true, objetivos: [], objHechos: [], lessonsDone: [], unitsDone: [], resultados: [] }),
      'ed:progress:v1': JSON.stringify({ unidades: [{ n: 1, completion: 100, locked: false, lecciones: [{ n: 1, test: 100, terminado: true }] }, { n: 2, completion: 60, locked: false, lecciones: [{ n: 1, test: 'sin', terminado: false }, { n: 2, test: null, terminado: false }] }] }) }, setup: HOME_SETUP },
  // NUEVO v21.8 — test TERMINADO pero My Progress dice 80 % → SÍ se rehace
  testTerminadoBajo: { html: `<div class="learning__dropDownList_unitName">Unit 1: Couples</div><div class="learning__dropDownListTitleW--lessons">Lesson 2: A New Acquaintance</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div>
<section class="learning__dropDownListW learning__dropDownListW--steps"><div class="learning__dropDownList_item learning__dropDownList_item--current"><div class="learning__dropDownList_itemNameText">3. Test</div><div class="progressBar__progress progressBar__progress--done"><span>Terminado</span></div></div></section>
<a class="btnStartTest">Start Test</a><a class="tasksBtnext learning__nextItemLink">Next</a>`,
    ls: { 'ed:progress:v1': JSON.stringify({ unidades: [{ n: 1, completion: 100, locked: false, lecciones: [{ n: 2, nombre: 'A New Acquaintance', test: 80, terminado: true }] }] }) } },
  // NUEVO v21.7 — test YA TERMINADO (barra "done" en el desplegable de pasos) → no se rehace, se pasa al siguiente
  testYaTerminado: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 1: Food</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div>
<section class="learning__dropDownListW learning__dropDownListW--steps"><div class="learning__dropDownList_item"><div class="learning__dropDownList_itemNameText">1. Explore</div><div class="progressBar__progress progressBar__progress--done"><span>Terminado</span></div></div>
<div class="learning__dropDownList_item learning__dropDownList_item--current"><div class="learning__dropDownList_itemNameText">3. Test</div><div class="progressBar__progress progressBar__progress--done"><span>Terminado</span></div></div></section>
<a class="btnStartTest">Start Test</a><a class="tasksBtnext learning__nextItemLink">Next</a>` },
  // ... y uno SIN terminar → se empieza
  testSinTerminar: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 1: Food</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div>
<section class="learning__dropDownListW learning__dropDownListW--steps"><div class="learning__dropDownList_item learning__dropDownList_item--current"><div class="learning__dropDownList_itemNameText">3. Test</div><div class="progressBar__progress"></div></div></section>
<a class="btnStartTest">Start Test</a><a class="tasksBtnext learning__nextItemLink">Next</a>` },
  // NUEVO v21.9 — corrida de Jose (01/11): tras RENDIRSE con un test en esta corrida (97 % tras los reintentos),
  // "voy a lo pendiente" lo volvía a abrir y lo hacía ENTERO otra vez (4 veces más, ~10 min, 4 intentos más en ED).
  // Ahora: si ya me rendí con este test en esta corrida → no lo empiezo, paso al siguiente.
  testRendido: { html: `<div class="learning__dropDownList_unitName">Unit 14: Review</div><div class="learning__dropDownListTitleW--lessons">Lesson 3: Present Simple: Review</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div>
<section class="learning__dropDownListW learning__dropDownListW--steps"><div class="learning__dropDownList_item learning__dropDownList_item--current"><div class="learning__dropDownList_itemNameText">3. Test</div><div class="progressBar__progress progressBar__progress--done"><span>Completed</span></div></div></section>
<a class="btnStartTest">Start Test</a><a class="tasksBtnext learning__nextItemLink">Next</a>`,
    ls: { 'ed:testScores:v1': JSON.stringify({ 'Lesson 3: Present Simple: Review||Step 3: Test': 97 }),
      'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'in_unit', unitTarget: 14, lessonsDone: ['U14||Lesson 3: Present Simple: Review'], unitsDone: [], resultados: [{ unidad: 14, leccion: 'Lesson 3: Present Simple: Review', pct: 97, nota: 'sin 100 tras reintentos' }] }) } },
  // NUEVO v21.10 — 2.ª corrida de Jose (unidad 12, 40 min perdidos): desplegables REALES del reporte (todas las
  // lecciones "Completed"). Atascado en un test ya hecho → "voy a lo pendiente" → mandaba a "3. Drama" porque OTRA
  // unidad tenía "Lesson 3: Present Simple: Review" en 97 % (se comparaba solo el NÚMERO de lección). Ahora el número
  // Y el nombre: no hay nada pendiente en esta unidad → la da por terminada → Home.
  completarSaltoOtraUnidad: { html: COMPL_U12('Lesson 2: Call-in', 2, ['done', 'done', 'done', 'done', 'done']), steps: 7,
    ls: { 'ed:testScores:v1': JSON.stringify({ 'Lesson 3: Present Simple: Review||Step 3: Test': 97 }), 'ed:sweep:v1': COMPL_SWEEP } },
  // NUEVO v21.10 — ... y si DOS lecciones quedan pendientes sin poder terminarlas, saltaba Drama ↔ Family sin parar
  // (el conteo "mismo lugar 3 veces SEGUIDAS" se reiniciaba con cada cambio). Ahora cuenta las veces por lugar (v21.11: 2).
  // AJUSTADA v21.12: 42 pasos. Ahora PRIMERO avanza (Drama → Family → Friends), vuelve UNA vez a lo pendiente y a la
  // 2.ª vuelta se va al Home: como mucho dos vueltas por la unidad, nunca sin fin.
  // AJUSTADA v21.15: 18 pasos (un test ya hecho avanza al instante: llega al Home en 18, antes en 42)
  completarAlterna: { html: COMPL_U12('Lesson 3: Drama', 3, ['done', 'done', 'inProgress', 'inProgress', 'done']), steps: 18,
    ls: { 'ed:sweep:v1': COMPL_SWEEP },
    setup: w => { const d = w.document;
      d.querySelectorAll('.learning__dropDownListW--lessons .learning__dropDownList_item').forEach(it => it.addEventListener('click', () => {
        d.querySelectorAll('.learning__dropDownListW--lessons .learning__dropDownList_item').forEach(x => x.classList.remove('learning__dropDownList_item--current'));
        it.classList.add('learning__dropDownList_item--current');
        const [n, nombre] = it.querySelector('.learning__dropDownList_itemNameText').textContent.split('. ');
        d.querySelector('.learning__dropDownListTitleW--lessons .learning__dropDownListTitle').textContent = 'Lesson ' + n + ': ' + nombre;
      })); } },
  // NUEVO v21.11 — HTML REAL de Nelson (v21.6, Lesson 5: Nouns: This/That/These/Those · Test · 3/10): mismo bloqueo del
  // desplegable viejo que en Present Simple: Review. La v21.8 deja 1 de 2 ("2:ninguno✗", como en ED); la nueva 2 de 2.
  replayLegacyDDLNouns: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 5: Nouns: This/That/These/Those</div><div class="learning__dropDownListTitleW--steps">Step 4: Test</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>3 / 10</span>
<div class="answersWrapper fillInBlank"><div class="fitb"><div class="bubbleDiv"><div class="wrapBubbleLeft wrapBubbleItem"><div class="bubbleLeft bubbleItem">Are you enjoying <span id="1_1" class="answered" ed-trackable-click="at:User_Action;swap;id:989114065"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> hamburger?</div><div class="bubbleLeftBottom bubbleItemBottom"></div></div><div class="wrapBubbleRight wrapBubbleItem"><div class="bubbleRight bubbleItem">Yes, and <span id="1_2" class="answered" ed-trackable-click="at:User_Action;swap;id:989114065"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> pizza, too.</div><div class="bubbleRightBottom bubbleItemBottom"></div></div><div class="wrapPicDiv"></div></div></div></div>`,
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 5: Nouns: This/That/These/Those||Step 4: Test']), 'ed:testAns:v2': JSON.stringify({ 'Lesson 5: Nouns: This/That/These/Those||Step 4: Test': { 3: { lddl: ['that', 'this'] } } }) },
    setup: w => LDDL_BLOQUEO(w, ['this', 'these', 'those', 'that']) },
  // NUEVO v21.11 — REPORTE = DUMP COMPLETO (regla 2 de Hugo): pantalla que el bot no reconoce, con lectura en el panel
  // izquierdo. El reporte debe traer el panel izquierdo, los controles con sus atributos, la caja, las tareas y el ANTES.
  reporteDump: { html: PRACT_SIN_AUDIO('Lesson 5: Tiny Homes', 'Step 3: Read again') + `<div class="learning__resourcesArea"><div class="readingText"><p>Lisa lives in a tiny home near the lake.</p><audio src="lisa.mp3"></audio></div></div>
<div class="answersWrapper hotspotQ"><button class="hotspot__btn" data-id="7">Here</button><button class="hotspot__btn" data-id="8">There</button></div>`,
    verificar: REP_ULTIMA },
  // NUEVO v21.11 — "Explore" con parlantes (clases REALES de los reportes de Jose: .segment, .speaker, .speakerTotheTop).
  // Antes: mcq_default → nada. Ahora: pulsa parlantes uno a uno y verifica; aquí ED marca la tarea al 2.º.
  exploreParlantes: { html: PRACT_SIN_AUDIO('Lesson 1: Directions to the Museum', 'Step 1: Explore') + `<div class="explore__text">${['Excuse me.', 'Where is the museum?', 'Go straight ahead.'].map(t => `<div class="segment"><a class="speaker speakerTotheTop"></a><span>${t}</span></div>`).join('')}</div>`,
    setup: w => { let n = 0; w.document.querySelectorAll('.speaker').forEach(sp => sp.addEventListener('click', () => { if (++n === 2) MARCAR_HECHA(w); })); } },
  // NUEVO v21.11 — JUEGO DE MEMORIA que no empareja: UN intento corto (antes hasta 60, ~3 min) y el reporte se toma
  // con DOS cartas abiertas.
  memoryCorto: { html: PRACT('Step 3: Practicing vocabulary', 2) + `<div class="memoG__wrapper">${['amenity', 'apartment', 'dorm', 'tenant'].map((wd, k) => `<div class="memoG__card memoG__card--word" data-p="w${k}"><div class="memoG__cardIW"><div class="memoG__cardSideFront">${wd}</div></div></div>`).join('')}${[0, 1, 2, 3].map(k => `<div class="memoG__card memoG__card--image" data-p="i${k}"><div class="memoG__cardIW"><div class="memoG__cardSideFront"></div></div></div>`).join('')}</div>`,
    setup: w => { const d = w.document; let abiertas = [];
      d.querySelectorAll('.memoG__card').forEach(c => c.addEventListener('click', () => { c.classList.add('memoG__card--flipped'); abiertas.push(c);
        if (abiertas.length === 2) { const ab = abiertas; abiertas = []; w.setTimeout(() => ab.forEach(x => x.classList.remove('memoG__card--flipped')), 800); } })); },
    verificar: w => { const r = REP_ULTIMA(w); const l = JSON.parse(w.localStorage.getItem('ed:report:v1') || '[]'); const m = l.find(e => e.motivo === 'memory_sin_parejas');
      return { ultima: r && r.motivo, memoria: m ? { intentos: m.resultado.intentos, abiertas: m.resultado.abiertas.length, conAntes: !!m.antes } : null }; } },
  // NUEVO v21.11 — REGLA 4: esta tarea ya falló 2 veces en esta corrida → no se vuelve a intentar (Next)
  saltaYaFallo: { html: PRACT('Step 2: Practice') + `<div class="prMCQ__qaInnerSet"><label class="prMCQ__answerLabel"><input type="radio" name="a">yes</label><label class="prMCQ__answerLabel"><input type="radio" name="a">no</label></div>`,
    ls: { 'ed:corrida:v1': JSON.stringify({ id: 'manual', fallos: { 'Lesson 1: An Unusual Guest|Step 2: Practice||2': 2 } }) } },
  // NUEVO v21.11 — UNIT TESTS: unidades recorridas y My Progress con "Unit Test" sin hacer en la unidad 1 (la de la
  // unidad 2 está en 100 → no se toca) → va a My Progress a buscarlo. Antes: "COMPLETAR terminado" sin hacerlos.
  unitTestDesdeHome: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', true]], 100, 97) + '<a id="mp">My Progress</a>',
    ls: { 'ed:sweep:v1': UT_SWEEP(), 'ed:progress:v1': UT_MAPA },
    setup: w => { w.document.getElementById('mp').addEventListener('click', () => { w.location.hash = '#/MyProgress/Course/1/Unit/'; }); } },
  // ... en My Progress: despliega la unidad 1, pulsa la fila "Unit Test" y verifica que entró al test
  unitTestMyProgress: { url: 'https://ed.engdis.com/upbstacruz#/MyProgress/Course/1/Unit/', html: `<div class="myProgress__main"><div class="myProgress__unitW" id="mu1"><div class="myProgress__unitHeader"><div class="myProgress__unitHeaderIW"><span class="myProgress__unitTitle">Unit 1</span><span class="myProgress__unitName">Buying and Selling</span></div></div>
<div class="myProgress__unitLesson"><span class="myProgress__unitLesson_number">1</span><span class="myProgress__unitLesson_name">Phone Sales</span><span class="myProgress__unitLesson_testScore">100%</span></div>
<div class="myProgress__unitLesson"><span class="myProgress__unitLesson_number"></span><span class="myProgress__unitLesson_name">Unit Test</span><span class="myProgress__unitLesson_testScore"></span><a class="myProgress__unitLesson_link" id="ut">Start</a></div></div></div>`,
    ls: { 'ed:sweep:v1': UT_SWEEP({ ut: { actual: { unidad: 1, test: null, fase: 'buscar', intento: 0, pasos: 0 }, hechos: [], resultados: [] } }), 'ed:progress:v1': UT_MAPA },
    setup: w => { w.document.getElementById('ut').addEventListener('click', () => { w.location.hash = '#/learningArea'; w.document.body.innerHTML = '<div class="learning__dropDownListTitleW--lessons">Unit Test</div><a class="btnStartTest">Start Test</a>'; }); } },
  // ... si My Progress no sirvió: la lista de lecciones del Home (al pasar el mouse) con el ítem "Unit Test"
  unitTestHomeLista: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', true]], 100, 97),
    ls: { 'ed:sweep:v1': UT_SWEEP({ ut: { actual: { unidad: 1, test: null, fase: 'buscar', intento: 1, pasos: 0 }, hechos: [], resultados: [] } }), 'ed:progress:v1': UT_MAPA },
    setup: w => { const d = w.document; d.querySelectorAll('.home__unitW').forEach(card => card.addEventListener('mouseenter', () => { if (card.querySelector('.home__courseListItem')) return;
      card.insertAdjacentHTML('beforeend', [['1.', 'Phone Sales'], ['', 'Unit Test']].map(([n, t]) => `<div class="home__courseListItem"><a class="home__courseListItemLink"><span class="home__courseListItemNumber">${n}</span> <span class="home__courseListItemName">${t}</span></a></div>`).join('')); })); } },
  // ... y al salir del test (ya lo vio) → Unit Test hecho → Home
  unitTestTermina: { html: PRACT('Step 1: Explore') + '<div class="sitemenu__itemHome"><a>Home</a></div>',
    ls: { 'ed:sweep:v1': UT_SWEEP({ phase: 'in_unit', ut: { actual: { unidad: 1, test: null, fase: 'dentro', intento: 0, pasos: 0, vioTest: true, metodo: 'my_progress:enlace' }, hechos: [], resultados: [] } }) },
    verificar: w => JSON.parse(w.localStorage.getItem('ed:sweep:v1')).ut },
  // NUEVO v21.11 — los reintentos de un test se cuentan POR CORRIDA (2.ª corrida de Jose: el test de 97 % tuvo UN solo
  // intento porque el contador venía de la corrida anterior). Corrida nueva → contador en cero → abre el Review.
  reintentosPorCorrida: { html: NAV.replace('STEP', 'Step 4: Test') + `<div class="TestResults">Your score 40%</div><a class="learning__testReviewLink">Review</a>`,
    ls: { 'ed:scoreVisits:v1': JSON.stringify({ 'Lesson 1||Step 4: Test': 5 }), 'ed:corrida:v1': JSON.stringify({ id: 'corrida-anterior', fallos: {} }), 'ed:sweep:v1': JSON.stringify({ active: false, inicio: 'corrida-nueva' }) } },
  // ===================== NUEVO v21.12 — dumps de Hugo (02/11) y corridas de Roy y Mateo =====================
  // EXPLORE CON VIDEO (U5 L1 "In the Restaurant", HTML real de los controles): el botón grande de play aparece cuando
  // el video carga (aquí a los 6 s) y los controles de abajo no se ven. Antes: mcq_default (4 s de espera) → nada.
  exploreVideo: { html: PRACT_U('Unit 5: Enjoy Your Meal!', 'Lesson 1: In the Restaurant', 'Step 1: Explore') + `<div class="listeningTV"><div class="learning__resourcesArea learning__resourcesArea--jQuery leftDiv learning__resourcesArea--full"><div class="learning__RAIWrapper left"><div class="learning__RAMediaResourceW learning__RAMediaResourceW--html5Video learning__RAMediaResourceW--newVideo"><div class="learning__RAMROverlayW"><div class="learning__RAMRButton learning__RAMRButton--play" id="ov"></div></div><div class="trContainer"><video id="vid"></video></div>${VIDEO_CTRL}</div></div><div class="learning__RATextResourceW"><div class="seeTxtContainer">${['Can I help you?', 'Yes, a table for two.'].map(t => `<span class="segment"><span class="speakerTotheTop speaker"></span>${t}</span>`).join('')}</div></div></div></div>`,
    setup: w => { const d = w.document; CARGA_TARDE(w, d.getElementById('ov'), 6000); d.querySelectorAll('#video-controls, #video-controls *').forEach(e => CARGA_TARDE(w, e, 1e9));
      d.getElementById('ov').addEventListener('click', () => MARCAR_HECHA(w)); } },
  // EXPLORE CON TARJETAS DE VOCABULARIO (U8 L6 "Work", clases REALES de los dumps 15770563 y ef005917): con la tarjeta
  // abierta ("2/10") aparecen .cursor-pointer, .d-flex, .justify-between, .mb-xs, .mb-xl y _textSeparator. La X no tiene
  // nombre (aquí un <img> sin clase arriba a la derecha). Hugo: "darle clic a un elemento y salir con la x" → la tarea
  // se marca al CERRAR. Antes: mcq_default (nada).
  exploreTarjetas: { html: PRACT_U('Unit 8: A Bad Day', 'Lesson 6: Work', 'Step 1: Explore') + `<div class="learning__resourcesArea learning__resourcesArea--full learning__resourcesArea--angular"><div class="learning__angResourceOW"><div class="learning__angResourceW"><div class="learning__vocabularyCards"><div class="learning__vocabularyCards_pageTitleW"><div class="learning__vocabularyCards_pageTitle">Work</div></div><div class="learning__vocabularyCards_playOnHover learning__vocabularyCards_playOnHover--fullScreen"></div><div class="learning__vocabularyCards_container learning__vocabularyCards_container--cardSize_m learning__vocabularyCards_container--cols_3">${['a break', 'a business', 'an office'].map(t => `<div class="learning__vocabularyCards_card learning__vocabularyCards_card--m"><div class="learning__vocabularyCards_cardImageWrapper"><img class="learning__vocabularyCards_cardImage learning__vocabularyCards_cardImage-m"></div><div class="learning__vocabularyCards_cardDefinition learning__vocabularyCards_cardDefinition-m">${t}</div><div class="learning__vocabularyCards_progressContainer"></div></div>`).join('')}</div><div class="learning__vocabularyCards_cardContainer learning__vocabularyCards_cardContainer--m" id="cc"></div></div></div></div></div>`,
    setup: w => { const d = w.document, cc = d.getElementById('cc');
      const pos = (el, right, top) => { el.getBoundingClientRect = () => ({ left: right - 30, top, right, bottom: top + 30, width: 30, height: 30 }); };
      d.querySelectorAll('.learning__vocabularyCards_cardImageWrapper').forEach((c, k) => c.addEventListener('click', () => {
        cc.innerHTML = `<div class="d-flex justify-between mb-xs"><span>${k + 1}/10</span><span class="cursor-pointer" id="vx"><img src="close.svg"></span></div>`
          + `<div class="d-flex"><span class="cursor-pointer" id="vprev">‹</span><img class="learning__vocabularyCards_cardImage"><span class="cursor-pointer" id="vnext">›</span></div>`
          + `<div class="d-flex mb-xl"><span class="cursor-pointer" id="vaudio"></span><span>a break</span><span class="learning__vocabularyCards_textSeparator"></span><span>a short rest from work</span></div>`;
        pos(d.getElementById('vx'), 900, 40); pos(d.getElementById('vprev'), 60, 300); pos(d.getElementById('vnext'), 900, 300); pos(d.getElementById('vaudio'), 150, 500);
        d.getElementById('vnext').addEventListener('click', () => { cc.querySelector('span').textContent = (k + 2) + '/10'; });
        d.getElementById('vx').addEventListener('click', () => { cc.innerHTML = ''; MARCAR_HECHA(w); });
      })); } },
  // JUEGO DE MEMORIA con la estructura REAL (card > IW > Sides > SideBack/SideFront): lo que escucha el clic es la cara
  // visible. Hugo: "seleccionar dos cuadritos y ya sale hecho". Antes: clic en IW → ninguna carta se daba vuelta.
  memoriaDorso: { html: PRACT('Step 3: Practicing vocabulary', 2) + `<div class="memoG__wrapper memoG__wrapper--rows3"><div class="memoG__board"><div class="memoG__boardIW">${[['word', 'amenity'], ['word', 'apartment'], ['word', 'tenant'], ['image', ''], ['image', ''], ['image', '']].map(([tipo, t]) => `<div class="memoG__card memoG__card--${tipo}"><div class="memoG__cardIW"><div class="memoG__cardSides"><div class="memoG__cardSide memoG__cardSideBack"></div><div class="memoG__cardSide memoG__cardSideFront">${t}</div></div></div></div>`).join('')}</div></div></div>`,
    setup: w => { const d = w.document; let abiertas = 0;
      d.querySelectorAll('.memoG__cardSideBack').forEach(b => b.addEventListener('click', () => { const c = b.closest('.memoG__card'); if (/flipped/.test(c.className)) return; c.classList.add('memoG__card--flipped'); if (++abiertas === 2) MARCAR_HECHA(w); })); } },
  // INTERACTIVE SPEAKING (U9 L4 · Step 4, HTML REAL del dump): Start deshabilitado hasta tocar la 1.ª frase.
  // Antes: tocaba la frase y terminaba (nunca pulsaba Start) → "started: true" y tarea sin marcar, como en ED.
  speakingFraseStart: { html: PRACT_U('Unit 9: Housing', 'Lesson 4: Student Housing', 'Step 4: Interactive speaking practice') + SPEAK_INTERACT1,
    setup: w => { const d = w.document; const cw = d.querySelector('.continueWrapper');
      d.querySelector('.recordingPanelSentence').addEventListener('click', () => cw.classList.remove('disable'));
      d.querySelector('a.button.continue').addEventListener('click', () => { if (!cw.classList.contains('disable')) MARCAR_HECHA(w); }); } },
  // BRANCHING SPEAKING (U9 L4 · Step 6, HTML REAL del dump): Start → se habilita el botón de grabar → grabar → marcada.
  speakingBranching: { html: PRACT_U('Unit 9: Housing', 'Lesson 4: Student Housing', 'Step 6: Branching speaking practice') + SPEAK_BRANCHING,
    setup: w => { const d = w.document; const rw = d.querySelector('.RecordButtonWrapper');
      d.querySelector('a.button.continue').addEventListener('click', () => rw.classList.remove('disable'));
      d.querySelector('a.panelButton.speakIcon').addEventListener('click', () => { if (!rw.classList.contains('disable')) MARCAR_HECHA(w); }); } },
  // WRITING DE CORREGIR UN E-MAIL (U10 L3 · Step 4, HTML REAL del dump): todos los campos traen texto. Antes: n = 0.
  writingCorregir: { html: PRACT_U('Unit 10: Hobbies', 'Lesson 3: Plans for the Weekend', 'Step 4: Personalized writing', '<a class="learning__tasksNav_task learning__tasksNav_task--current">1</a><a class="learning__tasksNav_task">2</a>') + `<div class="answersWrapper writingEditFrame OpenEndedQ twoSidedResourcePractice"><div class="writingEditPracticeWrapper fitb"><div class="readingExploreWrapper postcard"><div class="readingExploreMainContent">${WRITING_EDIT}</div></div></div></div>`,
    setup: w => { w.document.querySelectorAll('.writingEditFrame input').forEach(i => i.addEventListener('input', () => MARCAR_HECHA(w))); } },
  // MCQ CON IMÁGENES que tardan en cargar (U10 L4 · Watch again; clases REALES del dump: prMCQ__answers > multiRadioWrapper >
  // img.prMCQ__answerImage; al elegir: selection--x / selection--v). Antes: marked 0, como en ED.
  mcqImagenesCargando: { html: NAV.replace('STEP', 'Step 3: Watch again') + `<div class="prMCQ__main prMCQ__main--ansImages"><div class="prMCQ__mainIW"><div class="prMCQ__qaSet"><div class="prMCQ__qaInnerSet"><div class="prMCQ__questionW"><div class="prMCQ__questionText">What does Molly like to do?</div></div><div class="prMCQ__answersW">${[1, 2, 3, 4].map(k => `<div class="prMCQ__answers"><div class="multiRadioWrapper"><div class="checkAnswerIcon"></div><img class="prMCQ__answerImage"></div></div>`).join('')}</div></div></div></div></div>`,
    setup: w => { const d = w.document; d.querySelectorAll('.prMCQ__answerImage, .multiRadioWrapper').forEach(e => CARGA_TARDE(w, e, 6000));
      d.querySelectorAll('.prMCQ__answers').forEach((op, k) => op.addEventListener('click', () => { const ok = k === 2; op.classList.add(ok ? 'selection--v' : 'selection--x'); op.querySelector('img').classList.add(ok ? 'prMCQ__answerImage--correct' : 'prMCQ__answerImage--incorrect'); if (ok) MARCAR_HECHA(w); })); } },
  // U8 L6 · Step 2: Practice (dump b1468fdd de Hugo: "es un drag here"): tabla prMT_T2T, banco dragula con las 6 fichas
  // REALES; las filas (prMT_T2T__answersRow > regContainer > regContainerIW > dndZone) salen de las clases del dump.
  // Mateo no la hizo porque abandonó la unidad 8 en la lección 2 (ver completarAvanzaPaso); aquí se ve que, al llegar, la hace.
  dndTablaU8: { html: PRACT_U('Unit 8: A Bad Day', 'Lesson 6: Work', 'Step 2: Practice', [1, 2, 3, 4, 5, 6].map(n => `<a class="learning__tasksNav_task${n === 1 ? ' learning__tasksNav_task--current' : ''}">${n}</a>`).join('')) + `<div class="prMT_T2T__main prMT_T2T__main--banksize_short"><div class="prMT_T2T__answersWrapper"><div class="prMT_T2T__answers"><div class="prMT_T2T__answersRowTitle">A</div><div class="prMT_T2T__answersTextTitle">B</div>${['take', 'start', 'work in', 'write', 'wear', 'earn'].map(t => `<div class="prMT_T2T__answersRow"><div class="prMT_T2T__answersTextW"><div class="prMT_T2T__answersText">${t}</div></div><div class="prMT_T2T__regContainer"><div class="prMT_T2T__regContainerIW"><ed-la-dndzone><div class="dndZone" ng-reflect-dragula="ed-bag"></div></ed-la-dndzone></div></div></div>`).join('')}</div></div><div class="prMT_T2T__wordsBankWrapper"><ed-la-dndzone><div class="dndZone" ng-reflect-dragula="ed-bag" dg_name="TTpTablePlaceHolder" id="undefined_6"> <ed-la-dnditem> <div class="dnditem draggable" ans_id="83"> a high salary </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="79"> an office </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="76"> a break </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="95"> a report </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="42"> a suit </div></ed-la-dnditem><ed-la-dnditem> <div class="dnditem draggable" ans_id="97"> a business </div></ed-la-dnditem> </div></ed-la-dndzone></div></div>`,
    setup: w => w.document.addEventListener('mouseup', () => MARCAR_HECHA(w)) },
  // EXPLORE DE LECTURA SIN BARRA DE TAREAS (Mateo, U8 L2 "Read the e-mail": contador y tarea vacíos). Sin tarea no hay
  // nada que verificar → basta con que suene UN audio (antes, v21.11: hasta 75 s tocando parlantes/segmentos por página).
  // (Los .segment/.speaker son como los del reporte de Roy en U5 L1; esta lectura aún no tiene dump propio.)
  exploreLecturaSinTareas: { html: `<div class="learning__dropDownList_unitName">Unit 8: A Bad Day</div><div class="learning__dropDownListTitleW--lessons">Lesson 2: Grumble's Department Store</div><div class="learning__dropDownListTitleW--steps">Step 1: Explore</div><div class="learning__unitW--noTaskInstructions">Read the e-mail.</div><div class="learning__resourcesArea"><div class="readingExploreWrapper"><audio id="au"></audio><p>${['Dear Customer Service,', 'I bought a coat at your store.', 'It has a hole in the pocket.', 'Please call me.'].map(x => `<span class="segment"><span class="speakerTotheTop speaker"></span>${x}</span>`).join(' ')}</p></div></div><a class="tasksBtnext learning__nextItemLink">Next</a>`,
    setup: w => { const d = w.document, au = d.getElementById('au'); let fin = 0;
      Object.defineProperty(au, 'paused', { get: () => !(w.Date.now() < fin) }); Object.defineProperty(au, 'ended', { get: () => false });
      d.querySelectorAll('.segment').forEach(sg => sg.addEventListener('click', () => { fin = w.Date.now() + 2000; })); } },
  // EXPLORE "LISTEN TO THE RECORDING" SIN TAREAS (Mateo, U12 L3 Drama): el reproductor (controles reales del dump del
  // video) aparece a los 8 s. Antes: mcq_default al instante → Next sin escuchar. Ahora espera (una vez) y le da play.
  exploreAudioTarde: { html: `<div class="learning__dropDownList_unitName">Unit 12: Additional Listening</div><div class="learning__dropDownListTitleW--lessons">Lesson 3: Drama</div><div class="learning__dropDownListTitleW--steps">Step 1: Explore</div><div class="learning__unitW--noTaskInstructions">Listen to the recording.</div><div class="learning__resourcesArea"><div class="learning__RAMediaResourceW learning__RAMediaResourceW--html5Audio">${VIDEO_CTRL}</div></div><a class="tasksBtnext learning__nextItemLink">Next</a>`,
    setup: w => { w.document.querySelectorAll('#video-controls, #video-controls *').forEach(e => CARGA_TARDE(w, e, 8000)); } },
  // SEGURIDAD DE LA NOTA (v21.12): en un TEST el campo ya lleno es una respuesta → NO se le agrega la letra del
  // "Personalized writing", y en un MCQ de imágenes se pulsa UNA sola (probar varias cambiaría la respuesta).
  textoEnTestNoToca: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 4: Be-Past: Statements</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div><div class="learning__tasksNav"><a class="learning__tasksNav_task learning__tasksNav_task--current">1</a><a class="learning__tasksNav_task">2</a></div><a class="tasksBtnext learning__submitTestLink">Submit</a><p>Yesterday I <input type="text" value="went"> to the park.</p>`,
    verificar: w => w.document.querySelector('p input').value },
  mcqImagenesEnTest: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 4: What Do You Do in Your Spare Time?</div><div class="learning__dropDownListTitleW--steps">Step 7: Test</div><div class="learning__tasksNav"><a class="learning__tasksNav_task learning__tasksNav_task--current">1</a><a class="learning__tasksNav_task">2</a></div><a class="tasksBtnext learning__submitTestLink">Submit</a><div class="prMCQ__main prMCQ__main--ansImages"><div class="prMCQ__qaInnerSet"><div class="prMCQ__questionText">What does Molly like to do?</div><div class="prMCQ__answersW">${[1, 2, 3].map(k => `<div class="prMCQ__answers"><div class="multiRadioWrapper"><img class="prMCQ__answerImage"></div></div>`).join('')}</div></div></div>`,
    setup: w => { const ops = [...w.document.querySelectorAll('.prMCQ__answers')]; ops.forEach(op => op.addEventListener('click', () => { ops.forEach(o => o.classList.remove('selected')); op.classList.add('selected'); })); },
    verificar: w => [...w.document.querySelectorAll('.prMCQ__answers')].map(o => o.classList.contains('selected') ? 'X' : '-').join('') },
  // NUEVO v21.13 — TABLERO: cada tarea queda anotada (ok / falla con motivo y n.º de reporte FIJO)
  tableroOk: { html: PRACT_U('Unit 8: A Bad Day', 'Lesson 6: Work', 'Step 2: Practice', '<a class="learning__tasksNav_task learning__tasksNav_task--current">1</a><a class="learning__tasksNav_task">2</a>') + `<div class="dndBank dndZone"><span class="dnditem">uno</span><span class="dnditem">dos</span></div><p>a <span class="dndZone"></span> b <span class="dndZone"></span></p>`,
    setup: w => w.document.addEventListener('mouseup', () => MARCAR_HECHA(w)), verificar: TABLERO },
  tableroFalla: { html: PRACT_U('Unit 10: Hobbies', 'Lesson 3: Plans for the Weekend', 'Step 2: Practice', '<a class="learning__tasksNav_task learning__tasksNav_task--current">1</a><a class="learning__tasksNav_task">2</a>') + `<input type="text" id="t1">`,
    ls: { 'ed:report:num:v1': '41' }, verificar: TABLERO },
  // ===================== NUEVO v21.15 — las 6 corridas del 02/11 (Maria, Nore, Chapaquin, Roy, Mateo, Thiago) =====================
  // PÁGINA QUE ED DEJÓ SIN CARGAR (tras recargar la pestaña): tareas sin ninguna activa y Next que no avanza
  // (reporte real: Lesson 5 · Step 2: Read again, tareas "1 Ta"…"5 Ta", contador vacío). Antes: avanzaba al paso
  // siguiente, que tampoco cargaba (lecciones enteras "atascadas"). Ahora: Home y volver a entrar.
  atascoPaginaSinCargar: { html: U8_HTML(2, 2).replace('<div class="learning__unitW--noTaskInstructions">', `<div class="learning__tasksNav">${[1, 2, 3, 4, 5].map(n => `<a class="learning__tasksNav_task">${n}<span class="learning__tasksNav_taskTooltip">Task</span></a>`).join('')}</div><div class="learning__unitW--noTaskInstructions">`), steps: 7,
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'in_unit', unitTarget: 8, lessonsDone: [], unitsDone: [], resultados: [], inicio: 'c1' }) },
    setup: w => { const d = w.document; d.querySelectorAll('.learning__dropDownListW--steps .learning__dropDownList_item').forEach(it => it.addEventListener('click', () => {
      d.querySelector('.learning__dropDownListTitleW--steps .learning__dropDownListTitle').textContent = 'Step ' + it.querySelector('.learning__dropDownList_itemNameText').textContent.replace(/^(\d+)\.\s*/, '$1: '); })); } },
  // TEST VACÍO tras "Start Test" (reporte real de Maria #17, Let's review: sin preguntas, sin Next ni Back, el marco
  // toeicInTestFR vacío). Antes: 6 pasos sin nada y a la lección siguiente (cuyo test tampoco cargaba). Ahora: Home.
  testVacioAlHome: { html: U8_HTML(2, 3).replace('<a class="tasksBtnext learning__nextItemLink">Next</a>', '').replace('<div class="learning__unitW--noTaskInstructions"><div class="readingExploreWrapper"><p>Dear Customer Service, ...</p></div></div>', `<div class="learning__tasksNav">${[1, 2, 3, 4, 5].map(n => `<a class="learning__tasksNav_task">${n}</a>`).join('')}</div><div class="learning__practiceArea rightDiv" id="rightDiv"></div><iframe id="toeicInTestFR"></iframe>`), steps: 7,
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'in_unit', unitTarget: 8, lessonsDone: [], unitsDone: [], resultados: [], inicio: 'c1' }) } },
  // TEST YA HECHO: en "Start Test" Next no lleva a ningún lado (22 atascos así). Ahora avanza al momento.
  testYaHechoAvanza: { html: U8_HTML(2, 3).replace('<div class="learning__unitW--noTaskInstructions"><div class="readingExploreWrapper"><p>Dear Customer Service, ...</p></div></div>', '<div class="testStartW"><a class="btnStartTest">Start Test</a></div>'),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'in_unit', unitTarget: 8, lessonsDone: [], unitsDone: [], resultados: [], inicio: 'c1' }) },
    setup: w => { const d = w.document;
      const cur = d.querySelector('.learning__dropDownListW--steps .learning__dropDownList_item--current .progressBar__progress'); cur.className = 'progressBar__progress progressBar__progress--done';
      d.querySelectorAll('.learning__dropDownListW--lessons .learning__dropDownList_item').forEach(it => it.addEventListener('click', () => {
        const [n, nombre] = it.querySelector('.learning__dropDownList_itemNameText').textContent.split('. ');
        d.querySelector('.learning__dropDownListTitleW--lessons .learning__dropDownListTitle').textContent = 'Lesson ' + n + ': ' + nombre; })); } },
  // MY PROGRESS REAL (02/11): la fila "Unit Test" viene OCULTA (ng-hide) → esa unidad no tiene Unit Test; el encabezado
  // trae "Time on Task" y "Final Test". Antes: 14 Unit Tests "sin hacer" que no existen (~20 min buscándolos).
  myProgressUnitTestOculto: { url: 'https://ed.engdis.com/upbstacruz#/MyProgress/Course/523993660/Unit/', html: MP_HTML.replace('<div class="myProgress__main">', '<div class="myProgress__main"><div class="myProgress__header">21 : 30 Hrs. Mins. Time on Task 80 % Final Test</div>'),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'tests', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [], homeUrl: 'https://ed.engdis.com/upbstacruz#/home' }) },
    setup: w => { MP_SETUP(w); const d = w.document;
      d.querySelectorAll('.myProgress__unitW .myProgress__unitHeaderIW').forEach(h => h.addEventListener('click', () => { const uw = h.closest('.myProgress__unitW'); if (uw.querySelector('.myProgress__unitTest')) return;
        uw.insertAdjacentHTML('beforeend', '<div class="myProgress__unitLesson myProgress__unitTest ng-hide" ng-show="unit.Metadata.UnitTest"><div class="myProgress__unitLesson_nameNumberStepsW"><div class="myProgress__unitLesson_statusLabelIW myProgress__unitLesson_nameNumberW"><div class="myProgress__unitLesson_name ng-binding">Unit Test</div></div></div><div class="myProgress__unitLesson_statusW"><div class="myProgress__unitLesson_statusLabelIW myProgress__unitLesson_testScore"><span class="myProgress__unitLesson_testScoreTxt" ng-show="unit.Metadata.UnitTest.grade !== null"><span class="myProgress__unitLesson_testScoreTxt--score ng-binding"></span>/100</span></div><div class="myProgress__unitLesson_statusLabelIW"><div class="myProgress__unitLesson_statusLabelW home__courseListUnitTestButtons"><a class="home__courseListUnitTest_openTest ng-binding ng-hide">Start</a><a class="home__courseListUnitTest_openTestAgain" title="Take again"></a></div></div></div></div>'); })); },
    verificar: w => { const m = JSON.parse(w.localStorage.getItem('ed:progress:v1') || '{}'); return { lecciones: (m.unidades || []).map(u => (u.lecciones || []).map(l => l.nombre).join(',')), tiempo: m.widgets && m.widgets.tiempo, finalTest: m.widgets && m.widgets.finalTest }; } },
  // ATASCO EN UN PASO SIN TAREAS (Mateo, U8 L2 · Step 1: Explore, "Read the e-mail"; Next no avanza): antes volvía al mismo
  // paso y a la 3.ª abandonaba la UNIDAD (lecciones 2–6 sin hacer). Ahora avanza al paso 2.
  completarAvanzaPaso: { html: U8_HTML(2, 1), steps: 7,
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'in_unit', unitTarget: 8, lessonsDone: [], unitsDone: [], resultados: [] }) },
    setup: w => { const d = w.document; d.querySelectorAll('.learning__dropDownListW--steps .learning__dropDownList_item').forEach(it => it.addEventListener('click', () => {
      d.querySelector('.learning__dropDownListTitleW--steps .learning__dropDownListTitle').textContent = 'Step ' + it.querySelector('.learning__dropDownList_itemNameText').textContent.replace(/^(\d+)\.\s*/, '$1: '); })); } },
  // DESPLEGABLE VIEJO, variante REAL de Roy (U14 L3 · 12/15): "1:ya_abierta, 2:clic_texto, 3:ninguno✗, 4:clic_texto"
  replayLegacyDDLRoy: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 3: Present Simple: Review</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div><a class="tasksBtnext learning__submitTestLink">Submit</a><span>12 / 15</span>
<div class="answersWrapper fillInBlank"><div class="fitb"><div class="bubbleDiv"><div class="wrapBubbleLeft wrapBubbleItem"><div class="bubbleLeft bubbleItem">School <span id="1_1" class="answered" ed-trackable-click="at:User_Action;swap;id:29070"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> in half an hour, Ellen.</div><div class="bubbleLeftBottom bubbleItemBottom"></div></div><div class="wrapBubbleRight wrapBubbleItem"><div class="bubbleRight bubbleItem">I know. I <span id="1_2" class="answered" ed-trackable-click="at:User_Action;swap;id:29070"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span> feel very well. I <span id="1_3" class="answered" ed-trackable-click="at:User_Action;swap;id:29070"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span><space width="8"><span id="1_4" class="answered" ed-trackable-click="at:User_Action;swap;id:29070"><div class="questionText"></div><div class="arrowWrapper"><div class="arrow-down"></div></div></span>.</space></div><div class="bubbleRightBottom bubbleItemBottom"></div></div><div class="wrapPicDiv"></div></div></div></div>`,
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 3: Present Simple: Review||Step 3: Test']), 'ed:testAns:v2': JSON.stringify({ 'Lesson 3: Present Simple: Review||Step 3: Test': { 12: { lddl: ['starts', "don't", 'am not', 'going'] } } }) },
    setup: w => LDDL_ROY(w, ['starts', 'start', "don't", "doesn't", 'am not', "isn't", 'going', 'go']) },
  // TEST QUE NO MUESTRA PREGUNTAS (Mateo, U14 L5 "Modals: Review"): a la 3.ª vez, reporte y recargar UNA vez
  testSinPreguntas: { html: `<div class="learning__dropDownListTitleW--lessons">Lesson 5: Modals: Review</div><div class="learning__dropDownListTitleW--steps">Step 3: Test</div><div class="learning__tasksNav">${[...Array(10)].map((_, k) => `<a class="learning__tasksNav_task${k === 0 ? ' learning__tasksNav_task--current' : ''}">${k + 1}</a>`).join('')}</div><a class="tasksBtnext learning__submitTestLink">Submit</a>`, steps: 3,
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 5: Modals: Review||Step 3: Test']), 'ed:testAns:v2': JSON.stringify({ 'Lesson 5: Modals: Review||Step 3: Test': { 1: { fitb: ['can'] } } }) },
    setup: w => { w.__edRecargar = () => { w.__recargado = (w.__recargado || 0) + 1; }; },
    verificar: w => ({ recargas: w.__recargado || 0 }) },
  // NUEVO v21.7 — aviso de ED "You haven't submitted your test": si el bot está SALIENDO → Continue
  avisoTestSalgo: { html: `<div class="popupWrapper"><div class="popupText"><h1 class="PopupSubTitle">Review</h1><div class="hebDir">You haven't submitted your test. If you exit now, your test results will not be recorded.</div></div>
<div class="buttonsDiv popupButtonsWrapper" id="popupButtonsWrapper"><input type="button" id="btnOk" value="Continue" class="okButton"><span><a id="btnCancel" class="utils__cancelLInk">Cancel</a></span></div></div>`,
    ls: { 'ed:saliendo': String(Date.now()) } },
  // ... y si NO está saliendo → Cancel (vuelve al test)
  avisoTestVuelvo: { html: `<div class="popupWrapper"><div class="popupText"><div class="hebDir">You haven't submitted your test. If you exit now, your test results will not be recorded.</div></div>
<div class="buttonsDiv popupButtonsWrapper" id="popupButtonsWrapper"><input type="button" id="btnOk" value="Continue" class="okButton"><span><a id="btnCancel" class="utils__cancelLInk">Cancel</a></span></div></div>` },
  // NUEVO v21.6 — HOME REAL de la nube (31/10): ED en ESPAÑOL ("¡Terminado!") y la lista de lecciones aparece
  // SOLO al pasar el mouse por la tarjeta (un clic no la abre). Debe saltar 1 y 2 y entrar a la 3.
  completarHomeES: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Couples', true], [2, 'Sport And Fitness', true], [3, 'Problems At Work', false]], 94, 83).replace(/Completed!/g, '¡Terminado!'),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [] }) },
    setup: w => { const d = w.document;
      d.querySelectorAll('.home__unitW').forEach(card => card.addEventListener('mouseenter', () => {
        if (card.querySelector('.home__courseListItem')) return;
        card.insertAdjacentHTML('beforeend', [[1, 'Directions', 100], [2, 'Clean-House Agency', 40]].map(([n, t, p]) =>
          `<div class="home__courseListItem"><a class="home__courseListItemLink"><span class="home__courseListItemNumber">${n}.</span> <span class="home__courseListItemName">${t}</span></a><span class="home__courseListItemProgress"><span style="width: ${p}%"></span></span></div>`).join(''));
      })); } },
  // NUEVO v21.3 — MODO COMPLETAR: todas las unidades hechas y promedio 95 % → pasa al barrido de tests
  completarATests: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', true]], 95, 100),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [] }) } },
  // NUEVO v21.3 — MODO COMPLETAR: todo hecho y promedio 100 % → termina
  completarFin: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', true]], 100, 100),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [] }) } },
  // NUEVO v20.1 — 4 visitas al puntaje < 100 % → debe DETENERSE (ED_TEST_NO_100)
  // ===== NUEVO v21.16 =====
  // DnD "Drag Here" A LA IZQUIERDA (reverseColumn) de Nore, Listen again 1/6 — HTML real del reporte #123 — con la guía
  // de ED abierta. v21.15: "moves: 10", ninguna ficha cayó, sin marcar (igual que en ED). Ahora: cierra la guía y cae.
  dndReverseGuia: { html: CAREER(1) + DND_REVERSE, setup: w => { GUIA(w); DRAGULA(w); }, verificar: w => ({ guia: !!w.document.querySelector('.driver-popover'), enBanco: w.document.querySelectorAll('[dg_name="TTpTablePlaceHolder"] .dnditem').length }) },
  // tabla True / False (prCl) de Nore, Listen again 2/6 — HTML real del reporte #124 — con la guía abierta
  clasificacionGuia: { html: CAREER(2) + DND_TRUEFALSE, setup: w => { GUIA(w); DRAGULA(w); }, verificar: w => ({ guia: !!w.document.querySelector('.driver-popover'), enBanco: w.document.querySelectorAll('[dg_name="TTpTablePlaceHolder"] .dnditem').length }) },
  // lo mismo SIN guía: el arrastre verificado no cambia lo que ya funcionaba
  dndReverseSinGuia: { html: CAREER(1) + DND_REVERSE, setup: w => DRAGULA(w) },
  // "Personalized writing" de Nore (dump de Hugo) — ED solo marca si se TECLEA. v21.15: editados 5, sin marcar.
  writingAriellaTeclado: { html: PRACT_U('Unit 10: Personality Types', "Lesson 4: I'm an Extrovert!", 'Step 7: Personalized writing', '<a class="learning__tasksNav_task learning__tasksNav_task--current">1</a><a class="learning__tasksNav_task">2</a>') + `<div class="answersWrapper writingEditFrame OpenEndedQ twoSidedResourcePractice"><div class="writingEditPracticeWrapper fitb"><div class="readingExploreWrapper postcard">${WRITING_ARIELLA}</div></div></div>`,
    setup: w => ED_TECLADO(w), verificar: w => [...w.document.querySelectorAll('.writingEditFrame input')].map(i => i.value).join(',') },
  // Explore de gramática con AUDIO (dump de Hugo, Nore U1 L4). v21.15: tocaba las 2 frases (segmentos:4✗), sin marcar.
  exploreGramaticaAudio: { html: PRACT_U('Unit 1: Couples', 'Lesson 4: Past Form of Modals: Should/Could Have', 'Step 1: Explore', '<a class="learning__tasksNav_task learning__tasksNav_task--current">1</a>') + '<span>1 / 1</span>' + AUDIO_GRAMATICA,
    setup: w => ED_AUDIO(w) },
  // "Watch again" con imágenes (reporte #51 de Maria, igual en Luis y Thiago): los íconos ✓/✗ escondidos engañaban al bot
  mcqImagenesIconosOcultos: { html: PRACT_U('Unit 10: Hobbies', 'Lesson 4: What Do You Do in Your Spare Time?', 'Step 3: Watch again', '<a class="learning__tasksNav_task">1</a><a class="learning__tasksNav_task learning__tasksNav_task--current">2</a><a class="learning__tasksNav_task">3</a>') + MCQ_IMG_OCULTOS,
    setup: w => ED_IMAGENES(w), verificar: w => [...w.document.querySelectorAll('.prMCQ__answers .multiRadioWrapper')].map(m => m.className).join(' | ') },
  // FIN DE UNIDAD: test de la ÚLTIMA lección ya hecho y algo falló antes en la unidad → Home (v21.15: test_ya_terminado ×6 → atasco)
  finDeUnidadTestHecho: { html: COMPL_U12('Lesson 5: Friends', 5, ['done', 'done', 'done', 'done', 'done']), steps: 3,
    ls: { 'ed:sweep:v1': COMPL_SWEEP, 'ed:tablero:v1': JSON.stringify({ corrida: 'manual', pasos: { '12|2|1': { u: 12, l: 2, p: 1, tareas: { 1: 'falla' }, motivo: 'tarea_no_marcada' } } }) },
    verificar: w => { const s = JSON.parse(w.localStorage.getItem('ed:sweep:v1')); return { unitsDone: s.unitsDone, phase: s.phase, reportes: JSON.parse(w.localStorage.getItem('ed:report:v1') || '[]').map(r => r.motivo) }; } },
  // FIN DE UNIDAD con el puntaje 100 % en pantalla (Maria, Luis, Roy, Mateo, Thiago: "To go to the next lesson click on the next arrow")
  finDeUnidadPuntaje100: { html: COMPL_U12('Lesson 5: Friends', 5, ['done', 'done', 'done', 'done', 'done']).replace('<a class="btnStartTest">Start Test</a>', '<div class="TestResults">Your test score is: 100% Excellent!</div>'), steps: 4,
    ls: { 'ed:sweep:v1': COMPL_SWEEP },
    verificar: w => { const s = JSON.parse(w.localStorage.getItem('ed:sweep:v1')); return { unitsDone: s.unitsDone, phase: s.phase }; } },
  // VARIOS CURSOS: Beginners 1 terminado (todas las unidades, promedio 100) → la flecha › del carrusel → Beginners 2
  otroCursoCarrusel: { url: 'https://ed.engdis.com/upbstacruz#/home', html: CARRUSEL + HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', true]], 100, 100),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [] }) }, setup: w => ED_CARRUSEL(w),
    verificar: w => { const s = JSON.parse(w.localStorage.getItem('ed:sweep:v1')); return { active: s.active, mode: s.mode, cursoObjetivo: s.cursoObjetivo, cursosHechos: s.cursosHechos, unitsDone: s.unitsDone }; } },
  // EXPLORADOR: un ejercicio que el bot no conoce; solo marca tocando un ícono raro → lo encuentra y lo APRENDE
  exploradorAprende: { html: PRACT_SIN_AUDIO('Lesson 2: Shopping', 'Step 2: Practice') + '<div class="answersWrapper"><div class="rareW"><span class="rareW__pista">Find the hidden thing</span><span class="rareW__icono" style="cursor:pointer">o</span></div></div>',
    setup: w => w.document.querySelector('.rareW__icono').addEventListener('click', () => MARCAR_HECHA(w)),
    verificar: w => Object.values(JSON.parse(w.localStorage.getItem('ed:aprendido:v1') || '{}')).map(a => a.tipo + ' ' + a.sel + ' #' + a.idx + ' ×' + a.veces) },
  // ... y la próxima vez prueba PRIMERO lo aprendido
  exploradorUsaAprendido: { html: PRACT_SIN_AUDIO('Lesson 2: Shopping', 'Step 2: Practice') + '<div class="answersWrapper"><div class="rareW"><span class="rareW__pista">Find the hidden thing</span><span class="rareW__icono" style="cursor:pointer">o</span></div></div>',
    ls: { 'ed:aprendido:v1': JSON.stringify({ 'mcq_default|practice|': { tipo: 'clic', sel: 'div.answersWrapper > div.rareW > span.rareW__icono', idx: 0, desc: 'clic: span.rareW__icono', veces: 1 } }) },
    setup: w => w.document.querySelector('.rareW__icono').addEventListener('click', () => MARCAR_HECHA(w)) },
  // REVIEW en la ÚLTIMA pregunta de la ÚLTIMA lección (Roy y Mateo, U14 L5): Next no avanza. v21.15: cosechaba la
  // misma pregunta 6 veces hasta el atasco. Ahora vuelve al test (el replay).
  reviewUltimaSinSalida: { html: SEQ_HTML(SEQ_OK, true).replace('<span>4 / 6</span>', '<span>6 / 6</span>'), steps: 2,
    ls: { 'ed:testRun:v1': JSON.stringify({ key: SEQ_KEY, phase: 'review', attempts: 1 }) },
    verificar: w => { const r = JSON.parse(w.localStorage.getItem('ed:testRun:v1') || 'null'); return r && r.phase; } },
  // CATÁLOGO POR NIVEL: lo que pasó queda por curso / lección / paso / tarea (aquí, el Explorador marcó la tarea)
  catalogoGuarda: { html: PRACT_SIN_AUDIO('Lesson 2: Shopping', 'Step 2: Practice') + '<div class="learning__dropDownList_courseName">UPB Intermediate 1</div><div class="answersWrapper"><div class="rareW"><span class="rareW__pista">Find the hidden thing</span><span class="rareW__icono" style="cursor:pointer">o</span></div></div>',
    setup: w => w.document.querySelector('.rareW__icono').addEventListener('click', () => MARCAR_HECHA(w)),
    verificar: w => { const c = JSON.parse(w.localStorage.getItem('ed:catalogo:v1') || '{}'); return Object.entries(c).map(([curso, x]) => ({ curso, lugares: Object.entries(x.lugares).map(([k, l]) => k + ' → ' + l.estado + ' ' + (l.como && l.como.tipo)), tipos: Object.keys(x.firmas).length, conEjemplo: Object.values(x.firmas).filter(f => f.ejemplo).length })); } },
  // ... y en OTRA cuenta del mismo nivel (el catálogo vino en el banco) se hace PRIMERO lo que marcó ahí
  catalogoAtajo: { html: PRACT_SIN_AUDIO('Lesson 2: Shopping', 'Step 2: Practice') + '<div class="learning__dropDownList_courseName">UPB Intermediate 1</div><div class="answersWrapper"><div class="rareW"><span class="rareW__pista">Find the hidden thing</span><span class="rareW__icono" style="cursor:pointer">o</span></div></div>',
    ls: { 'ed:catalogo:v1': JSON.stringify({ 'UPB Intermediate 1': { firmas: {}, lugares: { 'U3|Lesson 2: Shopping|Step 2: Practice|T1': { estado: 'ok', kind: 'mcq_default', como: { tipo: 'explorador', accion: 'clic: span.rareW__icono', aprendido: { tipo: 'clic', sel: 'div.answersWrapper > div.rareW > span.rareW__icono', idx: 0, desc: 'clic: span.rareW__icono' } } } } } }) },
    setup: w => w.document.querySelector('.rareW__icono').addEventListener('click', () => MARCAR_HECHA(w)) },
  // MODO EXPLORAR: en el Home entra también a las unidades TERMINADAS (para catalogarlas), desde la lección 1
  explorarHomeTodas: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', true]], 100, 100),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', explorar: true, phase: 'home', mapaHecho: true, lessonsDone: [], unitsDone: [], resultados: [], homeUrl: 'https://ed.engdis.com/upbstacruz#/home' }) }, setup: w => HOME_SETUP(w) },
  // ... y NO empieza los tests (solo los cataloga y sigue)
  explorarSaltaTest: { html: COMPL_U12('Lesson 3: Drama', 3, ['done', 'done', 'inProgress', 'inProgress', 'done']),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', explorar: true, phase: 'in_unit', unitTarget: 12, lessonsDone: [], unitsDone: [], resultados: [] }) } },
  // REPASO (idea 12): todo recorrido, pero en la unidad 2 algo falló en esta corrida → vuelve a esa unidad UNA vez
  repasoFinal: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', false]], 95, 90),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'home', lessonsDone: [], unitsDone: [1, 2], resultados: [], inicio: 'c1' }),
      'ed:tablero:v1': JSON.stringify({ corrida: 'c1', pasos: { '2|3|2': { u: 2, l: 3, p: 2, tareas: { 1: 'falla' } } } }) },
    verificar: w => { const s = JSON.parse(w.localStorage.getItem('ed:sweep:v1')); return { repaso: s.repaso, repasoHecho: s.repasoHecho, unitsDone: s.unitsDone }; } },
  // VENTANA DESCONOCIDA (idea 13): un diálogo que el bot no conoce → dump una vez y "OK"
  popupDesconocido: { html: PRACT_SIN_AUDIO('Lesson 2: Shopping', 'Step 2: Practice') + '<div role="dialog" class="nuevoAviso"><p>We updated English Discoveries! Enjoy the new design.</p><button class="nuevoAviso__ok">OK</button></div>',
    setup: w => { const v = w.document.querySelector('.nuevoAviso'); v.getBoundingClientRect = () => ({ left: 200, top: 150, right: 800, bottom: 550, width: 600, height: 400 });
      w.document.querySelector('.nuevoAviso__ok').addEventListener('click', () => v.remove()); },
    verificar: w => ({ sigue: !!w.document.querySelector('.nuevoAviso'), reportes: JSON.parse(w.localStorage.getItem('ed:report:v1') || '[]').map(r => r.motivo) }) },
  // REPLAY de DnD en test (Caro, "Jolt Gym" · Let's review 3/5): las 4 fichas BIEN puestas, pero v21.16 verificaba con el
  // banco mal adivinado (ya vacío) y decía 4 de 4 "mal" → replay_incompleto falso. Ahora: 4 de 4 bien.
  replayVerificaMismoBanco: { html: TEST_HEAD('Lesson 2: Jolt Gym', "Step 5: Let's review", 3, 5) + JOLT_TABLA, setup: w => DRAGULA(w),
    ls: { 'ed:testKnown:v1': JSON.stringify(["Lesson 2: Jolt Gym||Step 5: Let's review"]), 'ed:testAns:v2': JSON.stringify({ "Lesson 2: Jolt Gym||Step 5: Let's review": { 3: { dnd: [{ label: '', texts: ['344-555-9089'], text: '344-555-9089' }, { label: '', texts: ['7743 N. Broadway'], text: '7743 N. Broadway' }, { label: '', texts: ['JoltGym.com'], text: 'JoltGym.com' }, { label: '', texts: ['info@joltgym.com'], text: 'info@joltgym.com' }, { label: '', texts: [], text: '' }] } } }) },
    verificar: w => JSON.parse(w.localStorage.getItem('ed:report:v1') || '[]').map(r => r.motivo) },
  // PREGUNTAS EN OTRO ORDEN (Caro, "Lesson 1: Ad" · Test 1/5): lo cosechado para la 1 pide "all kinds of homes" y el banco
  // trae selling/buying/painting/renting → usa lo cosechado de la pregunta que SÍ calza con esas fichas
  replayPreguntaMovida: { html: TEST_HEAD('Lesson 1: Ad', 'Step 3: Test', 1, 5) + AD_CLOZE, setup: w => DRAGULA(w),
    ls: { 'ed:testKnown:v1': JSON.stringify(['Lesson 1: Ad||Step 3: Test']), 'ed:testAns:v2': JSON.stringify({ 'Lesson 1: Ad||Step 3: Test': { 1: { dnd: [{ label: '', texts: ['all kinds of homes'], text: 'all kinds of homes' }] }, 4: { dnd: [{ label: '', texts: ['renting'], text: 'renting' }] } } }) },
    verificar: w => [...w.document.querySelectorAll('.prCLZ__regContainer .dnditem')].map(e => e.textContent.trim()) },
  // RUTA DIRECTA (v21.17): paso ya entero hecho → salta por el desplegable a lo pendiente (antes: Next tarea por tarea)
  rutaDirecta: { html: `<div class="learning__dropDownList_unitName">Unit 12: Additional Listening</div><section class="learning__dropDownListTitleW learning__dropDownListTitleW--lessons"><div class="learning__dropDownListTitle">Lesson 3: Drama</div></section>
<section class="learning__dropDownListTitleW learning__dropDownListTitleW--steps"><div class="learning__dropDownListTitle">Step 2: Practice</div></section>
<section class="learning__dropDownListW learning__dropDownListW--steps">${COMPL_ITEM('1. Explore', 'done')}${COMPL_ITEM('2. Practice', 'done', true)}${COMPL_ITEM('3. Test', 'inProgress')}</section>
<div class="learning__tasksNav"><a class="learning__tasksNav_task learning__tasksNav_task--done">1</a><a class="learning__tasksNav_task learning__tasksNav_task--done learning__tasksNav_task--current">2</a></div><a class="tasksBtnext learning__nextItemLink">Next</a>`,
    ls: { 'ed:sweep:v1': COMPL_SWEEP },
    setup: w => { const d = w.document; d.querySelectorAll('.learning__dropDownListW--steps .learning__dropDownList_item').forEach(it => it.addEventListener('click', () => {
      d.querySelector('.learning__dropDownListTitleW--steps .learning__dropDownListTitle').textContent = 'Step ' + it.querySelector('.learning__dropDownList_itemNameText').textContent.replace(/^(\d+)\.\s*/, '$1: '); })); } },
  // VERIFICACIÓN FINAL (v21.17): todo recorrido → relee My Progress UNA vez antes de pasar a los tests
  verificacionFinal: { url: 'https://ed.engdis.com/upbstacruz#/home', html: HOME_HTML([[1, 'Buying and Selling', true], [2, 'Healthy Eating', true]], 95, 100),
    ls: { 'ed:sweep:v1': JSON.stringify({ active: true, mode: 'completar', phase: 'home', mapaHecho: true, repasoHecho: true, lessonsDone: [], unitsDone: [1, 2], resultados: [], homeUrl: 'https://ed.engdis.com/upbstacruz#/home' }), 'ed:progress:v1': JSON.stringify({ unidades: [{ n: 1, completion: 100, lecciones: [] }, { n: 2, completion: 100, lecciones: [] }] }) },
    verificar: w => { const s = JSON.parse(w.localStorage.getItem('ed:sweep:v1')); return { verificado: s.verificado, mapaHecho: s.mapaHecho, unitsDone: s.unitsDone }; } },
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
  const out = { kind, r: JSON.stringify(r), trace: trace.join(' | '), ls: w.localStorage.getItem('ed:testAns:v2') };
  // NUEVO v21.11: la pantalla puede comprobar algo más (p. ej. qué trae el reporte); solo si define verificar()
  if (opts.verificar) { try { out.v = opts.verificar(w); } catch (e) { out.v = 'ERR ' + e.message; } }
  return out;
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
