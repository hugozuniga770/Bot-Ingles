# Tipos de ejercicio — estado y cómo probarlos

**Cómo probar un tipo:** carga el bot, ve a una pantalla de ese tipo **sin resolver** y escribe `__ed.solve()`. El bot la resuelve sin pulsar Next. Mira si quedó bien y, si falla, pásale a Claude la salida de `__ed.inspect()`.

Marca el estado aquí cada vez que lo valides (✅ funciona · ⚠️ falla · ⬜ sin probar en v20).

| Tipo (`kind`) | Archivo | Se detecta por | Función | Estado |
|---|---|---|---|---|
| `writing` | `exercises/writing.js` | `iframe[id^="mce_"]` | `solveWriting` | ✅ (congelado) |
| `select_text` | `exercises/select-text.js` | `span.st.learning__selectTxt_st` | `solveSelectText` | ⬜ |
| `sequence` | `exercises/sequence.js` | `.prSeq__container` | `solveSequence` | ⬜ (en 19.6 fallaba por el orden de detección; 19.7 lo cambió) |
| `open_speech` | `exercises/speaking.js` | `.openSpeech__AnsW` | `solveOpenSpeech` | ⬜ |
| `interactive_speaking` | `exercises/speaking.js` | `a.chooseCaracterArrow` · `.answersWrapper.interact2` | `solveInteractive` / `solveBranching` | ⬜ v21.12 (Hugo, HTML real): interactivo = 1.ª frase y Start cuando se habilita (`frase+start`); ramificado = Start → grabar (`branching_speaking`) |
| `sr_choice` | `exercises/speaking.js` | `.questionInstructionsSR` + `a.button.continue` | `solveSRChoice` | ⬜ |
| `dnd` (práctica) | `exercises/dnd.js` | `.dndZone` + `.dnditem` | `solveDragAndDrop` | ✅ en ED (muchas prácticas). Tabla `prMT_T2T` (U8 L6 · 2) con fichas reales: `dndTablaU8` |
| `fitb` | `exercises/fitb.js` | `.DDLOptions__selected` | `solveFITB` | ⬜ |
| `mcq` | `exercises/mcq.js` | `label.prMCQ__answerLabel` · imágenes `.prMCQ__main--ansImages` | `solveMCQ` | ✅ texto en ED. Imágenes v21.12: espera hasta 20 s, imagen → caja → opción verificando; en tests UNA sola |
| `text` | `exercises/text.js` | `input[type=text]`, `textarea` | `solveText` | ✅ en ED. v21.12: writing de corregir (campos ya llenos) → una letra en el 1.º, verificando; nunca en tests |
| `droptarget` | `exercises/droptarget.js` | `span.droptarget` + `.wordBankTile` | `solveDropTarget` | ⬜ v20.6 |
| `mcq_legacy` | `exercises/mcq-legacy.js` | `.lessonMultipleAnswer` | `solveLegacyMCQ` | ⬜ v20.7 |
| `ddl_legacy` | `exercises/ddl-legacy.js` | `span[id] > .questionText` + `.optionsWrapper` | `solveLegacyDDL` | ✅ estructura real · v21.9 clic fuera tras elegir (falta verlo en ED: `fuera+clic_texto`) |
| `explore` | `exercises/explore.js` | paso Explore/Prepare con video, `.speaker`/`.segment`; o `.learning__vocabularyCards_card` | `solveExplore` | ⬜ v21.12 (Hugo, HTML real): VIDEO → esperar el play grande y pulsarlo; TARJETAS → abrir una y cerrar con la X; lectura → parlantes (sin tareas: con un audio basta, tope 20 s) |
| `memory` | `exercises/memory.js` | `.memoG__card` | `solveMemoryGame` | ⬜ v21.12 (Hugo, dump): clic en la cara visible `.memoG__cardSideBack`; con DOS cartas abiertas ED marca (`memory_one_action`, `forma`) |
| `media` | `exercises/media.js` | `.layout__mediaPlayPause` | `solveMedia` | ⬜ |

## Tests

| Parte | Dónde | Estado |
|---|---|---|
| Start / Score / entrada a Review | `tests/test-manager.js`, `core/engine.js` | ✅ (congelado) |
| Pestaña "Correct Answer" + cosecha MCQ | `TestManager.ensureCorrectAnswerTab`, `harvestReview` | ✅ |
| Cosecha FITB | `TestManager.readFitb` | ⬜ |
| Cosecha DnD (`.dndZone`: TextToPic, cloze) | `TestManager.readDnd` | ⬜ v20.2 (espera pestaña activa) |
| Cosecha DnD clasificación True/False (`prCl`) | `readDnd` + `testDndModel` | ⬜ v20.3 |
| DnD viejo (`.droptarget`): cosecha `drop` + replay | `DropTargetSolver.placeDropTargets` | ⬜ v20.5 |
| Replay MCQ / FITB | `TestManager.replayQuestion` | ⬜ |
| Ordenar en tests (`prSeq`): cosecha `seq` + replay | `SequenceSolver.placeSequence` | ⬜ v20.4 |
| Replay DnD | `DnDSolver.placeDndMapping` | ⚠️ ídem (falta `exercises/dnd-test.js`) |
| Volver al test tras el review | `TestManager.reopenAfterReview` | ⬜ v20.1 (`<` supuesto → desplegables → cabecera) |
| Test exprés (1.er intento → Submit) | `TestManager.expressSubmit` | ⬜ v20.7 |
| Detenerse si no llega a 100 % | `MainEngine.step` (rama del puntaje) | ⬜ v20.1 |
