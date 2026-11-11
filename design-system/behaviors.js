/* Projects design system v0.30.0. GENERATED from js/behaviors/*.js. Optional: native-first behaviour for plain-HTML pages (tabs, tooltip, drawer, combobox, ...). <script src="design-system/behaviors.js" defer></script> */
/* --- 00-core.js --- */
/* design behaviours: the tiny core that every behaviour file registers with.
   Plain-HTML pages include design-system/behaviors.js (deferred) and get tabs, tooltips, drawers, ... from markup alone.
   React apps use the helpers in design-system/react instead; both follow the same ARIA patterns.
   Author a behaviour in js/behaviors/<name>.js:
     designBehaviors.register("tabs", ".tabs[role=tablist]", function (el, util) { ... });
   `setup` runs once per matching element, now and for elements added later. It may return a cleanup function (called by designBehaviors.destroy). */
(function () {
  if (window.designBehaviors) return;
  var registry = [];
  var counter = 0;
  var KEY = "__designBehaviors";

  var util = {
    /** A unique id for aria-controls / aria-labelledby wiring. */
    uid: function (prefix) { counter += 1; return (prefix || "design") + "-" + counter; },
    /** Make sure an element has an id and return it. */
    ensureId: function (el, prefix) { if (!el.id) el.id = util.uid(prefix); return el.id; },
    /** Focusable descendants in DOM order, skipping hidden and disabled ones. */
    focusables: function (root) {
      var list = root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])');
      return Array.prototype.filter.call(list, function (el) { return !el.hidden && el.getClientRects().length > 0; });
    },
    /** Add a listener and return the function that removes it. */
    on: function (target, type, handler, options) { target.addEventListener(type, handler, options); return function () { target.removeEventListener(type, handler, options); }; },
    /** Move focus along a list with Arrow/Home/End keys. `horizontal` picks Left/Right instead of Up/Down. Returns true when it handled the key. */
    arrowNav: function (event, items, current, horizontal) {
      var next = -1, n = items.length;
      var prev = horizontal ? "ArrowLeft" : "ArrowUp", fwd = horizontal ? "ArrowRight" : "ArrowDown";
      if (event.key === fwd) next = (current + 1) % n;
      else if (event.key === prev) next = (current - 1 + n) % n;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = n - 1;
      if (next < 0) return false;
      event.preventDefault();
      items[next].focus();
      return true;
    },
    /** True when the user asked for less motion. */
    reducedMotion: function () { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; },
    /** Dispatch a bubbling CustomEvent named design:<name> from el. */
    emit: function (el, name, detail) { el.dispatchEvent(new CustomEvent("design:" + name, { bubbles: true, detail: detail })); }
  };

  function run(entry, root) {
    var targets = [];
    if (root.nodeType === 1 && root.matches(entry.selector)) targets.push(root);
    if (root.querySelectorAll) Array.prototype.push.apply(targets, root.querySelectorAll(entry.selector));
    targets.forEach(function (el) {
      var state = el[KEY] || (el[KEY] = {});
      if (state[entry.name]) return;
      state[entry.name] = { cleanup: null };
      try { var cleanup = entry.setup(el, util); if (typeof cleanup === "function") state[entry.name].cleanup = cleanup; }
      catch (error) { if (window.console) console.error("[design] behaviour '" + entry.name + "' failed", error); }
    });
  }

  var api = {
    util: util,
    /** Register a behaviour. It is applied to matching elements immediately (if the DOM is ready) and whenever matching elements are added. */
    register: function (name, selector, setup) {
      var entry = { name: name, selector: selector, setup: setup };
      registry.push(entry);
      if (document.readyState !== "loading") run(entry, document);
    },
    /** Apply all behaviours inside root (default: the document). Called automatically; call it yourself only after innerHTML in code that bypasses the observer. */
    init: function (root) { registry.forEach(function (entry) { run(entry, root || document); }); },
    /** Run cleanups and forget initialisation for everything inside root, e.g. before removing a subtree you intend to re-add. */
    destroy: function (root) {
      var all = (root || document).querySelectorAll("*");
      Array.prototype.forEach.call(all, function (el) {
        var state = el[KEY]; if (!state) return;
        Object.keys(state).forEach(function (name) { if (state[name].cleanup) state[name].cleanup(); });
        delete el[KEY];
      });
    }
  };
  window.designBehaviors = api;

  function start() {
    api.init(document);
    if (!window.MutationObserver) return;
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        Array.prototype.forEach.call(record.addedNodes, function (node) { if (node.nodeType === 1) api.init(node); });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

/* --- breadcrumb.js --- */
/* design behaviour: breadcrumb. A collapsed trail has button.breadcrumb__more[aria-expanded=false] and the hidden levels as li[hidden]
   (see manifest/core/breadcrumb.json). Activating the button reveals them, removes the button and moves focus to the first revealed link.
   Dispatches design:expand on the list. */
designBehaviors.register("breadcrumb", ".breadcrumb", function (list, util) {
  var more = list.querySelector(".breadcrumb__more");
  if (!more) return;
  more.setAttribute("aria-expanded", "false");
  return util.on(more, "click", function () {
    var hidden = Array.prototype.filter.call(list.children, function (li) { return li.hidden; });
    hidden.forEach(function (li) { li.hidden = false; });
    more.setAttribute("aria-expanded", "true");
    var slot = more.closest("li");
    var target = hidden[0] && hidden[0].querySelector("a, button");
    if (slot) slot.hidden = true;
    if (target) target.focus();
    util.emit(list, "expand", { count: hidden.length });
  });
});

/* --- carousel.js --- */
/* design behaviour: carousel. Markup: .carousel > .carousel__controls (.carousel__pause, .carousel__count, .carousel__prev, .carousel__next) + .carousel__track[tabindex=0] > .carousel__slide
   + .carousel__dots > button.carousel__dot (see manifest/core/carousel.json). The track is a native scroll-snap strip; this adds the controls.
   - Prev/next and the dots scroll to a slide; the active dot (aria-current="true"), the counter (data-template="{current} of {total}") and the arrows (aria-disabled at the ends,
     unless data-loop) follow the scroll position, however it changed (finger, wheel, keys, a link inside a slide taking focus). Positions the strip cannot reach hide their dots.
   - data-autoplay="7000" rotates every 7000 ms (and wraps). It never runs under prefers-reduced-motion, and stops while the pointer is over the carousel, while focus is inside it,
     while the tab is hidden or the carousel is off screen. Any manual action (arrow, dot, swipe, wheel, key) stops it for good until the pause button is pressed again.
     The pause button (aria-pressed; data-label-resume holds its label while stopped) comes first in the tab order. aria-live on the track is "off" while rotating, else "polite".
   - data-fits is set when every slide is visible: the controls and dots hide and nothing rotates.
   - Dispatches design:change {index, slide} when the active position changes. */
designBehaviors.register("carousel", ".carousel", function (root, util) {
  var track = root.querySelector(".carousel__track");
  var slides = Array.prototype.slice.call(root.querySelectorAll(".carousel__slide"));
  if (!track || !slides.length) return;
  var dots = Array.prototype.slice.call(root.querySelectorAll(".carousel__dot"));
  var prev = root.querySelector(".carousel__prev");
  var next = root.querySelector(".carousel__next");
  var pause = root.querySelector(".carousel__pause");
  var count = root.querySelector(".carousel__count");
  var template = (count && count.getAttribute("data-template")) || "{current} of {total}";
  var loop = root.hasAttribute("data-loop");
  var delay = util.reducedMotion() ? 0 : parseInt(root.getAttribute("data-autoplay"), 10) || 0;
  var pauseLabel = pause ? pause.getAttribute("aria-label") : "";
  var resumeLabel = pause ? pause.getAttribute("data-label-resume") || pauseLabel : "";
  var pauseIcon = pause && pause.querySelector(".icon");
  var active = -1, last = 0, fits = false;
  var stopped = false, hover = false, inside = false, hidden = document.hidden, onScreen = true, ignoreFocus = false;
  var timer = 0, frame = 0, offs = [];

  var animation = 0;
  function settle() {
    cancelAnimationFrame(animation);
    animation = 0;
    track.style.scrollSnapType = "";
    track.style.scrollBehavior = "";
  }
  /** `--carousel-duration` on the carousel (default --duration-slider, 500 ms), read as ms or s. */
  function slideMs() {
    var value = getComputedStyle(root).getPropertyValue("--carousel-duration").trim(), number = parseFloat(value);
    if (!isFinite(number)) return 500;
    return /ms$/.test(value) ? number : /s$/.test(value) ? number * 1000 : number;
  }
  // The browser's own smooth scroll cannot be given a duration, so a slide change is animated here (eased).
  function scrollToLeft(target) {
    settle();
    var from = track.scrollLeft, distance = target - from;
    if (util.reducedMotion() || Math.abs(distance) < 1) { track.scrollTo({ left: target, behavior: "auto" }); return; }
    var ms = slideMs(), start = performance.now();
    track.style.scrollSnapType = "none";
    track.style.scrollBehavior = "auto";
    function step(now) {
      var t = Math.min(1, (now - start) / ms);
      track.scrollLeft = from + distance * (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      if (t < 1) animation = requestAnimationFrame(step); else settle();
    }
    animation = requestAnimationFrame(step);
  }
  function maxScroll() { return track.scrollWidth - track.clientWidth; }
  /** The last position the strip can reach: the first slide whose start is at or beyond the maximum scroll. */
  function lastPosition() {
    var max = maxScroll();
    for (var i = 0; i < slides.length; i += 1) if (slides[i].offsetLeft >= max - 1) return i;
    return slides.length - 1;
  }
  function currentPosition() {
    var left = track.scrollLeft, best = 0, distance = Infinity;
    for (var i = 0; i <= last; i += 1) {
      var d = Math.abs(slides[i].offsetLeft - left);
      if (d < distance) { distance = d; best = i; }
    }
    return best;
  }
  function go(index, manual) {
    if (loop && manual) index = (index + last + 1) % (last + 1);
    index = Math.max(0, Math.min(last, index));
    if (manual) stop();
    scrollToLeft(slides[index].offsetLeft);
  }
  function setDisabled(button, off) {
    if (!button) return;
    if (off) button.setAttribute("aria-disabled", "true"); else button.removeAttribute("aria-disabled");
  }

  function update() {
    frame = 0;
    fits = maxScroll() <= 1;
    if (fits) root.setAttribute("data-fits", ""); else root.removeAttribute("data-fits");
    last = fits ? 0 : lastPosition();
    var index = fits ? 0 : currentPosition();
    dots.forEach(function (dot, i) { dot.hidden = i > last; if (i === index) dot.setAttribute("aria-current", "true"); else dot.removeAttribute("aria-current"); });
    if (count) count.textContent = template.replace("{current}", index + 1).replace("{total}", last + 1);
    setDisabled(prev, !loop && index <= 0);
    setDisabled(next, !loop && index >= last);
    if (index !== active) {
      var first = active < 0;
      active = index;
      if (!first) util.emit(root, "change", { index: index, slide: slides[index] });
    }
    sync();
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }

  function stop() {
    if (!delay || stopped) return;
    stopped = true;
    sync();
  }
  function playing() { return delay > 0 && !fits && !stopped && !hover && !(inside && !ignoreFocus) && !hidden && onScreen; }
  function advance() {
    timer = 0;
    if (!playing()) return;
    var target = active >= last ? 0 : active + 1;
    scrollToLeft(slides[target].offsetLeft);
    sync(true);
  }
  /** Bring timer, data-playing, the pause button and the live region in line with the current state. `restart` keeps a running timer's fill in step with a slide change. */
  function sync(restart) {
    var run = playing();
    if (!run || restart) { clearTimeout(timer); timer = 0; }
    if (run && !timer) {
      root.style.setProperty("--carousel-delay", delay + "ms");
      timer = setTimeout(advance, delay);
    }
    if (run) root.setAttribute("data-playing", ""); else root.removeAttribute("data-playing");
    track.setAttribute("aria-live", run ? "off" : "polite");
    if (pause) {
      pause.setAttribute("aria-pressed", stopped ? "true" : "false");
      pause.setAttribute("aria-label", stopped ? resumeLabel : pauseLabel);
      if (pauseIcon) { pauseIcon.classList.toggle("icon--pause", !stopped); pauseIcon.classList.toggle("icon--play", stopped); }
    }
  }

  if (prev) offs.push(util.on(prev, "click", function () { if (prev.getAttribute("aria-disabled") !== "true") go(active - 1, true); }));
  if (next) offs.push(util.on(next, "click", function () { if (next.getAttribute("aria-disabled") !== "true") go(active + 1, true); }));
  dots.forEach(function (dot, i) { offs.push(util.on(dot, "click", function () { go(i, true); })); });
  if (pause) offs.push(util.on(pause, "click", function () {
    stopped = !stopped;
    ignoreFocus = !stopped;
    if (!stopped) { clearTimeout(timer); timer = 0; }
    sync();
  }));
  // A manual gesture on the strip stops autoplay for good; scroll events alone (our own smooth scroll) do not.
  ["pointerdown", "wheel", "touchstart", "keydown"].forEach(function (type) {
    offs.push(util.on(track, type, function (event) { if (type !== "keydown") settle(); if (type !== "keydown" || event.key.indexOf("Arrow") === 0 || event.key === "Home" || event.key === "End") stop(); }, { passive: true }));
  });
  offs.push(util.on(track, "scroll", schedule, { passive: true }));
  offs.push(util.on(root, "pointerenter", function (event) { if (event.pointerType === "mouse") { hover = true; sync(); } }));
  offs.push(util.on(root, "pointerleave", function () { hover = false; sync(); }));
  offs.push(util.on(root, "focusin", function () { inside = true; sync(); }));
  offs.push(util.on(root, "focusout", function (event) {
    if (root.contains(event.relatedTarget)) return;
    inside = false; ignoreFocus = false; sync();
  }));
  offs.push(util.on(document, "visibilitychange", function () { hidden = document.hidden; sync(); }));
  if (window.ResizeObserver) {
    var resize = new ResizeObserver(schedule);
    resize.observe(track);
    offs.push(function () { resize.disconnect(); });
  }
  if (window.IntersectionObserver && delay) {
    var seen = new IntersectionObserver(function (entries) { onScreen = entries[entries.length - 1].isIntersecting; sync(); });
    seen.observe(root);
    offs.push(function () { seen.disconnect(); });
  }
  update();
  return function () { clearTimeout(timer); if (frame) cancelAnimationFrame(frame); offs.forEach(function (off) { off(); }); };
});

/* --- chat-composer.js --- */
/* chat-composer: the message field grows with its text (up to its CSS max height), Enter sends, Shift+Enter inserts a line break
   (Enter is ignored while an IME is composing), and the send button is disabled while the field is empty.
   While the composer has data-state="busy" the send button is the stop button: it stays enabled and Enter does not send.
   Markup: form.chat-composer > (textarea.chat-composer__field, button.chat-composer__send). Sending = a normal form submit; the page listens to "submit". */
designBehaviors.register("chat-composer", ".chat-composer", function (el, util) {
  var field = el.querySelector(".chat-composer__field");
  var send = el.querySelector(".chat-composer__send");
  if (!field) return;
  var busy = function () { return el.getAttribute("data-state") === "busy"; };

  function resize() {
    field.style.blockSize = "auto";
    var cs = getComputedStyle(field);
    var extra = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    field.style.blockSize = (field.scrollHeight + extra) + "px";
  }
  function sync() {
    resize();
    if (send) send.disabled = !busy() && !field.value.trim();
  }
  function submit() {
    if (typeof el.requestSubmit === "function" && el.tagName === "FORM") el.requestSubmit();
    else if (send) send.click();
  }

  var offs = [
    util.on(field, "input", sync),
    util.on(field, "keydown", function (event) {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing || event.altKey) return;
      event.preventDefault();
      if (busy() || !field.value.trim()) return;
      submit();
    }),
    util.on(el, "reset", function () { setTimeout(sync, 0); })
  ];
  // The app changes data-state (idle <-> busy) and clears the field after sending; follow both.
  var observer = new MutationObserver(sync);
  observer.observe(el, { attributes: true, attributeFilter: ["data-state"] });
  sync();
  return function () { observer.disconnect(); offs.forEach(function (off) { off(); }); field.style.blockSize = ""; };
});

/* --- chat-thread.js --- */
/* chat-thread: keeps the newest message in view while the user is at the bottom; once they scroll up it leaves them alone and shows
   the "new messages" pill (.chat-thread__pill[hidden]). Clicking the pill jumps to the newest message.
   Markup: .chat-thread > (.chat-thread__scroll[role=log], .chat-thread__pill[hidden]). Emits design:scroll-latest when the pill is used. */
designBehaviors.register("chat-thread", ".chat-thread", function (el, util) {
  var scroller = el.querySelector(".chat-thread__scroll");
  var pill = el.querySelector(".chat-thread__pill");
  if (!scroller) return;
  var THRESHOLD = 48; // how close to the end still counts as "at the bottom"
  var stuck = true;

  function atBottom() { return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= THRESHOLD; }
  function toBottom() { scroller.scrollTop = scroller.scrollHeight; }
  function showPill(show) { if (pill) pill.hidden = !show; }

  function onScroll() { stuck = atBottom(); if (stuck) showPill(false); }
  function onChange() { if (stuck) toBottom(); else showPill(true); }

  var offs = [util.on(scroller, "scroll", onScroll, { passive: true }), util.on(scroller, "load", onChange, true)];
  if (pill) offs.push(util.on(pill, "click", function () { stuck = true; toBottom(); showPill(false); scroller.focus({ preventScroll: true }); util.emit(el, "scroll-latest"); }));

  var observer = new MutationObserver(onChange);
  observer.observe(scroller, { childList: true, subtree: true, characterData: true });
  toBottom();
  showPill(false);
  return function () { observer.disconnect(); offs.forEach(function (off) { off(); }); };
});

/* --- combobox.js --- */
/* combobox: ARIA 1.2 editable combobox with list autocomplete (WAI-ARIA APG). Opt in with data-combobox on .combobox.
     <div class="combobox" data-combobox [data-multiple] [data-async] [data-name="country"] [data-chips="#chips"]>
       <input class="input combobox__input" role="combobox" aria-expanded="false" aria-controls="lb" aria-autocomplete="list" autocomplete="off">
       <div class="combobox__list" id="lb" role="listbox" hidden> <div class="combobox__option" role="option" data-value="de">Germany</div> ... </div>
     </div>
   Keys: ArrowDown/ArrowUp (open, move), Home/End (first/last option while one is highlighted), Enter (choose), Escape (close, then clear), Tab (closes; chooses a highlighted option in single mode), typing filters.
   Events (bubble from .combobox): design:select {value, values, label}, design:query {query} (data-async: answer with el.designCombobox.setOptions(items)).
   API on the element: el.designCombobox = { setOptions([{value,label,group?,disabled?}]), setLoading(bool), getValues(), setValues([..]) }.
   Texts (translate with attributes): data-text-results="{n} results available", data-text-none="No results", data-text-loading="Loading...", data-text-selected="{label} selected", data-text-removed="{label} removed", data-text-remove="Remove {label}". */
(function () {
  if (!window.designBehaviors) return;
  var norm = function (s) { return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
  var fill = function (text, label, n) { return String(text).replace("{label}", label == null ? "" : label).replace("{n}", n == null ? "" : n); };

  window.designBehaviors.register("combobox", "[data-combobox]", function (root, util) {
    var input = root.querySelector(".combobox__input");
    var list = root.querySelector(".combobox__list");
    if (!input || !list) return;
    var multiple = root.hasAttribute("data-multiple");
    var isAsync = root.hasAttribute("data-async");
    var text = function (key, fallback) { return root.getAttribute("data-text-" + key) || fallback; };
    var cleanups = [];
    var active = null, dirty = false, navigated = false, loading = false, selected = [];
    var labels = {}; // value -> label, kept so chips survive options being replaced

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", util.ensureId(list, "combobox-list"));
    list.setAttribute("role", "listbox");
    if (multiple) list.setAttribute("aria-multiselectable", "true");
    if (!list.hasAttribute("aria-label") && !list.hasAttribute("aria-labelledby") && input.labels && input.labels[0]) list.setAttribute("aria-labelledby", util.ensureId(input.labels[0], "combobox-label"));
    list.hidden = true;

    var empty = root.querySelector(".combobox__empty");
    if (!empty) { empty = document.createElement("div"); empty.className = "combobox__empty"; list.after(empty); }
    empty.hidden = true;
    var status = document.createElement("div");
    status.className = "sr-only"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    root.appendChild(status);
    var statusTimer = 0;
    function announce(message, delay) {
      clearTimeout(statusTimer);
      statusTimer = setTimeout(function () { status.textContent = ""; status.textContent = message; }, delay == null ? 250 : delay);
    }

    var chipsHost = null;
    var chipsSelector = root.getAttribute("data-chips");
    if (chipsSelector) chipsHost = document.querySelector(chipsSelector);
    else if (root.nextElementSibling && root.nextElementSibling.classList.contains("combobox__chips")) chipsHost = root.nextElementSibling;

    function options() { return Array.prototype.slice.call(list.querySelectorAll('[role="option"]')); }
    function valueOf(option) { return option.hasAttribute("data-value") ? option.getAttribute("data-value") : option.textContent.trim(); }
    function labelOf(option) { return option.getAttribute("data-label") || option.textContent.trim(); }
    function shown() { return options().filter(function (o) { return !o.hidden; }); }
    function enabled() { return shown().filter(function (o) { return o.getAttribute("aria-disabled") !== "true"; }); }
    function isOpen() { return input.getAttribute("aria-expanded") === "true"; }

    function setActive(option) {
      if (active) active.removeAttribute("data-active");
      active = option || null;
      if (active) {
        active.setAttribute("data-active", "");
        input.setAttribute("aria-activedescendant", util.ensureId(active, "combobox-option"));
        active.scrollIntoView({ block: "nearest" });
      } else input.removeAttribute("aria-activedescendant");
    }

    function refreshMessages() {
      var count = shown().length;
      var show = isOpen();
      if (loading) { empty.textContent = text("loading", "Loading..."); empty.setAttribute("data-loading", ""); }
      else { empty.removeAttribute("data-loading"); empty.textContent = text("none", "No results"); }
      list.hidden = !show || loading || count === 0;
      empty.hidden = !show || (!loading && count > 0);
      list.setAttribute("aria-busy", loading ? "true" : "false");
    }

    function setOpen(open) {
      input.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) { setActive(null); navigated = false; }
      refreshMessages();
    }

    function filter() {
      var query = dirty && !isAsync ? norm(input.value.trim()) : "";
      options().forEach(function (o) { o.hidden = query !== "" && norm(labelOf(o)).indexOf(query) === -1; });
      Array.prototype.forEach.call(list.querySelectorAll('[role="group"]'), function (g) { g.hidden = !g.querySelector('[role="option"]:not([hidden])'); });
      if (active && active.hidden) setActive(null);
      refreshMessages();
      if (isOpen() && !loading) announce(shown().length === 0 ? text("none", "No results") : fill(text("results", "{n} results available"), "", shown().length));
    }

    function syncSelection() {
      options().forEach(function (o) { o.setAttribute("aria-selected", selected.indexOf(valueOf(o)) > -1 ? "true" : "false"); labels[valueOf(o)] = labelOf(o); });
      root.setAttribute("data-value", selected.join(","));
      var name = root.getAttribute("data-name");
      if (name) {
        Array.prototype.forEach.call(root.querySelectorAll("input[data-combobox-value]"), function (h) { h.remove(); });
        (selected.length ? selected : [""]).forEach(function (v) {
          var h = document.createElement("input"); h.type = "hidden"; h.name = name; h.value = v; h.setAttribute("data-combobox-value", ""); root.appendChild(h);
        });
      }
      if (chipsHost) {
        chipsHost.textContent = "";
        selected.forEach(function (v) {
          var label = labels[v] || v;
          var chip = document.createElement("span"); chip.className = "badge badge--accent"; chip.setAttribute("data-value", v);
          chip.appendChild(document.createTextNode(label));
          var remove = document.createElement("button"); remove.type = "button"; remove.className = "badge__remove";
          remove.setAttribute("aria-label", fill(text("remove", "Remove {label}"), label));
          var icon = document.createElement("span"); icon.className = "icon icon--x"; icon.setAttribute("aria-hidden", "true");
          remove.appendChild(icon); chip.appendChild(remove); chipsHost.appendChild(chip);
        });
      }
    }

    function setValues(values, quiet) {
      selected = values.slice(0, multiple ? values.length : 1);
      syncSelection();
      if (!multiple) input.value = selected.length ? (labels[selected[0]] || selected[0]) : "";
      if (!quiet) util.emit(root, "select", { value: selected[0] == null ? "" : selected[0], values: selected.slice(), label: selected.length ? labels[selected[selected.length - 1]] : "" });
    }

    function choose(option) {
      if (!option || option.getAttribute("aria-disabled") === "true") return;
      var value = valueOf(option), label = labelOf(option);
      labels[value] = label;
      if (multiple) {
        var at = selected.indexOf(value);
        if (at > -1) selected.splice(at, 1); else selected.push(value);
        setValues(selected);
        input.value = ""; dirty = false;
        filter();
        announce(fill(at > -1 ? text("removed", "{label} removed") : text("selected", "{label} selected"), label), 100);
      } else {
        setValues([value]);
        dirty = false;
        setOpen(false);
        filter();
        announce(fill(text("selected", "{label} selected"), label), 100);
      }
    }

    function move(delta, to) {
      var items = enabled();
      if (!items.length) return;
      var at = items.indexOf(active), next;
      if (to === "first") next = 0; else if (to === "last") next = items.length - 1;
      else if (at < 0) next = delta > 0 ? 0 : items.length - 1;
      else next = (at + delta + items.length) % items.length;
      navigated = true;
      setActive(items[next]);
    }

    function open() { if (!isOpen()) { setOpen(true); filter(); } }

    cleanups.push(util.on(input, "input", function () {
      dirty = true; open(); filter();
      if (isAsync) {
        loading = true; refreshMessages();
        clearTimeout(root.__queryTimer);
        root.__queryTimer = setTimeout(function () { util.emit(root, "query", { query: input.value }); }, Number(root.getAttribute("data-debounce")) || 150);
      }
    }));
    cleanups.push(util.on(input, "click", open));
    cleanups.push(util.on(input, "keydown", function (event) {
      if (event.isComposing || event.ctrlKey || event.metaKey) return;
      var k = event.key;
      if (k === "ArrowDown") {
        event.preventDefault();
        if (!isOpen()) { open(); if (!event.altKey) { var chosen = enabled().filter(function (o) { return o.getAttribute("aria-selected") === "true"; })[0]; if (chosen) { navigated = true; setActive(chosen); } else move(1, "first"); } }
        else if (!event.altKey) move(1);
      } else if (k === "ArrowUp") {
        event.preventDefault();
        if (!isOpen()) { open(); if (!event.altKey) move(-1, "last"); } else move(-1);
      } else if ((k === "Home" || k === "End") && isOpen() && active) {
        event.preventDefault(); move(0, k === "Home" ? "first" : "last");
      } else if (k === "Enter") {
        if (isOpen() && active) { event.preventDefault(); choose(active); }
      } else if (k === "Escape") {
        if (isOpen()) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        else if (input.value) { event.preventDefault(); event.stopPropagation(); input.value = ""; dirty = false; if (!multiple) setValues([]); }
      } else if (k === "Tab") {
        if (isOpen() && active && navigated && !multiple) choose(active);
        else if (isOpen()) setOpen(false);
      }
    }));
    cleanups.push(util.on(root, "focusout", function (event) {
      if (event.relatedTarget && root.contains(event.relatedTarget)) return;
      setOpen(false);
      if (!multiple) input.value = selected.length ? (labels[selected[0]] || selected[0]) : "";
      else input.value = "";
      dirty = false; filter();
    }));
    cleanups.push(util.on(list, "mousedown", function (event) { event.preventDefault(); }));
    cleanups.push(util.on(list, "click", function (event) { var o = event.target.closest('[role="option"]'); if (o) choose(o); }));
    cleanups.push(util.on(list, "mouseover", function (event) { var o = event.target.closest('[role="option"]'); if (o && o !== active && o.getAttribute("aria-disabled") !== "true") setActive(o); }));
    if (chipsHost) cleanups.push(util.on(chipsHost, "click", function (event) {
      var button = event.target.closest(".badge__remove"); if (!button) return;
      var chip = button.closest("[data-value]"), value = chip.getAttribute("data-value");
      selected = selected.filter(function (v) { return v !== value; });
      setValues(selected);
      announce(fill(text("removed", "{label} removed"), labels[value] || value), 100);
      input.focus();
    }));

    // Initial state from aria-selected in the markup.
    options().forEach(function (o) { labels[valueOf(o)] = labelOf(o); if (o.getAttribute("aria-selected") === "true") selected.push(valueOf(o)); });
    if (!multiple && selected.length > 1) selected = selected.slice(0, 1);
    var initial = selected.slice();
    setValues(initial, true);

    root.designCombobox = {
      setOptions: function (items) {
        loading = false;
        list.textContent = "";
        var groups = {};
        items.forEach(function (item) {
          var host = list;
          if (item.group) {
            host = groups[item.group];
            if (!host) { host = groups[item.group] = document.createElement("div"); host.className = "combobox__group"; host.setAttribute("role", "group"); host.setAttribute("aria-label", item.group); host.setAttribute("data-label", item.group); list.appendChild(host); }
          }
          var o = document.createElement("div"); o.className = "combobox__option"; o.setAttribute("role", "option"); o.setAttribute("data-value", item.value); o.textContent = item.label == null ? item.value : item.label;
          if (item.disabled) o.setAttribute("aria-disabled", "true");
          host.appendChild(o);
        });
        setActive(null);
        syncSelection();
        filter();
      },
      setLoading: function (value) { loading = Boolean(value); refreshMessages(); },
      getValues: function () { return selected.slice(); },
      setValues: function (values) { setValues(values); }
    };

    return function () { cleanups.forEach(function (c) { c(); }); clearTimeout(statusTimer); clearTimeout(root.__queryTimer); status.remove(); delete root.designCombobox; };
  });
})();

/* --- command.js --- */
/* command: command palette on <dialog class="command"> (ARIA combobox + listbox, focus stays in the input, aria-activedescendant marks the active option).
     <dialog class="command" aria-label="Command palette" data-command-hotkey>
       <input class="command__input" placeholder="Type a command" aria-label="Command">
       <div class="command__list" role="listbox" aria-label="Commands">
         <div class="command__group" role="group" aria-labelledby="g1"><div class="command__heading" id="g1" role="presentation">Go to</div>
           <a class="command__item" role="option" href="/projects" data-keywords="home start">...</a> ... </div>
       </div>
       <div class="command__empty" hidden>No results</div>
     </dialog>
   - data-command-hotkey: Ctrl+K / Cmd+K toggles the palette from anywhere (not while typing in another field unless the key combination is used).
   - Typing filters items by label and data-keywords (case and accent insensitive); empty groups hide; the first match becomes active.
   - ArrowUp/ArrowDown/Home/End move the active option, Enter runs it, Escape closes (native), click runs the item under the pointer.
   - Running an item: an <a href> is followed; every run emits design:select on the dialog with detail { value, item }, value = data-value or the label. The dialog then closes.
   - The number of results is announced through a polite status region ("3 results"). Items with aria-disabled=true are skipped. */
(function () {
  function fold(text) { return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  var palettes = [];
  if (!window.__designCommandHotkey) {
    window.__designCommandHotkey = true;
    document.addEventListener("keydown", function (event) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "k") return;
      var palette = palettes.filter(function (p) { return p.hasAttribute("data-command-hotkey"); })[0];
      if (!palette) return;
      event.preventDefault();
      if (palette.open) palette.close(); else if (!document.querySelector("dialog:modal")) palette.showModal();
    });
  }

  window.designBehaviors.register("command", "dialog.command", function (dialog, util) {
    palettes.push(dialog);
    var input = dialog.querySelector(".command__input");
    var list = dialog.querySelector(".command__list");
    if (!input || !list) return;
    var empty = dialog.querySelector(".command__empty");
    var items = Array.prototype.slice.call(dialog.querySelectorAll(".command__item"));
    var offs = [];
    var active = -1;

    util.ensureId(list, "command-list");
    list.setAttribute("role", "listbox");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    items.forEach(function (item) { item.setAttribute("role", "option"); util.ensureId(item, "command-item"); item.setAttribute("aria-selected", "false"); item.__label = fold(item.textContent + " " + (item.getAttribute("data-keywords") || "")); });
    Array.prototype.forEach.call(dialog.querySelectorAll(".command__group"), function (group) { group.setAttribute("role", "group"); });

    var status = document.createElement("div");
    status.className = "sr-only";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    dialog.appendChild(status);

    function visibleItems() { return items.filter(function (item) { return !item.hidden && item.getAttribute("aria-disabled") !== "true"; }); }

    function setActive(item) {
      items.forEach(function (other) { other.setAttribute("aria-selected", other === item ? "true" : "false"); });
      if (item) { input.setAttribute("aria-activedescendant", item.id); item.scrollIntoView({ block: "nearest" }); }
      else input.removeAttribute("aria-activedescendant");
    }

    function filter() {
      var terms = fold(input.value).split(/\s+/).filter(Boolean);
      var shown = 0;
      items.forEach(function (item) {
        var match = terms.every(function (term) { return item.__label.indexOf(term) >= 0; });
        item.hidden = !match;
        if (match) shown += 1;
      });
      Array.prototype.forEach.call(dialog.querySelectorAll(".command__group"), function (group) {
        group.hidden = !group.querySelector(".command__item:not([hidden])");
      });
      if (empty) empty.hidden = shown > 0;
      list.hidden = shown === 0; /* an option-less listbox is invalid ARIA: hide it while nothing matches */
      input.setAttribute("aria-expanded", shown === 0 ? "false" : "true");
      var first = visibleItems()[0];
      setActive(first || null);
      status.textContent = shown === 0 ? (empty ? empty.textContent.trim() : "No results") : shown + (shown === 1 ? " result" : " results");
    }

    function run(item) {
      if (!item || item.getAttribute("aria-disabled") === "true") return;
      var value = item.getAttribute("data-value") || (item.querySelector(".command__label") || item).textContent.trim();
      util.emit(dialog, "select", { value: value, item: item });
      dialog.close();
      var href = item.getAttribute("href");
      if (href) {
        if (item.target === "_blank") window.open(href, "_blank", "noopener"); else window.location.assign(href);
      }
    }

    offs.push(util.on(input, "input", filter));
    offs.push(util.on(input, "keydown", function (event) {
      var shown = visibleItems();
      var at = shown.indexOf(items.filter(function (i) { return i.getAttribute("aria-selected") === "true"; })[0]);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!shown.length) return;
        var next = event.key === "ArrowDown" ? (at + 1) % shown.length : (at <= 0 ? shown.length - 1 : at - 1);
        setActive(shown[next]);
      } else if (event.key === "Home" && event.ctrlKey) { event.preventDefault(); setActive(shown[0] || null); }
      else if (event.key === "End" && event.ctrlKey) { event.preventDefault(); setActive(shown[shown.length - 1] || null); }
      else if (event.key === "PageDown" || event.key === "PageUp") { event.preventDefault(); setActive(shown[event.key === "PageDown" ? shown.length - 1 : 0] || null); }
      else if (event.key === "Enter") { event.preventDefault(); if (at >= 0) run(shown[at]); }
    }));
    offs.push(util.on(list, "click", function (event) {
      var item = event.target.closest(".command__item");
      if (!item || !list.contains(item)) return;
      event.preventDefault();
      run(item);
    }));
    offs.push(util.on(list, "pointermove", function (event) {
      var item = event.target.closest(".command__item");
      if (item && item.getAttribute("aria-selected") !== "true" && item.getAttribute("aria-disabled") !== "true") setActive(item);
    }));

    /* Every time the palette opens it starts clean, with the cursor in the input. */
    function reset() { input.value = ""; filter(); input.focus(); }
    var observer = new MutationObserver(function () { if (dialog.open) reset(); });
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    offs.push(function () { observer.disconnect(); });
    filter();
    return function () { palettes.splice(palettes.indexOf(dialog), 1); if (status.parentNode) status.parentNode.removeChild(status); offs.forEach(function (off) { off(); }); };
  });
})();

