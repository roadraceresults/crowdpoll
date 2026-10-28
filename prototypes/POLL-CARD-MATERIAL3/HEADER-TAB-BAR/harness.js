/*
  HARNESS for header-tab-bar.html (REQUIREMENT CrowdPoll Header and Tab Bar).
  Stands in for app.js's session snapshot and tabs.js's tab controllers:

  - Session picker: renders the header for a guest (native or OAuth sign-in),
    a member or an admin, sets body.is-guest, and disables the personal tabs
    for a guest, as applyGuestState does in tabs.js.
  - Tabs: a click moves .is-active, sets .tab-bar-wrap[data-active] (Refresh
    hides on Live Results) and mounts that tab's cards, with the card options
    the tab's production module passes.
  - Anything that would leave the page or fetch data logs "[sample]" to the
    console and shows "(sample only: no action taken)" in #tabNotice.
  - Theme picker and the cookie banner checkbox.

  The cards are ../pollCard.js with ../pollCard-m3.css; the polls and the stub
  VoteClient come from ../fixtures.js.
*/
(function () {
  'use strict';

  const SAMPLE_NOTE = '(sample only: no action taken)';
  const PERSONAL_TABS = ['private', 'favourites', 'live'];

  const SESSIONS = {
    'guest-native': { me: null, signinMethod: 'native' },
    'guest-oauth': { me: null, signinMethod: 'oauth' },
    member: { me: { userName: 'Sample Member', profileAvatar: '', isAdmin: false }, signinMethod: 'native' },
    admin: { me: { userName: 'Sample Admin', profileAvatar: '', isAdmin: true }, signinMethod: 'native' }
  };

  // What each tab lists, and the options its production module mounts cards
  // with (trending.js, newest.js, tabs.js, liveResults.js, searchTab.js).
  const TABS = {
    trending: { fixtures: ['open', 'yesno', 'long', 'unvoted', 'closed'], opts: { showVote: true, showLive: true } },
    newest: { fixtures: ['unvoted', 'yesno', 'open'], opts: { showVote: true, showLive: true } },
    private: { fixtures: ['open', 'closed'], opts: { showVote: true, showLive: true, showBookmark: false } },
    favourites: { fixtures: ['long', 'yesno'], bookmarked: true, opts: { showVote: true, showLive: true } },
    live: { fixtures: ['open', 'yesno', 'long'], opts: { showVote: true, onClose: true } },
    search: { fixtures: ['closed', 'open', 'long'], opts: { showVote: false, showLive: true } }
  };

  // Stands in for ENV_MIN_CHOICES / ENV_MAX_CHOICES from /api/config.
  const CHOICE_BOUNDS = { minChoices: 2, maxChoices: 50 };

  const tabBar = document.getElementById('tabBar');
  const wrap = document.querySelector('.tab-bar-wrap');
  const refreshBtn = document.getElementById('refreshBtn');
  const grid = document.getElementById('cardGrid');
  const sessionPicker = document.getElementById('sessionPicker');
  const themePicker = document.getElementById('themePicker');
  const cookieToggle = document.getElementById('cookieToggle');

  let session = SESSIONS['guest-native'];
  let activeTab = 'trending';
  let instances = [];

  // ---- Notices (tabs.js notice(), copied) ----

  let noticeTimer = null;
  function notice(text, ms) {
    const el = document.getElementById('tabNotice');
    if (!el) return;
    clearTimeout(noticeTimer);
    if (!text) {
      el.hidden = true;
      return;
    }
    el.textContent = text;
    // M3: a snackbar that does not time out carries a close icon button.
    if (!ms) el.appendChild(closeButton(el));
    el.hidden = false;
    if (ms) noticeTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  function closeButton(el) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-notice-close';
    btn.setAttribute('aria-label', 'Close');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    btn.addEventListener('click', () => { el.hidden = true; });
    return btn;
  }

  function sample(name, detail) {
    console.log('[sample] ' + name, detail === undefined ? '' : detail);
    notice(name + ': ' + SAMPLE_NOTE, 4000);
  }

  window.SiteHeader.onAction = (name, detail) => {
    if (name === 'Cookie banner acknowledged') {
      cookieToggle.checked = false;
      return;
    }
    sample(name, detail);
  };

  // ---- Session ----

  const isSignedIn = () => Boolean(session.me);

  function applyGuestState() {
    const signedIn = isSignedIn();
    PERSONAL_TABS.forEach((name) => {
      const btn = tabBar.querySelector('.tab[data-tab="' + name + '"]');
      if (!btn) return;
      // M3: aria-disabled instead of disabled, so a guest's click reaches the
      // Log In path below and the tab shows its tooltip (tooltip-m3.js).
      if (signedIn) btn.removeAttribute('aria-disabled');
      else btn.setAttribute('aria-disabled', 'true');
      btn.title = signedIn ? '' : 'Sign in to use this tab';
    });
    if (!signedIn && PERSONAL_TABS.indexOf(activeTab) !== -1) select('trending');
  }

  function applySession(key) {
    session = SESSIONS[key] || SESSIONS['guest-native'];
    document.body.classList.toggle('is-guest', !isSignedIn());
    window.SiteHeader.render(session.me, { signinMethod: session.signinMethod });
    applyGuestState();
  }

  // ---- Cards ----

  function copyOf(key) {
    const f = window.PollFixtures[key];
    return f && JSON.parse(JSON.stringify(f.source || f.poll));
  }

  // A recorded vote nudges the counts so the results visibly change.
  function recordVote(p, choiceIds) {
    const counts = p.choices.map((c) => Math.round(c.pct * p.totalVoted / 100) + (choiceIds.indexOf(c.id) >= 0 ? 1 : 0));
    p.totalVoted += 1;
    p.choices.forEach((c, i) => { c.pct = Math.round(100 * counts[i] / p.totalVoted); });
    p.myChoiceIds = choiceIds;
  }

  function mountCards(name) {
    instances.forEach((instance) => instance.unmount());
    instances = [];
    const tab = TABS[name];
    tab.fixtures.forEach((key) => {
      const poll = copyOf(key);
      if (!poll) return;
      if (tab.bookmarked) poll.bookmarked = true;
      const opts = Object.assign({}, tab.opts, {
        tab: name,
        choiceBounds: CHOICE_BOUNDS,
        onLive: (pid) => sample('Live Results', pid),
        onBookmark: (pid, next) => sample('Bookmark', { pid, next }),
        onMaximize: (pid) => sample('Maximize', pid),
        onVoted: (pid, outcome) => {
          recordVote(poll, outcome.choiceIds);
          instance.applyPoll(poll);
        }
      });
      // isSignedIn is not passed: the card would send a guest to /login.
      if (tab.opts.onClose) opts.onClose = (pid) => sample('Remove from Live Results', pid);
      else delete opts.onClose;
      const instance = window.PollCard.mount(grid, poll.pid, opts);
      instance.applyPoll(poll);
      instances.push(instance);
    });
  }

  // ---- Tabs (tabs.js setActiveButton / showPanel / select, without the fetches) ----

  function setActiveButton(name) {
    tabBar.querySelectorAll('.tab').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === name);
    });
  }

  function select(name) {
    if (!TABS[name]) return;
    if (PERSONAL_TABS.indexOf(name) !== -1 && !isSignedIn()) {
      sample('Log In', '/login');
      return;
    }
    activeTab = name;
    setActiveButton(name);
    // FIX019: Live Results refreshes itself, so the row hides Refresh there.
    wrap.dataset.active = name;
    notice('');
    mountCards(name);
  }

  tabBar.addEventListener('click', (event) => {
    const btn = event.target.closest('.tab');
    if (!btn) return;
    // M3: aria-disabled, not disabled (see applyGuestState).
    if (btn.getAttribute('aria-disabled') === 'true') {
      sample('Log In', '/login');
      return;
    }
    select(btn.dataset.tab);
  });

  // A second Refresh within 5 s shows production's one notice that never
  // clears (trending.js / newest.js), so the snackbar's close button is seen.
  const REFRESH_FLOOR_MS = 5000;
  let lastRefreshAt = 0;
  refreshBtn.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastRefreshAt < REFRESH_FLOOR_MS) {
      console.log('[sample] Refresh refused', activeTab);
      notice('You are refreshing too quickly.');
    } else {
      sample('Refresh', activeTab);
    }
    lastRefreshAt = now;
  });

  // ---- Prototype bar ----

  sessionPicker.addEventListener('change', () => applySession(sessionPicker.value));

  themePicker.addEventListener('change', () => {
    if (themePicker.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = themePicker.value;
  });

  cookieToggle.addEventListener('change', () => {
    if (cookieToggle.checked) {
      window.SiteHeader.resetCookieBanner();
    } else {
      const banner = document.getElementById('cookie-banner');
      if (banner) banner.remove();
    }
  });

  // ---- Start: as the home page loads for a guest ----

  window.SiteHeader.renderCookieBanner();
  cookieToggle.checked = Boolean(document.getElementById('cookie-banner'));
  applySession(sessionPicker.value);
  select('trending');
  window.selectTab = select;
})();
