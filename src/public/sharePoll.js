/*
  SHARE POLL — the poll link, offered through the system share sheet where the browser has one and copied to the
  clipboard otherwise. Both calls are made first thing in the tap: iOS refuses either once the tap has passed.
*/
(function () {
  "use strict";

  function link(pid) {
    return location.origin + "/?PID=" + encodeURIComponent(pid);
  }

  function snackbar(message) {
    let bar = document.querySelector(".m3-snackbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "m3-snackbar";
      bar.setAttribute("role", "status");
      document.body.appendChild(bar);
    }
    bar.textContent = message;
    bar.classList.add("is-shown");
    clearTimeout(bar._hideTimer);
    bar._hideTimer = setTimeout(() => bar.classList.remove("is-shown"), 3000);
  }

  async function copy(pid) {
    try {
      await navigator.clipboard.writeText(link(pid));
      snackbar("Link copied");
    } catch {
      snackbar("Could not copy the link");
    }
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
  async function share(pid, title) {
    if (typeof navigator.share !== "function") {
      await copy(pid);
      return;
    }
    try {
      await navigator.share({ title: title, url: link(pid) });
    } catch (error) {
      if (error && error.name === "AbortError") return;
      await copy(pid);
    }
  }

  window.SharePoll = { link: link, copy: copy, share: share, snackbar: snackbar };
})();
