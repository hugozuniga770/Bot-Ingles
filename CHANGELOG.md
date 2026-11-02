# Changelog

## v21.15 — las 6 corridas del 02/11 (Maria, Nore, Chapaquin, Roy, Mateo, Thiago; v21.14)
Subieron todos (p. ej. Thiago 3 → 74 %, Mateo 60 → 90 %, Roy 51 → 90 % y 82 → 100 %), pero faltaron muchas actividades.
- **Causa principal: recargar la página dentro de las lecciones** (cada 40 min, "♻️ Recargo la pestaña"). Después ED
  dejaba esa pestaña SIN CARGAR: tests sin preguntas ni botones (marco `toeicInTestFR` vacío) y pasos con tareas pero
  ninguna activa. El bot seguía avanzando paso por paso por lecciones que tampoco cargaban: ~150 de los ~180 atascos
  y lecciones enteras marcadas ❌. SIEMPRE se recuperaba al ir al Home y volver a entrar. Ahora: nunca se recarga
  dentro de las lecciones; el refresco es Home → volver a entrar (`console-api`), el test sin preguntas va al Home
  (`engine`), y un atasco en una página sin cargar va primero al Home, una vez por lugar (`sweep`).
- **Test ya hecho**: en "Start Test" Next no lleva a ningún lado → se repetía 6 veces hasta el atasco (22 veces).
  Ahora avanza al paso o la lección siguiente enseguida.
- **Unit Tests**: en My Progress la fila "Unit Test" viene OCULTA (`ng-hide`): estos cursos no tienen Unit Test. El bot
  buscaba 14 por cuenta (~20 min) y el tablero los mostraba como "sin hacer". Ahora las filas ocultas no cuentan.
- **Time on Task y Final Test** (encabezado de My Progress: "21 : 30 Hrs. Mins. Time on Task", "80 % Final Test"): se
  leen y salen en el tablero. Es el tiempo que mide ED (las 4 h de la UPB).
- **Google Chrome en la nube** (`channel: 'chrome'`, si no está: Chromium): los videos de speaking salían en 00:00 y
  el reconocimiento de voz no arrancaba ("Please wait while your Speech Recognition session is being established");
  el Chromium de Playwright no trae los códecs de los .mp4. **Por confirmar en ED.**
- **Reporte completo**: el navegador guarda solo los últimos 40 fallos (a todas las cuentas se les perdieron los
  primeros); la nube junta TODOS en `salida/reporte-completo.json`.
- El resumen ya no dice "Curso: no se pudo leer" (usa el que leyó el banco).
- Pantallas nuevas con el HTML real de estas corridas: `atascoPaginaSinCargar`, `testVacioAlHome`,
  `testYaHechoAvanza`, `myProgressUnitTestOculto` (la v21.14 falla las 4 igual que en ED). Cambiadas a propósito:
  `completarAlterna` (llega al Home en 18 pasos, antes 42) y `completarSaltoOtraUnidad` (intenta avanzar antes).
- **Solo simulación.**

## v21.14 — ritmo de persona y más tiempo para lo frágil; el cargador siempre trae la última versión (Hugo, 02/11)
Hugo: "mínimo una persona trabaja 4 horas en la plataforma; dales más tiempo a las cosas frágiles para cargar" y
"que el js del README traiga siempre la última versión".
- **Paciencia** (`CFG.paciencia = 1.5`, en `waitFor`): TODA espera "hasta que cargue/aparezca" tiene 1,5 veces más
  margen. Si lo esperado aparece antes, sigue enseguida (no frena lo que ya funciona). Incluye los clics verificados
  (`press`), desplegables, Home, My Progress, tests y review, video, tarjetas, memoria, imágenes, speaking.
- **Next**: espera hasta 4,5 s (Submit 6 s) a que cambie la pantalla (antes 1,8 / 2,5 s): evita pulsar Next dos veces.
- **Branching speaking** hasta 150 s (antes 100) para que ED procese la grabación.
- **Ritmo de persona** (`CFG.pausaPaso = 5`, `__ed.auto()`): pausa al azar de 2,5 a 7,5 s entre pasos. Con la
  corrida de Mateo (1751 pasos en 93 min) eso da ~4 h. En la nube se cambia en Actions → nube → **ritmo**
  (`ed:ritmo:v1`); 0 = lo más rápido. El tablero muestra "⏱ X h Y min en la plataforma".
