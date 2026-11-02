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
// NUEVO v21.14: segundos (promedio) entre pasos del bot = ritmo de persona (Hugo: ~4 h de trabajo por cuenta)
const RITMO = process.env.RITMO != null && process.env.RITMO !== '' && !isNaN(+process.env.RITMO) ? String(+process.env.RITMO) : '5';
const LOGIN = process.env.ED_LOGIN || 'https://ed.engdis.com/upbstacruz#/login';
const RAIZ = path.join(__dirname, '..');
const EST = path.join(RAIZ, 'estado', `cuenta-${CUENTA}.json`);
const OUT = path.join(RAIZ, 'salida');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(path.dirname(EST), { recursive: true });
const BOT = fs.readFileSync(path.join(RAIZ, 'dist', 'ed-autopilot.js'), 'utf8');
// NUEVO v21.13: banco de respuestas por curso (compartido entre cuentas, en la caché privada) y tablero con checks
const Banco = require('./banco');
const { dibujar, Publicador } = require('./tablero');
const BANCO_DIR = path.join(RAIZ, 'banco');
const t0 = Date.now();
// NUEVO v21.5: TODO lo que se imprime también va a salida/registro.txt (dentro del zip de resultados),
// con usuario y contraseña reemplazados por *** — así un solo archivo trae todo lo que pasó.
{
  const REG = path.join(OUT, 'registro.txt');
  const tapar = t => { let x = String(t); for (const v of [USER, PASS]) if (v) x = x.split(v).join('***'); return x; };
  for (const m of ['log', 'error', 'warn']) {
    const orig = console[m].bind(console);
    console[m] = (...a) => { try { fs.appendFileSync(REG, tapar(a.map(x => (typeof x === 'string' ? x : (x && x.stack) || JSON.stringify(x))).join(' ')) + '\n'); } catch (e) {} orig(...a); };
  }
}
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}] [${typeof NOMBRE !== 'undefined' ? NOMBRE : 'cuenta ' + CUENTA}]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!USER || !PASS) { console.error(`No hay usuario/contraseña para la cuenta ${CUENTA}: revisa la línea ${CUENTA} del secret ED_CUENTAS (o ED_USER_${CUENTA} / ED_PASS_${CUENTA}).`); process.exit(1); }

