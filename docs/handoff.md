# Handoff — en qué punto exacto quedamos (actualizado: v21.8, 01/11/2026)

## Estado en una frase
El bot ya completa cursos casi solo en la nube (corrida real de 5 h 24 min: unidades 2→14, 59 tests en 100 %).
La v21.8 añade el **mapa de My Progress** para rehacer SOLO los tests < 100. **La v21.8 todavía no se probó en
ED real:** lo próximo es que Hugo la suba, corra la nube con 1 cuenta en modo `completar` y te pase el zip.

## Lo último que se hizo (v21.6 → v21.8)
| Versión | Qué | Por qué (evidencia) |
|---|---|---|
| v21.6 | Home en español ("¡Terminado!"), lista de lecciones por *hover*, sesión cerrada por ED | 1.ª corrida real (cuenta de Hugo): no hizo nada útil |
| v21.7 | Bot solo en la página principal (no en iframes), aviso "You haven't submitted your test", "Login on This Device", atascos (mismo lugar 3 veces), no recargar a mitad de test, **no rehacer tests terminados, test exprés apagado**, MCQ con imágenes, "insertar frase" | Corrida de Nelson (zip cortado, rescatado): 2,5 h atascado en un test, 1,5 h en vueltas, no pudo volver a entrar, promedio 98 → 96 % |
| v21.8 | `ProgressMap` lee My Progress → completar entra solo a unidades < 100 %; barrido va directo a los tests < 100 | Dumps de My Progress de Hugo |

## Hipótesis abiertas (confírmalas con la próxima corrida)
1. **¿Cada intento de test cuenta en el promedio de ED?** Evidencia: Nelson 98 % → 96 % mientras el bot rehacía
   tests (con envío en blanco) que terminaban en 100. Por eso `testExpress: false` y `retakeDoneTests: false`.
   Si en la corrida con v21.8 el promedio SUBE al rehacer tests < 100, la hipótesis "solo cuenta el último" gana.
   Mira "Average Test Score" al inicio y al final del registro/resumen.
2. **El test de la unidad 14 de Nelson ("Nouns and Quantifiers: Review", Beginners 2) no mostraba preguntas**
   (`test_replay idx:null`). Causa real desconocida (¿preguntas dentro de un iframe? ¿otra plantilla?). La v21.7
   lo abandona a la 3.ª vez y la radiografía ahora trae `textoVisible` y `marcos`: con el próximo reporte se sabrá.
3. **"Select the place in the text where this sentence best fits"** (`.addInText`): los lugares están en el texto
   de lectura (izquierda) y su HTML no se conoce. La v21.7 prueba candidatos; si no los encuentra, el reporte
   `insertar_frase_sin_lugares` trae el HTML del texto → con eso se deja exacto.

## Lo que NO puede hacer (y por qué) — afecta "Realización", no el promedio de tests
- Speaking que exige hablar (Interactive/Branching speaking, "elegir la respuesta hablando"): ED reconoce voz.
  Hay micrófono simulado (`utils/fake-mic.js`, en la nube Chrome usa uno falso de fábrica) y un experimento de
  "eco" (reproducir el audio de la opción correcta hacia el micrófono). No confirmado que ED lo acepte.
- Juego de memoria (`.memoG__card`): 67 intentos sin parejas; falta saber cómo se emparejan (dump con 2 cartas abiertas).
- "Personalized writing" de editar un e-mail (`.writingEditFrame.OpenEndedQ`): estructura desconocida.

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
+ `.optionsWrapper`; ED abre sola la lista del 1.er hueco, las demás se abren con el FOCO), DnD de huecos
(`span.droptarget` + `.wordBankTile`; en "Correct Answer" el hueco puede traer solo `ans="<data-id>"`), fichas que
difieren solo en mayúsculas ("Weren't"/"weren't": siempre coincidencia EXACTA primero, `pick()`).

## Decisiones de Hugo vigentes
- Objetivo: 100 % realización y 100 % promedio. Tests sin 100 tras `maxTestAttempts` (3): en barrido/completar
  se anota y se sigue; con el bot manual se detiene y avisa (`stopIfNot100`).
- Prácticas: basta UNA acción si ED ya marca la tarea (`practiceOneAction`).
- Nube: modo por defecto `completar`; cuentas en el secret `ED_CUENTAS` (una por línea: `usuario contraseña Nombre`),
  campo `cuentas` = `1` · `2,3` · `todas`. Mientras corre, nadie debe entrar a esa cuenta.

## Próximos pasos sugeridos (en orden)
1. Recibir el zip de la corrida con v21.8 → `python3 tools/rescatar-zip.py` si viene cortado →
   `python3 tools/analizar-registro.py registro.txt reporte.txt` → arreglar según `docs/metodo.md`.
2. Confirmar la hipótesis del promedio (punto 1 arriba) y ajustar `retakeDoneTests`/barrido si hace falta.
3. Con los reportes nuevos (traen `textoVisible`/`marcos`): test de la unidad 14 e "insertar frase".
4. Juego de memoria y writing de e-mail: pedir dump (`probes/test-dump.js`) en esas pantallas.
5. Varias cuentas: ir de a 2–3 (ED podría notar muchas sesiones desde servidores de GitHub).

## Reconectar git (si la terminal dice "not a git repository")
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
