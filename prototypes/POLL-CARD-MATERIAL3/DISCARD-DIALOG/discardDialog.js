/*
  NOT SAVED DIALOG — confirmDiscard() from src/public/adminCard.js (line 433)
  (REQUIREMENT Not Saved Dialog Box). Production returns
  window.confirm("Any edits will be lost. Continue?"), a box the browser draws
  and no stylesheet can reach. Rewritten here as a page dialog, each change
  marked "M3:", to carry over in the merge (024 Step 2):

  - It returns a Promise<boolean>; its two callers await it (see harness.js,
    where both production call sites are shown as they must change).
  - It reuses Tabs.modal's markup (.modal-backdrop, .modal, .modal-text,
    .modal-actions), so the M3 dialog layer of TABS-MODAL/ dresses it;
    discard-dialog-m3.css adds the headline and the two actions.
  - role="alertdialog", named by its headline and described by its text (3a).
  - Keep editing, Escape and a click on the scrim keep the edits; only Discard
    discards. Focus starts on Keep editing, Tab and Shift+Tab stay on the two
    actions, and focus returns to the opener (4a).
*/
(function () {
  "use strict";

  // M3: a headline and action labels that say what they do, in place of
  // "Any edits will be lost. Continue?" with OK and Cancel.
  const DISCARD_HEADLINE = "Discard changes?";
  const DISCARD_TEXT = "Your edits will be lost.";

  let pending = null;

  function confirmDiscard() {
    // M3: one dialog at a time; a second call shares the open dialog's answer.
    if (pending) return pending;
    pending = new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      const box = document.createElement("div");
      box.className = "modal";
      box.setAttribute("role", "alertdialog");
      box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-labelledby", "discard-headline");
      box.setAttribute("aria-describedby", "discard-text");
      box.innerHTML =
        '<h2 class="modal-headline" id="discard-headline"></h2>' +
        '<p class="modal-text" id="discard-text"></p>' +
        '<div class="modal-actions">' +
        '<button type="button" class="tab-refresh modal-action modal-keep">Keep editing</button>' +
        '<button type="button" class="tab-refresh modal-action modal-discard">Discard</button>' +
        "</div>";
      box.querySelector(".modal-headline").textContent = DISCARD_HEADLINE;
      box.querySelector(".modal-text").textContent = DISCARD_TEXT;
      backdrop.appendChild(box);
      const keep = box.querySelector(".modal-keep");
      const discard = box.querySelector(".modal-discard");
      const before = document.activeElement;

      function close(answer) {
        document.removeEventListener("keydown", onKey);
        backdrop.remove();
        pending = null;
        if (before && before !== document.body && before.isConnected && before.focus) before.focus();
        resolve(answer);
      }
      function onKey(event) {
        if (event.key === "Escape") close(false);
        // Tab and Shift+Tab move between the dialog's two actions only.
        if (event.key === "Tab") {
          event.preventDefault();
          (document.activeElement === keep ? discard : keep).focus();
        }
      }
      keep.addEventListener("click", () => close(false));
      discard.addEventListener("click", () => close(true));
      backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(false); });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(backdrop);
      keep.focus();
    });
    return pending;
  }

  window.DiscardDialog = { confirmDiscard: confirmDiscard };
})();
