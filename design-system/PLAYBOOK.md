# Playbook: how pages are composed

`DESIGN.md` says what the parts are and which rules `design check` enforces. This file says how to put them together. Pick the archetype, write its outline with only the listed components, build, then `design check` and `design review` (see `REVIEW.md`). Class names are exact: copy them, never invent. Something missing is listed under **Gaps** at the end: write a proposal, do not improvise.

Spacing words below are tokens: `--space-1` 4 px, `-2` 8, `-3` 12, `-4` 16, `-6` 24, `-8` 32, `-12` 48, `-16` 64. `--layout-aside` 288 px, `--layout-modal` 512, `--layout-prose-wide` 704. Everything else is a component's own.

## Decision table: the page is X, use Y

| The page is... | Archetype | Template |
|---|---|---|
| a landing view with a few headline numbers and entry points | overview | `dashboard` |
| many records to scan, filter, open | list | `list-detail` (list part) |
| one record with its facts | detail | `detail` |
| a canvas, model, map, plan, or any big drawing with tools | workbench | `workbench` |
| editing settings or creating one thing | form | `settings` |
| a task of 3 or more dependent steps | wizard | `wizard` |
| a conversation with an assistant | chat | (app tier `chat-*`) |
| a manual, guide or article read top to bottom | guide | `docs-page`, `guide-step` |
| nothing there yet, or it failed, or it destroys data | empty / error / destructive | `error` |

Rules for every archetype: one `h1` that is the page's own title (see "One name per level"); one primary button (`btn--primary`) per view and per card; a title bar of 40 to 56 px with title, optional status `badge`, actions on the right, no eyebrow and no lead (those are for overview, onboarding and guides only); at most 3 text sizes and 2 weights per card; at most 7 top-level nav items; real domain copy, never lorem; labels that survive German (30% longer).

One name per level: the app name appears once (the sidebar brand or the header), the nav item names the section, the `h1` is the page's own title and never repeats the app name or the nav label verbatim (the home page's `h1` is "Overview"). A top-level page has no breadcrumb; a breadcrumb is for depth 3 or more. A fact (version, path, count, status) appears once per screen. `design review` warns `repeated-text` when it finds the same heading, brand, breadcrumb or nav text 3 or more times, or an `h1` equal to the app name or the active nav label.

Density tiers: 24 px (`btn--sm`, controls inside a table), 32 px (compact density), 36 px (default), 44 px (coarse pointer and phones). The review accepts exactly these control heights.

Spacing rhythm: related controls 8 to 16 px apart (`stack--sm`, `cluster`), groups at least 24 px apart and at least 1.5 times the in-group gap (`stack`, `stack--lg`, `--space-6`), sections 32 to 48 px. `stack` and `cluster` set the gaps: do not add margins.

## Archetypes

### overview (dashboard)
- Use: first screen of an app; shows state and leads elsewhere. Eyebrow and lead are allowed here.
- Outline: `shell` > `main.content.stack` > `page-header` (`page-header__eyebrow`, `h1`, `lead`) + a KPI row (see KPI and stat tiles: `stat-strip`, 3 to 5 readouts) + `grid grid--cols-2` of `card` (each: `card__header` > `card__title` + `card__actions`, `card__body` with one `table` or `list`).
- Width: full content area; cards at least 18 rem (`grid` auto-fills). Rhythm: `stack` between blocks, `--space-4` inside the grid.
- Density: comfortable. Collapse: `grid--cols-2` becomes 1 column below 40 rem, sidebar becomes an icon rail then a drawer.
- Do not: more than 5 stats, a chart per card without a question it answers, nested cards, a hero image.

