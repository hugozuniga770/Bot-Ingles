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
// NUEVO v21.16: o del secret ED_CUENTA_<APODO> de esa cuenta (llega como ED_CUENTA; una sola línea)
// El panel del teléfono lo guarda como JSON {"u":usuario,"p":contraseña,"n":nombre} (así una contraseña con espacios
// o ":" no se rompe); a mano también vale la línea de siempre: usuario contraseña Nombre
const sola = !process.env.ED_CUENTA ? null : /^\s*\{/.test(process.env.ED_CUENTA)
  ? (() => { try { const j = JSON.parse(process.env.ED_CUENTA); return j.u && j.p ? { user: String(j.u), pass: String(j.p), nombre: String(j.n || CUENTA) } : null; } catch (e) { return null; } })()
  : leerCuentas(process.env.ED_CUENTA)[0];
const deLista = sola ? Object.assign(sola, { n: CUENTA, nombre: sola.nombre === 'cuenta 1' ? CUENTA : sola.nombre })
  : leerCuentas(process.env.ED_CUENTAS).find(c => String(c.n) === String(CUENTA));
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
// AJUSTADA v21.16: con varias cuentas en la MISMA máquina (cloud/lote.js) cada una escribe en su carpeta (SALIDA)
const OUT = process.env.SALIDA ? path.resolve(process.env.SALIDA) : path.join(RAIZ, 'salida');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(path.dirname(EST), { recursive: true });
const BOT = fs.readFileSync(path.join(RAIZ, 'dist', 'ed-autopilot.js'), 'utf8');
// NUEVO v21.13: banco de respuestas por curso (compartido entre cuentas, en la caché privada) y tablero con checks
const Banco = require('./banco');
const { dibujar, Publicador } = require('./tablero');
const Diag = require('./diagnostico');   // NUEVO v21.16: reportes agrupados, salud, tiempos, pantallas nuevas, texto para la IA
const BANCO_DIR = path.join(RAIZ, 'banco');
// NUEVO v21.16: dónde deja esta cuenta su banco al terminar (con varias cuentas por máquina, una carpeta por cuenta;
// el job "juntar" las mezcla todas). Se LEE siempre de banco/ (lo de la caché).
const BANCO_OUT = process.env.BANCO_SALIDA ? path.resolve(process.env.BANCO_SALIDA) : BANCO_DIR;
// NUEVO v21.16: cada cuántos minutos se actualiza el tablero (con muchas cuentas a la vez, menos seguido: GitHub deja
// ~1000 pedidos por hora)
const TABLERO_CADA = Math.max(1, +(process.env.TABLERO_CADA || 3));
// NUEVO v21.16: PARAR esta cuenta desde el panel del teléfono (cloud/lote.js manda SIGTERM) → guarda todo y termina bien
let pararYa = false;
process.on('SIGTERM', () => { pararYa = true; });
process.on('SIGINT', () => { pararYa = true; });
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
    for (const k of Object.keys(guardado)) if (!/^ed:(testAns|testKnown|answers|cfg|aprendido)/.test(k)) delete guardado[k];   // AJUSTADA v21.16: + aprendido
    log('⚠️ La memoria guardada era de OTRA persona (cambió la línea de esta cuenta en ED_CUENTAS): conservo solo las respuestas.');
  }
  guardado['ed:nube:cuenta'] = huella;
  log(`Inicio · modo ${MODO} · tope ${MINUTOS} min · ritmo ${RITMO} s entre pasos · memoria previa: ${Object.keys(guardado).length} claves`);

  // AJUSTADA v21.15 — en las 6 corridas del 02/11 los videos de speaking salían en 00:00 (el Chromium de Playwright no
  // trae los códecs de los .mp4 de ED) y el reconocimiento de voz no arrancaba. Las máquinas de GitHub traen Google
  // Chrome de verdad: se usa ese; si no está (o NAVEGADOR=chromium), el Chromium de siempre.
  const ARGS = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
  let browser = null;
  if ((process.env.NAVEGADOR || 'chrome') === 'chrome') {
    try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ARGS }); log('🌐 Navegador: Google Chrome (con los códecs de los videos de ED)'); }
    catch (e) { log('🌐 Google Chrome no está en esta máquina → uso Chromium (' + String(e.message || e).split('\n')[0].slice(0, 90) + ')'); }
  }
  if (!browser) browser = await chromium.launch({ headless: true, args: ARGS });
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
        if ((modo === 'barrer' || modo === 'completar' || modo === 'explorar') && !sessionStorage.getItem('ed:nube:arrancado')) {   // AJUSTADA v21.16: + explorar
          sessionStorage.setItem('ed:nube:arrancado', '1');
          // AJUSTADA v21.11: + inicio (identifica la corrida: los fallos y reintentos se cuentan por corrida)
          localStorage.setItem('ed:sweep:v1', JSON.stringify({ active: true, mode: modo === 'barrer' ? 'tests' : 'completar', explorar: modo === 'explorar', phase: 'home', lessonsDone: [], unitsDone: [], resultados: [], inicio: new Date().toISOString() }));
        }
      }
    } catch (e) {}
    window.__edCargador = true; window.__edNube = true;
    const go = () => setTimeout(() => { try { (0, eval)(bot); } catch (e) { console.error('[ED nube] no pude cargar el bot', e); } }, 1500);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }, { datos: guardado, bot: BOT, modo: MODO, extra: process.env.ED_HOST_EXTRA || '', ritmo: RITMO });

  // NUEVO v21.16 — FOTOS: el bot pide una captura con cada reporte (Reporter.foto → fotos/reporte-N-motivo.png en el zip)
  // y el Explorador antes/después de probar cosas. Tope de 120 por corrida (cada una ~150 KB).
  let nFotos = 0;
  await ctx.exposeBinding('__edFoto', async (src, nombre) => {
    if (nFotos >= 120) return null;
    nFotos++;
    const limpio = String(nombre || 'foto').replace(/[^\w.-]+/g, '_').slice(0, 80);
    try { fs.mkdirSync(path.join(OUT, 'fotos'), { recursive: true }); await src.page.screenshot({ path: path.join(OUT, 'fotos', limpio + '.png') });
      // NUEVO v21.16 (idea 17): los ~30 s ANTERIORES (3 capturas, una cada 10 s) → fotos/<nombre>-antes-1..3.jpg
      anillo.forEach((b, i) => { try { fs.writeFileSync(path.join(OUT, 'fotos', `${limpio}-antes-${i + 1}.jpg`), b); } catch (e) {} });
      return 'fotos/' + limpio + '.png'; } catch (e) { return null; }
  });
  // NUEVO v21.16 — MANOS REALES: teclado y mouse de Playwright (eventos del navegador de verdad). El bot los usa cuando
  // ED no "ve" lo simulado: corregir el e-mail (Personalized writing), arrastres que no caen, play que no arranca.
  await ctx.exposeBinding('__edReal', async (src, op) => {
    const p = src.page; op = op || {};
    try {
      if (op.tipo === 'teclear') { await p.keyboard.type(String(op.texto || ''), { delay: 90 }); return { ok: true }; }
      if (op.tipo === 'tecla') { await p.keyboard.press(String(op.tecla || 'Tab')); return { ok: true }; }
      if (op.tipo === 'clic') { await p.mouse.click(+op.x, +op.y, { delay: 60 }); return { ok: true }; }
      if (op.tipo === 'arrastrar') {
        const [x1, y1] = op.de, [x2, y2] = op.a, pasos = Math.max(5, Math.min(40, +op.pasos || 18));
        await p.mouse.move(x1, y1); await p.mouse.down(); await sleep(120);
        await p.mouse.move(x1 + 6, y1 + 6, { steps: 3 });
        await p.mouse.move(x2, y2, { steps: pasos }); await sleep(150);
        await p.mouse.move(x2 + 1, y2 + 1); await p.mouse.up();
        return { ok: true };
      }
      return { ok: false, error: 'tipo desconocido' };
    } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 120) }; }
  });

  let page = await ctx.newPage();
  const PUB = new Publicador({ token: process.env.GH_TOKEN, repo: process.env.GITHUB_REPOSITORY, issue: process.env.TABLERO_ISSUE, cuenta: CUENTA });
  let loginEstado = 'esperando', loginMsg = '', curso = null, banco = null, ultimoTab = {};
  // NUEVO v21.16 — vigías (ideas 7, 8, 9, 14, 17): señal de vida del bot, pantallas en blanco, fallos por hora, mini-película
  let ultimoLogBot = Date.now(), blancas = 0, wInicio = null, frenoMotivo = null, ritmoRapido = false;
  const fallosHora = [];   // [hora, n.º de reportes]
  const anillo = [];       // las últimas 3 capturas (cada 10 s) → con cada reporte, lo que pasó en los 30 s anteriores
  const irHome = async () => { try { const h = await page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('ed:sweep:v1') || 'null') || {}).homeUrl || null; } catch (e) { return null; } }).catch(() => null);
    await page.goto(h || LOGIN.replace(/#.*/, '#/home'), { waitUntil: 'domcontentloaded', timeout: 90000 }); } catch (e) { log('⚠ No pude volver al Home:', String(e.message || e).split('\n')[0]); } };
  const enganchar = p => {
    p.on('console', m => { const t = m.text(); if (/\[ED/.test(t)) { ultimoLogBot = Date.now(); log(t.replace(/%c/g, '').replace(/color:[^ ]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 260)); } });
    p.on('dialog', d => d.accept().catch(() => {}));
    p.on('crash', () => log('⚠ la página se colgó'));
  };
  enganchar(page);

  const foto = async nombre => { try { await page.screenshot({ path: path.join(OUT, `${nombre}.png`) }); } catch (e) {} };

  // Login con la estructura real (dump del 31/10): input[name=userName], input[name=password], #submit1.
  // OJO: hay un input[name=foilautofill] escondido (trampa para autocompletar) que NO se toca.
  const login = async () => {
    log('Abriendo login…');
    // AJUSTADA v21.16 (idea 5): si ED no carga, reintento con espera creciente (5 s, 15 s, 45 s) antes de rendirme
    for (const espera of [0, 5000, 15000, 45000]) {
      if (espera) { log(`🩹 ED no cargó el login → reintento en ${espera / 1000} s`); await sleep(espera); }
      try { await page.goto(LOGIN, { waitUntil: 'domcontentloaded', timeout: 90000 }); break; }   // AJUSTADA v21.14: 90 s (antes 60)
      catch (e) { if (espera === 45000) throw e; }
    }
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
  while ((Date.now() - t0) / 60000 < MINUTOS && !pararYa) {
    try {   // AJUSTADA v21.7: un error aquí (p. ej. en el login) ya no corta al robot sin resumen
      await sleep(10000); n++;   // AJUSTADA v21.6: revisar cada 10 s (antes 30) → re-login más rápido
      if (pararYa) { log('⏹ Me pidieron parar (panel del teléfono) → guardo y termino'); break; }
      if ((!curso && n % 3 === 0) || n % 6 === 0) await usarBanco();   // NUEVO v21.13: apenas se sabe el curso, el banco (AJUSTADA v21.16: y cada minuto, por si cambia de curso)
      if (n === 3 || n % (6 * TABLERO_CADA) === 0) await tablero(false);
      // NUEVO v21.17: la UPB pide 4 h en la plataforma. Si ED ya muestra ≥ 4 h de Time on Task, el ritmo de persona ya no
      // hace falta → pausa mínima entre pasos (termina antes). Se mira cada ~5 min.
      if (n % 30 === 0 && !ritmoRapido && +RITMO > 1) { try { const tt = ultimoTab.m && ultimoTab.m.widgets && ultimoTab.m.widgets.tiempo;
        if (tt && (+tt.h || 0) >= (+process.env.HORAS_MINIMAS || 4)) { ritmoRapido = true; await page.evaluate(() => localStorage.setItem('ed:ritmo:v1', '1')); log(`⚡ Ya hay ${tt.h} h ${tt.m} min en ED (mínimo 4 h) → ritmo rápido`); } } catch (e) {} }   // NUEVO v21.13: tablero en vivo cada ~3 min (AJUSTADA v21.16: TABLERO_CADA)
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
      if (n % 60 === 0) await foto('ultima');   // cada ~10 min
      if (n % 18 === 0) await guardar();   // AJUSTADA v21.16 (idea 7): la memoria se guarda cada ~3 min (antes 10)
      // NUEVO v21.16 (idea 17): mini-película de los últimos 30 s (en memoria; solo se escribe si hay un reporte)
      try { anillo.push(await page.screenshot({ type: 'jpeg', quality: 35 })); if (anillo.length > 3) anillo.shift(); } catch (e) {}
      if (n % 3 === 0) {
        const est = await page.evaluate(() => ({ t: ((document.body && document.body.innerText) || '').trim().length, r: +(localStorage.getItem('ed:report:num:v1') || 0) })).catch(() => null);
        // idea 8 y 6: pantalla en blanco / página de error de Chrome (se cortó internet) ~1,5 min → recargar el Home
        if (!est || est.t < 30 || /^(chrome-error|about:blank)/.test(page.url())) { if (++blancas >= 3) { blancas = 0; log('🩹 Pantalla en blanco o sin internet hace ~1,5 min → vuelvo a cargar el Home'); await foto('pantalla-en-blanco'); await irHome(); } } else blancas = 0;
        // idea 14: el bot no da señales hace 6 min → recargar el Home (él retoma solo donde iba)
        if (Date.now() - ultimoLogBot > 6 * 60000) { ultimoLogBot = Date.now(); log('🩹 Vigía: el bot no da señales hace 6 min → vuelvo a cargar el Home'); await foto('bot-sin-senales'); await irHome(); }
        // idea 9: demasiados fallos en una hora (algo cambió en ED o se rompió) → freno esta cuenta para no hacer daño
        if (est) { fallosHora.push([Date.now(), est.r]); while (fallosHora.length && Date.now() - fallosHora[0][0] > 3600000) fallosHora.shift();
          if (fallosHora.length > 1 && fallosHora[fallosHora.length - 1][1] - fallosHora[0][1] > (+process.env.TOPE_FALLOS_HORA || 45)) { frenoMotivo = 'demasiados fallos en una hora'; log('🛑 Más de ' + (+process.env.TOPE_FALLOS_HORA || 45) + ' fallos en una hora → freno esta cuenta (mira el reporte: algo cambió en ED)'); break; } }
      }
    } catch (e) { log('⚠ Error en la vigilancia (sigo):', String(e && e.message || e).split('\n')[0]); await sleep(15000); }
  }
  log('⏱ Fin de la ejecución → guardo, leo los porcentajes del Home y escribo el resumen');
  await guardar(); await foto('final');
  await resumen();
  await guardar();   // AJUSTADA v21.16: el historial de la cuenta (idea 28) se escribe en resumen() → guardarlo
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
      if (!w.curso && curso) w.curso = curso;   // NUEVO v21.15: el curso que leyó el banco (antes salía "no se pudo leer")
      rep = fs.existsSync(path.join(OUT, 'reporte.txt')) ? fs.readFileSync(path.join(OUT, 'reporte.txt'), 'utf8') : '';
    } catch (e) { log('No pude armar el resumen:', e.message); }
    const nfallos = (rep.match(/REPORTE DE FALLOS \((\d+)\)/) || [])[1] || '0';
    // NUEVO v21.8: lo que vio el bot en My Progress (tests < 100 y lecciones sin terminar)
    let mapa = null; try { mapa = await page.evaluate(() => JSON.parse(localStorage.getItem('ed:progress:v1') || 'null')); } catch (e) {}
    const bajos = mapa ? mapa.unidades.flatMap(u => u.lecciones.filter(l => typeof l.test === 'number' && l.test < 100).map(l => `U${u.n} L${l.n} ${l.nombre} (${l.test} %)`)) : [];
    // AJUSTADA v21.12: sin las filas vacías de My Progress ("U1 L0 ·") y el Unit Test como "U1 Unit Test" (zips de Roy y Mateo)
    const sinTerminar = mapa ? mapa.unidades.filter(u => !u.locked).flatMap(u => u.lecciones.filter(l => !l.terminado && (l.nombre || '').trim()).map(l => l.n ? `U${u.n} L${l.n} ${l.nombre}` : `U${u.n} ${l.nombre}`)) : [];
    const tab = await tablero(true, w.completion != null ? w : null);   // NUEVO v21.13
    let md = [
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
    // NUEVO v21.16 — REPORTES Y DIAGNÓSTICO (ideas 18–28): agrupados, nuevo/conocido, salud, tiempos, pantallas nuevas,
    // versión, historial y un texto corto para pegarle a la IA
    let extra = '';
    try {
      const L = await page.evaluate(() => { const g = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }; return { cat: g('ed:catalogo:v1'), tab: g('ed:tablero:v1'), sw: g('ed:sweep:v1'), hist: g('ed:historial:v1') }; }).catch(() => ({}));
      const RC = path.join(OUT, 'reporte-completo.json');
      const reps = fs.existsSync(RC) ? JSON.parse(fs.readFileSync(RC, 'utf8')) : [];
      const catC = (L.cat || {})[w.curso || curso] || null, corrida = L.sw && (L.sw.inicio || L.sw.corrida);
      const grupos = Diag.agrupar(reps, catC, corrida), salud = Diag.salud(L.tab, reps), tiempos = Diag.tiempos(L.tab), nuevas = Diag.nuevas(catC, corrida);
      const vbot = (BOT.match(/const V = '([^']+)'/) || [])[1] || '?';
      // historial por cuenta (se guarda en la memoria de la cuenta): inicio y fin de cada corrida
      const hist = (Array.isArray(L.hist) ? L.hist : []).concat([{ fecha: new Date().toISOString(), curso: w.curso || curso, v: vbot, inicio: wInicio, fin: { completion: w.completion ?? null, avg: w.avg ?? null }, minutos: Math.round((Date.now() - t0) / 60000), salud }]).slice(-20);
      await page.evaluate(h => { try { localStorage.setItem('ed:historial:v1', JSON.stringify(h)); } catch (e) {} }, hist).catch(() => {});
      extra = ['', `### 🩺 Diagnóstico de la corrida · bot v${vbot}${salud != null ? ` · salud **${salud}/100**` : ''}${frenoMotivo ? ' · 🛑 frenada: ' + frenoMotivo : ''}`,
        grupos.length ? '| Fallo | Veces | Dónde | ¿Nuevo? |\n|---|---|---|---|\n' + grupos.map(g => `| ${g.tipo} | ${g.veces} | ${g.donde.slice(0, 3).join(' · ')} | ${g.conocido ? 'ya pasaba' : '🆕 nuevo'} |`).join('\n') : '✅ Sin fallos.',
        tiempos.length ? '**Minutos por unidad (dónde se va el tiempo):** ' + tiempos.slice(0, 8).map(x => `U${x.unidad} ${x.minutos} min`).join(' · ') : '',
        nuevas.length ? '**🆕 Pantallas que el bot vio por primera vez en este nivel:** ' + nuevas.slice(0, 10).map(x => `${x.kind} (${x.donde ? x.donde.split('|').slice(1, 3).join(' · ') : ''})`).join(' · ') : '',
        hist.length > 1 ? '**Historial de esta cuenta:** ' + hist.slice(-5).map(h => `${String(h.fecha).slice(5, 10)}: ${h.inicio ? h.inicio.completion + '→' : ''}${h.fin.completion ?? '?'} % / ${h.inicio ? h.inicio.avg + '→' : ''}${h.fin.avg ?? '?'} %`).join(' · ') : ''].filter(Boolean).join('\n\n');
      fs.writeFileSync(path.join(OUT, 'diagnostico.json'), JSON.stringify({ salud, grupos, tiempos, nuevas, historial: hist, freno: frenoMotivo, v: vbot }, null, 1));
      fs.writeFileSync(path.join(OUT, 'resumen-para-ia.txt'), Diag.paraIA({ nombre: `${NOMBRE} (cuenta ${CUENTA})`, curso: w.curso || curso, version: vbot, grupos, reportes: reps, salud, widgets: w }));
    } catch (e) { log('No pude armar el diagnóstico:', e.message); }
    md += extra + '\n';
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
    // NUEVO v21.16: el bot pasó a OTRO curso del carrusel (Beginners 1 → 2): su tablero va en un comentario aparte
    if (curso) { log(`🎠 Cambio de curso: ${curso} → ${c} (tablero nuevo para este curso)`); PUB.id = null; PUB.cuenta = CUENTA + '-' + Banco.slug(c); }
    curso = c; banco = Banco.leer(BANCO_DIR, curso);
    const nCat = Object.keys((banco.catalogo && banco.catalogo.lugares) || {}).length;   // NUEVO v21.16
    if (!Banco.contar(banco) && !nCat && !Object.keys(banco.aprendido || {}).length) { log(`📚 Curso: ${curso} · el banco de este curso todavía está vacío (esta cuenta lo empieza; nivel nuevo → el Explorador cataloga)`); return; }
    try {
      const r = await page.evaluate(({ b, K }) => {
        const g = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
        const ans = g(K.answers, {}), t2 = g(K.testAns, {}), kn = g(K.known, []);
        const antes = Object.keys(t2).length;
        for (const [q, a] of Object.entries(b.answers || {})) if (!(q in ans)) ans[q] = a;
        for (const [k, qs] of Object.entries(b.testAns || {})) { t2[k] = t2[k] || {}; for (const [i, v] of Object.entries(qs || {})) if (!(i in t2[k])) t2[k][i] = v; }
        const s = new Set(kn); for (const k of (b.known || [])) if (b.testAns && b.testAns[k] && Object.keys(b.testAns[k]).length) s.add(k);
        localStorage.setItem(K.answers, JSON.stringify(ans)); localStorage.setItem(K.testAns, JSON.stringify(t2)); localStorage.setItem(K.known, JSON.stringify([...s]));
        // NUEVO v21.16: lo aprendido por el Explorador en otras cuentas (lo de esta cuenta manda)
        if (K.aprendido && b.aprendido) { const ap = g(K.aprendido, {}); for (const [f, v] of Object.entries(b.aprendido)) if (!(f in ap)) ap[f] = v; localStorage.setItem(K.aprendido, JSON.stringify(ap)); }
        // NUEVO v21.16: el catálogo de ESTE nivel que armaron otras cuentas (lo de esta cuenta manda, salvo que allá se marcó)
        if (K.catalogo && b.catalogo && b.curso) { const cat = g(K.catalogo, {}); const mio = cat[b.curso] = cat[b.curso] || { lugares: {}, firmas: {} }; mio.lugares = mio.lugares || {}; mio.firmas = mio.firmas || {};
          for (const [k, v] of Object.entries(b.catalogo.lugares || {})) if (!mio.lugares[k] || (mio.lugares[k].estado !== 'ok' && v.estado === 'ok')) mio.lugares[k] = v;
          for (const [k, v] of Object.entries(b.catalogo.firmas || {})) if (!mio.firmas[k]) mio.firmas[k] = v;
          try { localStorage.setItem(K.catalogo, JSON.stringify(cat)); } catch (e) {} }
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
    // NUEVO v21.16 (idea 28): con cuánto EMPEZÓ esta corrida (el tablero muestra "93 % (empezó en 81 %)") y la salud (idea 20)
    if (!wInicio && s.widgets && s.widgets.completion != null) wInicio = { completion: s.widgets.completion, avg: s.widgets.avg };
    datos.inicio = wInicio; datos.salud = Diag.salud(t, null); datos.freno = frenoMotivo;
    // AJUSTADA v21.16: + marcas invisibles para el panel del teléfono y el job "preparar" (¿corre, terminó, en qué corrida?)
    const estado = fin ? (pararYa ? 'parado' : 'fin') : 'corriendo', ah = t && t.ahora;
    const blob = { cuenta: String(CUENTA), huella, nombre: NOMBRE, curso: datos.curso, comp: datos.widgets.completion ?? null, avg: datos.widgets.avg ?? null, ini: wInicio, estado, run: process.env.GITHUB_RUN_ID || '',
      login: loginEstado, ahora: ah ? `U${ah.u} · L${ah.l} · ${ah.paso || ''}${ah.contador ? ' ' + ah.contador : ''}` : null, min: datos.minutos, salud: datos.salud, freno: frenoMotivo, hora: new Date().toISOString(), v: (BOT.match(/const V = '([^']+)'/) || [])[1] || null,
      tot: datos.mapa && datos.mapa.widgets && datos.mapa.widgets.tiempo ? `${datos.mapa.widgets.tiempo.h} h ${datos.mapa.widgets.tiempo.m} min` : null };
    const md = dibujar(Object.assign({ titulo: `${NOMBRE} (cuenta ${CUENTA})` }, datos)) +
      `\n<!-- estado:${estado} run:${process.env.GITHUB_RUN_ID || ''} cuenta:${CUENTA} -->\n<!-- datos:${Buffer.from(JSON.stringify(blob)).toString('base64')} -->`;
    try { fs.writeFileSync(path.join(OUT, 'tablero.md'), md); } catch (e) {}
    const ok = await PUB.publicar(md);   // AJUSTADA v21.13: con el nombre (Hugo: "colócales sus nombres para saber quiénes son")
    if (!ok && PUB.ultimoError && !PUB.avisado) { PUB.avisado = true; log('⚠ No pude actualizar el tablero en vivo:', PUB.ultimoError); }
    return md;
  }

  async function guardar() {
    try {
      const datos = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^ed:/.test(k) && k !== 'ed:running:v1') o[k] = localStorage.getItem(k); } return o; });
      if (Object.keys(datos).length) fs.writeFileSync(EST, JSON.stringify(datos));
      // NUEVO v21.16: lo que el Explorador aprendió (qué acción marcó cada tipo de pantalla) también va en el zip
      if (datos['ed:aprendido:v1']) { try { fs.writeFileSync(path.join(OUT, 'aprendido.json'), JSON.stringify(JSON.parse(datos['ed:aprendido:v1']), null, 1)); } catch (e) {} }
      // NUEVO v21.13: lo cosechado por esta cuenta va al banco de SU curso (lo de la cuenta manda)
      if (curso) { banco = Banco.mezclar(Object.assign(Banco.desdeLocal(datos, curso), { curso }), banco || Banco.vacio(curso)); banco.curso = curso; Banco.escribir(BANCO_OUT, banco); }
      // NUEVO v21.16: el catálogo de este nivel (qué tipo de ejercicio hay en cada paso, cómo se marcó, dumps de ejemplo)
      if (datos['ed:catalogo:v1']) { try { fs.writeFileSync(path.join(OUT, 'catalogo.json'), JSON.stringify(JSON.parse(datos['ed:catalogo:v1']), null, 1)); } catch (e) {} }
      const rep = await page.evaluate(() => (window.__ed && window.__ed.reportText ? window.__ed.reportText() : null)).catch(() => null);
      if (rep) fs.writeFileSync(path.join(OUT, 'reporte.txt'), rep);
      // NUEVO v21.15: el navegador guarda solo los últimos 40 fallos (a todas las cuentas se les perdieron los primeros).
      // Aquí se juntan TODOS los de la corrida, por su número fijo, en salida/reporte-completo.json.
      try {
        const todos = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ed:report:v1') || '[]'); } catch (e) { return []; } });
        const RC = path.join(OUT, 'reporte-completo.json');
        const prev = fs.existsSync(RC) ? JSON.parse(fs.readFileSync(RC, 'utf8')) : [];
        const ya = new Set(prev.map(e => e.num || e.clave + e.hora));
        for (const e of todos) { const k = e.num || e.clave + e.hora; if (!ya.has(k)) { ya.add(k); prev.push(e); } }
        prev.sort((a, b) => (a.num || 0) - (b.num || 0));
        fs.writeFileSync(RC, JSON.stringify(prev, null, 1));
      } catch (e) {}
      const sw = await page.evaluate(() => localStorage.getItem('ed:sweep:v1')).catch(() => null);
      if (sw) fs.writeFileSync(path.join(OUT, 'barrido.json'), sw);
      log(`💾 Memoria guardada (${Object.keys(datos).length} claves)`);
    } catch (e) { log('No pude guardar:', e.message); }
  }
})().catch(e => { console.error('Error general:', e); process.exit(1); });
