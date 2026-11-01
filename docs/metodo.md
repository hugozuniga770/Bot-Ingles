# Método de trabajo — cómo se diagnostica, se arregla y se prueba (léelo entero)

Este es el método con el que se llevó el bot de v19 a v21.8. Cada paso existe porque saltárselo ya costó caro.

## 0. Mentalidad
- **Eres un detective, no un adivino.** Toda conclusión debe apoyarse en algo concreto: una línea del registro,
  una clase del dump, un pixel de la captura. Si no tienes la evidencia, consíguela (sonda, reporte más rico) o
  escribe código que la recoja la próxima vez.
- **Busca la causa raíz, no el síntoma.** "No abrió la lista" era el síntoma; la causa era "ED abre sola la lista
  del 1.er hueco y las demás se abren con el FOCO, no con clic". Arreglar el síntoma (más clics) no habría servido.
- **Desconfía de tu primera teoría.** Si tu simulación del fallo NO reproduce lo que pasó en ED, la teoría está mal
  (pasó con el desplegable: la primera teoría "la lista ya estaba abierta" no reproducía el fallo; la segunda,
  "solo se abre con foco", lo reprodujo exacto).
- **Lee todo lo que te pasan antes de responder:** cada captura (también lo que se ve al fondo: textos, botones,
  la cajita del bot), cada campo del reporte, el final del registro. Detalles chicos resolvieron casos grandes
  ("¡Terminado!" en una captura reveló que la cuenta está en español).
- **Piensa en el peor caso para Hugo.** Antes de cambiar comportamiento de tests pregúntate: ¿esto puede bajar su
  promedio? ¿puede dejar la cuenta en un estado raro? Si sí, avísalo primero y elige la opción conservadora.
- **Nada infinito.** Todo bucle (reintentos, atascos, páginas desconocidas, relogins) necesita un tope y un
  registro en el reporte. Un bot que da vueltas 2,5 h es peor que uno que se rinde y anota.

## 1. Cuando Hugo te pasa algo: cómo leerlo
| Te pasa | Qué haces |
|---|---|
| **Reporte de fallos** (texto "ED-Autopilot vX — REPORTE DE FALLOS") | Por cada entrada: `motivo`, `kind`, `instruccion`, `resultado` (qué intentó el bot), `clases` (qué hay en pantalla), `html`, `textoVisible`, `marcos`. Pregúntate: ¿qué tipo de pantalla es?, ¿qué esperaba el bot?, ¿qué encontró? |
| **Dump** (`probes/test-dump.js`, JSON con `pregunta.controles/clases/cajaHTML`) | Es la estructura real. Anota selectores exactos y textos. Compara con lo que el código asume. |
| **Captura** | Lee textos, idioma, botones, estados (✓, ✗, colores), la cajita del bot (versión, tipo detectado, "Reporte (N)"). |
| **Zip de la nube** (`cuenta-N`) | Si no abre: `python3 tools/rescatar-zip.py zip carpeta`. Luego `python3 tools/analizar-registro.py registro.txt reporte.txt` y mira fotos (`login-fallido.png`, `ultima.png`, `sesion-cerrada.png`...). |

### Leer un registro de la nube (registro.txt)
1. `analizar-registro.py` te da: duración, cuántas veces se cargó el bot (¿cientos? → recargas en bucle o
   varias instancias), acciones más frecuentes, **bloques de 10 min sin avance** (= atascos), eventos clave y final.
2. Por cada atasco, mira las líneas de ese rango SIN repetidos:
   `awk '/^\[02:4[89]|^\[02:5/' registro.txt | awk '!seen[substr($0,30,120)]++' | head -40`
3. Busca la radiografía del reporte con la misma hora (`hora` en el JSON) → qué había en pantalla.
4. Mira la numeración de pasos `#N`: si se mezclan dos secuencias, hay DOS bots a la vez.
5. El final del registro dice cómo terminó (tope de tiempo, bot terminó, error del robot, sesión).

## 2. Del síntoma a la causa
Preguntas que destraban casi todo:
- ¿Qué tipo detectó el bot (`kind`) y es el correcto? (`mcq_default` = no reconoció nada → ¿pantalla cargando? ¿tipo nuevo?)
- ¿El bot actuó y no pasó nada, o no encontró dónde actuar? (`moves:0`, `marked:0`, "no se abrió la lista")
- ¿Funciona en una parte y no en otra? (1.er hueco sí, 2.º no → algo cambia tras la 1.ª acción)
- ¿El texto que busca existe en ESTE idioma/cuenta? (Completed vs ¡Terminado!)
- ¿Coincide sin mayúsculas pero no exacto? ("Weren't"/"weren't")
- ¿Es un evento que el código no simula? (hover, foco, Tab, teclado; ED a veces ignora el clic sintético)
- ¿Está dentro de un iframe? (MsgPage.html; `marcos` en el reporte)
- ¿Un estado en memoria se pierde con la recarga? (contador de reintentos)
- ¿Hay una ventana/popup encima? (`#confirmModal`, `.popupWrapper`, colorbox)

