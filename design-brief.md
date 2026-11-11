# Design brief: personal portfolio site

1. **Users and task:** recruiters, hiring managers and engineers at AI and engineering firms (mostly Germany). They come once or twice to judge what I build and how far it has come, then to open the CV or reach me. Phone first, desktop second.
2. **Pages and archetypes:** `home: intro` (landing: hero, work, skills, experience, education, certifications, contact), `work-detail: detail`, `cv: guide`, `imprint: guide`, `privacy: guide`. Pages for `design review` are in `design-brief.pages.json`.
3. **Key data per page:** home: title, one-line positioning, three work cards with maturity labels, experience dates. Work detail: name, one-liner, maturity labels, stack. CV: roles with dates, degrees, skills.
4. **Primary action per page:** home: View my work. Work detail: none (back link only). CV: none. Imprint and privacy: none.
5. **Density and languages:** comfortable, dark by default, one green accent set with `setAccentColor`. English only for now; German later (labels must survive +30 percent length).
6. **Forbidden:** colours or sizes of our own, inline styles for look, adoption or time-saving numbers, client or partner names, screenshots of internal tools, anything pending approval (see `scripts/check-content.mjs`), a second primary button in a view.