(async () => {
  const guardado = fs.existsSync(EST) ? JSON.parse(fs.readFileSync(EST, 'utf8')) : {};
  // NUEVO v21.11 — la memoria se guarda por NÚMERO de cuenta: si en ED_CUENTAS cambió quién es la cuenta N (la
  // cuenta 2 traía el reporte y los puntajes de Nelson), solo se conservan las respuestas cosechadas (sirven en el
  // mismo curso) y la config; se descarta lo que es de la persona (puntajes, reporte, barrido, mapa, reintentos).
  const huella = require('crypto').createHash('sha256').update(String(USER).toLowerCase()).digest('hex').slice(0, 12);
  if (guardado['ed:nube:cuenta'] && guardado['ed:nube:cuenta'] !== huella) {
    for (const k of Object.keys(guardado)) if (!/^ed:(testAns|testKnown|answers|cfg)/.test(k)) delete guardado[k];
    log('⚠️ La memoria guardada era de OTRA persona (cambió la línea de esta cuenta en ED_CUENTAS): conservo solo las respuestas.');
  }
  guardado['ed:nube:cuenta'] = huella;
  log(`Inicio · modo ${MODO} · tope ${MINUTOS} min · ritmo ${RITMO} s entre pasos · memoria previa: ${Object.keys(guardado).length} claves`);

  const browser = await chromium.launch({ headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'en-US' });
  await ctx.grantPermissions(['microphone'], { origin: 'https://ed.engdis.com' });

  // En CADA página: restaurar memoria del bot, marcar "cargador" (recarga y retoma solo) e inyectar el bot
  await ctx.addInitScript(({ datos, bot, modo, extra, ritmo }) => {
    // AJUSTADA v21.6: solo en las páginas de ED (antes también en about:blank → fallo falso en el reporte)
    if (!(/(^|\.)engdis\.com$/.test(location.hostname) || (extra && location.hostname === extra))) return;
    try {
      {
        for (const [k, v] of Object.entries(datos || {})) if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
        localStorage.setItem('ed:running:v1', '1');
        localStorage.setItem('ed:ritmo:v1', ritmo);   // NUEVO v21.14
        // Una vez por ejecución (no en cada página): arrancar el modo pedido desde el Home
        if ((modo === 'barrer' || modo === 'completar') && !sessionStorage.getItem('ed:nube:arrancado')) {
          sessionStorage.setItem('ed:nube:arrancado', '1');
          // AJUSTADA v21.11: + inicio (identifica la corrida: los fallos y reintentos se cuentan por corrida)
          localStorage.setItem('ed:sweep:v1', JSON.stringify({ active: true, mode: modo === 'completar' ? 'completar' : 'tests', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [], inicio: new Date().toISOString() }));
        }
      }
    } catch (e) {}
    window.__edCargador = true; window.__edNube = true;
    const go = () => setTimeout(() => { try { (0, eval)(bot); } catch (e) { console.error('[ED nube] no pude cargar el bot', e); } }, 1500);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }, { datos: guardado, bot: BOT, modo: MODO, extra: process.env.ED_HOST_EXTRA || '', ritmo: RITMO });

  let page = await ctx.newPage();
  const PUB = new Publicador({ token: process.env.GH_TOKEN, repo: process.env.GITHUB_REPOSITORY, issue: process.env.TABLERO_ISSUE, cuenta: CUENTA });
  let loginEstado = 'esperando', loginMsg = '', curso = null, banco = null, ultimoTab = {};
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
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded', timeout: 90000 });   // AJUSTADA v21.14: 90 s (antes 60)
    const u = page.locator('input[name="userName"]');
    try { await u.waitFor({ state: 'visible', timeout: 40000 }); } catch (e) { log('No apareció el formulario (¿ya había sesión?)'); return true; }   // AJUSTADA v21.14: 40 s
    await u.fill(USER);
    await page.locator('input[name="password"]').fill(PASS);
    await page.waitForFunction(() => { const b = document.querySelector('#submit1'); return b && !b.disabled; }, null, { timeout: 10000 }).catch(() => {});
    await page.locator('#submit1').click({ timeout: 8000 }).catch(() => {});
    // NUEVO v21.7 (corrida de Nelson: no pudo volver a entrar): si la sesión anterior sigue abierta, ED muestra
    // "You are already logged in to English Discoveries" [Cancel] [Login on This Device] → pulsar el 2.º.
    const t1 = Date.now(); let dentro = false;
    while (Date.now() - t1 < 90000) {   // AJUSTADA v21.14: 90 s para entrar (antes 45)
      if (!/#\/login/i.test(page.url())) { dentro = true; break; }
      const otro = page.getByText(/^(Login on This Device|Iniciar sesi[oó]n en este dispositivo|Ingresar en este dispositivo)$/i).first();
      if (await otro.isVisible().catch(() => false)) { log('🔁 ED dice que la cuenta ya estaba abierta → "Login on This Device"'); await otro.click({ timeout: 5000 }).catch(() => {}); await sleep(3000); continue; }
      await sleep(1000);
    }
    if (!dentro) {
      const msg = await page.locator('.siteLogin__messageText:visible, .confirmPopup__main:visible').allInnerTexts().catch(() => []);
      loginMsg = msg.join(' | ').replace(/\s+/g, ' ').trim().slice(0, 120);
      log('❌ No pude iniciar sesión.', loginMsg || '(sin mensaje)'); await foto('login-fallido'); return false;
    }
    log('✅ Sesión iniciada →', page.url().replace(/\?.*/, ''));
    return true;
  };

  await tablero(false);
  if (!(await login())) {
    loginEstado = 'falla'; const md = await tablero(true);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
    await browser.close(); process.exit(1);
  }
  loginEstado = 'ok';
  await sleep(8000); await foto('despues-del-login');   // AJUSTADA v21.14: 8 s para que cargue el Home
  await usarBanco();   // NUEVO v21.13: si el Home ya muestra el curso, el banco entra antes del primer test

  // Modo auto: desde el Home, entrar a "continuar" (carrusel). En completar/barrer lo hace el propio bot.
  if (MODO === 'auto' && /#\/home/i.test(page.url())) {
    const btn = page.locator('.carouselStartBtnW a, .carouselStartBtnW button, .carouselStartBtnW').first();
    if (await btn.count()) { log('Entrando a la lección actual (botón del carrusel)…'); await btn.click().catch(() => {}); }
    else log('⚠ No encontré el botón para continuar en el Home (ver foto despues-del-login.png)');
  }

  // Bucle de vigilancia: el bot trabaja solo; aquí solo se re-loguea si la sesión se cae y se guardan fotos.
  let n = 0, sesionesCaidas = 0;
  while ((Date.now() - t0) / 60000 < MINUTOS) {
    try {   // AJUSTADA v21.7: un error aquí (p. ej. en el login) ya no corta al robot sin resumen
      await sleep(10000); n++;   // AJUSTADA v21.6: revisar cada 10 s (antes 30) → re-login más rápido
      if (!curso && n % 3 === 0) await usarBanco();   // NUEVO v21.13: apenas se sabe el curso, el banco
      if (n === 3 || n % 18 === 0) await tablero(false);   // NUEVO v21.13: tablero en vivo cada ~3 min
      // ¿el bot terminó (modo completar/barrer desactivado)? → cerrar antes
      const fin = await page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('ed:sweep:v1') || 'null'); return !!(s && s.fin && !s.active); } catch (e) { return false; } }).catch(() => false);
      if (fin && MODO !== 'auto') { log('🏁 El bot terminó todo lo que pudo'); break; }
      if (page.isClosed()) { page = await ctx.newPage(); enganchar(page); await login(); continue; }
      // AJUSTADA v21.6: ED también puede mostrar "Tu sesión no está más activa en tu dispositivo" (pasa si la cuenta
      // se abre en otro lugar o vence la sesión). Antes el robot solo reaccionaba a la página de login.
      const echado = await page.evaluate(() => /no est[aá] m[aá]s activa|no longer active|session (has )?expired|sesi[oó]n (ha )?expirado|vuelve a acceder/i.test((document.body && document.body.innerText) || '')).catch(() => false);
      if (/#\/login/i.test(page.url()) || echado) {
        log(echado ? '⚠ ED cerró la sesión ("no está más activa") → vuelvo a entrar. ¿Se abrió esta cuenta en otro lugar?' : 'La sesión se cerró → vuelvo a entrar');
        if (echado) { await foto('sesion-cerrada'); await page.getByText(/^(Aceptar|Accept|OK)$/).first().click({ timeout: 3000 }).catch(() => {}); await sleep(2000); }
        sesionesCaidas++;
        if (sesionesCaidas > 6) { log('❌ ED cerró la sesión demasiadas veces → termino para no insistir'); break; }
        await login();
      }
      if (n % 60 === 0) { await foto('ultima'); await guardar(); }   // cada ~10 min
    } catch (e) { log('⚠ Error en la vigilancia (sigo):', String(e && e.message || e).split('\n')[0]); await sleep(15000); }
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
      await page.goto(home.homeUrl || LOGIN.replace(/#.*/, '#/home'), { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      await sleep(6000); await foto('home-final');
      w = await page.evaluate(() => { const num = sel => { const e = document.querySelector(sel); const m = e && (e.textContent || '').match(/(\d{1,3})\s*%/); return m ? +m[1] : null; };
        // NUEVO v21.12: nombre del curso que muestra el Home (Roy: Hugo vio "Beginners 1" y el bot había hecho "Beginners 2")
        const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const curso = [...document.querySelectorAll('[class*="BSslide"] h1, [class*="BSslide"] h2, [class*="arousel"] h1, [class*="arousel"] h2, h1, h2')].filter(vis)
          .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).find(x => x && x.length < 60 && /UPB|Beginners|Basic|Intermediate|Advanced|Elementary|Level/i.test(x)) || null;
        return { completion: num('.home__studentWidgetCompletion'), avg: num('.home__studentWidgetTestScores'), curso }; }).catch(() => ({}));
      if (w.completion == null && sw && sw.widgets) w = sw.widgets;   // si no se pudo releer el Home, lo último que leyó el bot
      if (!w.curso && sw && sw.widgets && sw.widgets.curso) w.curso = sw.widgets.curso;
      rep = fs.existsSync(path.join(OUT, 'reporte.txt')) ? fs.readFileSync(path.join(OUT, 'reporte.txt'), 'utf8') : '';
    } catch (e) { log('No pude armar el resumen:', e.message); }
    const nfallos = (rep.match(/REPORTE DE FALLOS \((\d+)\)/) || [])[1] || '0';
    // NUEVO v21.8: lo que vio el bot en My Progress (tests < 100 y lecciones sin terminar)
    let mapa = null; try { mapa = await page.evaluate(() => JSON.parse(localStorage.getItem('ed:progress:v1') || 'null')); } catch (e) {}
    const bajos = mapa ? mapa.unidades.flatMap(u => u.lecciones.filter(l => typeof l.test === 'number' && l.test < 100).map(l => `U${u.n} L${l.n} ${l.nombre} (${l.test} %)`)) : [];
    // AJUSTADA v21.12: sin las filas vacías de My Progress ("U1 L0 ·") y el Unit Test como "U1 Unit Test" (zips de Roy y Mateo)
    const sinTerminar = mapa ? mapa.unidades.filter(u => !u.locked).flatMap(u => u.lecciones.filter(l => !l.terminado && (l.nombre || '').trim()).map(l => l.n ? `U${u.n} L${l.n} ${l.nombre}` : `U${u.n} ${l.nombre}`)) : [];
    const tab = await tablero(true, w.completion != null ? w : null);   // NUEVO v21.13
    const md = [
      `## ${NOMBRE} (cuenta ${CUENTA}) · modo ${MODO}`,
      `| Course Completion | Average Test Score | Fallos anotados | Minutos |`, `|---|---|---|---|`,
      `| ${w.completion ?? '?'}% | ${w.avg ?? '?'}% | ${nfallos} | ${Math.round((Date.now() - t0) / 60000)} |`, '',
      tab, '',
      `**Curso:** ${w.curso || '(no se pudo leer)'} — si en el Home ves OTRO curso (p. ej. Beginners 1), cambia con las flechas ‹ › del carrusel.`, '',
      sw && sw.unitsDone ? `**Unidades recorridas:** ${sw.unitsDone.join(', ') || '—'}` : '',
      mapa ? `**Según My Progress (última lectura):** tests < 100: ${bajos.length ? bajos.join(' · ') : 'ninguno 🎉'} — lecciones sin terminar: ${sinTerminar.length ? sinTerminar.join(' · ') : 'ninguna 🎉'}` : '',
      sw && sw.resultados && sw.resultados.length ? `**Tests revisados:** ${sw.resultados.map(r => `U${r.unidad} ${r.leccion}: ${r.pct ?? '?'}%`).join(' · ')}` : '',
      '', (w.completion === 100 && w.avg === 100) ? '🎉 **¡100 % y 100 %!**' : '',
      // AJUSTADA v21.11: los reportes ahora son dumps completos (pesan más): aquí va solo la lista; el detalle completo
      // está en reporte.txt (dentro del zip). GitHub no acepta resúmenes de más de 1 MB.
      '', '<details><summary>📋 Lista de fallos (el detalle completo está en reporte.txt, dentro del zip)</summary>', '', '```text', (rep.split('\n\n--- DETALLE')[0] || 'Sin fallos anotados.').slice(0, 60000), '```', '</details>', ''
    ].join('\n');
    fs.writeFileSync(path.join(OUT, 'resumen.md'), md);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
    log(`📊 ${w.curso || 'Curso ?'} · Course Completion ${w.completion ?? '?'}% · Average Test Score ${w.avg ?? '?'}% · fallos ${nfallos}`);
  }

  // NUEVO v21.13 — curso que se está haciendo (desplegable de la lección o carrusel del Home)
  async function leerCurso() {
    try {
      return await page.evaluate(() => {
        const d = document.querySelector('.learning__dropDownList_courseName');
        if (d && d.textContent.trim()) return d.textContent.replace(/\s+/g, ' ').trim();
        const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const h = [...document.querySelectorAll('[class*="BSslide"] h1, [class*="BSslide"] h2, [class*="arousel"] h1, [class*="arousel"] h2, h1, h2')].filter(vis)
          .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).find(x => x && x.length < 60 && /UPB|Beginners|Basic|Intermediate|Advanced|Elementary|Level/i.test(x));
        if (h) return h;
        try { const s = JSON.parse(localStorage.getItem('ed:sweep:v1') || 'null'); return (s && s.widgets && s.widgets.curso) || null; } catch (e) { return null; }
      });
    } catch (e) { return null; }
  }
  // NUEVO v21.13 — BANCO: al saber el curso, se agregan a esta cuenta las respuestas que ya cosecharon OTRAS cuentas
  // del mismo curso. Se mezcla DENTRO de la página en un solo paso (así no se pisa una cosecha que esté ocurriendo).
  async function usarBanco() {
    const c = await leerCurso();
    if (!c || Banco.slug(c) === Banco.slug(curso)) return;
    curso = c; banco = Banco.leer(BANCO_DIR, curso);
    if (!Banco.contar(banco)) { log(`📚 Curso: ${curso} · el banco de este curso todavía está vacío (esta cuenta lo empieza)`); return; }
    try {
      const r = await page.evaluate(({ b, K }) => {
        const g = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
        const ans = g(K.answers, {}), t2 = g(K.testAns, {}), kn = g(K.known, []);
        const antes = Object.keys(t2).length;
        for (const [q, a] of Object.entries(b.answers || {})) if (!(q in ans)) ans[q] = a;
        for (const [k, qs] of Object.entries(b.testAns || {})) { t2[k] = t2[k] || {}; for (const [i, v] of Object.entries(qs || {})) if (!(i in t2[k])) t2[k][i] = v; }
        const s = new Set(kn); for (const k of (b.known || [])) if (b.testAns && b.testAns[k] && Object.keys(b.testAns[k]).length) s.add(k);
        localStorage.setItem(K.answers, JSON.stringify(ans)); localStorage.setItem(K.testAns, JSON.stringify(t2)); localStorage.setItem(K.known, JSON.stringify([...s]));
        return { antes, despues: Object.keys(t2).length };
      }, { b: banco, K: Banco.K });
      log(`📚 Banco de "${curso}": ${Banco.contar(banco)} tests con respuestas · esta cuenta tenía ${r.antes}, ahora ${r.despues} (esos ya no necesitan cosecha)`);
    } catch (e) { curso = null; }   // la página estaba cambiando: se reintenta en 30 s
  }
  // NUEVO v21.13 — TABLERO: lo dibuja (cloud/tablero.js), lo deja en salida/tablero.md y lo publica en el issue
  async function tablero(fin, wFinal) {
    try {
      const d = await page.evaluate(() => { const g = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }; return { t: g('ed:tablero:v1'), m: g('ed:progress:v1'), s: g('ed:sweep:v1') }; });
      if (d) ultimoTab = d;
    } catch (e) {}
    const s = ultimoTab.s || {};
    // el tablero guardado de la corrida ANTERIOR no cuenta (se reinicia con cada corrida)
    const t = ultimoTab.t && ultimoTab.t.corrida === (s.inicio || s.corrida) ? ultimoTab.t : null;
    const datos = { curso: curso || (s.widgets && s.widgets.curso) || null, login: loginEstado, loginMsg, widgets: wFinal || s.widgets || {}, mapa: ultimoTab.m, tablero: t, fin, minutos: Math.round((Date.now() - t0) / 60000) };
    const md = dibujar(Object.assign({ titulo: `${NOMBRE} (cuenta ${CUENTA})` }, datos));
    try { fs.writeFileSync(path.join(OUT, 'tablero.md'), md); } catch (e) {}
    const ok = await PUB.publicar(md);   // AJUSTADA v21.13: con el nombre (Hugo: "colócales sus nombres para saber quiénes son")
    if (!ok && PUB.ultimoError && !PUB.avisado) { PUB.avisado = true; log('⚠ No pude actualizar el tablero en vivo:', PUB.ultimoError); }
    return md;
  }

  async function guardar() {
    try {
      const datos = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^ed:/.test(k) && k !== 'ed:running:v1') o[k] = localStorage.getItem(k); } return o; });
      if (Object.keys(datos).length) fs.writeFileSync(EST, JSON.stringify(datos));
      // NUEVO v21.13: lo cosechado por esta cuenta va al banco de SU curso (lo de la cuenta manda)
      if (curso) { banco = Banco.mezclar(Object.assign(Banco.desdeLocal(datos), { curso }), banco || Banco.vacio(curso)); banco.curso = curso; Banco.escribir(BANCO_DIR, banco); }
      const rep = await page.evaluate(() => (window.__ed && window.__ed.reportText ? window.__ed.reportText() : null)).catch(() => null);
      if (rep) fs.writeFileSync(path.join(OUT, 'reporte.txt'), rep);
      const sw = await page.evaluate(() => localStorage.getItem('ed:sweep:v1')).catch(() => null);
      if (sw) fs.writeFileSync(path.join(OUT, 'barrido.json'), sw);
      log(`💾 Memoria guardada (${Object.keys(datos).length} claves)`);
    } catch (e) { log('No pude guardar:', e.message); }
  }
})().catch(e => { console.error('Error general:', e); process.exit(1); });