- **Tope por unidad** 90 min (antes 45; migración `cfgV 5`), porque con el ritmo nuevo una unidad tarda más.
- **Nube**: login con más margen (página 90 s, formulario 40 s, entrar 90 s, Home 8 s).
- **Cargador siempre al día** (README opción A y `tools/cargador.user.js` v1.2): pregunta a GitHub el último commit y
  carga el bot de ESE commit (raw por rama podía traer una copia de hasta ~5 min). Si GitHub no responde, usa la rama
  como antes. El cargador de Tampermonkey trae `@updateURL`: desde la v1.2 se actualiza solo.
- Pruebas: las 80 pantallas no cambian; los dos cargadores probados en Chrome (con y sin respuesta de GitHub);
  `probar-nube.sh` con ritmo 5 s. **Solo simulación.**

## v21.13 — tablero en vivo con checks y banco de respuestas por curso (ideas de Hugo, 02/11)
- **Tablero en vivo** (`cloud/tablero.js`, `src/utils/tablero.js`): un issue del repo ("📊 Tablero del bot") con un
  cuadro por cuenta, con su NOMBRE, que se actualiza cada ~3 min: fila de cuadritos `1 · Login → U1 → U2 → …` con
  por dónde va (`🔄 L3 · Test 4/10`), y cada unidad como desplegable con lección por lección, paso por paso y cada
  test (✅/❌/⚠️/⏭️/⬜/🔄). Lo que falló lleva el lugar exacto y el n.º de reporte (el dump de ese momento). También
  en el resumen de la ejecución y en el zip (`tablero.md`). Si el login falla, el cuadro lo dice con el mensaje de ED.
- **Banco de respuestas por curso** (`cloud/banco.js` + job `juntar` en `nube.yml`): lo que cosecha una cuenta lo
  usan las demás del mismo curso desde la ejecución siguiente (entran al test con las respuestas). En la caché
  privada de Actions, nunca en el repo (`banco/` está en `.gitignore`). Lo de cada cuenta manda sobre el banco.
- **Reporte con número fijo** (`#num`): antes el número era la posición en la lista y cambiaba al pasar de 40
  (a Mateo se le perdieron así los primeros fallos). El tablero usa ese número.
- El bot anota en el tablero (`Tablero.anotar/aqui/test`): tareas verificadas, saltadas (regla 4), vistas, cada
  fallo del reporte, el puntaje de cada test y dónde está ahora (con el contador del test).
- Pruebas: `tools/probar-banco-tablero.js` (también en `npm test`), pantallas `tableroOk` y `tableroFalla`,
  `tools/probar-nube.sh` con una API de GitHub falsa (`tools/sitio-prueba/api-falsa.js`) y un banco de ejemplo.
  Las otras 78 pantallas no cambian.
- **Solo simulación.** Falta verlo en GitHub real (permisos `issues: write` del flujo `nube`).

## v21.12 — dumps y explicaciones de Hugo (02/11) + corridas de Roy (cuenta 3) y Mateo (cuenta 2), las dos con v21.8
(Incluye v21.9–v21.11, que todavía no se subieron.)
- **Explore con VIDEO** (U5 L1, U7 L1, U8 L1; Roy y Mateo: `tipo_desconocido`, mcq_default): espera hasta 30 s a que
  aparezca el play grande (`.learning__RAMRButton--play`), lo pulsa verificando y deja correr el video hasta que ED
  marca la tarea (tope 100 s). Hugo: "es solo esperar a que cargue el video y darle play".
- **Explore con TARJETAS de vocabulario** (U8 L6 "Work"): abre una tarjeta y la cierra con la X. Se sabe si está
  abierta por las clases que solo existen así (`.cursor-pointer`, `.d-flex`, `.justify-between`, `_textSeparator`,
  dumps de Hugo); la X se busca entre esos botones (fila "2/10 … X" primero), verificando que se cerró.
