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

  var NOT_LAUNCHED_ERROR = "not-launched";
  var NOT_LAUNCHED_MESSAGE =
    "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only.";

  /* Wording and start route of each provider button (contracts/ui-contracts.md C1). */
  var PROVIDERS = {
    google: { label: "Sign in with Google" },
    apple: { label: "Sign in with Apple" },
    microsoft: { label: "Sign in with Microsoft" },
    amazon: { label: "Login with Amazon" }
  };

  /* What a provider login that came back to /login?error=<code> says (C2). */
  var PROVIDER_ERRORS = {
    "not-launched": NOT_LAUNCHED_MESSAGE,
    access_denied: "Login was cancelled.",
    account_not_linked: "An account already uses this email address. Log in the way you usually do.",
    email_not_found: "CrowdPoll needs your email address to sign you in; try another way.",
    email_is_missing: "CrowdPoll needs your email address to sign you in; try another way."
  };
  var PROVIDER_FAILED = "Login with that provider failed. Please try again.";

  var MS_PER_DAY = 86400000;
  var MS_PER_HOUR = 3600000;

  /* How long "stay logged in" lasts, from ENV_MAX_SIGNIN_COOKIE_DURATION: whole
     days (rounded down), "day" for one and "days" for more. Under a day it is
     hours to two decimals, which only a test deployment uses. */
  function stayDuration(ms) {
    if (typeof ms !== "number" || !(ms > 0)) return "";
    var days = Math.floor(ms / MS_PER_DAY);
    if (days >= 1) return days + (days === 1 ? " day" : " days");
    return Math.round((ms / MS_PER_HOUR) * 100) / 100 + " hours";
  }

  var currentConfig = null;
  /* What the person had typed when the server asked for the human check again. */
  var kept = null;

  /* The human check stands before the card (humanCheck.js); without it the card is drawn at once. */
  function gated() {
    var draw = function () { render(currentConfig); };
    if (window.HumanCheck) window.HumanCheck.gate(main, "login", draw, currentConfig);
    else draw();
  }

  function checkHeaders() {
    return window.HumanCheck ? window.HumanCheck.headers() : {};
  }

  function refused(body) {
    return Boolean(window.HumanCheck && window.HumanCheck.refused(body));
  }

  function start() {
    if (!main) return;

    fetch("/api/config")
      .then(function (r) { return r.ok ? r.json() : { signinMethod: "native" }; })
      .catch(function () { return { signinMethod: "native" }; })
      .then(function (config) {
        currentConfig = config;
        gated();
      });
  }

  function render(config) {
    var mode = config.signinMethod;
    var oauth = mode === "oauth";

    var card = window.CardShell.mount(main, {
      title: "Login",
      signin: true,
      subtitle: oauth
        ? ["Log in with your Google, Apple, Microsoft or Amazon account."]
        : mode === "both"
          ? ["Log in with a provider,", "or we email you a one-time login link."]
          : ["We email you a one-time login link."],
      note: "We do not store passwords.",
      closeHref: "/"
    });

    /* FR-037: the card offers only what the configured login method
       supports. Preserving the switch is correctness, not oauth design work —
       a card that offered a control the system refuses would be broken in a
       supported configuration. No layout is designed for oauth mode; it gets
       what the shell gives it. */
    window.CardShell.addSharedPollLine(card);
    var stayChoice = stayBox(config);
    if (mode === "oauth" || mode === "both") {
      card.body.appendChild(stayChoice.label);
      /* Agreement is asked for after a provider login, on the Accept Terms
         card, and only when the account has not accepted the current Terms;
         here the card only says what logging in means (TWEAKS06). It sits above
         the buttons with the box, since both apply to every way of logging in. */
      window.CardShell.termsLine(card.body, "By logging in you agree to");
      renderOauth(card, config.oauthProviders || [], stayChoice.input);
      if (oauth) {
        kept = null;
        return;
      }
      card.body.appendChild(el("div", "oauth-divider")).textContent = "or";
    }
    renderNative(card, stayChoice, mode !== "both");
  }

  function providerLogo(file, className) {
    var img = el("img", "oauth-logo" + (className ? " " + className : ""));
    img.src = "/oauth/" + file + ".svg";
    img.alt = "";
    img.width = 20;
    img.height = 20;
    return img;
  }

  /* Starts a provider login: the start route answers with the provider's
     address, and the browser goes there (research R9). */
  function startSignin(provider, stay) {
    var pid = window.CardShell.sharedPid();
    var callbackURL = (pid ? "/?PID=" + pid + "&" : "/?") + "signedIn=1";
    var amazon = provider === "amazon";
    var body = amazon
      ? { providerId: provider, callbackURL: callbackURL }
      : { provider: provider, callbackURL: callbackURL };
    if (stay) body.additionalData = { staySignedIn: true };
    return fetch(amazon ? "/api/auth/sign-in/oauth2" : "/api/auth/sign-in/social", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, checkHeaders()),
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (body) {
        if (refused(body)) {
          var again = new Error("human check required");
          again.refused = true;
          throw again;
        }
        if (!res.ok || !body || typeof body.url !== "string") throw new Error("start failed");
        return body.url;
      });
    });
  }

  function renderOauth(card, enabled, stay) {
    var wrap = el("div", "oauth-providers");
    var status = el("p", "card-shell-status");
    var busy = false;
    var buttons = enabled.filter(function (provider) { return PROVIDERS[provider]; }).map(function (provider) {
      var button = el("button", "oauth-button oauth-" + provider);
      button.type = "button";
      button.dataset.provider = provider;
      /* Apple's button is black with a white logo, and white with a black
         logo in dark mode; the stylesheet shows the one that fits. */
      if (provider === "apple") {
        button.append(providerLogo("apple-white", "oauth-logo-light"), providerLogo("apple", "oauth-logo-dark"));
      } else {
        button.appendChild(providerLogo(provider));
      }
      button.appendChild(el("span", "oauth-label")).textContent = PROVIDERS[provider].label;
      button.addEventListener("click", function () {
        if (busy) return;
        busy = true;
        button.classList.add("is-busy");
        button.setAttribute("aria-busy", "true");
        syncProviders();
        status.textContent = "";
        status.className = "card-shell-status";
        startSignin(provider, stay.checked)
          .then(function (url) { location.href = url; })
          .catch(function (err) {
            if (err && err.refused) {
              kept = { email: "", stay: stay.checked };
              gated();
              return;
            }
            busy = false;
            button.classList.remove("is-busy");
            button.removeAttribute("aria-busy");
            syncProviders();
            status.textContent = PROVIDER_FAILED;
            status.className = "card-shell-status error";
          });
      });
      var row = el("div", "oauth-provider");
      row.appendChild(button);
      window.CardShell.addProviderSharing(row, provider);
      wrap.appendChild(row);
      return button;
    });
    function syncProviders() {
      buttons.forEach(function (button) {
        var inert = busy && !button.classList.contains("is-busy");
        button.setAttribute("aria-disabled", inert ? "true" : "false");
      });
    }
    syncProviders();
    card.body.appendChild(wrap);
    card.body.appendChild(status);

    var error = new URLSearchParams(location.search).get("error");
    if (error && error !== "invalid-link") {
      status.textContent = PROVIDER_ERRORS[error] || PROVIDER_FAILED;
      status.className = "card-shell-status error";
    }
  }

  function withSharedPid(body) {
    var pid = window.CardShell.sharedPid();
    return pid ? Object.assign({ pid: pid }, body) : body;
  }

  /* The one Stay logged in box: above the provider buttons when there are any, since it applies
     to them too, and otherwise in the email form. */
  function stayBox(config) {
    var label = el("label", "checkbox");
    var input = el("input");
    input.id = "stay";
    input.name = "stay";
    input.type = "checkbox";
    input.checked = kept ? kept.stay : config.staySignedInDefault === true;
    var duration = stayDuration(config.maxSigninCookieDurationMs);
    label.append(input, document.createTextNode(" Stay logged in on this device" + (duration ? " for " + duration : "")));
    return { label: label, input: input };
  }

  function renderNative(card, stayChoice, emailOnly) {
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

    var stay = stayChoice.input;
    var stayLabel = stayChoice.label;

    /* One way in: an address with no account is emailed a link that creates it,
       so the card tells newcomers so instead of leading to Create Account. */
    var newHint = el("p", "card-shell-hint login-new-hint");
    newHint.textContent = "New to CrowdPoll? Enter your email and we'll send you a link to create your account.";

    form.append(label, input, newHint);
    if (emailOnly) form.append(stayLabel);
    var homepage = window.CardShell.hiddenField(form);
    card.body.appendChild(form);

    var action;
    action = card.addAction("Email a login link", function (status) {
      return fetch("/api/auth/request-login-link", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, checkHeaders()),
        body: JSON.stringify(withSharedPid({ email: input.value, staySignedIn: stay.checked, homepage: homepage.value }))
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
              " — click the link we sent you to log in.";
            status.className = "card-shell-status";
            action.settle();
            return;
          }
          if (refused(r.body)) {
            kept = { email: input.value, stay: stay.checked };
            gated();
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

    if (emailOnly) window.CardShell.termsLine(card.body, "By logging in you agree to");

    // Submitting the form runs the same action, so Enter works in the field.
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      action.button.click();
    });

    /* The action cannot be used until there is an address to send to. It is held
       unavailable while the field is empty, and becomes unavailable again if it is
       cleared, so a blank submission is not something the person can attempt and be
       refused for. When the email form is the only way in, the stay-logged-in choice
       is held with it; beside provider buttons it applies to them too. */
    function syncEnabled() {
      var hasAddress = input.value.trim().length > 0;
      action.setEnabled(hasAddress);
      if (!emailOnly) return;
      stay.disabled = !hasAddress;
      stayLabel.classList.toggle("is-disabled", !hasAddress);
    }
    if (kept) {
      input.value = kept.email;
      kept = null;
    }
    input.addEventListener("input", syncEnabled);
    syncEnabled();

    /* Android keyboard: the "Go" button sends an Enter key down the email input.
       Trigger the action only when the email is not empty (TWEAKS08). */
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && input.value.trim().length > 0 && !action.button.disabled) {
        e.preventDefault();
        action.button.click();
      }
    });

    /* FR-034: a notice arriving with the page rather than from an action goes
       to the status line of the action it concerns, or the first where it
       concerns none. /login?error=invalid-link concerns no action, and this
       card has only one status line. */
    var params = new URLSearchParams(location.search);
    if (params.get("error") === "invalid-link") {
      action.status.textContent =
        "That login link is no longer valid. Request a new one.";
      action.status.className = "card-shell-status error";
    } else if (params.get("error") === NOT_LAUNCHED_ERROR && emailOnly) {
      action.status.textContent = NOT_LAUNCHED_MESSAGE;
      action.status.className = "card-shell-status error";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