## 3. Arreglar
1. Localiza el archivo exacto (un tipo = un archivo en `src/exercises/`; navegación en `core/`; tests en `tests/`).
2. Cambio mínimo. Marca `// NUEVO vX.Y` o `// AJUSTADA vX.Y (motivo: reporte tal)` en línea PROPIA.
3. Patrón de acción robusta: probar formas en orden y verificar tras cada una:
   ```js
   for (const [nombre, fn] of intentos) { fn(); if (await waitFor(cond, 700)) { this.metodo = nombre; break; } }
   ```
   y deja en el resultado QUÉ método funcionó (sirve para el próximo reporte).
4. Si no conoces la estructura: busca candidatos, prueba de a uno con verificación, y si falla
   `Reporter.capture('motivo_claro', { lo_que_falta_para_entenderlo })`.
5. Texto: acepta inglés y español; compara exacto primero (`pick`, `exacto`) y luego sin mayúsculas (`norm`).
6. Para editar con Python usa reemplazos con `assert s.count(old) == 1` (falla si el texto no está o está repetido).

## 4. Probar (obligatorio)
1. **Pantalla falsa con el HTML REAL** en `tools/regresion.js` (copia el `html`/`cajaHTML` del reporte o dump;
   `setup:` simula el comportamiento de ED: qué pasa al hacer clic, foco, hover...). Ejemplos: `replayLegacyDDLAuto`
   (lista que solo abre con foco), `completarHomeES` (Home en español, lista por hover), `replayDropCase` (mayúsculas).
2. `bash tools/comparar-con.sh /tmp/viejo.js NombreDePantalla` (viejo: `git show HEAD~1:dist/ed-autopilot.js > /tmp/viejo.js`):
   - la versión vieja debe fallar **igual que en ED** (si no, tu simulación no reproduce el caso → revisa la teoría);
   - la nueva debe resolverlo.
3. `npm test` → todas las demás pantallas iguales. Si cambia una que no tocaste: rompiste algo.
4. Si tocaste `cloud/`: `bash tools/probar-nube.sh` (Chrome real con Playwright contra `tools/sitio-prueba/`;
   requiere `npm install --no-save playwright@1.48.2 && npx playwright install chromium`). Agrega al sitio de prueba
   el escenario nuevo (ya tiene: login con campo trampa, Home en español con lista por hover, sesión cerrada a los
   5 s, popup "already logged in").
5. Errores frecuentes al probar: el servidor local de prueba se cae (vuelve a levantarlo); el sitio de prueba tiene
   el texto de los avisos dentro de un `<script>` (por eso el bot mira solo `innerText` visible); `sh` no entiende
   `$'...'` (usa `bash -c` o `printf`).

## 5. Entregar y explicar
Sigue `CLAUDE.md` §4–§5. En el mensaje a Hugo: causa en lenguaje simple → qué cambiaste → cómo lo probaste
(y qué NO está probado en ED real) → pasos exactos → qué necesitas que te pase después.

## 6. Lecciones aprendidas (no las repitas)
- El bot cargado en **iframes** = varios bots a la vez. Solo corre en `window.top` (bootstrap).
- **Recargar a mitad de un test** perdía la cuenta de intentos → recarga solo fuera de tests; contadores en localStorage.
- **Rehacer tests ya terminados / enviarlos en blanco** pareció bajar el promedio. Conservador: no rehacer salvo < 100.
- **Comentario `//` en la misma línea** que el código siguiente rompió el build dos veces.
- **Textos en español** en algunas cuentas: nunca compares solo contra inglés.
- **Lista de lecciones del Home**: hover, no clic. **Desplegable viejo**: foco, no clic.
- **Atascos**: la misma acción alternada (p. ej. `test_replay` ↔ `completar_salto`) no es "la misma acción
  repetida": por eso el análisis mira bloques de 10 minutos sin avance.
- **GitHub**: registros/artifacts requieren sesión; pide el zip. Secrets ≠ Variables (las Variables se ven).
- Los zips subidos al chat pueden llegar cortados → `rescatar-zip.py`.
