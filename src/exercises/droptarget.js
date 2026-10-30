// =====================================================================
//  DROPTARGET — "Drag the correct answer/s into place." (componente VIEJO de ED, no-Angular)
// ---------------------------------------------------------------------
//  NUEVO v20.5. Confirmado con dumps (Lesson 4 y 5 · Step 3: Test):
//    huecos:  span.TTpanswerDiv.droptarget[data-id="1_1"] dentro del texto (cloze o globos)
//    fichas:  #TTpTablePlaceHolder .draggableContainer > div.draggable.wordBankTile
//  NO usa .dndZone/.dnditem → ninguna versión anterior lo veía.
//    tests:     cosecha → TestManager.readDropTargets() · replay → placeDropTargets(valores)
//    prácticas: solveDropTarget() (v20.6) — antes se detectaba como "media" por el video de al lado
//  Cada ficha: 1) arrastre normal  2) arrastre otra vez  3) clic en la ficha + clic en el hueco.
//  Tras cada intento se comprueba que el hueco quedó con esa palabra.
//  DEPENDE DE: utils/dom.js, utils/drag.js, utils/scroll.js
//  EXPONE:     DropTargetSolver (se une a PracticeSolver)
// =====================================================================

class DropTargetSolver {
  static isDropTargetScreen() { return !!(qv('.droptarget') && qa('.draggable, .wordBankTile').some(vis)); }

  static dropTargets() { return qav('.droptarget'); }

  // Qué dice un hueco: ficha dentro → su texto; si no, texto del hueco; si no, atributo ans
  static dropValue(t) {
    const tile = q('.draggable, .wordBankTile', t);
    return txt(tile) || txt(t) || (t.getAttribute('ans') || '').trim();
  }

  static bankTiles() { return qa('.draggable, .wordBankTile').filter(e => vis(e) && !e.closest('.droptarget')); }

  // ---------------------------------------------------------------
  // PRÁCTICA (sin respuestas conocidas)                       [NUEVA v20.6]
  // PARA QUÉ: llena cada hueco vacío con una ficha distinta del banco (como el DnD de práctica).
  // Usa el mismo placeDropTargets() que el replay de tests (arrastre → 2.º arrastre → clic+clic).
  // ---------------------------------------------------------------
  static async solveDropTarget() {
    const libres = this.bankTiles().map(t => txt(t));
    const values = this.dropTargets().map(t => (norm(this.dropValue(t)) ? '' : libres.shift() || ''));
    if (!values.some(Boolean)) return { did: 'drop_nothing_to_do' };
    // NUEVO v20.7: primero UNA ficha; si ED ya marcó la tarea, listo. Si no, el resto.
    const k = values.findIndex(Boolean);
    const uno = values.map((v, i) => (i === k ? v : ''));
    let r = await this.placeDropTargets(uno);
    if (await practiceEnough(NavigationManager.curTask()?.n)) return Object.assign(r, { did: 'drop_one_action' });
    const resto = values.map((v, i) => (i === k ? '' : v));
    if (resto.some(Boolean)) { const r2 = await this.placeDropTargets(resto); r = { moves: r.moves + r2.moves, ok: r.ok + r2.ok, total: r.total + r2.total }; }
    return Object.assign(r, { did: 'drop_practice' });
  }

  static async placeDropTargets(values) {
    log('🎯 [DropTarget] Colocando palabras cosechadas en los huecos...');
    let moves = 0, ok = 0;
    for (let i = 0; i < values.length; i++) {
      const want = norm(values[i]);
      if (!want) continue;
      for (let intento = 0; intento < 3; intento++) {
        const t = this.dropTargets()[i];
        if (!t) break;
        if (norm(this.dropValue(t)) === want) break;
        const tile = this.bankTiles().find(x => norm(txt(x)) === want);
        if (!tile) { warn('DropTarget: no encuentro la ficha', values[i]); break; }
        await revealInBox(t); await revealInBox(tile);
        if (intento < 2) await drag(tile, t);
        else { click(tile); await sleep(300); click(t); await sleep(500); }
        moves++;
        await sleep(300);
      }
      const t = this.dropTargets()[i];
      if (t && norm(this.dropValue(t)) === want) ok++;
    }
    const total = values.filter(v => norm(v)).length;
    if (ok < total) warn(`DropTarget: quedaron ${ok}/${total} huecos bien`, { esperado: values, quedó: this.dropTargets().map(t => this.dropValue(t)) });
    return { did: 'drop_replay', moves, ok, total };
  }
}
