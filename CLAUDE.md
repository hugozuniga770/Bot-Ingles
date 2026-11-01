# CLAUDE.md — guía maestra del proyecto (léela COMPLETA antes de tocar nada)

> Para cualquier IA (Claude, Claude Code u otra) que continúe este proyecto. Después de esto lee, en orden:
> `docs/handoff.md` (en qué punto exacto quedamos) → `docs/metodo.md` (cómo se diagnostica y se arregla) →
> `docs/ejercicios.md`, `docs/arquitectura.md`, `docs/nube.md` según la tarea. `CHANGELOG.md` cuenta por qué
> existe cada cosa (cada entrada nombra el reporte o captura que la motivó).

## 1. Qué es esto

**ED-Autopilot** es un bot en JavaScript que resuelve **English Discoveries** (plataforma de Edusoft que usa la
UPB, Santa Cruz, Bolivia). Corre DENTRO de la página de ED (consola del navegador, Tampermonkey o un Chrome en la
nube) y hace prácticas, tests y navegación sola. El objetivo del dueño: **100 % de "Realización del curso" y 100 %
de "Promedio de pruebas"** en cada cuenta.

- **Dueño:** Hugo (GitHub `hugozuniga770`, repo público `hugozuniga770/Bot-Ingles`). No es programador:
  escribe en español informal, rápido y con errores de tipeo. Usa Windows, VS Code y PowerShell. Su carpeta
  local es `C:\Users\sebas\OneDrive\Documentos\Bots\Bot-Ingles` (ya conectada a git).
- **Cómo prueba Hugo:** (1) consola/Tampermonkey en su PC, (2) **GitHub Actions** ("nube"), que corre el bot en
  un Chrome sin pantalla con una o varias cuentas y le deja un zip con todo lo que pasó.
- **Tú no puedes ver ED.** Todo lo que sabes de ED viene de dumps, capturas, reportes y registros que Hugo te pasa.

## 2. Mapa del repo

```
src/                      código fuente (NO hay import/export; build.js los pega en orden en un IIFE)
  bootstrap.js            versión (const V) + guarda: en un iframe NO corre el bot (solo atiende un aviso)
  core/config.js          CFG (configuración guardada en localStorage), claves K_*, expresiones RE_*
  core/navigation.js      NavigationManager: Next, tareas, contador "x / y", etiquetas de lección/paso
  core/dropdowns.js       DropdownNav: desplegables de lección/paso, ir a lo pendiente
  core/engine.js          MainEngine.step(): UN paso del bot. detectKind() → runKind() → solver
  core/progress-map.js    ProgressMap: lee "My Progress" (Last Test Score / Terminado por lección)
  core/sweep.js           TestSweep: modos "completar" (todo el curso) y "barrido" (tests < 100), Home
  utils/                  dom (q, qa, qv, vis, txt, norm, pick/exacto), drag, press, reporter, fake-mic...
  exercises/              un archivo por tipo de ejercicio (class XSolver { static ... })
  exercises/index.js      mixStatics(...) une todos los solvers en PracticeSolver
  tests/test-manager.js   tests: puntaje, review, cosecha de respuestas, reintento (replay)
  ui/                     console-api (window.__ed), hud (cajita), atajos
dist/ed-autopilot.js      GENERADO con `node build.js` (nunca editar a mano). Es lo que se carga en ED.
cloud/runner.js           robot de la nube (Playwright): login, inyecta el bot, vigila, guarda zip y resumen
cloud/cuentas.js          lee las cuentas del secret ED_CUENTAS y elige cuáles correr
.github/workflows/        verificar.yml (build + pruebas en cada push) · nube.yml (correr el bot)
tools/regresion.js        ~49 pantallas falsas (jsdom) → snapshot del comportamiento. `npm test`
tools/comparar-con.sh     corre las pantallas con OTRO bot (la versión vieja) y muestra diferencias
tools/probar-nube.sh      prueba cloud/runner.js con Chrome real contra tools/sitio-prueba (copia falsa de ED)
tools/analizar-registro.py  resume el registro.txt de una corrida en la nube (detecta atascos)
tools/rescatar-zip.py     recupera archivos de un zip cortado
tools/cargador.user.js    script de Tampermonkey (carga el bot en cada página de ED)
probes/                   sondas para pedirle a Hugo radiografías (test-dump.js es la principal)
legacy/                   versiones viejas (v17.x tienen ideas de navegación aún útiles)
docs/                     handoff, método, ejercicios, arquitectura, nube, pendientes
```

## 3. Reglas (no negociables)

