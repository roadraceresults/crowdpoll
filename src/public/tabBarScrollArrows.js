/**
 * Tab bar scroll arrows with hold-to-scroll and ripple pulsation (TWEAKS09, TWEAKS10).
 * Shows/hides arrow buttons based on scroll position and handles
 * single-click scroll and hold-to-scroll continuous behavior.
 * Tracks usage count and disables pulsation after 2 uses per page load.
 */
(function () {
  "use strict";

  var tabBar = document.getElementById("tabBar");
  var leftArrow = document.getElementById("tabScrollLeftArrow");
  var rightArrow = document.getElementById("tabScrollRightArrow");

  if (!tabBar || !leftArrow || !rightArrow) return;

  var scrollInterval = null;
  var scrollDirection = null;
  var TAB_BAR_SCROLL_AMOUNT_MULTIPLIER = 2; // Multiplier for single-click scroll distance
  var TAB_BAR_SCROLL_SPEED_MULTIPLIER = 12; // Multiplier for hold-scroll speed
  var scrollAmount = 48 * TAB_BAR_SCROLL_AMOUNT_MULTIPLIER; // Approximate tab width for single scroll × multiplier
  var usageCount = 0; // Track total uses across both arrows
  var usageLimit = 6; // Disable pulsation after this many uses

  function updateArrowVisibility() {
    var hasScrollLeft = tabBar.scrollLeft > 0;
    var hasScrollRight = tabBar.scrollLeft < tabBar.scrollWidth - tabBar.clientWidth - 1;

    leftArrow.hidden = !hasScrollLeft;
    rightArrow.hidden = !hasScrollRight;

    // Ensure idle pulsation is visible (unless usage limit reached)
    if (!leftArrow.hidden && !leftArrow.classList.contains("is-active") && usageCount < usageLimit) {
      leftArrow.classList.add("is-idle");
    }
    if (!rightArrow.hidden && !rightArrow.classList.contains("is-active") && usageCount < usageLimit) {
      rightArrow.classList.add("is-idle");
    }
  }

  function scrollOneTab(direction) {
    var currentScroll = tabBar.scrollLeft;
    var targetScroll = direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount;

    // Smooth scroll
    tabBar.scrollTo({
      left: targetScroll,
      behavior: "smooth"
    });
  }

  function startContinuousScroll(direction) {
    scrollDirection = direction;
    var step = 4 * TAB_BAR_SCROLL_SPEED_MULTIPLIER; // Pixels per scroll tick × multiplier

    if (scrollInterval) clearInterval(scrollInterval);

    scrollInterval = setInterval(function () {
      var currentScroll = tabBar.scrollLeft;
      var maxScroll = tabBar.scrollWidth - tabBar.clientWidth;

      if (scrollDirection === "left" && currentScroll > 0) {
        tabBar.scrollLeft -= step;
      } else if (scrollDirection === "right" && currentScroll < maxScroll) {
        tabBar.scrollLeft += step;
      } else {
        stopContinuousScroll();
      }
    }, 16); // ~60 FPS
  }

  function stopContinuousScroll() {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
    scrollDirection = null;
  }

  function updatePulsationState() {
    // Apply usage-limit-reached class if limit exceeded
    if (usageCount >= usageLimit) {
      leftArrow.classList.add("usage-limit-reached");
      rightArrow.classList.add("usage-limit-reached");
      leftArrow.classList.remove("is-idle");
      rightArrow.classList.remove("is-idle");
    }
  }

  function setupArrowListeners(arrow, direction) {
    var isHolding = false;
    var holdTimer = null;
    var holdThreshold = 300; // ms

    function onPointerDown(e) {
      isHolding = true;
      arrow.classList.remove("is-idle");
      arrow.classList.add("is-active");

      holdTimer = setTimeout(function () {
        // Hold started, switch to continuous scroll
        arrow.classList.remove("is-active");
        arrow.classList.add("is-scrolling");
        startContinuousScroll(direction);
      }, holdThreshold);
    }

    function onPointerUp() {
      if (holdTimer) {
        clearTimeout(holdTimer);
      }

      // If we were in continuous scroll, stop it
      if (scrollDirection === direction) {
        stopContinuousScroll();
      } else if (isHolding && !scrollInterval) {
        // Single click/tap: scroll one tab
        scrollOneTab(direction);

        // Increment usage count
        usageCount++;
        updatePulsationState();
      }

      isHolding = false;
      arrow.classList.remove("is-active", "is-scrolling");

      // Restore idle pulsation if arrow is still visible and limit not reached
      if (!arrow.hidden && usageCount < usageLimit) {
        arrow.classList.add("is-idle");
      }
    }

    // Support both touch and mouse
    arrow.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    arrow.addEventListener("click", function (e) {
      // Prevent default if we started a hold (click fires after pointerup)
      if (holdTimer) {
        e.preventDefault();
      }
    });
  }

  // Initialize arrow listeners
  setupArrowListeners(leftArrow, "left");
  setupArrowListeners(rightArrow, "right");

  // Update arrow visibility on scroll
  tabBar.addEventListener("scroll", updateArrowVisibility);

  // Update arrow visibility on window resize
  window.addEventListener("resize", updateArrowVisibility);

  // Initial update
  updateArrowVisibility();
})();