/* --- copy.js --- */
/* design behaviour: copy button. <button data-copy> copies the text of its code block (the closest .code-block) or of the element named by data-copy-target="#id".
   Announces "Copied" through a polite live region, swaps a copy icon for a check for 2s, falls back to document.execCommand and then to selecting the text.
   data-copy="value" copies exactly that value (an id next to a .truncate-mid); on failure it says "Could not copy" and selects the value shown beside the button.
   Attributes: data-copy-target, data-failed-label (default "Could not copy"), data-copied-label (default "Copied"), data-select-label (default "Selected. Press Ctrl+C to copy."). Emits design:copy {text, method}. */
(function () {
  if (!window.designBehaviors) return;

  function sourceOf(button) {
    var target = button.getAttribute("data-copy-target");
    if (!target && button.getAttribute("data-copy")) {
      var prev = button.previousElementSibling;
      return prev && prev.matches(".truncate-mid") ? prev : null;
    }
    if (target) return document.querySelector(target);
    var block = button.closest(".code-block");
    return block ? block.querySelector(".code-block__body") : button.parentElement;
  }

  /** The text to copy: one line per .code-block__line when present, otherwise the element's text. */
  function textOf(node) {
    if (!node) return "";
    if ("value" in node && typeof node.value === "string") return node.value;
    var lines = node.querySelectorAll(".code-block__line");
    var text = lines.length ? Array.prototype.map.call(lines, function (line) { return line.textContent.replace(/\n$/, ""); }).join("\n") : node.textContent || "";
    return text.replace(/\n$/, "");
  }

  function selectNode(node) {
    var selection = window.getSelection();
    if (!selection) return false;
    var range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function legacyCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    area.className = "sr-only";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    area.remove();
    return ok;
  }

  designBehaviors.register("copy", "[data-copy]", function (button, util) {
    var live = document.createElement("span");
    live.className = "sr-only";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    button.insertAdjacentElement("afterend", live);
    var icon = button.querySelector(".icon--copy");
    var timer = 0;

    function announce(message, failed) {
      live.textContent = "";
      window.setTimeout(function () { live.textContent = message; }, 20);
      window.clearTimeout(timer);
      if (icon && !failed) { icon.classList.remove("icon--copy"); icon.classList.add("icon--check"); }
      if (!failed) button.setAttribute("data-copied", "true");
      timer = window.setTimeout(function () {
        if (icon) { icon.classList.remove("icon--check"); icon.classList.add("icon--copy"); }
        button.removeAttribute("data-copied");
        live.textContent = "";
      }, 2000);
    }

    function done(text, method) {
      announce(button.getAttribute("data-copied-label") || "Copied");
      util.emit(button, "copy", { text: text, method: method });
    }

    function run() {
      var node = sourceOf(button);
      var value = button.getAttribute("data-copy");
      var text = value ? value : textOf(node);
      var viaApi = navigator.clipboard && navigator.clipboard.writeText;
      var fallback = function () {
        if (legacyCopy(text)) { done(text, "execCommand"); return; }
        if (node && node.nodeType === 1 && selectNode(node)) {
          announce(button.getAttribute("data-select-label") || "Selected. Press Ctrl+C to copy.");
          util.emit(button, "copy", { text: text, method: "selection" });
        } else if (value) {
          announce(button.getAttribute("data-failed-label") || "Could not copy", true);
          util.emit(button, "copy", { text: text, method: "failed" });
        }
      };
      if (viaApi) navigator.clipboard.writeText(text).then(function () { done(text, "clipboard"); }, fallback);
      else fallback();
    }

    var off = util.on(button, "click", run);
    return function () { off(); window.clearTimeout(timer); live.remove(); };
  });
})();

