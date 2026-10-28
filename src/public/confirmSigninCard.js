(function () {
  "use strict";

  var main = document.getElementById("card-root");

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

  function loginHref(pid) {
    return pid ? "/login?PID=" + encodeURIComponent(pid) : "/login";
  }

  function showInvalid(card, pid) {
    card.body.replaceChildren();
    paragraph(card.body, "This sign-in link is invalid or has expired.");
    var link = el("a", "card-shell-link");
    link.href = loginHref(pid);
    link.textContent = "Request a new sign-in link";
    card.body.appendChild(link);
  }

  function start() {
    if (!main) return;
    var params = new URLSearchParams(location.search);
    var token = params.get("token") || "";
    var stay = params.get("stay") === "1";
    var pid = window.CardShell.sharedPid();

    var card = window.CardShell.mount(main, { title: "Sign in on this device?", closeHref: "/" });
    paragraph(card.body, "Checking your sign-in link…");

    fetch("/api/auth/link-info?token=" + encodeURIComponent(token))
      .then(function (res) {
        if (!res.ok) throw new Error("invalid");
        return res.json();
      })
      .then(function (info) {
        card.body.replaceChildren();
        var line = paragraph(card.body, "This link signs you in as ");
        var who = el("strong");
        who.textContent = info.email;
        line.append(who, document.createTextNode("."));
        paragraph(
          card.body,
          "It was requested on " + new Date(info.requestedAt).toLocaleString() + " from another browser or device."
        );

        var notNow = el("a", "card-shell-link");
        notNow.href = loginHref(pid);
        notNow.textContent = "Not now";

        card.addAction("Sign in", function (status) {
          return fetch("/api/auth/confirm-signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pid ? { token: token, stay: stay, pid: pid } : { token: token, stay: stay })
          })
            .then(function (res) {
              return res.json().then(function (body) { return { res: res, body: body }; });
            })
            .then(function (r) {
              if (r.body && r.body.redirect) {
                location.href = r.body.redirect;
                return;
              }
              status.textContent = (r.body && r.body.error) || "Could not sign you in, please try again.";
              status.className = "card-shell-status error";
            })
            .catch(function () {
              status.textContent = "Could not reach the server, please try again.";
              status.className = "card-shell-status error";
            });
        });
        card.face.appendChild(notNow);
      })
      .catch(function () {
        showInvalid(card, pid);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
