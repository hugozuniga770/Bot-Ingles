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
