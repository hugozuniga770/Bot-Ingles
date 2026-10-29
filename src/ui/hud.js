// =====================================================================
//  HUD — cajita flotante con estado y botón Iniciar/Parar
// ---------------------------------------------------------------------
//  
//  DEPENDE DE: window.__ed
//  EXPONE:     HUD
// =====================================================================

class HUD {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'ed-autopilot-hud';
    Object.assign(this.el.style, { position: 'fixed', bottom: '70px', right: '14px', width: '250px', background: 'rgba(20,26,38,.95)', color: '#f1f2f6', borderRadius: '10px', border: '1px solid rgba(255,255,255,.15)', zIndex: 999999, font: '12px sans-serif', padding: '10px' });
    document.body.appendChild(this.el);
    this.render();
    window.__ed._hudTimer = setInterval(() => this.render(), 2000);
  }
  render() {
    const run = window.__ed._running;
    let kind = '';
    try { kind = window.__ed.kind(); } catch (e) {}
    this.el.innerHTML = `<b>ED v${V} OOP</b> [${run ? '🟢 Activo' : '🔴 Pausa'}]<br><span style="color:#a4b0be">${kind}</span><br>${window.__ed._lastMsg ? `<span style="color:#ff6b6b">🛑 ${window.__ed._lastMsg.slice(0, 160)}</span><br>` : ''}
      <button id="ed_t" style="margin-top:6px;padding:4px 8px;background:${run?'#e74c3c':'#2ecc71'};color:#fff;border:0;border-radius:4px;cursor:pointer">${run?'Parar':'Iniciar'}</button>`;
    this.el.querySelector('#ed_t').onclick = () => { run ? window.__ed.stop() : window.__ed.auto(); };
  }
}
