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