1. **Cambios mínimos y localizados.** Nunca refactorizar, renombrar ni "limpiar" código que funciona. El historial
   del bot es que cada "mejora grande" rompió cosas. Un problema → el menor cambio que lo resuelve.
2. **Nunca editar `dist/` a mano.** `node build.js` lo genera y además verifica la sintaxis.
3. **Zonas congeladas** (solo con pedido explícito): `src/exercises/writing.js`; `TestManager.isScore()`,
   `isReview()` y la rama de puntaje/review en `MainEngine.step()`; `utils/drag.js`; las claves de localStorage
   (cambiarlas borra lo cosechado).
4. **Diagnóstico antes que suposición.** Si no conoces el DOM real, NO adivines a ciegas: pide un dump
   (`probes/test-dump.js`) o haz que el reporte capture lo que falta. Si igual hay que avanzar sin dump, el código
   debe probar candidatos de a uno, VERIFICAR cada intento y dejar en el reporte lo necesario para afinarlo.
5. **Toda acción se verifica.** Nada de "hice clic, listo": después de cada acción se comprueba el efecto
   (`press(el, () => condición, ms)`), y si falla se prueba la siguiente forma (clic → foco → mouse → jQuery → teclado).
6. **Antes de entregar:** `node build.js && npm test`. Si cambió una pantalla a propósito: `npm test -- --actualizar`
   y explicar cuál y por qué. Si cambió algo que no esperabas: rompiste algo → corregir.
7. **Cada arreglo nace de evidencia y se prueba contra ella:** pantalla falsa en `tools/regresion.js` con el HTML
   REAL del reporte/dump → `tools/comparar-con.sh` muestra que la versión vieja falla IGUAL que en ED y la nueva
   no → las demás pantallas no cambian. Si tu simulación no reproduce el fallo real, tu teoría está mal: búscala de nuevo.
8. **Versión:** `src/bootstrap.js` (`const V`) y `package.json`. Súbela en cada entrega y anota en `CHANGELOG.md`
   qué se arregló, qué reporte lo motivó y qué está probado solo en simulación.
9. **Comentarios en español**, con `NUEVO vX.Y` / `AJUSTADA vX.Y` y el porqué (qué reporte o captura lo motivó).
10. **Un comentario `//` jamás en la misma línea que código que sigue** (ya rompió el build dos veces: el
    comentario se "come" el resto de la línea). Con Python+replace, revisa el resultado.
11. **Seguridad:** nunca escribas contraseñas en código, chat ni registros. Cuentas solo en el secret `ED_CUENTAS`.
    Si Hugo pega contraseñas o las pone en *Variables* (texto visible), avísale y recomiéndale cambiarlas.
    No repitas contraseñas que aparezcan en capturas.

## 4. Cómo se entrega un cambio a Hugo

1. `node build.js && npm test` (y `bash tools/comparar-con.sh <viejo.js>` para el arreglo).
2. Subir versión + CHANGELOG + docs tocadas.
3. Zip: `cd .. && zip -qr Bot-Ingles-vX.Y.zip Bot-Ingles -x "Bot-Ingles/.git/*" -x "Bot-Ingles/node_modules/*"`
   → copiarlo a `/mnt/user-data/outputs/` y presentarlo.
4. Decirle exactamente: "descomprime encima de tu carpeta" y luego, en la terminal de VS Code:
   ```powershell
   git add -A
   git commit -m "vX.Y"
   git push origin main
   ```
   (Si dice `not a git repository`, la carpeta perdió `.git`: ver `docs/handoff.md` → "Reconectar git".)
5. Con Tampermonkey (`tools/cargador.user.js`) o la nube, el bot nuevo se toma solo de GitHub tras el push.

## 5. Cómo hablarle a Hugo

- Español, claro, sin jerga. Primero el resultado ("ya está", "encontré la causa"), después el detalle.
- Explica la CAUSA en una frase que él entienda ("ED en tu cuenta está en español y el bot buscaba 'Completed'").
- Pasos numerados y comandos exactos para copiar. Dile qué NO hacer (p. ej. "no entres a la cuenta mientras corre").
- Sé honesto con lo no probado: "probado en simulación con tu HTML real, falta confirmarlo en ED".
- Pídele solo lo que realmente necesitas, una cosa concreta, diciendo dónde hacer clic.
- Si algo puede perjudicarlo (p. ej. bajar su promedio), dilo PRIMERO y en negrita.
- Cuentas de otras personas: que los dueños sepan y estén de acuerdo (el bot hace sus tests en su nombre).