- **Juego de memoria** (dump de Hugo): el clic va a la cara visible de la carta (`.memoG__cardSideBack`), no a la
  caja; con DOS cartas abiertas ED marca la tarea ("seleccionar dos cuadritos y ya sale hecho").
- **Interactive speaking** (U9 L4 · 4, U10 L4 · 4, U13 L1 Interact 1): tocar la 1.ª frase y pulsar **Start** cuando se
  habilita (antes solo tocaba la frase). **Branching speaking** (U9 L4 · 6, U10 L4 · 6): Start → esperar el botón de
  grabar → grabar → marcada. HTML real de los dumps.
- **Personalized writing** de corregir el e-mail (U10 L3 · 4): todos los campos traen texto; se agrega una letra al
  1.º y se verifica (antes n = 0). Solo en prácticas: en un test no se toca nada que ya esté lleno.
- **Watch again con imágenes** (U10 L4 · 3): espera hasta 20 s a que carguen y pulsa imagen → caja → opción
  verificando el cambio de clases; si ED no marca, la siguiente. En un test, UNA sola imagen (como antes).
- **Atascos: primero AVANZAR** (`TestSweep.avanzar`): Mateo perdió la UNIDAD 8 entera (atascado en L2 · Explore
  "Read the e-mail", "voy a lo pendiente" lo devolvía al mismo paso y al 3.er atasco abandonaba la unidad: L2–L6,
  la práctica de arrastrar de L6 y su test sin hacer). Igual Roy y Mateo en el test de la lección 1 de U5, U7, U8 y
  U3. Ahora: siguiente paso → siguiente lección; al final de la unidad, una vuelta a lo pendiente; como mucho dos
  vueltas por unidad. El reporte (dump completo) se toma en CADA atasco.
