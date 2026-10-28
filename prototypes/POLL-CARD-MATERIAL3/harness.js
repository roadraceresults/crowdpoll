/*
  HARNESS for poll-card.html. Feeds one fixture poll to the extracted card and
  stubs everything the real app supplies: the vote network call (VoteClient) and
  the Live Results / Bookmark / Maximize hooks. Pick a fixture in the dropdown
  or call window.showFixture('closed') from the console.

  REQUIREMENT006: the same harness drives MAXIMIZED-POLL-CARD/single-card.html.
  When <body data-maximized> is present it mounts the card into
  .maximized-card-grid ahead of .col-rule and maximizes it, as tabs.js does,
  starts on <body data-default-fixture>, flips to the back face for #back, and
  sends the close control and the card's Minimize button to
  closeMaximizedCard. Without data-maximized, poll-card.html is unchanged.

  The fixture polls and the stub VoteClient live in fixtures.js, shared with
  HEADER-TAB-BAR/header-tab-bar.html; load it before this file.
*/
(function () {
  'use strict';

  const SAMPLE_NOTE = '(sample only: no action taken)';
  const FIXTURES = window.PollFixtures;

  const maximizedPage = document.body.hasAttribute('data-maximized');
  const grid = maximizedPage
    ? document.querySelector('.maximized-card-grid')
    : document.getElementById('cardGrid');
  const picker = document.getElementById('fixturePicker');
  const themePicker = document.getElementById('themePicker');
  const removeForm = document.getElementById('removeForm');
  let instance = null;
  let current = null;

  function note(text) {
    const el = instance && instance.element.querySelector('.card-front .poll-vote-notice');
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
  }

  function stubbed(name) {
    return (pid) => {
      console.log('[sample] ' + name, pid);
      note(SAMPLE_NOTE);
    };
  }

  // REQUIREMENT006: stands in for ENV_MIN_CHOICES / ENV_MAX_CHOICES, which the
  // app reads from /api/config (tabs.js passes them the same way).
  const CHOICE_BOUNDS = { minChoices: 2, maxChoices: 50 };

  // The app returns to the current tab here. The prototype has no tab to return
  // to, so it goes back one page, as the static page did.
  function closeMaximizedCard() {
    history.back();
  }

  // The face the maximized page shows: the back for #back (single-card-back.html
  // opens it that way), else the front. The first showing skips the 0.7s turn;
  // a later hash change turns the card as a click would.
  function showFace(instant) {
    const flip = instance && instance.element.querySelector('.card-flip');
    if (!flip) return;
    if (instant) flip.style.transition = 'none';
    flip.classList.toggle('is-flipped', location.hash === '#back');
    if (instant) {
      void flip.offsetWidth;
      flip.style.transition = '';
    }
  }

  // A recorded vote nudges the counts so the results visibly change.
  function recordVote(f, choiceIds) {
    const p = f.poll;
    const counts = p.choices.map((c) => Math.round(c.pct * p.totalVoted / 100) + (choiceIds.indexOf(c.id) >= 0 ? 1 : 0));
    p.totalVoted += 1;
    p.choices.forEach((c, i) => { c.pct = Math.round(100 * counts[i] / p.totalVoted); });
    p.myChoiceIds = choiceIds;
  }

  function show(key) {
    const f = FIXTURES[key];
    if (!f) return console.warn('Unknown fixture', key, Object.keys(FIXTURES));
    current = f;
    if (instance) instance.unmount();
    // A fresh copy so a vote on one showing does not leak into the next.
    if (!f.source) f.source = f.poll;
    f.poll = JSON.parse(JSON.stringify(f.source));
    instance = window.PollCard.mount(grid, f.poll.pid, {
      onLive: stubbed('Live Results'),
      onBookmark: (pid, next) => {
        console.log('[sample] Bookmark', pid, next);
        note(SAMPLE_NOTE);
      },
      onMaximize: stubbed('Maximize'),
      onMinimize: maximizedPage ? closeMaximizedCard : undefined,
      choiceBounds: CHOICE_BOUNDS,
      // REQUIREMENT004: the Live Results tab mounts cards with onClose, which
      // turns the Live Results control into its remove form (the M3 input chip).
      onClose: removeForm.checked ? stubbed('Remove from Live Results') : undefined,
      onVoted: (pid, outcome) => {
        recordVote(f, outcome.choiceIds);
        instance.applyPoll(f.poll);
      }
    });
    instance.applyPoll(f.poll);
    if (maximizedPage) {
      grid.insertBefore(instance.element, grid.querySelector('.col-rule'));
      instance.setMaximized(true);
      showFace(true);
    }
    picker.value = key;
  }

  Object.keys(FIXTURES).forEach((key) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = FIXTURES[key].label;
    picker.appendChild(opt);
  });
  picker.addEventListener('change', () => show(picker.value));
  removeForm.addEventListener('change', () => show(picker.value));

  // REQUIREMENT004: force either Material 3 scheme, or follow the system.
  themePicker.addEventListener('change', () => {
    if (themePicker.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = themePicker.value;
  });
  window.showFixture = show;
  if (maximizedPage) {
    window.addEventListener('hashchange', () => showFace(false));
    document.querySelectorAll('.maximized-card-close').forEach((btn) => {
      btn.addEventListener('click', closeMaximizedCard);
    });
  }
  show(document.body.dataset.defaultFixture || 'open');
})();
