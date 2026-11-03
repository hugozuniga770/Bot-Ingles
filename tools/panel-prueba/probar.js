/* =====================================================================
   tools/panel-prueba/probar.js — prueba el PANEL DEL TELÉFONO contra una GitHub API FALSA (NUEVO v21.16)
   Teléfono emulado (iPhone 13): configurar → abrir con la clave → ver cuentas → correr todas → agregar una cuenta y
   correrla ya → parar una cuenta. Comprueba lo que el panel le pidió a "GitHub" y que el secret nuevo lo abre
   libsodium (PyNaCl) con la llave del repo falso.   NODE_PATH=<playwright> node tools/panel-prueba/probar.js [fotos]
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium, devices } = require('playwright');
const RAIZ = path.join(__dirname, '..', '..'), FOTOS = process.argv[2] || null, PUERTO = 8767;
const kp = JSON.parse(execFileSync('python3', ['-c', 'from nacl.public import PrivateKey;import base64,json;k=PrivateKey.generate();print(json.dumps({"sk":base64.b64encode(bytes(k)).decode(),"pk":base64.b64encode(bytes(k.public_key)).decode()}))']).toString());
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
const ahora = new Date().toISOString(), hace = m => new Date(Date.now() - m * 60000).toISOString();
const pedidos = [];
const comentarios = [
  { id: 1, html_url: 'https://github.com/x/y/issues/7#c1', body: '<!-- tablero-cuenta-1 -->\n## 👤 Nore (cuenta 1) — UPB High Intermediate 2\n<!-- estado:corriendo run:55 cuenta:1 -->\n<!-- datos:' + b64({ cuenta: '1', nombre: 'Nore', curso: 'UPB High Intermediate 2', comp: 93, avg: 98, ini: { completion: 81, avg: 93 }, estado: 'corriendo', run: '55', login: 'ok', ahora: 'U10 · L4 · Step 7: Personalized writing 1/2', min: 74, salud: 88, hora: hace(2), tot: '11 h 34 min' }) + ' -->', body_html: '<h2>👤 Nore (cuenta 1)</h2><table><tr><th>1 · Login</th><th>U1</th></tr><tr><td>✅</td><td>✅ 5/5</td></tr></table>' },
  { id: 2, html_url: 'https://github.com/x/y/issues/7#c2', body: '<!-- datos:' + b64({ cuenta: '2', nombre: 'Roy', curso: 'UPB Beginners 1', comp: 98, avg: 100, ini: { completion: 90, avg: 100 }, estado: 'fin', run: '54', login: 'ok', min: 330, salud: 95, hora: hace(95) }) + ' -->', body_html: '<p>Roy</p>' }];
const srv = http.createServer((req, res) => {
  let body = ''; req.on('data', d => { body += d; });
  req.on('end', () => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/panel/')) { const f = path.join(RAIZ, u.pathname); if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' })[path.extname(f)] || 'text/plain'); return res.end(fs.readFileSync(f)); }
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', '*');
    if (req.method === 'OPTIONS') return res.end();
    pedidos.push({ m: req.method, p: u.pathname, q: u.search, auth: req.headers.authorization, body: body ? JSON.parse(body) : null });
    const R = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    const p = u.pathname.replace('/repos/hugo/bot', '');
    if (req.headers.authorization !== 'Bearer github_pat_PRUEBA') { res.statusCode = 401; return R({ message: 'Bad credentials' }); }
    if (p === '') return R({ default_branch: 'main', permissions: { push: true } });
    if (p === '/issues') return R([{ number: 7, title: '📊 Tablero del bot (se actualiza solo mientras corre la nube)' }]);
    if (p === '/issues/7/comments' && req.method === 'GET') return R(comentarios);
    if (p === '/issues/7/comments' && req.method === 'POST') return R({ id: 3 });
    if (p === '/actions/workflows/nube.yml/runs') return R({ workflow_runs: [{ id: 55, name: 'nube', display_title: 'nube · todas · completar', status: 'in_progress', created_at: hace(80), run_started_at: hace(80), html_url: 'https://github.com/x/y/actions/runs/55' }, { id: 54, name: 'nube', display_title: 'nube · 2 · completar', status: 'completed', conclusion: 'success', created_at: hace(500), run_started_at: hace(500), updated_at: hace(95), html_url: 'https://github.com/x/y/actions/runs/54' }] });
    if (p === '/actions/runs/55/jobs') return R({ jobs: [{ name: 'preparar', status: 'completed' }, { name: 'correr 1,3', status: 'in_progress', started_at: hace(78), html_url: 'https://github.com/x/y/actions/runs/55/job/9' }] });
    if (p === '/actions/secrets') return R({ secrets: [{ name: 'ED_CUENTAS' }] });
    if (p === '/actions/secrets/public-key') return R({ key_id: 'k1', key: kp.pk });
    if (p === '/actions/secrets/ED_CUENTAS' && req.method === 'PUT') { res.statusCode = 201; return R({}); }
    if (p === '/actions/workflows/nube.yml/dispatches') { res.statusCode = 204; return res.end(); }
    if (/\/actions\/runs\/\d+\/cancel/.test(p)) { res.statusCode = 202; return R({}); }
    res.statusCode = 404; R({ message: 'no existe en la API falsa: ' + p });
  });
}).listen(PUERTO);
const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(Object.assign({}, devices['iPhone 13'], { locale: 'es-BO', colorScheme: process.env.ESQUEMA || 'light' }));
  const pg = await ctx.newPage(); const errores = []; pg.on('pageerror', e => errores.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  const foto = async n => { if (FOTOS) { fs.mkdirSync(FOTOS, { recursive: true }); await pg.screenshot({ path: path.join(FOTOS, n + '.png'), fullPage: false }); } };
  const clave = async () => { await pg.waitForSelector('#f-clave'); await pg.fill('#f-clave input', 'mi-clave-123'); await pg.click('#f-clave button'); await pg.waitForTimeout(1500); };
  await pg.goto(`http://localhost:${PUERTO}/panel/index.html?api=http://localhost:${PUERTO}`);
  await foto('1-primera-vez');
  await pg.fill('#f-setup [name=token]', 'github_pat_PRUEBA'); await pg.fill('#f-setup [name=repo]', 'hugo/bot');
  await pg.fill('#f-setup [name=lista]', 'nore1 claveA Nore\nroy2 claveB Roy'); await pg.fill('#f-setup [name=c1]', 'mi-clave-123'); await pg.fill('#f-setup [name=c2]', 'mi-clave-123');
  await pg.click('#f-setup button[type=submit]'); await pg.waitForSelector('#v-app:not([hidden])', { timeout: 20000 }); await pg.waitForTimeout(3500);
  const guardado = await pg.evaluate(() => localStorage.getItem('edpanel:v1'));
  ok(!/github_pat_PRUEBA|claveA/.test(guardado), 'en el teléfono el token y las contraseñas quedan CIFRADOS');
  // NUEVO v21.18: la primera vez se abre la ayuda
  ok(await pg.isVisible('#b-ok-ayuda'), 'la primera vez se abre la ayuda'); await foto('1b-ayuda'); await pg.click('#b-ok-ayuda'); await pg.waitForTimeout(300);
  const tarjetas = await pg.$$eval('.cuenta', as => as.map(a => a.innerText.replace(/\s+/g, ' ')));
  ok(tarjetas.length === 3 && /Nore/.test(tarjetas[0]) && /corriendo/.test(tarjetas[0]) && /93 %/.test(tarjetas[0]) && /Step 7/.test(tarjetas[0]), 'Nore: corriendo, 93 %, por dónde va');
  ok(/Roy/.test(tarjetas[1]) && /terminó/.test(tarjetas[1]), 'Roy: terminó');
  await foto('2-cuentas');
  await pg.click('#b-todas'); await clave();
  ok(await pg.isVisible('#b-deshacer'), '"Correr todas" se puede deshacer 5 s'); await pg.waitForTimeout(5600);
  const d1 = pedidos.filter(x => /dispatches/.test(x.p)).pop();
  ok(d1 && d1.body.inputs.cuentas === 'todas' && d1.body.ref === 'main', 'Correr todas → workflow nube con cuentas=todas');
  await pg.click('#b-agregar'); await pg.fill('#f-ag [name=u]', 'ana3'); await pg.fill('#f-ag [name=p]', 'claveC'); await pg.fill('#f-ag [name=n]', 'Ana'); await foto('3-agregar');
  await pg.click('#f-ag button'); await clave(); await pg.waitForTimeout(1500);
  const put = pedidos.filter(x => x.m === 'PUT' && /ED_CUENTAS/.test(x.p)).pop();
  const abierto = put ? execFileSync('python3', ['-c', `from nacl.public import PrivateKey,SealedBox;import base64;print(SealedBox(PrivateKey(base64.b64decode("${kp.sk}"))).decrypt(base64.b64decode("${put.body.encrypted_value}")).decode())`]).toString().trim() : '';
  ok(abierto === 'nore1 claveA Nore\nroy2 claveB Roy\nana3 claveC Ana', 'ED_CUENTAS reescrito con la cuenta nueva al final (libsodium lo abre)');
  const d2 = pedidos.filter(x => /dispatches/.test(x.p)).pop();
  ok(d2 && d2.body.inputs.cuentas === '3' && d2.body.inputs.por_maquina === '1', 'la cuenta nueva (línea 3) arranca YA en su propia máquina');
  await pg.click('.cuenta[data-id="1"] [data-a=parar]'); await clave();
  const orden = pedidos.filter(x => x.m === 'POST' && /comments/.test(x.p)).pop();
  ok(orden && /^<!-- orden:parar 1 de:panel -->/.test(orden.body.body), 'Parar Nore (comparte máquina con la 3) → orden en el issue, sin cancelar a la otra');
  // NUEVO v21.18: filtros, buscar, opciones de una cuenta, lista revisada
  await pg.click('#chips button[data-k=listas]'); await pg.waitForTimeout(200);
  ok((await pg.$$('.cuenta')).length === 0 && /Ninguna/.test(await pg.innerText('#lista-cuentas')), 'filtro "100/100": ninguna todavía');
  await pg.click('#chips button[data-k=""]'); await pg.fill('#buscar', 'roy'); await pg.waitForTimeout(200);
  ok((await pg.$$eval('.cuenta', a => a.map(x => x.dataset.id))).join() === '2', 'buscar "roy" → solo Roy');
  await pg.fill('#buscar', ''); await pg.selectOption('#orden', 'progreso'); await pg.waitForTimeout(200);
  ok((await pg.$$eval('.cuenta', a => a.map(x => x.dataset.id)))[0] === '3', 'orden "menos avance primero": la cuenta sin datos arriba');
  await pg.selectOption('#orden', '');
  await pg.click('.cuenta[data-id="2"] [data-a=mas]'); await pg.waitForTimeout(300); await foto('3b-opciones');
  await pg.click('[data-m=auditoria]'); await clave();
  const d3 = pedidos.filter(x => /dispatches/.test(x.p)).pop();
  ok(d3 && d3.body.inputs.cuentas === '2' && d3.body.inputs.modo === 'auditoria' && d3.body.inputs.minutos === '20', '⋯ → "Solo revisar" a Roy: modo auditoria, 20 min');
  await pg.click('.tabs button[data-t=t-ajustes]'); await pg.fill('#f-lista textarea', 'nore1 claveA Nore\nroy2 claveB Roy\nNORE1 otra Nore2\nsolo'); await pg.click('#f-lista button');
  await pg.waitForTimeout(300); const pr = await pg.innerText('.problemas').catch(() => '');
  ok(/Línea 3.*línea 1/.test(pr) && /Línea 4: le falta/.test(pr) && !/claveA|otra/.test(pr), 'la lista se revisa antes de subir (duplicado y falta contraseña; sin mostrar contraseñas)');
  await foto('6-lista-revisada'); await pg.click('[data-r="0"]'); await pg.click('.tabs button[data-t=t-cuentas]'); await pg.waitForTimeout(200);
  await pg.click('.cuenta[data-id="1"] [data-a=tablero]'); await pg.waitForTimeout(400); await foto('4-tablero'); await pg.click('.cerrar-hoja');
  await pg.click('.tabs button[data-t=t-corridas]'); await pg.waitForTimeout(300); await foto('5-corridas');
  ok(pedidos.every(x => x.auth === 'Bearer github_pat_PRUEBA'), 'todo con el token, solo a la API');
  ok(!errores.length, 'sin errores en la página' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await b.close(); srv.close();
  console.log(process.exitCode ? '✗ panel con fallas' : '✓ panel del teléfono: OK');
})();
