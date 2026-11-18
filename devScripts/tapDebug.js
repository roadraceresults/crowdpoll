/* Tap diagnostic for testing on real devices (BrowserStack and the like), where there are no dev tools.

   It shows, in a box at the top of the screen, what each tap actually reached, and keeps that log
   across page changes, so a tap that navigates away can still be read on the page it lands on.

   Using it (temporary; never commit either step):
     1. Copy this file to src/public/tapDebug.js.
     2. In the page under test, add  <script src="/tapDebug.js"></script>  right after the
        viewportWidth.js script tag (index.html, profile.html, admin.html, ...).
     3. Open the page with ?tapdebug in the address (e.g. https://<tunnel>/?tapdebug). It then stays on
        for the rest of the tab's session, on every page that loads the script.
     Remove both when done.

   Reading the log (newest last, the last 14 lines kept; times are ms since that page loaded):
     pointerdown x,y on A | at point: B   A is event.target, the element the browser sent the tap to;
                                          B is document.elementFromPoint, what is drawn there. When A is
                                          not the control you touched, something is catching the tap
                                          (an overlay, a ::after halo, a 3D face turned away).
     click x,y on A                       the click that followed; no click line means none was sent.
     focus A                              a field or control took focus.
     scroll y=N / viewport WxH ...        the page moved, or the keyboard or zoom changed the viewport.
     pagehide (leaving)                   the page navigated away; the lines before it say why.

   It sends nothing anywhere: the log lives in the tab's sessionStorage ("tapdebug", "tapdebug-log"). */
(function () {
  var KEY = "tapdebug-log";
  var on = /tapdebug/.test(location.search + location.hash);
  try { if (on) sessionStorage.setItem("tapdebug", "1"); on = on || sessionStorage.getItem("tapdebug") === "1"; } catch (e) {}
  if (!on) return;
  var log = [];
  try { log = JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch (e) {}
  var t0 = Date.now();
  function name(el) {
    if (!el || el.nodeType !== 1) return el ? "#text" : "(none)";
    var s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    if (typeof el.className === "string" && el.className.trim()) s += "." + el.className.trim().split(/\s+/).join(".");
    if (el.getAttribute && el.getAttribute("href")) s += "[href=" + el.getAttribute("href") + "]";
    return s;
  }
  function chain(el) { var out = []; for (var n = el; n && n !== document.body && out.length < 3; n = n.parentElement) out.push(name(n)); return out.join(" < "); }
  function add(line) {
    log.push(location.pathname + " +" + (Date.now() - t0) + "ms " + line);
    log = log.slice(-14);
    try { sessionStorage.setItem(KEY, JSON.stringify(log)); } catch (e) {}
    if (box) box.textContent = log.join("\n");
  }
  var box = document.createElement("pre");
  box.style.cssText = "position:fixed;left:4px;right:4px;top:4px;z-index:2147483647;margin:0;padding:6px;" +
    "background:rgba(0,0,0,.85);color:#7f7;font:10px/1.3 monospace;white-space:pre-wrap;pointer-events:none;max-height:50vh;overflow:hidden";
  document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(box); add("loaded, scrollY=" + Math.round(scrollY)); });
  document.addEventListener("pointerdown", function (e) {
    add("pointerdown " + Math.round(e.clientX) + "," + Math.round(e.clientY) + " on " + chain(e.target) + " | at point: " + chain(document.elementFromPoint(e.clientX, e.clientY)));
  }, true);
  document.addEventListener("click", function (e) {
    add("click " + Math.round(e.clientX) + "," + Math.round(e.clientY) + " on " + chain(e.target) + (e.isTrusted ? "" : " (script)"));
  }, true);
  document.addEventListener("focusin", function (e) { add("focus " + chain(e.target)); }, true);
  var lastY = scrollY;
  window.addEventListener("scroll", function () {
    if (Math.abs(scrollY - lastY) < 40) return;
    lastY = scrollY;
    add("scroll y=" + Math.round(scrollY));
  }, { passive: true });
  if (window.visualViewport) visualViewport.addEventListener("resize", function () {
    add("viewport " + Math.round(visualViewport.width) + "x" + Math.round(visualViewport.height) + " scale " + visualViewport.scale.toFixed(2) + " top " + Math.round(visualViewport.offsetTop));
  });
  window.addEventListener("popstate", function () { add("popstate"); });
  window.addEventListener("pagehide", function () { add("pagehide (leaving)"); });
})();