/* --- dialog.js --- */
/* dialog: shared behaviour for every native <dialog> the system styles (.modal, .drawer, .command).
   Markup only, no script of your own:
     <button data-dialog-open="confirm-delete">Delete</button>
     <dialog id="confirm-delete" class="modal modal--sm" aria-labelledby="confirm-delete-title"> ... <button data-dialog-close>Cancel</button> ... </dialog>
   - [data-dialog-open="<id>"] opens the dialog as a modal (focus moves in, the page behind is inert, Escape closes, focus returns to the trigger: all native).
   - [data-dialog-close] closes the nearest dialog; its value (data-dialog-close="confirmed") becomes dialog.returnValue.
   - Light dismiss: a click on the backdrop closes the dialog. Opt out with data-dialog-static (forms with unsaved input, must-answer questions).
   - Events from the dialog: design:open and design:close (detail.returnValue).
   - Warns in the console when a dialog has no accessible name (aria-labelledby or aria-label). */
(function () {
  var SELECTOR = "dialog.modal, dialog.drawer, dialog.command";

  function describe(dialog) {
    var labelled = dialog.getAttribute("aria-labelledby");
    if (labelled && document.getElementById(labelled)) return true;
    return !!dialog.getAttribute("aria-label");
  }

  function open(dialog, trigger) {
    if (!dialog || dialog.tagName !== "DIALOG" || dialog.open) return;
    if (trigger) dialog.__designTrigger = trigger;
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  }

  /* One document-level listener serves every trigger, including ones added later. */
  if (!window.__designDialogTriggers) {
    window.__designDialogTriggers = true;
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var opener = target.closest("[data-dialog-open]");
      if (opener) {
        var dialog = document.getElementById(opener.getAttribute("data-dialog-open"));
        if (dialog) { event.preventDefault(); open(dialog, opener); }
        return;
      }
      var closer = target.closest("[data-dialog-close]");
      if (closer) {
        var host = closer.closest("dialog");
        if (host) {
          event.preventDefault();
          var value = closer.getAttribute("data-dialog-close");
          if (typeof host.close === "function") host.close(value || undefined); else host.removeAttribute("open");
        }
      }
    });
  }

  window.designBehaviors.register("dialog", SELECTOR, function (dialog, util) {
    if (!describe(dialog) && window.console) console.warn("[design] <dialog class=\"" + dialog.className + "\"> needs aria-labelledby (or aria-label) so its name is announced.", dialog);

    var offs = [];
    var wasOpen = dialog.open;
    function opened() {
      if (wasOpen) return;
      wasOpen = true;
      util.emit(dialog, "open", { trigger: dialog.__designTrigger || null });
    }
    function closed() {
      if (!wasOpen) return;
      wasOpen = false;
      util.emit(dialog, "close", { returnValue: dialog.returnValue || "" });
      var trigger = dialog.__designTrigger;
      dialog.__designTrigger = null;
      /* Native focus restore covers showModal(); this catches triggers that were removed or re-rendered. */
      if (trigger && trigger.isConnected && document.activeElement === document.body && trigger.focus) trigger.focus();
    }
    var observer = new MutationObserver(function () { if (dialog.open) opened(); else closed(); });
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    offs.push(function () { observer.disconnect(); });
    if (wasOpen) { wasOpen = false; opened(); }
    offs.push(util.on(dialog, "close", closed));

    /* Light dismiss. closedby="any" does this natively in new browsers; the script covers the rest and honours data-dialog-static. */
    var downOnBackdrop = false;
    function onBackdrop(event) {
      var r = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom);
    }
    offs.push(util.on(dialog, "pointerdown", function (event) { downOnBackdrop = onBackdrop(event); }));
    offs.push(util.on(dialog, "click", function (event) {
      if (dialog.hasAttribute("data-dialog-static") || !dialog.matches(":modal")) { downOnBackdrop = false; return; }
      if (downOnBackdrop && onBackdrop(event)) dialog.close();
      downOnBackdrop = false;
    }));
    return function () { offs.forEach(function (off) { off(); }); };
  });
})();

/* --- dropzone.js --- */
/* dropzone: drag-and-drop plus native click / keyboard file picking. Opt in with data-dropzone on .dropzone.
     <div class="dropzone" data-dropzone [data-list="#files"] [data-max-size="5242880"] [data-max-files="5"]>
       <input class="dropzone__input" type="file" id="f" accept="image/*,.pdf" multiple aria-describedby="f-hint">
       <label class="dropzone__label" for="f"><span class="icon icon--upload" aria-hidden="true"></span>Choose files or drop them here</label>
       <span class="field__hint" id="f-hint">PNG, JPG or PDF, up to 5 MB each.</span>
     </div>
     <ul class="file-list" id="files" role="list"></ul>
   The real file input covers the area, so click, Enter/Space and the OS file dialog are native. Dropped and chosen files are checked against accept, data-max-size (bytes)
   and data-max-files; the accepted ones are listed (name, size, remove button) and kept in input.files so a normal form submit works.
   Rejected files: aria-invalid on the dropzone and the input, and design:invalid {files: [{name, reason: "type"|"size"|"count"}]}. Accepted: design:files {files}.
   API: el.designDropzone = { getFiles, clear, setBusy(bool), setStatus(file, {text, state: "busy"|"done"|"error", value}) } (value 0-100 shows a progress bar).
   Texts: data-text-remove="Remove {label}", data-text-added="{n} files added", data-text-removed="{label} removed", data-text-rejected="{n} files were not added". */
(function () {
  if (!window.designBehaviors) return;
  var fill = function (text, label, n) { return String(text).replace("{label}", label == null ? "" : label).replace("{n}", n == null ? "" : n); };
  var sizeText = function (bytes) { return bytes < 1024 ? bytes + " B" : bytes < 1048576 ? Math.round(bytes / 102.4) / 10 + " KB" : Math.round(bytes / 104857.6) / 10 + " MB"; };
  var same = function (a, b) { return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified; };

  window.designBehaviors.register("dropzone", "[data-dropzone]", function (root, util) {
    var input = root.querySelector(".dropzone__input");
    if (!input) return;
    var host = root.getAttribute("data-list") ? document.querySelector(root.getAttribute("data-list")) : (root.nextElementSibling && root.nextElementSibling.classList.contains("file-list") ? root.nextElementSibling : null);
    var files = [];
    var items = [];
    var cleanups = [];
    var text = function (key, fallback) { return root.getAttribute("data-text-" + key) || fallback; };
    var maxSize = Number(root.getAttribute("data-max-size")) || 0;
    var maxFiles = Number(root.getAttribute("data-max-files")) || (input.multiple ? 0 : 1);
    var status = document.createElement("div");
    status.className = "sr-only"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    root.appendChild(status);
    var statusTimer = 0;
    var announce = function (message) { clearTimeout(statusTimer); statusTimer = setTimeout(function () { status.textContent = ""; status.textContent = message; }, 60); };

    var accepts = (input.getAttribute("accept") || "").split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    function typeOk(file) {
      if (!accepts.length) return true;
      var name = file.name.toLowerCase(), type = (file.type || "").toLowerCase();
      return accepts.some(function (a) {
        if (a.charAt(0) === ".") return name.slice(-a.length) === a;
        if (a.slice(-2) === "/*") return type.indexOf(a.slice(0, -1)) === 0;
        return type === a;
      });
    }

    function sync() {
      try { var dt = new DataTransfer(); files.forEach(function (f) { dt.items.add(f); }); input.files = dt.files; } catch (e) { /* older browsers keep their own list */ }
    }

    function render() {
      if (!host) return;
      host.textContent = "";
      host.hidden = files.length === 0;
      items = files.map(function (file) {
        var li = document.createElement("li"); li.className = "file-list__item";
        var icon = document.createElement("span"); icon.className = "icon icon--file"; icon.setAttribute("aria-hidden", "true");
        var name = document.createElement("span"); name.className = "file-list__name"; name.textContent = file.name;
        var st = document.createElement("span"); st.className = "file-list__status"; st.textContent = sizeText(file.size);
        var remove = document.createElement("button"); remove.type = "button"; remove.className = "btn btn--ghost btn--icon btn--sm";
        remove.setAttribute("aria-label", fill(text("remove", "Remove {label}"), file.name));
        var x = document.createElement("span"); x.className = "icon icon--x"; x.setAttribute("aria-hidden", "true"); remove.appendChild(x);
        remove.addEventListener("click", function () { removeFile(file); });
        li.appendChild(icon); li.appendChild(name); li.appendChild(st); li.appendChild(remove);
        host.appendChild(li);
        return { file: file, li: li, status: st, bar: null };
      });
    }

    function removeFile(file) {
      var at = files.indexOf(file); if (at < 0) return;
      files.splice(at, 1); sync(); render();
      var buttons = host ? host.querySelectorAll("button") : [];
      if (buttons.length) buttons[Math.min(at, buttons.length - 1)].focus(); else input.focus();
      root.removeAttribute("aria-invalid"); input.removeAttribute("aria-invalid");
      util.emit(root, "files", { files: files.slice() });
      announce(fill(text("removed", "{label} removed"), file.name));
    }

    function addFiles(incoming) {
      var rejected = [], accepted = [];
      incoming.forEach(function (file) {
        if (files.concat(accepted).some(function (f) { return same(f, file); })) return;
        if (!typeOk(file)) rejected.push({ name: file.name, reason: "type" });
        else if (maxSize && file.size > maxSize) rejected.push({ name: file.name, reason: "size" });
        else if (maxFiles && files.length + accepted.length >= maxFiles) {
          if (maxFiles === 1 && !input.multiple) { files = []; accepted = [file]; } else rejected.push({ name: file.name, reason: "count" });
        } else accepted.push(file);
      });
      files = files.concat(accepted); sync(); render();
      if (rejected.length) {
        root.setAttribute("aria-invalid", "true"); input.setAttribute("aria-invalid", "true");
        util.emit(root, "invalid", { files: rejected });
        announce(fill(text("rejected", "{n} files were not added"), "", rejected.length));
      } else {
        root.removeAttribute("aria-invalid"); input.removeAttribute("aria-invalid");
        if (accepted.length) announce(fill(text("added", "{n} files added"), "", accepted.length));
      }
      if (accepted.length) util.emit(root, "files", { files: files.slice() });
    }

    var hasFiles = function (event) { return event.dataTransfer && Array.prototype.indexOf.call(event.dataTransfer.types || [], "Files") > -1; };
    cleanups.push(util.on(root, "dragenter", function (event) { if (hasFiles(event) && !input.disabled) { event.preventDefault(); root.setAttribute("data-dragover", ""); } }));
    cleanups.push(util.on(root, "dragover", function (event) { if (hasFiles(event) && !input.disabled) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; root.setAttribute("data-dragover", ""); } }));
    cleanups.push(util.on(root, "dragleave", function (event) { if (!event.relatedTarget || !root.contains(event.relatedTarget)) root.removeAttribute("data-dragover"); }));
    cleanups.push(util.on(root, "drop", function (event) {
      if (!hasFiles(event)) return;
      event.preventDefault(); root.removeAttribute("data-dragover");
      if (input.disabled || root.getAttribute("aria-busy") === "true") return;
      addFiles(Array.prototype.slice.call(event.dataTransfer.files));
    }));
    cleanups.push(util.on(input, "change", function () {
      var picked = Array.prototype.slice.call(input.files);
      if (picked.length === files.length && picked.every(function (f, i) { return same(f, files[i]); })) return; // our own sync
      if (!input.multiple) files = [];
      addFiles(picked);
    }));
    cleanups.push(util.on(input, "click", function (event) { if (root.getAttribute("aria-busy") === "true") event.preventDefault(); }));

    root.designDropzone = {
      getFiles: function () { return files.slice(); },
      clear: function () { files = []; sync(); render(); root.removeAttribute("aria-invalid"); input.removeAttribute("aria-invalid"); },
      setBusy: function (busy) { if (busy) root.setAttribute("aria-busy", "true"); else root.removeAttribute("aria-busy"); },
      setStatus: function (target, info) {
        var item = items.filter(function (i) { return i.file === target || i.file.name === target; })[0];
        if (!item) return;
        if (info.text != null) item.status.textContent = info.text;
        if (info.state) item.li.setAttribute("data-state", info.state); else item.li.removeAttribute("data-state");
        if (info.value != null) {
          if (!item.bar) { item.bar = document.createElement("progress"); item.bar.className = "progress progress--sm"; item.bar.max = 100; item.bar.setAttribute("aria-label", item.file.name); item.li.appendChild(item.bar); }
          item.bar.value = info.value;
        } else if (item.bar) { item.bar.remove(); item.bar = null; }
        if (info.state === "error" || info.state === "done") announce(item.file.name + ": " + (info.text || info.state));
      }
    };
    return function () { cleanups.forEach(function (c) { c(); }); clearTimeout(statusTimer); status.remove(); delete root.designDropzone; };
  });
})();

