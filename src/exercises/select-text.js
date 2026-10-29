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
    for (const s of spans) {
      click(s); await sleep(400);
      if (/--selected/.test(s.className)) selectedCount++;
    }
    return { did: 'select_text_solved', selectedCount };
  }
}
