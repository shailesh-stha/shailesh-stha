# Design system: read this before writing any UI

One look for every project: dark by default, light switchable, one accent (magenta by default), Inter. It is deliberately curated: 82 components in two tiers (65 core, 17 app). If it is not in `components.json` (core; in this folder it lists both tiers) or `components.app.json` (app tier, in a project synced with `--app`), it does not exist. Browse everything, with live demos, code and accessibility notes, at the documentation site: `node tools/design.mjs preview` then http://127.0.0.1:9100/ (source: `_design-system/docs/`).

## Start here

1. Read **PLAYBOOK.md** first: pick the page archetype (overview, list, detail, workbench, form, wizard, chat, guide), write its outline with only components from `components.json`, use its widths and spacing.
2. Fill **design-brief.md** (copy `templates/DESIGN-BRIEF.template.md`): users, pages and archetypes, key data, one primary action per page, density, languages, forbidden.
3. Build from a template (`templates/`) and the rules below. Do not invent classes, colours or sizes; missing things are a proposal.
4. `design check` (rules, must be 0) then `design review` (layout at 3 widths, screenshots) and the checklist in **REVIEW.md**. Passing `check` does not make a page good.
5. A tool page has a 40 to 56 px title bar and no eyebrow or lead; a viewer gives the canvas 70% or more; a table has at most two row actions then a menu.

## Use it

```html
<link rel="stylesheet" href="design-system/design.css">   <!-- fonts load from design-system/fonts/ -->
<link rel="stylesheet" href="design-system/icons.css"> <!-- icons: <span class="icon icon--search" aria-hidden="true"></span> -->
<script src="design-system/theme.js"></script>         <!-- optional: <html data-theme="dark|light" data-accent="magenta|blue|green|orange">; a switcher is markup only: data-theme-control="mode|accent|density" -->
<script src="design-system/shell.js"></script>         <!-- plain-HTML pages only: makes the phone navigation drawer work -->
<script src="design-system/behaviors.js" defer></script> <!-- plain-HTML pages: tabs, tree, combobox, tooltip, dialog, toast, table sort, ... from markup and data-attributes -->
<link rel="stylesheet" href="design-system/design-app.css"> <!-- only if synced with --app: chat, viewer, canvas, terminal, entity rows -->
```

**Two tiers.** *Core* is generic UI any project may use. The *app tier* is domain UI (chat, 3D viewer chrome, canvas panels, terminal panes, entity rows); it ships only to projects synced with `design sync <project> --app`, and `design check` reports app classes in a project that did not opt in. Where a new piece belongs is decided by a human.

**Behaviour.** Native first (`<dialog>`, `popover`, `<details name>`), then `behaviors.js` (plain pages, driven by markup and `data-*`, emits `design:*` events, `window.designBehaviors`, `window.designToast`), then the typed React helpers (same ARIA patterns). Never write your own tab, menu, dialog, combobox or tree behaviour; each component's page lists its behaviour under "Behaviour".

**Density and theme.** `<html data-density="compact">` tightens controls and rows; `designTheme.setMode("system")` follows the OS; `designTheme.setDensity(...)`. Components follow automatically, projects write nothing for it. Controls grow to 44px on a touch pointer and below 40rem; a fixed-size desktop panel (a browser extension popup, an Office task pane) sets `<html data-viewport="panel">` so only the pointer decides and density applies.

