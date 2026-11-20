/* Card size diagnostic: labels every poll card on the page with its width and height in CSS pixels,
   and shows the window, the grid and its column count in a box at the top right. The labels follow the
   cards as the window is resized, the page scrolls, a tab changes or a card flips or grows.

   Using it (temporary; never commit either step):
     1. Copy this file to src/public/cardSizeDebug.js.
     2. In the page under test, add  <script src="/cardSizeDebug.js"></script>  right after the
        viewportWidth.js script tag (index.html).
     3. Open the page with ?cardsize in the address (e.g. http://localhost:8080/?cardsize). It then stays
        on for the rest of the tab's session; ?cardsize=off turns it off.
     Remove both when done.

   Reading it:
     window W x H | grid G px | N columns  the window's inner size, the first visible .card-grid's width
                                          and how many columns it has laid out.
     W x H (on each card)                    the card's .card-viewport box, rounded to 0.1 px; it includes
                                          a flip in progress, so read it at rest.

   It sends nothing anywhere: the on/off switch lives in the tab's sessionStorage ("cardsize"). */
(function () {
  var q = location.search + location.hash;
  var on = /cardsize(?!=off)/.test(q);
  try {
    if (/cardsize=off/.test(q)) sessionStorage.removeItem("cardsize");
    else if (on) sessionStorage.setItem("cardsize", "1");
    on = on || sessionStorage.getItem("cardsize") === "1";
  } catch (e) {}
  if (!on) return;

  var LABEL = "position:fixed;z-index:2147483647;pointer-events:none;font:600 12px/1.3 ui-monospace,Consolas,monospace;" +
    "background:rgba(176,0,32,0.88);color:#fff;padding:2px 6px;border-radius:4px;white-space:nowrap;";
  var layer, banner, labels = [];

  function build() {
    layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    banner = document.createElement("div");
    banner.style.cssText = LABEL + "top:4px;right:4px;background:rgba(0,0,0,0.82);";
    layer.appendChild(banner);
    document.body.appendChild(layer);
  }

  function px(n) { return (Math.round(n * 10) / 10).toString(); }

  function columnsOf(grid) {
    var lefts = {}, n = 0;
    for (var c = grid.firstElementChild; c; c = c.nextElementSibling) {
      var r = c.getBoundingClientRect();
      if (r.width === 0) continue;
      var k = Math.round(r.left);
      if (!lefts[k]) { lefts[k] = 1; n++; }
    }
    return n;
  }

  function frame() {
    var grids = document.querySelectorAll(".card-grid"), grid = null;
    for (var i = 0; i < grids.length; i++) if (grids[i].getBoundingClientRect().width > 0) { grid = grids[i]; break; }
    banner.textContent = "window " + innerWidth + " x " + innerHeight +
      (grid ? " | grid " + px(grid.getBoundingClientRect().width) + " px | " + columnsOf(grid) + " columns" : " | no grid shown");

    var cards = document.querySelectorAll(".card-viewport"), used = 0;
    for (var j = 0; j < cards.length; j++) {
      var r = cards[j].getBoundingClientRect();
      if (r.width === 0 || r.bottom < 0 || r.top > innerHeight) continue;
      var label = labels[used] || (labels[used] = layer.appendChild(document.createElement("div")));
      label.style.cssText = LABEL + "left:" + (r.left + 4) + "px;top:" + (Math.max(r.top, 0) + 4) + "px;";
      label.textContent = px(r.width) + " x " + px(r.height);
      used++;
    }
    for (var k = used; k < labels.length; k++) labels[k].style.display = "none";
    requestAnimationFrame(frame);
  }

  function start() { build(); requestAnimationFrame(frame); }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
