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
  tickMs: 1200,
  maxIterations: 1500,
  correctTabSelector: '',
  retakeAfterReview: true,   // NUEVO: tras cosechar el review, usar la flechita atrás para reabrir el test
  solveWithoutTaskNav: true, // NUEVO: resolver ejercicios aunque no haya navegador de tareas (como v17)
  stopIfNot100: true,        // NUEVO v20.1: si tras maxTestAttempts no llega a 100 % → DETENERSE y avisar
  harvestPause: 600          // RECUPERADO v20.2 (v17.1/17.3): pausa extra antes de leer el review en pantallas no-MCQ
}, (() => { try { return JSON.parse(localStorage.getItem(K_CFG) || '{}'); } catch (e) { return {}; } })());

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
