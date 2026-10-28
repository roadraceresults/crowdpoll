/* Material 3 press ripple: https://m3.material.io/foundations/interaction/states/applying-states */
(function () {
  "use strict";

  const rippleSelectors = [];
  const reducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  function add(selector) {
    if (rippleSelectors.indexOf(selector) === -1) rippleSelectors.push(selector);
  }

  function isInactive(target) {
    return target.disabled
      || target.classList.contains("is-inert")
      || target.getAttribute("aria-disabled") === "true";
  }

  function rippleAt(event, box) {
    const size = 2 * Math.max(box.width, box.height);
    const ripple = document.createElement("span");
    ripple.className = "m3-ripple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (event.clientX - box.left - size / 2) + "px";
    ripple.style.top = (event.clientY - box.top - size / 2) + "px";
    return ripple;
  }

  function hostOverVoteRow(row, box) {
    const inner = row.closest(".bar-scroll-inner");
    if (!inner) return null;
    const innerBox = inner.getBoundingClientRect();
    const style = getComputedStyle(row);
    const host = document.createElement("span");
    host.className = "m3-ripple-host";
    host.setAttribute("aria-hidden", "true");
    host.style.left = (box.left - innerBox.left) + "px";
    host.style.top = (box.top - innerBox.top) + "px";
    host.style.width = box.width + "px";
    host.style.height = box.height + "px";
    host.style.borderRadius = style.borderRadius;
    host.style.color = style.color;
    inner.appendChild(host);
    return host;
  }

  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || reducedMotion.matches || rippleSelectors.length === 0) return;
    const target = event.target instanceof Element ? event.target.closest(rippleSelectors.join(", ")) : null;
    if (!target || isInactive(target)) return;

    const box = target.getBoundingClientRect();
    const ripple = rippleAt(event, box);
    const host = target.matches(".vote-row") ? hostOverVoteRow(target, box) : null;
    const removable = host || ripple;
    (host || target).appendChild(ripple);
    ripple.addEventListener("animationend", () => removable.remove(), { once: true });
  });

  window.M3Ripple = { add };
})();

