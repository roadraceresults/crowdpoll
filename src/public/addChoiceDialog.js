/*
  The Add Choice dialog a voter opens from a Private poll's voting face. It checks
  what it can as the voter types (length, an existing choice); the server decides.
*/
(function () {
  "use strict";

  const TOO_SOON = "Please wait a moment and try again.";
  const DUPLICATE = "This poll already has that choice.";
  const FAILED = "Your choice could not be added. Please try again.";

  const keyOf = (label) => String(label).trim().replace(/\s+/g, " ").toLowerCase();

  let counter = 0;

  /* Resolves when the dialog closes. onSave(label) resolves { ok } or { error, status }. */
  function open(options) {
    const maxLength = options.maxLength || 40;
    const existing = new Set((options.choices || []).map((c) => keyOf(c.label)));
    const opener = document.activeElement;
    const id = "add-choice-" + ++counter;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const box = document.createElement("div");
    box.className = "modal add-choice-dialog";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", id + "-title");
    box.innerHTML =
      '<h2 class="modal-headline"></h2>' +
      '<div class="add-choice-field">' +
      '<input class="add-choice-input" type="text" autocomplete="off">' +
      '<label class="add-choice-label">Choice</label>' +
      "</div>" +
      '<div class="add-choice-below">' +
      '<p class="m3-field-support" aria-live="polite"></p>' +
      '<span class="m3-field-counter" aria-hidden="true"></span>' +
      "</div>" +
      '<div class="modal-actions">' +
      '<button type="button" class="add-choice-action add-choice-cancel">Cancel</button>' +
      '<button type="button" class="add-choice-action add-choice-save">Save</button>' +
      "</div>";
    const title = box.querySelector(".modal-headline");
    title.id = id + "-title";
    title.textContent = "Add Choice";
    const input = box.querySelector(".add-choice-input");
    const label = box.querySelector(".add-choice-label");
    const support = box.querySelector(".m3-field-support");
    const count = box.querySelector(".m3-field-counter");
    const save = box.querySelector(".add-choice-save");
    const cancel = box.querySelector(".add-choice-cancel");
    input.id = id + "-input";
    label.htmlFor = input.id;
    support.id = id + "-support";
    input.setAttribute("aria-describedby", support.id);
    input.maxLength = maxLength;

    let busy = false;
    let refusal = "";

    function showError(text) {
      support.textContent = text;
      box.classList.toggle("is-error", Boolean(text));
      if (text) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }

    function update() {
      count.textContent = input.value.length + " / " + maxLength;
      const trimmed = input.value.trim();
      const duplicate = trimmed !== "" && existing.has(keyOf(trimmed));
      showError(duplicate ? DUPLICATE : refusal);
      save.disabled = busy || trimmed === "" || duplicate;
    }

    let resolveClosed;
    const closed = new Promise((resolve) => { resolveClosed = resolve; });

    function close() {
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      if (opener && opener.focus) opener.focus();
      resolveClosed();
    }

    async function submit() {
      if (save.disabled) return;
      busy = true;
      refusal = "";
      update();
      let result;
      try {
        result = await options.onSave(input.value.trim());
      } catch {
        result = { error: FAILED };
      }
      busy = false;
      if (result && result.ok) {
        close();
        return;
      }
      refusal = result && result.status === 429 ? TOO_SOON : (result && result.error) || FAILED;
      update();
      input.focus();
    }

    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "Enter" && event.target === input) {
        event.preventDefault();
        submit();
        return;
      }
      if (event.key === "Tab") {
        const stops = [input, cancel, save].filter((el) => !el.disabled);
        const at = stops.indexOf(document.activeElement);
        const next = event.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : (at + 1) % stops.length;
        event.preventDefault();
        stops[next].focus();
      }
    }

    input.addEventListener("input", () => {
      refusal = "";
      update();
    });
    input.addEventListener("paste", (event) => {
      const pasted = event.clipboardData && event.clipboardData.getData("text");
      if (typeof pasted !== "string") return;
      event.preventDefault();
      const flat = pasted.replace(/\r\n|\r|\n/g, " ");
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const room = maxLength - (input.value.length - (end - start));
      const inserted = flat.slice(0, Math.max(0, room));
      input.value = input.value.slice(0, start) + inserted + input.value.slice(end);
      const caret = start + inserted.length;
      input.setSelectionRange(caret, caret);
      refusal = "";
      update();
    });
    save.addEventListener("click", submit);
    cancel.addEventListener("click", close);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
    document.addEventListener("keydown", onKey, true);

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    update();
    input.focus();
    return closed;
  }

  window.M3Ripple?.add(".add-choice-dialog .add-choice-action");
  window.AddChoiceDialog = { open: open };
})();
