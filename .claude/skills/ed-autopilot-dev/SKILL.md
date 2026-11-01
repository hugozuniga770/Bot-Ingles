---
name: ed-autopilot-dev
description: Continuar el desarrollo de ED-Autopilot (bot de English Discoveries de Hugo, repo hugozuniga770/Bot-Ingles). Usar SIEMPRE que se hable del bot, de English Discoveries/ED, de reportes de fallos del bot, de zips "cuenta-N" de la nube, de GitHub Actions "nube", de dumps (test-dump) o de nuevas versiones vX.Y del bot. Explica cómo preparar el repo, diagnosticar con evidencia, arreglar con cambios mínimos, probar contra el HTML real y entregarle a Hugo.
---

# ED-Autopilot — cómo trabajar (versión condensada; lo completo está en el repo)

## Paso 0 — preparar el entorno (en cada chat nuevo)
```bash
cd /home/claude && git clone https://github.com/hugozuniga770/Bot-Ingles.git && cd Bot-Ingles
npm install            # jsdom para las pruebas
node build.js && npm test
```
Luego LEE, en este orden: `CLAUDE.md` → `docs/handoff.md` → `docs/metodo.md`. No toques código antes.
(Si el repo de GitHub está desactualizado respecto a lo que Hugo tiene, pídele el zip de su carpeta o el último
zip `Bot-Ingles-vX.Y.zip` que le entregaste.)

## El ciclo de trabajo (siempre igual)
1. **Evidencia.** Lee TODO lo que Hugo pasó: reporte (motivo/kind/resultado/clases/html/textoVisible/marcos),
   dumps, capturas (idioma, botones, la cajita del bot), zip de la nube
   (`python3 tools/rescatar-zip.py` si está cortado → `python3 tools/analizar-registro.py registro.txt reporte.txt`).
2. **Causa raíz.** Formula una teoría concreta ("ED abre sola la 1.ª lista; las demás solo con foco").
   Si te falta información para decidir: pide UNA cosa concreta (dump en tal pantalla) o haz que el reporte la
   capture la próxima vez. Nunca adivines selectores a ciegas sin verificación.
3. **Reproducir.** Pantalla falsa en `tools/regresion.js` con el HTML REAL y el comportamiento de ED en `setup`.
   `git show HEAD~1:dist/ed-autopilot.js > /tmp/viejo.js && bash tools/comparar-con.sh /tmp/viejo.js Pantalla`:
   la versión vieja debe fallar IGUAL que en ED. Si no falla igual, tu teoría está mal → vuelve al paso 2.
4. **Arreglar** con el cambio mínimo en el archivo correcto; acciones verificadas (`press(el, cond)`), formas
   alternativas en orden, topes a todo bucle, `Reporter.capture` cuando no se pueda. Comentario `// NUEVO vX.Y`
   en línea propia con el motivo. Inglés Y español en textos; coincidencia exacta antes que sin mayúsculas.
5. **Probar:** `node build.js && npm test` (nada más debe cambiar) + `comparar-con.sh` (vieja falla, nueva no).
   Si tocaste `cloud/`: `bash tools/probar-nube.sh` (Chrome real con Playwright contra la copia falsa de ED).
6. **Entregar:** subir `const V` (src/bootstrap.js) y package.json, CHANGELOG (qué, por qué, qué es solo simulación),
   docs (`docs/handoff.md` siempre al día) → zip sin `.git`/`node_modules` → `/mnt/user-data/outputs/` →
   present_files → explicar a Hugo (español simple: causa, arreglo, prueba, pasos exactos, qué te tiene que pasar).

## Cómo pensar (el estilo que funcionó)
- Detective: cada afirmación apoyada en una línea de registro, una clase del dump o algo visible en la captura.
- Lo que perjudica a Hugo primero y en negrita (p. ej. algo que baje su promedio o lo deje fuera de su cuenta).
- Conservador con tests: no rehacer lo que ya está en 100; nunca envíos en blanco por defecto.
- Nada infinito: todo reintento/bucle con tope + entrada en el reporte.
- Honestidad: distingue "probado en simulación con tu HTML" de "confirmado en ED".
- Seguridad: nunca escribas ni repitas contraseñas; cuentas solo en el secret `ED_CUENTAS`; Secrets ≠ Variables.

## Trampas conocidas (rápido)
iframes → solo `window.top` · recarga a mitad de test · comentario `//` en la misma línea del código ·
"¡Terminado!" vs "Completed" · lista del Home por hover · desplegable viejo por foco · "Weren't"/"weren't" ·
popup "Login on This Device" · aviso "You haven't submitted your test" (MsgPage) · GitHub no muestra registros
sin sesión (pide el zip) · zips del chat pueden llegar cortados.
