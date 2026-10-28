/**
 * 013-UI-UX-revisions — the Login card (US4).
 *
 * Mounts the card shell and wires the one action. Replaces the inline script
 * login.html carried: an inline <script> runs during parsing, before any
 * deferred script, so it could not see window.CardShell or the shared session
 * snapshot (research R2).
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

    fetch("/api/config")
      .then(function (r) { return r.ok ? r.json() : { signinMethod: "native" }; })
      .catch(function () { return { signinMethod: "native" }; })
      .then(render);
  }

  function render(config) {
    var oauth = config.signinMethod === "oauth";

    var card = window.CardShell.mount(main, {
      title: "Login",
      subtitle: oauth
        ? "Sign in with your social account."
        : "No passwords here — we email you a one-time sign-in link.",
      closeHref: "/"
    });

    /* FR-037: the card offers only what the configured sign-in method
       supports. Preserving the switch is correctness, not oauth design work —
       a card that offered a control the system refuses would be broken in a
       supported configuration. No layout is designed for oauth mode; it gets
       what the shell gives it. */
    if (oauth) {
      renderOauth(card);
      return;
    }
    renderNative(card);
  }

  function renderOauth(card) {
    var wrap = el("div", "oauth-providers");
    ["google", "facebook", "github"].forEach(function (provider) {
      var a = el("a", "btn-primary btn-vote");
      a.href = "/api/auth/oauth/" + provider;
      a.textContent = "Continue with " + provider.charAt(0).toUpperCase() + provider.slice(1);
      wrap.appendChild(a);
    });
    card.body.appendChild(wrap);
  }

  function renderNative(card) {
    // The form keeps id="login-form": tests/pages.test.ts asserts a guest's
    // GET /login contains it, and a page-guard test should not be rewritten
    // because a stylesheet changed.
    var form = el("form");
    form.id = "login-form";

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

    var stayLabel = el("label", "checkbox");
    var stay = el("input");
    stay.id = "stay";
    stay.name = "stay";
    stay.type = "checkbox";
    stayLabel.append(stay, document.createTextNode(" Stay signed in on this device"));

    form.append(label, input, stayLabel);
    card.body.appendChild(form);

    var action;
    action = card.addAction("Email me a login link", function (status) {
      return fetch("/api/auth/request-login-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: input.value, staySignedIn: stay.checked })
      })
        .then(function (res) {
          return res.json().then(function (body) { return { res: res, body: body }; });
        })
        .then(function (r) {
          /* FR-032: the card stays and confirms. Navigating home on success
             would discard the only place this instruction can appear — the
             same defect R7 and R8 exist to fix elsewhere. */
          if (r.res.ok) {
            status.textContent =
              (r.body.message || "Check your inbox") +
              " — click the link we sent you to sign in.";
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

    // Submitting the form runs the same action, so Enter works in the field.
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      action.button.click();
    });

    /* Nothing on this card can be used until there is an address to send to.
       The action and the stay-signed-in choice are both held unavailable while
       the field is empty, and become unavailable again if it is cleared, so a
       blank submission is not something the person can attempt and be refused
       for. */
    function syncEnabled() {
      var hasAddress = input.value.trim().length > 0;
      action.setEnabled(hasAddress);
      stay.disabled = !hasAddress;
      stayLabel.classList.toggle("is-disabled", !hasAddress);
    }
    input.addEventListener("input", syncEnabled);
    syncEnabled();

    /* FR-034: a notice arriving with the page rather than from an action goes
       to the status line of the action it concerns, or the first where it
       concerns none. /login?error=invalid-link concerns no action, and this
       card has only one status line. */
    var params = new URLSearchParams(location.search);
    if (params.get("error") === "invalid-link") {
      action.status.textContent =
        "That sign-in link is no longer valid. Request a new one.";
      action.status.className = "card-shell-status error";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