/* --- error-summary.js --- */
/* error-summary: a block at the top of a form that lists every problem as a link to its field, and takes focus when it appears.
     <form class="form" novalidate data-error-summary-for>   (optional: validates the form itself, see below)
       <section class="error-summary" tabindex="-1" aria-labelledby="es-title" hidden>
         <h2 class="error-summary__title" id="es-title">There is a problem</h2>
         <ul class="error-summary__list"><li><a href="#email">Enter your email address</a></li></ul>
       </section>
   Screen readers: the summary is a focusable, named region and receives focus when it is shown, so its heading is read once. It deliberately has no role="alert":
   an alert would announce the same text a second time on top of the focus announcement. (For a summary that appears without moving focus, add role="alert" yourself.)
   Links: a click focuses the field (a fieldset or group focuses its first control) and scrolls it into view, because a bare #fragment does not reliably focus form controls.
   Showing: remove `hidden` (or add the first list item) and the summary takes focus. API: el.designErrorSummary.show([{id, message}]) renders the list, shows and focuses it; .hide().
   Self-validating form: put data-error-summary on the summary and give the <form> novalidate. On submit every invalid control is listed with its label and browser message, gets
   aria-invalid and a .field__error (created if missing and wired with aria-describedby); fixing a field removes its error. A submit with no problems goes through untouched.
   Texts: data-text-title="There is a problem" / "There are {n} problems" via data-text-title-many. */
(function () {
  if (!window.designBehaviors) return;

  window.designBehaviors.register("error-summary", ".error-summary", function (root, util) {
    var cleanups = [];
    var list = root.querySelector(".error-summary__list");
    var title = root.querySelector(".error-summary__title");
    if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1");

    function focusSummary() { root.focus({ preventScroll: false }); }

    function targetFor(link) {
      var id = (link.getAttribute("href") || "").replace(/^#/, "");
      var el = id ? document.getElementById(decodeURIComponent(id)) : null;
      if (el && !/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName) && !el.hasAttribute("tabindex")) el = el.querySelector("input, select, textarea, button") || el;
      return el;
    }
    cleanups.push(util.on(root, "click", function (event) {
      var link = event.target.closest("a[href^='#']");
      if (!link) return;
      var el = targetFor(link);
      if (!el) return;
      event.preventDefault();
      el.scrollIntoView({ block: "center", behavior: util.reducedMotion() ? "auto" : "smooth" });
      el.focus({ preventScroll: true });
    }));

    // Takes focus whenever it goes from hidden to visible, or gains its first problems while visible.
    var wasHidden = root.hidden;
    var observer = new MutationObserver(function () {
      if (wasHidden && !root.hidden) focusSummary();
      wasHidden = root.hidden;
    });
    observer.observe(root, { attributes: true, attributeFilter: ["hidden"] });
    cleanups.push(function () { observer.disconnect(); });
    if (!root.hidden && root.hasAttribute("data-autofocus")) focusSummary();

    function setTitle(count) {
      if (!title) return;
      title.textContent = count === 1 ? (root.getAttribute("data-text-title") || "There is a problem") : (root.getAttribute("data-text-title-many") || "There are {n} problems").replace("{n}", count);
    }

    var api = {
      show: function (errors) {
        if (list) {
          list.textContent = "";
          errors.forEach(function (e) {
            var li = document.createElement("li"), a = document.createElement("a");
            a.href = "#" + e.id; a.textContent = e.message; li.appendChild(a); list.appendChild(li);
          });
        }
        setTitle(errors.length);
        var wasShown = !root.hidden;
        root.hidden = false;
        if (wasShown) focusSummary();
      },
      hide: function () { root.hidden = true; }
    };
    root.designErrorSummary = api;

    var form = root.closest("form");
    if (form && root.hasAttribute("data-error-summary")) {
      var noValidate = form.noValidate;
      form.noValidate = true;
      var errorIdFor = function (control) { return (control.id || (control.id = util.uid("field"))) + "-error"; };
      var labelOf = function (control) {
        var label = control.labels && control.labels[0];
        if (!label && control.closest("fieldset")) { var legend = control.closest("fieldset").querySelector("legend"); if (legend) label = legend; }
        return label ? label.textContent.replace(/\s*\*\s*$/, "").replace(/\s*\(\w+\)\s*$/, "").trim() : (control.getAttribute("aria-label") || control.name);
      };
      var setError = function (control, message) {
        var id = errorIdFor(control);
        var box = control.closest(".field, .choice-group, .choice") || control.parentElement;
        var node = document.getElementById(id);
        if (!node) { node = document.createElement("span"); node.className = "field__error"; node.id = id; box.appendChild(node); }
        node.textContent = message;
        control.setAttribute("aria-invalid", "true");
        var describedby = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        if (describedby.indexOf(id) < 0) control.setAttribute("aria-describedby", describedby.concat(id).join(" "));
      };
      var clearError = function (control) {
        var id = (control.id || "") + "-error", node = document.getElementById(id);
        if (node) node.remove();
        control.removeAttribute("aria-invalid");
        var describedby = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (t) { return t && t !== id; });
        if (describedby.length) control.setAttribute("aria-describedby", describedby.join(" ")); else control.removeAttribute("aria-describedby");
      };
      cleanups.push(util.on(form, "submit", function (event) {
        var invalid = Array.prototype.filter.call(form.elements, function (c) { return c.willValidate && !c.validity.valid; });
        if (!invalid.length) { api.hide(); return; }
        event.preventDefault();
        var seen = {};
        var errors = [];
        invalid.forEach(function (control) {
          var key = control.type === "radio" ? "radio:" + control.name : control.id || control.name;
          if (seen[key]) { control.setAttribute("aria-invalid", "true"); return; }
          seen[key] = true;
          var message = control.getAttribute("data-error") || control.validationMessage;
          setError(control, message);
          errors.push({ id: control.id, message: labelOf(control) + ": " + message });
        });
        api.show(errors);
      }));
      var fix = function (event) {
        var control = event.target;
        if (!control || !control.validity || !form.contains(control)) return;
        var group = control.type === "radio" ? Array.prototype.slice.call(form.querySelectorAll('input[type="radio"]')).filter(function (r) { return r.name === control.name; }) : [control];
        group.forEach(function (c) {
          if (c.getAttribute("aria-invalid") !== "true" || !c.validity.valid) return;
          clearError(c);
          Array.prototype.forEach.call(root.querySelectorAll("a"), function (a) { if (a.getAttribute("href") === "#" + c.id) a.closest("li").remove(); });
        });
        if (list && root.hidden === false) { if (!list.children.length) api.hide(); else setTitle(list.children.length); }
      };
      cleanups.push(util.on(form, "input", fix));
      cleanups.push(util.on(form, "change", fix));
      cleanups.push(function () { form.noValidate = noValidate; });
    }
    return function () { cleanups.forEach(function (c) { c(); }); delete root.designErrorSummary; };
  });
})();

/* --- input-extras.js --- */
/* input-extras: small behaviours for form controls that need a few lines of script. Every one is opt-in through its markup.
   password-toggle   <button type="button" class="btn btn--icon" data-password-toggle aria-controls="pw" aria-label="Show password" aria-pressed="false"><span class="icon icon--eye" aria-hidden="true"></span></button>
                     Switches the input between type=password and text and keeps focus on the button. With aria-pressed the label stays the same ("Show password", the state is "pressed").
                     With data-label-pressed="Hide password" the label changes instead and aria-pressed is dropped (the two together would announce the state twice).
   search-clear      .search with a .search__clear button: empties the input, fires input and change, returns focus to the input, emits design:clear.
   slider            input.slider: sets --slider-fill, updates <output for="id">, optional data-unit="%" (also used for aria-valuetext),
                     data-lte="#other" / data-gte="#other" keep two sliders in order (a range from two sliders).
   indeterminate     input[data-indeterminate]: sets the indeterminate property (HTML has no attribute for it); the first change clears it.
   check-all         input[type=checkbox][data-check-all="#container"]: a parent checkbox for the checkboxes inside the container (indeterminate while some are checked). */
(function () {
  if (!window.designBehaviors) return;
  var B = window.designBehaviors;

  B.register("password-toggle", "[data-password-toggle]", function (button, util) {
    var input = button.getAttribute("aria-controls") ? document.getElementById(button.getAttribute("aria-controls")) : null;
    if (!input) { var group = button.closest(".input-group"); input = group && group.querySelector("input"); }
    if (!input) return;
    var swapsLabel = button.hasAttribute("data-label-pressed");
    var label = button.getAttribute("aria-label");
    var icon = button.querySelector(".icon");
    if (swapsLabel) button.removeAttribute("aria-pressed"); else if (!button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", "false");
    function show(visible) {
      input.type = visible ? "text" : "password";
      button.setAttribute("data-visible", visible ? "true" : "false");
      if (swapsLabel) button.setAttribute("aria-label", visible ? button.getAttribute("data-label-pressed") : label); else button.setAttribute("aria-pressed", visible ? "true" : "false");
      if (icon) { icon.classList.toggle("icon--eye", !visible); icon.classList.toggle("icon--eye-off", visible); }
    }
    var off = util.on(button, "click", function () {
      var start = input.selectionStart, end = input.selectionEnd;
      show(input.type === "password");
      button.focus();
      try { input.setSelectionRange(start, end); } catch (e) { /* not selectable */ }
    });
    var form = input.form;
    var offForm = form ? util.on(form, "submit", function () { if (input.type === "text") show(false); }) : function () {};
    return function () { off(); offForm(); };
  });

  B.register("search-clear", ".search", function (root, util) {
    var input = root.querySelector(".search__input"), clear = root.querySelector(".search__clear");
    if (!input || !clear) return;
    return util.on(clear, "click", function () {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();
      util.emit(root, "clear", {});
    });
  });

  B.register("slider", "input.slider", function (input, util) {
    function limit() {
      var lte = input.getAttribute("data-lte"), gte = input.getAttribute("data-gte");
      var other = lte && document.querySelector(lte), v = Number(input.value);
      if (other && v > Number(other.value)) input.value = other.value;
      other = gte && document.querySelector(gte);
      if (other && v < Number(other.value)) input.value = other.value;
    }
    function update() {
      limit();
      var min = input.min === "" ? 0 : Number(input.min), max = input.max === "" ? 100 : Number(input.max), v = Number(input.value);
      input.style.setProperty("--slider-fill", (max > min ? ((v - min) / (max - min)) * 100 : 0) + "%");
      var unit = input.getAttribute("data-unit") || "";
      if (unit) input.setAttribute("aria-valuetext", input.value + unit);
      var outputs = input.id ? document.querySelectorAll('output[for~="' + input.id + '"]') : [];
      Array.prototype.forEach.call(outputs, function (o) { o.textContent = input.value + unit; });
    }
    update();
    return util.on(input, "input", update);
  });

  B.register("indeterminate", "input[data-indeterminate]", function (input, util) {
    input.indeterminate = true;
    return util.on(input, "change", function () { input.indeterminate = false; input.removeAttribute("data-indeterminate"); });
  });

  B.register("check-all", "input[data-check-all]", function (parent, util) {
    var container = document.querySelector(parent.getAttribute("data-check-all"));
    if (!container) return;
    var boxes = function () { return Array.prototype.filter.call(container.querySelectorAll('input[type="checkbox"]'), function (b) { return b !== parent && !b.disabled; }); };
    function refresh() {
      var all = boxes(), on = all.filter(function (b) { return b.checked; }).length;
      parent.checked = all.length > 0 && on === all.length;
      parent.indeterminate = on > 0 && on < all.length;
    }
    var offParent = util.on(parent, "change", function () { var value = parent.checked; boxes().forEach(function (b) { b.checked = value; }); parent.indeterminate = false; });
    var offChildren = util.on(container, "change", function (event) { if (event.target !== parent) refresh(); });
    refresh();
    return function () { offParent(); offChildren(); };
  });
})();

/* --- log.js --- */
/* design behaviour: log viewer. <div class="log" role="log" aria-live="off" tabindex="0">.
   Follow tail: while the user is at the bottom, new lines keep it scrolled down; once they scroll up (or the log is paused) it stops following and a
   "Jump to latest" button (.log__jump, created if missing) appears with the number of new lines. Smooth scrolling only without prefers-reduced-motion.
   Controls: any button with data-log-action="pause|wrap|clear|latest" and aria-controls="<log id>" (pause and wrap are toggles: they keep aria-pressed).
   Events on the log: design:follow {following, paused}, design:log-clear. Programmatic: set data-paused on the log to pause. */
(function () {
  if (!window.designBehaviors) return;
  var THRESHOLD = 8;

  designBehaviors.register("log", '.log[role="log"]', function (log, util) {
    var following = true, unseen = 0, lastCount = log.querySelectorAll(".log__line").length;
    util.ensureId(log, "log");
    var jump = log.querySelector(".log__jump");
    if (!jump) {
      jump = document.createElement("button");
      jump.type = "button";
      jump.className = "btn btn--sm log__jump";
      jump.innerHTML = '<span class="icon icon--arrow-down" aria-hidden="true"></span><span data-log-label></span>';
      log.appendChild(jump);
    }
    jump.hidden = true;
    var label = jump.querySelector("[data-log-label]") || jump;
    var base = jump.getAttribute("data-label") || "Jump to latest";

    var paused = function () { return log.hasAttribute("data-paused"); };
    var atBottom = function () { return log.scrollHeight - log.scrollTop - log.clientHeight <= THRESHOLD; };
    function toBottom(smooth) { log.scrollTo({ top: log.scrollHeight, behavior: smooth && !util.reducedMotion() ? "smooth" : "auto" }); }
    function render() {
      var show = !following || paused();
      jump.hidden = !(show && (unseen > 0 || !atBottom()));
      var text = unseen > 0 ? base + " (" + unseen + " new)" : base;
      if (label.textContent !== text) label.textContent = text;
    }
    function setFollowing(value) {
      if (following === value) return;
      following = value;
      util.emit(log, "follow", { following: following, paused: paused() });
    }

    var offs = [];
    offs.push(util.on(log, "scroll", function () {
      if (atBottom()) { unseen = 0; if (!paused()) setFollowing(true); }
      else if (!programmatic) setFollowing(false);
      render();
    }));
    var programmatic = false;
    function lineCount() { return log.querySelectorAll(".log__line").length; }
    var observer = new MutationObserver(function () {
      var count = lineCount();
      var added = Math.max(0, count - lastCount);
      lastCount = count;
      if (!added) return;
      if (following && !paused()) {
        programmatic = true;
        toBottom(false);
        window.requestAnimationFrame(function () { programmatic = false; });
      } else unseen += added;
      render();
    });
    observer.observe(log, { childList: true, subtree: true });
    offs.push(function () { observer.disconnect(); });

    function latest() {
      log.removeAttribute("data-paused");
      unseen = 0;
      setFollowing(true);
      programmatic = true;
      toBottom(true);
      window.setTimeout(function () { programmatic = false; render(); }, util.reducedMotion() ? 0 : 400);
      render();
      syncPause();
    }
    offs.push(util.on(jump, "click", function () { latest(); log.focus({ preventScroll: true }); }));

    function controls(action) { return document.querySelectorAll('[data-log-action="' + action + '"][aria-controls~="' + log.id + '"]'); }
    function syncPause() { Array.prototype.forEach.call(controls("pause"), function (b) { b.setAttribute("aria-pressed", String(paused())); }); }
    function setPaused(value) {
      if (value) log.setAttribute("data-paused", ""); else log.removeAttribute("data-paused");
      if (value) setFollowing(false);
      else { unseen = 0; setFollowing(true); toBottom(false); }
      syncPause();
      render();
    }
    function onControl(event) {
      var button = event.target.closest && event.target.closest("[data-log-action]");
      if (!button || !log.id || (button.getAttribute("aria-controls") || "").split(/\s+/).indexOf(log.id) < 0) return;
      var action = button.getAttribute("data-log-action");
      if (action === "pause") setPaused(!paused());
      else if (action === "latest") latest();
      else if (action === "wrap") { log.classList.toggle("log--wrap"); button.setAttribute("aria-pressed", String(log.classList.contains("log--wrap"))); }
      else if (action === "clear") {
        Array.prototype.forEach.call(log.querySelectorAll(".log__line"), function (line) { line.remove(); });
        unseen = 0; lastCount = 0; render();
        util.emit(log, "log-clear");
      }
    }
    offs.push(util.on(document, "click", onControl));

    toBottom(false);
    render();
    return function () { offs.forEach(function (off) { off(); }); };
  });
})();

/* --- menu.js --- */
/* menu: keyboard model for a menu button (WAI-ARIA APG "Menu Button") on Popover API menus.
     <button class="btn" popovertarget="actions" aria-haspopup="menu" aria-expanded="false">Actions</button>
     <div class="menu" id="actions" popover role="menu" aria-label="Actions">
       <button class="menu__item" role="menuitem">Rename</button>
       <div class="menu__separator" role="separator"></div>
       <button class="menu__item" role="menuitemcheckbox" aria-checked="true">...</button>
     </div>
   Invoker: Enter/Space open (native), ArrowDown opens on the first item, ArrowUp on the last.
   Menu: ArrowUp/ArrowDown move (wrapping), Home/End jump, a printable character jumps to the next item starting with it, Escape closes and
   returns focus to the button, Tab closes and moves on, Enter/Space/click activates. Disabled items (disabled or aria-disabled) are skipped.
   menuitemcheckbox toggles aria-checked, menuitemradio checks itself and unchecks the others in its group (role=group, or the menu).
   Activating an item closes the menu unless the item has data-keep-open. Event on the menu: design:select, detail { item, value, checked }. */
(function () {
  var ITEMS = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

  function enabled(menu) {
    return Array.prototype.filter.call(menu.querySelectorAll(ITEMS), function (item) {
      return !item.disabled && item.getAttribute("aria-disabled") !== "true" && !item.hidden && item.getClientRects().length > 0;
    });
  }
  function invokersOf(menu) {
    return menu.id ? Array.prototype.slice.call(document.querySelectorAll('[popovertarget="' + menu.id + '"]')) : [];
  }

  /* Invokers: ArrowDown / ArrowUp open the menu on the first / last item. One document listener, because invokers are ordinary buttons. */
  if (!window.__designMenuInvokers) {
    window.__designMenuInvokers = true;
    document.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      var button = event.target && event.target.closest ? event.target.closest('[popovertarget][aria-haspopup="menu"]') : null;
      if (!button) return;
      var menu = document.getElementById(button.getAttribute("popovertarget"));
      if (!menu || !menu.hasAttribute("popover") || !menu.matches('[role="menu"]')) return;
      event.preventDefault();
      if (!menu.matches(":popover-open")) menu.showPopover({ source: button });
      var list = enabled(menu);
      var target = event.key === "ArrowUp" ? list[list.length - 1] : list[0];
      if (target) target.focus();
    });
  }

  window.designBehaviors.register("menu", '[popover][role="menu"]', function (menu, util) {
    var offs = [];
    var buffer = "", timer = 0;

    function focusFirstOnOpen(source) {
      var list = enabled(menu);
      /* Opened by the keyboard arrow handler above: it already placed focus. Otherwise focus the first item. */
      if (!menu.contains(document.activeElement) && list[0]) list[0].focus();
    }
    offs.push(util.on(menu, "toggle", function (event) { if (event.newState === "open") focusFirstOnOpen(); }));

    function close(returnFocus) {
      var button = invokersOf(menu)[0];
      if (returnFocus && button) button.focus();
      if (menu.matches(":popover-open")) menu.hidePopover();
    }

    function activate(item) {
      var role = item.getAttribute("role");
      var checked = null;
      if (role === "menuitemcheckbox") {
        checked = item.getAttribute("aria-checked") !== "true";
        item.setAttribute("aria-checked", String(checked));
      } else if (role === "menuitemradio") {
        var group = item.closest('[role="group"]') || menu;
        Array.prototype.forEach.call(group.querySelectorAll('[role="menuitemradio"]'), function (other) { other.setAttribute("aria-checked", String(other === item)); });
        checked = true;
      }
      util.emit(menu, "select", { item: item, value: item.getAttribute("data-value") || item.textContent.trim(), checked: checked });
      if (!item.hasAttribute("data-keep-open")) close(true);
    }

    offs.push(util.on(menu, "click", function (event) {
      var item = event.target.closest(ITEMS);
      if (!item || !menu.contains(item)) return;
      if (item.disabled || item.getAttribute("aria-disabled") === "true") { if (item.tagName === "A") event.preventDefault(); return; }
      activate(item);
    }));

    offs.push(util.on(menu, "keydown", function (event) {
      var list = enabled(menu);
      var current = list.indexOf(document.activeElement);
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return; }
      if (event.key === "Tab") { close(true); return; }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") return;
      if (util.arrowNav(event, list, current, false)) return;
      if ((event.key === " " || event.key === "Enter") && current >= 0 && list[current].tagName !== "BUTTON" && list[current].tagName !== "A") {
        event.preventDefault();
        activate(list[current]);
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " ") {
        buffer += event.key.toLowerCase();
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { buffer = ""; }, 600);
        var ordered = list.slice(current + 1).concat(list.slice(0, current + 1));
        var needle = buffer.length > 1 && buffer.split("").every(function (c) { return c === buffer[0]; }) ? buffer[0] : buffer;
        var hit = ordered.filter(function (item) { return item.textContent.trim().toLowerCase().indexOf(needle) === 0; })[0];
        if (hit) { event.preventDefault(); hit.focus(); }
      }
    }));
    return function () { window.clearTimeout(timer); offs.forEach(function (off) { off(); }); };
  });
})();

