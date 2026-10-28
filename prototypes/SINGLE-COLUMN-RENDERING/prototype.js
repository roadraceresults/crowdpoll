/*
  HARNESS for index.html: stands in for app.js (the session header) and tabs.js
  (the tab controllers), with no network.

  - The header's actions slot for a guest, a member or an administrator.
  - The tab underline moves on a click; a guest's personal tabs are aria-disabled.
  - Sample polls drawn by the production pollCard.js with a stub VoteClient.
  - A readout of the viewport width and whether single-column.css's media block applies.
*/
(function () {
  'use strict';

  const SAMPLE_NOTE = '(sample only: no action taken)';
  const PERSONAL_TABS = ['your-polls', 'shared-with-you', 'your-votes', 'watching', 'live'];
  const CHOICE_BOUNDS = { minChoices: 2, maxChoices: 50 };
  const AVATAR = '../../src/public/avatar-default.svg';

  const tabBar = document.getElementById('tabBar');
  const wrap = document.querySelector('.tab-bar-wrap');
  const grid = document.getElementById('cardGrid');
  const picker = document.getElementById('sessionPicker');
  const readout = document.getElementById('widthReadout');

  let activeTab = 'your-polls';
  let instances = [];

  // ---- Sample polls ----

  function poll(pid, title, subtitle, choices, extra) {
    return Object.assign({
      pid, title, subtitle,
      choices: choices.map((c, i) => ({ id: pid + '-c' + (i + 1), label: c[0], pct: c[1], color: c[2] })),
      totalVoted: 0, totalNotYetVoted: 0,
      pollState: 'OPEN', choiceMode: 'Single-Choice Poll',
      myChoiceIds: [], canVote: true, bookmarked: false, listedBecause: []
    }, extra);
  }

  const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();

  const POLLS = [
    poll('poll-texas-senate', 'Texas Senate Election Winner', '',
      [['James Talarico (D)', 50, '#0808FD'], ['Ken Paxton (R)', 50, '#F91010'], ['Independant', 0]],
      { totalVoted: 1 }),
    poll('poll-yes-no', 'yes no', '', [['Yes', 100], ['No', 0]], { totalVoted: 1 }),
    poll('poll-12345', '12345', '',
      [['1', 50, '#000000'], ['2', 50, '#7D7D7D'], ['3', 0], ['4', 0], ['5', 0]], { totalVoted: 2 }),
    poll('poll-long-title', 'Which topics should the community meeting cover this autumn, and in what order?',
      'Pick every topic you would like on the agenda.',
      [['Road resurfacing', 34], ['Park renovation', 27], ['Library hours', 18], ['Bike lanes', 14], ['Street lighting', 7]],
      { choiceMode: 'Multiple-Choice Poll', totalVoted: 128 }),
    poll('poll-ten', 'Which colours should the new logo use?', 'Choose up to ten.',
      [['Red', 14], ['Orange', 12], ['Yellow', 11], ['Green', 10], ['Teal', 9], ['Blue', 9], ['Indigo', 8], ['Violet', 7], ['Pink', 6], ['Brown', 5]],
      { choiceMode: 'Multiple-Choice Poll', totalVoted: 902, bookmarked: true }),
    poll('poll-closed', 'Should the council adopt the new budget?', 'Voting has ended.',
      [['Adopt as written', 48], ['Adopt with amendments', 39], ['Reject', 13]],
      { pollState: 'CLOSED', endAt: iso(3), totalVoted: 1207, myChoiceIds: ['poll-closed-c2'] })
  ];

  window.VoteClient = {
    canVote: () => true,
    QUEUED_NOTICE: 'Your vote is queued and will be processed as soon as possible.',
    submit: (pid, choiceIds) => new Promise((resolve) => {
      console.log('[sample] vote', pid, choiceIds);
      setTimeout(() => resolve({ ok: true, outcome: { status: 'recorded', choiceIds, nextRefreshMs: 0 } }), 400);
    })
  };

  // ---- Notices ----

  let noticeTimer = null;
  function notice(text, ms) {
    const el = document.getElementById('tabNotice');
    clearTimeout(noticeTimer);
    if (!text) { el.hidden = true; return; }
    el.textContent = text;
    el.hidden = false;
    if (ms) noticeTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  function sample(name, detail) {
    console.log('[sample] ' + name, detail === undefined ? '' : detail);
    notice(name + ': ' + SAMPLE_NOTE, 4000);
  }

  // ---- Header (app.js renderSiteHeader, without the menu actions) ----

  const SESSIONS = {
    member: { userName: 'roadraceresults', canCreate: true },
    admin: { userName: 'Sample Admin', canCreate: true },
    guest: null
  };

  function renderHeaderActions(key) {
    const me = SESSIONS[key];
    const header = document.getElementById('site-header');
    const slot = header.querySelector('#header-actions');
    floating.replaceChildren();
    const link = header.querySelector('.header-nav-link');
    const active = Boolean(me && me.canCreate);
    link.classList.toggle('is-inert', !active);
    if (active) { link.removeAttribute('aria-disabled'); link.removeAttribute('tabindex'); }
    else { link.setAttribute('aria-disabled', 'true'); link.setAttribute('tabindex', '-1'); }

    if (me) {
      const user = document.createElement('span');
      user.className = 'header-user';
      const name = document.createElement('span');
      name.id = 'header-username';
      name.textContent = me.userName;
      const avatar = document.createElement('img');
      avatar.className = 'avatar';
      avatar.src = AVATAR;
      avatar.alt = 'Profile avatar';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'avatar-btn';
      button.addEventListener('click', () => sample('Avatar menu'));
      button.appendChild(avatar);
      user.append(name, button);
      slot.replaceChildren(user);
    } else {
      const login = document.createElement('button');
      login.type = 'button';
      login.className = 'btn-header-ghost';
      login.textContent = 'Log In';
      login.addEventListener('click', () => sample('Log In'));
      const create = document.createElement('button');
      create.type = 'button';
      create.className = 'btn-header-primary';
      create.textContent = 'Create Account to Vote';
      create.addEventListener('click', () => sample('Create Account to Vote'));
      slot.replaceChildren(login, create);
    }
    syncFloating();
  }

  // ---- Tabs ----

  function setActive(name) {
    activeTab = name;
    tabBar.querySelectorAll('.tab').forEach((btn) => {
      const on = btn.dataset.tab === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
    wrap.dataset.active = name;
  }

  function applyGuestState(signedIn) {
    PERSONAL_TABS.forEach((name) => {
      const btn = tabBar.querySelector('.tab[data-tab="' + name + '"]');
      if (!btn) return;
      if (signedIn) btn.removeAttribute('aria-disabled');
      else btn.setAttribute('aria-disabled', 'true');
      btn.title = signedIn ? '' : 'Sign in to use this tab';
    });
    document.body.classList.toggle('is-guest', !signedIn);
  }

  function select(name) {
    const signedIn = Boolean(SESSIONS[picker.value]);
    if (PERSONAL_TABS.indexOf(name) !== -1 && !signedIn) { sample('Log In'); return; }
    setActive(name);
    notice('');
    mountCards();
  }

  tabBar.addEventListener('click', (event) => {
    const btn = event.target.closest('.tab');
    if (btn) select(btn.dataset.tab);
  });
  document.getElementById('refreshBtn').addEventListener('click', () => sample('Refresh'));

  // ---- Single-column tab bar: scroll buttons and the all-tabs menu ----

  const scrollBefore = document.getElementById('tabScrollBefore');
  const scrollAfter = document.getElementById('tabScrollAfter');
  const menuBtn = document.getElementById('tabMenuBtn');
  const menu = document.getElementById('tabMenu');

  function updateScrollButtons() {
    const atStart = !(tabBar.scrollLeft > 1);
    const atEnd = !(tabBar.scrollLeft + tabBar.clientWidth < tabBar.scrollWidth - 1);
    scrollBefore.setAttribute('aria-disabled', String(atStart));
    scrollAfter.setAttribute('aria-disabled', String(atEnd));
  }

  // Tab bar scrolling. Change these numbers to try other feels.
  const STEP_MS = 500;        // one click on an arrow: time to scroll
  const STEP_TABS = 2;        // one click on an arrow: this many tabs
  const HOLD_AFTER_MS = 300;  // a press longer than this scrolls continuously
  const HOLD_PX_PER_S = 200;  // speed of the continuous scroll
  const SETTLE_MS = 200;      // after a hold: move to the nearest tab edge
  const DRAG_START_PX = 5;    // mouse movement before a press becomes a drag

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animationId = 0;

  function stopAnimation() { animationId += 1; }

  function maxScroll() { return Math.max(0, tabBar.scrollWidth - tabBar.clientWidth); }

  function animateScroll(target, duration) {
    stopAnimation();
    const goal = Math.min(maxScroll(), Math.max(0, target));
    if (reducedMotion || duration <= 0 || Math.abs(goal - tabBar.scrollLeft) < 1) { tabBar.scrollLeft = goal; return; }
    const id = animationId;
    const from = tabBar.scrollLeft;
    const start = performance.now();
    function frame(now) {
      if (id !== animationId) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      tabBar.scrollLeft = from + (goal - from) * eased;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Each tab's left and right edge in scroll coordinates.
  function tabEdges() {
    const bar = tabBar.getBoundingClientRect();
    return Array.from(tabBar.querySelectorAll('.tab')).map((tab) => {
      const r = tab.getBoundingClientRect();
      return { left: r.left - bar.left + tabBar.scrollLeft, right: r.right - bar.left + tabBar.scrollLeft };
    });
  }

  // Where one step in a direction ends: the first tab cut off on that side, flush with the bar's edge.
  function stepTarget(direction) {
    const edges = tabEdges();
    const left = tabBar.scrollLeft;
    const right = left + tabBar.clientWidth;
    if (direction > 0) {
      const hidden = edges.filter((e) => e.right > right + 1);
      if (!hidden.length) return left;
      return hidden[Math.min(STEP_TABS, hidden.length) - 1].right - tabBar.clientWidth;
    }
    const hidden = edges.filter((e) => e.left < left - 1).reverse();
    if (!hidden.length) return left;
    return hidden[Math.min(STEP_TABS, hidden.length) - 1].left;
  }

  // The tab edge nearest the bar's left edge, for the settle after a hold.
  function nearestEdge() {
    const left = tabBar.scrollLeft;
    let best = left;
    let bestDistance = Infinity;
    tabEdges().forEach((e) => {
      const d = Math.abs(e.left - left);
      if (d < bestDistance) { bestDistance = d; best = e.left; }
    });
    return best;
  }

  let holdTimer = 0;
  let holdFrame = 0;
  let holding = false;
  let heldDirection = 0;

  function holdLoop(id, direction, last) {
    return function frame(now) {
      if (id !== animationId || !holding) return;
      // A frame's time stamp can be older than the moment the hold began; never step backwards.
      const next = tabBar.scrollLeft + direction * HOLD_PX_PER_S * (Math.max(0, now - last) / 1000);
      const clamped = Math.min(maxScroll(), Math.max(0, next));
      tabBar.scrollLeft = clamped;
      if ((direction > 0 && clamped >= maxScroll()) || (direction < 0 && clamped <= 0)) { endHold(false); return; }
      holdFrame = requestAnimationFrame(holdLoop(id, direction, now));
    };
  }

  function startHold(direction) {
    holding = true;
    heldDirection = direction;
    stopAnimation();
    holdFrame = requestAnimationFrame(holdLoop(animationId, direction, performance.now()));
  }

  function endHold(settle) {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(holdFrame);
    if (settle) animateScroll(nearestEdge(), SETTLE_MS);
  }

  // One handler for both arrows: a short press steps, a long press scrolls until released.
  function bindArrow(button, direction) {
    let pressed = false;
    button.addEventListener('pointerdown', (event) => {
      if (event.button || button.getAttribute('aria-disabled') === 'true') return;
      pressed = true;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => { holdTimer = 0; startHold(direction); }, HOLD_AFTER_MS);
    });
    function release(event) {
      if (!pressed) return;
      pressed = false;
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = 0;
        if (event.type === 'pointerup') animateScroll(stepTarget(direction), STEP_MS);
      } else {
        endHold(true);
      }
      if (event.type === 'pointerup') suppressClick = true;
    }
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    let suppressClick = false;
    // A pointer press is handled above; a click with no pointer (keyboard) steps once.
    button.addEventListener('click', (event) => {
      if (suppressClick) { suppressClick = false; return; }
      if (button.getAttribute('aria-disabled') === 'true') return;
      animateScroll(stepTarget(direction), STEP_MS);
    });
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  bindArrow(scrollBefore, -1);
  bindArrow(scrollAfter, 1);

  // Mouse drag on the bar. Touch uses the browser's own scrolling.
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragging = false;
  let dragPending = false;
  let swallowClick = false;

  tabBar.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button) return;
    stopAnimation();
    dragPending = true;
    dragging = false;
    dragStartX = event.clientX;
    dragStartScroll = tabBar.scrollLeft;
  });
  window.addEventListener('pointermove', (event) => {
    if (!dragPending) return;
    const dx = event.clientX - dragStartX;
    if (!dragging && Math.abs(dx) > DRAG_START_PX) {
      dragging = true;
      tabBar.classList.add('is-dragging');
    }
    if (dragging) tabBar.scrollLeft = dragStartScroll - dx;
  });
  function endDrag() {
    if (!dragPending) return;
    dragPending = false;
    tabBar.classList.remove('is-dragging');
    if (dragging) {
      dragging = false;
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
    }
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  // Registered before the tab click handler, so a drag never selects the tab under the pointer.
  tabBar.addEventListener('click', (event) => {
    if (swallowClick) { event.stopImmediatePropagation(); event.preventDefault(); }
  }, true);

  tabBar.addEventListener('scroll', updateScrollButtons, { passive: true });
  window.addEventListener('resize', updateScrollButtons);

  function buildMenu() {
    menu.textContent = '';
    tabBar.querySelectorAll('.tab').forEach((tab) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'tab-menu-item';
      item.setAttribute('role', 'menuitem');
      item.dataset.tab = tab.dataset.tab;
      item.classList.toggle('is-active', tab.classList.contains('is-active'));
      if (tab.getAttribute('aria-disabled') === 'true') item.setAttribute('aria-disabled', 'true');
      const icon = tab.querySelector('.tab-icon');
      if (icon) item.appendChild(icon.cloneNode(true));
      const label = document.createElement('span');
      label.textContent = tab.textContent.trim();
      item.appendChild(label);
      menu.appendChild(item);
    });
  }

  function setMenuOpen(open) {
    if (open) buildMenu();
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }

  menuBtn.addEventListener('click', () => setMenuOpen(menu.hidden));
  menu.addEventListener('click', (event) => {
    const item = event.target.closest('.tab-menu-item');
    if (!item || item.getAttribute('aria-disabled') === 'true') return;
    select(item.dataset.tab);
    const tab = tabBar.querySelector('.tab[data-tab="' + item.dataset.tab + '"]');
    if (tab) tab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    setMenuOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !menuBtn.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) { setMenuOpen(false); menuBtn.focus(); }
  });
  updateScrollButtons();

  // ---- Cards ----

  function mountCards() {
    instances.forEach((instance) => instance.unmount());
    instances = [];
    POLLS.forEach((source) => {
      const copy = JSON.parse(JSON.stringify(source));
      const instance = window.PollCard.mount(grid, copy.pid, {
        tab: activeTab,
        showVote: activeTab !== 'search',
        showLive: activeTab !== 'live',
        choiceBounds: CHOICE_BOUNDS,
        onLive: (pid) => sample('Live Results', pid),
        onBookmark: (pid, next) => sample('Watch', { pid, next }),
        onMaximize: (pid) => sample('Maximize', pid),
        onVoted: (pid, outcome) => {
          const total = copy.totalVoted + 1;
          const counts = copy.choices.map((c) => Math.round(c.pct * copy.totalVoted / 100) + (outcome.choiceIds.indexOf(c.id) >= 0 ? 1 : 0));
          copy.totalVoted = total;
          copy.choices.forEach((c, i) => { c.pct = Math.round(100 * counts[i] / total); });
          copy.myChoiceIds = outcome.choiceIds;
          instance.applyPoll(copy);
        }
      });
      instance.applyPoll(copy);
      instances.push(instance);
    });
    keepFloatInside();
  }

  // ---- Floating guest buttons (single column) ----
  // The header's own Log In / Create Account buttons move into #floatingActions in the
  // single column. Fixed on the screen; kept inside the visible part of the card grid.

  const floating = document.getElementById('floatingActions');
  const headerSlot = document.getElementById('header-actions');
  const singleMq = window.matchMedia('(max-width: 639.98px)');
  const FLOAT_TOP_GAP = 4;   // default position: this far under the top of the card area
  const FLOAT_DRAG_PX = 5;   // movement before a press becomes a drag
  let floatPos = null;       // { x, y } in screen pixels; in memory only

  function floatShown() { return !floating.hidden; }

  function floatArea() {
    const g = grid.getBoundingClientRect();
    return { left: g.left, right: g.right, top: Math.max(g.top, 0), bottom: Math.min(g.bottom, window.innerHeight) };
  }

  function clampFloat(pos) {
    const a = floatArea();
    const s = floating.getBoundingClientRect();
    return {
      x: Math.min(Math.max(pos.x, a.left), Math.max(a.left, a.right - s.width)),
      y: Math.min(Math.max(pos.y, a.top), Math.max(a.top, a.bottom - s.height))
    };
  }

  function defaultFloatPos() {
    const g = grid.getBoundingClientRect();
    const s = floating.getBoundingClientRect();
    return clampFloat({ x: g.right - s.width, y: g.top + FLOAT_TOP_GAP });
  }

  function floatFits(pos) {
    const a = floatArea();
    const s = floating.getBoundingClientRect();
    return pos.x >= a.left - 0.5 && pos.x + s.width <= a.right + 0.5 &&
      pos.y >= a.top - 0.5 && pos.y + s.height <= a.bottom + 0.5;
  }

  function paintFloat() {
    floating.style.left = floatPos.x + 'px';
    floating.style.top = floatPos.y + 'px';
  }

  function keepFloatInside() {
    if (!floatShown() || !floatPos) return;
    floatPos = clampFloat(floatPos);
    paintFloat();
  }

  function syncFloating() {
    const guest = !SESSIONS[picker.value];
    const inFloat = guest && singleMq.matches;
    if (guest) {
      document.querySelectorAll('#header-actions .btn-header-ghost, #header-actions .btn-header-primary, #floatingActions .btn-header-ghost, #floatingActions .btn-header-primary')
        .forEach((button) => (inFloat ? floating : headerSlot).appendChild(button));
    }
    floating.hidden = !inFloat;
    if (inFloat) {
      floatPos = clampFloat(floatPos || defaultFloatPos());
      paintFloat();
    }
  }

  singleMq.addEventListener('change', syncFloating);
  window.addEventListener('resize', () => {
    if (!floatShown() || !floatPos) return;
    // A resize that leaves the pair outside the card area puts it back at the default.
    floatPos = floatFits(floatPos) ? floatPos : defaultFloatPos();
    paintFloat();
  });
  window.addEventListener('scroll', keepFloatInside, { passive: true });

  let floatDrag = null;
  let swallowFloatClick = false;
  floating.addEventListener('pointerdown', (event) => {
    if (event.button || !floatPos) return;
    floatDrag = { x: event.clientX, y: event.clientY, px: floatPos.x, py: floatPos.y, moving: false };
  });
  window.addEventListener('pointermove', (event) => {
    if (!floatDrag) return;
    const dx = event.clientX - floatDrag.x;
    const dy = event.clientY - floatDrag.y;
    if (!floatDrag.moving && Math.hypot(dx, dy) > FLOAT_DRAG_PX) {
      floatDrag.moving = true;
      floating.classList.add('is-dragging');
    }
    if (floatDrag.moving) {
      floatPos = clampFloat({ x: floatDrag.px + dx, y: floatDrag.py + dy });
      paintFloat();
    }
  });
  function endFloatDrag() {
    if (!floatDrag) return;
    const moved = floatDrag.moving;
    floatDrag = null;
    floating.classList.remove('is-dragging');
    if (moved) {
      swallowFloatClick = true;
      setTimeout(() => { swallowFloatClick = false; }, 0);
    }
  }
  window.addEventListener('pointerup', endFloatDrag);
  window.addEventListener('pointercancel', endFloatDrag);
  // Registered in the capture phase, so a drag never presses the button under the pointer.
  floating.addEventListener('click', (event) => {
    if (swallowFloatClick) { event.stopImmediatePropagation(); event.preventDefault(); }
  }, true);

  // ---- Session picker and width readout ----

  function applySession() {
    const signedIn = Boolean(SESSIONS[picker.value]);
    renderHeaderActions(picker.value);
    applyGuestState(signedIn);
    if (!signedIn && PERSONAL_TABS.indexOf(activeTab) !== -1) select('trending');
    else if (signedIn && activeTab === 'trending' && picker.dataset.was === 'guest') select('your-polls');
    picker.dataset.was = picker.value;
  }
  picker.addEventListener('change', applySession);

  function paintReadout() {
    const single = getComputedStyle(document.documentElement).getPropertyValue('--single-column').trim() === '1';
    readout.textContent = window.innerWidth + ' px · ' + (single ? 'single-column rule ON' : 'single-column rule off');
    readout.classList.toggle('is-single', single);
  }
  window.addEventListener('resize', paintReadout);

  picker.dataset.was = picker.value;
  applySession();
  setActive('your-polls');
  mountCards();
  paintReadout();
})();