/* Material 3 plain tooltip: https://m3.material.io/components/tooltips/guidelines */
(function () {
  'use strict';

  const SHOW_DELAY_MS = 500;
  const HIDE_DELAY_MS = 150;
  const LONG_PRESS_MS = 500;
  const TOUCH_SHOW_MS = 1500;
  const TOUCH_SLOP_PX = 10;
  const GAP_PX = 4;
  const EDGE_PX = 8;
  const ROW_LABELS = [['result-row', '.result-label'], ['vote-row', '.vote-label']];

  const tip = document.createElement('div');
  tip.className = 'm3-tooltip';
  tip.setAttribute('aria-hidden', 'true');
  tip.hidden = true;
  document.body.appendChild(tip);

  let anchor = null;
  let pending = null;
  let showTimer = 0;
  let hideTimer = 0;
  let press = null;
  let swallowClick = false;
  let keyboard = false;

  function adopt(el) {
    if (!(el instanceof Element) || !el.hasAttribute('title') || el === tip) return;
    const text = el.getAttribute('title');
    el.removeAttribute('title');
    if (text) el.dataset.tooltip = text;
    else delete el.dataset.tooltip;
    if (el === anchor) {
      if (text) show(el);
      else hide();
    }
  }

  function adoptAll(node) {
    if (!(node instanceof Element)) return;
    adopt(node);
    node.querySelectorAll('[title]').forEach(adopt);
  }

  adoptAll(document.body);
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') adopt(record.target);
      else record.addedNodes.forEach(adoptAll);
    }
    if (anchor && !anchor.isConnected) hide();
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });

  function controlOf(node) {
    if (!(node instanceof Element) || tip.contains(node)) return null;
    return node.closest('[data-tooltip]');
  }

  function textFor(el) {
    const text = el.dataset.tooltip;
    if (!text) return '';
    for (const [rowClass, labelSelector] of ROW_LABELS) {
      if (!el.classList.contains(rowClass)) continue;
      const label = el.querySelector(labelSelector);
      if (!label || label.scrollWidth <= label.clientWidth) return '';
    }
    return text;
  }

  function place() {
    const box = anchor.getBoundingClientRect();
    const viewWidth = document.documentElement.clientWidth;
    const viewHeight = document.documentElement.clientHeight;
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    let top = box.top - GAP_PX - height;
    if (top < EDGE_PX && box.bottom + GAP_PX + height <= viewHeight - EDGE_PX) top = box.bottom + GAP_PX;
    const left = Math.max(EDGE_PX, Math.min(box.left + box.width / 2 - width / 2, viewWidth - EDGE_PX - width));
    top = Math.max(EDGE_PX, Math.min(top, viewHeight - EDGE_PX - height));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function show(el) {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    pending = null;
    const text = textFor(el);
    if (!text) {
      hide();
      return false;
    }
    anchor = el;
    tip.textContent = text;
    tip.hidden = false;
    place();
    return true;
  }

  function hide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    pending = null;
    anchor = null;
    tip.hidden = true;
  }

  function hideSoon() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, HIDE_DELAY_MS);
  }

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    if (tip.contains(event.target)) {
      clearTimeout(hideTimer);
      return;
    }
    const el = controlOf(event.target);
    if (!el) return;
    if (el === anchor) {
      clearTimeout(hideTimer);
      return;
    }
    if (el === pending) return;
    clearTimeout(showTimer);
    if (anchor) {
      show(el);
      return;
    }
    pending = el;
    showTimer = setTimeout(() => show(el), SHOW_DELAY_MS);
  });

  document.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'touch') return;
    const to = event.relatedTarget;
    if (pending && !(to instanceof Node && pending.contains(to))) {
      clearTimeout(showTimer);
      pending = null;
    }
    if (anchor && !(to instanceof Node && (anchor.contains(to) || tip.contains(to)))) hideSoon();
  });

  document.addEventListener('keydown', (event) => {
    keyboard = true;
    if (event.key === 'Escape' && anchor) hide();
  }, true);

  document.addEventListener('focusin', (event) => {
    const el = controlOf(event.target);
    if (el && keyboard) show(el);
    else if (anchor && anchor !== el) hide();
  });

  document.addEventListener('focusout', (event) => {
    if (anchor && anchor.contains(event.target)) hide();
  });

  document.addEventListener('pointerdown', (event) => {
    keyboard = false;
    swallowClick = false;
    if (!tip.contains(event.target)) hide();
    if (event.pointerType !== 'touch') return;
    const el = controlOf(event.target);
    if (!el) return;
    press = {
      el: el,
      x: event.clientX,
      y: event.clientY,
      timer: setTimeout(() => {
        press = null;
        if (!show(el)) return;
        swallowClick = true;
        hideTimer = setTimeout(hide, TOUCH_SHOW_MS);
      }, LONG_PRESS_MS),
    };
  }, true);

  document.addEventListener('pointermove', (event) => {
    if (!press || event.pointerType !== 'touch') return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > TOUCH_SLOP_PX) {
      clearTimeout(press.timer);
      press = null;
    }
  }, true);

  function endPress() {
    if (!press) return;
    clearTimeout(press.timer);
    press = null;
  }
  document.addEventListener('pointerup', endPress, true);
  document.addEventListener('pointercancel', endPress, true);

  document.addEventListener('click', (event) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener('contextmenu', (event) => {
    if (controlOf(event.target)) event.preventDefault();
  });

  window.addEventListener('scroll', () => { if (anchor) hide(); }, true);
  window.addEventListener('resize', () => { if (anchor) hide(); });
})();