/* --- nav-item-section.js --- */
/* design behaviour: nav-item-section (the collapsible button.nav-item--section of the shell; the always-open .nav-section group needs no script). A collapsible sidebar section (see manifest/core/shell.json, "Collapsible section"):
   button.nav-item--section[aria-expanded][aria-controls="id"] controls the .nav-items group with that id.
   - a click flips aria-expanded and the group's hidden attribute, then emits design:toggle {expanded};
   - the initial state follows aria-expanded, and a section that holds the aria-current item is opened (also later, when aria-current moves in a single-page app).
   Nothing is remembered between page loads. In the icon rail the CSS keeps the items visible whatever the state. */
(function () {
  if (!window.designBehaviors) return;

  designBehaviors.register("nav-item-section", "button.nav-item--section[aria-controls]", function (button, util) {
    var group = document.getElementById(button.getAttribute("aria-controls"));
    if (!group) return;

    function set(expanded) {
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
      group.hidden = !expanded;
    }
    function openIfCurrent() {
      if (group.querySelector('[aria-current]:not([aria-current="false"])')) set(true);
    }

    set(button.getAttribute("aria-expanded") === "true");
    openIfCurrent();
    var observer = window.MutationObserver ? new MutationObserver(openIfCurrent) : null;
    if (observer) observer.observe(group, { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
    var off = util.on(button, "click", function () {
      var expanded = button.getAttribute("aria-expanded") !== "true";
      set(expanded);
      util.emit(button, "toggle", { expanded: expanded });
    });
    return function () { if (observer) observer.disconnect(); off(); };
  });
})();

/* --- navbar.js --- */
/* design behaviour: navbar. The phone disclosure panel (see manifest/core/navbar.json): button.navbar__toggle gets aria-expanded and aria-controls,
   Escape closes the panel and returns focus to the button, a click on a link inside closes it, and growing past the phone width resets it.
   Dispatches design:open / design:close on the .navbar. */
designBehaviors.register("navbar", ".navbar", function (bar, util) {
  var toggle = bar.querySelector(".navbar__toggle");
  if (!toggle) return;
  var targets = Array.prototype.slice.call(bar.querySelectorAll(".navbar__links, .navbar__actions"));
  toggle.setAttribute("aria-controls", targets.map(function (el) { return util.ensureId(el, "navbar-panel"); }).join(" "));
  var query = window.matchMedia("(max-width: 40rem)");
  function isOpen() { return toggle.getAttribute("aria-expanded") === "true"; }
  function set(open, returnFocus) {
    var was = isOpen();
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open && returnFocus) toggle.focus();
    if (was !== open) util.emit(bar, open ? "open" : "close");
  }
  set(false, false);
  var offs = [
    util.on(toggle, "click", function () { set(!isOpen(), false); }),
    util.on(bar, "keydown", function (event) {
      if (event.key === "Escape" && isOpen() && query.matches) { event.stopPropagation(); set(false, true); }
    }),
    util.on(bar, "click", function (event) {
      if (isOpen() && event.target.closest && event.target.closest("a")) set(false, false);
    }),
    util.on(query, "change", function () { if (!query.matches) set(false, false); })
  ];
  return function () { offs.forEach(function (off) { off(); }); };
});

/* --- number-field.js --- */
/* number-field: stepper buttons around a native <input type="number">. Applies to every .number-field.
     <div class="number-field"><button type="button" class="btn btn--icon" data-step="-1" aria-label="Decrease quantity">..</button>
       <input class="input number-field__input" type="number" min="0" max="10" step="1" inputmode="numeric" aria-label="Quantity">
       <button type="button" class="btn btn--icon" data-step="1" aria-label="Increase quantity">..</button></div>
   The input keeps native Arrow Up/Down, min, max and step. Buttons use stepUp/stepDown (so decimals work), go aria-disabled at a limit (focus is not lost),
   announce the new value in a polite live region, and repeat while held when the field has data-repeat. Out-of-range typing is clamped on change.
   Events: input and change on the input as usual. */
(function () {
  if (!window.designBehaviors) return;

  window.designBehaviors.register("number-field", ".number-field", function (root, util) {
    var input = root.querySelector('input[type="number"]');
    if (!input) return;
    var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-step]"));
    var cleanups = [];
    var status = document.createElement("div");
    status.className = "sr-only"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    root.appendChild(status);
    var statusTimer = 0, holdTimer = 0, repeatTimer = 0;

    function name() {
      var label = input.labels && input.labels[0] ? input.labels[0].textContent : (input.getAttribute("aria-label") || "");
      return label.replace(/\s*\*\s*$/, "").trim();
    }
    function announce() {
      clearTimeout(statusTimer);
      statusTimer = setTimeout(function () { status.textContent = ""; status.textContent = (name() ? name() + ": " : "") + (input.value === "" ? "empty" : input.value); }, 250);
    }
    function limits() {
      var v = parseFloat(input.value), min = input.min === "" ? -Infinity : parseFloat(input.min), max = input.max === "" ? Infinity : parseFloat(input.max);
      buttons.forEach(function (b) {
        var dir = Number(b.getAttribute("data-step"));
        var atLimit = !isNaN(v) && ((dir < 0 && v <= min) || (dir > 0 && v >= max));
        if (atLimit || input.disabled || input.readOnly) b.setAttribute("aria-disabled", "true"); else b.removeAttribute("aria-disabled");
      });
    }
    function clamp() {
      if (input.value === "") return;
      var v = parseFloat(input.value);
      if (isNaN(v)) return;
      if (input.max !== "" && v > parseFloat(input.max)) input.value = input.max;
      else if (input.min !== "" && v < parseFloat(input.min)) input.value = input.min;
    }
    function step(dir) {
      if (input.disabled || input.readOnly) return;
      if (input.value === "") input.value = input.min !== "" && parseFloat(input.min) > 0 ? input.min : "0";
      try { if (dir > 0) input.stepUp(); else input.stepDown(); }
      catch (e) { input.value = String(parseFloat(input.value) + dir * (parseFloat(input.step) || 1)); clamp(); }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      limits(); announce();
    }
    function stop() { clearTimeout(holdTimer); clearInterval(repeatTimer); }

    buttons.forEach(function (button) {
      var dir = Number(button.getAttribute("data-step")) || 1;
      cleanups.push(util.on(button, "click", function (event) {
        if (button.getAttribute("aria-disabled") === "true") { event.preventDefault(); return; }
        if (button.__held) { button.__held = false; return; }
        step(dir);
      }));
      cleanups.push(util.on(button, "pointerdown", function (event) {
        button.__held = false;
        if (!root.hasAttribute("data-repeat") || event.button !== 0 || button.getAttribute("aria-disabled") === "true") return;
        holdTimer = setTimeout(function () { button.__held = true; step(dir); repeatTimer = setInterval(function () { if (button.getAttribute("aria-disabled") === "true") stop(); else step(dir); }, 80); }, 450);
      }));
      ["pointerup", "pointerleave", "pointercancel", "blur"].forEach(function (type) { cleanups.push(util.on(button, type, stop)); });
    });
    cleanups.push(util.on(input, "change", function () { clamp(); limits(); }));
    cleanups.push(util.on(input, "input", limits));
    limits();
    return function () { stop(); clearTimeout(statusTimer); cleanups.forEach(function (c) { c(); }); status.remove(); };
  });
})();

/* --- popover.js --- */
/* popover: the Popover API panels (.menu[popover], .popover[popover]) opened by <button popovertarget="id">.
   The browser provides the top layer, light dismiss and Escape. This behaviour adds what is missing:
   - aria-expanded on every invoker, kept in step with the popover state;
   - design:open / design:close events on the panel;
   - placement next to the invoker, with flipping at the viewport edges, in browsers without CSS anchor positioning
     (where `position-area` works the CSS places it and this script leaves the position alone);
   - Escape and light dismiss return focus to the invoker (native), and a popover that opens outside the viewport is scrolled into reach.
   Markup:
     <button class="btn" popovertarget="filters" aria-expanded="false">Filters</button>
     <div class="popover" id="filters" popover aria-label="Filters"> ... </div> */
(function () {
  var anchored = !!(window.CSS && CSS.supports && CSS.supports("position-area", "block-end"));
  var GAP = 4;

  function invokers(panel) {
    if (!panel.id) return [];
    return Array.prototype.slice.call(document.querySelectorAll('[popovertarget="' + panel.id + '"]'));
  }

  /* Fallback placement: below the invoker, aligned to its end (or start with .menu--start / .popover--start), flipped above and/or to the other edge when it does not fit. */
  function place(panel, source) {
    if (!source) return;
    panel.setAttribute("data-placed", "");
    panel.style.position = "fixed";
    panel.style.inset = "auto";
    panel.style.margin = "0";
    var a = source.getBoundingClientRect();
    var w = panel.offsetWidth, h = panel.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var rtl = getComputedStyle(panel).direction === "rtl";
    var alignStart = panel.classList.contains("menu--start") || panel.classList.contains("popover--start");
    var alignLeft = rtl ? !alignStart : alignStart;
    var top = a.bottom + GAP;
    if (top + h > vh - GAP && a.top - GAP - h >= GAP) top = a.top - GAP - h;
    var left = alignLeft ? a.left : a.right - w;
    if (left + w > vw - GAP) left = a.right - w;
    if (left < GAP) left = a.left;
    left = Math.max(GAP, Math.min(left, vw - w - GAP));
    top = Math.max(GAP, Math.min(top, vh - h - GAP));
    panel.style.top = top + "px";
    panel.style.left = left + "px";
  }

  window.designPopover = { place: place, supportsAnchor: anchored };

  window.designBehaviors.register("popover", ".menu[popover], .popover[popover]", function (panel, util) {
    var source = null;
    var offs = [];
    function sync(open) { invokers(panel).forEach(function (button) { button.setAttribute("aria-expanded", open ? "true" : "false"); }); }
    sync(panel.matches(":popover-open"));
    offs.push(util.on(panel, "beforetoggle", function (event) {
      if (event.newState === "open") source = event.source || document.activeElement;
    }));
    offs.push(util.on(panel, "toggle", function (event) {
      var open = event.newState === "open";
      sync(open);
      if (open) {
        if (!anchored) place(panel, invokers(panel).filter(function (b) { return b === source; })[0] || invokers(panel)[0]);
        util.emit(panel, "open", { source: source });
      } else {
        util.emit(panel, "close", {});
      }
    }));
    if (!anchored) offs.push(util.on(window, "resize", function () { if (panel.matches(":popover-open")) place(panel, invokers(panel)[0]); }));
    return function () { offs.forEach(function (off) { off(); }); };
  });
})();

/* --- segmented.js --- */
/* design behaviour: segmented control. Markup: .segmented[role=group][aria-label] > button.segmented__item[aria-pressed] (see manifest/core/segmented.json).
   - Pick one (default): clicking an item sets aria-pressed="true" on it and "false" on the others. Disabled items are skipped.
   - data-multiple on the group: items toggle independently instead (a set of filters or options).
   - Items are plain buttons in the tab order (Tab, then Enter or Space); no roving focus, because every item is a real button.
   Dispatches design:change on the group: {item, value, pressed} where value is the item's data-value or its text. Add data-value for stable values. */
designBehaviors.register("segmented", ".segmented", function (group, util) {
  function items() { return Array.prototype.slice.call(group.querySelectorAll(".segmented__item")); }

  return util.on(group, "click", function (event) {
    var item = event.target.closest ? event.target.closest(".segmented__item") : null;
    if (!item || !group.contains(item) || item.disabled || item.getAttribute("aria-disabled") === "true") return;
    var multiple = group.hasAttribute("data-multiple");
    var pressed = multiple ? item.getAttribute("aria-pressed") !== "true" : true;
    if (!multiple && item.getAttribute("aria-pressed") === "true") return;
    items().forEach(function (other) {
      if (other === item) other.setAttribute("aria-pressed", pressed ? "true" : "false");
      else if (!multiple) other.setAttribute("aria-pressed", "false");
    });
    util.emit(group, "change", { item: item, value: item.getAttribute("data-value") || item.textContent.trim(), pressed: pressed });
  });
});

