/**
 * Site Settings — the Site Settings page (contracts C3, C4).
 *
 * One setting, the color scheme. A choice is applied at once, in the same task
 * as the radio's change event, and then saved to the account; there is no
 * Save button. Saves are serialized: one in flight, at most one queued, and
 * the pending choice wins over any session snapshot that arrives meanwhile.
 */
(function () {
  "use strict";

  var FAILED = "Your color scheme could not be saved. Please try again.";

  var main = document.getElementById("card-root");
  var ui = null;
  /* What the account holds, as far as this page knows: the last successful
     save, or the last session snapshot, whichever came later (C4 step 4). */
  var lastSaved = "light";
  var inFlight = false;
  var queued = null;

  function el(tag, className) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    return n;
  }

  function schemeOf(me) {
    return me && me.colorScheme === "dark" ? "dark" : "light";
  }

  function check(scheme) {
    ui.radios.forEach(function (radio) { radio.checked = radio.value === scheme; });
  }

  function buildCard() {
    /* The gear occupies the avatar's slot on the Profile card, at its size. */
    var glyphWrap = el("div", "profile-avatar-wrap");
    glyphWrap.innerHTML =
      '<svg class="settings-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      ((window.SiteGlyphs && window.SiteGlyphs.settings) || "") + "</svg>";

    var card = window.CardShell.mount(main, {
      title: "Site Settings",
      subtitle: glyphWrap,
      closeHref: "/"
    });
    document.title = "Site Settings";

    var group = el("div", "settings-group");
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-labelledby", "color-scheme-label");
    var label = el("span", "settings-group-label");
    label.id = "color-scheme-label";
    label.textContent = "Color Scheme";
    group.appendChild(label);

    var radios = [["light", "Light (default)"], ["dark", "Dark"]].map(function (option) {
      var row = el("label");
      var radio = el("input");
      radio.type = "radio";
      radio.name = "colorScheme";
      radio.value = option[0];
      row.append(radio, " " + option[1]);
      group.appendChild(row);
      radio.addEventListener("change", function () {
        if (radio.checked) choose(radio.value);
      });
      return radio;
    });

    var message = el("p", "settings-message");
    message.setAttribute("role", "status");
    group.appendChild(message);
    card.body.appendChild(group);

    return { radios: radios, message: message };
  }

  /* C4 step 1: applied before anything is awaited (SC-002). */
  function choose(scheme) {
    window.ColorScheme.setSaving(true);
    window.ColorScheme.apply(scheme);
    ui.message.textContent = "";
    if (inFlight) {
      queued = scheme;
      return;
    }
    send(scheme);
  }

  function send(scheme) {
    inFlight = true;
    fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colorScheme: scheme })
    })
      .then(function (res) { return res.status; }, function () { return 0; })
      .then(function (status) {
        inFlight = false;
        if (status === 401) {
          location.href = "/login";
          return;
        }
        if (status < 200 || status >= 300) {
          fail();
          return;
        }
        lastSaved = scheme;
        if (queued !== null) {
          var next = queued;
          queued = null;
          send(next);
          return;
        }
        window.ColorScheme.setSaving(false);
        window.Session.refresh();
      });
  }

  function fail() {
    queued = null;
    window.ColorScheme.setSaving(false);
    window.ColorScheme.apply(lastSaved);
    check(lastSaved);
    ui.message.textContent = FAILED;
  }

  function start() {
    if (!main) return;
    window.Session.subscribe(function (me) {
      if (!me) {
        location.href = "/login";
        return;
      }
      lastSaved = schemeOf(me);
      if (!ui) {
        ui = buildCard();
        check(lastSaved);
        return;
      }
      /* C4 step 5: while a save is in flight or queued, the pending choice
         keeps the radio; the snapshot is recorded in lastSaved only. */
      if (!inFlight && queued === null) check(lastSaved);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
