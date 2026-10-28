/**
 * 013-UI-UX-revisions — the card shell (contract C1).
 *
 * A sibling of PollCard, not a reuse of it: one face, no rear face, no flip,
 * no polling timer. Login, Create Account, Profile and Not Authorized mount
 * their contents into it. It shares pollCard.css's tokens and its
 * .card-viewport / .card-face / .question / .subtitle / .btn-primary.btn-vote
 * / .icon-btn rules; the shell's own rules live in site.css.
 */
(function () {
  "use strict";

  /* research R13: the close control is named for where it goes, matching the
     app's two existing back controls ("Back to poll list", "Back to results
     without voting"). An × that announced itself as "Close" would promise a
     dismissal it cannot perform — it navigates. */
  var CLOSE_LABEL = "Back to the home page";

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function closeControl(href) {
    var a = el("a", "icon-btn card-shell-close");
    a.href = href;
    a.setAttribute("aria-label", CLOSE_LABEL);
    a.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
    return a;
  }

  var LOCK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>' +
    '<path d="M12 15v2"/></svg>';

  /**
   * Mounts the shell into `container` and returns the regions the caller fills.
   * Only regions with content are rendered (FR-035): a card with no subtitle
   * has no subtitle region and no space where one would have been, and the
   * action row appears only once an action is added.
   */
  function mount(container, options) {
    var opts = options || {};

    var viewport = el("div", "card-viewport card-shell-viewport");
    var face = el("div", "card-face card-shell-face");

    var titleRow = el("div", "card-shell-title-row");
    /* FR-030: the title is the page's heading. A poll card is one of many in a
       grid and titles nothing, so it uses a <p>; each of these pages is a
       single card and its title is the page's heading. */
    var heading = el("h1", "question");
    heading.textContent = opts.title || "";
    var close = closeControl(opts.closeHref || "/");
    /* The sign-in cards carry a lock badge on a row of its own, with the close
       control beside it, above the title. */
    if (opts.signin) {
      face.classList.add("card-shell-signin");
      var topRow = el("div", "card-shell-top-row");
      var badge = el("div", "card-shell-badge");
      badge.innerHTML = LOCK_ICON;
      topRow.append(badge, close);
      face.appendChild(topRow);
      titleRow.appendChild(heading);
    } else {
      titleRow.append(heading, close);
    }
    face.appendChild(titleRow);

    var subtitle = null;
    if (Array.isArray(opts.subtitle) || opts.note) {
      subtitle = el("div", "subtitle card-shell-subtitle");
      (opts.subtitle || []).forEach(function (line) {
        subtitle.appendChild(el("span", "card-shell-subtitle-line")).textContent = line;
      });
      if (opts.note) subtitle.appendChild(el("span", "card-shell-subtitle-note")).textContent = opts.note;
      face.appendChild(subtitle);
    } else if (opts.subtitle !== undefined && opts.subtitle !== null && opts.subtitle !== "") {
      subtitle = el("div", "subtitle card-shell-subtitle");
      if (typeof opts.subtitle === "string") subtitle.textContent = opts.subtitle;
      else subtitle.appendChild(opts.subtitle);
      face.appendChild(subtitle);
    }

    var body = el("div", "card-shell-body");
    face.appendChild(body);

    /* The action row is created lazily by addAction() so a card with no
       actions renders none. */
    var actions = null;
    function actionRow() {
      if (!actions) {
        actions = el("div", "card-shell-actions");
        face.appendChild(actions);
      }
      return actions;
    }

    viewport.appendChild(face);
    container.replaceChildren(viewport);

    /**
     * One action plus its own status line (contract C2). The status element is
     * present and empty from first paint — a live region announces text
     * arriving *into* it, so a message rendered into an element created at the
     * same moment announces nothing.
     */
    function addAction(label, onRun, options) {
      /* By default an action joins the card's action row at the foot of the
         face. A card whose actions belong beside the fields they act on —
         Profile has one per section — passes `into` and places them itself. */
      var row = (options && options.into) || actionRow();
      var group = el("div", "card-shell-action");
      var button = el("button", "btn-primary btn-vote");
      button.type = "button";
      button.textContent = label;

      var status = el("p", "card-shell-status");
      status.setAttribute("role", "status");

      /* T008 / FR-046: the action is unavailable from click until its outcome
         arrives. The email-sending endpoints allow 2 requests per 15 minutes by
         default, so without this a double-click spends someone's whole
         allowance and locks them out. */
      var running = false;
      var settled = false;
      /* Held unavailable by the page — e.g. until a required field has been
         filled. Kept separate from `running` and `settled` so the three states
         cannot undo one another: typing during a request must not re-enable
         the button, and a completed request must stay settled whatever the
         fields say. */
      var gated = false;
      button.addEventListener("click", function () {
        if (running || settled || gated) return;
        running = true;
        button.disabled = true;
        button.classList.add("is-running");
        var restore = function () {
          running = false;
          button.classList.remove("is-running");
          /* An action that has done its job stays unavailable: a second
             "email a link" click would spend another rate-limit attempt
             for a link the person already has. */
          if (!settled && !gated) button.disabled = false;
        };
        var result;
        try {
          result = onRun(status);
        } catch (err) {
          restore();
          throw err;
        }
        if (result && typeof result.then === "function") result.then(restore, restore);
        else restore();
      });

      group.append(button, status);
      row.appendChild(group);
      return {
        button: button,
        status: status,
        /** Marks the action complete: it reports its outcome and stays disabled. */
        settle: function () {
          settled = true;
          button.disabled = true;
          button.classList.remove("is-running");
        },
        /** Holds the action unavailable until the page says otherwise. */
        setEnabled: function (on) {
          gated = !on;
          if (!settled && !running) button.disabled = gated;
        }
      };
    }

    return {
      viewport: viewport,
      face: face,
      subtitle: subtitle,
      body: body,
      addAction: addAction,
      /** The first status line — where a notice that belongs to no action goes. */
      firstStatus: function () {
        return face.querySelector(".card-shell-status");
      }
    };
  }

  var POLL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** The poll id a shared link carried to this page, or null when absent or not a poll id. */
  function sharedPid() {
    var value = new URLSearchParams(location.search).get("PID");
    return value && POLL_ID.test(value) ? value : null;
  }

  /** The line above a sign-in form that explains why the visitor is here; nothing about the poll. */
  function addSharedPollLine(card) {
    if (!sharedPid()) return;
    var line = document.createElement("p");
    line.className = "shared-poll-line";
    line.textContent = "Sign in to see the poll that was shared with you.";
    card.body.appendChild(line);
  }

  function hiddenField(parent) {
    var wrapper = document.createElement("div");
    wrapper.className = "hp-field";
    wrapper.setAttribute("aria-hidden", "true");
    var label = document.createElement("label");
    label.textContent = "Leave this field empty ";
    var input = document.createElement("input");
    input.type = "text";
    input.name = "homepage";
    input.setAttribute("tabindex", "-1");
    input.setAttribute("autocomplete", "off");
    label.appendChild(input);
    wrapper.appendChild(label);
    parent.appendChild(wrapper);
    return input;
  }

  function docLink(href, text) {
    var a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
  }

  function termsBox(parent, onChange) {
    var label = document.createElement("label");
    label.className = "checkbox terms-box";
    var box = document.createElement("input");
    box.type = "checkbox";
    box.id = "terms";
    box.name = "terms";
    var text = document.createElement("span");
    text.className = "terms-box-text";
    text.append(
      document.createTextNode("I agree to the "),
      docLink("/terms", "Terms of Service"),
      document.createElement("br"),
      document.createTextNode("and have read the "),
      docLink("/privacy", "Privacy Policy"),
      document.createTextNode(".")
    );
    label.append(box, text);
    box.addEventListener("change", onChange);
    parent.appendChild(label);
    return box;
  }

  function termsLine(parent, lead) {
    var line = document.createElement("p");
    line.className = "card-shell-line login-terms-line";
    line.append(
      document.createTextNode(lead + " the "),
      docLink("/terms", "Terms of Service"),
      document.createElement("br"),
      document.createTextNode("and "),
      docLink("/privacy", "Privacy Policy"),
      document.createTextNode(".")
    );
    parent.appendChild(line);
    return line;
  }

  /** The line at the foot of a sign-in card that leads to the other one, keeping a shared poll's id. */
  function addFootLine(card, lead, href, text) {
    var line = document.createElement("p");
    line.className = "card-shell-foot";
    var pid = sharedPid();
    line.append(document.createTextNode(lead + " "), docLink(pid ? href + "?PID=" + pid : href, text));
    card.face.appendChild(line);
    return line;
  }

  function termsVersion() {
    return fetch("/api/config")
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (config) { return config.termsVersion || ""; });
  }

  window.CardShell = {
    mount: mount,
    sharedPid: sharedPid,
    addSharedPollLine: addSharedPollLine,
    hiddenField: hiddenField,
    termsBox: termsBox,
    termsLine: termsLine,
    addFootLine: addFootLine,
    termsVersion: termsVersion
  };
})();