/* --- split.js --- */
/* design behaviour: split (resizable panes). Markup: .split > .split__pane + .split__handle[role=separator] + .split__pane.
   The handle resizes the FIRST pane; its size is a percentage of the split, kept in the custom property --split-size on the .split element (the only runtime
   custom property this writes) and mirrored in aria-valuenow. Nothing is persisted. Options on the handle: data-min (default 10), data-max (default 90),
   data-step (default 2), data-big-step (default 10), data-collapsible. Initial size: data-size on the .split (default 50). Events: design:resize {size, collapsed}.
   Keyboard (window splitter pattern): arrows 1 step, Shift+arrows big step, Home/End min/max, Enter collapses and restores (data-collapsible).
   Pointer: drag (mouse, pen and touch), double-click resets. Left/Right are mirrored in right-to-left. */
(function () {
  if (!window.designBehaviors) return;

  designBehaviors.register("split", '.split > .split__handle[role="separator"]', function (handle, util) {
    var split = handle.parentElement;
    var first = handle.previousElementSibling;
    var second = handle.nextElementSibling;
    if (!first || !second) return;
    var stacked = split.classList.contains("split--vertical");
    var collapsible = handle.hasAttribute("data-collapsible");
    var num = function (name, fallback) { var v = parseFloat(handle.getAttribute(name)); return isNaN(v) ? fallback : v; };
    var min = num("data-min", 10), max = num("data-max", 90), step = num("data-step", 2), big = num("data-big-step", 10);
    var initial = Math.min(max, Math.max(min, parseFloat(split.getAttribute("data-size")) || 50));
    var size = initial, collapsed = false, remembered = initial;

    handle.setAttribute("aria-orientation", stacked ? "horizontal" : "vertical");
    handle.setAttribute("aria-controls", util.ensureId(first, "split-pane"));
    if (!handle.hasAttribute("tabindex")) handle.setAttribute("tabindex", "0");
    handle.setAttribute("aria-valuemin", String(collapsible ? 0 : min));
    handle.setAttribute("aria-valuemax", String(max));

    function apply(value, isCollapsed) {
      size = value; collapsed = isCollapsed;
      var shown = isCollapsed ? 0 : value;
      split.style.setProperty("--split-size", shown + "%");
      handle.setAttribute("aria-valuenow", String(Math.round(shown)));
      if (isCollapsed) first.setAttribute("inert", ""); else first.removeAttribute("inert");
      util.emit(split, "resize", { size: shown, collapsed: isCollapsed });
    }
    function set(value) { apply(Math.min(max, Math.max(min, value)), false); }
    function toggle() {
      if (!collapsible) return;
      if (collapsed) apply(remembered, false);
      else { remembered = size; apply(size, true); }
    }
    apply(initial, false);

    function rtl() { return getComputedStyle(split).direction === "rtl"; }
    function fromPointer(event) {
      var rect = split.getBoundingClientRect();
      var thickness = stacked ? handle.offsetHeight : handle.offsetWidth;
      var total = stacked ? rect.height : rect.width;
      var at = stacked ? event.clientY - rect.top : (rtl() ? rect.right - event.clientX : event.clientX - rect.left);
      return total > 0 ? ((at - thickness / 2) / total) * 100 : size;
    }

    var offs = [];
    var dragging = false;
    offs.push(util.on(handle, "pointerdown", function (event) {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      dragging = true;
      handle.setPointerCapture(event.pointerId);
      handle.setAttribute("data-dragging", "");
      split.setAttribute("data-dragging", "");
      handle.focus({ preventScroll: true });
      event.preventDefault();
    }));
    offs.push(util.on(handle, "pointermove", function (event) {
      if (dragging) set(fromPointer(event));
    }));
    function stop(event) {
      if (!dragging) return;
      dragging = false;
      if (handle.hasPointerCapture && handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      handle.removeAttribute("data-dragging");
      split.removeAttribute("data-dragging");
    }
    offs.push(util.on(handle, "pointerup", stop));
    offs.push(util.on(handle, "pointercancel", stop));
    offs.push(util.on(handle, "dblclick", function () { set(initial); }));

    offs.push(util.on(handle, "keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var amount = event.shiftKey ? big : step;
      var decrease = stacked ? "ArrowUp" : (rtl() ? "ArrowRight" : "ArrowLeft");
      var increase = stacked ? "ArrowDown" : (rtl() ? "ArrowLeft" : "ArrowRight");
      var base = collapsed ? min : size;
      if (event.key === decrease) set(collapsed ? min : base - amount);
      else if (event.key === increase) set(base + (collapsed ? 0 : amount));
      else if (event.key === "Home") set(min);
      else if (event.key === "End") set(max);
      else if (event.key === "Enter") toggle();
      else return;
      event.preventDefault();
    }));

    return function () {
      offs.forEach(function (off) { off(); });
      split.style.removeProperty("--split-size");
      first.removeAttribute("inert");
    };
  });
})();

/* --- table.js --- */
/* table: client-side sorting and row selection for .table.
   Sorting:   <table class="table" data-sortable> with th[aria-sort] > button.table__sort. Sorts tbody rows by data-sort-value (else the cell text), numeric-aware,
              locale compare, empty cells last. Keeps aria-sort and the icon in sync, announces politely, emits design:sort {column, label, direction}.
   Selection: a checkbox in a .table__select cell per row plus one in the header (select all, indeterminate when partial). Keeps tr[aria-selected] in sync, emits
              design:select {rows, count}. Works with or without data-sortable. */
(function () {
  var ICONS = { none: "icon--arrow-up-down", ascending: "icon--arrow-up", descending: "icon--arrow-down" };
  var NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;
  var GROUPED = /^[-+]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;

  function toNumber(text) {
    var t = text.replace(/[\s ]/g, "");
    if (NUMBER.test(t)) return parseFloat(t);
    if (GROUPED.test(t)) return parseFloat(t.replace(/,/g, ""));
    return null;
  }
  function bodyRows(table) {
    var rows = [];
    Array.prototype.forEach.call(table.tBodies, function (tbody) {
      Array.prototype.forEach.call(tbody.rows, function (row) { rows.push(row); });
    });
    return rows;
  }

  designBehaviors.register("table-sort", "table[data-sortable]", function (table, util) {
    var headers = Array.prototype.filter.call(table.querySelectorAll("thead th"), function (th) { return th.querySelector(".table__sort"); });
    if (!headers.length) return;
    var lang = document.documentElement.lang || undefined;
    var collator;
    try { collator = new Intl.Collator(lang, { numeric: true, sensitivity: "base" }); } catch (e) { collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }); }

    var host = table.closest(".table-wrap") || table;
    var live = document.createElement("div");
    live.className = "sr-only";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    host.parentNode.insertBefore(live, host.nextSibling);

    function show(th, direction) {
      th.setAttribute("aria-sort", direction);
      var icon = th.querySelector(".table__sort .icon");
      if (!icon) return;
      Object.keys(ICONS).forEach(function (key) { icon.classList.remove(ICONS[key]); });
      icon.classList.add(ICONS[direction]);
    }
    headers.forEach(function (th) { show(th, th.getAttribute("aria-sort") || "none"); });

    function cellValue(row, column) {
      var cell = row.cells[column];
      if (!cell) return "";
      var explicit = cell.getAttribute("data-sort-value");
      return (explicit !== null ? explicit : cell.textContent).trim();
    }

    function sortBy(th, direction) {
      var column = th.cellIndex;
      var sign = direction === "ascending" ? 1 : -1;
      var rows = bodyRows(table).filter(function (row) { return row.cells.length > 1 || !row.cells[0] || row.cells[0].colSpan <= 1; });
      var decorated = rows.map(function (row, index) {
        var raw = cellValue(row, column);
        return { row: row, index: index, raw: raw, number: toNumber(raw) };
      });
      decorated.sort(function (a, b) {
        var aEmpty = a.raw === "", bEmpty = b.raw === "";
        if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : (aEmpty ? 1 : -1); // empty cells stay last in both directions
        var result = a.number !== null && b.number !== null ? a.number - b.number : collator.compare(a.raw, b.raw);
        return result ? result * sign : a.index - b.index;
      });
      decorated.forEach(function (item) { item.row.parentNode.appendChild(item.row); });
    }

    function onClick(event) {
      var button = event.target.closest(".table__sort");
      if (!button || !table.contains(button)) return;
      var th = button.closest("th");
      if (headers.indexOf(th) < 0) return;
      var direction = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
      headers.forEach(function (other) { if (other !== th) show(other, "none"); });
      show(th, direction);
      sortBy(th, direction);
      var label = button.textContent.trim().replace(/\s+/g, " ");
      live.textContent = "";
      // Re-set on the next frame so a repeated message is announced again.
      window.requestAnimationFrame(function () { live.textContent = "Sorted by " + label + ", " + direction; });
      util.emit(table, "sort", { column: th.cellIndex, label: label, direction: direction });
    }

    var off = util.on(table, "click", onClick);
    return function () { off(); if (live.parentNode) live.parentNode.removeChild(live); };
  });

  designBehaviors.register("table-select", ".table", function (table, util) {
    var all = table.querySelector("thead .table__select input[type=checkbox]");
    if (!all) return;
    function boxes() {
      return Array.prototype.filter.call(table.querySelectorAll("tbody .table__select input[type=checkbox]"), function (box) { return !box.disabled; });
    }
    function rowOf(box) { return box.closest("tr"); }
    function refresh() {
      var list = boxes();
      var on = list.filter(function (box) { return box.checked; }).length;
      all.checked = list.length > 0 && on === list.length;
      all.indeterminate = on > 0 && on < list.length;
    }
    function selectedRows() {
      return Array.prototype.filter.call(table.querySelectorAll("tbody tr"), function (row) { return row.getAttribute("aria-selected") === "true"; });
    }
    function announce() {
      var rows = selectedRows();
      util.emit(table, "select", { rows: rows, count: rows.length });
    }

    // Initial state: whichever of aria-selected / checked is set wins, then both agree.
    boxes().forEach(function (box) {
      var row = rowOf(box);
      if (row.getAttribute("aria-selected") === "true") box.checked = true;
      else if (box.checked) row.setAttribute("aria-selected", "true");
      else row.setAttribute("aria-selected", "false");
    });
    refresh();

    function onChange(event) {
      var target = event.target;
      if (target === all) {
        boxes().forEach(function (box) { box.checked = all.checked; rowOf(box).setAttribute("aria-selected", all.checked ? "true" : "false"); });
        all.indeterminate = false;
        announce();
      } else if (boxes().indexOf(target) >= 0) {
        rowOf(target).setAttribute("aria-selected", target.checked ? "true" : "false");
        refresh();
        announce();
      }
    }
    return util.on(table, "change", onChange);
  });
})();

/* --- tabs.js --- */
/* design behaviour: tabs. Markup: .tabs[role=tablist] > button.tab[role=tab] and .tab-panel[role=tabpanel] panels (see manifest/core/tabs.json).
   - Roving tabindex; ArrowLeft/Right (ArrowUp/Down when .tabs--vertical or aria-orientation="vertical"; Left/Right swap in right-to-left), Home, End.
   - Automatic activation (focus selects) or manual (data-activation="manual": arrows only move focus, Enter/Space/click select).
   - A .tabs__group heading (role="presentation") between vertical tabs is not a tab: only [role=tab] elements join the tab order, arrow keys and panels.
   - Wires aria-controls / aria-labelledby and toggles each panel's hidden attribute. Panels are found by aria-controls, else the role=tabpanel
     elements next to the tab list, in order.
   - data-hash on the tab list: the selected tab's id goes in the URL hash and a matching #hash selects that tab (give tabs ids).
   - Dispatches design:change {tab, panel, index} when the user changes the selection.
   - Closable (.tabs--closable, see manifest/core/tabs.json): Delete on a tab or a click on its .tabs__close button dispatches a cancelable design:close
     {tab, panel, index}; unless a listener calls preventDefault() the tab (its .tabs__item) and panel are removed, a neighbour is selected and focus
     moves to it (or to .tabs-bar__new when none is left). data-rename on the list: F2 or double-click swaps the tab for an input; Enter or blur commits,
     Escape cancels; design:rename {tab, index, name} fires after the label (the [data-label] element, else the tab's text) has changed. */
designBehaviors.register("tabs", ".tabs[role=tablist]", function (list, util) {
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
  if (!tabs.length) return;
  var vertical = list.classList.contains("tabs--vertical") || list.getAttribute("aria-orientation") === "vertical";
  if (vertical) list.setAttribute("aria-orientation", "vertical");
  var manual = list.getAttribute("data-activation") === "manual";
  var useHash = list.hasAttribute("data-hash");
  var bar = list.parentElement && list.parentElement.classList.contains("tabs-bar") ? list.parentElement : null;
  var scope = (bar ? bar.parentElement : list.parentElement) || document;
  var closable = list.classList.contains("tabs--closable");
  var renamable = list.hasAttribute("data-rename");
  var siblingPanels = Array.prototype.filter.call(scope.children, function (el) { return el.getAttribute("role") === "tabpanel"; });
  var panels = tabs.map(function (tab, i) {
    var id = tab.getAttribute("aria-controls");
    var panel = (id && document.getElementById(id)) || siblingPanels[i] || null;
    util.ensureId(tab, "tab");
    if (panel) {
      util.ensureId(panel, "tabpanel");
      tab.setAttribute("aria-controls", panel.id);
      if (!panel.hasAttribute("aria-labelledby")) panel.setAttribute("aria-labelledby", tab.id);
      if (!panel.hasAttribute("tabindex") && !util.focusables(panel).length) panel.setAttribute("tabindex", "0");
    }
    return panel;
  });
  function isEnabled(tab) { return !tab.disabled && tab.getAttribute("aria-disabled") !== "true"; }
  function selectedIndex() { return tabs.findIndex(function (t) { return t.getAttribute("aria-selected") === "true"; }); }

  function show(index, focus, notify) {
    var tab = tabs[index];
    if (!tab) return;
    var changed = tab.getAttribute("aria-selected") !== "true";
    tabs.forEach(function (t, i) {
      var on = i === index;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      if (panels[i]) panels[i].hidden = panels[index] !== panels[i];
    });
    if (focus) tab.focus();
    if (notify) tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: util.reducedMotion() ? "auto" : "smooth" });
    if (useHash && notify && tab.id && location.hash !== "#" + tab.id) {
      try { history.replaceState(null, "", "#" + tab.id); } catch (e) { /* sandboxed frame */ }
    }
    if (notify && changed) util.emit(list, "change", { tab: tab, panel: panels[index], index: index });
  }

  var initial = -1;
  if (useHash && location.hash.length > 1) initial = tabs.findIndex(function (t) { return t.id === decodeURIComponent(location.hash.slice(1)); });
  if (initial < 0) initial = selectedIndex();
  if (initial < 0) initial = tabs.findIndex(isEnabled);
  show(initial, false, false);

  var offs = [];
  tabs.forEach(function (tab) {
    offs.push(util.on(tab, "click", function () { var i = tabs.indexOf(tab); if (i >= 0 && isEnabled(tab)) show(i, false, true); }));
  });

  function close(tab) {
    var i = tabs.indexOf(tab);
    if (i < 0) return;
    var detail = { tab: tab, panel: panels[i], index: i };
    var ev = new CustomEvent("design:close", { bubbles: true, cancelable: true, detail: detail });
    if (!list.dispatchEvent(ev)) return;
    var wasSelected = tab.getAttribute("aria-selected") === "true";
    var item = tab.closest(".tabs__item");
    if (panels[i]) panels[i].remove();
    (item && list.contains(item) ? item : tab).remove();
    tabs.splice(i, 1);
    panels.splice(i, 1);
    if (!tabs.length) { var add = bar && bar.querySelector(".tabs-bar__new"); if (add) add.focus(); return; }
    var next = Math.min(i, tabs.length - 1);
    if (wasSelected) show(next, true, true);
    else tabs[next].focus();
  }
  function rename(tab) {
    var item = tab.closest(".tabs__item");
    if (!item || tab.disabled) return;
    var label = tab.querySelector("[data-label]") || tab;
    var input = document.createElement("input");
    input.className = "input";
    input.setAttribute("aria-label", "Rename " + label.textContent.trim());
    input.value = label.textContent.trim();
    var done = false;
    function finish(commit) {
      if (done) return;
      done = true;
      var name = input.value.trim();
      input.remove();
      tab.style.display = "";
      if (commit && name && name !== label.textContent.trim()) {
        label.textContent = name;
        util.emit(list, "rename", { tab: tab, index: tabs.indexOf(tab), name: name });
      }
      tab.focus();
    }
    input.addEventListener("keydown", function (event) {
      event.stopPropagation();
      if (event.key === "Enter") { event.preventDefault(); finish(true); }
      else if (event.key === "Escape") { event.preventDefault(); finish(false); }
    });
    input.addEventListener("blur", function () { finish(true); });
    tab.style.display = "none";
    item.insertBefore(input, tab);
    input.focus();
    input.select();
  }
  if (closable) offs.push(util.on(list, "click", function (event) {
    var button = event.target.closest && event.target.closest(".tabs__close");
    var item = button && button.closest(".tabs__item");
    var tab = item && item.querySelector('[role="tab"]');
    if (tab) close(tab);
  }));
  if (renamable) offs.push(util.on(list, "dblclick", function (event) {
    var tab = event.target.closest && event.target.closest('[role="tab"]');
    if (tab && tabs.indexOf(tab) >= 0) rename(tab);
  }));
  offs.push(util.on(list, "keydown", function (event) {
    var current = tabs.indexOf(document.activeElement);
    if (current < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    if (closable && event.key === "Delete") { event.preventDefault(); close(tabs[current]); return; }
    if (renamable && event.key === "F2") { event.preventDefault(); rename(tabs[current]); return; }
    var rtl = getComputedStyle(list).direction === "rtl";
    var forward = vertical ? "ArrowDown" : (rtl ? "ArrowLeft" : "ArrowRight");
    var back = vertical ? "ArrowUp" : (rtl ? "ArrowRight" : "ArrowLeft");
    var live = tabs.filter(isEnabled);
    var at = live.indexOf(tabs[current]);
    var target = null;
    if (event.key === forward) target = live[(at + 1) % live.length];
    else if (event.key === back) target = live[(at - 1 + live.length) % live.length];
    else if (event.key === "Home") target = live[0];
    else if (event.key === "End") target = live[live.length - 1];
    if (!target) return;
    event.preventDefault();
    if (manual) {
      tabs.forEach(function (t) { t.tabIndex = t === target ? 0 : -1; });
      target.focus();
    } else show(tabs.indexOf(target), true, true);
  }));
  // Manual mode: the focused tab can differ from the selected one. When focus leaves, the selected tab is the one stop in the tab order again.
  if (manual) offs.push(util.on(list, "focusout", function (event) {
    if (list.contains(event.relatedTarget)) return;
    tabs.forEach(function (t) { t.tabIndex = t.getAttribute("aria-selected") === "true" ? 0 : -1; });
  }));
  if (useHash) offs.push(util.on(window, "hashchange", function () {
    var i = tabs.findIndex(function (t) { return t.id === decodeURIComponent(location.hash.slice(1)); });
    if (i >= 0) show(i, false, true);
  }));
  return function () { offs.forEach(function (off) { off(); }); };
});

