# Review: is the page good, not just clean

`design check` proves a page is made of the system's parts. It cannot see a bad layout. Review is the second gate: measure, then look.

## Run it

```
node <path>/_design-system/tools/design.mjs review <project> --page <name>      # a page listed in design-brief.pages.json
node <path>/_design-system/tools/design.mjs review <project> --url=http://127.0.0.1:5174/model --kind=workbench
```

It opens each page at 390, 768 and 1280 px (Chrome through playwright-core, already a dependency of the system), saves full-page screenshots to `<project>/.design-review/<page>-<width>.png` (the folder ignores itself), and prints FAIL and WARN lines with a code. Exit 1 on any FAIL (`--strict`: on WARN too). Without Chrome it says so and checks nothing (set `CHROME_PATH`). It is not part of `design check` yet.

## The screenshot procedure (do not skip: the numbers miss things)

1. Open the three PNGs. At each width answer in one line: where does the eye go first, and is that the primary action or the main data?
2. Cover everything except the first 100 px of the 1280 screenshot. Is the page's purpose clear from the title bar alone?
3. Find the largest empty area and the most crowded area. Empty is fine around content; crowded means groups closer than 16 px or a column of wrapped text.
4. At 390 px: no sideways scroll, every action reachable with a thumb, nothing cut off, no mid-word breaks.
5. Switch theme and, for DE/EN products, the language with the longest labels; repeat the first look.
6. Fix, run again. Report each deviation you keep, with the reason.

## The 14 checks (thresholds are in `tools/review-checks.mjs`)

| # | Code | Asks | Limit | Level |
|---|---|---|---|---|
| 1 | `header-share` | Is the title block slim? (`.page-header` or the h1's block) | at most 14% of the viewport height; title bar 40 to 56 px | FAIL (WARN at 390) |
| 2 | `canvas-share` | Does a workbench's canvas dominate? (`.viewer`, `canvas`, `[data-review-canvas]`) | at least 60% of the viewport at 1280 (aim for 70%+) | FAIL |
| 3 | `action-wrap` | Do row actions stay on one line? | 1 line per cell; no wrapped button label | FAIL |
| 4 | `mid-word-break` | Is an id, hash or file name ever split? | a single token of 12+ characters on 1 line; fix with `truncate-mid` (+ `data-copy` button), never by letting it wrap | FAIL |
| 5 | `line-length` | Are paragraphs and `dd` readable? | at most 90 characters per line (aim for 65) | WARN |
| 6 | `h-scroll` | Does the page scroll sideways? | none at any width | FAIL |
| 7 | `target-size` | Can every control be hit? | at least 24 x 24 px; 44 on a phone (`target-size-touch`, WARN; a `switch` is 48 x 44 on touch with the 24 px track unchanged); inline links in text exempt | FAIL / WARN |
| 8 | `control-height` | Do buttons, inputs and selects have a system height? | 24 (only `btn--sm` and controls inside a table), 28, 32, 36 or 44 px | WARN |
| 9 | `off-scale-spacing` | Does project layout use only `--space-*`? (`app-*` classes) | padding, margin, gap on the scale; `auto` margins (`margin-inline-start: auto`) are not spacing | WARN |
| 10 | `type-sizes`, `type-weights` | Is a card typographically calm? | at most 3 sizes and 3 weights per card (title 600, labels 500, body 400 is fine; the warning starts at a fourth weight); the system's own `card__title`, `kv__term` and `kv__desc` are not counted | WARN |
| 11 | `primary-count` | One primary action per region? | at most 1 `btn--primary` per card, dialog, form, section or page | FAIL |
| 12 | `contrast` | Is text readable? | 4.5:1; 3:1 for text at 24 px or 18.66 px bold; the brand accent as text or fill is WARN (system-owned, proposal 043) | FAIL |
| 13 | `nested-cards` | Is a card three levels deep? | max 2 | WARN |
| 14 | `repeated-text` | One name per level? | the same heading, brand, breadcrumb or active-nav text 3+ times on a page, or an `h1` equal to the app name or the active nav label (strings are listed) | WARN |

Also reported: `canvas-missing`, `load` (page did not open), `target-size-touch` (WARN, 44 px on a phone).

## Not measured, so you check by eye

No repeated identifier inside one list row (if the primary line is an identifier, the secondary line adds information such as source or date, never the identifier or its case name again), KPI or stat tiles as one `stat-strip` row with the badges inline, not four stacked cards (unless each tile carries a chart), group spacing (related controls 8 to 16 px apart, separate groups at least 24 px and 1.5 times the in-group gap), at most 7 top-level nav items, real domain copy (no lorem), overlays only in viewer corners and never over the selected object with the centre 60% free, one clear primary action, German label length, empty/loading/error states present.

## Naming rule (`repeated-text`)

One name per level: the app name appears once (sidebar brand or header), the nav item names the section, the `h1` is the page's own title and never repeats the app name or the nav label verbatim (home: "Overview"). Top-level pages have no breadcrumb; a breadcrumb is for depth 3 or more. A fact (version, path, count) appears once per screen. Toggles: immediate on/off is a `switch`; `choice` is for form fields.

## What to do with a finding

Change the structure to the archetype's outline in `PLAYBOOK.md`, not the numbers. Never fix a finding with custom colours, sizes or `!important`. A rule that is wrong for your page is a deviation to report; a missing component is a proposal.
