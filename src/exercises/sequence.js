// =====================================================================
//  SEQUENCE — ordenar pasos (prSeq)
// ---------------------------------------------------------------------
//  Tipo(s) en detectKind(): sequence
//  Se detecta por: .prSeq__container
//  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
//  EXPONE:     SequenceSolver (se une a PracticeSolver en exercises/index.js)
// =====================================================================

class SequenceSolver {
  // ---------------------------------------------------------------
  // ORDENAR / SECUENCIA (.prSeq__container)                  [AJUSTADA]
  // PARA QUÉ: reordena arrastrando elementos.
  // Intentos 1 y 2 = EXACTAMENTE los de v19.5 (los que ya te funcionaban).
  // Intentos 3 y 4 = NUEVOS, solo se usan si el navegador de tareas sigue sin marcar la tarea.
  // Sin navegador de tareas (tn indefinido) hace UN arrastre, igual que antes.
  // ---------------------------------------------------------------
  static async solveSequence() {
    log('🔢 [Sequence / Ordering] Ordenando pasos secuenciales...');
    const box = qv('.prSeq__container');
    if (!box) return { did: 'seq_not_found' };
    const items0 = () => qa('.dnditem', box).filter(vis);
    const zones0 = () => qa('.dndZone', box).filter(vis);
    if (items0().length < 2) return { did: 'seq_no_items' };
    const tn = NavigationManager.curTask()?.n;

    const strategies = [
      // 1) v19.5: primer ítem → otra zona (o al 2.º ítem)
      () => { const it = items0(), zn = zones0(); const src = it[0]; const dst = zn.find(z => !z.contains(src) && z !== src) || it[1]; return [src, dst]; },
      // 2) v19.5: último ítem → primera zona
      () => { const it = items0(); if (it.length < 2) return null; return [it[it.length - 1], zones0()[0] || it[0]]; },
      // 3) NUEVO: primer ítem → último ítem
      () => { const it = items0(); return it.length > 1 ? [it[0], it[it.length - 1]] : null; },
      // 4) NUEVO: segundo ítem → primer ítem
      () => { const it = items0(); return it.length > 1 ? [it[1], it[0]] : null; }
    ];

    for (let i = 0; i < strategies.length; i++) {
      const pair = strategies[i]();
      if (!pair || !pair[0] || !pair[1]) continue;
      await drag(pair[0], pair[1]);
      if (!tn) return { did: 'sequence_solved', attempt: i + 1 };
      if (await waitFor(() => NavigationManager.taskDone(tn), 2500)) return { did: 'sequence_solved', attempt: i + 1, verified: true };
    }
    return { did: 'sequence_unverified' };
  }
}
