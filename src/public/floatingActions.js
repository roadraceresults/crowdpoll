(function () {
  "use strict";

  const FLOAT_TOP_GAP = 4;
  const FLOAT_DRAG_PX = 5;
  const FLOAT_ROW_GAP = 8;
  const PHONE_QUERY = "(max-width: 639.98px)";

  const floating = document.getElementById("floatingActions");
  const siteHeader = document.getElementById("site-header");
  if (!floating || !siteHeader) return;

  const phone = window.matchMedia ? window.matchMedia(PHONE_QUERY) : null;
  let position = null;
  let docked = false;
  let keepInsideQueued = false;

  function isPhone() {
    return Boolean(phone) && phone.matches;
  }

  function isShown() {
    return !floating.hidden;
  }

  function visibleGrid() {
    const panel = document.querySelector(".tab-panel:not([hidden])");
    if (!panel) return null;
    return panel.querySelector(".maximized-card-grid:not([hidden])") || panel.querySelector(".card-grid:not([hidden])");
  }

  function cardArea() {
    const grid = visibleGrid();
    if (!grid) return null;
    const box = grid.getBoundingClientRect();
    return {
      left: box.left,
      right: box.right,
      top: Math.max(box.top, window.FixedChrome ? window.FixedChrome.height() : 0),
      bottom: Math.min(box.bottom, window.innerHeight),
      gridTop: box.top
    };
  }

  function clampToCardArea(point, area) {
    const size = floating.getBoundingClientRect();
    return {
      x: Math.min(Math.max(point.x, area.left), Math.max(area.left, area.right - size.width)),
      y: Math.min(Math.max(point.y, area.top), Math.max(area.top, area.bottom - size.height))
    };
  }

  function startPosition(area) {
    const size = floating.getBoundingClientRect();
    return clampToCardArea({ x: area.right - size.width, y: area.gridTop + FLOAT_TOP_GAP }, area);
  }

  function dockPosition() {
    const refresh = document.querySelector(".tab-bar-wrap .tab-refresh--icon");
    const box = refresh ? refresh.getBoundingClientRect() : null;
    if (!box || box.width === 0) return null;
    const size = floating.getBoundingClientRect();
    return { x: box.right + FLOAT_ROW_GAP, y: box.top + box.height / 2 - size.height / 2 };
  }

  function homePosition(area) {
    const dock = dockPosition();
    docked = Boolean(dock);
    return dock || startPosition(area);
  }

  function fitsInCardArea(point, area) {
    const size = floating.getBoundingClientRect();
    return (
      point.x >= area.left - 0.5 &&
      point.x + size.width <= area.right + 0.5 &&
      point.y >= area.top - 0.5 &&
      point.y + size.height <= area.bottom + 0.5
    );
  }

  function paint() {
    floating.style.left = position.x + "px";
    floating.style.top = position.y + "px";
  }

  function placeFloatingActions() {
    const area = cardArea();
    if (!area) return;
    position = position && !docked && fitsInCardArea(position, area) ? position : homePosition(area);
    paint();
  }

  function keepInsideCardArea() {
    if (!isShown() || !position || docked) return;
    const area = cardArea();
    if (!area) return;
    position = clampToCardArea(position, area);
    paint();
  }

  function queueKeepInside() {
    if (keepInsideQueued) return;
    keepInsideQueued = true;
    requestAnimationFrame(() => {
      keepInsideQueued = false;
      keepInsideCardArea();
    });
  }

  function resetIfOutsideCardArea() {
    if (!isShown() || !position) return;
    const area = cardArea();
    if (!area) return;
    position = !docked && fitsInCardArea(position, area) ? position : homePosition(area);
    paint();
  }

  function slotOf() {
    return document.getElementById("header-actions");
  }

  function guestButtonsIn(container) {
    if (!container) return [];
    return Array.from(container.children).filter(
      (child) => child.classList.contains("btn-header-ghost") || child.classList.contains("btn-header-primary")
    );
  }

  function hideFloatingActions() {
    floating.hidden = true;
  }

  function syncFloatingActions() {
    const slot = slotOf();
    const slotButtons = guestButtonsIn(slot);
    if (!isPhone()) {
      if (slot && slotButtons.length === 0) slot.append(...guestButtonsIn(floating));
      floating.replaceChildren();
      hideFloatingActions();
      return;
    }
    if (slotButtons.length > 0) {
      floating.replaceChildren(...slotButtons);
    } else if (slot && slot.querySelector(".header-user")) {
      floating.replaceChildren();
    }
    if (floating.children.length === 0) {
      hideFloatingActions();
      return;
    }
    floating.hidden = false;
    placeFloatingActions();
  }

  let drag = null;
  let swallowClick = false;

  function beginDrag(event) {
    if (event.button || !position) return;
    drag = { x: event.clientX, y: event.clientY, startX: position.x, startY: position.y, moving: false };
  }

  function moveDrag(event) {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moving && Math.hypot(dx, dy) > FLOAT_DRAG_PX) {
      drag.moving = true;
      floating.classList.add("is-dragging");
    }
    if (!drag.moving) return;
    const area = cardArea();
    if (!area) return;
    docked = false;
    position = clampToCardArea({ x: drag.startX + dx, y: drag.startY + dy }, area);
    paint();
  }

  function endDrag() {
    if (!drag) return;
    const moved = drag.moving;
    drag = null;
    floating.classList.remove("is-dragging");
    if (!moved) return;
    swallowClick = true;
    setTimeout(() => {
      swallowClick = false;
    }, 0);
  }

  function swallowClickAfterDrag(event) {
    if (!swallowClick) return;
    event.stopImmediatePropagation();
    event.preventDefault();
  }

  floating.addEventListener("pointerdown", beginDrag);
  floating.addEventListener("click", swallowClickAfterDrag, true);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("scroll", keepInsideCardArea, { passive: true });
  window.addEventListener("resize", resetIfOutsideCardArea);
  window.addEventListener("fixedchromechange", () => {
    if (isShown() && docked) placeFloatingActions();
  });

  if (phone && phone.addEventListener) phone.addEventListener("change", syncFloatingActions);

  new MutationObserver(syncFloatingActions).observe(siteHeader, { childList: true, subtree: true });

  const panels = document.querySelector("main");
  if (panels) {
    new MutationObserver(queueKeepInside).observe(panels, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"]
    });
  }

  syncFloatingActions();
})();