- **Explore/Prepare sin barra de tareas** ("Read the e-mail", "Read the story", "Listen to the recording", "Listen
  to the examples"): si hay un reproductor que aún carga, espera hasta 25 s una vez; con que suene un audio basta
  (tope 20 s; antes hasta 75 s por página).
- **Test que no muestra preguntas** (Mateo, U14 L5 "Modals: Review" y L3): a la 3.ª vez, reporte y recargar la página
  UNA vez por corrida.
- **"Dales más tiempo para cargar"** (Hugo): pantallas no reconocidas con video/tarjetas/imágenes/memoria/speaking
  esperan hasta 25 s (antes 4 s); tarjetas, memoria e imágenes hasta 20 s; video hasta 30 s + 100 s.
- **Curso en el registro y en el resumen** (Roy: Hugo vio "UPB Beginners 1" con 51 % y creyó que se había borrado
  todo; el bot trabajó en "UPB Beginners 2": 88 → 97 %, promedio 100 %). El resumen ya no lista las filas vacías
  de My Progress ("U1 L0").
- Desplegable viejo, variante de Roy ("1:ya_abierta, 2:clic_texto, 3:ninguno✗"): ya lo arreglaba la v21.11; probado
  con su patrón real (`replayLegacyDDLRoy`).
- Pantallas nuevas (15; la v21.8 falla 11 igual que en ED; de las otras 4, `dndTablaU8` ya funcionaba, `exploreLecturaSinTareas`
  mide el tiempo y `textoEnTestNoToca`/`mcqImagenesEnTest` cuidan la nota):
  `exploreVideo`, `exploreTarjetas`, `memoriaDorso`, `speakingFraseStart`, `speakingBranching`, `writingCorregir`,
  `mcqImagenesCargando`, `dndTablaU8`, `exploreLecturaSinTareas`, `exploreAudioTarde`, `completarAvanzaPaso`,
  `replayLegacyDDLRoy`, `testSinPreguntas`, `textoEnTestNoToca`, `mcqImagenesEnTest`. Cambiadas a propósito:
  `completarAlterna` (42 pasos: avanza y a la 2.ª vuelta va al Home), `completarSaltoOtraUnidad` (primero intenta
  avanzar), `mcqImagenes` (ya no cuenta clics sin efecto), `text`/`practiceMemory`/`memoryCorto`/`exploreParlantes`/
  `completarFin` (campos nuevos en el resultado).
- **Solo simulación** (78 pantallas, Chrome real). Falta confirmarlo en ED con la próxima corrida.

## v21.11 — regla permanente de Hugo: TODOS los fallos con estado a/b/c (tabla en docs/handoff.md)
(Incluye v21.9 y v21.10, que no llegaron a subirse.)
- **Reporte = dump completo** (`utils/reporter.js`): controles con atributos, caja de la pregunta, DnD con eventos de
  jQuery, pestañas, barra y tareas, panel izquierdo (`.learning__resourcesArea`), audios/videos, iframes del mismo
  sitio y el ANTES de la acción (`Reporter.marcarAntes()`). Tope ~45 000 caracteres por entrada.
- **Regla 4: 2 fallos por corrida y no se reintenta** (`utils/corrida.js`): tareas (1 si es speaking/memoria/Explore),
  atascos 2 (antes 3), tests 2 reintentos (antes 3, migración `cfgV 4`), contador de reintentos por corrida.
- **Unit Tests** (`core/unit-tests.js`): My Progress → Home → desplegable, verificando; misma política que los tests.
- **Explore** (`exercises/explore.js`): parlantes → segmentos → botones play → audio/video, verificando la tarea.
- **Memoria**: 6 intentos (antes hasta 60), 1 vez por corrida, reporte con dos cartas abiertas.
- **Nube** (`cloud/runner.js`): id de corrida; si la cuenta N es otra persona, se guardan solo las respuestas;
  el resumen de GitHub lleva solo la lista de fallos (el detalle va en `reporte.txt`).
- Mensaje del barrido: ya no dice "no quedan tests < 100" si quedó uno rendido.
- Pantallas nuevas (la v21.8 falla las 15 distintas; las demás iguales): `replayLegacyDDLNouns`, `reporteDump`,
  `exploreParlantes`, `memoryCorto`, `saltaYaFallo`, `unitTestDesdeHome`, `unitTestMyProgress`, `unitTestHomeLista`,
  `unitTestTermina`, `reintentosPorCorrida`. Cambiadas a propósito: `scoreGiveUp` (2 reintentos), `completarAlterna` (2 atascos).
- Docs: regla permanente en `CLAUDE.md` §3.12 y `docs/metodo.md`; sin la ruta de la carpeta de Hugo; comandos sin correo.
- **Solo simulación.**

## v21.10 — 2.ª corrida de Jose (v21.8, modo completar): 91 % → 97 % en 87 min, promedio 100 %
(La v21.9 no llegó a subirse: esta versión la incluye.)
- **Bucle de 40 min en la unidad 12** (`core/dropdowns.js`): atascado en un test ya hecho, "voy a lo pendiente"
  mandaba a "3. Drama" y "4. Family" (ya COMPLETAS) porque otra unidad tenía "Lesson 3: Present Simple: Review" en
  97 %: se comparaba solo el NÚMERO de lección. Ahora número y nombre.
- **Atascos alternados** (`core/sweep.js`): el "mismo lugar 3 veces" contaba solo veces SEGUIDAS; saltando Drama ↔
  Family se reiniciaba siempre. Ahora cuenta las veces de cada lugar.
- **Reporte** (`utils/reporter.js`): en pantallas sin área conocida (los "Step 1: Explore" con `.segment`) se
  guardaba el `<body>` y los 3500 caracteres eran solo el menú de lecciones. Ahora se quitan los menús y se guarda
  hasta 8000: el próximo reporte de esos Explore traerá el ejercicio (probado con el HTML real del reporte).
- Pantallas nuevas con los desplegables REALES de la unidad 12: `completarSaltoOtraUnidad`, `completarAlterna`
  (la v21.8 falla las dos igual que en ED; las otras 51 no cambian).
- **3.ª confirmación** del desplegable viejo: 01:19:57, mismo test, mismo patrón "1 bien, 2 mal, 3 bien, 4 mal".
- **Solo simulación:** todo lo de v21.9 y v21.10. Confirmarlo con el registro de la próxima corrida.

## v21.9 — corrida de Jose (cuenta 2, v21.8): 1 % → 91 % en 1 h 56 min, promedio 100 %, un test en 97 %
- **Desplegable viejo** (`exercises/ddl-legacy.js`): U14 · Lesson 3: Present Simple: Review · Test · 12/15 quedaba
  siempre en 97 %. Patrón real (igual con Nelson en v21.6 y en Nouns · Test 3/4/7/9): "1:clic_texto, 2:ninguno✗,
  3:clic_texto, 4:ninguno✗". Causa: tras ELEGIR en un hueco, ED no abre otra lista hasta un clic FUERA (tras un
  fallo el bot ya hacía ese clic, por eso el hueco siguiente salía bien). Ahora, si nada abre la lista → clic fuera
  y otra vuelta (`fuera+<método>` en el reporte). La teoría v20.10 ("solo con foco") no era la causa en ED.
