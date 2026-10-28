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
    titleRow.append(heading, closeControl(opts.closeHref || "/"));
    face.appendChild(titleRow);

    var subtitle = null;
    if (opts.subtitle !== undefined && opts.subtitle !== null && opts.subtitle !== "") {
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
             "email me a link" click would spend another rate-limit attempt
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

  window.CardShell = { mount: mount };
})();