/* --- tag-input.js --- */
/* tag-input: free-text tags as removable chips. Opt in with data-tag-input on .tag-input.
     <div class="tag-input" data-tag-input data-name="tags" [data-pattern="^[a-z0-9-]+$"] [data-max="5"] [data-duplicates] [data-add-on-blur]>
       <span class="badge badge--accent" data-value="design">design</span>   (existing tags are optional; the buttons are added for you)
       <input class="tag-input__input" aria-label="Tags" placeholder="Add a tag">
     </div>
   Enter or comma adds, pasted text is split on commas, semicolons, tabs and new lines, Backspace in an empty box removes the last tag, the remove buttons are real buttons.
   A tag that fails (pattern, duplicate, max, or a cancelable design:beforeadd) is kept as text, the box gets aria-invalid, and design:invalid {value, reason} fires.
   Other events: design:beforeadd {value} (cancelable), design:change {values}. API: el.designTagInput = { getValues, setValues, add, remove }.
   Texts: data-text-remove="Remove {label}", data-text-added="{label} added", data-text-removed="{label} removed", data-text-invalid="{label} was not added". */
(function () {
  if (!window.designBehaviors) return;
  var fill = function (text, label) { return String(text).replace("{label}", label); };

  window.designBehaviors.register("tag-input", "[data-tag-input]", function (root, util) {
    var input = root.querySelector(".tag-input__input");
    if (!input) return;
    var tags = [];
    var cleanups = [];
    var text = function (key, fallback) { return root.getAttribute("data-text-" + key) || fallback; };
    var status = document.createElement("div");
    status.className = "sr-only"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    root.appendChild(status);
    var statusTimer = 0;
    var announce = function (message) { clearTimeout(statusTimer); statusTimer = setTimeout(function () { status.textContent = ""; status.textContent = message; }, 60); };

    Array.prototype.forEach.call(root.querySelectorAll(".badge"), function (chip) {
      var button = chip.querySelector(".badge__remove"); if (button) button.remove();
      tags.push(chip.getAttribute("data-value") || chip.textContent.trim());
      chip.remove();
    });

    function render() {
      Array.prototype.forEach.call(root.querySelectorAll(".badge"), function (chip) { chip.remove(); });
      Array.prototype.forEach.call(root.querySelectorAll("input[data-tag-value]"), function (h) { h.remove(); });
      var name = root.getAttribute("data-name");
      tags.forEach(function (tag) {
        var chip = document.createElement("span"); chip.className = "badge badge--accent"; chip.setAttribute("data-value", tag);
        chip.appendChild(document.createTextNode(tag));
        var remove = document.createElement("button"); remove.type = "button"; remove.className = "badge__remove";
        remove.setAttribute("aria-label", fill(text("remove", "Remove {label}"), tag));
        var icon = document.createElement("span"); icon.className = "icon icon--x"; icon.setAttribute("aria-hidden", "true");
        remove.appendChild(icon); chip.appendChild(remove);
        root.insertBefore(chip, input);
        if (name) { var h = document.createElement("input"); h.type = "hidden"; h.name = name; h.value = tag; h.setAttribute("data-tag-value", ""); root.appendChild(h); }
      });
    }

    function invalid(value, reason) {
      input.setAttribute("aria-invalid", "true");
      util.emit(root, "invalid", { value: value, reason: reason });
      announce(fill(text("invalid", "{label} was not added"), value));
      return false;
    }

    function add(raw) {
      var value = String(raw).trim();
      if (!value) return false;
      var max = Number(root.getAttribute("data-max"));
      if (max && tags.length >= max) return invalid(value, "max");
      if (!root.hasAttribute("data-duplicates") && tags.some(function (t) { return t.toLowerCase() === value.toLowerCase(); })) return invalid(value, "duplicate");
      var pattern = root.getAttribute("data-pattern");
      if (pattern && !new RegExp(pattern).test(value)) return invalid(value, "pattern");
      var ok = root.dispatchEvent(new CustomEvent("design:beforeadd", { bubbles: true, cancelable: true, detail: { value: value } }));
      if (!ok) return invalid(value, "rejected");
      tags.push(value); input.removeAttribute("aria-invalid"); render();
      util.emit(root, "change", { values: tags.slice() });
      announce(fill(text("added", "{label} added"), value));
      return true;
    }
    function remove(value) {
      var at = tags.indexOf(value); if (at < 0) return;
      tags.splice(at, 1); render();
      util.emit(root, "change", { values: tags.slice() });
      announce(fill(text("removed", "{label} removed"), value));
    }

    cleanups.push(util.on(input, "keydown", function (event) {
      if (event.isComposing) return;
      if (event.key === "Enter" || event.key === ",") {
        if (event.key === "," || input.value.trim()) event.preventDefault();
        if (add(input.value)) input.value = "";
      } else if (event.key === "Backspace" && input.value === "" && tags.length) {
        event.preventDefault(); remove(tags[tags.length - 1]);
      }
    }));
    cleanups.push(util.on(input, "input", function () { input.removeAttribute("aria-invalid"); }));
    cleanups.push(util.on(input, "paste", function (event) {
      var pasted = (event.clipboardData && event.clipboardData.getData("text")) || "";
      if (!/[,;\t\n\r]/.test(pasted)) return;
      event.preventDefault();
      pasted.split(/[,;\t\n\r]+/).forEach(function (part) { add(part); });
    }));
    cleanups.push(util.on(input, "blur", function () { if (root.hasAttribute("data-add-on-blur") && add(input.value)) input.value = ""; }));
    cleanups.push(util.on(root, "click", function (event) {
      var button = event.target.closest(".badge__remove");
      if (button) { remove(button.closest(".badge").getAttribute("data-value")); input.focus(); }
      else if (event.target === root) input.focus();
    }));

    render();
    root.designTagInput = {
      getValues: function () { return tags.slice(); },
      setValues: function (values) { tags = values.slice(); render(); },
      add: add, remove: remove
    };
    return function () { cleanups.forEach(function (c) { c(); }); clearTimeout(statusTimer); status.remove(); delete root.designTagInput; };
  });
})();

/* --- terminal-pane.js --- */
/* terminal-pane: makes the resize handle (.terminal-pane__resize[role=separator]) work with pointer and keyboard.
   Drag, or focus it and press ArrowUp/ArrowDown (Shift for bigger steps), Home (smallest) / End (largest).
   It resizes .terminal-pane__body; aria-valuenow/min/max are in pixels. Emits design:resize with {height}. */
designBehaviors.register("terminal-pane", ".terminal-pane", function (el, util) {
  var handle = el.querySelector(".terminal-pane__resize");
  var body = el.querySelector(".terminal-pane__body");
  if (!handle || !body) return;
  var MIN = 64, STEP = 24, BIG = 96;
  var max = function () { return Math.max(MIN + BIG, Math.round(window.innerHeight * 0.8)); };

  function apply(height) {
    var h = Math.min(max(), Math.max(MIN, Math.round(height)));
    body.style.blockSize = h + "px";
    handle.setAttribute("aria-valuemin", String(MIN));
    handle.setAttribute("aria-valuemax", String(max()));
    handle.setAttribute("aria-valuenow", String(h));
    util.emit(el, "resize", { height: h });
  }
  var current = function () { return body.getBoundingClientRect().height; };
  handle.setAttribute("aria-valuemin", String(MIN));
  handle.setAttribute("aria-valuemax", String(max()));
  handle.setAttribute("aria-valuenow", String(Math.round(current())));

  var drag = null;
  var offs = [
    util.on(handle, "pointerdown", function (event) {
      drag = { y: event.clientY, h: current() };
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    }),
    util.on(handle, "pointermove", function (event) { if (drag) apply(drag.h + event.clientY - drag.y); }),
    util.on(handle, "pointerup", function () { drag = null; }),
    util.on(handle, "pointercancel", function () { drag = null; }),
    util.on(handle, "keydown", function (event) {
      var step = event.shiftKey ? BIG : STEP;
      if (event.key === "ArrowDown") apply(current() + step);
      else if (event.key === "ArrowUp") apply(current() - step);
      else if (event.key === "Home") apply(MIN);
      else if (event.key === "End") apply(max());
      else return;
      event.preventDefault();
    })
  ];
  return function () { offs.forEach(function (off) { off(); }); };
});

/* --- theme-controls.js --- */
/* design behaviour: theme controls for plain pages (the React equivalents are ThemeToggle, useTheme and useDensity). Needs theme.js.
   Put data-theme-control on the controls; any container is fine, they do not have to be together:
     <button class="btn btn--ghost btn--icon" data-theme-control="mode" aria-label="Switch to light theme"><span class="icon icon--sun" aria-hidden="true"></span></button>
     <select class="select" data-theme-control="accent" aria-label="Accent colour"><option value="magenta">Magenta</option>...</select>
     <button class="btn btn--ghost btn--icon" data-theme-control="density" aria-pressed="false" aria-label="Compact density">...</button>
   a mode button toggles dark/light; a mode select offers light, dark and system, accent picks data-accent (magenta is the default and
   clears the attribute), density toggles compact. Choices are remembered by theme.js. Everything stays in step when the theme changes elsewhere. */
(function () {
  var B = window.designBehaviors;
  if (!B) return;
  var root = document.documentElement;

  function theme() { return window.designTheme; }
  function currentTheme() { return root.getAttribute("data-theme") || "dark"; }
  function reflect() {
    var dark = currentTheme() === "dark";
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-control="mode"]'), function (control) {
      if (control.tagName === "SELECT") { control.value = theme() ? theme().getMode() : currentTheme(); return; }
      control.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      var icon = control.querySelector(".icon");
      if (icon) icon.className = "icon icon--" + (dark ? "sun" : "moon");
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-control="accent"]'), function (select) { select.value = root.getAttribute("data-accent") || "magenta"; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-control="density"]'), function (button) { button.setAttribute("aria-pressed", root.getAttribute("data-density") === "compact" ? "true" : "false"); });
  }
  if (window.MutationObserver) new MutationObserver(reflect).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-accent", "data-density"] });

  B.register("theme-mode", '[data-theme-control="mode"]', function (control, util) {
    reflect();
    if (control.tagName === "SELECT") return util.on(control, "change", function () { if (theme()) theme().setMode(control.value); });
    return util.on(control, "click", function () { if (theme()) theme().set(currentTheme() === "dark" ? "light" : "dark"); });
  });
  B.register("theme-accent", '[data-theme-control="accent"]', function (select, util) {
    reflect();
    return util.on(select, "change", function () { if (theme()) theme().setAccent(select.value === "magenta" ? "" : select.value); });
  });
  B.register("theme-density", '[data-theme-control="density"]', function (button, util) {
    reflect();
    return util.on(button, "click", function () { if (theme()) theme().setDensity(root.getAttribute("data-density") === "compact" ? "comfortable" : "compact"); });
  });
})();

/* --- toast.js --- */
/* toast: window.designToast for plain pages (React apps use ToastProvider/useToast from react/Toasts instead), plus banner dismissal.
     designToast.show({ message: "Saved.", tone: "success", action: { label: "Undo", onClick: fn }, position: "top-end" })
   - tone: "neutral" (default) | "success" | "warning" | "error" | "info". Errors use role=alert; the rest are role=status.
   - Every toast dismisses after four seconds unless dismissed earlier.
   - position: "top-end" (default) | "top" | "bottom" | "bottom-end". One .toast-stack (aria-live=polite, labelled "Notifications") per position, created on demand.
   - At most designToast.max (default 4) are visible per stack; the oldest goes first.
   - Returns { dismiss() }. designToast.clear() removes all. Dismissed toasts fade out unless the user prefers reduced motion.
   Declarative trigger: <button data-toast="Saved." data-toast-tone="success" data-toast-position="top-end">: a click shows the toast (tone and position optional).
   Banners: a button with data-banner-dismiss inside an .alert--banner (or the deprecated .banner) hides that banner and emits design:close on it. */
