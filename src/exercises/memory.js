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
    // AJUSTADA v21.12 — Hugo (02/11): "es seleccionar dos cuadritos y ya sale hecho". En ED nunca se dio vuelta ninguna
    // carta (67 intentos, 3 corridas): el clic iba al contenedor .memoG__cardIW y el que escucha es lo de adentro.
    // Ahora se prueba, VERIFICANDO que la carta cambie: la cara visible (.memoG__cardSideBack) → .memoG__cardSides →
    // .memoG__cardIW → la carta; lo que funcione se usa en las demás. Más tiempo para que carguen.
    await waitFor(() => qav('.memoG__card').length >= 2, 20000, 400);
    const estado = c => [c, ...qa('*', c)].map(e => (typeof e.className === 'string' ? e.className : '') + (e.style ? e.style.transform || '' : '')).join('|');
    let forma = null;
    const tocar = async c => {
      const cands = [['dorso', q('.memoG__cardSideBack', c)], ['caras', q('.memoG__cardSides', c)], ['IW', q('.memoG__cardIW', c)], ['carta', c]].filter(([, e]) => e);
      const orden = forma ? [cands.find(x => x[0] === forma), ...cands.filter(x => x[0] !== forma)].filter(Boolean) : cands;
      const antes = estado(c);
      for (const [nombre, el] of orden) { if (await press(el, () => estado(c) !== antes, 900)) { forma = nombre; await sleep(300); return true; } }
      await sleep(300);
      return false;
    };

    const g1 = await tocar(cards[0]), g2 = await tocar(cards[1]); await sleep(900);
    if (await practiceEnough(tn)) return { did: 'memory_one_action', forma, giraron: [g1, g2] };

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
        // AJUSTADA v21.11 (Hugo: "un solo intento corto por corrida"): antes hasta 60 parejas (~3 min, 3 veces por unidad)
        if (intentos >= 6) break;
      }
      if (intentos >= 6) break;
    }
    // NUEVO v21.11: si no emparejó, el reporte se toma CON DOS CARTAS ABIERTAS (palabra + imagen) para ver cómo
    // las muestra ED y qué clase cambia. El "antes" (todas cerradas) lo guarda el engine.
    if (!pares) {
      const c1 = A.find(c => !resuelta(c)), c2 = B.find(c => c !== c1 && !resuelta(c));
      if (c1) await tocar(c1);
      if (c2) await tocar(c2);
      Reporter.capture('memory_sin_parejas', { intentos, forma, abiertas: [c1, c2].filter(Boolean).map(c => (typeof c.className === 'string' ? c.className : '') + ' | ' + txt(c).slice(0, 30)),
        clasesAlEmpezar: [...inicial.values()].slice(0, 4) });
    }
    return { did: 'memory_tried', pares, intentos, forma };
  }
}
