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

  var EXPIRED = "That link has expired or has been used. Enter your email address to get a new one.";

  function paragraph(parent, text) {
    var p = el("p", "card-shell-line");
    p.textContent = text;
    parent.appendChild(p);
    return p;
  }

  /* The one-time link emailed to an address with no account: no address
     field, no second email. */
  function startToken(token) {
    var card = window.CardShell.mount(main, { title: "Create Account", signin: true, closeHref: "/" });
    paragraph(card.body, "Checking your link…");

    fetch("/api/auth/create-account/link-info?token=" + encodeURIComponent(token))
      .then(function (res) {
        return res.json().then(function (body) { return { res: res, body: body }; }).catch(function () { return { res: res, body: null }; });
      })
      .then(function (r) {
        if (!r.res.ok) {
          startForm(EXPIRED);
          return;
        }
        renderToken(card, r.body, token);
      })
      .catch(function () {
        card.body.replaceChildren();
        paragraph(card.body, "Could not reach the server, please reload the page.");
      });
  }

  function renderToken(card, info, token) {
    card.body.replaceChildren();
    window.CardShell.addSharedPollLine(card);
    var line = paragraph(card.body, info.hasAccount ? "Sign in as " : "Create your account as ");
    var who = el("strong");
    who.textContent = info.email;
    line.append(who, document.createTextNode("."));

    var terms = info.hasAccount ? null : window.CardShell.termsBox(card.body, function () { sync(); });

    var action = card.addAction(info.hasAccount ? "Sign In" : "Create Account", function (status) {
      var body = { token: token };
      if (terms) {
        body.acceptedTerms = terms.checked;
        body.termsVersion = info.termsVersion;
      }
      return fetch("/api/auth/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
        .then(function (res) {
          return res.json().then(function (b) { return { res: res, body: b }; }).catch(function () { return { res: res, body: null }; });
        })
        .then(function (r) {
          if (r.res.ok && r.body && r.body.redirect) {
            location.href = r.body.redirect;
            return;
          }
          if (r.body && r.body.code === "invalid-link") {
            startForm(EXPIRED);
            return;
          }
          if (r.res.status === 429 && r.body && r.body.nextAllowedAt) {
            status.textContent =
              "Too many requests. You can try again at " +
              new Date(r.body.nextAllowedAt).toLocaleTimeString() + ".";
          } else {
            status.textContent = (r.body && r.body.error) || "Something went wrong, please try again.";
          }
          status.className = "card-shell-status error";
        })
        .catch(function () {
          status.textContent = "Could not reach the server, please try again.";
          status.className = "card-shell-status error";
        });
    });

    function sync() {
      action.setEnabled(!terms || terms.checked);
    }
    sync();
  }

  function start() {
    if (!main) return;
    var token = new URLSearchParams(location.search).get("token");
    if (token) startToken(token);
    else startForm(null);
  }

  function startForm(notice) {
    var card = window.CardShell.mount(main, {
      title: "Create Account",
      signin: true,
      subtitle: ["Enter your email address.", "We will create your account and email your first sign-in link."],
      note: "We do not store passwords.",
      closeHref: "/"
    });

    window.CardShell.addSharedPollLine(card);

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
    var terms = window.CardShell.termsBox(form, function () { syncEnabled(); });
    var homepage = window.CardShell.hiddenField(form);
    card.body.appendChild(form);
    var termsVersion = window.CardShell.termsVersion();

    var action;
    action = card.addAction("Create Account", function (status) {
      return termsVersion.then(function (version) {
        var body = { email: input.value, acceptedTerms: terms.checked, termsVersion: version, homepage: homepage.value };
        if (window.CardShell.sharedPid()) body.pid = window.CardShell.sharedPid();
        return fetch("/api/auth/create-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
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

    if (notice) {
      action.status.textContent = notice;
      action.status.className = "card-shell-status error";
    }

    window.CardShell.addFootLine(card, "Already have an account?", "/login", "Log in");

    /* The action is unavailable until there is an address to create an account
       for, and unavailable again if the field is emptied, so a blank
       submission is not something the person can attempt and be refused for. */
    function syncEnabled() {
      action.setEnabled(input.value.trim().length > 0 && terms.checked);
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
