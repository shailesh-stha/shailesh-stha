# Design brief: <project name>

Fill this in before building any page. Copy it to `design-brief.md` in the project root. Ask the owner for anything you cannot know; do not guess. Keep it to this page.

1. **Users and task:** who uses it, what they come to do, how often (daily tool or once a month), on which device.
2. **Pages and archetypes:** one line per page: `name: archetype` with the archetype from `design-system/PLAYBOOK.md` (overview, list, detail, workbench, form, wizard, chat, guide). List the pages for `design review` in `design-brief.pages.json` (`[{ "name": "home", "url": "http://127.0.0.1:<port>/", "archetype": "overview" }]`).
3. **Key data per page:** the 3 to 6 facts or columns the user needs first (real names, units, example values, not lorem). Identifiers (ids, hashes, file names) are named here, because they need monospace and truncation.
4. **Primary action per page:** exactly one per view; everything else is secondary or in a menu.
5. **Density and languages:** comfortable or compact (`data-density`); languages (for example DE and EN: German labels run about 30% longer, so no fixed-width buttons or columns).
6. **Forbidden:** what this product must never show or do (for example no marketing hero on a tool page, no modal for something that fits inline, no colour of our own).

Example (one line each):

- Users and task: structural engineers check a member's utilisation, daily, on a 27 inch desktop.
- Pages: `library: list`, `model: workbench`, `member: detail`, `settings: form`.
- Key data: member id (monospace), section, length in m, utilisation in %, load case.
- Primary action: Run analysis (model), Save (settings); none on list.
- Density and languages: compact; DE and EN.
- Forbidden: eyebrow and lead on tool pages, text-button columns in tables.
