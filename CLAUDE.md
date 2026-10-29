# CLAUDE.md — reglas para trabajar en este repo

Lee esto antes de tocar nada. El dueño (Hugo) valida cada cambio en English Discoveries real; tú no puedes verlo. El historial de este bot es: cada "mejora grande" rompió cosas que ya funcionaban. Estas reglas existen para que no vuelva a pasar.

## Reglas

1. **Nunca refactorizar.** No renombrar, no reordenar, no "limpiar" código que funciona. Solo cambios mínimos y localizados.
2. **Un tipo de ejercicio por cambio.** Si arreglas el DnD, solo tocas `src/exercises/dnd.js` (y, si hace falta, la parte DnD de `src/tests/test-manager.js`). Nada más en el mismo commit.
3. **Nunca editar `dist/` a mano.** Se genera con `node build.js`.
4. **Zonas congeladas** (no tocar salvo pedido explícito):
   - `src/exercises/writing.js` (Writing + AI Feedback).
   - `TestManager.isScore()`, `TestManager.isReview()` y la rama de Score/entrada a Review en `MainEngine.step()`.
   - `utils/drag.js` (`drag`, `fire`, `dropPoint`): idéntico desde v17.
   - Las claves de `localStorage` en `core/config.js` (cambiarlas borra lo cosechado).
5. **Verificar antes de declarar éxito:** `node build.js && npm test`. Si `npm test` falla y el cambio era intencional, corre `npm test -- --actualizar` y explica en el commit qué pantallas cambiaron. Si falla y NO era intencional, rompiste algo: deshaz.
6. **Diagnóstico antes que suposición.** Si no sabes cómo es el DOM real, no adivines: pide `__ed.inspect()` o una sonda de `probes/` y espera la salida.
7. **Versión:** solo en `src/bootstrap.js` (`const V`). Súbela en cada cambio y anota en `CHANGELOG.md` qué tipo cambió y si ya está validado en ED.
8. **Comentarios en español.** Cada función nueva lleva un bloque `PARA QUÉ:` como las existentes.
9. **Funciones de versiones viejas:** están en `legacy/`. La lista de qué falta y de dónde sale está en `docs/pendientes.md`. Se portan de a una.

## Cómo está armado

- No hay `import`/`export`: `build.js` pega los archivos de `src/` en el orden de la lista `ORDEN`, dentro de un solo `(() => { ... })()`. Todo lo definido arriba es visible abajo.
- Cada tipo de ejercicio es `class XSolver { static ... }` en `src/exercises/`. `exercises/index.js` los une en `PracticeSolver` (si dos archivos repiten un nombre de método, el bot no arranca, a propósito).
- `MainEngine.detectKind()` decide el tipo; `runKind()` llama al solver.
- Tipo nuevo: crear `src/exercises/x.js`, añadirlo en `ORDEN` (antes de `exercises/index.js`), en `mixStatics(...)`, en `detectKind()`/`runKind()`, en `tools/regresion.js` (una pantalla falsa) y en `docs/ejercicios.md`.
