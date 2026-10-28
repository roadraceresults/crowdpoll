/*
  LIVE RESULTS IDLE PROMPT — showIdlePrompt() from src/public/liveResults.js
  (REQUIREMENT Live Results idle prompt, clarification 1a). IDLE_PROMPT and the
  function are copied verbatim, with their section comment. In production the
  function is a closure over liveResults.js's state; what it reads is declared
  here instead, each marked "STAND-IN". The two stand-in actions only tell the
  harness what production would do, through a "live-idle-sample" event.
  REQUIREMENT Use Material 3 For Live Results idle prompt (clarifications 3a
  and 4a) adds edits, each marked "M3:", to carry over in the merge: the text
  no longer says "for this poll", the inline prompt is not aria-modal, it is
  named by its text, and focus moves to Yes and back after Yes.
*/
(function () {
  "use strict";

  // M3: one poll or five, Yes and Cancel act on the whole tab.
  const IDLE_PROMPT = "Do you want to continue to receive Live Results updates?";

  // STAND-IN: liveResults.js sets these in ensureGrid() and its timer.
  const panel = document.querySelector('.tab-panel[data-panel="live"]');
  let prompting = false;
  let lastInteractionAt = Date.now();

  // STAND-IN: production asks the server for a delta.
  function refresh() {
    document.dispatchEvent(new CustomEvent("live-idle-sample", { detail: { action: "refresh", lastInteractionAt: lastInteractionAt } }));
  }

  // STAND-IN: production sends the removals, empties the tab and selects Trending.
  function closeTab(sendRemovals) {
    document.dispatchEvent(new CustomEvent("live-idle-sample", { detail: { action: "closeTab", sendRemovals: sendRemovals } }));
  }

  // ---- The idle prompt ----

  function showIdlePrompt() {
    if (!panel || prompting) return;
    prompting = true;
    const dialog = document.createElement("div");
    dialog.className = "live-idle-prompt";
    dialog.setAttribute("role", "dialog");
    // M3: no aria-modal; the page stays usable, and the maximized view's Escape keeps working.
    dialog.innerHTML =
      '<p class="live-idle-text"></p>' +
      '<div class="live-idle-actions">' +
      '<button type="button" class="tab-refresh live-idle-cancel">Cancel</button>' +
      '<button type="button" class="tab-refresh live-idle-yes">Yes</button>' +
      "</div>";
    dialog.querySelector(".live-idle-text").textContent = IDLE_PROMPT;
    // M3: name the prompt by its text.
    dialog.querySelector(".live-idle-text").id = "live-idle-text";
    dialog.setAttribute("aria-labelledby", "live-idle-text");
    // M3: remember where focus was, to return it after Yes.
    const before = document.activeElement;
    dialog.querySelector(".live-idle-yes").addEventListener("click", () => {
      dialog.remove();
      prompting = false;
      lastInteractionAt = Date.now();
      // M3: give focus back, if that element is still in the page.
      if (before && before !== document.body && before.isConnected && before.focus) before.focus();
      refresh();
    });
    dialog.querySelector(".live-idle-cancel").addEventListener("click", () => {
      dialog.remove();
      prompting = false;
      closeTab(true);
    });
    panel.prepend(dialog);
    // M3: focus Yes, so a returning user can answer with Enter.
    dialog.querySelector(".live-idle-yes").focus();
  }


  window.LiveIdlePrompt = { show: showIdlePrompt };
})();
