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
