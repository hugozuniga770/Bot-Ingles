// =====================================================================
//  FITB — rellenar con desplegables
// ---------------------------------------------------------------------
//  Tipo(s) en detectKind(): fitb
//  Se detecta por: .DDLOptions__selected
//  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
//  EXPONE:     FITBSolver (se une a PracticeSolver en exercises/index.js)
// =====================================================================

class FITBSolver {
  // ---------------------------------------------------------------
  // RELLENAR CON DESPLEGABLES (FITB)                         [NUEVA — de v17]
  // PARA QUÉ: abre cada desplegable (.DDLOptions__selected) y elige la opción conocida
  //           (replay de test) o la primera.
  // ---------------------------------------------------------------
  static async solveFITB(values = null) {
    log('🔽 [FITB] Rellenando desplegables...');
    const drops = qav('.DDLOptions__selected');
    let n = 0;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const want = values ? values[i] : null;
      if (!want && txt(d)) continue;                    // ya tiene algo y no hay respuesta conocida
      click(d); await sleep(350);
      const opts = qav('.DDLOptions__listItem');
      const o = (want && opts.find(x => norm(txt(x)) === norm(want))) || opts[0];
      if (o) { click(o); n++; }
      await sleep(250);
    }
    return { did: 'fitb_solved', n, waitDone: 3500 };
  }
}