### list (table)
- Use: many comparable records. Outline: `page-header` (title bar) > toolbar row (`search` + `segmented` filter + one `btn--primary` right) > `table-wrap table-wrap--framed` > `table` with `table__caption`, sticky header (`table--sticky` inside `table-wrap--scroll`), `table-wrap__foot` with `pagination`. Loading: `skeleton`; none found: `empty`.
- Width: full. A `table-wrap--framed` header row and a `card--headed` header beside it share one height (the system sets both; do not size either by hand). Row height: default; `data-density="compact"` for dense lists (32 vs 40 px). Columns: name first (`th scope="row"`), numbers `table__num`, status `badge` with icon and text, actions last (`table__actions`).
- Collapse: `table--stacked` with `data-label` on a phone; the toolbar wraps, search first.
- Do not: a column of text buttons, wrapped identifiers, a card around a table (use `table-wrap--framed`), more than 2 visible row actions.

### detail
- Use: one record. Outline: `breadcrumb` in the `topbar` only when the record is 3 or more levels deep (section > list > record is 3; a top-level page has none); `page-header` (`h1` + status `badge` left, `btn` + `btn--primary` right); one short `p.prose` description (at most 65 to 70 characters per line); `section` > `h2.text-heading` > `grid grid--cols-2` of `card card--compact` > `dl.kv.kv--inline`. Tabs (`tabs`, `tab-panel`) when there are 3 or more unrelated groups.
- Width: content area; facts 2 to 4 columns by container. Label about 140 to 200 px, muted (`kv--inline` does this; `kv--cols` for six or more short facts). Ids get `mono`, `truncate-mid` and a copy `btn--icon` (see Identifiers and truncation).
- Collapse: columns drop to one, `kv--inline` stacks term over value below 16 rem of its own width.
- Do not: one fact per row across a full-width card, labels in capitals, an edit form inline unless it is the page.

