/**
 * 013-UI-UX-revisions — the unauthorized-access card (US7).
 *
 * The smallest thing the shell can render: a title, a sentence and a way out.
 * Mounted rather than hand-written so the close control comes from the shell
 * and cannot drift into the admin pages' .admin-back-link.
 *
 * One card serves a guest and a signed-in non-administrator alike. The
 * subtitle names neither, so the page does not disclose whether signing in
 * would help (FR-044).
 */
(function () {
  "use strict";

  function start() {
    var main = document.getElementById("card-root");
    if (!main) return;
    window.CardShell.mount(main, {
      title: "Not Authorized",
      subtitle: "You do not have permission to access this page.",
      closeHref: "/"
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
