/*
  HARNESS for login-dialog.html (REQUIREMENT Login Dialog). Stands in for the
  server, so production's own cardShell.js and loginCard.js draw every state
  unchanged:

  - fetch: answers GET /api/config and POST /api/auth/request-login-link with
    production's status codes and messages (src/routes/api.ts), chosen by the
    Response picker, including the 502 a mail failure returns. Everything
    else goes to the real fetch.
  - Sign-in method and Link result pickers: reload the page with the choices in
    the query string (?method=oauth&error=invalid-link). loginCard.js reads the
    link result from location.search itself, and a page opened from file://
    may not rewrite its own URL. Response and Theme apply at once and ride
    along in the query string.
  - The × (to /) and the OAuth links (to /api/auth/oauth/<provider>) show
    "(sample only: no action taken)" instead of navigating.

  The Login card reads no session (login.html's data-session-role is app.js's,
  which is not loaded), so there is no Session stub.
*/
(function () {
  'use strict';

  const SAMPLE_NOTE = '(sample only: no action taken)';
  const ACTION_DELAY_MS = 700;
  const PICKER_PARAMS = { methodPicker: 'method', responsePicker: 'response', themePicker: 'theme' };

  const methodPicker = document.getElementById('methodPicker');
  const linkPicker = document.getElementById('linkPicker');
  const responsePicker = document.getElementById('responsePicker');
  const themePicker = document.getElementById('themePicker');
  const noteEl = document.getElementById('prototypeNote');
  const main = document.getElementById('card-root');

  function sample(name, detail) {
    console.log('[sample] ' + name, detail === undefined ? '' : detail);
    noteEl.textContent = name + ': ' + SAMPLE_NOTE;
  }

  // ---- fetch stub ----

  const realFetch = window.fetch ? window.fetch.bind(window) : null;

  function json(status, body) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status: status,
      json: () => Promise.resolve(body)
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

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = ((init && init.method) || 'GET').toUpperCase();
    const path = url.split('?')[0];

    if (path === '/api/config' && method === 'GET') {
      return json(200, { signinMethod: methodPicker.value === 'oauth' ? 'oauth' : 'native' });
    }
    if (path === '/api/auth/request-login-link' && method === 'POST') {
      console.log('[sample] POST /api/auth/request-login-link', JSON.parse((init && init.body) || '{}'), responsePicker.value);
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          switch (responsePicker.value) {
            case 'refused': json(400, { error: 'Please enter a valid email address (max 200 characters).' }).then(resolve); break;
            case 'ratelimited': rateLimited().then(resolve); break;
            // Production's respondMailFailure (added in REQUIREMENT Create Account Dialog).
            case 'mailfailure': json(502, { error: 'Could not send email, try again later' }).then(resolve); break;
            case 'network': reject(new TypeError('Failed to fetch')); break;
            default: json(200, { message: 'Check your inbox' }).then(resolve);
          }
        }, ACTION_DELAY_MS);
      });
    }
    return realFetch ? realFetch(input, init) : Promise.reject(new TypeError('No fetch'));
  };

  // The × and the OAuth links navigate in production.
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
    if (linkPicker.value === 'invalid') params.set('error', 'invalid-link');
    location.search = '?' + params.toString();
  }

  function applyTheme() {
    if (themePicker.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = themePicker.value;
  }

  methodPicker.addEventListener('change', reload);
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
  linkPicker.value = params.get('error') === 'invalid-link' ? 'invalid' : '';
  applyTheme();
})();
