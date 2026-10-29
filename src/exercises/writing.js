// =====================================================================
//  WRITING — TinyMCE + AI Feedback
// ---------------------------------------------------------------------
//  Tipo(s) en detectKind(): writing
//  Se detecta por: iframe[id^="mce_"][id$="_ifr"]
//  CONGELADO — funciona, no tocar.
//  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
//  EXPONE:     WritingSolver (se une a PracticeSolver en exercises/index.js)
// =====================================================================

class WritingSolver {
  // ---------------------------------------------------------------
  // WRITING (TinyMCE + AI Feedback)                         [IGUAL — congelada]
  // PARA QUÉ: escribe el texto, guarda, pide AI Feedback y pulsa Done.
  // ---------------------------------------------------------------
  static async solveWriting() {
    log('✍️ [Writing] Escribiendo texto y solicitando AI feedback...');
    const edit = qv('.prWriting__editorEditBtn');
    if (edit && !qv('.prWriting__editorSaveBtn')) { click(edit); await sleep(900); }

    const ifr = qv('iframe[id^="mce_"][id$="_ifr"]');
    const text = CFG.writingText + ' This is a great experience for personal growth.';

    if (ifr) {
      const doc = ifr.contentDocument, win = ifr.contentWindow, body = doc && doc.body;
      if (body) {
        body.focus();
        body.innerHTML = `<p>${text}.</p>`;
        for (const evType of ['input', 'change', 'keyup']) {
          try { body.dispatchEvent(new win.Event(evType, { bubbles: true })); } catch (e) {}
        }
        await sleep(400);
      }
    }

    const save = qv('.prWriting__editorSaveBtn');
    if (save) {
      click(save);
      await waitFor(() => { const s = q('.prWriting__editorSaveBtn'); return !s || !vis(s) || /--saved/.test(s.className); }, 6000);
    }
    await sleep(800);

    if (CFG.useAIFeedback) {
      const btn = qv('.prWriting__action--AI, .prWriting__AIFeedbackBtn, .prWriting__btnAI');
      if (btn && !/disabled/i.test(btn.className)) {
        click(btn);
        await sleep(2500);
        const doneAI = await waitFor(() => qv('.prWriting__AIDoneBtn, .prWriting__action--submit, a.button.done, input.okButton'), 25000, 500);
        if (doneAI) { click(doneAI); await sleep(1500); }
      }
    }

    const doneBtn = await waitFor(() => qv('.prWriting__action--submit, .prWriting__doneBtn, a.button.done'), 8000, 400);
    if (doneBtn) { click(doneBtn); await sleep(1500); }
    return { did: 'writing_solved', words: wc(text) };
  }
}
