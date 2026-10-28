(function () {
  "use strict";

  var main = document.getElementById("card-root");

  /* A new account, such as one just made by a provider sign-in, has never
     accepted any version, so it is greeted rather than told the Terms changed. */
  function start() {
    if (!main) return;
    fetch("/api/me")
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (me) { render(me.termsFirstAcceptance === true); });
  }

  function render(first) {
    var next = new URLSearchParams(location.search).get("next") || "/";
    var card = window.CardShell.mount(main, first
      ? {
          title: "Welcome to CrowdPoll",
          signin: true,
          subtitle: "Before you continue, please accept the Terms of Service."
        }
      : {
          title: "Updated Terms of Service",
          signin: true,
          subtitle: "Please read and accept the Terms of Service to continue."
        });
    var terms = window.CardShell.termsBox(card.body, function () { accept.setEnabled(terms.checked); });
    var termsVersion = window.CardShell.termsVersion();

    var accept = card.addAction("Accept", function (status) {
      return termsVersion
        .then(function (version) {
          return fetch("/api/legal/accept-terms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ termsVersion: version, next: next })
          });
        })
        .then(function (res) {
          return res.json().then(function (body) { return { res: res, body: body }; });
        })
        .then(function (r) {
          if (r.res.ok && r.body.redirect) {
            location.href = r.body.redirect;
            return;
          }
          status.textContent = (r.body && r.body.error) || "Something went wrong, please try again.";
          status.className = "card-shell-status error";
        })
        .catch(function () {
          status.textContent = "Could not reach the server, please try again.";
          status.className = "card-shell-status error";
        });
    });
    accept.setEnabled(false);

    var signOut = card.addAction("Sign Out", function () {
      return fetch("/api/auth/logout", { method: "POST" })
        .catch(function () { return null; })
        .then(function () { location.href = "/"; });
    });
    signOut.button.classList.add("btn-text");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
