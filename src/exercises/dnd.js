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
    let moves = 0, fallidos = 0;
    const metodos = {};
    const initial = bankItems(bank).length;
    const bucket = initial > dests.length && dests.every(d => d.getBoundingClientRect().height > 120);
    for (let g = 0; g < Math.max(initial, dests.length) + 4; g++) {
      const items = bankItems(bank);
      if (!items.length) break;
      let dst;
      if (bucket) dst = dests[g % dests.length];
      else dst = dests.find(d => !q('.dnditem', d));
      if (!dst) break;
      // AJUSTADA v21.16: arrastre VERIFICADO (antes: drag() y a ciegas → "moves: 10" sin que cayera ninguna ficha)
      const como = await this.arrastrarVerificado(items[0], dst, bank, tn); moves++;
      if (como) metodos[como] = (metodos[como] || 0) + 1;
      else if (++fallidos >= 2) return { did: 'dnd_no_cae', moves, metodos };   // no insistir 10 veces (la geometría va en el dump del reporte)
      if (stopWhenDone && tn && NavigationManager.taskDone(tn)) break;
      if (moves === 1 && await practiceEnough(tn)) return Object.assign({ did: 'dnd_one_action', moves }, metodos.normal === moves ? {} : { metodos });   // NUEVO v20.7
    }
    return Object.assign({ did: bucket ? 'dnd_bucket_solved' : 'dnd_solved', moves }, metodos.normal === moves ? {} : { metodos });
  }

  // ---------------------------------------------------------------
  // NUEVO v21.16 — ARRASTRE VERIFICADO
  // Corrida de Nore (02/11, "Career Advisor" · Listen again 1/6, 2/6, 3/6 y otras 4): "moves: 10" y ED sin marcar.
  // En el dump, las 6 fichas seguían en el banco (solo reordenadas) y había un espejo de arrastre pegado: ninguna
  // ficha CAYÓ en su hueco. Causa: la guía de ED ("Got it!") tapaba la página (utils/guia.js). Ahora, tras cada
  // arrastre se comprueba que la ficha salió del banco / entró al hueco / ED marcó la tarea; si no:
  //   1) ¿guía abierta? → cerrarla y repetir   2) soltar un arrastre pegado
  //   3) mouse REAL (nube)   4) soltar en el centro de la caja visible ("Drag Here")
  // Devuelve cómo cayó ('normal', 'tras_guia', 'mouse_real', 'caja') o null.
  // ---------------------------------------------------------------
  static async arrastrarVerificado(it, dst, bank, tn) {
    const n0 = bankItems(bank).length, z0 = qa('.dnditem', dst).length;
    const llego = () => !it.isConnected || !bank.contains(it) || bankItems(bank).length < n0 || qa('.dnditem', dst).length > z0 || !!(tn && NavigationManager.taskDone(tn));
    await drag(it, dst);
    if (llego()) return 'normal';
    if (Guia.abierta()) { await Guia.cerrar(); await drag(it, dst); if (llego()) return 'tras_guia'; }
    this.soltarPegado();
    if (Manos.hay()) { await Manos.arrastrar(it, dst); if (await waitFor(llego, 1200, 200)) return 'mouse_real'; this.soltarPegado(); }
    const caja = dst.closest('.prMT_T2T__regContainer, .prCl__col, ed-la-dndzone');
    if (caja && caja !== dst && caja.getBoundingClientRect().height > dst.getBoundingClientRect().height + 4) { await drag(it, caja); if (llego()) return 'caja'; this.soltarPegado(); }
    return null;
  }

  // NUEVO v21.17 — si ED volvió a dibujar los huecos, el banco es el MISMO de antes (por su dg_name, p. ej.
  // "TTpTablePlaceHolder"), no "la zona con más fichas" (que, con el banco vacío, es un hueco ya lleno)
  static mismoBanco(m) {
    const nombre = m && m.bank && m.bank.getAttribute && m.bank.getAttribute('dg_name');
    const zs = qav('.dndZone'), b = nombre ? zs.find(z => z.getAttribute('dg_name') === nombre) : null;
    if (b) return { bank: b, dests: zs.filter(z => z !== b && !b.contains(z) && !z.contains(b)) };
    return testDndModel() || m;
  }

  // NUEVO v21.17 — Caro, "Lesson 1: Ad" · Test 1/5 y 5/5: lo cosechado para esa posición pedía "all kinds of homes" pero
  // el banco traía selling/buying/painting/renting (ED cambió el ORDEN de las preguntas entre un intento y otro).
  // Si ninguna ficha pedida está en el banco, se busca entre las otras preguntas cosechadas de ESTE test una cuyas
  // fichas SÍ estén todas en el banco.
  static mappingQueCalza(mapping, m) {
    const quiere = mp => mp.flatMap(e => (e.texts && e.texts.length ? e.texts : [e.text])).filter(Boolean).map(norm);
    const hay = new Set(qa('.dnditem', m.bank).map(e => norm(txt(e))));
    const q0 = quiere(mapping);
    if (!q0.length || q0.some(t => hay.has(t))) return null;
    let todas = {}; try { todas = (StorageManager.getAns2() || {})[NavigationManager.testKey()] || {}; } catch (e) {}
    for (const [idx, e] of Object.entries(todas)) {
      if (!e || !Array.isArray(e.dnd)) continue;
      const q = quiere(e.dnd);
      if (q.length && q.every(t => hay.has(t))) { log('🧩 Las preguntas cambiaron de orden: uso lo cosechado de la pregunta', idx, 'que calza con estas fichas'); return e.dnd; }
    }
    return null;
  }

  // si quedó un arrastre a medias (espejo .gu-mirror de dragula pegado al mouse), soltarlo
  static soltarPegado() {
    if (!q('.gu-mirror') && !q('.gu-transit')) return false;
    for (const t of ['pointerup', 'mouseup']) { try { document.documentElement.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 0, buttons: 0 })); } catch (e) {} }
    return true;
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
    mapping = this.mappingQueCalza(mapping, m) || mapping;   // NUEVO v21.17
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
        if (!m.bank.isConnected || m.dests.some(d => !d.isConnected)) m = this.mismoBanco(m);   // AJUSTADA v21.17
        const dst = m.dests[i];
        if (!dst) break;
        const it = pick(bankItems(m.bank), w);   // AJUSTADA v21.0: exacta (mayúsculas) primero
        // AJUSTADA v20.2: si el hueco o la ficha están dentro de una caja con scroll propio (cloze del
        // e-mail, etc.), primero se desplaza esa caja; si no, el arrastre soltaba sobre algo tapado.
        if (it) { await revealInBox(dst); await revealInBox(it); await drag(it, dst); moves++; }
      }
    }
    // NUEVO v21.16 — Nore, "The Tour Group" · Let's review: 90 % con "dnd_replay moves 6" y nada en el reporte para saber
    // qué pregunta falló. Ahora se VERIFICA qué quedó en cada hueco; si no coincide con lo cosechado → replay_incompleto
    // (con el dump completo y la lista hueco → quería / hay).
    // AJUSTADA v21.17 — Caro (03/11): la verificación volvía a adivinar el banco ("la zona con más fichas") cuando ya
    // estaba VACÍO → tomaba el 1.er hueco como banco y comparaba todo corrido un lugar (4 de 4 "mal" con las fichas
    // bien puestas). Ahora se verifica con los MISMOS huecos donde se colocó.
    const mf = (m.bank.isConnected && m.dests.every(d => d.isConnected)) ? m : this.mismoBanco(m), labs = mf.dests.map(zoneLabel);
    const usar = new Set(labs).size === labs.length && new Set(mapping.map(x => x.label)).size === mapping.length;
    let ok = 0, total = 0; const mal = [];
    for (let i = 0; i < mf.dests.length; i++) {
      const entry = (usar ? mapping.find(x => x.label && x.label === labs[i]) : null) || mapping[i];
      if (!entry) continue;
      const wants = (entry.texts && entry.texts.length ? entry.texts : [entry.text]).filter(Boolean);
      if (!wants.length) continue;
      total++;
      const hay = qa('.dnditem', mf.dests[i]).map(e => norm(txt(e)));
      if (wants.every(w => hay.includes(norm(w)))) ok++; else mal.push({ hueco: i + 1, quiere: wants.slice(0, 3), hay: hay.slice(0, 3) });
    }
    return Object.assign({ did: 'dnd_replay', moves }, total ? { ok, total } : {}, mal.length ? { mal: mal.slice(0, 6) } : {});
  }
}
