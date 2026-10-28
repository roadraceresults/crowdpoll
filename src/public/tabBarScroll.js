(function () {
  "use strict";

  const DRAG_START_PX = 5;

  const tabBar = document.getElementById("tabBar");
  const menuButton = document.getElementById("tabMenuBtn");
  const menu = document.getElementById("tabMenu");
  if (!tabBar || !menuButton || !menu) return;
  const openers = [menuButton, document.getElementById("tabMoreBtn")].filter(Boolean);
  let opener = menuButton;

  const phoneWidth = window.matchMedia ? window.matchMedia("(max-width: 900px)") : null;

  function maxScroll() {
    return Math.max(0, tabBar.scrollWidth - tabBar.clientWidth);
  }

  function clampScroll(value) {
    return Math.min(maxScroll(), Math.max(0, value));
  }

  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragPending = false;
  let dragging = false;
  let swallowDragClick = false;
  let wheelTarget = null;

  function beginDrag(event) {
    wheelTarget = null;
    if (event.pointerType === "touch" || event.button) return;
    dragPending = true;
    dragging = false;
    dragStartX = event.clientX;
    dragStartScroll = tabBar.scrollLeft;
  }

  function moveDrag(event) {
    if (!dragPending) return;
    const distance = event.clientX - dragStartX;
    if (!dragging && Math.abs(distance) > DRAG_START_PX) {
      dragging = true;
      tabBar.classList.add("is-dragging");
    }
    if (dragging) tabBar.scrollLeft = clampScroll(dragStartScroll - distance);
  }

  function endDrag() {
    if (!dragPending) return;
    dragPending = false;
    tabBar.classList.remove("is-dragging");
    if (!dragging) return;
    dragging = false;
    swallowDragClick = true;
    setTimeout(() => {
      swallowDragClick = false;
    }, 0);
  }

  function swallowClickAfterDrag(event) {
    if (!swallowDragClick) return;
    event.stopImmediatePropagation();
    event.preventDefault();
  }

  function scrollByWheel(event) {
    if (!phoneWidth || !phoneWidth.matches || event.deltaY === 0 || event.deltaX !== 0) return;
    const from = wheelTarget === null ? tabBar.scrollLeft : wheelTarget;
    const target = clampScroll(from + event.deltaY);
    if (target === from) return;
    event.preventDefault();
    wheelTarget = target;
    tabBar.scrollLeft = target;
  }

  function forgetWheelTarget() {
    wheelTarget = null;
  }

  function findTab(name) {
    return tabBar.querySelector('.tab[data-tab="' + name + '"]');
  }

  function buildTabMenu() {
    menu.textContent = "";
    tabBar.querySelectorAll(".tab").forEach((tab) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "tab-menu-item";
      item.setAttribute("role", "menuitem");
      item.dataset.tab = tab.dataset.tab;
      item.classList.toggle("is-active", tab.classList.contains("is-active"));
      if (tab.getAttribute("aria-disabled") === "true") item.setAttribute("aria-disabled", "true");
      const icon = tab.querySelector(".tab-icon");
      if (icon) item.appendChild(icon.cloneNode(true));
      const label = document.createElement("span");
      label.textContent = tab.textContent.trim();
      item.appendChild(label);
      menu.appendChild(item);
    });
  }

  function menuItems() {
    return Array.from(menu.querySelectorAll(".tab-menu-item"));
  }

  function setMenuOpen(open, focusTarget) {
    if (open) buildTabMenu();
    menu.hidden = !open;
    openers.forEach((button) => button.setAttribute("aria-expanded", String(open && button === opener)));
    if (open) {
      const items = menuItems();
      const current = items.find((item) => item.classList.contains("is-active")) || items[0];
      if (current) current.focus();
    } else if (focusTarget) {
      opener.focus();
    }
  }

  function chooseMenuItem(item) {
    const tab = findTab(item.dataset.tab);
    if (!tab) return;
    tab.click();
    setMenuOpen(false, true);
  }

  function moveMenuFocus(event) {
    const items = menuItems();
    const at = items.indexOf(document.activeElement);
    const moves = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 };
    if (!(event.key in moves) || !items.length) return;
    event.preventDefault();
    items[(moves[event.key] + items.length) % items.length].focus();
  }

  function closeMenuOnEscape(event) {
    if (event.key !== "Escape" || menu.hidden) return;
    setMenuOpen(false, true);
  }

  function closeMenuOnOutsideClick(event) {
    if (menu.hidden || menu.contains(event.target) || openers.some((button) => button.contains(event.target))) return;
    setMenuOpen(false, false);
  }

  tabBar.addEventListener("pointerdown", beginDrag);
  tabBar.addEventListener("click", swallowClickAfterDrag, true);
  tabBar.addEventListener("wheel", scrollByWheel, { passive: false });
  tabBar.addEventListener("scrollend", forgetWheelTarget);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  openers.forEach((button) => {
    button.addEventListener("click", () => {
      const open = menu.hidden || button !== opener;
      opener = button;
      setMenuOpen(open, false);
    });
  });
  menu.addEventListener("click", (event) => {
    const item = event.target.closest(".tab-menu-item");
    if (item) chooseMenuItem(item);
  });
  menu.addEventListener("keydown", moveMenuFocus);
  document.addEventListener("keydown", closeMenuOnEscape);
  document.addEventListener("click", closeMenuOnOutsideClick);
})();
