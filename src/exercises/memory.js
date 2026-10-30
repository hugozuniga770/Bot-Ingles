// =====================================================================
//  MEMORY GAME — "Click on the boxes to match the pairs of words." (memoG)
// ---------------------------------------------------------------------
//  NUEVO v20.8. Visto en dump (Lesson 6: Crime · Step 2: Practice · 1/6): 12 cartas
//  .memoG__card (6 --word + 6 --image) con caras .memoG__cardSideFront / Back.
//  ⚠ SIN CONFIRMAR cómo marca ED una pareja acertada. Por eso:
//   1) Práctica: da vuelta 2 cartas → si ED marca la tarea (practiceEnough), listo.
//   2) Si no: prueba parejas palabra×imagen. Una pareja acertada es la que NO vuelve a su
//      estado inicial tras ~1,5 s (se compara la clase con la que tenía al principio).
//  DEPENDE DE: utils/dom.js, utils/practice.js, utils/reporter.js
//  EXPONE:     MemoryGameSolver (se une a PracticeSolver)
// =====================================================================

class MemoryGameSolver {
  static isMemoryGame() { return qav('.memoG__card').length >= 2; }

  static async solveMemoryGame() {
    log('🃏 [Memory] Buscando parejas...');
    const tn = NavigationManager.curTask()?.n;
    const cards = qav('.memoG__card');
    if (cards.length < 2) return { did: 'memory_none' };
    const base = c => (typeof c.className === 'string' ? c.className : '').split(/\s+/).filter(x => !/lastInRow|--word|--image/.test(x)).sort().join(' ');
    const inicial = new Map(cards.map(c => [c, base(c)]));
    const resuelta = c => base(c) !== inicial.get(c);
    const tocar = async c => { click(q('.memoG__cardIW', c) || c); await sleep(450); };

    await tocar(cards[0]); await tocar(cards[1]); await sleep(900);
    if (await practiceEnough(tn)) return { did: 'memory_one_action' };

    const words = cards.filter(c => /--word/.test(c.className)), imgs = cards.filter(c => /--image/.test(c.className));
    const A = words.length && imgs.length ? words : cards, B = words.length && imgs.length ? imgs : cards;
    let pares = 0, intentos = 0;
    for (const w of A) {
      if (resuelta(w)) continue;
      for (const i of B) {
        if (i === w || resuelta(i) || resuelta(w)) continue;
        await tocar(w); await tocar(i); await sleep(1500); intentos++;
        if (resuelta(w) && resuelta(i)) { pares++; break; }
        if (tn && NavigationManager.taskDone(tn)) return { did: 'memory_done', pares, intentos };
        if (intentos > 60) break;
      }
    }
    if (!pares) Reporter.capture('memory_sin_parejas', { intentos });
    return { did: 'memory_tried', pares, intentos };
  }
}
