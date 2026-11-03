/**
 * The human check before sign-in: a "Vote protection" card holding the
 * self-hosted FCaptcha widget, shown in place of the page's own card until it
 * is passed. The pass is kept in this page's memory only and sent once, in the
 * X-Human-Check header of the next sign-in start request.
 *
 * Widget API: https://github.com/WebDecoy/FCaptcha (client, FCaptcha.render).
 */
(function () {
  "use strict";

  var TITLE = "Vote protection";
  var LABEL = "I am not a Bot or AI Agent";
  var LOAD_TIMEOUT_MS = 10000;
  var FAILED = "We couldn't confirm you're a person. Please try again.";
  var KEEPS_FAILING = " If this keeps happening, write to support@crowdpoll.vote.";
  var UNAVAILABLE = "The human check is unavailable right now.";
  var PASSED = "Thanks, you're through.";

  var token = null;
  var failures = 0;
  var configPromise = null;
  var widgetPromise = null;

  function el(tag, className) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    return n;
  }

  function settings(config) {
    if (config) return Promise.resolve(config.humanCheck || null);
    if (!configPromise) {
      configPromise = fetch("/api/config")
        .then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; });
    }
    return configPromise.then(function (c) { return (c && c.humanCheck) || null; });
  }

  /* Loads the widget script once, from the FCaptcha service on this domain. */
  function loadWidget(endpoint) {
    if (window.FCaptcha) return Promise.resolve(window.FCaptcha);
    if (!widgetPromise) {
      widgetPromise = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        var timer = setTimeout(function () { reject(new Error("timeout")); }, LOAD_TIMEOUT_MS);
        script.src = endpoint + "/fcaptcha.js";
        script.async = true;
        script.onload = function () {
          clearTimeout(timer);
          if (window.FCaptcha) resolve(window.FCaptcha);
          else reject(new Error("no widget"));
        };
        script.onerror = function () {
          clearTimeout(timer);
          reject(new Error("load error"));
        };
        document.head.appendChild(script);
      });
      widgetPromise.catch(function () { widgetPromise = null; });
    }
    return widgetPromise;
  }

  /* The page's scheme as colorScheme.js sets it: Dark under data-theme="dark", Light otherwise. */
  function theme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  /* Draws the page's own card, then says, at the top of its body, that it was
     drawn without a check. */
  function drawUnavailable(main, render) {
    render();
    var body = main.querySelector(".card-shell-body");
    if (!body) return;
    var notice = el("p", "card-shell-status human-check-unavailable");
    notice.setAttribute("role", "status");
    notice.textContent = UNAVAILABLE;
    body.insertBefore(notice, body.firstChild);
  }

  function mountCheck(main, action, render, humanCheck) {
    var card = window.CardShell.mount(main, { title: TITLE, signin: true, closeHref: "/" });
    card.face.classList.add("human-check-card");

    var widget = el("div", "human-check-widget");
    var why = el("p", "card-shell-line human-check-why");
    var link = el("a");
    link.href = "/privacy#bot-check";
    link.textContent = "What this safeguard checks.";
    why.append(link);
    var status = el("p", "card-shell-status human-check-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    var retry = el("button", "btn-primary btn-vote human-check-retry");
    retry.type = "button";
    retry.textContent = "Try again";
    retry.hidden = true;
    card.body.append(widget, why, retry, status);

    var widgetId = null;
    var settled = false;

    function say(text, isError) {
      status.textContent = text;
      status.className = "card-shell-status human-check-status" + (isError ? " error" : "");
    }

    function draw(FCaptcha) {
      if (widgetId !== null && FCaptcha.destroy) FCaptcha.destroy(widgetId);
      widget.replaceChildren();
      // The checkbox widget fetches its challenge from the page-wide server URL, not from render's serverUrl.
      FCaptcha.configure({ serverUrl: humanCheck.endpoint });
      widgetId = FCaptcha.render(widget, {
        siteKey: humanCheck.siteKey,
        serverUrl: humanCheck.endpoint,
        theme: theme(),
        action: action,
        strings: { label: LABEL },
        callback: function (value) {
          if (settled) return;
          settled = true;
          token = value;
          failures = 0;
          say(PASSED, false);
          render();
        },
        errorCallback: function () {
          failures += 1;
          say(FAILED + (failures >= 3 ? KEEPS_FAILING : ""), true);
          retry.hidden = false;
        },
        expiredCallback: function () {
          token = null;
        }
      });
      // The widget draws its maker's name beside the box; the card's own title stands in for it.
      var branding = widget.querySelector(".fcaptcha-branding");
      if (branding) branding.remove();
    }

    function unavailable(reason) {
      if (settled) return;
      settled = true;
      console.warn("[human-check] The check could not be loaded (" + reason + ")");
      drawUnavailable(main, render);
    }

    loadWidget(humanCheck.endpoint).then(function (FCaptcha) {
      try {
        draw(FCaptcha);
      } catch (err) {
        unavailable("render failed");
        return;
      }
      retry.addEventListener("click", function () {
        retry.hidden = true;
        say("", false);
        draw(FCaptcha);
      });
      // The account's scheme can arrive after the widget is drawn; an unticked widget is redrawn to match.
      var drawnIn = theme();
      new MutationObserver(function () {
        if (settled || theme() === drawnIn) return;
        drawnIn = theme();
        draw(FCaptcha);
      }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    }, function (err) {
      unavailable(err && err.message ? err.message : "load error");
    });
  }

  window.HumanCheck = {
    /**
     * Shows the check in `main`, and calls `render` (which draws the page's own
     * card) once it is passed, or at once when the check is off. `config` is
     * the /api/config answer when the page already has it.
     */
    gate: function (main, action, render, config) {
      settings(config).then(function (humanCheck) {
        if (!humanCheck) {
          render();
          return;
        }
        token = null;
        mountCheck(main, action, render, humanCheck);
      });
    },
    /** The header carrying the pass, once; empty when none is held. */
    headers: function () {
      if (!token) return {};
      var value = token;
      token = null;
      return { "X-Human-Check": value };
    },
    /** True when the server refused a request for want of a pass. */
    refused: function (body) {
      return Boolean(body && body.code === "challenge-required");
    }
  };
})();
