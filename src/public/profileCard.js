/**
 * 013-UI-UX-revisions — the Profile page (US1).
 *
 * Two states drawn by one script:
 *   - the verification result, rendered from the query string alone, which is
 *     what a link followed in a browser with no session lands on;
 *   - the Profile card, for a signed-in visitor.
 *
 * The result is read before the session is evaluated, so the same script draws
 * the page on both paths and the result never depends on a session lookup.
 */
(function () {
  "use strict";

  var SNACKBAR_MS = 4000;
  var snackbar = null;
  var snackbarTimer = null;

  function showSnackbar(text) {
    if (!snackbar) {
      snackbar = document.createElement("div");
      snackbar.className = "profile-snackbar";
      snackbar.setAttribute("role", "status");
      snackbar.hidden = true;
      document.body.appendChild(snackbar);
    }
    clearTimeout(snackbarTimer);
    snackbar.textContent = text;
    snackbar.hidden = false;
    snackbarTimer = setTimeout(function () { snackbar.hidden = true; }, SNACKBAR_MS);
  }

  /**
   * Each result has two wordings, because the same link lands in two very
   * different places. `subtitle` is the session-less card: that person has no
   * session in this browser, so the next thing they need is to sign in.
   * `onCard` is the status line of a visitor who is already signed in — the
   * change does not end their session, so telling them to sign in would be
   * wrong, and telling them to go to their Profile page would be odd when they
   * are looking at it.
   */
  var RESULTS = {
    changed: {
      title: "Email Address Changed",
      subtitle: "Your email address has been updated. Sign in with your new address to continue.",
      onCard: "Your email address has been updated."
    },
    invalid: {
      title: "Link No Longer Valid",
      subtitle:
        "This verification link has expired, has already been used, has been replaced by a " +
        "newer request, or the address is now in use by another account. Start the change " +
        "again from your Profile page.",
      onCard:
        "That verification link has expired, has already been used, has been replaced by a " +
        "newer request, or the address is now in use by another account. You can start the " +
        "change again."
    },
    notLaunched: {
      title: "Not Launched Yet",
      subtitle: "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only.",
      onCard: "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only."
    }
  };

  /* FR-006: read from the query string only, and never an address. The four
     refusal causes are stated together rather than identifying which occurred —
     the redirect reports only that the link was refused. */
  var params = new URLSearchParams(location.search);
  var result =
    params.get("changed") === "1" ? "changed" :
    params.get("error") === "invalid-link" ? "invalid" :
    params.get("error") === "not-launched" ? "notLaunched" : null;

  var main = document.getElementById("card-root");
  var ui = null;

  function el(tag, className) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    return n;
  }

  /** Reports an outcome into a status line, styling refusals as errors. */
  function report(status, res, body, okText) {
    if (res.ok) {
      status.textContent = okText;
      status.className = "card-shell-status";
    } else if (res.status === 429 && body.nextAllowedAt) {
      status.textContent =
        "Too many requests. You can try again at " +
        new Date(body.nextAllowedAt).toLocaleTimeString() + ".";
      status.className = "card-shell-status error";
    } else {
      status.textContent = body.error || "Something went wrong, please try again.";
      status.className = "card-shell-status error";
    }
  }

  /* ---------- the result state (no session) ---------- */

  function renderResultCard() {
    var spec = RESULTS[result];
    var card = window.CardShell.mount(main, {
      title: spec.title,
      subtitle: spec.subtitle,
      closeHref: "/"
    });
    /* The tab and the accessibility tree must not say "Profile" over a page
       reporting a completed email change. */
    document.title = spec.title;

    var row = el("div", "card-shell-actions");
    var group = el("div", "card-shell-action");
    var link = el("a", "btn-primary btn-vote");
    link.href = "/login";
    link.textContent = "Log In";
    group.appendChild(link);
    row.appendChild(group);
    card.face.appendChild(row);
  }

  /* ---------- the Profile card (signed in) ---------- */

  function buildProfileCard(me) {
    /* The avatar occupies the subtitle slot, right-aligned; there is no
       subtitle text on this card. */
    var avatarWrap = el("div", "profile-avatar-wrap");
    var avatar = el("img", "avatar profile-card-avatar");
    avatar.width = 48;
    avatar.height = 48;
    avatar.alt = "Profile avatar (not editable)";
    avatarWrap.appendChild(avatar);

    var card = window.CardShell.mount(main, {
      title: "Profile",
      subtitle: avatarWrap,
      closeHref: "/"
    });

    var body = card.body;

    function section() {
      var sec = el("div", "profile-section");
      body.appendChild(sec);
      return sec;
    }

    function field(parent, labelText, opts) {
      var group = el("div", "card-shell-group");
      var label = el("label");
      label.setAttribute("for", opts.id);
      label.textContent = labelText;
      var input = el("input", opts.readOnly ? "profile-current" : null);
      input.id = opts.id;
      input.type = opts.type || "text";
      input.maxLength = 200;
      if (opts.readOnly) {
        input.readOnly = true;
        input.tabIndex = -1;
      }
      if (opts.placeholder) input.placeholder = opts.placeholder;
      label.htmlFor = opts.id;
      group.append(label, input);
      parent.appendChild(group);
      return input;
    }

    // --- user name ---
    var nameSection = section();
    var currentName = field(nameSection, "Current User Name", { id: "currentUserName", readOnly: true });
    var nameInput = field(nameSection, "New User Name", { id: "userName", placeholder: "enter new user name" });

    var saveName = card.addAction("Save User Name", function (status) {
      return fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: nameInput.value })
      })
        .then(function (res) {
          return res.json().then(function (body) { return { res: res, body: body }; });
        })
        .then(function (r) {
          report(status, r.res, r.body, "Saved.");
          if (r.res.ok) showSnackbar("User name saved");
          /* FR-033: this action does not navigate. The card and the header both
             show the new name, which the shared snapshot delivers. */
          if (r.res.ok && window.Session) window.Session.refresh();
        })
        .catch(function () {
          status.textContent = "Could not reach the server, please try again.";
          status.className = "card-shell-status error";
        });
    }, { into: nameSection });

    // FR-057 precedent: maxlength stops the typing, this is the feedback half.
    nameInput.addEventListener("input", function () {
      if (nameInput.value.length >= nameInput.maxLength) {
        saveName.status.textContent = "Maximum " + nameInput.maxLength + " characters reached.";
        saveName.status.className = "card-shell-status error";
      } else if (saveName.status.className.indexOf("error") >= 0) {
        saveName.status.textContent = "";
        saveName.status.className = "card-shell-status";
      }
    });

    // --- email address ---
    var emailSection = section();
    var currentEmail = field(emailSection, "Current Email Address", { id: "currentEmail", readOnly: true });
    var changeInput = field(emailSection, "New Email Address", {
      id: "newEmail",
      type: "email",
      placeholder: "enter new email address"
    });
    var changeGroup = changeInput.parentNode;
    var homepage = window.CardShell.hiddenField(emailSection);

    var sendLink = card.addAction("Send Verification Link", function (status) {
      var address = changeInput.value;
      return fetch("/api/me/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: address, homepage: homepage.value })
      })
        .then(function (res) {
          return res.json().then(function (body) { return { res: res, body: body }; });
        })
        .then(function (r) {
          /* The endpoint answers 202, so success is a successful response
             rather than a particular code. The card stays; the address the
             link went to is named, so the person can see what was sent. */
          report(
            status, r.res, r.body,
            "Verification sent to " + address + " — click the link in that email to finish the change."
          );
        })
        .catch(function () {
          status.textContent = "Could not reach the server, please try again.";
          status.className = "card-shell-status error";
        });
    }, { into: emailSection });

    var dataSection = section();
    dataSection.classList.add("profile-your-data");
    var dataHeading = el("h3", "profile-your-data-heading");
    dataHeading.textContent = "Your Data";
    var copyLine = el("p", "card-shell-line");
    copyLine.textContent =
      "To get a copy of the data CrowdPoll holds about you, write to privacy@crowdpoll.vote. We answer within 30 days.";
    var policyLink = el("a", "card-shell-link");
    policyLink.href = "/privacy";
    policyLink.textContent = "Read the Privacy Policy";
    var deleteButton = el("button", "profile-delete-btn");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete Account";
    deleteButton.addEventListener("click", function () { openDeleteDialog(deleteButton); });
    dataSection.append(dataHeading, copyLine, policyLink, deleteButton);

    /* Each action is unavailable until its field holds text that differs from
       the current value: submitting the name someone already has, or the
       address they already use, is not a change. Both start unavailable now,
       because both "new" fields start empty. */
    function syncEnabled() {
      var name = nameInput.value.trim();
      var email = changeInput.value.trim();
      saveName.setEnabled(name.length > 0 && name !== currentName.value);
      sendLink.setEnabled(email.length > 0 && email !== currentEmail.value);
    }
    nameInput.addEventListener("input", syncEnabled);
    changeInput.addEventListener("input", syncEnabled);
    syncEnabled();

    return {
      card: card,
      syncEnabled: syncEnabled,
      avatar: avatar,
      currentName: currentName,
      nameInput: nameInput,
      currentEmail: currentEmail,
      emailSection: emailSection,
      changeGroup: changeGroup,
      changeInput: changeInput,
      sendAction: sendLink,
      saveAction: saveName,
      lastEmail: null,
      lastName: null
    };
  }

  var DELETE_DIALOG_LINES = [
    "This deletes your account, your sessions, your bookmarks and the polls you created, with their votes.",
    "Your votes on other people's polls stay counted, but show as “Deleted user”.",
    "If you were banned from a poll, the ban stays.",
    "This cannot be undone."
  ];

  function openDeleteDialog(opener) {
    var scrim = el("div", "delete-dialog-scrim");
    var dialog = el("div", "delete-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "deleteDialogTitle");
    var title = el("h2", "delete-dialog-title");
    title.id = "deleteDialogTitle";
    title.textContent = "Delete your account?";
    dialog.appendChild(title);
    DELETE_DIALOG_LINES.forEach(function (line) {
      var p = el("p", "card-shell-line");
      p.textContent = line;
      dialog.appendChild(p);
    });
    var label = el("label");
    label.setAttribute("for", "deleteConfirm");
    label.textContent = "Type DELETE to confirm";
    var field = el("input");
    field.id = "deleteConfirm";
    field.type = "text";
    field.autocomplete = "off";
    var status = el("p", "card-shell-status");
    status.setAttribute("role", "status");
    var actions = el("div", "delete-dialog-actions");
    var cancel = el("button", "delete-dialog-cancel");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    var confirm = el("button", "profile-delete-btn");
    confirm.type = "button";
    confirm.textContent = "Delete Account";
    confirm.disabled = true;
    actions.append(cancel, confirm);
    dialog.append(label, field, status, actions);
    scrim.appendChild(dialog);
    document.body.appendChild(scrim);
    field.focus();

    function close() {
      document.removeEventListener("keydown", onKey, true);
      scrim.remove();
      opener.focus();
    }
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      var focusable = [field, cancel, confirm].filter(function (n) { return !n.disabled; });
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    field.addEventListener("input", function () { confirm.disabled = field.value !== "DELETE"; });
    cancel.addEventListener("click", close);
    confirm.addEventListener("click", function () {
      confirm.disabled = true;
      fetch("/api/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: field.value })
      })
        .then(function (res) {
          return res.json().then(function (body) { return { res: res, body: body }; });
        })
        .then(function (r) {
          if (r.res.ok) {
            location.href = r.body.redirect || "/";
            return;
          }
          status.textContent = r.body.error || "Something went wrong, please try again.";
          status.className = "card-shell-status error";
          confirm.disabled = field.value !== "DELETE";
        })
        .catch(function () {
          status.textContent = "Could not reach the server, please try again.";
          status.className = "card-shell-status error";
          confirm.disabled = field.value !== "DELETE";
        });
    });
  }

  /** Applies a snapshot to the built card. */
  function applyProfile(me, config) {
    ui.avatar.src = me.profileAvatar || "/avatar-default.svg";

    /* The current values are read-only, so a snapshot writes them freely — the
       person is never typing in them. FR-019's concern moves to the "new"
       fields below, which hold their own text. */
    ui.currentName.value = me.userName || "";
    ui.currentEmail.value = me.emailAddress || "";

    /* FR-018: when a value itself has changed, whatever the person typed to
       change it has either completed or been superseded — so that field is
       cleared, and so is anything reported about it, which now describes a
       change that is no longer pending. A snapshot differing in any other
       field leaves both alone, and neither is touched while it holds text the
       person is still working on. */
    if (ui.lastName !== null && ui.lastName !== me.userName) {
      ui.nameInput.value = "";
      ui.saveAction.status.textContent = "";
      ui.saveAction.status.className = "card-shell-status";
    }
    ui.lastName = me.userName;

    if (ui.lastEmail !== null && ui.lastEmail !== me.emailAddress) {
      ui.changeInput.value = "";
      ui.sendAction.status.textContent = "";
      ui.sendAction.status.className = "card-shell-status";
    }
    ui.lastEmail = me.emailAddress;

    /* FR-037: in oauth mode the address is provider-supplied and read-only,
       and POST /api/me/email-change answers 404. A card must not offer a
       control the system would refuse. */
    /* FR-037: in oauth mode the address is provider-supplied and read-only and
       the endpoint answers 404, so the whole section goes rather than leaving a
       current-value box above a hidden field. */
    var oauth = config && config.signinMethod === "oauth";
    ui.emailSection.hidden = oauth;

    /* This function writes both fields — the display name from the snapshot and
       the change box when the address moved — so the gates are re-evaluated
       against what the fields now hold, not what the person last typed. */
    ui.syncEnabled();
  }

  function fetchConfig() {
    return fetch("/api/config")
      .then(function (r) { return r.ok ? r.json() : { signinMethod: "native" }; })
      .catch(function () { return { signinMethod: "native" }; });
  }

  function start() {
    if (!main) return;
    fetchConfig().then(function (config) {
      window.Session.subscribe(function (me) {
        if (!me) {
          /* The server serves this page to a session-less visitor only when a
             result is present, so this is the R8 landing. Anything else means
             the session ended while the page was open (FR-014). */
          if (result) {
            if (!ui) renderResultCard();
          } else {
            location.href = "/login";
          }
          return;
        }
        if (!ui) ui = buildProfileCard(me);
        applyProfile(me, config);
        /* FR-007: a link followed in the browser that requested it is reported
           on the card, in the status line of the action it concerns. */
        if (result && ui.sendAction.status.textContent === "") {
          ui.sendAction.status.textContent = RESULTS[result].onCard;
          ui.sendAction.status.className =
            "card-shell-status" + (result === "changed" ? "" : " error");
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