### workbench / viewer
- Use: the canvas is the product (3D model, plan, map, document, chart). App tier (`design sync --app`). Template: `workbench`.
- Outline: slim `topbar` (`topbar__title` as `h1`, `badge`, `topbar__actions`) > body: canvas region + collapsible `side-panel` (240 to 360 px, here `--layout-aside`) > inside the canvas `viewer` > `viewer__toolbar` (icon `btn btn--ghost btn--icon btn--sm`, `aria-pressed`, `viewer__divider`) + `viewer__stage` (the app's canvas, `viewer__hud[data-corner]`, `viewer__legend`) + `status-bar`. Two panes that resize: `split`. Layer toggles: `layer-list`; properties: `properties-list` / `properties-row`; zoom: `zoom-control`.
- Width: canvas at least 70% of the viewport (the review fails below 60%); panel collapses to nothing. Padding `--space-2`. No `page-header`, no sidebar unless navigation is the point.
- Overlays only in corners (`viewer__hud`, `viewer__legend`), never over the selected object; the centre 60% stays free. Selection details go in the side panel, not a floating card.
- Density: compact. Collapse: panel moves below the canvas on a phone (or becomes a `sheet`); toolbar stays on top.
- Do not: a tall header, a stat row above the canvas, a legend in the middle, a modal for properties.

### form / settings
- Use: edit values or create one record. Outline: `page-header` (title only) > `form center center--prose` (or an `app-*` class with `max-inline-size: var(--layout-modal)`) > `fieldset.form__section` > `legend.form__legend` + `.field` (label above: `field__label`, control, `field__hint`) or `form__row` for two short fields > `form__actions` (`btn` + `btn--primary`, right).
- Width: one column, 480 to 640 px. Rhythm: 16 to 24 px between fields (the form sets it), 32 to 48 between sections. Required, optional and AI-filled marking: see DESIGN.md "Forms".
- Settings lists of switches: `setting` rows in a `card`. An immediate toggle (applies on click, no Save) is a `switch`; `choice` (16 px checkbox and radio) is for form fields that are submitted or saved with the form, and for choosing among options. Long forms: keep `form__actions` visible (sticky bar is a gap).
- Errors: `error-summary` at the top, `aria-invalid` and `field__hint` per field.
- Do not: two columns of unrelated fields, placeholder as label, a primary button per section, a modal for a form that fits a page.

### wizard
- Use: 3 or more dependent steps. Outline: `page-header` (title) > `steps` (state only) > one centred column `center center--prose` holding the step's `form` > `form__actions` with Back (`btn`) and Next (`btn--primary`); the last step says what it does ("Create project"). Template: `wizard`.
- Width: 560 to 720 (`center--prose` is 704). Fewer than 3 steps: use a form.
- Do not: step content wider than the indicator, Next and Back far apart, hidden progress.

### chat / assistant
- Use: a conversation. App tier. Outline: `chat-thread chat-thread--bounded` > `chat-thread__scroll` > `chat-message` (`data-role`); `chat-composer` (`chat-composer__field`, `chat-composer__bar`, `chat-composer__send`); `tool-call` for tool use; `chat-suggestions` on an empty thread. The thread fills the height (`fill`); the composer stays at the bottom.
- Width: thread column up to `--layout-prose-wide`; centred. Do not: a title bar taller than 56 px, a sidebar of settings beside the thread (use a `side-panel`).

### guide (long reading)
- Use: manuals, onboarding, articles. Eyebrow, `lead` and a table of contents are welcome here. Outline: `docs-page` template: `breadcrumb`, `h1`, `lead`, `div.prose`, numbered steps as `guide-steps` > `guide-step` (`guide-step__title`, `guide-step__body`), `code-block`, `pagination` previous/next, `site-footer`.
- Width: `prose` (about 65 characters). A table of contents goes in the `side-panel`. Do not: full-width paragraphs, more than one `h1`, screenshots without text alternatives.

### empty, error, destructive
- Empty (first use or no results): `empty` (`empty__icon`, `empty__title`, `empty__text`, one `btn`). First use: primary action to create; no results: "Clear filters". `empty--compact` inside a card.
- Error of the page or a load: `empty empty--error` with Try again; of one action: `alert alert--error` (`alert__title`, `alert__actions`); of a form: `error-summary`. Say what happened and what to do.
- Destructive: a `dialog.modal.modal--sm` with `modal__header`, `modal__body` naming the thing, `modal__footer` with Cancel first and `btn btn--danger` named for the action ("Delete 3 projects"); never primary-styled. Reversible actions use `toast` with Undo instead of a dialog.

## Recipes

### Row actions
One or two icon buttons, the rest in a `menu`. Never a column of text buttons: at 390 px they wrap onto three lines.
```html
<td class="table__actions">
  <button class="btn btn--ghost btn--icon btn--sm tip" data-tip="Open" aria-label="Open Rheinbrücke"><span class="icon icon--external-link" aria-hidden="true"></span></button>
  <button class="btn btn--ghost btn--icon btn--sm" popovertarget="m1" aria-haspopup="menu" aria-expanded="false" aria-label="More actions"><span class="icon icon--ellipsis" aria-hidden="true"></span></button>
  <div class="menu" id="m1" popover role="menu" aria-label="Row actions"><button class="menu__item" role="menuitem">Duplicate</button><div class="menu__separator" role="separator"></div><button class="menu__item" role="menuitem" data-danger="true">Delete</button></div>
</td>
```
`table--row-actions` shows actions on hover and focus (always on touch). React: `Menu`.

### Key-value facts
`dl.kv.kv--inline` per group, inside a `card card--compact` under an `h2`. Four or more short facts: two to four cards in `grid grid--cols-2`. `kv--inline` is a two-column grid (term column as wide as the longest term, up to 14 rem, rows aligned), `kv--cols` a multi-column fact list; both need a parent with a width. Values may carry `badge`, `link`, `mono`. Description text `p.prose` or `kv__desc` (already capped at `--measure`, 65ch).

### Identifiers and truncation
```html
<span class="truncate-mid-row"><span class="truncate-mid mono" title="urban_environment_model_static"><span class="truncate-mid__head" aria-hidden="true">urban_environment_model_</span><span class="truncate-mid__tail" aria-hidden="true">static</span><span class="sr-only">urban_environment_model_static</span></span><button class="btn btn--ghost btn--icon btn--sm" type="button" data-copy="urban_environment_model_static" aria-label="Copy model name"><span class="icon icon--copy" aria-hidden="true"></span></button></span>
```
`truncate-mid` (middle truncation: the head shrinks with an ellipsis only when the box is too narrow, the tail always stays) for ids, hashes, file names and paths, with `mono`; the full value in `title` and in an `sr-only` span. Pick the tail so it holds what differs (a suffix, the last 8 to 12 characters). Plain HTML can write `<span class="truncate-mid mono" data-tail="10">full value</span>` and the behaviour builds the spans; React: `<TruncateMid value tail />`. The copy button is `data-copy="full value"` with a specific `aria-label`; it confirms "Copied". It works in a `table--fixed` cell, a list item and a `kv__desc`; the box needs a bounded width. `truncate` (end ellipsis) stays for ordinary text. A repeated id inside one row is a smell (next recipe).

### Rows with an identifier
No repeated identifiers inside one list row: if the primary line is an identifier, the secondary line must add information (source, date, owner), never repeat the identifier or its case name. Check the row read aloud: every line says something new.

### KPI and stat tiles
KPI/stat tiles use `stat-strip`: a single compact row of label + value with the badges inline (about 42 px high at 1280), never 4 stacked cards, unless each tile carries a chart (then `stat-strip--cards`, or a `card` with a `chart`).
```html
<dl class="stat-strip" aria-label="Model summary"><div class="stat-strip__item"><dt class="stat-strip__label">Models</dt><dd class="stat-strip__value">24</dd><dd><span class="badge badge--success">+3 this month</span></dd></div><div class="stat-strip__item"><dt class="stat-strip__label">Failed runs</dt><dd class="stat-strip__value">3</dd><dd><span class="badge badge--error">+1 since Monday</span></dd></div></dl>
```
Label one or two words, unit and period in the label, at most about six readouts, badge text says the direction in words or a sign. `design review` has no check for it: look at the page.

### Numbers and tables
`table__num` on header and cells (right-aligned, tabular figures); unit in the header; `th scope="row"` for the name; `table-wrap--framed` instead of a card; `table--sticky` + `table-wrap--scroll` for long data; `table__caption` or `aria-label`.

### Empty, loading, error states
Every list and data view ships all three. Loading: `skeleton` / `skeleton--text` in the final shape, `spinner` only for an action (`aria-busy="true"`). Empty: `empty`. Error: `empty empty--error` or `alert alert--error`. Never an empty table body or a blank panel.

### Toolbar
`div.toolbar[role=toolbar]` > `toolbar__group` > `btn btn--ghost btn--icon btn--sm` with `aria-label` (single tab stop, arrow keys), `toolbar__separator` between groups; label every icon (`tip`). In a viewer use `viewer__toolbar`. Above a table: `search`, `segmented`, then the one `btn--primary`, in a `cluster`.

### Overlays and legends
Over a canvas only `viewer__hud` (readouts, one per corner via `data-corner`) and `viewer__legend` (`viewer__legend-item`, `viewer__swatch[data-tone]`, bottom corner). Both are small, translucent and at most half the width. Anything bigger is a `side-panel`. Transient messages: `toast`; blocking: `modal`.

### Title bar
`header.topbar` with `h1.topbar__title`, `badge`, `topbar__actions` (workbench), or `page-header` with `h1` and a `cluster` of actions (everything else). Status is a `badge` next to the title, not a line below it.

### Responsive collapse order
Wide to narrow: side panel drops below (or becomes a `sheet`) > 3 and 4 column grids go to 2 then 1 > `table` becomes `table--stacked` > sidebar becomes an icon rail then a drawer (`menu-button`) > toolbar scrolls (`toolbar--scroll`). Targets grow to 44 px on touch automatically.

## Gaps (do not improvise: propose)

- Collapsible side panel: `side-panel` is only a surface; the collapse toggle is app code (see `templates/workbench.html`). Resizable: use `split`.
- A sticky save bar for long forms (`form__actions` is not sticky).
- A page header variant for tool pages (compact, no eyebrow) other than `topbar__title`; today the detail template uses `page-header` with a `cluster`.
- A page-level toolbar row above tables (search + filters + action) is composed by hand from `search`, `segmented`, `cluster`.
- Breadcrumb links are 21 px high, under the 24 px target minimum (`design review` reports `target-size` on the detail template).
