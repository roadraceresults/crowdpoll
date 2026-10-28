/*
  TABS MODAL — Tabs.modal from src/public/tabs.js (REQUIREMENT `Tabs.modal`
  dialog). The function below is copied verbatim, with its FIX027 comment;
  nothing else from tabs.js is needed to show the dialog.
  REQUIREMENT Use Material 3 For `Tabs.modal` Dialog (clarification 3a) adds
  two edits, each marked "M3:", to carry over in the merge: the dialog is
  named by its message, and Tab stays on OK.
*/
(function () {
  "use strict";

  /* FIX027: a modal message with one OK button, for what a passing notice would
     undersell. OK, Escape and a click on the backdrop dismiss it; focus goes to
     the button and returns to where it was. */
  function modal(text) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const box = document.createElement("div");
    box.className = "modal";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = '<p class="modal-text"></p><div class="modal-actions"><button type="button" class="tab-refresh modal-ok">OK</button></div>';
    box.querySelector(".modal-text").textContent = text;
    // M3: name the dialog by its message.
    box.querySelector(".modal-text").id = "modal-text";
    box.setAttribute("aria-labelledby", "modal-text");
    backdrop.appendChild(box);
    const before = document.activeElement;
    function close() {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      if (before && before.focus) before.focus();
    }
    function onKey(event) {
      if (event.key === "Escape") close();
      // M3: keep Tab and Shift+Tab on OK, the dialog's only control.
      if (event.key === "Tab") {
        event.preventDefault();
        box.querySelector(".modal-ok").focus();
      }
    }
    box.querySelector(".modal-ok").addEventListener("click", close);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(backdrop);
    box.querySelector(".modal-ok").focus();
  }

  window.Tabs = { modal: modal };
})();