- **No repetir un test del que ya se rindió** (`core/engine.js`, `TestSweep.rendido()`): "voy a lo pendiente" volvía
  al test de 97 % y lo hacía entero 4 veces más (≈ 10 min y 4 intentos más en ED).
- Pantallas nuevas con el HTML real: `replayLegacyDDL4`, `testRendido` (la v21.8 falla las dos igual que en ED).
- `tools/regresion-chrome.js`: las mismas pantallas en Chrome real para entornos sin npm (da el snapshot exacto).
- **Confirmado en ED:** ED no promedia cada intento (1.os intentos de 10–90 % y promedio 100 %). "Insertar frase" funciona.
- **Solo simulación:** los dos arreglos. Confirmarlos con el registro de la próxima corrida.

## v21.8c (revisión del repo antes de pasarlo a otra IA; el bot NO cambia, sigue siendo v21.8)
- `tools/probar-nube.sh`: apaga la copia falsa de ED al terminar. Antes quedaba prendida y, si la salida se leía
  por una tubería (`| tail`), la terminal se quedaba esperando para siempre (pasó en la revisión: 7 min colgado).
- `.gitignore`: `salida/`, `estado/` y `__pycache__/` (resultados de las pruebas locales; `git add -A` los subía).
- `CLAUDE.md` §4: qué hacer si `npm install` no tiene internet (no afirmar que las pruebas pasaron; mirar el ✓ de
  GitHub), zip sin `salida/`/`estado/`, entrega con la herramienta de archivos que tenga la IA.
- `docs/pendientes.md` marcado como histórico (las prioridades están en `docs/handoff.md`); README y PROMPT-INICIO al día.

## v21.8b (documentación para continuar con otra IA)
- `CLAUDE.md` reescrito (guía maestra), `docs/handoff.md` (estado, conocimiento de ED, hipótesis abiertas, próximos pasos),
  `docs/metodo.md` (cómo diagnosticar, arreglar y probar), `docs/PROMPT-INICIO.md`, skill `.claude/skills/ed-autopilot-dev/`.
- Herramientas: `tools/rescatar-zip.py`, `tools/analizar-registro.py` (detecta atascos por bloques de 10 min),
  `tools/comparar-con.sh` (versión vieja vs nueva), `tools/probar-nube.sh` + `tools/sitio-prueba/` (Chrome real contra copia falsa de ED).

## v21.8 — mapa de My Progress: rehacer SOLO los tests < 100
- Nuevo `core/progress-map.js` (dumps de Hugo del 01/11): al empezar el barrido o "completar", el bot entra a **My Progress**, despliega cada unidad y anota por lección el **Last Test Score** y si está **Terminado** (sin dar ningún test). Guarda el mapa en `ed:progress:v1`.
- **Barrido con mapa:** va directo a cada test < 100 (unidad → lección → test) y solo a esos. Los de 100 no se tocan.
- **Completar con mapa:** entra solo a unidades con realización < 100 % y a la 1.ª lección no terminada. Al final relee My Progress y, si quedan tests < 100, pasa al barrido.
- Un test que ED marca terminado se rehace solo si My Progress dice < 100.
- Resumen de Actions: tests < 100 y lecciones sin terminar según la última lectura de My Progress.
- Sin My Progress disponible, todo funciona como en v21.7.

