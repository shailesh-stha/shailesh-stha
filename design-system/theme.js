// Optional helper: remembers theme, accent and density and sets data-theme / data-accent / data-density on <html>.
// Include it in <head> before first paint to avoid a flash:  <script src="design-system/theme.js"></script>
// Later: designTheme.set("light"), designTheme.setAccent("blue"), designTheme.setDensity("compact").
// Mode: designTheme.setMode("system" | "dark" | "light"). In "system" mode the theme follows the operating system live (prefers-color-scheme);
// data-theme always holds the resolved "dark" or "light", so CSS needs nothing extra. getMode() returns the mode, get() the resolved theme.
// Custom accent: designTheme.setAccentColor("#rrggbb") derives accent, accent-text, accent-solid and on-accent for the current theme (OKLCH, contrast-checked) and
// sets them as inline custom properties on <html> with data-accent="custom"; setAccentColor(null) or setAccent(...) clears them. deriveAccent(hex, theme) is the pure derivation;
// setAccentProps(element, hex, theme) does the same for one element (a preview or swatch); isHexColor(value) tells whether a value is a "#rrggbb".
// Dark and magenta are the defaults. Storage keys: design-theme (dark | light | system), design-accent, design-accent-color, design-density.
// Fires a "design:theme" event on document (detail: { mode, theme }) whenever the resolved theme or the mode changes.
(function () {
  var root = document.documentElement;
  var THEMES = ["dark", "light"];
  var MODES = ["dark", "light", "system"];
  var DENSITIES = ["comfortable", "compact"];
  var query = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  function get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function put(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private mode: not remembered */ } }
  function apply(attr, value) { if (value) root.setAttribute(attr, value); else root.removeAttribute(attr); }
  function oneOf(list, value) { return list.indexOf(value) !== -1 ? value : null; }
  function resolve(mode) { return mode === "system" ? (query && query.matches ? "light" : "dark") : mode; }

  // --- Custom accent: derive the accent tokens from one hex, keeping hue and chroma (OKLCH) and moving only lightness until the contrast rules hold. ---
  var SURFACE = { dark: "#212121", light: "#ffffff" }; // --surface per theme (palette neutral 800 / 0)
  var WHITE = "#ffffff", BLACK = "#111111";            // --on-accent candidates (palette neutral 0 / 950)
  var ACCENT_VARS = ["--accent", "--accent-text", "--accent-solid", "--on-accent"];
  function parseHex(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(rgb) { return "#" + rgb.map(function (c) { var h = Math.round(c).toString(16); return h.length < 2 ? "0" + h : h; }).join(""); }
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function gam(c) { c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return c * 255; }
  function luminance(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
  function contrast(a, b) { var x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function toOklch(rgb) {
    var r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { l: L, c: Math.sqrt(A * A + B * B), h: Math.atan2(B, A) };
  }
  function fromOklch(L, C, H) {
    var A = C * Math.cos(H), B = C * Math.sin(H);
    var l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
    var m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
    var s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  function inGamut(v) { return v[0] >= -0.0005 && v[0] <= 1.0005 && v[1] >= -0.0005 && v[1] <= 1.0005 && v[2] >= -0.0005 && v[2] <= 1.0005; }
  // The colour at lightness L with the hue and as much of the chroma as fits in sRGB.
  function at(color, L) {
    var lo = 0, hi = color.c, rgb = fromOklch(L, hi, color.h);
    if (!inGamut(rgb)) {
      for (var i = 0; i < 20; i++) { var mid = (lo + hi) / 2; if (inGamut(fromOklch(L, mid, color.h))) lo = mid; else hi = mid; }
      rgb = fromOklch(L, lo, color.h);
    }
    return rgb.map(function (v) { return gam(Math.min(1, Math.max(0, v))); });
  }
  // Move lightness from the input towards `dir` (+1 lighter, -1 darker) until ok(rgb) holds.
  function search(color, dir, ok) {
    var L = color.l, rgb = at(color, L);
    for (var i = 0; i <= 200 && !ok(rgb); i++) { L = Math.min(1, Math.max(0, L + dir * 0.005)); rgb = at(color, L); }
    return rgb;
  }
  function distance(a, b) { var x = toOklch(a), y = toOklch(b); return Math.abs(x.l - y.l) + Math.abs(x.c - y.c); }

  /** The accent tokens for one theme from one hex, or null when the hex is invalid. `adjusted` is true when a value moved noticeably from the input. */
  function deriveAccent(hex, theme) {
    var input = parseHex(hex);
    if (!input) return null;
    var surface = parseHex(SURFACE[theme === "light" ? "light" : "dark"]);
    var color = toOklch(input);
    var dir = theme === "light" ? -1 : 1; // against a light surface the accent gets darker, against a dark one lighter
    var text = search(color, dir, function (rgb) { return contrast(rgb, surface) >= 3; });
    var solid, on = WHITE, white = parseHex(WHITE), black = parseHex(BLACK);
    if (contrast(input, white) >= 4.5) solid = input;
    else if (contrast(input, black) >= 4.5) { solid = input; on = BLACK; }
    else solid = search(color, -1, function (rgb) { return contrast(rgb, white) >= 4.5; });
    return {
      accent: toHex(text), accentText: toHex(text), accentSolid: toHex(solid), onAccent: on,
      adjusted: distance(input, text) > 0.03 || distance(input, solid) > 0.03,
    };
  }

  var mode = oneOf(MODES, get("design-theme")) || oneOf(MODES, root.getAttribute("data-theme")) || "dark";
  function announce() {
    try { document.dispatchEvent(new CustomEvent("design:theme", { detail: { mode: mode, theme: resolve(mode) } })); } catch (e) { /* old browser */ }
  }
  /** Scoped form: sets the derived accent tokens on any element so everything inside shows that colour (a preview, a swatch); an empty or invalid hex clears them. Returns the tokens or null. */
  function setAccentProps(element, hex, theme) {
    if (!element || !element.style) return null;
    var tokens = hex ? deriveAccent(hex, theme) : null;
    var values = tokens ? [tokens.accent, tokens.accentText, tokens.accentSolid, tokens.onAccent] : [];
    ACCENT_VARS.forEach(function (name, i) { if (tokens) element.style.setProperty(name, values[i]); else element.style.removeProperty(name); });
    return tokens;
  }
  function applyCustomAccent() {
    var hex = get("design-accent-color");
    return setAccentProps(root, hex && root.getAttribute("data-accent") === "custom" ? hex : null, resolve(mode));
  }
  function render() { apply("data-theme", resolve(mode)); applyCustomAccent(); }
  function setMode(next) {
    if (!oneOf(MODES, next)) return;
    mode = next; render(); put("design-theme", next); announce();
  }
  apply("data-accent", get("design-accent") || root.getAttribute("data-accent"));
  render();
  apply("data-density", oneOf(DENSITIES, get("design-density")) || oneOf(DENSITIES, root.getAttribute("data-density")));

  if (query) {
    var follow = function () { if (mode === "system") { render(); announce(); } };
    if (query.addEventListener) query.addEventListener("change", follow); else if (query.addListener) query.addListener(follow);
  }

  window.designTheme = {
    get: function () { return oneOf(THEMES, root.getAttribute("data-theme")) || "dark"; },
    set: function (theme) { setMode(theme); },
    getMode: function () { return mode; },
    setMode: setMode,
    setAccent: function (accent) { apply("data-accent", accent); put("design-accent", accent || ""); put("design-accent-color", ""); applyCustomAccent(); },
    // "#rrggbb" sets a custom accent and returns { adjusted } (true when a derived value moved noticeably from the input); null clears it. An invalid hex changes nothing and returns null.
    setAccentColor: function (hex) {
      if (hex === null || hex === "" || hex === undefined) { window.designTheme.setAccent(""); return null; }
      var tokens = deriveAccent(hex, resolve(mode));
      if (!tokens) return null;
      put("design-accent-color", toHex(parseHex(hex))); put("design-accent", "custom"); apply("data-accent", "custom");
      applyCustomAccent();
      return { adjusted: tokens.adjusted };
    },
    getAccentColor: function () { return get("design-accent-color") || null; },
    deriveAccent: deriveAccent,
    setAccentProps: setAccentProps,
    isHexColor: function (value) { return parseHex(value) !== null; },
    getDensity: function () { return root.getAttribute("data-density") || "comfortable"; },
    setDensity: function (density) {
      var next = oneOf(DENSITIES, density);
      if (!next) return;
      apply("data-density", next); put("design-density", next);
    },
  };
})();
