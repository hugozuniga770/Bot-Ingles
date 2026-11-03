// =====================================================================
//  BOOTSTRAP — versión y limpieza de instalaciones anteriores
// ---------------------------------------------------------------------
//  Si ya hay una versión del bot cargada en la pestaña, la detiene y borra su HUD
//  antes de instalar esta. Si es la MISMA versión, no hace nada.
//  DEPENDE DE: nada (es lo primero que se ejecuta)
//  EXPONE:     V
// =====================================================================

const V = '21.17';   // ← ÚNICO lugar donde se cambia la versión

// NUEVO v21.7 — dentro de un MARCO (iframe) NO corre el bot completo. En la nube se inyectaba en todos los
// marcos y llegaba a haber varios bots a la vez (corrida de Nelson, 01/11). En un marco solo se atiende el aviso
// de ED "You haven't submitted your test" (MsgPage.html): Continue si el bot está saliendo, Cancel si no.
if (window.top !== window.self) {
  const atender = () => {
    try {
      const ok = document.querySelector('#popupButtonsWrapper #btnOk, .popupButtonsWrapper #btnOk');
      if (!ok || !/submitted your test|no has enviado|resultados no se/i.test(document.body.innerText || '')) return;
      const saliendo = +(localStorage.getItem('ed:saliendo') || 0) > Date.now() - 120000;
      const b = saliendo ? ok : (document.getElementById('btnCancel') || ok);
      console.log('%c[ED]', 'color:#27ae61', '🪟 Aviso de test sin enviar → ' + (saliendo ? 'Continue (salgo)' : 'Cancel (vuelvo al test)'));
      b.click();
    } catch (e) {}
  };
  setTimeout(atender, 800); setTimeout(atender, 2500);
  return;
}
if (window.__ed && window.__ed._v === V) { console.log('%c[ED]', 'color:#27ae61', 'v' + V + ' ya instalado → __ed.help()'); return; }
try { window.__ed && window.__ed.stop && window.__ed.stop(); } catch (e) {}
try { clearInterval(window.__ed && window.__ed._hudTimer); } catch (e) {}
try { document.getElementById('ed-autopilot-hud')?.remove(); } catch (e) {}
try {
  document.querySelectorAll('body > div').forEach(d => {
    if (d.style && d.style.position === 'fixed' && /^ED v\d+\.\d+ OOP/.test(d.textContent || '')) d.remove();
  });
} catch (e) {}
