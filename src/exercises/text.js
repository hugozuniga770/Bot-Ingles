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
    for (const t of this.textInputs()) {
      if ((t.value || '').trim()) continue;
      const long = isLong || (t.tagName === 'TEXTAREA' && t.getBoundingClientRect().height > 60);
      setNative(t, long ? CFG.writingText : CFG.shortText); n++;
      await sleep(150);
    }
    return { did: 'text_solved', n, long: isLong, waitDone: 3500 };
  }
}
