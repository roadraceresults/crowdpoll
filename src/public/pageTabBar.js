/*
  The home page's Tab Bar on the pages that have no tabs of their own (/admin, /profile, /settings): the same
  tabs, icons and All-tabs menu under the site header, at every width. Each tab is a link that opens the home
  page on that tab (/?tab=<name>), so a page that guards unsaved edits on its links (the admin page) guards the
  tabs too. No tab is open here, so none is highlighted, and there is no Refresh. As on the home page, a guest
  gets no Home tab and a personal tab leads to /login, and Live Results shows only while ENV_LIVE_RESULTS is on.
  tests/client-page-tab-bar.test.ts keeps the tabs, labels and icons the same as index.html's.
*/
(function () {
  "use strict";

  const header = document.getElementById("site-header");
  if (!header || document.getElementById("tabBar")) return;

  const PERSONAL_TABS = ["home", "your-polls", "shared-with-you", "your-votes", "watching", "live"];

  const WATCHING_EYE = '<path d="M1.8 12C4.6 7.2 8 4.9 12 4.9s7.4 2.3 10.2 7.1C19.4 16.8 16 19.1 12 19.1S4.6 16.8 1.8 12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>';

  const TABS = [
    { name: "home", label: "Home", icon: '<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#8093a7"/><g color="#e8edf2" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round" transform="translate(12 12) scale(0.75) translate(-12 -11.5)"><path fill-rule="evenodd" d="M12 3 21 10.5H19V20H5V10.5H3ZM10 20V14H14V20Z"></path></g></svg>' },
    { name: "your-polls", label: "Your Polls", icon: '<svg class="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="32" fill="#8093a7"/><circle cx="32" cy="25" r="11" fill="#e8edf2"/><path d="M32 40c-11 0-19 6.5-19 14.5V64h38v-9.5C51 46.5 43 40 32 40z" fill="#e8edf2"/></svg>' },
    { name: "shared-with-you", label: "Shared With&nbsp;You", icon: '<svg class="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="32" fill="#8093a7"/><circle cx="22" cy="26" r="8" fill="#e8edf2"/><circle cx="42" cy="26" r="8" fill="#e8edf2"/><path d="M22 37c-8 0-14 4.800-14 11v2h28v-2c0-6.200-6-11-14-11zM42 37c-2.500 0-4.800.600-6.700 1.700C38.400 41 40 44.200 40 48v2h16v-2c0-6.200-6-11-14-11z" fill="#e8edf2"/></svg>' },
    { name: "your-votes", label: "Your Votes", icon: '<svg class="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="32" fill="#8093a7"/><path d="M18 33l9 9 19-20" fill="none" stroke="#e8edf2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { name: "trending", label: "Trending", icon: '<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 20.4C8.9 20.4 14.2 17.6 18 12.1l2.4 2.1L21.6 5.2 12.8 7l2.4 2.1c-3.3 4.6-7.7 6.9-13.2 6.9z"/></svg>' },
    { name: "newest", label: "Newest", icon: '<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#8093a7"/><path fill="#e8edf2" transform="translate(12 12) skewX(-12) translate(-12 -12)" d="M10.4 5h3.2l-.6 9h-2zM10.5 16h3v3h-3z"/></svg>' },
    { name: "watching", label: "Following", icon: '<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#8093a7"/><g color="#e8edf2" transform="translate(12 12) scale(0.66) translate(-12 -12)">' + WATCHING_EYE + '</g></svg>' },
    { name: "live", label: "Live Results", icon: '<span class="tab-icon tab-icon--live" aria-hidden="true"><span class="live-bars"><i></i><i></i><i></i></span></span>' },
    { name: "search", label: "Search", icon: '<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#8093a7"/><g color="#e8edf2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(12 12) scale(0.6) translate(-12.5 -12.5)"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></g></svg>' }
  ];

  const MORE_ICON = '<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#8093a7"/><circle cx="12" cy="7" r="1.8" fill="#e8edf2"/><circle cx="12" cy="12" r="1.8" fill="#e8edf2"/><circle cx="12" cy="17" r="1.8" fill="#e8edf2"/></svg>';
  const LEFT_ARROW = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.41 7.41L8 6l-6 6 6 6 1.41-1.41L4.83 12z M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
  const RIGHT_ARROW = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 6l-1.41 1.41L12.17 12l-3.58 3.59L10 17.41 16 11z M16 6l-1.41 1.41L18.17 12l-3.58 3.59L16 17.41 22 11z"/></svg>';
  const MENU_ICON = '<svg viewBox="0 0 30 24" aria-hidden="true" focusable="false"><circle cx="3" cy="7" r="1.8" fill="currentColor"/><circle cx="3" cy="12" r="1.8" fill="currentColor"/><circle cx="3" cy="17" r="1.8" fill="currentColor"/><path d="M9 6h18v2H9zM9 11h18v2H9zM9 16h18v2H9z" fill="currentColor"/></svg>';

  function tabHref(name) {
    return "/?tab=" + encodeURIComponent(name);
  }

  function build() {
    const wrap = document.createElement("div");
    wrap.className = "tab-bar-wrap";
    wrap.innerHTML =
      '<button class="tab-scroll-arrow tab-scroll-arrow--left" id="tabScrollLeftArrow" type="button" aria-label="Scroll tabs left" hidden>' + LEFT_ARROW + "</button>" +
      '<nav class="tab-bar" id="tabBar" aria-label="Poll tabs">' +
      TABS.map((tab) => '<a class="tab" href="' + tabHref(tab.name) + '" data-tab="' + tab.name + '">' + tab.icon + tab.label + "</a>").join("") +
      '<button class="tab-more" id="tabMoreBtn" type="button" aria-label="More" aria-haspopup="true" aria-expanded="false" aria-controls="tabMenu">' + MORE_ICON + "More</button>" +
      "</nav>" +
      '<button class="tab-scroll-arrow tab-scroll-arrow--right" id="tabScrollRightArrow" type="button" aria-label="Scroll tabs right" hidden>' + RIGHT_ARROW + "</button>" +
      '<button class="tab-menu-btn" id="tabMenuBtn" type="button" aria-label="All tabs" aria-haspopup="true" aria-expanded="false" aria-controls="tabMenu">' + MENU_ICON + "</button>" +
      '<div class="tab-menu" id="tabMenu" role="menu" aria-label="All tabs" hidden></div>';
    header.after(wrap);
    document.body.classList.add("has-tab-bar");
    return wrap;
  }

  const wrap = build();
  const bar = wrap.querySelector("#tabBar");
  let signedIn = false;
  let liveResultsOn = false;

  function applyState() {
    bar.querySelectorAll(".tab").forEach((tab) => {
      const name = tab.dataset.tab;
      if (name === "home") tab.hidden = !signedIn;
      if (name === "live") tab.hidden = !liveResultsOn;
      if (PERSONAL_TABS.indexOf(name) === -1 || name === "home") return;
      if (signedIn) {
        tab.removeAttribute("aria-disabled");
        tab.removeAttribute("title");
        tab.href = tabHref(name);
      } else {
        tab.setAttribute("aria-disabled", "true");
        tab.title = "Log in to use this tab";
        tab.href = "/login";
      }
    });
  }

  function updateOverflowFades() {
    wrap.classList.toggle("has-tabs-before", bar.scrollLeft > 1);
    wrap.classList.toggle("has-tabs-after", bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 1);
  }

  applyState();
  bar.addEventListener("scroll", updateOverflowFades, { passive: true });
  window.addEventListener("resize", updateOverflowFades);
  updateOverflowFades();

  if (window.Session) {
    window.Session.subscribe((session) => {
      signedIn = Boolean(session);
      applyState();
      updateOverflowFades();
    });
  }

  Promise.resolve(window.SiteConfig || fetch("/api/config").then((res) => (res.ok ? res.json() : null)))
    .catch(() => null)
    .then((config) => {
      liveResultsOn = Boolean(config && config.liveResultsEnabled);
      applyState();
      updateOverflowFades();
    });
})();