(function () {
  "use strict";
  for (const selector of [
    ".poll-admin-card .admin-state-btn",
    ".poll-admin-card .admin-icon-btn",
    ".poll-admin-card .actions-menu-trigger",
    ".poll-admin-card .invitees-invite-btn",
    ".poll-admin-card .invitees-page-btn",
    ".poll-admin-card .invitee-confirm button",
    ".actions-menu a",
    ".actions-menu button"
  ]) {
    window.M3Ripple.add(selector);
  }

  const PAGE_SIZE = 5;
  const VOTER_LIMIT = 100;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const BANNED = ["spammer@example.com"];
  const now = Date.now();

  const invitees = [
    { email: "maria.chen@gmail.com", name: "Maria Chen", status: "Voted", lastEmailAt: now - 3 * DAY_MS, reminded: false },
    { email: "j.doe@gmail.com", name: "John Doe", status: "Accepted", lastEmailAt: now - 2 * DAY_MS, reminded: false },
    { email: "priya.patel@outlook.com", name: "", status: "Invited", lastEmailAt: now - 2 * 60 * 60 * 1000, reminded: false },
    { email: "sam.taylor@yahoo.com", name: "Sam Taylor", status: "Invited", lastEmailAt: now - DAY_MS, reminded: true },
    { email: "alex@typo-domain.con", name: "", status: "Not delivered", lastEmailAt: now - 3 * 60 * 60 * 1000, reminded: false },
    { email: "kim.lee@gmail.com", name: "", status: "Invited", lastEmailAt: now - 2 * DAY_MS, reminded: false },
    { email: "new.person@example.com", name: "", status: "Not sent yet", lastEmailAt: null, reminded: false }
  ];

  let page = 0;
  let openMenu = null;

  const panel = document.querySelector(".card-invitees-panel");
  const list = panel.querySelector(".invitee-list");
  const input = panel.querySelector(".invitees-input");
  const inviteButton = panel.querySelector(".invitees-invite-btn");
  const results = panel.querySelector(".invitees-results");
  const pager = panel.querySelector(".invitees-pager");

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function emailKey(address) {
    const [local, domain] = address.toLowerCase().split("@");
    if (domain === "gmail.com" || domain === "googlemail.com") {
      return local.split("+")[0].replace(/\./g, "") + "@gmail.com";
    }
    return local + "@" + domain;
  }

  function resendBlockedReason(invitee) {
    if (invitee.reminded) return "Already reminded once.";
    if (invitee.status === "Not sent yet") return "Not sent yet: the invitation goes out when the poll opens.";
    if (invitee.status === "Voted" || invitee.status === "Accepted") return invitee.status + ": no reminder needed.";
    if (invitee.status !== "Not delivered" && Date.now() - invitee.lastEmailAt < DAY_MS) {
      return "Emailed less than 24 hours ago.";
    }
    return "";
  }

  function setCount(name, value) {
    for (const node of document.querySelectorAll('[data-count="' + name + '"]')) node.textContent = value;
  }

  function refreshCounts() {
    setCount("invitations", String(invitees.length));
    setCount("accepted", String(invitees.filter((i) => i.status === "Accepted" || i.status === "Voted").length));
    setCount("votes", String(invitees.filter((i) => i.status === "Voted").length));
    setCount("capacity", invitees.length + " of " + VOTER_LIMIT);
  }

  function closeMenu() {
    if (!openMenu) return;
    openMenu.menu.hidden = true;
    openMenu.trigger.setAttribute("aria-expanded", "false");
    openMenu = null;
  }

  function toggleMenu(trigger, menu) {
    const wasOpen = openMenu && openMenu.menu === menu;
    closeMenu();
    if (wasOpen) return;
    menu.hidden = false;
    const box = trigger.getBoundingClientRect();
    menu.style.top = box.bottom + 4 + "px";
    menu.style.left = Math.max(8, box.right - menu.offsetWidth) + "px";
    trigger.setAttribute("aria-expanded", "true");
    openMenu = { trigger, menu };
    menu.querySelector("button:not(:disabled), a")?.focus();
  }

  function kebab(label) {
    const trigger = el("button", "actions-menu-trigger");
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", label);
    trigger.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
    return trigger;
  }

  function menuItem(text, onSelect, disabledReason) {
    const item = el("button", null, text);
    item.type = "button";
    item.setAttribute("role", "menuitem");
    if (disabledReason) {
      item.disabled = true;
      item.title = disabledReason;
    } else {
      item.addEventListener("click", () => { closeMenu(); onSelect(); });
    }
    return item;
  }

  function remove(invitee) {
    invitees.splice(invitees.indexOf(invitee), 1);
    page = Math.min(page, Math.max(0, Math.ceil(invitees.length / PAGE_SIZE) - 1));
    showSummary("Removed " + invitee.email + ".", []);
    render();
  }

  function confirmRemoval(row, invitee) {
    const strip = el("div", "invitee-confirm");
    strip.setAttribute("role", "alertdialog");
    const text = el("span", "invitee-confirm-text", "Remove " + invitee.email + "? Their vote will be removed too.");
    text.id = "confirm-" + emailKey(invitee.email).replace(/[^a-z0-9]/g, "-");
    strip.setAttribute("aria-labelledby", text.id);
    const cancel = el("button", null, "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => render());
    const confirm = el("button", "invitee-confirm-remove", "Remove");
    confirm.type = "button";
    confirm.addEventListener("click", () => remove(invitee));
    strip.append(text, cancel, confirm);
    row.appendChild(strip);
    cancel.focus();
  }

  function resend(invitee) {
    invitee.reminded = true;
    invitee.lastEmailAt = Date.now();
    if (invitee.status === "Not delivered") invitee.status = "Invited";
    showSummary("Reminder sent to " + invitee.email + ".", []);
    render();
  }

  function rowFor(invitee) {
    const row = el("li", "invitee-row");
    const who = el("div", "invitee-who");
    who.appendChild(el("span", "invitee-email", invitee.email));
    if (invitee.name) who.appendChild(el("span", "invitee-name", invitee.name));
    const chip = el("span", "invitee-chip", invitee.status);
    chip.dataset.status = invitee.status;
    const trigger = kebab("Actions for " + invitee.email);
    const menu = el("div", "actions-menu");
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    menu.append(
      menuItem("Resend invitation", () => resend(invitee), resendBlockedReason(invitee)),
      menuItem("Remove", () => (invitee.status === "Voted" ? confirmRemoval(row, invitee) : remove(invitee)))
    );
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu(trigger, menu);
    });
    row.append(who, chip, trigger, menu);
    return row;
  }

  function render() {
    closeMenu();
    const start = page * PAGE_SIZE;
    list.replaceChildren(...invitees.slice(start, start + PAGE_SIZE).map(rowFor));
    pager.hidden = invitees.length <= PAGE_SIZE;
    pager.querySelector(".invitees-pager-range").textContent =
      (start + 1) + "–" + Math.min(start + PAGE_SIZE, invitees.length) + " of " + invitees.length;
    pager.querySelector('[data-step="-1"]').disabled = page === 0;
    pager.querySelector('[data-step="1"]').disabled = start + PAGE_SIZE >= invitees.length;
    refreshCounts();
  }

  function showSummary(summary, refusals) {
    results.hidden = false;
    results.querySelector(".invitees-summary").textContent = summary;
    results.querySelector(".invitees-refusals").replaceChildren(...refusals.map(({ address, reason }) => {
      const line = el("li");
      line.append(el("span", "invitees-refused-address", address), " — " + reason);
      return line;
    }));
  }

  function refusalFor(address, keysSoFar) {
    if (address.length > 200 || !EMAIL_PATTERN.test(address)) return "Not a valid email address.";
    const key = emailKey(address);
    if (keysSoFar.has(key)) return "Already invited.";
    if (BANNED.some((b) => emailKey(b) === key)) return "Banned from this poll.";
    if (keysSoFar.size >= VOTER_LIMIT) return "Over the poll's voter limit of " + VOTER_LIMIT + ".";
    return "";
  }

  function invite() {
    const addresses = input.value.split(/[\s,]+/).filter(Boolean);
    if (!addresses.length) return;
    const keys = new Set(invitees.map((i) => emailKey(i.email)));
    const refusals = [];
    let added = 0;
    for (const address of addresses) {
      const reason = refusalFor(address, keys);
      if (reason) {
        refusals.push({ address, reason });
        continue;
      }
      keys.add(emailKey(address));
      invitees.push({ email: address, name: "", status: "Invited", lastEmailAt: Date.now(), reminded: false });
      added++;
    }
    input.value = refusals.map((r) => r.address).join("\n");
    showSummary("Invited " + added + "." + (refusals.length ? " " + refusals.length + " could not be added." : ""), refusals);
    page = Math.max(0, Math.ceil(invitees.length / PAGE_SIZE) - 1);
    render();
  }

  inviteButton.addEventListener("click", invite);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      invite();
    }
  });
  for (const button of pager.querySelectorAll(".invitees-page-btn")) {
    button.addEventListener("click", () => {
      page += Number(button.dataset.step);
      render();
    });
  }

  const headerTrigger = document.querySelector(".card-readonly-header .actions-menu-trigger");
  headerTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(headerTrigger, headerTrigger.nextElementSibling);
  });
  document.addEventListener("click", (event) => {
    if (openMenu && !openMenu.menu.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !openMenu) return;
    const trigger = openMenu.trigger;
    closeMenu();
    trigger.focus();
  });
  window.addEventListener("scroll", closeMenu, true);

  const themeButtons = document.querySelectorAll("[data-theme-choice]");
  for (const button of themeButtons) {
    button.addEventListener("click", () => {
      document.documentElement.setAttribute("data-theme", button.dataset.themeChoice);
      for (const other of themeButtons) other.setAttribute("aria-pressed", String(other === button));
    });
  }

  const stateButtons = document.querySelectorAll("[data-poll-state]");
  for (const button of stateButtons) {
    button.addEventListener("click", () => {
      panel.toggleAttribute("data-readonly", button.dataset.pollState === "CLOSED");
      document.querySelector(".card-state-value").textContent = button.dataset.pollState;
      for (const other of stateButtons) other.setAttribute("aria-pressed", String(other === button));
      render();
    });
  }

  render();
})();