(function () {
  var stacks = {};
  var CLASS = { "top-end": "", top: " toast-stack--top", bottom: " toast-stack--bottom", "bottom-end": " toast-stack--bottom-end" };
  var TONES = { success: 1, warning: 1, error: 1, info: 1 };
  var util = window.designBehaviors.util;

  function stackFor(position) {
    var key = CLASS[position] !== undefined ? position : "top-end";
    var stack = stacks[key];
    if (stack && stack.isConnected) return stack;
    stack = document.createElement("div");
    stack.className = "toast-stack" + CLASS[key];
    stack.setAttribute("role", "region");
    stack.setAttribute("aria-label", "Notifications");
    stack.setAttribute("aria-live", "polite");
    stack.setAttribute("aria-atomic", "false");
    document.body.appendChild(stack);
    stacks[key] = stack;
    return stack;
  }

  function icon(name) {
    var span = document.createElement("span");
    span.className = "icon icon--" + name;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  function remove(toast) {
    if (!toast.parentNode) return;
    var done = function () { if (toast.parentNode) toast.parentNode.removeChild(toast); };
    if (util.reducedMotion()) { done(); return; }
    toast.setAttribute("data-leaving", "");
    window.setTimeout(done, 200);
  }

  var api = {
    max: 4,
    show: function (options) {
      var o = typeof options === "string" ? { message: options } : options || {};
      var tone = TONES[o.tone] ? o.tone : "neutral";
      var stack = stackFor(o.position);
      var toast = document.createElement("div");
      toast.className = "toast" + (tone === "neutral" ? "" : " toast--" + tone);
      toast.setAttribute("role", tone === "error" ? "alert" : "status");

      var message = document.createElement("span");
      message.className = "toast__message";
      message.textContent = o.message == null ? "" : String(o.message);
      toast.appendChild(message);

      var dismiss = function () { window.clearTimeout(timer); remove(toast); };
      var action = o.action;
      if (action && action.label) {
        var run = document.createElement("button");
        run.type = "button";
        run.className = "btn btn--sm";
        run.textContent = action.label;
        run.addEventListener("click", function () { var fn = action.onClick || action.run; if (fn) fn(); dismiss(); });
        toast.appendChild(run);
      }
      var close = document.createElement("button");
      close.type = "button";
      close.className = "btn btn--ghost btn--icon btn--sm";
      close.setAttribute("aria-label", "Dismiss");
      close.appendChild(icon("x"));
      close.addEventListener("click", dismiss);
      toast.appendChild(close);

      var timer = window.setTimeout(dismiss, 4000);
      toast.addEventListener("keydown", function (event) { if (event.key === "Escape") { event.stopPropagation(); dismiss(); } });

      stack.appendChild(toast);
      var live = stack.querySelectorAll(".toast:not([data-leaving])");
      for (var i = 0; i < live.length - api.max; i++) remove(live[i]);
      return { dismiss: dismiss, element: toast };
    },
    clear: function () { Object.keys(stacks).forEach(function (key) { Array.prototype.forEach.call(stacks[key].querySelectorAll(".toast"), remove); }); }
  };
  window.designToast = api;

  if (!window.__designBannerDismiss) {
    window.__designBannerDismiss = true;
    document.addEventListener("click", function (event) {
      var button = event.target && event.target.closest ? event.target.closest("[data-banner-dismiss]") : null;
      var banner = button && button.closest(".alert--banner, .banner");
      if (!banner) return;
      banner.hidden = true;
      util.emit(banner, "close", {});
    });
  }
  designBehaviors.register("toast-trigger", "[data-toast]", function (button, util) {
    return util.on(button, "click", function () {
      var options = { message: button.getAttribute("data-toast"), tone: button.getAttribute("data-toast-tone") || "neutral" };
      if (button.getAttribute("data-toast-position")) options.position = button.getAttribute("data-toast-position");
      window.designToast.show(options);
    });
  });
})();

/* --- toggle.js --- */
/* design behaviour: toggle button. <button class="btn" data-toggle aria-pressed="false"> flips aria-pressed on each click, so the pressed look
   (accent border and fill) and the announced state follow. The label stays the same: the state is "pressed" or "not pressed".
   Toggles are independent; to choose one of a few values use segmented. Disabled buttons and aria-disabled links are left alone.
   Starts as aria-pressed="false" when the attribute is missing. Emits design:toggle {pressed} after the change. */
(function () {
  if (!window.designBehaviors) return;

  designBehaviors.register("toggle", "[data-toggle]", function (button, util) {
    if (!button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", "false");

    function flip() {
      if (button.disabled || button.getAttribute("aria-disabled") === "true") return;
      var pressed = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
      util.emit(button, "toggle", { pressed: pressed });
    }

    return util.on(button, "click", flip);
  });
})();

/* --- toolbar.js --- */
/* design behaviour: toolbar. <div class="toolbar" role="toolbar" aria-label="..."> is ONE tab stop (roving tabindex). Arrow keys (Left/Right, or Up/Down when
   aria-orientation="vertical"; mirrored in right-to-left) move between the controls, Home/End jump to the first/last. Disabled controls are skipped.
   Text inputs keep their arrow keys. Controls added later are picked up. */
(function () {
  if (!window.designBehaviors) return;
  var ITEM = 'button, select, a[href], input, [role="button"], [tabindex]';

  designBehaviors.register("toolbar", '.toolbar[role="toolbar"]', function (bar, util) {
    function items() {
      return Array.prototype.filter.call(bar.querySelectorAll(ITEM), function (el) {
        if (el.disabled || el.hidden || el.closest("[hidden], [inert]") || el.getAttribute("aria-disabled") === "true") return false;
        if (el.matches(".toolbar__separator")) return false;
        return el.getClientRects().length > 0;
      });
    }
    function setActive(active) {
      var list = Array.prototype.slice.call(bar.querySelectorAll(ITEM));
      list.forEach(function (el) { if (el.matches(".toolbar__separator")) return; el.setAttribute("tabindex", el === active ? "0" : "-1"); });
    }
    function sync() {
      var list = items();
      if (!list.length) return;
      var current = list.filter(function (el) { return el.getAttribute("tabindex") === "0"; })[0];
      setActive(current || list[0]);
    }
    sync();

    var offs = [];
    offs.push(util.on(bar, "focusin", function (event) {
      var target = event.target;
      if (items().indexOf(target) >= 0) setActive(target);
    }));
    offs.push(util.on(bar, "keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var list = items();
      var current = list.indexOf(document.activeElement);
      if (current < 0) return;
      var target = document.activeElement;
      if (target.tagName === "INPUT" && !/^(button|checkbox|radio|submit|reset|range)$/.test(target.type)) return;
      var vertical = bar.getAttribute("aria-orientation") === "vertical";
      var rtl = getComputedStyle(bar).direction === "rtl";
      var key = event.key;
      if (!vertical && rtl && (key === "ArrowLeft" || key === "ArrowRight")) key = key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
      var forward = vertical ? "ArrowDown" : "ArrowRight", back = vertical ? "ArrowUp" : "ArrowLeft";
      if (target.tagName === "SELECT" && (key === "ArrowUp" || key === "ArrowDown") && !vertical) return;
      var next = -1;
      if (key === forward) next = (current + 1) % list.length;
      else if (key === back) next = (current - 1 + list.length) % list.length;
      else if (key === "Home") next = 0;
      else if (key === "End") next = list.length - 1;
      else return;
      event.preventDefault();
      setActive(list[next]);
      list[next].focus();
    }));
    if (window.MutationObserver) {
      var observer = new MutationObserver(function () { sync(); });
      observer.observe(bar, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "hidden"] });
      offs.push(function () { observer.disconnect(); });
    }
    return function () { offs.forEach(function (off) { off(); }); };
  });
})();

/* --- tooltip.js --- */
/* tooltip: makes the CSS-only .tip[data-tip] meet WCAG 1.4.13 and fit the viewport.
   - Dismissible: Escape hides the visible tip without moving focus or the pointer (data-tip-dismissed); it returns on the next hover or focus.
   - Placement: author data-tip-placement="top" (default) | "bottom" | "start" | "end". On show the tip is flipped to the opposite side when it would leave the
     viewport, and shifted to start/end alignment when centring would clip it. The result is written to data-tip-side and data-tip-shift (CSS reads those).
   - Touch: a tap shows the tip (data-tip-open) and a tap anywhere else hides it, because touch screens have no hover.
   Hover and keyboard focus work without this script; it only improves them. Tips stay text-only. */
(function () {
  var GAP = 8;
  var tips = [];

  function hide(tip) { tip.removeAttribute("data-tip-open"); }
  function visible(tip) { return tip.hasAttribute("data-tip-open") || tip.matches(":hover") || tip.matches(":focus-visible") || tip.matches(":has(:focus-visible)"); }

  function measure(tip) {
    var style = getComputedStyle(tip, "::after");
    return { w: parseFloat(style.width) || 0, h: parseFloat(style.height) || 0 };
  }

  function layout(tip) {
    var wanted = tip.getAttribute("data-tip-placement") || "top";
    var rect = tip.getBoundingClientRect();
    var size = measure(tip);
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var rtl = getComputedStyle(tip).direction === "rtl";
    var side = wanted;
    var room = {
      top: rect.top - GAP >= size.h, bottom: vh - rect.bottom - GAP >= size.h,
      left: rect.left - GAP >= size.w, right: vw - rect.right - GAP >= size.w
    };
    var flip = { top: "bottom", bottom: "top", start: "end", end: "start" };
    var fits = {
      top: room.top, bottom: room.bottom,
      start: rtl ? room.right : room.left, end: rtl ? room.left : room.right
    };
    if (!fits[side] && fits[flip[side]]) side = flip[side];
    var shift = "";
    if (side === "top" || side === "bottom") {
      var centre = rect.left + rect.width / 2;
      if (centre - size.w / 2 < GAP) shift = rtl ? "end" : "start";
      else if (centre + size.w / 2 > vw - GAP) shift = rtl ? "start" : "end";
    }
    if (side === "top") tip.removeAttribute("data-tip-side"); else tip.setAttribute("data-tip-side", side);
    if (shift) tip.setAttribute("data-tip-shift", shift); else tip.removeAttribute("data-tip-shift");
  }

  if (!window.__designTooltips) {
    window.__designTooltips = true;
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      tips.forEach(function (tip) {
        if (visible(tip) && !tip.hasAttribute("data-tip-dismissed")) tip.setAttribute("data-tip-dismissed", "");
      });
    });
    document.addEventListener("pointerdown", function (event) {
      tips.forEach(function (tip) { if (!tip.contains(event.target)) hide(tip); });
    });
  }

  window.designBehaviors.register("tooltip", ".tip[data-tip]", function (tip, util) {
    tips.push(tip);
    function show() { tip.removeAttribute("data-tip-dismissed"); layout(tip); }
    var offs = [
      util.on(tip, "pointerenter", show),
      util.on(tip, "focusin", show),
      util.on(tip, "pointerdown", function (event) {
        if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
        tips.forEach(function (other) { if (other !== tip) hide(other); });
        if (tip.hasAttribute("data-tip-open")) { hide(tip); return; }
        tip.setAttribute("data-tip-open", "");
        show();
      }),
      util.on(tip, "pointerleave", function (event) { if (event.pointerType === "mouse") tip.removeAttribute("data-tip-dismissed"); }),
      util.on(tip, "focusout", function () { tip.removeAttribute("data-tip-dismissed"); hide(tip); })
    ];
    return function () { tips.splice(tips.indexOf(tip), 1); offs.forEach(function (off) { off(); }); };
  });
})();

/* --- tree.js --- */
/* design behaviour: tree (WAI-ARIA Authoring Practices tree view). Markup: ul.tree[role=tree] > li[role=none] > div.tree__item[role=treeitem] (+ sibling ul.tree__group[role=group])
   (see manifest/core/tree.json).
   - Roving tabindex; Up/Down, Right (expand, then first child), Left (collapse, then parent), Home/End, type-ahead, Enter (select, toggles a branch), Space (select), * (expand siblings).
   - Computes aria-level / aria-posinset / aria-setsize and sets the custom property --tree-depth (0 = top level) that the CSS uses for indentation.
   - Selection is aria-selected (aria-multiselectable="true" on the tree allows several; Space then toggles).
   - Events (bubbling, on the item): design:select {item, selected}, design:expand {item, level, lazy}, design:collapse {item}.
     Lazy loading: a branch (aria-expanded) with no group gets aria-busy="true" on design:expand with lazy:true; add its ul.tree__group[role=group] later and the busy flag clears. */
designBehaviors.register("tree", ".tree[role=tree]", function (tree, util) {
  var multi = tree.getAttribute("aria-multiselectable") === "true";
  var typed = "", typedTimer = 0, scheduled = false;

  function allItems() { return Array.prototype.slice.call(tree.querySelectorAll('[role="treeitem"]')); }
  function shown() { return allItems().filter(function (item) { return item.getClientRects().length > 0; }); }
  function groupOf(item) { var g = item.nextElementSibling; return g && g.getAttribute("role") === "group" ? g : (item.querySelector(':scope > [role="group"]')); }
  function isBranch(item) { return item.hasAttribute("aria-expanded"); }
  function isOpen(item) { return item.getAttribute("aria-expanded") === "true"; }
  function itemsIn(list) {
    return Array.prototype.map.call(list.children, function (li) { return li.getAttribute("role") === "treeitem" ? li : li.querySelector(':scope > [role="treeitem"]'); }).filter(Boolean);
  }
  function siblingsOf(item) {
    var holder = item.parentElement;
    return holder && holder.getAttribute("role") === "none" ? itemsIn(holder.parentElement) : (holder ? itemsIn(holder) : [item]);
  }
  function parentOf(item) {
    var group = item.closest('[role="group"]');
    if (!group || !tree.contains(group)) return null;
    var owner = group.previousElementSibling;
    if (owner && owner.getAttribute("role") === "treeitem") return owner;
    var host = group.parentElement;
    return host && host.getAttribute("role") === "treeitem" ? host : (host && host.querySelector(':scope > [role="treeitem"]'));
  }
  function levelOf(item) {
    var level = 1;
    for (var group = item.closest('[role="group"]'); group && tree.contains(group); group = group.parentElement && group.parentElement.closest('[role="group"]')) level += 1;
    return level;
  }

  function number() {
    scheduled = false;
    allItems().forEach(function (item) {
      var level = levelOf(item), peers = siblingsOf(item);
      item.setAttribute("aria-level", String(level));
      item.setAttribute("aria-posinset", String(peers.indexOf(item) + 1));
      item.setAttribute("aria-setsize", String(peers.length));
      item.style.setProperty("--tree-depth", String(level - 1));
      if (!item.hasAttribute("aria-selected") && item.getAttribute("aria-disabled") !== "true") item.setAttribute("aria-selected", "false");
      if (item.getAttribute("aria-busy") === "true" && groupOf(item)) item.removeAttribute("aria-busy");
    });
    var current = allItems().filter(function (item) { return item.tabIndex === 0; });
    if (!current.length || current.length > 1 || current[0].getClientRects().length === 0) {
      var all = allItems();
      var first = all.filter(function (i) { return i.getAttribute("aria-selected") === "true" && i.getClientRects().length > 0; })[0] || shown()[0] || all[0];
      all.forEach(function (item) { item.tabIndex = item === first ? 0 : -1; });
    }
  }
  function renumber() { if (!scheduled) { scheduled = true; Promise.resolve().then(number); } }

  function focusItem(item) {
    allItems().forEach(function (other) { other.tabIndex = other === item ? 0 : -1; });
    item.focus();
  }
  function setOpen(item, open) {
    if (!isBranch(item) || isOpen(item) === open || item.getAttribute("aria-disabled") === "true") return;
    item.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      var lazy = !groupOf(item);
      if (lazy) item.setAttribute("aria-busy", "true");
      util.emit(item, "expand", { item: item, level: levelOf(item), lazy: lazy });
    } else {
      var active = document.activeElement;
      if (active && active !== item && item.parentElement.contains(active)) focusItem(item);
      util.emit(item, "collapse", { item: item });
    }
  }
  function select(item) {
    if (item.getAttribute("aria-disabled") === "true") return;
    var on = multi ? item.getAttribute("aria-selected") !== "true" : true;
    if (!multi) allItems().forEach(function (other) { if (other !== item && other.getAttribute("aria-selected") === "true") other.setAttribute("aria-selected", "false"); });
    item.setAttribute("aria-selected", on ? "true" : "false");
    util.emit(item, "select", { item: item, selected: on });
  }
  function label(item) { return (item.textContent || "").trim().toLowerCase(); }

  number();
  var offs = [];
  offs.push(util.on(tree, "focusin", function (event) {
    var item = event.target.closest && event.target.closest('[role="treeitem"]');
    if (item && tree.contains(item) && item === event.target) allItems().forEach(function (other) { other.tabIndex = other === item ? 0 : -1; });
  }));
  offs.push(util.on(tree, "click", function (event) {
    var item = event.target.closest('[role="treeitem"]');
    if (!item || !tree.contains(item) || item.getAttribute("aria-disabled") === "true") return;
    focusItem(item);
    select(item);
    if (isBranch(item) && !event.target.closest("a")) setOpen(item, !isOpen(item));
  }));
  offs.push(util.on(tree, "keydown", function (event) {
    var item = event.target.closest && event.target.closest('[role="treeitem"]');
    if (!item || event.target !== item || event.altKey || event.ctrlKey || event.metaKey) return;
    var list = shown(), at = list.indexOf(item), key = event.key, target = null;
    var rtl = getComputedStyle(tree).direction === "rtl";
    if (rtl) key = key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
    if (key === "ArrowDown") target = list[Math.min(at + 1, list.length - 1)];
    else if (key === "ArrowUp") target = list[Math.max(at - 1, 0)];
    else if (key === "Home") target = list[0];
    else if (key === "End") target = list[list.length - 1];
    else if (key === "ArrowRight") {
      if (isBranch(item) && !isOpen(item)) { event.preventDefault(); setOpen(item, true); return; }
      if (isBranch(item) && isOpen(item)) { var group = groupOf(item); target = group && itemsIn(group)[0]; }
      else { event.preventDefault(); return; }
    } else if (key === "ArrowLeft") {
      if (isBranch(item) && isOpen(item)) { event.preventDefault(); setOpen(item, false); return; }
      target = parentOf(item);
      if (!target) { event.preventDefault(); return; }
    } else if (key === "Enter") { event.preventDefault(); select(item); if (isBranch(item)) setOpen(item, !isOpen(item)); return; }
    else if (key === " ") { event.preventDefault(); select(item); return; }
    else if (key === "*") { event.preventDefault(); siblingsOf(item).forEach(function (peer) { setOpen(peer, true); }); return; }
    else if (key.length === 1 && /\S/.test(key)) {
      typed += key.toLowerCase();
      clearTimeout(typedTimer);
      typedTimer = setTimeout(function () { typed = ""; }, 500);
      var order = list.slice(at + (typed.length === 1 ? 1 : 0)).concat(list.slice(0, at + (typed.length === 1 ? 1 : 0)));
      target = order.filter(function (candidate) { return label(candidate).indexOf(typed) === 0; })[0];
      if (!target) return;
    }
    if (!target) return;
    event.preventDefault();
    focusItem(target);
  }));
  var observer = window.MutationObserver ? new MutationObserver(renumber) : null;
  if (observer) observer.observe(tree, { childList: true, subtree: true });
  return function () { clearTimeout(typedTimer); if (observer) observer.disconnect(); offs.forEach(function (off) { off(); }); };
});

/* --- truncate-mid.js --- */
/* design behaviour: middle truncation for plain HTML. <span class="truncate-mid mono" data-tail="10">full value</span> becomes head + tail spans,
   keeps the full value for assistive technology (sr-only) and as title. Markup that already has .truncate-mid__head or __tail (server or React rendered) is left alone.
   Attribute: data-tail = number of characters kept at the end (default 10). There is no head when the value is not longer than the tail. */
(function () {
  if (!window.designBehaviors) return;
  designBehaviors.register("truncate-mid", ".truncate-mid", function (el) {
    if (el.querySelector(".truncate-mid__head, .truncate-mid__tail")) return;
    var full = (el.textContent || "").trim();
    if (!full) return;
    var tail = parseInt(el.getAttribute("data-tail"), 10);
    if (!(tail > 0)) tail = 10;
    var cut = Math.max(0, full.length - tail);
    var original = el.innerHTML;
    el.textContent = "";
    function part(cls, text) {
      var s = document.createElement("span");
      s.className = cls;
      s.setAttribute("aria-hidden", "true");
      s.textContent = text;
      el.appendChild(s);
    }
    if (cut > 0) part("truncate-mid__head", full.slice(0, cut));
    part("truncate-mid__tail", full.slice(cut));
    var plain = document.createElement("span");
    plain.className = "sr-only";
    plain.textContent = full;
    el.appendChild(plain);
    if (!el.hasAttribute("title")) el.setAttribute("title", full);
    return function () { el.innerHTML = original; };
  });
})();
