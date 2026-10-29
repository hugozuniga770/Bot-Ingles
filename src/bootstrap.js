// =====================================================================
//  BOOTSTRAP — versión y limpieza de instalaciones anteriores
// ---------------------------------------------------------------------
//  Si ya hay una versión del bot cargada en la pestaña, la detiene y borra su HUD
//  antes de instalar esta. Si es la MISMA versión, no hace nada.
//  DEPENDE DE: nada (es lo primero que se ejecuta)
//  EXPONE:     V
// =====================================================================

const V = '20.4';   // ← ÚNICO lugar donde se cambia la versión
if (window.__ed && window.__ed._v === V) { console.log('%c[ED]', 'color:#27ae61', 'v' + V + ' ya instalado → __ed.help()'); return; }
try { window.__ed && window.__ed.stop && window.__ed.stop(); } catch (e) {}
try { clearInterval(window.__ed && window.__ed._hudTimer); } catch (e) {}
try { document.getElementById('ed-autopilot-hud')?.remove(); } catch (e) {}
try {
  document.querySelectorAll('body > div').forEach(d => {
    if (d.style && d.style.position === 'fixed' && /^ED v\d+\.\d+ OOP/.test(d.textContent || '')) d.remove();
  });
} catch (e) {}
