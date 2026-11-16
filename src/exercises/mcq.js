// =====================================================================
//  MCQ — opción múltiple / true-false / checkbox
// ---------------------------------------------------------------------
//  Tipo(s) en detectKind(): mcq
//  Se detecta por: label.prMCQ__answerLabel o .prMCQ__qaInnerSet
//  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
//  EXPONE:     MCQSolver (se une a PracticeSolver en exercises/index.js)
// =====================================================================

class MCQSolver {
  // ---------------------------------------------------------------
  // OPCIÓN MÚLTIPLE / TRUE-FALSE / CHECKBOX                  [AJUSTADA]
  // PARA QUÉ: marca la respuesta cosechada; si no la conoce marca la 1.ª opción.
  // CAMBIOS (solo se activan si hay datos; sin datos hace exactamente lo de v19.6):
  //   - `fallback`: respuestas del review por posición, por si el texto de la pregunta no coincide.
  //   - si el texto exacto de la opción no coincide, prueba por prefijo.
  // ---------------------------------------------------------------
  // NUEVO v21.20 — respuesta cosechada de ESTE test para una pregunta. Devuelve { a, como, ambigua } (a = null si no hay).
  // POR QUÉ: Admin, Nini y Carlitos (TOEIC 2 · U2 L4 "Preparing for Part 2: Question-Response" · Step 3: Test) quedaban
  // en 40 % siempre. Las 5 preguntas se llaman "Listen" y las respuestas correctas son A, C, B, A, B. La cosecha las
  // guardaba bien por pantalla (ed:testAns:v2), pero el replay miraba PRIMERO el mapa global por texto de pregunta
  // (ed:answers:v1["Listen"]), donde solo queda la última (B) → B en las cinco → 2 de 5 = 40 %.
  // AHORA manda lo cosechado en este test, en este orden: 1) la pantalla con el MISMO audio/foto (sirve aunque ED
  // cambie el orden de las preguntas); 2) la misma pantalla y posición si el texto de la pregunta coincide; 3) otra
  // pantalla del test con ese texto, solo si el texto NO se repite con respuestas distintas. Si el texto es ambiguo
  // (misma pregunta, respuestas distintas) el mapa global por texto NO se usa.
  static respuestaDelTest(test, qText, pos) {
    const r = { a: null, como: null, ambigua: false };
    if (!test || !test.todas) return r;
    const nq = norm(qText), items = [];
    for (const [i, e] of Object.entries(test.todas)) (e && e.mcq || []).forEach((m, p) => { if (m && m.a && m.a.length) items.push({ idx: +i, pos: p, q: m.q, a: m.a, media: e.media || '' }); });
    const iguales = items.filter(x => norm(x.q) === nq);
    r.ambigua = new Set(iguales.map(x => JSON.stringify(x.a))).size > 1;
    const sig = test.media || '';
    const porMedia = sig ? iguales.filter(x => x.media === sig) : [];
    const hit = porMedia.find(x => x.pos === pos) || (porMedia.length === 1 ? porMedia[0] : null);
    if (hit) { r.a = hit.a; r.como = hit.idx === test.idx ? 'pantalla' : 'audio'; return r; }
    const aqui = items.find(x => x.idx === test.idx && x.pos === pos && norm(x.q) === nq);
    // la misma pantalla vale si no se sabe el audio de ahora o el de la cosecha (cosechas viejas no lo guardaban)
    if (aqui && (!sig || !aqui.media || aqui.media === sig)) { r.a = aqui.a; r.como = 'pantalla'; return r; }
    if (!r.ambigua && iguales.length) { r.a = iguales[0].a; r.como = 'texto'; return r; }
    if (aqui) { r.a = aqui.a; r.como = 'pantalla?'; }
    return r;
  }

