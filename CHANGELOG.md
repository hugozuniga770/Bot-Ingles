# Changelog

## v21.3 — modo COMPLETAR y Home real
- **Home real** (dumps del 31/10): pulsar una unidad NO entra, despliega su lista de lecciones (`.home__courseListItemLink`). El barrido de v20.8 se habría quedado abriendo/cerrando esa lista. Ahora `abrirUnidad()` despliega la lista (verificado) y entra a la 1.ª lección no completa (por el ancho de su barra de progreso; si no se puede leer, la 1.ª).
- **Modo completar** (`__ed.completar()`, modo por defecto en la nube): lee Course Completion / Average Test Score, recorre las unidades sin "Completed!" haciendo prácticas y tests; si se atasca (misma pantalla 6 pasos) va a lo pendiente con los desplegables; sin pendientes o tras `maxMinPorUnidad` (150) min → Home → siguiente unidad. Al final, si el promedio < 100 → barrido de tests. Página desconocida 15 veces → vuelve al Home.
- **Nube**: modos `completar | barrer | auto`; termina antes si el bot acabó; escribe un **resumen** en la página de la ejecución (porcentajes, unidades, tests y el reporte completo de fallos). Probado de punta a punta con Chrome real contra una copia del login y del Home.

## v21.2 — Interact 2, eco del micrófono y BOT EN LA NUBE
- **Interact 2** (reporte Piece of Cake · Step 4): no trae flechas de personaje → se tomaba como desconocido. Ahora se reconoce por `.speakingInteract` / `.interact2` y espera a que el panel se habilite antes de Start.
- **Eco del micrófono** (experimento): en "elegir la respuesta hablando", con micrófono simulado, el bot pulsa Start y reproduce el audio de la opción correcta (voz de un nativo), que entra al micrófono simulado. Si el navegador no deja capturar ese audio, entra silencio (no rompe nada).
- **Nube** (`cloud/runner.js` + `.github/workflows/nube.yml`, guía en `docs/nube.md`): GitHub Actions corre Chrome con Playwright, inicia sesión con los Secrets `ED_USER_n` / `ED_PASS_n` (login real: `input[name=userName]`, `input[name=password]`, `#submit1`; no toca el campo trampa `foilautofill`), inyecta el bot en cada página, guarda memoria y reporte. Varias cuentas en paralelo con la matriz. Probado contra una copia del login (correcta e incorrecta).
- `__ed.reportText()`: el reporte como texto (lo usa la nube).

## v21.1 — micrófono simulado y pestaña que no se traba
- **Micrófono simulado** (`utils/fake-mic.js`, `CFG.fakeMic`): sin micrófono real ("Your microphone is not available ... Error 505"), el navegador entrega un audio casi silencioso, así ED puede grabar y enviar en los speaking al profesor. En "elegir la respuesta hablando" ED escucha silencio (no lo da por correcto, pero ya no se traba). Si hay micrófono real, se usa el real.
- **Pestaña que se traba**: los pasos se imprimen como texto (no objetos) → la consola gasta mucha menos memoria. Con el cargador de Tampermonkey, la pestaña se recarga sola cada `CFG.reloadEveryMin` (40) min y el bot **retoma solo** (bandera `ed:running:v1`).
- **Cargador v1.1** (`tools/cargador.user.js`): corre ANTES que ED (document-start) para instalar el micrófono desde el inicio. Hay que actualizarlo en Tampermonkey.

## v21.0 — detalles finos: mayúsculas, carga lenta, writing y speaking de elegir
- **Mayúsculas** (reporte Lesson 5: Be-Past: Questions · Test · 7/10, 97 %): el banco tenía "Weren't" y "weren't"; el bot comparaba sin mayúsculas, ponía la 1.ª y además creía que estaba bien. Nuevo `pick()`/`exacto()`/`coincide()` en `utils/dom.js`: primero la coincidencia EXACTA; solo si no existe, sin mayúsculas. Aplicado a fichas de huecos (droptarget), DnD, desplegables (FITB y viejo).
- **Pantalla que tarda en cargar** (reporte Writing de "Wrong Color"): si no se reconoce nada, espera hasta 4 s a que aparezca el ejercicio antes de rendirse. Writing también se detecta por `.prWriting__main` y espera su editor.
- **Speaking de elegir respuesta** (reporte Dress from Paris · 5/6): primero prueba un clic en la opción correcta (clase `c`, registrada como `User_Answer`); si ED marca la tarea, no graba. Si no, Start como antes.

## v20.10 — desplegable viejo: rellena TODOS los huecos
- Reporte (Lesson 5: Nouns · Test · 3, 4, 7 y 9/10, y Lesson 2: Pronouns quedó en 90 %): el 1.er hueco salía bien y el 2.º daba "no se abrió la lista". El 1.º salía porque ED abre sola su lista al cargar; los demás se abren con el FOCO (Tab), no con clic. Reproducido en simulación (v20.9: 1/2 · v20.10: 2/2).
- `openLegacy` prueba, verificando cada vez: lista ya abierta → clic en el texto → en la flecha → en el hueco → foco (Tab) → mouse → jQuery → teclado. Si la lista abierta era de otro hueco, la cierra y abre la correcta.
- El resultado trae `metodos` (qué funcionó en cada hueco) y, si falla, el HTML del hueco para el reporte.

