# Changelog

## v20.5 — DnD viejo "Drag the correct answer/s into place" (span.droptarget)
- Nuevo `exercises/droptarget.js` (`DropTargetSolver`): huecos `span.TTpanswerDiv.droptarget` y fichas `div.draggable.wordBankTile` en `#TTpTablePlaceHolder` (componente no-Angular, confirmado con dumps de Lesson 4 y 5 · Step 3: Test). Antes ninguna rama lo veía → cosecha vacía y reintento vacío (test en 37 % y `ED_TEST_NO_100`).
- Cosecha `drop` (palabra de cada hueco en "Correct Answer": ficha dentro, texto o atributo `ans`). Replay: arrastre, 2.º arrastre y, si no, clic ficha + clic hueco; comprueba cada hueco.
- La pestaña correcta en pantallas no-MCQ ahora además espera que el contenido CAMBIE respecto de "Your Answer" (`contentSig`), útil en el 2.º review.
- `__ed.dragTest()` también prueba este tipo. `__ed.inspect()` muestra `.droptarget`, `.draggable`, `.sequenceZone`.

## v20.4 — ordenar (secuencia) en tests + vista correcta segura
- **Cosecha en la vista correcta, garantizado:** ED marca "Tu respuesta" con `.checkAnswerMode` y "Respuesta correcta" con `.seeAnswerMode`. `answersShown()` ahora espera `.seeAnswerMode`. En ordenar las dos vistas tienen fichas en todos los huecos → hasta v20.3 se cosechaba TU orden (equivocado). Simulado: v20.3 guardaba el orden de "Tu respuesta"; v20.4 el correcto.
- **Replay de ordenar** (`SequenceSolver.placeSequence`): antes el replay lo trataba como banco→huecos y no movía nada (`moves: 0`). Ahora coloca de arriba abajo arrastrando la ficha correcta sobre cada posición y relee el orden; funciona tanto si ED intercambia como si inserta (probado en simulación con ambos).
- Se guarda `seq` (orden correcto) en la cosecha. Las cosechas viejas de ordenar NO se usan (estaban mal).
- `solveSequence` de práctica no cambió.

## v20.3 — clasificación True/False en tests + prueba de arrastre
- **Clasificación (prCl, "Which sentences are true… Complete the table")**: sin `.dndBank`, el bot tomaba como banco "la zona con más fichas". En el Review el banco está vacío → tomaba la columna True como banco y `readDnd` además descartaba las columnas con 2+ fichas → cosecha vacía o corrida (v20.2 habría puesto las fichas al revés). Nuevo `utils/dnd-model.js` (`testDndModel`): las columnas con encabezado (`.containerHeader`) son los huecos y la única sin encabezado es el banco. Solo lo usan los tests; el DnD de práctica sigue igual.
- Nuevo `__ed.dragTest()`: mueve UNA ficha y dice si se movió y qué hay justo donde suelta (para ver si algo, como el "Drag Here", tapa el hueco).

## v20.2 — cosecha de DnD en el review + scroll en cajas
- **Pestaña "Respuesta correcta" en pantallas no-MCQ** (`TestManager.ensureCorrectAnswerTab`): antes, 1 clic + 600 ms sin comprobar → si ED tardaba se cosechaba "Tu respuesta" (vacía). Ahora espera a que el `<li>` quede `.active` y a que se vean las respuestas (`answersShown`), + `harvestPause`. Simulado con carga de 1,2 s: v20.1 guardaba 0, v20.2 guarda todo. La rama MCQ no cambió.
- **Scroll dentro de cajas** (`utils/scroll.js`, `revealInBox`): en el replay de DnD, antes de arrastrar se desplaza la caja con barra propia (mCustomScrollbar) hasta que se vea el hueco y la ficha.
- Confirmado con dumps (Lesson 1 · Step 5): "Match the words to the pictures" (`prTextToPic`) y el e-mail para completar (`prCLZ`) usan `.dndZone/.dnditem/.dndBank` → ya los cubre `readDnd` + `placeDndMapping`. Tras la revisión 6/6, ED salta a la lección siguiente → `<` ("Volver") regresa al test.

## v20.1 — recuperado de v17 (grupo 1) + volver al test
- **Volver al test tras el review** (`TestManager.reopenAfterReview`): antes el bot solo "limpiaba el run" y seguía con la lección siguiente. Ahora prueba, verificando cada intento: flechita `<` de abajo (selectores sin confirmar) → desplegables lección/step (v17) → flechita de cabecera (v19.7). Si cae en el puntaje, pulsa Retake (v17).
- **Si no llega a 100 % tras `maxTestAttempts` → se detiene y avisa** (consola + cajita). `__ed.cfg({stopIfNot100:false})` vuelve a lo anterior.
- Recuperado de v17: navegación por desplegables (`core/dropdowns.js`: gotoLesson/Step/Task/NextIncomplete), `__ed.sweep()`, popup "Reminder" → Continue, copy/paste/export/import de respuestas, `setSpeed`, atajo **Alt+E**.
- Recuperado de v17 vía v19.8 (lo único de la v19.8 que de verdad estaba conectado): regex del popup "no ha respondido" y pregunta MCQ fuera del bloque (`questionOf`).
- Nuevo: `probes/test-dump.js` (DnD de tests + pestañas del review + barra de abajo), `__ed.dropdowns()`.
- `npm test`: las 12 pantallas de v20.0 siguen idénticas; +3 pantallas nuevas (volver por desplegables, volver por `<`, detenerse sin 100 %).

## v20.0 — modularización
- La v19.7 se dividió en `src/` (un archivo por tipo de ejercicio) y se genera `dist/ed-autopilot.js` con `node build.js`.
- **Mismo comportamiento que v19.7**: `npm test` corre 12 pantallas simuladas y da resultados idénticos (clics, arrastres, localStorage).
- Nuevo: `__ed.solve()` para probar un tipo de ejercicio sin pulsar Next.
- Nuevo: `probes/dnd-dump.js` (diagnóstico de DnD, solo lectura).
- La versión ahora se define en un solo lugar (`src/bootstrap.js`).

## Historia previa (resumen)
- v17.x: navegación completa por desplegables, modos, cosecha de MCQ/FITB/DnD.
- v18.x: reescritura en clases; arreglo de la pestaña "Correct Answer".
- v19.5/19.6: base estable; 19.6 añadió Integrated Speaking y dejó de ordenar.
- v19.7: orden de detección corregido, solvers recuperados de v17, replay de tests, DnD coloca todos los elementos.
