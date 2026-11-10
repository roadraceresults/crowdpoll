/*
  DEVICE EVIDENCE — computes this browser's fingerprint for a logged-in user, at
  idle and at most once per page, and keeps it in page memory. Votes carry it when
  it is ready and never wait for it; any failure leaves them without it, silently.
  A session not yet reported sends its one login event, with or without a value.
*/
(function () {
  "use strict";

  const LIBRARY = "/vendor/fingerprintjs-5.3.0.min.js";
  // What browsers report alike, so two browsers on one device can match.
  const HARDWARE_COMPONENTS = ["screenResolution", "colorDepth", "hardwareConcurrency", "timezone", "platform"];
  const VALUE = /^[0-9a-f]{32}\.[0-9a-f]{32}$/;
  const IDLE_TIMEOUT_MS = 2000;
  const NO_IDLE_CALLBACK_DELAY_MS = 200;

  let value = null;
  let started = false;

  function headers() {
    return value ? { "X-Device-Fingerprint": value } : {};
  }

  function loadLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = LIBRARY;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function compute() {
    await loadLibrary();
    const library = window.FingerprintJS;
    // Without this the npm build reports usage to the vendor on some loads:
    // https://github.com/fingerprintjs/fingerprintjs/blob/master/docs/api.md
    const agent = await library.load({ monitoring: false });
    const { visitorId, components } = await agent.get();
    const hardware = {};
    for (const name of HARDWARE_COMPONENTS) {
      if (components[name] && !("error" in components[name])) hardware[name] = components[name];
    }
    const candidate = visitorId + "." + library.hashComponents(hardware);
    if (VALUE.test(candidate)) value = candidate;
  }

  function whenIdle(work) {
    if (window.requestIdleCallback) window.requestIdleCallback(work, { timeout: IDLE_TIMEOUT_MS });
    else setTimeout(work, NO_IDLE_CALLBACK_DELAY_MS);
  }

  function shouldCompute() {
    return Boolean(window.VoteClient || window.DeviceSignInDue);
  }

  async function reportSignIn() {
    try {
      await fetch("/api/me/device-login", { method: "POST", headers: headers() });
    } catch {
      // A later page reports instead, since the session is still due.
    }
  }

  async function run() {
    try {
      await compute();
    } catch {
      value = null;
    }
    if (window.DeviceSignInDue) await reportSignIn();
  }

  function consider(me) {
    if (started || !me || me.termsAccepted === false) return;
    started = true;
    Promise.resolve(window.SiteConfig).then((config) => {
      if (!config || !config.deviceEventsEnabled) return;
      whenIdle(() => {
        if (shouldCompute()) run();
      });
    });
  }

  window.DeviceEvidence = { headers: headers };
  window.Session.subscribe(consider);
})();