## v20.9 — DnD de huecos (ans=id) y desplegable viejo con la estructura real
- **DnD viejo (`span.droptarget`) en tests** — reporte Lesson 5: Pronouns · Test · 3/10 (`moves: 0`): en "Correct Answer" el hueco puede no traer texto, solo `ans="87"` (= `data-id` de la ficha correcta). Se guardaba "87" y en el reintento no había ficha con ese texto. Ahora `dropValue` traduce el id a la palabra, y `findTile` busca por texto, por `data-id` o por texto sin signos (así también sirven cosechas viejas con números).
- **Desplegable viejo** ("Select the correct answer from the drop-down list."), rehecho con el dump real: el hueco es `<span id="1_1">` con `div.questionText` + `div.arrowWrapper`, y la lista es `.optionsWrapper`. Se pulsa el span (verificado), se elige por texto y se comprueba; respaldo por teclado (flechas + Enter).
- El reporte de `replay_incompleto` ahora incluye lo cosechado, lo que se quería poner, el banco de fichas y lo que quedó en cada hueco.

## v20.8 — reporte automático, verificación de tareas, speaking, memory y barrido de tests
- **Reporte automático de fallos** (`utils/reporter.js`): cuando algo no sale (tarea que ED no marcó, tipo desconocido, replay incompleto o sin acción, cosecha vacía, error, test sin 100 en el barrido) guarda una radiografía de la pantalla. Botón **📋 Reporte (N)** en la cajita, `__ed.report()` (copia), `__ed.reportFile()` (.txt), `__ed.reportClear()`. Al detenerse, intenta copiarlo solo.
- **Verificar tarea marcada** (`CFG.verifyTasks`): tras resolver una práctica, si ED no la marcó → 1 reintento completo; si sigue sin marcar → al reporte. No se repiten writing/speaking/audio/memory.
- **Speaking (Personalized speaking)**: Start → Skip → grabar ≥ 2,5 s → Stop → Send, cada clic VERIFICADO (`utils/press.js`); espera la preparación hasta 75 s si no hay Skip.
- **Audio**: SR choice espera hasta 25 s (antes 15) y verifica el Start; Interactive elige la flecha no deshabilitada, verifica el Start (o pulsa la 1.ª frase) y espera hasta 40 s (antes 20).
- **Memory game** (`exercises/memory.js`, "Click on the boxes to match the pairs"): ⚠ cómo marca ED una pareja es supuesto.
- **Barrido de tests < 100** (`core/sweep.js`): `__ed.barrer()` recorre lección por lección (desplegables) entrando al test de cada una; los que no están en 100 los rehace; al terminar la unidad va al Home y entra a la siguiente (scroll incluido). En el barrido, un test que no llega a 100 se anota y se sigue (no se detiene). Necesita `tools/cargador.user.js` (Tampermonkey) para seguir solo entre páginas.

## v20.7 — más velocidad + prácticas con UNA acción + tipos viejos (MCQ, desplegable)
**Velocidad**
- **Test exprés** (`TestManager.expressSubmit`, `CFG.testExpress`): 1.er intento sin respuestas → no resuelve nada; salta a la última pregunta con los numeritos y pulsa Submit (si no puede saltar, Next sin resolver). Antes resolvía todo "a ciegas" (~4–10 s por pregunta).
- **Next con espera inteligente** (`NavigationManager.goNext`): antes 1,8 s fijos (2,5 s en Submit); ahora hasta que cambie la pantalla o aparezca un popup, con el mismo tope.
- Popups, Start Test y abrir Review: de esperas fijas a "hasta que cambie". Pausa antes de Next: 800 → 400 ms.
- `tickMs` por defecto 1200 → 700 (se migra solo si tenías guardado 1200).
- NO se tocó: la cosecha del review, los arrastres, audio/speaking/writing.

**Prácticas: con UNA acción basta** (`utils/practice.js`, `CFG.practiceOneAction`)
- DnD, droptarget, desplegables, texto, subrayar, MCQ y casillas: tras la 1.ª acción, si ED marca la tarea como hecha (máx. 1,5 s), se detiene. Si no la marca → completa todo como antes. Nunca en tests.

**Tipos que fallaban**
- **Ordenar en práctica** (diseño nuevo, 1 ficha por recuadro): buscaba fichas solo en el 1.er recuadro → `seq_no_items`. Ahora busca en todo `.prSeq__main`.
- **MCQ viejo** (`lessonMultipleAnswer`, "select the sentences that are true"): antes se tomaba como `media`. Nuevo `exercises/mcq-legacy.js` (práctica confirmada; test sin confirmar).
- **Desplegable viejo** (`.fillInBlank .questionText`, "Select the correct answer from the drop-down list."): no se veía. Nuevo `exercises/ddl-legacy.js` — ⚠ estructura SUPUESTA, confirmar con `probes/dropdown-dump.js`.
- (v20.6) **DnD viejo en práctica** (`span.droptarget` con video al lado): antes `media`.

## v20.6 — DnD viejo (droptarget) en prácticas
- `DropTargetSolver.solveDropTarget()` + detección antes de `media`.

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
