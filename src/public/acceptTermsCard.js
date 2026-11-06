(function () {
  "use strict";

  var main = document.getElementById("card-root");

  /* A new account, such as one just made by a provider login, has never
     accepted any version, so it is greeted rather than told the Terms changed. */
  function start() {
    if (!main) return;
    fetch("/api/me")
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(render);
  }

  /* The first page after accepting needs no "Logged in as": this card has already said it. */
  function withoutSignInMark(next) {
    var queryAt = next.indexOf("?");
    if (queryAt < 0) return next;
    var params = new URLSearchParams(next.slice(queryAt + 1));
    if (!params.has("signedIn")) return next;
    params.delete("signedIn");
    var query = params.toString();
    return next.slice(0, queryAt) + (query ? "?" + query : "");
  }

  /* Names what changed since this account last accepted. Without that answer it speaks of the Terms. */
  function updatedDocuments(me) {
    if (me.privacyUpdated !== true) return "Terms of Service";
    return me.termsUpdated === true ? "Terms of Service and Privacy Policy" : "Privacy Policy";
  }

  function render(me) {
    var next = withoutSignInMark(new URLSearchParams(location.search).get("next") || "/");
    var documents = updatedDocuments(me);
    var notice = me.termsFirstAcceptance === true
      ? {
          title: "Welcome to CrowdPoll",
          signin: true,
          subtitle: "Before you continue, please accept the Terms of Service."
        }
      : {
          title: "Updated " + documents,
          signin: true,
          subtitle: "Please read and accept the " + documents + " to continue."
        };
    document.title = notice.title;
    var card = window.CardShell.mount(main, notice);
    if (me.emailAddress) {
      var account = document.createElement("p");
      account.className = "card-shell-line accept-terms-account";
      var address = document.createElement("strong");
      address.textContent = me.emailAddress;
      account.append(document.createTextNode("Logged in as "), address);
      card.body.appendChild(account);
    }
    var terms = window.CardShell.termsBox(card.body, function () { accept.setEnabled(terms.checked); }, true);
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

    var signOut = card.addAction("Log Out", function () {
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
