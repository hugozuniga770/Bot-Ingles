# Bot-Ingles · ED-Autopilot

Bot de consola para **English Discoveries** (UPB Santa Cruz). Resuelve las prácticas de cada lección y, en los tests, envía un primer intento, cosecha las respuestas correctas del *Review* y repite el test con ellas.

**Versión actual: v20.4** — v19.7 dividida en módulos + funciones recuperadas de v17 (ver `CHANGELOG.md`).

---

## Cómo usarlo

### Opción A — cargar desde GitHub (una línea)

En la pestaña de English Discoveries, abre la consola (**F12 → Console**) y pega:

```js
fetch('https://raw.githubusercontent.com/hugozuniga770/Bot-Ingles/main/dist/ed-autopilot.js?t='+Date.now()).then(r=>r.text()).then(eval)
```

Luego `__ed.auto()` para arrancar (o el botón **Iniciar** de la cajita flotante).

- El repo tiene que ser **público** para que esto funcione.
- Tras un `git push`, GitHub puede tardar hasta ~5 min en servir la versión nueva. Confirma la versión en la cajita (`ED v20.4 OOP`).
- La primera vez Chrome pide escribir `allow pasting` en la consola.

### Opción B — pegar el archivo a mano

Abre [`dist/ed-autopilot.js`](dist/ed-autopilot.js) → botón **Copy raw file** → pégalo en la consola → `__ed.auto()`.

> Siempre **recarga la página (F5)** antes de cargar una versión nueva.

### Comandos

| Comando | Para qué |
|---|---|
| `__ed.auto()` / `__ed.stop()` | Arrancar / pausar |
| `__ed.step()` | Un solo paso (resuelve y pulsa Next) |
| `__ed.solve()` | **Resuelve solo esta pantalla, sin Next** — para probar un tipo de ejercicio |
| `__ed.solve('dnd')` | Fuerza un tipo concreto |
| `__ed.dragTest()` | Prueba UN arrastre y dice si funcionó |
| `__ed.inspect()` | Qué ve el bot en esta pantalla (pásalo si algo falla) |
| `__ed.cfg({...})` | Cambiar configuración (se guarda) |
| `__ed.answers()` / `__ed.testAnswers()` | Respuestas cosechadas |
| `__ed.sweep()` | Ir a lo primero pendiente de la unidad y arrancar |
| `__ed.reopenTest()` | Volver al test (tras el review) |
| `__ed.copyAnswers()` / `export()` | Respaldar respuestas |
| **Alt+E** | Iniciar / parar |
| `__ed.help()` | Lista de comandos |

---

## Estructura

```
src/                     ← AQUÍ se edita
  bootstrap.js             versión (único lugar) + limpieza de instalaciones previas
  core/config.js           CFG, claves de localStorage, regex
  core/storage.js          StorageManager
  core/navigation.js       NavigationManager (tareas, Next, popups)
  core/dropdowns.js        DropdownNav (desplegables de lección/step, de v17)
  core/engine.js           MainEngine: detectKind() → runKind() → step()
  utils/dom.js             q, qa, vis, click, waitFor...
  utils/logger.js          log, warn, errLog
  utils/drag.js            motor de arrastre + dndModel (igual desde v17)
  utils/scroll.js          revealInBox: scroll dentro de cajas con barra propia
  utils/dnd-model.js       testDndModel: banco/huecos en tests (clasificación)
  exercises/               UN archivo por tipo de ejercicio
    writing.js  select-text.js  sequence.js  dnd.js  mcq.js
    fitb.js  text.js  media.js  speaking.js
    index.js               los une en PracticeSolver
  tests/test-manager.js    tests: score, review (cosecha), replay
  ui/console-api.js        window.__ed
  ui/hud.js                cajita flotante
  ui/shortcuts.js          atajo Alt+E
  main.js                  arranque
dist/ed-autopilot.js     ← GENERADO por build.js. No se edita a mano.
probes/                  scripts de diagnóstico de solo lectura
tools/regresion.js       prueba "¿rompí algo sin querer?"
legacy/                  versiones viejas (solo referencia, para rescatar funciones)
docs/                    arquitectura, estado de cada ejercicio, pendientes
```

## Desarrollo

```bash
node build.js        # genera dist/ed-autopilot.js (sin dependencias)
npm install          # solo la primera vez, para las pruebas (jsdom)
npm test             # ¿cambió el comportamiento de algún tipo?
```

Flujo de un cambio: editar **un** archivo de `src/` → `node build.js` → `npm test` → probar en ED real → commit de `src/` **y** `dist/` juntos. GitHub Actions rechaza el push si `dist/` no está al día o si las pruebas fallan.

Reglas completas en [`CLAUDE.md`](CLAUDE.md). Documentación en [`docs/`](docs/).
