/* =====================================================================
   cloud/runner.js — corre el bot en un Chrome EN LA NUBE (GitHub Actions) para UNA cuenta
   ---------------------------------------------------------------------
   Lo lanza .github/workflows/nube.yml. No necesita tu PC encendida.
   1) Abre Chrome sin pantalla, con micrófono simulado de fábrica (flags de Chrome).
   2) Restaura la memoria del bot de la ejecución anterior (respuestas cosechadas, barrido...).
   3) Inicia sesión con ED_USER / ED_PASS (vienen de los Secrets de GitHub, nunca del código).
   4) Inyecta dist/ed-autopilot.js en CADA página y lo deja correr solo (auto o barrido).
   5) Al terminar (o al llegar al tope de minutos) guarda la memoria del bot, el reporte de fallos
      y capturas de pantalla.
   Seguridad: la contraseña no se imprime nunca. NO se guardan cookies de sesión (solo las claves ed:*
   del bot), así que nadie puede usar lo guardado para entrar a la cuenta.
   ===================================================================== */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const CUENTA = process.env.CUENTA || '1';
// NUEVO v21.4: la cuenta sale del secret ED_CUENTAS (línea número CUENTA); si está vacío, de ED_USER_n / ED_PASS_n
const { leerCuentas } = require('./cuentas');
const deLista = leerCuentas(process.env.ED_CUENTAS).find(c => String(c.n) === String(CUENTA));
const USER = deLista ? deLista.user : process.env.ED_USER, PASS = deLista ? deLista.pass : process.env.ED_PASS;
const NOMBRE = deLista ? deLista.nombre : `cuenta ${CUENTA}`;
// Que GitHub tape usuario y contraseña en TODOS los registros (comando de Actions; esta línea no se muestra)
if (process.env.GITHUB_ACTIONS) for (const v of [USER, PASS]) if (v) console.log('::add-mask::' + v);
const MODO = (process.env.MODO || 'completar').toLowerCase();      // completar | barrer | auto
const MINUTOS = +(process.env.MINUTOS || 330);                        // GitHub corta a los 360
const LOGIN = process.env.ED_LOGIN || 'https://ed.engdis.com/upbstacruz#/login';
const RAIZ = path.join(__dirname, '..');
const EST = path.join(RAIZ, 'estado', `cuenta-${CUENTA}.json`);
const OUT = path.join(RAIZ, 'salida');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(path.dirname(EST), { recursive: true });
const BOT = fs.readFileSync(path.join(RAIZ, 'dist', 'ed-autopilot.js'), 'utf8');
const t0 = Date.now();
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}] [${typeof NOMBRE !== 'undefined' ? NOMBRE : 'cuenta ' + CUENTA}]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!USER || !PASS) { console.error(`No hay usuario/contraseña para la cuenta ${CUENTA}: revisa la línea ${CUENTA} del secret ED_CUENTAS (o ED_USER_${CUENTA} / ED_PASS_${CUENTA}).`); process.exit(1); }

