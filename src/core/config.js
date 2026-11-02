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
