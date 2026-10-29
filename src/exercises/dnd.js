// =====================================================================
//  DRAG & DROP — "Drag here", columnas y replay de tests
// ---------------------------------------------------------------------
//  Tipo(s) en detectKind(): dnd
//  Se detecta por: .dndZone + .dnditem visibles
//  PENDIENTE: en TESTS no siempre coloca bien (ver docs/pendientes.md).
//  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
//  EXPONE:     DnDSolver (se une a PracticeSolver en exercises/index.js)
// =====================================================================

class DnDSolver {
  // ---------------------------------------------------------------
  // DRAG HERE / DnD                                          [AJUSTADA]
  // PARA QUÉ: arrastra los elementos del banco a los huecos o columnas.
  // CAMBIOS: (a) con stopWhenDone=false NO se detiene cuando ED marca la tarea como hecha
  //              (antes se detenía tras el primer elemento → "solo coloca uno");
  //          (b) con `mapping` coloca según lo cosechado (replay de tests).
  // ---------------------------------------------------------------
  static isDragAndDrop() {
    return !!(qv('.dndZone') && qa('.dnditem').some(vis)) || document.body.innerText.includes('Drag Here');
  }

  static async solveDragAndDrop(stopWhenDone = true, mapping = null) {
    log('🧩 [Drag & Drop] Ejecutando solver DnD...');
    if (mapping && mapping.length) return this.placeDndMapping(mapping);
    const m = dndModel();
    if (!m || !m.dests.length) return { did: 'dnd_no_model' };
    const { bank, dests } = m;
    const tn = NavigationManager.curTask()?.n;
    let moves = 0;
    const initial = bankItems(bank).length;
    const bucket = initial > dests.length && dests.every(d => d.getBoundingClientRect().height > 120);
    for (let g = 0; g < Math.max(initial, dests.length) + 4; g++) {
      const items = bankItems(bank);
      if (!items.length) break;
      let dst;
      if (bucket) dst = dests[g % dests.length];
      else dst = dests.find(d => !q('.dnditem', d));
      if (!dst) break;
      await drag(items[0], dst); moves++;
      if (stopWhenDone && tn && NavigationManager.taskDone(tn)) break;
    }
    return { did: bucket ? 'dnd_bucket_solved' : 'dnd_solved', moves };
  }

  // ---------------------------------------------------------------
  // DnD con respuestas conocidas (replay de test)            [NUEVA]
  // PARA QUÉ: coloca en cada zona el/los elemento(s) que se cosecharon en el review.
  // BUG QUE CORRIGE: v17 buscaba la zona por "etiqueta"; cuando varias zonas comparten padre
  //   la etiqueta es idéntica y todas recibían la MISMA respuesta (solo se colocaba 1 elemento).
  //   Ahora se usa la etiqueta solo si es única; si no, la posición (índice) de la zona.
  // ---------------------------------------------------------------
  static async placeDndMapping(mapping) {
    let m = testDndModel();   // AJUSTADA v20.3 (antes dndModel): mismo banco/huecos que en la cosecha
    if (!m || !m.dests.length) return { did: 'dnd_no_model' };
    const labels = m.dests.map(zoneLabel);
    const useLabels = new Set(labels).size === labels.length && new Set(mapping.map(x => x.label)).size === mapping.length;
    let moves = 0;
    for (let i = 0; i < m.dests.length; i++) {
      let entry = useLabels ? mapping.find(x => x.label && x.label === labels[i]) : null;
      entry = entry || mapping[i];
      if (!entry) continue;
      const wants = (entry.texts && entry.texts.length ? entry.texts : [entry.text]).filter(Boolean);
      const present = qa('.dnditem', m.dests[i]).map(e => norm(txt(e)));
      const missing = [];
      for (const w of wants) {
        const k = present.indexOf(norm(w));
        if (k >= 0) present.splice(k, 1); else missing.push(w);
      }
      for (const w of missing) {
        // si ED re-renderizó el DOM, recalcular el modelo (mismo orden de zonas)
        if (!m.bank.isConnected || m.dests.some(d => !d.isConnected)) m = testDndModel() || m;
        const dst = m.dests[i];
        if (!dst) break;
        const it = bankItems(m.bank).find(x => norm(txt(x)) === norm(w));
        // AJUSTADA v20.2: si el hueco o la ficha están dentro de una caja con scroll propio (cloze del
        // e-mail, etc.), primero se desplaza esa caja; si no, el arrastre soltaba sobre algo tapado.
        if (it) { await revealInBox(dst); await revealInBox(it); await drag(it, dst); moves++; }
      }
    }
    return { did: 'dnd_replay', moves };
  }
}
