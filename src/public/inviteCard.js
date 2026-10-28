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

  function startSignin(provider, pid) {
    var callbackURL = pid ? "/?PID=" + pid : "/";
    var amazon = provider === "amazon";
    return fetch(amazon ? "/api/auth/sign-in/oauth2" : "/api/auth/sign-in/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(amazon
        ? { providerId: provider, callbackURL: callbackURL }
        : { provider: provider, callbackURL: callbackURL })
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok || !body || typeof body.url !== "string") throw new Error("start failed");
        return body.url;
      });
    });
  }

  function renderProviders(card, enabled, pid) {
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
        startSignin(provider, pid)
          .then(function (url) { location.href = url; })
          .catch(function () {
            busy = false;
            button.removeAttribute("aria-busy");
            status.textContent = "Sign-in with that provider failed. Please try again.";
            status.className = "card-shell-status error";
          });
      });
      wrap.appendChild(button);
    });
    card.body.appendChild(wrap);
    card.body.appendChild(status);
  }

  function render(card, info, pid, token) {
    card.body.replaceChildren();
    var switching = Boolean(info.signedInAs);

    if (switching) {
      paragraph(
        card.body,
        "This invitation is for " + info.email + ". Sign out and continue as that address to see the poll. " +
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
    stayLabel.append(stay, document.createTextNode(" Stay signed in on this device"));
    card.body.appendChild(stayLabel);

    var action = card.addAction(
      switching ? "Sign out and continue as " + info.email : "Continue",
      function (status) {
        var body = { pid: pid, token: token, stay: stay.checked };
        if (terms) {
          body.acceptedTerms = terms.checked;
          body.termsVersion = info.termsVersion;
        }
        if (switching) body.signOut = true;
        return fetch("/api/invitations/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

    function sync() {
      action.setEnabled(!terms || terms.checked);
    }
    sync();

    if (info.providers && info.providers.length > 0) renderProviders(card, info.providers, pid);
  }

  function start() {
    if (!main) return;
    var params = new URLSearchParams(location.search);
    var pid = window.CardShell.sharedPid();
    var token = params.get("token") || "";

    var card = window.CardShell.mount(main, { title: "You're invited to a poll", signin: true, closeHref: "/" });
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
        render(card, r.body, pid, token);
      })
      .catch(function () {
        card.body.replaceChildren();
        paragraph(card.body, "Could not reach the server, please reload the page.");
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
