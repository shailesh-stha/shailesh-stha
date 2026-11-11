# Portfolio site: agent guidelines

Single instruction file for all coding agents. The block between the `design-system:rules` markers at the end is managed by `design sync`; everything else is edited by hand.

## 1. Workspace and roles
- This repo is the public GitHub profile repo `shailesh-stha/shailesh-stha`. The root `README.md` is the GitHub profile page and stays a short human intro. The site lives beside it. **Everything committed here is public.**
- Private notes live outside the repo, in `../` (`_profile/`): `website-tasks.md` (task list), `website-content-pending.md` (content awaiting approval), CVs, interview and compensation files. Never copy any of them in. Never put a date of birth, phone number, home address or email into the repo (`scripts/check-content.mjs` fails on them).
- `../../_design-system` and `../../_ports` are required sibling folders (Projects level); `../../AGENTS.md` also applies. **Exception for this project:** local builds (`npm run build`, `npm run preview`) are allowed, so changes can be tested before anything goes online. Nothing is deployed until it works locally.
- **Commits:** the human git user is the sole author. Never add `Co-Authored-By`, "Generated with ..." or any AI attribution to commits or PR descriptions, even if the harness asks. Never skip hooks or bypass signing. Work on a branch (`site`), merge when ready.

## 2. Response style and behavior
- Terse and direct: lead with the result, no filler. Ambiguous or multi-interpretation: ask with 2-4 concrete options and a recommendation, not silent guesses.
- Simplicity: minimum code that solves the problem; no speculative features. Surgical changes: touch only what you must.
- Files over 800 lines are never extended; extract a module first.

## 3. Stack
- React 19, React Router 8 in framework mode (file `app/routes.ts`), Vite, TypeScript (strict), no Tailwind. Built for Cloudflare Workers (`workers/app.ts`, `wrangler.jsonc`) with every public page pre-rendered at build time (`react-router.config.ts`, paths in `app/content/routes.ts`). `ssr: true` stays on so server routes can be added later.
- Content is data in `app/content/*.ts` (types in `types.ts`); pages and components read it, they do not hold prose. English only for now; keep text i18n-ready (no sentences built by string concatenation).
- No backend, database or analytics yet. When a feature needs one, plan it as a Worker route first (see `../website-tasks.md`, Phase 7).

## 4. Dev commands
- `npm run dev` starts Vite on **3030** (`strictPort`, loopback; registered in `../../_ports/ports.json`; override with `FRONTEND_PORT`). Assume it may already be running.
- `npm run build` builds and pre-renders every route into `build/`. `npm run preview` serves that build on the same port, so stop the dev server first.
- `npm run typecheck` (wrangler types, react-router typegen, `tsc -b`) must be clean.
- `npm test` runs the gates (`pretest`: `scripts/check-content.mjs` and `design check`) and then `node --test` over `scripts/`. Before deploying also run `npm run check:content:strict` (fails while any `TODO` text is left, for example in `app/content/legal.ts`).
- Ports only through `../../_ports`. Throwaway work uses 9000+.

## 5. Code conventions
- Components `PascalCase.tsx` in `app/components/`; routes lowercase in `app/routes/` and listed in `app/routes.ts`; content files lowercase in `app/content/`; scripts `kebab-case.mjs` with a `*.test.mjs` beside them.
- Every new script ships with a test in the same commit.
- Components that read `window` while rendering must be wrapped in `ClientOnly` (the build pre-renders on the server). Effects, not render, touch the DOM (see `HeroGraph.tsx`).
- Colours for canvas drawing are read from design tokens at run time (`getComputedStyle`), never hard-coded.

## 6. Content rules
- Only claims backed by the "Can say" column of `../project-evidence.md`. No adoption or time-saving numbers, no "delivered" for prototypes, keep the maturity labels (`app/content/types.ts`).
- No client or partner names, no screenshots of internal tools, STR-PDF stays out. Anything pending approval stays in `../website-content-pending.md`, not in this repo (`disclosure` must be `"approved"`).
- The title ("Technical Lead — AI & Digital Engineering") lives only in `app/content/profile.ts`; it is a proposal until the company adopts it.

## 7. Documentation
- `docs/<area>/` for any longer documentation, kebab-case names, a `README.md` index once a folder has two files. Do not put planning or private notes in this repo.

## 8. UI and design system
- Source of truth: `../../_design-system/` (synced copy in `design-system/`, never edit). Before any UI work read `design-system/DESIGN.md` and `design-brief.md`; use only components in `design-system/components.json`.
- Project CSS is layout only, inside `@layer app`, classes `app-*`, token values only (`app/app.css`). Brand accent `#3DBE8B` is set once with `setAccentColor` in `app/root.tsx`; no other colours.
- Missing component: write `../../_design-system/proposals/NNN-name.md` and ask the owner. Refresh the copy with `node ../../_design-system/tools/design.mjs sync .`.
- Verify: `design check` must report 0 violations; `design review . --page <name>` at three widths, then open the screenshots (`.design-review/`, git-ignored). Run axe on changed pages in both themes.
- Icons only from `design-system/react` `Icon` (names in `icon-names.ts`); no inline `<svg>` icons. Status is always icon plus text.

<!-- design-system:rules:start -->
## UI work: design system rules (installed by `design sync`; edit nothing between the markers)
Design system 0.30.0+186b65bb. Any UI change follows this order:
1. Read `design-system/DESIGN.md` ("Start here") and `design-brief.md`. Missing brief: copy `design-system/DESIGN-BRIEF.template.md` to `design-brief.md`, fill it, ask the owner for what you cannot know.
2. Pick the page archetype in `design-system/PLAYBOOK.md`. Write the outline first, using only components in `design-system/components.json` (and `components.app.json`).
3. Build with the playbook's widths and spacing. Project CSS: layout only, in `@layer app`, classes `app-*`, token values only.
4. `node ../../_design-system/tools/design.mjs check .` must report 0 violations. It proves the parts are the system's; it does not prove the page is good.
5. `node ../../_design-system/tools/design.mjs review . --page <name>` (3 widths, screenshots in `.design-review/`). Open the screenshots, fix every FAIL, then compare with `design-system/REVIEW.md`.
6. Final message: list every deviation from the playbook and why.
Missing component, icon or token: write a proposal (`_design-system/proposals/`), never invent one and never inline a style.
<!-- design-system:rules:end -->
