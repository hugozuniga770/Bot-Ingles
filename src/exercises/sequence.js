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
    // AJUSTADA v20.7: antes box = el PRIMER .prSeq__container; en el diseño nuevo cada recuadro tiene
    // 1 sola ficha → "seq_no_items" y no ordenaba (dump: Lesson 1 · Step 2: Practice · 2/2).
    const box = qv('.prSeq__main') || qv('.prSeq__mainIW') || qv('.prSeq__container');
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

  // ---------------------------------------------------------------
  // SECUENCIA EN TESTS (replay)                               [NUEVA v20.4]
  // PARA QUÉ: deja las fichas en el orden cosechado del review ("Respuesta correcta").
  // En ordenar NO hay banco: cada hueco (.sequenceZone) ya tiene una ficha, hay que intercambiarlas.
  // Método: de izquierda a derecha, si en la posición i no está la ficha correcta, se arrastra
  // la correcta encima del hueco i y se RELEE el orden (sirve tanto si ED intercambia como si
  // inserta: las posiciones ya colocadas no se mueven). Hasta 2 intentos por posición.
  // ---------------------------------------------------------------
  static isSequenceScreen() { return !!(qv('.prSeq__main') || qv('.sequenceZone')); }

  static seqZones() {
    const z = qav('.sequenceZone.dndZone');
    return z.length ? z : qav('.dndZone').filter(e => e.closest('.prSeq__main, .prSeq__container'));
  }

  static seqOrder() { return this.seqZones().map(z => txt(q('.dnditem', z))); }

  static async placeSequence(wanted) {
    log('🔢 [Sequence test] Ordenando según lo cosechado...');
    const W = (wanted || []).map(norm);
    let moves = 0;
    for (let i = 0; i < W.length; i++) {
      for (let intento = 0; intento < 2; intento++) {
        const zs = this.seqZones();
        const cur = zs.map(z => norm(txt(q('.dnditem', z))));
        if (cur[i] === W[i]) break;
        const j = cur.indexOf(W[i]);
        if (j < 0 || !zs[i]) break;
        const src = q('.dnditem', zs[j]);
        const dst = intento === 0 ? zs[i] : (q('.dnditem', zs[i]) || zs[i]);   // 2.º intento: soltar sobre la ficha
        await revealInBox(dst); await revealInBox(src);
        await drag(src, dst); moves++;
        await sleep(300);
      }
    }
    const final = this.seqOrder().map(norm);
    const ok = W.length > 0 && W.every((w, k) => final[k] === w);
    if (!ok) warn('Secuencia: no quedó en el orden cosechado', { esperado: wanted, quedó: this.seqOrder() });
    return { did: 'seq_replay', moves, ok };
  }
}
