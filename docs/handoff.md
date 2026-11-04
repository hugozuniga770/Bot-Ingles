# Handoff — en qué punto exacto quedamos (actualizado: v21.19, 04/11/2026)

## Estado en una frase
La v21.8 se probó en ED real con **Jose** (cuenta 2: 1 % → 97 %), **Roy** (cuenta 3: 88 % → 97 %) y **Mateo**
(cuenta 2: 19 % → 92 % y promedio 62 % → 100 %), siempre con **promedio 100 %** al final. Hugo todavía NO subió v21.9–v21.11: la v21.12 las
incluye y agrega todo lo que Hugo explicó el 02/11 con dumps (video, tarjetas, memoria, speaking interactivo y
ramificado, writing de corregir, Watch again con imágenes) y lo de los zips de Roy y Mateo (unidad 8 abandonada,
atascos tras el test de la lección 1, test sin preguntas). **Todo solo en simulación (78 pantallas).**
**v21.13** suma el tablero en vivo (Issues → "📊 Tablero del bot": cuadro por cuenta con nombre, cuadritos
Login → unidades, unidades desplegables con lección/paso/test) y el banco de respuestas por curso.
**v21.14**: ritmo de persona (pausa ~5 s entre pasos → ~4 h para un curso grande, Hugo: "mínimo 4 h en la
plataforma"), `CFG.paciencia` 1,5 en todas las esperas, y el cargador del README/Tampermonkey trae siempre el último commit.
**v21.15** (6 corridas del 02/11 con v21.14): la causa de casi todo lo que faltó era RECARGAR la página dentro de las
lecciones (ED queda sin cargar; se arregla yendo al Home). Ya no se recarga. Además: tests ya hechos avanzan al instante,
los Unit Tests ocultos no cuentan (no existen en estos cursos), Google Chrome en la nube, reporte completo sin tope.
**v21.16** (6 zips del 02/11 con v21.15 + dumps de Hugo del 03/11): la GUÍA de ED ("Got it!") tapaba la página
(Nore: DnD, True/False, ordenar en tests) — probado con dragula y driver.js reales; Explore con audio; writing tecleado;
Watch again (íconos escondidos); fin de unidad; Explorador que aprende; catálogo por nivel; varios cursos del carrusel
(Hugo: "hazlo todo"); fotos; fiabilidad y diagnóstico (ideas 1–28 de Hugo); nube SIN cola (3 cuentas por máquina, hasta
60 a la vez) y **panel del teléfono** (`panel/`). `ED_CUENTAS` se mantiene (Hugo).
**Lo próximo:** Hugo activa Pages (Settings → Pages → GitHub Actions), configura el panel, corre las cuentas y pasa los zips
(`reporte-completo.json`, `diagnostico.json`, `resumen-para-ia.txt`, `catalogo.json`, `fotos/`).

## Lo último que se hizo
| Versión | Qué | Por qué (evidencia) |
|---|---|---|
| v21.6 | Home en español ("¡Terminado!"), lista de lecciones por *hover*, sesión cerrada por ED | 1.ª corrida real (cuenta de Hugo): no hizo nada útil |
| v21.7 | Bot solo en la página principal (no en iframes), aviso "You haven't submitted your test", "Login on This Device", atascos (mismo lugar 3 veces), no recargar a mitad de test, **no rehacer tests terminados, test exprés apagado**, MCQ con imágenes, "insertar frase" | Corrida de Nelson (zip cortado, rescatado): 2,5 h atascado en un test, 1,5 h en vueltas, no pudo volver a entrar, promedio 98 → 96 % |
| v21.8 | `ProgressMap` lee My Progress → completar entra solo a unidades < 100 %; barrido va directo a los tests < 100 | Dumps de My Progress de Hugo |
| v21.8b / c | Documentación para otra IA + revisión del repo (solo docs y `tools/`; el bot es el mismo v21.8) | Pasar el proyecto a otro chat |
| v21.9 | Desplegable viejo: si ningún método abre la lista → clic fuera y otra vuelta (`fuera+<método>`). No volver a empezar un test del que ya se rindió en esta corrida. `tools/regresion-chrome.js` | Corrida de Jose: test en 97 % hecho 7 veces (≈ 20 min) por los huecos 2 y 4 de la pregunta 12/15 |
| v21.10 | "Voy a lo pendiente" compara número Y nombre de lección; atascos contados por lugar (no solo seguidos); el reporte quita los menús y guarda más HTML | 2.ª corrida de Jose: 40 min saltando Drama ↔ Family (lecciones ya completas) por un 97 % de OTRA unidad; reportes de "Explore" con solo el menú |
| v21.11 | Regla permanente de Hugo: reporte = dump completo (antes/después, panel izquierdo); 2 fallos por corrida y no se reintenta (tests 2 reintentos, atascos 2); Unit Tests; Explore; memoria corta; reintentos por corrida; memoria de la nube por persona | Revisión de Hugo con otra IA: faltaba atender TODOS los fallos |
| v21.12 | Explore con video (play) y con tarjetas (abrir y cerrar con la X); memoria (cara visible, 2 cartas); speaking interactivo (frase + Start) y ramificado (Start → grabar); writing de corregir (una letra); Watch again con imágenes (esperar y verificar); atascos → primero avanzar; test sin preguntas → recargar 1 vez; más tiempo de carga; curso en el resumen | Dumps y explicaciones de Hugo (02/11) + zips de Roy y Mateo (v21.8) |
| v21.13 | Tablero en vivo con checks (issue del repo, un cuadro por cuenta con nombre; unidades desplegables) y banco de respuestas por curso compartido entre cuentas; reporte con número fijo | Ideas de Hugo (02/11): ver avance unidad por unidad y no cosechar dos veces lo mismo |
| v21.14 | Ritmo de persona (pausa entre pasos, input `ritmo`), paciencia 1,5 en todas las esperas, Next 4,5 s, branching 150 s, tope por unidad 90 min, login con más margen; cargador siempre al último commit | Hugo: "mínimo 4 h en la plataforma", "más tiempo a lo frágil", "que el js del README traiga la última versión" |
| v21.15 | Nunca recargar dentro de las lecciones (Home y volver a entrar), test ya hecho → avanzar, Unit Tests ocultos no cuentan, Time on Task en el tablero, Google Chrome en la nube, reporte completo | 6 zips del 02/11 (v21.14): ~150 atascos tras recargar, 22 en tests ya hechos, 14 Unit Tests inexistentes por cuenta |
| v21.19 | Elegir cuentas por las líneas que existen (fin de "fallidas/no encontradas"), aviso de ED_CUENTAS cambiado a mano, 📦 archivo de cuentas, tablero que se limpia solo, 🧳 baúl cifrado en la rama `datos`, sin zoom en el iPhone, logo nuevo | Hugo 04/11: cuentas nuevas "fallidas no encontradas" tras quitar varias y editar el secret a mano; pide archivar y que lo aprendido viva en el proyecto |
| v21.18 | Mantenimiento, espera según el catálogo, modo auditoría, contraseña mala / captcha, relanzar sola la cuenta sin tiempo, comandos en el issue; panel: buscar/filtros/orden, ⋯ por cuenta (modos, historial, ajustes propios, quitar), deshacer, lista revisada, sin internet, ícono, vibraciones, tirar para actualizar, ayuda; CI del panel | Lista de 100 mejoras de Claude (Hugo: todo menos seguridad 82–88 y menos la página de estudio) |
| v21.16 | Guía de ED cerrada en cada paso, Explore con audio, writing tecleado (manos reales en la nube), Watch again, DnD verificado, fin de unidad, Explorador + catálogo por nivel + modo explorar, varios cursos, fotos, fiabilidad/diagnóstico, nube sin cola (lote), panel del teléfono | 6 zips del 02/11 (v21.15), 4 dumps + 3 capturas de Hugo (03/11), sus 100 ideas (1–28 hechas o preparadas) |

## Hipótesis — resueltas con la corrida de Jose (v21.8)
1. **✅ ED NO promedia cada intento: vale el último (o el mejor).** Jose: 1.os intentos en 34, 20, 30, 17, 10, 60, 80,
   88, 90 % y, tras el reintento con respuestas cosechadas, todos en 100 → "Average Test Score" 100 % de principio a
   fin. **Rehacer tests < 100 SUBE el promedio.** Igual se sigue sin rehacer los que están en 100 (si cuenta el
   último, un reintento peor bajaría la nota) y sin envíos en blanco. Lo de Nelson (98 → 96) no se explica con esto (¿algún reintento terminó peor que el anterior?).
2. ✅ El test de la U14 que con Nelson "no mostraba preguntas" ("Nouns and Quantifiers: Review") salió en 100 % con
   Jose sin problemas. Si vuelve a pasar, la radiografía trae `textoVisible` y `marcos`.
3. ✅ "Insertar frase" (`.addInText`) funcionó en ED real (2 veces, `ok: true`, tarea marcada).

## TABLA DE ESTADOS — todos los fallos de los reportes y zips (regla permanente de Hugo)
a = arreglado con prueba (pantalla con HTML real: la v21.8 falla como en ED y la v21.12 no) · b = falta información →
el bot ya la captura en la próxima corrida · c = imposible → explicado y el bot no pierde tiempo ahí.
Todo "a" está probado SOLO en simulación hasta ver el registro de la próxima corrida.

| # | Fallo (dónde lo vimos) | Estado | Qué se hizo (pantalla de prueba) |
|---|---|---|---|
| 1 | Desplegable viejo: huecos 2 y 4 sin abrir → test U14 L3 "Present Simple: Review" en 97 % (Nelson v21.6, Jose ×2) | a | Clic fuera y otra vuelta (`replayLegacyDDL4`, HTML real 12/15) |
| 2 | Mismo bloqueo en "Nouns: This/That/These/Those" Test 3, 4, 7, 9/10 (Nelson) | a | Mismo arreglo (`replayLegacyDDLNouns`, HTML real 3/10) |
| 3 | Test de 97 % rehecho 7 veces (~20 min) | a | No repetir un test rendido en la corrida + 2 reintentos (`testRendido`, `scoreGiveUp`) |
| 4 | Bucle de 40 min en la unidad 12 (Drama ↔ Family, ya completas) | a | Número Y nombre de lección; atascos por lugar; v21.12: avanza y como mucho 2 vueltas (`completarSaltoOtraUnidad`, `completarAlterna`) |
| 5 | Test rendido con 1 solo intento en la corrida siguiente (contador viejo) | a | Reintentos por corrida (`reintentosPorCorrida`) |
| 6 | Reporte de Jose con puntajes y fallos de Nelson (memoria por número de cuenta) | a | La nube detecta otra persona y guarda solo respuestas (probado con el robot real) |
| 7 | Reportes de "Explore" con solo el menú de lecciones (sin el ejercicio) | a | Dump completo: sin menús, panel izquierdo, controles, antes/después (`reporteDump`) |
| 8 | "Explore" con VIDEO sin marcar: U5 L1, U7 L1, U8 L1 (Roy, Mateo: `tipo_desconocido`) — y U3 L1, U3 L4 | a | Esperar el play grande y pulsarlo, dejar correr hasta que ED marque (`exploreVideo`, controles reales). U3 L1/L4: mismo solver; si no son video, dump |
| 9 | "Explore/Prepare" sin barra de tareas donde Next no avanza: U8 L2 "Read the e-mail", U11 L5 "Read the story", U12 L3 "Listen to the recording", U6 L5 "Prepare" (Mateo) | a / b | a: ya no se pierde la unidad (avanza por el desplegable, `completarAvanzaPaso`); espera el reproductor y con un audio basta (`exploreAudioTarde`, `exploreLecturaSinTareas`). b: POR QUÉ Next no avanza ahí → dump completo en cada atasco (barra, botones, panel) |
| 10 | Juego de memoria sin parejas (U9 L1, U10 L1; Roy y Mateo) | a | Clic en la cara visible; con 2 cartas abiertas ED marca (`memoriaDorso`, estructura real del dump) |
| 11 | Unit Tests: el bot nunca entró a ninguno (14 unidades) | b | Función nueva (v21.11): My Progress → Home → desplegable, verificando; dump si no los encuentra. Aún sin corrida con v21.11+ |
| 12 | Personalized writing U10 L3 · 4 sin marcar (n = 0) | a | Una letra en el 1.er campo y verificar (`writingCorregir`, HTML real); en tests no se toca (`textoEnTestNoToca`) |
| 13 | "Watch again" U10 L4 · 3 con imágenes (marked 0) | a | Esperar a que carguen y pulsar verificando (`mcqImagenesCargando`, clases reales); en tests una sola (`mcqImagenesEnTest`) |
| 14 | "Read again" sin reconocer: U9 L5 Tiny Homes 4/4, U10 L5 4/5 | b | Dump completo con la lectura del panel izquierdo |
| 15 | Replay sin acción: "Nouns and Quantifiers: Review" (Nelson), "Present Progressive: Negative", "Past Simple: Regular Verbs" | b | Dump completo con la pregunta antes/después del replay |
| 16 | Página desconocida en el barrido (Nelson) | b | Dump completo (antes solo el menú) |
| 17 | Atascos en "Step 3: Test"/"Let's review" de la lección 1 con algo pendiente → UNIDAD ABANDONADA (U3, U5, U7, U8, U9, U10, U14; Roy, Mateo, Jose) | a | Primero avanzar (siguiente paso/lección), al final una vuelta a lo pendiente (`completarAvanzaPaso`, `completarAlterna`) |
| 18 | Unidad cortada por tiempo (Nelson, 150 min en Modals: Review) | a | Tope 45 min (v21.7) + atascos 2 + regla de 2 fallos |
| 19 | Mensaje "BARRIDO COMPLETO: no quedan tests < 100" con uno en 97 % | a | Ahora nombra los que quedaron < 100 (solo texto del registro) |
| 20 | "Interactive speaking practice" sin marcar (U9 L4 · 4, U10 L4 · 4) | a | Hugo: "tocas en el primer texto y luego Start cuando se habilita" (`speakingFraseStart`, HTML real). Antes estaba como c |
| 20b | "Interact 1" de U13 L1 sin marcar (Mateo) | a | Mismas clases que el de U9 L4 (Start deshabilitado + frases) → mismo arreglo |
| 20c | "Branching speaking practice" sin marcar (U9 L4 · 6, U10 L4 · 6) | a | Hugo: "Start, esperar el botón y grabar" (`speakingBranching`, HTML real). Antes estaba como c |
| 21 | "Insertar frase" (Select the place in the text) | a | Funcionó en ED real (2 de 2). Si falla: dump completo con la lectura |
| 22 | Explore con TARJETAS de vocabulario U8 L6 "Work" (Roy: lección sin terminar) | a | Abrir una tarjeta y cerrarla con la X, verificando (`exploreTarjetas`, clases reales de los dumps abierta/cerrada) |
| 23 | UNIDAD 8 entera sin hacer (Mateo): L2–L6, la práctica de arrastrar de L6 y su test | a | Era el atasco de L2 · Explore (fila 9/17) → ahora avanza; la tabla de arrastrar ya la resuelve (`dndTablaU8`, fichas reales) |
| 24 | Test que no muestra preguntas (Mateo: U14 L5 "Modals: Review" y L3, `replay_sin_accion`) | a / b | A la 3.ª vez: reporte + recargar UNA vez (`testSinPreguntas`). b: si sigue, el dump dice qué hay en la pantalla |
| 25 | Desplegable viejo, variante de Roy (U14 L3 · 12/15: "1:ya_abierta, 2:clic_texto, 3:ninguno✗") | a | Lo arreglaba ya la v21.11 (`fuera+`); probado con su patrón real (`replayLegacyDDLRoy`) |
| 26 | Roy: "fui al Home y me sacó todo" | a (no era un fallo) | El carrusel del Home mostraba OTRO curso (UPB Beginners 1, 51 %); el bot hizo Beginners 2 (88 → 97 %, promedio 100 %). Ahora el registro y el resumen dicen el curso. Pregunta a Hugo: ¿completar también Beginners 1? |
| 27 | Funciones nuevas "cronometradas" (Hugo: "dales más tiempo para cargar") | a | Esperas de 20–30 s para detectar, 100 s de video, 25 s para pantallas que cargan (`mcqImagenesCargando`, `exploreVideo`, `exploreAudioTarde`) |
| 28 | Resumen con filas vacías "U1 L0 ·" en "lecciones sin terminar" | a | Se omiten; el Unit Test sale como "U1 Unit Test" |
| 29 | Commit "v21.10" de Hugo con el bot v21.8 (la otra IA lo notó) | no era fallo | Ese commit solo traía la v21.8c (docs). Por eso Roy y Mateo corrieron v21.8. El commit v21.12 (02:28) quedó idéntico a la versión entregada (✓ verificar #15) |
| 30 | Cuenta 1 de la ejecución nube #8 terminó con error (exit 1) | b | Casi seguro el login. Desde v21.13 el tablero muestra "❌ Login (mensaje de ED)"; falta su zip o la próxima corrida |
| 31 | Reporte que se queda solo con los últimos 40 fallos y cambia los números (Mateo) | a | Número fijo por fallo (`#num`) y el tablero lo usa (`tableroFalla`) |
| 32 | Tras recargar la pestaña, ED deja la página sin cargar (tests sin preguntas, pasos sin tarea): ~150 atascos en 6 cuentas | a | Ya no se recarga; Home y volver a entrar (`atascoPaginaSinCargar`, `testVacioAlHome`). La pérdida de la unidad 8 de Mateo (fila 23) era esto mismo |
| 33 | Test ya hecho: Next no avanza en "Start Test" (22 atascos) | a | Avanza enseguida (`testYaHechoAvanza`) |
| 34 | Unit Tests "sin hacer" en todas las unidades y ~20 min buscándolos | a | La fila viene oculta (ng-hide): no existen; ya no cuentan (`myProgressUnitTestOculto`). La fila 11 queda resuelta así |
| 35 | Speaking interactivo/ramificado en la nube: "Speech Recognition session is being established", video 00:00 | b | Google Chrome en vez de Chromium (códecs y WebRTC); confirmar en la próxima corrida |
| 36 | Nore (High Intermediate 2): tests "Let's review" con ordenar oraciones quedan en 55–84 % (`seq_replay ok:false`) | b | Los dumps están en el reporte; falta revisar el ordenar en tests |
| 37 | Tareas sin marcar sueltas: Explore (Maria 3, Thiago 2), Watch again, DnD de "Read again" (Nore 3), writing | b | Con `reporte-completo.json` ya no se pierde ningún dump |
| 38 | Mateo y Roy trabajaron UPB Beginners 1 (el Home mostraba ese curso) | a | Hugo (03/11): "hazlo todo" → al terminar un curso pasa al siguiente del carrusel (`otroCursoCarrusel`). Las flechas no tienen dump: se prueban candidatas y se verifica el nombre; si no, reporte con el HTML del carrusel |
| 35b | (actualiza 35) Speaking con Google Chrome | a | Confirmado en las corridas con v21.15: 12 interactivos + 9 ramificados marcados |
| 36b | (actualiza 36) Tests "Let's review" de Nore con ordenar (84/75/55 %) | a | Era la guía de ED tapando la página (los 3 reportes la tienen); se cierra en cada paso (`dndReverseGuia`, prueba fiel) |
| 39 | Nore: DnD "Drag Here" a la izquierda (reverseColumn) y tabla True/False de "Career Advisor", "Read again" de "Eco-vacation", "Preparing for branching speaking" (moves 10, nada cae) | a | Guía de ED (driver.js) tapando la página. Prueba fiel con dragula + driver.js REALES: v21.15 = reporte #123; v21.16 marca (`tools/prueba-fiel`, `dndReverseGuia`, `clasificacionGuia`) |
| 40 | Explore de gramática con audio (Step 1) en las 6 cuentas (28 reportes) | a | Rama de audio: cargar → play verificado → sonar hasta marcar (`exploreGramaticaAudio`) |
| 41 | Personalized writing (corregir el e-mail): editados 5 y sin marcar (5 cuentas) | a* | Se teclea (teclado real en la nube). *La simulación supone que ED escucha keydown (lo único que faltaba); confirmar en ED (`writingAriellaTeclado`) |
| 42 | Watch again 2/3 con imágenes: marked 0 (Maria, Luis, Thiago) | a | Íconos ✓/✗ escondidos confundían al bot (`mcqImagenesIconosOcultos`) |
| 43 | Atasco en el último test/puntaje 100 % de la unidad (25 reportes) y review en la última pregunta (Roy, Mateo) | a | `finDeUnidadTestHecho`, `finDeUnidadPuntaje100`, `reviewUltimaSinSalida` |
| 44 | Nore "The Tour Group" Let's review 90 % (DnD del test) | b | El replay de DnD ahora se verifica hueco por hueco y deja `replay_incompleto` con quería/hay |
| 45 | Pedido de Hugo: Explorador que pruebe todo y aprenda; catálogo por nivel | a | `core/explorador.js`, `core/catalogo.js`, modo explorar; viaja en el banco |
| 46 | Pedido de Hugo: 40 cuentas a la vez, agregar sin esperar, control desde el teléfono | a* | `cloud/lote.js` (3 por máquina), sin cola global, reemplazo de cuenta, `panel/`. *Probado con GitHub/ED falsas; falta la 1.ª corrida real |
| 47 | Ideas 82–84 de Hugo (IA de Claude para responder) | c | No hay llave de la API de Claude (Hugo: "no la tengo, ni modo") |
| 48 | v21.16 en ED: Caro 76→100 / 84→100 en 1 h 47; Helena y Melgarejo salud 100 | — | Confirma guía, audio, fin de unidad, DnD verificado en ED real |
| 49 | Replay DnD "mal" con fichas bien puestas (Caro #22–25) | a | Verificación con los mismos huecos / banco por dg_name (`replayVerificaMismoBanco`) |
| 50 | Test con preguntas en otro orden: ficha cosechada no está en el banco (Caro #20, #21) | a | `mappingQueCalza` (`replayPreguntaMovida`) |
| 51 | Helena echada de ED 2 veces (misma persona, otro número de línea en otra corrida) | a* | Liberar por huella + órdenes con run. *Falta verlo en una corrida real |
| 53 | Cuentas nuevas "fallidas / no encontradas" tras quitar varias (Hugo 04/11) | a | Se elige por líneas que existen (v21.18: "todas" corría las borradas y la del final no existía) |
| 54 | ED_CUENTAS cambiado a mano en GitHub y el panel lo pisaba | a | Aviso por la hora del secret + cambiar contraseña desde el panel |
| 55 | Registros de cuentas quitadas siguen en el tablero | a | Limpieza en cada corrida y al archivar; sin tarjetas fantasma |
| 56 | Pedido: archivar cuentas con su contraseña; "todas" sin las archivadas | a* | Línea `archivada …`, pestaña 📦. *Simulación (panel en iPhone emulado) |
| 57 | Pedido: lo aprendido vive en el proyecto, para mucho tiempo | a* | Baúl cifrado en la rama `datos`. *Probado con un repo falso (dos corridas a la vez); falta la 1.ª corrida real |
| 58 | Zoom del iPhone al escribir en el panel | a | Campos a 16 px (comprobado en iPhone emulado) |
| 52 | Lista de 100 mejoras (v21.18): todo menos seguridad 82–88 y la página de estudio | a* | Ver CHANGELOG v21.18. *Simulación (pantallas `mantenimiento`, `auditoriaFin`; panel en iPhone emulado); falta corrida real |

## Lo que NO puede hacer (y por qué) — afecta "Realización", no el promedio de tests
- Speaking que exige DECIR una opción ("elegir la respuesta hablando"): ED reconoce voz y el micrófono simulado no dice
  palabras. (Interactive y Branching speaking SÍ se pueden, según Hugo: ver filas 20, 20b y 20c.)
- Nada más confirmado como imposible: lo demás está "a" o "b" en la tabla.

## Conocimiento de ED confirmado (con dumps/capturas reales)
**URLs:** login `https://ed.engdis.com/upbstacruz#/login` · tras login `#/preHome/true/` o `#/home` ·
lecciones `https://ed.engdis.com/Runtime/learningArea.html?v=5` · My Progress `#/MyProgress/Course/<id>/Unit/`
(el id sale de la clase `BSslide--<id>` del carrusel del Home) · aviso de test sin enviar `Runtime/MsgPage.html?...` (en un iframe).

**Idioma:** depende de la cuenta. Español: "¡Terminado!", "Lecciones", "Continuar", "Prueba", "Realización del
curso", "Promedio de pruebas". Inglés: "Completed!", "Lessons"… Toda comparación de texto debe aceptar ambos.

**Login:** `input[name=userName]`, `input[name=password]`, botón `#submit1` (deshabilitado hasta que ambos valen).
⚠ Hay un `input[name=foilautofill]` escondido (trampa) que NO se toca. Si la sesión anterior sigue abierta:
popup `#confirmModal` "You are already logged in to English Discoveries" → botón **"Login on This Device"**.
Si la cuenta se abre en otro lugar: pantalla "Tu sesión no está más activa en tu dispositivo" → Aceptar → login.

**Home:** tarjetas `.home__unitW--notLocked` (`.home__detailsNumber`, `.home__detailsTitle`; las hechas dicen
"¡Terminado!"/"Completed!"). Pulsar la tarjeta NO entra: la lista de lecciones (`.home__courseListItem` →
`.home__courseListItemLink`, `_Number`, `_Name`, `_Progress`) aparece al **pasar el mouse** (franja "Lecciones").
Widgets: `.home__studentWidgetCompletion` / `#home__studentWidgetCompletionData`, `.home__studentWidgetTestScores` /
`#home__studentWidgetTestScoresData`. Botón "Continuar": `.carouselStartBtnW a`.

**My Progress:** `.myProgress__unitW` (`.myProgress__unitTitle` "Unit 1", `.myProgress__unitName`,
`.myProgress__unitCompletionData` "100%", bloqueada `.myProgress__unitHeader--locked`). Se despliega pulsando
`.myProgress__unitHeader(IW)`. Lecciones `.myProgress__unitLesson`: `_number`, `_name`, `_testScore`
("100%" | "No test"), `_statusLabel` ("Terminado"), pasos `_step` (hecho: `_stepProgressIW--done`).

**Área de lecciones:** título lección `.learning__dropDownListTitleW--lessons`, paso `--steps`, unidad
`.learning__dropDownList_unitName` ("Unit 8: Meeting People"). Items de desplegable `.learning__dropDownList_item`
(`--current`), progreso `.progressBar__progress--done` + tooltip "Terminado". Next `a.tasksBtnext.learning__nextItemLink`,
atrás `a.tasksBtprev.learning__prevItemLink`, Submit `a.learning__submitTestLink`, tareas `.learning__tasksNav_task(--done/--current)`.
Tests: Start `.btnStartTest`; pestañas review "Tu respuesta"/"Respuesta correcta" en `div.testResultBtnsW`.

**Tipos de ejercicio:** ver `docs/ejercicios.md`. Los más delicados: desplegable viejo (`span[id] > .questionText`
+ `.optionsWrapper`; tras ELEGIR en un hueco ED no abre otra lista hasta un clic FUERA, v21.9), DnD de huecos
(`span.droptarget` + `.wordBankTile`; en "Correct Answer" el hueco puede traer solo `ans="<data-id>"`), fichas que
difieren solo en mayúsculas ("Weren't"/"weren't": siempre coincidencia EXACTA primero, `pick()`).

**Confirmado el 02/11 (dumps y capturas de Hugo):**
- *Explore con video:* `.learning__RAMediaResourceW--html5Video` con botón grande `.learning__RAMRButton--play` (en
  `.learning__RAMROverlayW`) y controles `#video-controls` (`.layout__mediaPlayPause--play`). Darle play basta.
- *Tarjetas de vocabulario:* `.learning__vocabularyCards_card` (10, grilla de 3) → `_cardImageWrapper`. Abierta
  ("2/10") aparecen `.cursor-pointer`, `.d-flex`, `.justify-between`, `.mb-xs`, `.mb-xl`, `_textSeparator`; cerrada no
  existen. OJO: el `<body>` trae `learning__body--vocabularyCards` y `--resourcesAreaFull` SIEMPRE.
- *Memoria:* `.memoG__card > .memoG__cardIW > .memoG__cardSides > .memoG__cardSideBack / _cardSideFront`; dos
  cartas abiertas y ED marca la tarea.
- *Interactive speaking:* flechas `.chooseCaracterArrow`, Start `.continueWrapper.disable > a.button.continue`, frases
  `.recordingPanelSentence(Text)`: tocar la 1.ª frase habilita Start. *Branching:* `.answersWrapper.interact2`, Start,
  luego `.RecordButtonWrapper(.disable) > a.panelButton.speakIcon` (grabar) → marcada.
- *Writing de corregir:* `.answersWrapper.writingEditFrame.OpenEndedQ` con `<input type=text>` YA llenos (las palabras
  con error) dentro de `.segment`.
- *Watch again con imágenes:* `.prMCQ__main--ansImages` → `.prMCQ__answers > .multiRadioWrapper > img.prMCQ__answerImage`;
  al elegir: `selection--x` + `prMCQ__answerImage--incorrect` (o `correct`).
- *Arrastrar a la tabla* (U8 L6 · 2): `.prMT_T2T__main`, banco dragula `.prMT_T2T__wordsBankWrapper .dndZone` con
  `.dnditem.draggable[ans_id]`; columnas B `.prMT_T2T__regContainer`.
- *Home con varios cursos:* el carrusel muestra UN curso a la vez (Roy: Beginners 1 y Beginners 2); los widgets son
  del curso que se ve. Nombre en `.learning__dropDownList_courseName` dentro de las lecciones.

## Decisiones de Hugo vigentes
- Objetivo: 100 % realización y 100 % promedio. Tests sin 100 tras `maxTestAttempts` (2, regla 4): en barrido/completar
  se anota y se sigue; con el bot manual se detiene y avisa (`stopIfNot100`).
- **Regla permanente (01/11):** `CLAUDE.md` §3.12 — todos los fallos con estado a/b/c y tabla; reporte = dump completo
  (Hugo no hace dumps); intentar con lo que se sabe; 2 fallos por corrida y basta; zip con lista de archivos cambiados;
  comandos solo `git add -A` / `git commit` / `git push` (sin correo).
- Unit Tests: no rehacer los de 100; rehacer los < 100 según My Progress (en `completar` también los no hechos).
- Prácticas: basta UNA acción si ED ya marca la tarea (`practiceOneAction`).
- Ritmo: una persona trabaja mínimo ~4 h en la plataforma → el bot va a ritmo de persona (`pausaPaso` 5 s;
  en la nube, input `ritmo`). No se sabe todavía CÓMO cuenta ED ese tiempo (¿sesión abierta o tiempo en lecciones?).
- Nube: modo por defecto `completar`; cuentas en el secret `ED_CUENTAS` (una por línea: `usuario contraseña Nombre`),
  campo `cuentas` = `1` · `2,3` · `todas`. Mientras corre, nadie debe entrar a esa cuenta.

## Próximos pasos sugeridos (en orden)
0. (v21.16) Primera corrida real: mirar en el zip `diagnostico.json` (salud, grupos 🆕), `catalogo.json` (tipos de
   pantalla del nivel), `aprendido.json` (qué marcó el Explorador), `fotos/`, y en el registro `🪧 Guía cerrada`,
   `🎧 [Explore] Audio`, `🔭 [Explorador]`, `[lote]`. Si el writing sigue sin marcar, el reporte trae `como: real|simulado`.
   Ideas de Hugo 29–78 todavía sin revisar (él pidió ir de 20 en 20; 79–100 no).
0. Ver el tablero en vivo (Issues → "📊 Tablero del bot") durante la primera corrida con v21.13 y el log
   `📚 Banco de ...` (¿leyó el curso? ¿cuántos tests trajo?).
1. Zip de la corrida con v21.12 (`completar`) → `rescatar-zip.py` si viene cortado → `analizar-registro.py`.
   Revisar CADA fila de la tabla: `explore` con `intentos` (`play:`, `tarjeta1`, `cerrar:`), `memory_one_action`
   (`forma`), `branching_speaking`, `frase+start`, `editados`, `completar_avance` (¿llegó a U8 L6?), `test_sin_preguntas`.
2. Con los dumps de cada atasco: por qué Next no avanza en las lecturas Explore sin tareas (fila 9).
3. Respuesta de Hugo sobre Beginners 1 (fila 26): si hay que hacerlo, cambiar de curso con las flechas del carrusel.
4. Varias cuentas: ir de a 2–3 (ED podría notar muchas sesiones desde servidores de GitHub).

## Reconectar git (SOLO si la terminal dice "not a git repository"; normalmente bastan git add -A / commit / push)
```powershell
git config --global user.name "TU NOMBRE"          # el de siempre (Hugo lo tiene configurado)
git config --global user.email "TU CORREO DE GITHUB"
git init -b main
git remote add origin https://github.com/hugozuniga770/Bot-Ingles.git
git fetch origin
git reset --soft origin/main
git add -A
git commit -m "vX.Y"
git push origin main
```

## Cosas que GitHub no deja ver sin sesión
Los registros de Actions, los artifacts y los resúmenes requieren iniciar sesión: no los puedes leer tú.
Pídele a Hugo el zip **cuenta-N** (Actions → nube → la ejecución → Artifacts). La API pública de GitHub suele
dar "rate limit exceeded"; la página web `github.com/hugozuniga770/Bot-Ingles/actions` sí muestra el estado general.
