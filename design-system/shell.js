// Optional helper for plain-HTML pages (React apps handle this themselves): makes the phone navigation drawer work.
// Include before </body>:  <script src="design-system/shell.js"></script>
// Needs the standard shell markup: .shell > (aside.sidebar, .scrim, .main > header.topbar > .menu-button).
// Below 40rem the sidebar is a drawer. Opening it: aria-expanded on the menu button, focus moves into the drawer, the rest of the page is inert
// (and Tab stays inside the drawer). Closing (Escape, scrim click, a link in the drawer, growing past the phone width) puts focus back on the menu button.
(function () {
  function start() {
    var shell = document.querySelector(".shell");
    var button = document.querySelector(".menu-button");
    if (!shell || !button || shell.__designShell) return;
    shell.__designShell = true;
    var sidebar = shell.querySelector(".sidebar");
    var main = shell.querySelector(".main");
    var scrim = shell.querySelector(".scrim");
    var phone = window.matchMedia ? window.matchMedia("(max-width: 40rem)") : { matches: false };
    if (sidebar && !sidebar.id) sidebar.id = "sidebar";
    if (sidebar && !button.getAttribute("aria-controls")) button.setAttribute("aria-controls", sidebar.id);
    button.setAttribute("aria-expanded", "false");

    function isOpen() { return shell.hasAttribute("data-nav"); }
    function focusable() {
      var list = sidebar ? sidebar.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])') : [];
      return Array.prototype.filter.call(list, function (el) { return el.getClientRects().length > 0; });
    }
    function set(open, returnFocus) {
      if (open === isOpen()) return;
      if (open) shell.setAttribute("data-nav", "open"); else shell.removeAttribute("data-nav");
      button.setAttribute("aria-expanded", open ? "true" : "false");
      if (main) { if (open) main.setAttribute("inert", ""); else main.removeAttribute("inert"); }
      if (open && sidebar) {
        // The drawer is visibility:hidden until the next frame ends its transition start; wait a tick before moving focus.
        var go = function () {
          var items = focusable();
          var current = sidebar.querySelector('[aria-current="page"]');
          var target = (current && current.getClientRects().length && current) || items[0];
          if (target) target.focus();
          else { sidebar.setAttribute("tabindex", "-1"); sidebar.focus(); }
        };
        if (window.requestAnimationFrame) window.requestAnimationFrame(go); else go();
      }
      if (!open && returnFocus) button.focus();
    }

    button.addEventListener("click", function () { set(!isOpen(), true); });
    if (scrim) scrim.addEventListener("click", function () { set(false, true); });
    document.addEventListener("keydown", function (event) {
      if (!isOpen()) return;
      if (event.key === "Escape") { event.preventDefault(); set(false, true); return; }
      if (event.key !== "Tab") return;
      var items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      var first = items[0], last = items[items.length - 1];
      if (!sidebar.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    if (sidebar) sidebar.addEventListener("click", function (event) {
      if (event.target.closest && event.target.closest("a[href]")) set(false, false);
    });
    if (phone.addEventListener) phone.addEventListener("change", function () { if (!phone.matches) set(false, false); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
