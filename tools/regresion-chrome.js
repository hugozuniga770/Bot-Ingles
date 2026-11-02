/* =====================================================================
   tools/regresion-chrome.js — las MISMAS pantallas de tools/regresion.js, pero en Chrome real (Playwright)
   ---------------------------------------------------------------------
   NUEVO v21.9: para entornos de IA donde `npm install` no tiene internet (sin jsdom no corre `npm test`).
   Lee FIX y el snapshot de tools/regresion.js y copia su simulación (tiempo virtual, clics registrados...).
   Comprobado el 01/11: con v21.8 da EXACTAMENTE el snapshot en las 49 pantallas. Igual, el ✓ de GitHub
   (flujo `verificar`, con jsdom) es la prueba oficial.

     NODE_PATH=<carpeta con playwright> node tools/regresion-chrome.js                → compara todo
     node tools/regresion-chrome.js /tmp/viejo.js replayLegacyDDL4                    → otro bot, una pantalla
     node tools/regresion-chrome.js --actualizar                                       → guarda el snapshot
   (Playwright suele estar global: NODE_PATH="$(npm root -g):$(dirname "$(dirname "$(which node)")")/lib/node_modules")
   ===================================================================== */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const REPO = path.join(__dirname, '..');
const args = process.argv.slice(2);
const actualizar = args.includes('--actualizar'); if (actualizar) args.splice(args.indexOf('--actualizar'), 1);
const CODEFILE = args[0] && args[0].endsWith('.js') ? args.shift() : path.join(REPO, 'dist', 'ed-autopilot.js');
let jsonOut = null; const ji = args.indexOf('--json'); if (ji >= 0) { jsonOut = args[ji + 1]; args.splice(ji, 2); }
const only = args;
const CODE = fs.readFileSync(CODEFILE, 'utf8');
const src = fs.readFileSync(path.join(REPO, 'tools', 'regresion.js'), 'utf8');
const start = src.indexOf('\n', src.indexOf('const SNAP')) + 1;
const end = src.indexOf('// Pantallas falsas mínimas');
const helpers = src.slice(start, end);
const { FIX, LS_REPLAY } = vm.runInNewContext(helpers + '\n;({ FIX, LS_REPLAY })', { JSON });

async function run(browser, name) {
  const fx = FIX[name];
  const isStr = typeof fx === 'string';
  const html = isStr ? fx : fx.html;
  const ls = isStr ? (name === 'replay' ? LS_REPLAY : null) : fx.ls;
  const url = (!isStr && fx.url) || 'https://ed.engdis.com/upbstacruz/learningArea';
  const steps = (!isStr && fx.steps) || 1;
  const ctx = await browser.newContext();
  await ctx.route('**/*', r => r.fulfill({ status: 200, contentType: 'text/html', body: `<body>${html}</body>` }));
  const page = await ctx.newPage();
  await page.goto(url);
  const out = await page.evaluate(async ({ CODE, helpers, name, ls, steps, isStr }) => {
    const w = window, trace = [];
    let now = 1e12;
    w.Date.now = () => now;
    const ch = new MessageChannel(), cola = [];
    ch.port1.onmessage = () => { const f = cola.shift(); if (f) f(); };
    w.setTimeout = (fn, ms) => { now += (ms || 0); cola.push(fn); ch.port2.postMessage(0); return 1; };
    w.setInterval = () => 0; w.clearInterval = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    Object.defineProperty(w.HTMLElement.prototype, 'innerText', { get() { return this.textContent; }, configurable: true });
    w.document.elementFromPoint = () => null;
    w.Element.prototype.getBoundingClientRect = function () { return { left: 10, top: 10, right: 110, bottom: 40, width: 100, height: 30 }; };
    Object.defineProperty(w.HTMLElement.prototype, 'offsetParent', { get() { return this.parentElement; }, configurable: true });
    const lbl = el => (el.className || el.tagName) + ':' + (el.textContent || '').trim().slice(0, 15);
    const oc = w.HTMLElement.prototype.click;
    w.HTMLElement.prototype.click = function () { trace.push('click ' + lbl(this)); return oc.call(this); };
    const od = w.EventTarget.prototype.dispatchEvent;
    w.EventTarget.prototype.dispatchEvent = function (e) { if (e.type === 'pointerdown' || e.type === 'pointerup') trace.push(e.type + ' ' + (this.className ? lbl(this) : 'doc')); return od.call(this, e); };
    w.console.log = w.console.warn = w.console.error = w.console.table = () => {};
    w.localStorage.clear();
    for (const [k, v] of Object.entries(ls || {})) w.localStorage.setItem(k, v);
    w.__edNoAutoResume = true;
    (0, eval)(CODE);
    if (!isStr) { const F = new Function(helpers + '\n;return FIX;')(); if (F[name].setup) F[name].setup(w); }
    const kind = w.__ed.kind();
    let r; for (let i = 0; i < steps; i++) { try { r = await w.__ed.step(); } catch (e) { r = 'ERR ' + e.message; } }
    const out = { kind, r: JSON.stringify(r), trace: trace.join(' | '), ls: w.localStorage.getItem('ed:testAns:v2') };
    if (!isStr) { const F = new Function(helpers + '\n;return FIX;')(); if (F[name].verificar) { try { out.v = F[name].verificar(w); } catch (e) { out.v = 'ERR ' + e.message; } } }
    return out;
  }, { CODE, helpers, name, ls, steps, isStr });
  await ctx.close();
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const names = only.length ? only : Object.keys(FIX);
  const actual = {};
  for (const n of names) {
    try { actual[n] = await Promise.race([run(browser, n), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 60000))]); }
    catch (e) { actual[n] = { error: String(e.message || e) }; }
  }
  await browser.close();
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(actual, null, 2));
  if (actualizar) {
    if (only.length || CODEFILE !== path.join(REPO, 'dist', 'ed-autopilot.js')) { console.error('--actualizar solo con todas las pantallas y el dist/ del repo'); process.exit(1); }
    fs.writeFileSync(path.join(REPO, 'tools', 'regresion.snapshot.json'), JSON.stringify(actual, null, 2) + '\n');
    console.log('✓ snapshot guardado (' + Object.keys(actual).length + ' pantallas)'); return;
  }
  const snap = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'regresion.snapshot.json'), 'utf8'));
  let dif = 0;
  for (const n of names) {
    const ok = JSON.stringify(snap[n]) === JSON.stringify(actual[n]);
    if (!ok) dif++;
    console.log((ok ? '  ✓ ' : '  ✗ ') + n.padEnd(22) + (actual[n].kind || actual[n].error || ''));
    if (!ok && process.env.DETALLE) console.log('     esperado:', JSON.stringify(snap[n]), '\n     actual:  ', JSON.stringify(actual[n]));
  }
  console.log(dif ? `✗ ${dif} de ${names.length} distintas del snapshot` : `✓ ${names.length} pantallas iguales al snapshot`);
  if (dif) process.exitCode = 1;
})();