(async () => {
  const guardado = fs.existsSync(EST) ? JSON.parse(fs.readFileSync(EST, 'utf8')) : {};
  log(`Inicio · modo ${MODO} · tope ${MINUTOS} min · memoria previa: ${Object.keys(guardado).length} claves`);

  const browser = await chromium.launch({ headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'en-US' });
  await ctx.grantPermissions(['microphone'], { origin: 'https://ed.engdis.com' });

  // En CADA página: restaurar memoria del bot, marcar "cargador" (recarga y retoma solo) e inyectar el bot
  await ctx.addInitScript(({ datos, bot, modo }) => {
    try {
      if (location.hostname === 'ed.engdis.com') {
        for (const [k, v] of Object.entries(datos || {})) if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
        localStorage.setItem('ed:running:v1', '1');
        // Una vez por ejecución (no en cada página): arrancar el modo pedido desde el Home
        if ((modo === 'barrer' || modo === 'completar') && !sessionStorage.getItem('ed:nube:arrancado')) {
          sessionStorage.setItem('ed:nube:arrancado', '1');
          localStorage.setItem('ed:sweep:v1', JSON.stringify({ active: true, mode: modo === 'completar' ? 'completar' : 'tests', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [] }));
        }
      }
    } catch (e) {}
    window.__edCargador = true; window.__edNube = true;
    const go = () => setTimeout(() => { try { (0, eval)(bot); } catch (e) { console.error('[ED nube] no pude cargar el bot', e); } }, 1500);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }, { datos: guardado, bot: BOT, modo: MODO });

  let page = await ctx.newPage();
  const enganchar = p => {
    p.on('console', m => { const t = m.text(); if (/\[ED/.test(t)) log(t.replace(/%c/g, '').replace(/color:[^ ]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 260)); });
    p.on('dialog', d => d.accept().catch(() => {}));
    p.on('crash', () => log('⚠ la página se colgó'));
  };
  enganchar(page);

  const foto = async nombre => { try { await page.screenshot({ path: path.join(OUT, `${nombre}.png`) }); } catch (e) {} };

  // Login con la estructura real (dump del 31/10): input[name=userName], input[name=password], #submit1.
  // OJO: hay un input[name=foilautofill] escondido (trampa para autocompletar) que NO se toca.
  const login = async () => {
    log('Abriendo login…');
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const u = page.locator('input[name="userName"]');
    try { await u.waitFor({ state: 'visible', timeout: 20000 }); } catch (e) { log('No apareció el formulario (¿ya había sesión?)'); return true; }
    await u.fill(USER);
    await page.locator('input[name="password"]').fill(PASS);
    await page.waitForFunction(() => { const b = document.querySelector('#submit1'); return b && !b.disabled; }, null, { timeout: 10000 }).catch(() => {});
    await page.locator('#submit1').click();
    try { await page.waitForFunction(() => !/#\/login/i.test(location.href), null, { timeout: 45000 }); }
    catch (e) {
      const msg = await page.locator('.siteLogin__messageText:visible').allInnerTexts().catch(() => []);
      log('❌ No pude iniciar sesión.', msg.join(' | ') || '(sin mensaje)'); await foto('login-fallido'); return false;
    }
    log('✅ Sesión iniciada →', page.url().replace(/\?.*/, ''));
    return true;
  };

  if (!(await login())) { await browser.close(); process.exit(1); }
  await sleep(4000); await foto('despues-del-login');

  // Modo auto: desde el Home, entrar a "continuar" (carrusel). En completar/barrer lo hace el propio bot.
  if (MODO === 'auto' && /#\/home/i.test(page.url())) {
    const btn = page.locator('.carouselStartBtnW a, .carouselStartBtnW button, .carouselStartBtnW').first();
    if (await btn.count()) { log('Entrando a la lección actual (botón del carrusel)…'); await btn.click().catch(() => {}); }
    else log('⚠ No encontré el botón para continuar en el Home (ver foto despues-del-login.png)');
  }

  // Bucle de vigilancia: el bot trabaja solo; aquí solo se re-loguea si la sesión se cae y se guardan fotos.
  let n = 0;
  while ((Date.now() - t0) / 60000 < MINUTOS) {
    await sleep(30000); n++;
    // ¿el bot terminó (modo completar/barrer desactivado)? → cerrar antes
    const fin = await page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('ed:sweep:v1') || 'null'); return !!(s && s.fin && !s.active); } catch (e) { return false; } }).catch(() => false);
    if (fin && MODO !== 'auto') { log('🏁 El bot terminó todo lo que pudo'); break; }
    if (page.isClosed()) { page = await ctx.newPage(); enganchar(page); await login(); continue; }
    if (/#\/login/i.test(page.url())) { log('La sesión se cerró → vuelvo a entrar'); await login(); }
    if (n % 20 === 0) { await foto('ultima'); await guardar(); }
  }
  log('⏱ Fin de la ejecución → guardo, leo los porcentajes del Home y escribo el resumen');
  await guardar(); await foto('final');
  await resumen();
  await browser.close();

  // Resumen en la página de la ejecución (GitHub → Actions → la ejecución): porcentajes + reporte completo
  async function resumen() {
    let w = {}, sw = null, rep = '';
    try {
      const home = (await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ed:sweep:v1') || 'null'); } catch (e) { return null; } })) || {};
      sw = home;
      await page.goto(home.homeUrl || LOGIN.replace(/#.*/, '#/home'), { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await sleep(6000); await foto('home-final');
      w = await page.evaluate(() => { const num = sel => { const e = document.querySelector(sel); const m = e && (e.textContent || '').match(/(\d{1,3})\s*%/); return m ? +m[1] : null; };
        return { completion: num('.home__studentWidgetCompletion'), avg: num('.home__studentWidgetTestScores') }; }).catch(() => ({}));
      if (w.completion == null && sw && sw.widgets) w = sw.widgets;   // si no se pudo releer el Home, lo último que leyó el bot
      rep = fs.existsSync(path.join(OUT, 'reporte.txt')) ? fs.readFileSync(path.join(OUT, 'reporte.txt'), 'utf8') : '';
    } catch (e) { log('No pude armar el resumen:', e.message); }
    const nfallos = (rep.match(/REPORTE DE FALLOS \((\d+)\)/) || [])[1] || '0';
    const md = [
      `## ${NOMBRE} (cuenta ${CUENTA}) · modo ${MODO}`,
      `| Course Completion | Average Test Score | Fallos anotados | Minutos |`, `|---|---|---|---|`,
      `| ${w.completion ?? '?'}% | ${w.avg ?? '?'}% | ${nfallos} | ${Math.round((Date.now() - t0) / 60000)} |`, '',
      sw && sw.unitsDone ? `**Unidades recorridas:** ${sw.unitsDone.join(', ') || '—'}` : '',
      sw && sw.resultados && sw.resultados.length ? `**Tests revisados:** ${sw.resultados.map(r => `U${r.unidad} ${r.leccion}: ${r.pct ?? '?'}%`).join(' · ')}` : '',
      '', (w.completion === 100 && w.avg === 100) ? '🎉 **¡100 % y 100 %!**' : '',
      '', '<details><summary>📋 Reporte completo de fallos (cópialo y pégalo en el chat)</summary>', '', '```text', rep || 'Sin fallos anotados.', '```', '</details>', ''
    ].join('\n');
    fs.writeFileSync(path.join(OUT, 'resumen.md'), md);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
    log(`📊 Course Completion ${w.completion ?? '?'}% · Average Test Score ${w.avg ?? '?'}% · fallos ${nfallos}`);
  }

  async function guardar() {
    try {
      const datos = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^ed:/.test(k) && k !== 'ed:running:v1') o[k] = localStorage.getItem(k); } return o; });
      if (Object.keys(datos).length) fs.writeFileSync(EST, JSON.stringify(datos));
      const rep = await page.evaluate(() => (window.__ed && window.__ed.reportText ? window.__ed.reportText() : null)).catch(() => null);
      if (rep) fs.writeFileSync(path.join(OUT, 'reporte.txt'), rep);
      const sw = await page.evaluate(() => localStorage.getItem('ed:sweep:v1')).catch(() => null);
      if (sw) fs.writeFileSync(path.join(OUT, 'barrido.json'), sw);
      log(`💾 Memoria guardada (${Object.keys(datos).length} claves)`);
    } catch (e) { log('No pude guardar:', e.message); }
  }
})().catch(e => { console.error('Error general:', e); process.exit(1); });