## v21.7 — arreglos de la corrida de Nelson en la nube (5 h 24 min, unidades 2→14, 59 tests en 100 %)
- **Varios bots a la vez:** en la nube el bot se inyectaba también en los MARCOS (iframes). Ahora en un marco solo se atiende el aviso de ED; el bot completo corre únicamente en la página principal.
- **Aviso "You haven't submitted your test"** (MsgPage.html): Continue si el bot está saliendo (Home/desplegables), Cancel si no. Causó 1,5 h de vueltas Home ↔ página desconocida.
- **Atasco de 2,5 h** en un test sin preguntas visibles (unidad 14): si "lo pendiente" es 3 veces el mismo lugar → se anota (`atascado_en_el_mismo_lugar`) y sigue con la siguiente unidad; tope por unidad 150 → 45 min; no se recarga la pestaña a mitad de un test; el conteo de reintentos sobrevive a las recargas.
- **No rehacer tests terminados** (`retakeDoneTests: false`) y **test exprés apagado** por defecto: el promedio de Nelson bajó de 98 % a 96 % aunque todos los tests terminaron en 100 → los intentos (incluido el envío en blanco) parecen contar.
- **Robot:** "You are already logged in" → pulsa **Login on This Device**; un error en la vigilancia ya no lo corta sin resumen. Probado con Chrome real.
- **Ejercicios:** MCQ con IMÁGENES ("Choose the correct picture"); "Select the place in the text where this sentence best fits" (`.addInText`, por candidatos; si no los halla, el reporte guarda el texto de lectura).
- **Reportes:** incluyen el texto visible de la pantalla y los marcos (iframes).

## v21.6 — arreglos de la 1.ª corrida real en la nube (cuenta de Hugo, 31/10)
Lo que mostraron los zips: 83 % / 94 %, unidades 1–6 "¡Terminado!", pero el bot no hizo trabajo real.
- **ED en español:** las unidades listas dicen "¡Terminado!" (el bot buscaba "Completed") → creía que ninguna estaba hecha.
- **Lista de lecciones del Home:** aparece al PASAR EL MOUSE por la tarjeta (franja "Lecciones"), no con un clic → ahora: mouse encima → franja "Lecciones" → clic, cada uno verificado. Reproducido en prueba (v21.3 fallaba igual que en la nube; v21.6 entra).
- **"Tu sesión no está más activa en tu dispositivo":** el bot la reconoce (solo texto visible), pulsa Aceptar y espera el login sin anotar fallos falsos; el robot revisa cada 10 s y vuelve a entrar (corta tras 6 caídas). Probado con Chrome real.
- **Barrido de tests** tras "completar": revisa TODAS las unidades no revisadas (antes solo las posteriores a la última).
- No se carga en pestañas en blanco (`about:blank`) → sin el fallo falso `barrido_pagina_desconocida`.
- Reintento de test: espera hasta 4 s a que la pregunta aparezca antes de responder (`replay_sin_accion`).

## v21.5 — todo en un solo zip
- El robot guarda TODO su registro en `salida/registro.txt` (usuario y contraseña reemplazados por `***`), junto al reporte, el resumen y las fotos: el artifact `cuenta-N` trae todo lo que pasó.
- Máquina fija `ubuntu-24.04` (GitHub mueve `ubuntu-latest` a Ubuntu 26 y Playwright 1.48 no lo soporta).

## v21.4 — varias cuentas en un solo secret y elegir cuáles correr
- Secret único **`ED_CUENTAS`**: una cuenta por línea (`usuario contraseña Nombre`). Se edita en Settings cuando quieras.
- *Run workflow* → campo **cuentas**: `1` · `2,3` · `todas`. Un job `preparar` (`cloud/cuentas.js`) arma la lista y lanza una máquina por cuenta (matriz dinámica).
- El robot toma su línea del secret, marca usuario y contraseña con `::add-mask::` (tapados en todos los registros) y usa el Nombre en el registro y el resumen.
- Compatibilidad: sin `ED_CUENTAS` se usan `ED_USER_1` / `ED_PASS_1`.

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
