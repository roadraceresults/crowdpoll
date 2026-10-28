/*
  HARNESS for profile-editor.html (REQUIREMENT Profile Editor). Stands in for
  what profile.html gets from app.js and the server, so production's own
  cardShell.js and profileCard.js draw every state unchanged:

  - window.Session: app.js's API (getSession, subscribe, refresh) over a
    sample snapshot.
  - fetch: answers GET /api/config, PATCH /api/me and POST /api/me/email-change
    with production's status codes and messages, chosen by the Response
    picker. "Email could not be sent" (the 502) applies to the email change,
    which sends mail; a name save succeeds under it. Everything else goes to
    the real fetch.
  - Session and Link result pickers: reload the page with the choices in the
    query string (?session=oauth&changed=1). profileCard.js reads the link
    result from location.search when it starts, and a page opened from file://
    may not rewrite its own URL (history.replaceState throws for origin
    'null'), so a reload is the only way. Response and Theme apply at once and
    ride along in the query string. The harness inserts profileCard.js itself
    once the stub session is set.
  - Material 3 (clarification 6b): a successful name save shows "User name
    saved" as a snackbar for 4 s. In production this belongs in
    profileCard.js's save handler, on r.res.ok; the harness stands in for it
    so the copy stays unchanged.
  - The × (to /) and the result card's Log In (to /login) show
    "(sample only: no action taken)" instead of navigating. So does the one
    state production leaves by setting location.href (no session, no link),
    for which profileCard.js is not run.
*/
(function () {
  'use strict';

  const SAMPLE_NOTE = '(sample only: no action taken)';
  const ACTION_DELAY_MS = 700;

  const MEMBER = {
    userName: 'Sample Member',
    emailAddress: 'member@example.com',
    profileAvatar: 'avatar-default.svg',
    isAdmin: false
  };

  // What profileCard.js reads, and the harness's own parameters beside it.
  const LINK_PARAMS = { '': null, changed: ['changed', '1'], invalid: ['error', 'invalid-link'] };
  const PICKER_PARAMS = { sessionPicker: 'session', responsePicker: 'response', themePicker: 'theme' };

  const sessionPicker = document.getElementById('sessionPicker');
  const linkPicker = document.getElementById('linkPicker');
  const responsePicker = document.getElementById('responsePicker');
  const themePicker = document.getElementById('themePicker');
  const noteEl = document.getElementById('prototypeNote');
  const main = document.getElementById('card-root');

  function note(text) {
    noteEl.textContent = text || '';
  }

  function sample(name, detail) {
    console.log('[sample] ' + name, detail === undefined ? '' : detail);
    note(name + ': ' + SAMPLE_NOTE);
  }

  // ---- Snackbar (M3, clarification 6b) ----

  const SNACKBAR_MS = 4000;
  const snackbar = document.createElement('div');
  snackbar.className = 'profile-snackbar';
  snackbar.setAttribute('role', 'status');
  snackbar.hidden = true;
  document.body.appendChild(snackbar);
  let snackbarTimer = null;

  function showSnackbar(text) {
    clearTimeout(snackbarTimer);
    snackbar.textContent = text;
    snackbar.hidden = false;
    snackbarTimer = setTimeout(() => { snackbar.hidden = true; }, SNACKBAR_MS);
  }

  // ---- window.Session (app.js's API) ----

  let snapshot = null;
  let subscribers = [];

  function publish() {
    subscribers.slice().forEach((fn) => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('[session] subscriber failed:', err);
      }
    });
  }

  window.Session = {
    getSession: () => snapshot,
    subscribe(fn) {
      subscribers.push(fn);
      fn(snapshot);
      return () => {
        const i = subscribers.indexOf(fn);
        if (i >= 0) subscribers.splice(i, 1);
      };
    },
    refresh() {
      // The server's copy is the stub snapshot; a changed one is re-published.
      publish();
      return Promise.resolve(snapshot);
    }
  };

  // ---- fetch stub ----

  const realFetch = window.fetch ? window.fetch.bind(window) : null;

  function json(status, body) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status: status,
      json: () => Promise.resolve(body)
    });
  }

  function later(make) {
    return new Promise((resolve, reject) => {
      setTimeout(() => make().then(resolve, reject), ACTION_DELAY_MS);
    });
  }

  // Production's respondRateLimited shape (src/routes/api.ts).
  function rateLimited() {
    const at = new Date(Date.now() + 15 * 60000);
    return json(429, {
      error: 'Too many requests. You can try again at ' + at.toISOString() + '.',
      nextAllowedAt: at.toISOString()
    });
  }

  // sendsMail: only the email change sends mail, so only it can fail with
  // production's respondMailFailure 502; a name save succeeds under that entry,
  // as it would during a mail outage.
  function answer(onSuccess, refusal, sendsMail) {
    return later(() => {
      switch (responsePicker.value) {
        case 'refused': return json(409, { error: refusal });
        case 'ratelimited': return rateLimited();
        case 'mailfailure': return sendsMail ? json(502, { error: 'Could not send email, try again later' }) : onSuccess();
        case 'network': return Promise.reject(new TypeError('Failed to fetch'));
        default: return onSuccess();
      }
    });
  }

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = ((init && init.method) || 'GET').toUpperCase();
    const path = url.split('?')[0];

    if (path === '/api/config' && method === 'GET') {
      return json(200, { signinMethod: sessionPicker.value === 'oauth' ? 'oauth' : 'native' });
    }
    if (path === '/api/me' && method === 'PATCH') {
      const sent = JSON.parse((init && init.body) || '{}');
      console.log('[sample] PATCH /api/me', sent, responsePicker.value);
      return answer(() => {
        snapshot = Object.assign({}, snapshot, { userName: sent.userName });
        // After the response resolves, as profileCard.js would on r.res.ok.
        setTimeout(() => showSnackbar('User name saved'), 0);
        return json(200, snapshot);
      }, 'That userName is already in use.');
    }
    if (path === '/api/me/email-change' && method === 'POST') {
      const sent = JSON.parse((init && init.body) || '{}');
      console.log('[sample] POST /api/me/email-change', sent, responsePicker.value);
      return answer(() => json(202, {}), 'That email address is already in use.', true);
    }
    return realFetch ? realFetch(input, init) : Promise.reject(new TypeError('No fetch'));
  };

  // ---- Mounting profileCard.js ----

  function mount() {
    subscribers = [];
    main.replaceChildren();
    document.title = 'Profile';
    note('');
    document.querySelectorAll('script[data-profile-card]').forEach((s) => s.remove());

    snapshot = sessionPicker.value === 'none' ? null : Object.assign({}, MEMBER);

    // Production navigates here (location.href = "/login"), which a script
    // cannot intercept, so the card is not run for this one state.
    if (!snapshot && !linkPicker.value) {
      sample('Signed out: the page goes to /login');
      return;
    }

    const script = document.createElement('script');
    script.src = 'profileCard.js';
    script.dataset.profileCard = '';
    document.body.appendChild(script);
  }

  // The × and the result card's Log In navigate in production.
  main.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    event.preventDefault();
    const name = link.classList.contains('card-shell-close') ? 'Close (back to the home page)' : link.textContent.trim();
    sample(name, link.getAttribute('href'));
  });

  // ---- Prototype bar ----

  function reload() {
    const params = new URLSearchParams();
    Object.keys(PICKER_PARAMS).forEach((id) => params.set(PICKER_PARAMS[id], document.getElementById(id).value));
    const link = LINK_PARAMS[linkPicker.value];
    if (link) params.set(link[0], link[1]);
    location.search = '?' + params.toString();
  }

  function applyTheme() {
    if (themePicker.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = themePicker.value;
  }

  sessionPicker.addEventListener('change', reload);
  linkPicker.addEventListener('change', reload);
  themePicker.addEventListener('change', applyTheme);

  // The pickers follow the query string, so a reload keeps every choice (and
  // a browser's restored form values cannot disagree with the card).
  const params = new URLSearchParams(location.search);
  Object.keys(PICKER_PARAMS).forEach((id) => {
    const value = params.get(PICKER_PARAMS[id]);
    const picker = document.getElementById(id);
    picker.value = value !== null && [...picker.options].some((o) => o.value === value) ? value : picker.options[0].value;
  });
  linkPicker.value = params.get('changed') === '1' ? 'changed' : params.get('error') === 'invalid-link' ? 'invalid' : '';
  applyTheme();

  window.remountProfile = mount;
  document.addEventListener('DOMContentLoaded', mount);
})();
