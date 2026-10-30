// =====================================================================
//  NAVEGACIÓN — lección/step actual, navegador de tareas, Next y popups
// ---------------------------------------------------------------------
//  handleModals() cierra popups (iframe colorbox + Bootstrap).
//  goNext() pulsa Next/Submit y vuelve a cerrar popups.
//  DEPENDE DE: utils/dom.js, core/config.js
//  EXPONE:     NavigationManager
// =====================================================================

class NavigationManager {
  static lessonLabel() { return txt(q('.learning__dropDownListTitleW--lessons')); }
  static stepLabel() { return txt(q('.learning__dropDownListTitleW--steps')); }
  static testKey() { return this.lessonLabel() + '||' + this.stepLabel(); }

  static counter() {
    const m = [...(document.body.innerText || '').matchAll(/(?<![:\d])(\d{1,2})\s*\/\s*(\d{1,2})(?![:\d])/g)];
    if (!m.length) return null;
    const x = m[m.length - 1];
    return { i: +x[1], n: +x[2], s: x[1] + '/' + x[2] };
  }

  static tasks() {
    const seen = new Set();
    return qa('.learning__tasksNav_task').map(e => {
      const n = parseInt(txt(e), 10);
      const tip = txt(q('.learning__tasksNav_taskTooltip', e));
      return { el: e, n, cur: /--current/.test(e.className), done: /--done/.test(e.className) || RE_DONE.test(tip), tip };
    }).filter(t => !isNaN(t.n) && !seen.has(t.n) && seen.add(t.n));
  }

  static curTask() { return this.tasks().find(t => t.cur) || null; }
  static taskDone(n) { const t = this.tasks().find(x => x.n === n); return !!(t && t.done); }

  static nextBtn() { return qv('a.tasksBtnext.learning__nextItemLink') || qv('a.tasksBtnext.learning__submitTestLink') || qv('.learning__submitTest a') || qv('.learning__submitTest') || qa('a, button').find(el => vis(el) && /submit|next|siguiente/i.test(txt(el))); }

  // PARA QUÉ: cierra los popups. Parte 1 (igual que v19.6): popups en iframe colorbox
  // ("haven't answered" → Submit). Parte 2 (NUEVA, de v17): popups Bootstrap
  // ("Are you sure…", "The recording has been sent to your teacher") → OK.
  static async handleModals() {
    let handled = false;
    for (let k = 0; k < 4; k++) {
      const f = qa('iframe#colorBoxIframe, iframe[id*="colorBox"]').find(x => x.getBoundingClientRect().height > 50);
      if (!f) break;
      let d; try { d = f.contentDocument; } catch (e) { break; }
      if (!d || !d.body) break;
      const body = d.body.innerText || '';
      let b = null;
      if (RE_SUBMIT_POPUP.test(body)) {
        b = d.querySelector('input.okButton, a.okButton, input[value*="Submit" i], a[class*="submit" i], button');
      }
      if (!b) b = d.querySelector('a.utils__cancelLInk');      // RECUPERADA de v17: "Reminder" → Continue (NO "Stay")
      if (!b) b = d.querySelector('input.okButton, a.okButton');
      if (!b) break;
      clickInFrame(b); handled = true;
      // AJUSTADA v20.7: antes 1,5 s fijos; ahora hasta que el popup se cierre (mismo tope) + respiro
      await waitFor(() => !qa('iframe#colorBoxIframe, iframe[id*="colorBox"]').some(x => x.getBoundingClientRect().height > 50), 1500, 150);
      await sleep(300);
    }
    if (await this.handleBootstrapModals()) handled = true;
    return handled;
  }

  // NUEVA: popups Bootstrap (no iframe). Sin esto el aviso de "enviado al profesor" se quedaba abierto.
  static async handleBootstrapModals() {
    const cm = qa('.modalW_confirm, .modalW_alert, #alertModal, .confirmPopup__main').find(vis);
    if (!cm) return false;
    const ok = q('input.okButton.utils__BSOKBtn', cm) || q('input.okButton', cm) || qv('input.okButton.utils__BSOKBtn');
    let did = false;
    if (ok) { click(ok); did = true; await sleep(700); }
    qa('.modal-backdrop').forEach(e => { try { e.remove(); } catch (_) {} });
    try { document.body.classList.remove('modal-open'); document.body.style.overflow = ''; } catch (e) {}
    return did;
  }

  // NUEVA v20.7: "foto" de la pantalla (lección, step, contador, tarea actual) para saber si ya cambió
  static screenSig() { const c = this.counter(), t = this.curTask(); return [this.lessonLabel(), this.stepLabel(), c && c.s, t && t.n].join('|'); }
  static modalOpen() {
    return qa('iframe#colorBoxIframe, iframe[id*="colorBox"]').some(x => x.getBoundingClientRect().height > 50) ||
      qa('.modalW_confirm, .modalW_alert, #alertModal, .confirmPopup__main').some(vis);
  }

  static async goNext() {
    await this.handleModals();
    const nx = this.nextBtn();
    if (!nx) return false;
    const isSubmit = /submitTest|submit/i.test(nx.className || '') || /submitTest|submit/i.test(nx.parentElement?.className || '') || /submit/i.test(txt(nx));
    const sig = this.screenSig();
    click(nx);
    // AJUSTADA v20.7: antes espera FIJA de 1,8 s (2,5 s en Submit). Ahora espera solo hasta que la
    // pantalla cambie o aparezca un popup (mismo tope), + un respiro corto para que termine de dibujarse.
    const cambio = await waitFor(() => this.screenSig() !== sig || this.modalOpen(), isSubmit ? 2500 : 1800, 150);
    if (cambio) await sleep(isSubmit ? 700 : 350);
    await this.handleModals();
    return true;
  }
}
