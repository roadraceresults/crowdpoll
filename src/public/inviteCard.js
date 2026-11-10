(function () {
  "use strict";

  var main = document.getElementById("card-root");

  var PROVIDERS = {
    google: { label: "Sign in with Google" },
    apple: { label: "Sign in with Apple" },
    microsoft: { label: "Sign in with Microsoft" },
    amazon: { label: "Login with Amazon" }
  };

  function el(tag, className) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    return n;
  }

  function paragraph(parent, text) {
    var p = el("p", "card-shell-line");
    p.textContent = text;
    parent.appendChild(p);
    return p;
  }

  function providerLogo(file, className) {
    var img = el("img", "oauth-logo" + (className ? " " + className : ""));
    img.src = "/oauth/" + file + ".svg";
    img.alt = "";
    img.width = 20;
    img.height = 20;
    return img;
  }

  /* The human check stands before the card (humanCheck.js); without it the card is drawn at once. */
  function gated(draw) {
    if (window.HumanCheck) window.HumanCheck.gate(main, "invite", draw);
    else draw();
  }

  function checkHeaders() {
    return window.HumanCheck ? window.HumanCheck.headers() : {};
  }

  function refused(body) {
    return Boolean(window.HumanCheck && window.HumanCheck.refused(body));
  }

  function mountCard() {
    return window.CardShell.mount(main, { title: "You're invited to a poll", signin: true, closeHref: "/" });
  }

  /* What the person had chosen when the server asked for the human check again. */
  var kept = null;

  function startSignin(provider, pid, stay) {
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

  function renderProviders(card, enabled, pid, regate, stay) {
    var wrap = el("div", "oauth-providers");
    var status = el("p", "card-shell-status");
    var busy = false;
    enabled.filter(function (provider) { return PROVIDERS[provider]; }).forEach(function (provider) {
      var button = el("button", "oauth-button oauth-" + provider);
      button.type = "button";
      button.dataset.provider = provider;
      if (provider === "apple") {
        button.append(providerLogo("apple-white", "oauth-logo-light"), providerLogo("apple", "oauth-logo-dark"));
      } else {
        button.appendChild(providerLogo(provider));
      }
      button.appendChild(el("span", "oauth-label")).textContent = PROVIDERS[provider].label;
      button.addEventListener("click", function () {
        if (busy) return;
        busy = true;
        button.setAttribute("aria-busy", "true");
        startSignin(provider, pid, stay.checked)
          .then(function (url) { location.href = url; })
          .catch(function (err) {
            if (err && err.refused) {
              regate();
              return;
            }
            busy = false;
            button.removeAttribute("aria-busy");
            status.textContent = "Login with that provider failed. Please try again.";
            status.className = "card-shell-status error";
          });
      });
      wrap.appendChild(button);
    });
    card.body.appendChild(wrap);
    window.CardShell.addOauthSharing(card, enabled);
    card.body.appendChild(status);
  }

  function render(card, info, pid, token) {
    card.body.replaceChildren();
    var switching = Boolean(info.signedInAs);

    if (switching) {
      paragraph(
        card.body,
        "This invitation is for " + info.email + ". Log out and continue as that address to see the poll. " +
          "Or ask the poll creator to resend the invitation to your current address."
      );
    } else {
      var line = paragraph(card.body, "Continue as ");
      var who = el("strong");
      who.textContent = info.email;
      line.append(who, document.createTextNode("."));
    }

    var terms = null;
    if (!info.hasAccount) {
      terms = window.CardShell.termsBox(card.body, function () { sync(); });
    }

    var stayLabel = el("label", "checkbox");
    var stay = el("input");
    stay.id = "stay";
    stay.name = "stay";
    stay.type = "checkbox";
    stay.checked = info.staySignedInDefault === true;
    stayLabel.append(stay, document.createTextNode(" Stay logged in on this device"));
    card.body.appendChild(stayLabel);
    if (kept) {
      stay.checked = kept.stay;
      if (terms) terms.checked = kept.terms;
      kept = null;
    }

    function regate() {
      kept = { stay: stay.checked, terms: Boolean(terms && terms.checked) };
      gated(function () { render(mountCard(), info, pid, token); });
    }

    var action = card.addAction(
      switching ? "Log out and continue as " + info.email : "Continue",
      function (status) {
        var body = { pid: pid, token: token, stay: stay.checked };
        if (terms) {
          body.acceptedTerms = terms.checked;
          body.termsVersion = info.termsVersion;
        }
        if (switching) body.signOut = true;
        return fetch("/api/invitations/redeem", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, checkHeaders()),
          body: JSON.stringify(body)
        })
          .then(function (res) {
            return res.json().then(function (b) { return { res: res, body: b }; }).catch(function () { return { res: res, body: null }; });
          })
          .then(function (r) {
            if (r.res.status === 409) {
              location.reload();
              return;
            }
            if (r.res.ok && r.body && r.body.redirect) {
              location.href = r.body.redirect;
              return;
            }
            if (refused(r.body)) {
              regate();
              return;
            }
            status.textContent = (r.body && r.body.error) || "Could not continue, please try again.";
            status.className = "card-shell-status error";
          })
          .catch(function () {
            status.textContent = "Could not reach the server, please try again.";
            status.className = "card-shell-status error";
          });
      }
    );

    if (switching) {
      card.addAction("Stay as " + info.signedInAs, function () {
        location.href = "/";
      });
    }

    /* A greyed-out button does not say why; while the Terms box is unticked, this line does. */
    var hint = null;
    if (terms) {
      hint = el("p", "card-shell-hint");
      hint.id = "invite-terms-hint";
      hint.textContent = "Click the Terms and Conditions checkbox above to continue.";
      action.button.after(hint);
      action.button.setAttribute("aria-describedby", hint.id);
    }

    function sync() {
      action.setEnabled(!terms || terms.checked);
      if (hint) hint.hidden = terms.checked;
    }
    sync();

    if (info.providers && info.providers.length > 0) renderProviders(card, info.providers, pid, regate, stay);
  }

  function start() {
    if (!main) return;
    var params = new URLSearchParams(location.search);
    var pid = window.CardShell.sharedPid();
    var token = params.get("token") || "";

    var card = mountCard();
    paragraph(card.body, "Checking your invitation…");

    fetch("/api/invitations/link-info?PID=" + encodeURIComponent(pid || "") + "&token=" + encodeURIComponent(token))
      .then(function (res) {
        return res.json().then(function (body) { return { res: res, body: body }; }).catch(function () { return { res: res, body: null }; });
      })
      .then(function (r) {
        if (!r.res.ok) {
          location.href = (r.body && r.body.redirect) || "/";
          return;
        }
        gated(function () { render(mountCard(), r.body, pid, token); });
      })
      .catch(function () {
        card.body.replaceChildren();
        paragraph(card.body, "Could not reach the server, please reload the page.");
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
