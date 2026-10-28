/*
  HARNESS for create-account-dialog.html (REQUIREMENT Create Account Dialog).
  Stands in for the server, so production's own cardShell.js and
  createAccountCard.js draw the card unchanged:

  - fetch: answers POST /api/auth/create-account with production's status
    codes and messages (src/routes/api.ts), chosen by the Response picker,
    including the 502 a mail failure returns. Everything else goes to the
    real fetch.
  - Response and Theme apply at once and are kept in the query string
    (?response=…&theme=…), so a reload keeps them. The card reads nothing from
    the query string and no session, and the page exists only for native
    sign-in, so there is no other picker.
  - The × (to /) shows "(sample only: no action taken)" instead of navigating.
*/
(function () {
  'use strict';

  const SAMPLE_NOTE = '(sample only: no action taken)';
  const ACTION_DELAY_MS = 700;
  const PICKER_PARAMS = { responsePicker: 'response', themePicker: 'theme' };

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

    if (url.split('?')[0] === '/api/auth/create-account' && method === 'POST') {
      console.log('[sample] POST /api/auth/create-account', JSON.parse((init && init.body) || '{}'), responsePicker.value);
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          switch (responsePicker.value) {
            case 'refused': json(400, { error: 'Please enter a valid email address (max 200 characters).' }).then(resolve); break;
            case 'ratelimited': rateLimited().then(resolve); break;
            // Production's respondMailFailure.
            case 'mailfailure': json(502, { error: 'Could not send email, try again later' }).then(resolve); break;
            case 'network': reject(new TypeError('Failed to fetch')); break;
            default: json(200, { message: 'Check your inbox' }).then(resolve);
          }
        }, ACTION_DELAY_MS);
      });
    }
    return realFetch ? realFetch(input, init) : Promise.reject(new TypeError('No fetch'));
  };

  // The × navigates in production.
  main.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    event.preventDefault();
    const name = link.classList.contains('card-shell-close') ? 'Close (back to the home page)' : link.textContent.trim();
    sample(name, link.getAttribute('href'));
  });

  // ---- Prototype bar ----

  // Response and Theme need no reload; the query string only keeps them.
  function remember() {
    const params = new URLSearchParams();
    Object.keys(PICKER_PARAMS).forEach((id) => params.set(PICKER_PARAMS[id], document.getElementById(id).value));
    try {
      history.replaceState(null, '', '?' + params.toString());
    } catch {
      // A page opened from file:// may not rewrite its URL; the choice still applies.
    }
  }

  function applyTheme() {
    if (themePicker.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = themePicker.value;
  }

  responsePicker.addEventListener('change', remember);
  themePicker.addEventListener('change', () => { applyTheme(); remember(); });

  const params = new URLSearchParams(location.search);
  Object.keys(PICKER_PARAMS).forEach((id) => {
    const value = params.get(PICKER_PARAMS[id]);
    const picker = document.getElementById(id);
    picker.value = value !== null && [...picker.options].some((o) => o.value === value) ? value : picker.options[0].value;
  });
  applyTheme();
})();