**Icons:** use only names from `node tools/design.mjs icons [search words]` (search by concept: `icons delete`). Never draw or paste your own inline `<svg>` icon. A missing icon is a proposal (we add it to `icons/`: Lucide first, our own if Lucide has none). In React: `<Icon name="search" />` (typed). Plain HTML without React: the span form above, or the sprite form `<svg class="icon"><use href="design-system/icons.svg#search"/></svg>` (not on file:// pages).

React apps also get behaviour that matches the classes (`design-system/react`): `Modal`/`ConfirmDialog`, `Menu` (`triggerText` for a text trigger such as File or Edit, `portal` to open it in the top layer inside a scrolling table), `Popover`, `Search`, `Tooltip`, `Drawer`, `CommandPalette`, `ToastProvider`/`useToast`, `Tabs`, `Tree`, `Pagination`, `CollapsibleCard` (card with a toggle, status and actions in its header), `NumberField` (number-field markup with stepper buttons), `Combobox`, `TagInput`, `Dropzone`, `Split`, `Toolbar`, `CodeBlock`, `Thumb` (a picture cropped to a frame), `ThemeToggle`/`useTheme`/`useDensity` (ThemeToggle opens a Light/Dark/System menu; the app tier adds `ChatThread`, `ChatComposer` under `react/app`). Use these instead of writing your own:

```tsx
import { Modal, ConfirmDialog, Menu, ToastProvider, useToast, ThemeToggle } from "./design-system/react";
```

Build pages from the classes in `components.json` (`btn`, `card`, `table`, `shell`, ...), whose `markup` and `examples` give working HTML. Start full pages from `templates/` (dashboard, detail, list-detail, workbench, settings, login, error, wizard, docs page, landing page) rather than inventing structure. Layout helpers: `stack`, `cluster`, `grid`, `grid--cols-N`, `switcher`, `with-sidebar`, `center`, `container`, `page-section`, `fill` (a tab panel or pane that takes the remaining height of a bounded flex column); type roles `text-display|title|heading|body|label|caption`, `lead`, `eyebrow`, `num`, `prose`.

**Pages with tabs.** The header and the tab row never scroll with the content. Put `Tabs` (React `fill`, or `tabs-fill`) in a parent that has a bounded height (a flex or grid cell of the page shell); the active panel takes the remaining height and scrolls on its own when its content is taller. Never put the tab row inside a container that scrolls the whole page. A panel that must not scroll (a split, a canvas) simply fills the height and scrolls its own parts.

**Dialogs with a section list (model manager, profile, settings).** Use one frame, `modal modal--lg modal--manager` (React `<Modal manager>`): a plain-text title in `modal__header` (no icon tile), then `tabs-layout tabs-layout--responsive-flush` with vertical `tab`s (icon, label, optional count `badge`) directly inside the dialog. Each panel holds one `modal__body` (scrolls; add `data-density="compact"` for dense panels; group content as `eyebrow` heading, then `card`, then `setting` rows) and, only if the section has actions, one `modal__footer`. The height is fixed, so changing section never resizes the dialog. Copy the "Manager dialog" example of `modal`; do not write your own heights, wrappers or `overflow`.

## The rules (`design check` enforces them and fails the build)

1. **Colours, sizes, radii, fonts, shadows come from tokens only:** `var(--text)`, `var(--space-4)`, `var(--radius-lg)`. No hex/rgb/hsl, no px/rem/em except `0`, `1px` and `2px` borders/outlines. Never use `--palette-*` (palette primitives).
2. **No `!important`. No inline `style` for look.** Layers already settle the order: `design.reset < design.tokens < design.base < design.components < design.layout < app`.
3. **Project CSS lives in one layer, `@layer app { ... }`, and may only do layout:** display, flex/grid properties, gap, margin, padding, width/height/min/max (also the logical forms `inline-size`, `block-size`, `min-inline-size`, ...), position/inset (also `inset-inline-start`, `inset-block-end`, ...), overflow and `overflow-wrap`, grid-area, order, z-index, aspect-ratio, all with token values. No colour, background, border, font, radius, shadow or animation properties.
4. **Class names:** design classes have plain names (`btn`, `card`); use them exactly as listed in `components.json`, never invent new ones. Your own classes (layout only) are named `app-*`: `app-toolbar`. Any other class name fails `design check`. Do not name styles after a page or feature (`tenders-header`, `sv-row`). Variants are a closed list: states are attributes (`aria-selected`, `aria-current`, `aria-invalid`, `disabled`, `aria-busy`), not extra classes.
5. **Do not edit `design-system/` inside a project.** It is a synced copy (`design sync`) and is overwritten.
6. **Theme and accent are the only knobs.** A project picks `data-accent`; it does not define colours. A brand colour that is not one of the four accents goes through `designTheme.setAccentColor("#rrggbb")` (whole page) or `designTheme.setAccentProps(element, hex, theme)` (one preview or swatch); the system derives the readable tokens, so a project never computes or sets accent colours itself.

## Forms: required, optional, AI fills

Every field is one of three kinds, marked the same way everywhere: **required** (`data-required` on the label, `required` on the control), **optional** (`data-optional="optional"` on the label) or **optional and filled in by the AI when left empty** (`data-optional` on the label, a placeholder that says where the value comes from, and a hint `field__hint field__hint--ai` that starts with the sparkles icon). The page writes the hint text; after processing, show where a value came from (for example a "read from the document" tag). A required field is never AI-filled.

## Tables

A table is `div.table-wrap > table.table` with a `caption` (`table__caption`, or `sr-only`) or an `aria-label`, never a bare `<table>`. A scrolling wrapper is a named, focusable region: `role="region" tabindex="0" aria-label`. Numbers: `table__num` on the cells and on the header; the unit goes in the header or a Unit column, not in every cell. The first cell of a row that names the row is `<th scope="row">`. Status is a `badge` with an icon and text, an empty table shows an `empty` row, wide data on a phone uses `table--stacked` with `data-label`. A table that is the whole content of a page part needs no card around it: use `table-wrap--framed`. This is guidance; `design check` does not look at table markup.

## Sidebars

The left sidebar is where to go: the pages of a section and the lists you switch between, as `nav-section` groups with an eyebrow heading. A sidebar has one scroll area: several groups stack as plain sections in one scrolling container (an `app-*` layout class), and a group never scrolls on its own. The right panel (`side-panel`, a bottom `sheet` on phones) is about what you are looking at: details, references, preview, inspector, table of contents. It is collapsible, so it is never the only way to reach a page and holds nothing essential.

## UI text length (web and native)

Count the characters of the visible string, spaces included, in English. German needs about 30 percent more, so the limit is for the shortest language and a translation may exceed it by up to 30 percent. Numbers, paths and names inserted at run time are not counted.

| Element | Limit | Form |
|---|---|---|
| Tooltip | 60 characters, one sentence, no full stop | the verb for icon-only buttons ("Delete profile"), or the one fact the caption does not say. Never two sentences, never a paragraph, never a tooltip for an error or for information the user needs (use a hint or Banner) |
| Button caption | 24 characters, at most 3 words | a verb or verb plus object, sentence case |
| Label (field, checkbox, radio, tab) | 30 characters | a noun phrase, sentence case, unit in brackets "Width (mm)" |
| Section or card heading | 40 characters | sentence case, no colon |
| Hint, helper text, placeholder | 80 characters | one sentence |
| Status message (inline, toast) | 90 characters | what happened, and the next step if it failed |
| Banner message | 140 characters plus one action | one or two short sentences |
| Dialog message (confirm or alert) | 200 characters | what will happen and whether it can be undone, two sentences at most |
| Dialog title | 40 characters | the action, not the app name |
| Empty state | title 40 and message 100 characters | what is missing and the one action that fills it |

Anything longer is a sign the text belongs in documentation (a link or an About page), not in the control. Keep a one-line hint or Banner in the control and put the explanation behind a "Learn more" link, in an About page or in the docs. A tooltip never carries formatting, line breaks or lists, and never holds text the user needs to proceed: an error, a required step or a warning is a hint, a field error or a Banner, because a tooltip is not seen on touch and only after focus on the keyboard. Test the German string in the layout; do not shorten the English text further to make room. Native: `design check --native` warns about tooltips and texts over the limit (`native-long-tooltip`, `native-long-text`); the web check does not measure text yet.

## When the system lacks something

Do not work around it. Write a proposal: copy `_design-system/proposals/TEMPLATE.md` to `proposals/NNN-name.md`, describe the need, attach a screenshot or markup, and stop. A human accepts or rejects it. Accepted proposals are added to the system and reach every project on the next `design sync`. Until then the UI may use the closest existing component.

**Two adopters or none.** A new shared component or modifier needs two or more adopters with named call sites. A need in one project is met with existing components plus that project's layout classes (`app-*`); only the owner may waive this rule for a single proposal. A proposal that names one project stays pending (deferred) until a second one needs the same thing. A one-off, human-approved exception goes in the project's `design-exceptions.json` (file, rule, reason, `approvedBy`, date); unapproved entries are reported on every check.

## Tokens (public names)

| Group | Names |
|---|---|
| Surfaces | `surface` (page), `surface-muted` (sidebar, insets), `surface-raised` (cards, popovers), `hover` |
| Text, lines | `text`, `text-muted`, `border`, `border-strong`, `overlay` |
| Accent | `accent` (the brand colour: borders, bars, focus, fills' tint), `accent-text` (accent text, links and icons: the brand colour itself, #ff3eb5 for magenta; 2.9 to 3.2:1 on light surfaces, a deliberate exception to AA 4.5:1 for brand consistency, see proposal 043), `accent-solid` (fill of a filled control), `on-accent` (text on that fill), `accent-hover`, `accent-solid-hover`, `accent-soft`, `focus` |
| Status | `success`, `warning`, `error`, `info`, each as `-text`, `-bg`, `-border`; plus `error` (solid fill, used by the danger button) and `on-error` (text on it) |
| Scales | `space-{0,1,2,3,4,6,8,12,16}`, `radius-{sm,md,lg,xl,full}`, `font-size-{xs,sm,base,lg,xl,2xl,3xl}`, `tracking-{tight,normal,wide,wider}`, `fluid-{display,section}`, `opacity-{disabled,busy}`, `density-{x,y}`, `weight-{regular,medium,semibold}`, `leading-{tight,normal}`, `duration-{fast,base,slow,slider,reveal}`, `ease`, `font-sans`, `font-mono`, `shadow-{sm,md,lg}`, `z-{sticky,overlay,modal,tooltip,toast}`, `layout-{sidebar,rail,topbar,control,control-sm,modal-sm,modal,modal-md,modal-lg,menu,prose,prose-wide,aside}` |
| Selection, charts, terminals | `selected`, `selected-hover`; `chart-1..8` (categorical), `chart-seq-1..6`, `chart-div-*` (palettes `chart-seq-<name>-1..6`, `chart-div-<name>-1..7`: Colour page), `chart-grid|axis|label|muted`; `terminal-*`, `ansi-*` (JSON exports `chart-theme.json`, `xterm-theme.json` for d3 and xterm.js) |

All are written `var(--<name>)`.

## Native apps (Rhino/Eto plugins, Grasshopper, WinForms/WPF, tkinter)

There are no CSS classes natively. Native code gets the same tokens, a compact density tier, and for Eto/Rhino an Eto component kit and a Grasshopper canvas mapping. Browse it on the docs site (Native (Rhino) section). Windows only for now; the kit compiles against the Rhino 8 assemblies but has not been run inside Rhino yet.

Get it into a project (run `node tools/design.mjs build` first; sync reads `dist/` and exits 2 on a stale one):

```
node tools/design.mjs sync <project> --native [--namespace=<Root>] [--public] [--no-gh] [--no-kit] [--dist=<dir>]
```

It writes `<project>/design-system/native/`: `DesignTokens.cs` (generated, plain C#; internal types unless `--public`), `design_tokens.py`, the kit sources `eto/` (Eto controls, theme, Rhino host bridge) and `gh/` (Grasshopper canvas, left out with `--no-gh`), `KIT_VERSION` and `LICENSE-lucide.txt` (the built-in `Glyphs` are Lucide paths: keep the notice), plus, next to `native/`, the Inter font with its licence, `tokens.resolved.json`, `VERSION` and this file. The root namespace `Design` is rewritten to `<Root>`; the default is `<ProjectFolder>.Design` (the Grasshopper add-in folder gives `GrasshopperAddin.Design`, so pass `--namespace=StrAi.Design`). Add the files to the project; never edit them there (they are overwritten by the next sync). The kit needs references to RhinoCommon, Rhino.UI and Eto, and for `gh/` also Grasshopper and System.Windows.Forms (`net7.0-windows`).

Rules for Eto/Rhino UI (the same ones `design check --native` flags):
- No hard-coded colour, font or spacing number. Read them from the kit: `DesignTheme.Palette`, `Overlay.*` (alpha overlays), `Metrics.*` (density-aware sizes), `TextStyles.*` (the one font switch point), `Layouts.*` (token spacing), `DrawingTheme` (colours and fonts for `Drawable.Paint`).
- Rhino owns backgrounds and text colour of standard Eto controls (`form.UseRhinoStyle()` through `RhinoHost.Apply(window)` on top-level windows only). The design system owns accent, status colours, spacing, type, radius and component shapes. Custom-drawn surfaces use alpha overlays over the host background; never assume the host panel colour.
- Call `RhinoHost.Configure(accent, density)` once at plug-in start. Read the theme in constructors (Rhino 8 rebuilds hidden panels when shown); Rhino raises `Rhino.UI.ThemeSettings.ThemeChanged` (see native/PLAYBOOK.md, section 5). Controls implement `IThemed.ApplyTheme()`; long-lived windows compare `DesignTheme.ThemeStamp`.
- Use the kit controls before writing your own: `DesignButton`, `IconButton`, `TextField`, `DesignDropdown`, `DesignCheckbox`, `Card`, `DesignDivider`, `Section` (collapsible), `FormField`, `PanelShell` (tabs), `DialogShell`, `DesignTable`, `DesignSurface`, `Badge`, `Banner`, `StatusLine`, `StatusDot`, `EmptyState`, `Progress`, `BusySpinner`, `ToastHost`, `Tip`, `ChatBubble`, `Composer`, `CodeBlock`, `ChatRow`; Grasshopper: `CanvasTheme`, `PaletteScope`, `DesignComponentAttributes`, `CanvasDraw`. API: `native/API.md`; one spec per component in `native/spec/`. Panel structure, status and error patterns, theme refresh, accessibility limits and tooltip rules: `native/PLAYBOOK.md` (read it before building a panel).
- Missing a component or token? Same rule as the web: write a proposal (`proposals/TEMPLATE.md`), ask the human.

```csharp
RhinoHost.Configure("magenta", Density.Compact);                 // once, at plug-in start
var banner = new Banner(Tone.Warning, "Model not saved");
var save = new DesignButton("Save", ButtonVariant.Primary);
```
```python
from design_tokens import palette, SPACE, FONT_SIZE               # tkinter and other Python UIs: tokens only
c = palette("dark", "magenta")                                    # alpha colours are flattened onto the surface
```

Lint: `node tools/design.mjs check <project> --native [--strict] [--verbose]` scans `.cs` files for `native-hardcoded-color`, `native-hardcoded-font`, `native-hardcoded-spacing`, `native-system-drawing`, `native-long-tooltip` and `native-long-text` (string literals over the "UI text length" limits), `native-ascii-ellipsis` (three ASCII dots in UI text: use the single character `…`) and `native-please-in-ui-text` (the word "please": state the action). It warns (exit 0) by default; `--strict` exits 1. Exceptions go in the project's `design-exceptions.json` and only count with `approvedBy`; there is no inline marker.

Known limits: contrast of solid fills follows the accent tokens (Primary meets 4.5:1 for all four accents; dark blue and orange are right at 4.5, see native/API.md Known contrast); fonts (system font today) and icons (built-in `Glyphs` today) wait for spikes; chat-shaped WebView panels (offline, local assets) are specified (proposal 107) but not built. Web panels inside Rhino/.NET plugins are web pages and use the normal CSS system.

## Email (HTML emails: `design email`)

Mail clients drop classes and CSS variables, so an email cannot use the web CSS. Write the email in `<name>.email-src.html` with the `email` classes (`email`, `email__preheader`, `email__card`, `email__brand`, `email__title`, `email__text`, `email__muted`, `email__button`, `email__footer`; one per element, the example is `STR-AI/supabase/templates/recovery.email-src.html`) and run `node tools/design.mjs email <src> <out.html>`. The tool reads the tokens from `dist/` (colours of the chosen `--theme` and `--accent`, translucent tokens flattened to solid colours, radius, spacing, type, weights, tracking) and writes table-based HTML with literal inline styles and a `design-email: generated` marker. `design check` accepts inline styles in a marked file and skips `*.email-src.html`; hand-written inline styles in any other file still fail. After a token change run the command again; `--check` fails when the output is stale. Light theme only (no dark mode in mail). Outlook ignores border-radius and shows square corners; that is fine.

## Commands (run from `Projects/_design-system`; `node tools/design.mjs` prints the full list)

- `build` rebuilds `dist/` (`components.json` is generated: edit `manifest/core|app/<name>.json`, see `manifest/README.md`). `sync <project> [--no-react | --native] [--app] [--docs] [--no-rules]` copies `dist/` into `<project>/design-system/`, plus PLAYBOOK, REVIEW and the brief template, and installs the agent-rules block between the `design-system:rules` markers of the project's AGENTS.md or CLAUDE.md (text outside the markers is never touched).
- `check <project>` lints against the rules above (blocks the build); `check <project> --ratchet` is for a project that is not clean yet: `design-baseline.json` (violations per file), new and edited code must be clean, never raise it by hand (`--write-baseline` only lowers; `--force` needs a human); `--native` has `design-native-baseline.json`.
- `review <project> [--page <name> | --url=<a>,<b>]` opens pages at 390/768/1280 px, saves screenshots to `.design-review/` and reports layout FAIL/WARN (title-bar share, canvas share, wrapped row actions, targets, contrast, ...). Not part of `check` yet. Needs Chrome. See REVIEW.md.
- `docs` / `preview [port]` (docs site, http://127.0.0.1:9100/), `npm run dev` (build, docs, reload), `a11y`, `manifest [--strict]`, `status [--sync]` (adopters and ratchet state), `typecheck`, `icons [words]`, `email <src> <out>`.

Source of truth for humans: this file. For tools: `components.json` (here: both tiers; in a synced project `components.json` is core and `components.app.json` the app tier) and `dist/tokens.resolved.json`. Authoring components: `manifest/README.md`.
