/* =====================================================================
   tools/prueba-fiel/probar.js — PRUEBA FIEL con las librerías REALES de ED (NUEVO v21.16)
   ---------------------------------------------------------------------
   Las pantallas falsas de tools/regresion.js IMITAN a ED. Esta prueba usa lo que ED usa de verdad: dragula (el
   arrastre) y driver.js (la guía "Got it!"), con el HTML REAL de los reportes #123 y #124 de Nore. Corre UN paso del
   bot (__ed.step()) con la versión vieja y con la nueva, con y sin la guía, y muestra si la ficha cayó y si ED marcó.
     NODE_PATH=<carpeta con playwright> node tools/prueba-fiel/probar.js /tmp/viejo.js [carpeta-fotos]
   Resultado esperado (comprobado el 03/11 con v21.15 → v21.16):
     v21.15 + guía → "moves: 10", las 6 fichas en el banco, espejo pegado (IGUAL que el reporte #123 de ED)
     v21.15 sin guía → cae y marca · v21.16 con o sin guía → cierra la guía, cae y marca
   Licencias: dragula (MIT, Nicolás Bevacqua) y driver.js (MIT, Kamran Ahmed): copias sin cambios, solo para probar.
   ===================================================================== */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const VIEJO = process.argv[2], FOTOS = process.argv[3] || null;
const NUEVO = path.join(__dirname, '..', '..', 'dist', 'ed-autopilot.js');
(async () => {
  const browser = await chromium.launch();
  const bots = [...(VIEJO ? [['viejo', VIEJO]] : []), ['nuevo', NUEVO]];
  const filas = [];
  for (const caso of ['reverse', 'clasif']) for (const [nombre, bot] of bots) for (const guia of [true, false]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('file://' + path.join(__dirname, 'index.html') + '?caso=' + caso + (guia ? '' : '#sinGuia'));
    await page.waitForTimeout(700);
    await page.evaluate(() => { window.__edNoAutoResume = true; localStorage.clear(); });
    await page.addScriptTag({ content: fs.readFileSync(bot, 'utf8') });
    const r = await page.evaluate(async () => { try { return await window.__ed.step(); } catch (e) { return { error: e.message }; } });
    const d = await page.evaluate(() => ({ marcadas: window.__marcadas, guia: !!document.querySelector('.driver-popover'), enBanco: document.querySelectorAll('[dg_name="TTpTablePlaceHolder"] .dnditem').length, espejo: !!document.querySelector('.gu-mirror') }));
    filas.push({ caso, bot: nombre, guia, resultado: (r && r.did) + (r && r.moves != null ? ' moves ' + r.moves : ''), marcada: !!(r && r.taskMarked), fichasEnBanco: d.enBanco, guiaSigue: d.guia, espejoPegado: d.espejo });
    if (FOTOS) { fs.mkdirSync(FOTOS, { recursive: true }); await page.screenshot({ path: path.join(FOTOS, `${caso}-${nombre}-${guia ? 'con' : 'sin'}-guia.png`) }); }
    await page.close();
  }
  console.table(filas);
  await browser.close();
  const malo = filas.filter(f => f.bot === 'nuevo' && !f.marcada);
  if (malo.length) { console.error('✗ el bot nuevo no marcó en', malo.length, 'caso(s)'); process.exit(1); }
  console.log('✓ prueba fiel: el bot nuevo marca en todos los casos');
})();
