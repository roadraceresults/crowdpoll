(function () {
  "use strict";

  const SHOW_AT = 600;
  const HIDE_BELOW = 400;
  const ARROW_PATH = "M12 4 19 11 14.5 11 14.5 20 9.5 20 9.5 11 5 11 Z";

  const button = document.createElement("button");
  button.id = "backToTopFab";
  button.className = "back-to-top-fab";
  button.type = "button";
  button.setAttribute("aria-label", "Back to top");
  button.title = "Back to top";
  button.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + ARROW_PATH + '" fill="currentColor"/></svg>';
  document.body.appendChild(button);

  let visible = false;
  let scheduled = 0;

  function reducedMotion() {
    return Boolean(window.matchMedia) && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function evaluate() {
    scheduled = 0;
    const y = window.scrollY;
    if (!visible && y >= SHOW_AT) {
      visible = true;
      button.classList.add("is-visible");
    } else if (visible && y < HIDE_BELOW) {
      visible = false;
      button.classList.remove("is-visible");
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = window.requestAnimationFrame ? window.requestAnimationFrame(evaluate) : window.setTimeout(evaluate, 0);
  }

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  });

  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    button.click();
  });

  window.addEventListener("scroll", schedule, { passive: true });

  evaluate();
})();