  static async solveMCQ(fallback = null, test = null) {
    log('☑️ [MCQ / Checkboxes] Seleccionando opciones correctas...');
    let marked = 0, fromKnown = 0;
    const known = StorageManager.getAns();
    const sets = qa('.prMCQ__qaInnerSet');
    const como = [];

    if (!sets.length) {
      const checkboxes = qav('input[type="checkbox"]');
      const tn0 = NavigationManager.curTask()?.n;
      for (const cb of checkboxes) {
        if (!cb.checked) { click(cb); marked++; await sleep(250); }
        if (marked === 1 && await practiceEnough(tn0)) break;   // NUEVO v20.7
      }
      return { did: 'checkboxes_solved', marked };
    }

    for (const s of sets) {
      const labels = qa('label.prMCQ__answerLabel, input[type="checkbox"], input[type="radio"]', s).filter(vis);
      // NUEVO v21.7 — opciones con IMÁGENES (reporte Watch again · "Choose the correct picture"): no hay labels;
      // se pulsa la imagen (o su caja). Práctica: la 1.ª basta; ED marca la correcta y la tarea.
      if (!labels.length) {
        // AJUSTADA v21.12 — Mateo (U10 L4 · Watch again, "Choose the correct picture"): marked 0. Las imágenes todavía
        // cargaban (sin tamaño = invisibles) → esperar hasta 20 s; pulsar VERIFICANDO (imagen → su caja → la opción)
        // y, si ED no marca la tarea, la siguiente imagen (Hugo: "solo tocar en una imagen que es como seleccionable").
        const ops = () => qa('.prMCQ__answers', s).filter(e => vis(e) && (q('.prMCQ__answerImage', e) ? vis(q('.prMCQ__answerImage', e)) : true));
        await waitFor(() => ops().length > 0, 20000, 400);
        // AJUSTADA v21.16 — Maria, Luis y Thiago (U10 L4 · Watch again 2/3, "Choose the correct picture"): marked 0. ED trae
        // en CADA opción, desde antes de contestar, un ícono .checkAnswerIcon.selection--x / --v (y "correct" en la buena),
        // ESCONDIDOS hasta que se elige. El bot creía que ya estaba contestada y no tocaba nada. Ahora solo cuentan los
        // íconos que se VEN, y se toca primero la opción que ED marca como correcta.
        const seVe = e => { if (!e || !vis(e)) return false; try { const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.opacity !== '0' && cs.display !== 'none'; } catch (_) { return true; } };
        if (qa('.selection--v, .prMCQ__answerImage--correct', s).some(seVe)) continue;
        const tn = NavigationManager.curTask()?.n;
        // la verificación: cambió alguna clase de la opción (el dump real trae selection--x, --incorrect, correct,
        // checked) o ED marcó la tarea; mCS_* lo pone el scroll al cargar la imagen, no cuenta
        const firmaOp = op => [op, ...qa('*', op)].map(e => (typeof e.className === 'string' ? e.className : '')).join('|').replace(/\bmCS\w*/g, '');
        const orden = ops().slice(0, 6).sort((a, b) => (q('.multiRadioWrapper.correct, .correct', b) ? 1 : 0) - (q('.multiRadioWrapper.correct, .correct', a) ? 1 : 0));
        for (const op of orden) {
          const yaElegida = () => qa('.selection--v, .selection--x, .prMCQ__answerImage--correct, .prMCQ__answerImage--incorrect', op).some(seVe) || /selection--|--correct|--incorrect/.test(op.className);
          if (yaElegida()) continue;
          const f0 = firmaOp(op);
          for (const el of [q('.prMCQ__answerImage', op), q('img', op), q('.multiRadioWrapper', op), op].filter((x, i, a) => x && a.indexOf(x) === i)) { if (await press(el, () => firmaOp(op) !== f0 || yaElegida() || !!(tn && NavigationManager.taskDone(tn)), 2000)) { marked++; break; } }
          await sleep(400);
          if (TestManager.inTest()) break;   // en un TEST una sola imagen (como v21.11): probar varias cambiaría la respuesta
          if (q('.selection--v, .prMCQ__answerImage--correct', s)) break;
          if (tn && await waitFor(() => NavigationManager.taskDone(tn), 1500, 250)) break;
        }
        continue;
      }
      const checked = q('input[type="radio"]:checked, input[type="checkbox"]:checked', s);
      if (checked) continue;

      const qText = mcqQuestionText(s);
      // AJUSTADA v21.20: primero lo cosechado en ESTE test (ver respuestaDelTest); el mapa global por texto solo si el
      // texto de la pregunta no es ambiguo dentro del test. Sin datos del test → exactamente lo de antes.
      const dt = this.respuestaDelTest(test, qText, sets.indexOf(s));
      let kv = dt.a ? (dt.a.length === 1 ? dt.a[0] : dt.a) : (dt.ambigua ? null : known[qText]);
      if (dt.a) como.push(dt.como);
      if (kv == null && fallback && !dt.ambigua) {
        const hit = fallback.find(m => norm(m.q) === norm(qText)) || fallback[sets.indexOf(s)];
        if (hit && hit.a && hit.a.length) kv = hit.a.length === 1 ? hit.a[0] : hit.a;
      }
      const wanted = (kv == null ? [] : (Array.isArray(kv) ? kv : [kv])).map(norm);
      let targets = wanted.length ? labels.filter(l => wanted.includes(norm(txt(l)))) : [];
      if (!targets.length && wanted.length) {
        targets = labels.filter(l => { const t = norm(txt(l)); return t && wanted.some(w => w.length >= 8 && t.startsWith(w.slice(0, 25))); });
      }
      if (targets.length) fromKnown++; else targets = [labels[0]];

      for (const l of targets) { click(l); marked++; await sleep(300); }
      if (!fallback && !fromKnown && marked && await practiceEnough(NavigationManager.curTask()?.n)) break;   // NUEVO v20.7
    }
    const out = { did: 'mcq_solved', marked, fromKnown };
    if (como.length) out.como = como.join(',');
    return out;
  }
}
