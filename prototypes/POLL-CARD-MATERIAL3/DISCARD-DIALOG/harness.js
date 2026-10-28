/*
  HARNESS for discard-dialog.html (REQUIREMENT Not Saved Dialog Box). It holds
  the two production call sites of confirmDiscard() as they must change, each
  marked "M3:", around stand-ins for what they call:

  - adminCard.js line 964, the editing card's Cancel;
  - adminList.js line 424 (guardNavigation), the admin page's back link.

  Typing in the field marks it dirty, as the editing card does. The note line
  reports the outcome; nothing is saved, discarded or navigated for real. Theme
  sets data-theme on <html>, read from ?theme= and written back where the
  browser allows (a page opened from file:// may not rewrite its URL).
*/
(function () {
  'use strict';

  const SAMPLE_NOTE = '(sample only)';
  const themePicker = document.getElementById('themePicker');
  const noteEl = document.getElementById('prototypeNote');
  const field = document.getElementById('standInTitle');
  const cancel = document.getElementById('standInCancel');
  const backLink = document.querySelector('.admin-back-link');
  const original = field.value;

  // STAND-IN: adminCard.js keeps `dirty` per editing card.
  let dirty = false;
  field.addEventListener('input', () => {
    dirty = field.value !== original;
    noteEl.textContent = '';
  });

  function note(text) {
    noteEl.textContent = text;
  }

  // The page dialog, with a note when the edits are kept (production does
  // nothing visible then).
  function confirmDiscard() {
    return window.DiscardDialog.confirmDiscard().then((discard) => {
      if (!discard) note('Kept editing');
      return discard;
    });
  }

  // STAND-IN: adminCard.js cancelEdit() returns the card to read-only.
  async function cancelEdit() {
    const hadEdits = dirty;
    field.value = original;
    dirty = false;
    note((hadEdits ? 'Discarded: ' : '') + 'the card returns to read-only ' + SAMPLE_NOTE);
  }

  // STAND-IN: the editing controller adminList.js asks for.
  function editingController() {
    return {
      isDirty: () => dirty,
      confirmDiscard: confirmDiscard,
      releaseSession: () => Promise.resolve(),
    };
  }

  // ---- adminCard.js line 964: the editing card's Cancel ----
  // M3: the handler awaits the page dialog instead of window.confirm.
  cancel.addEventListener('click', async () => {
    if (!dirty || await confirmDiscard()) void cancelEdit();
  });

  // ---- adminList.js guardNavigation(): the back link ----
  // M3: the handler is async and awaits the page dialog. preventDefault stays
  // before the await, so the link never follows while the dialog is open.
  backLink.addEventListener('click', async (event) => {
    const controller = editingController();
    if (!controller) return;
    event.preventDefault();
    const hadEdits = controller.isDirty();
    if (controller.isDirty() && !(await controller.confirmDiscard())) return;
    controller.releaseSession().then(() => {
      // STAND-IN: production calls window.location.assign(backLink.getAttribute("href")).
      dirty = false;
      field.value = original;
      note((hadEdits ? 'Discarded: ' : '') + 'the page goes home ' + SAMPLE_NOTE);
    });
  });

  function applyTheme() {
    if (themePicker.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = themePicker.value;
  }

  themePicker.addEventListener('change', () => {
    applyTheme();
    try {
      history.replaceState(null, '', '?theme=' + themePicker.value);
    } catch {
      // A page opened from file:// may not rewrite its URL; the choice still applies.
    }
  });

  const theme = new URLSearchParams(location.search).get('theme');
  themePicker.value = [...themePicker.options].some((o) => o.value === theme) ? theme : 'system';
  applyTheme();
})();
