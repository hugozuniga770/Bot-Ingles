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
