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
