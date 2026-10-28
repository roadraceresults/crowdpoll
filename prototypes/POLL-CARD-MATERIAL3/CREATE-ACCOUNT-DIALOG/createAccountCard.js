/**
 * 013-UI-UX-revisions — the Create Account card (US4).
 *
 * The route 404s outside native sign-in mode (pages.ts), so this card is never
 * served in the mode that would break it and needs no mode check of its own.
 */
(function () {
  "use strict";

  var main = document.getElementById("card-root");

  function el(tag, className) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    return n;
  }

  function start() {
    if (!main) return;

    var card = window.CardShell.mount(main, {
      title: "Create Account",
      subtitle: "Enter your email address — we'll create your account and email your first sign-in link.",
      closeHref: "/"
    });

    var form = el("form");
    form.id = "create-form";

    var label = el("label");
    label.setAttribute("for", "email");
    label.textContent = "Email address";

    var input = el("input");
    input.id = "email";
    input.name = "email";
    input.type = "email";
    input.maxLength = 200;
    input.required = true;
    input.autocomplete = "email";

    form.append(label, input);
    card.body.appendChild(form);

    var action;
    action = card.addAction("Create Account", function (status) {
      return fetch("/api/auth/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: input.value })
      })
        .then(function (res) {
          return res.json().then(function (body) { return { res: res, body: body }; });
        })
        .then(function (r) {
          // FR-032: the card stays and confirms; a refusal stays and explains.
          if (r.res.ok) {
            status.textContent =
              (r.body.message || "Check your inbox") +
              " — click the link we sent you to activate your account.";
            status.className = "card-shell-status";
            action.settle();
            return;
          }
          if (r.res.status === 429 && r.body.nextAllowedAt) {
            status.textContent =
              "Too many requests. You can try again at " +
              new Date(r.body.nextAllowedAt).toLocaleTimeString() + ".";
          } else {
            status.textContent = r.body.error || "Something went wrong, please try again.";
          }
          status.className = "card-shell-status error";
        })
        .catch(function () {
          status.textContent = "Could not reach the server, please try again.";
          status.className = "card-shell-status error";
        });
    });

    /* The action is unavailable until there is an address to create an account
       for, and unavailable again if the field is emptied, so a blank
       submission is not something the person can attempt and be refused for. */
    function syncEnabled() {
      action.setEnabled(input.value.trim().length > 0);
    }
    input.addEventListener("input", syncEnabled);
    syncEnabled();

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      action.button.click();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
