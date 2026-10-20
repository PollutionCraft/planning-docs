# Agent guide

This repo is the planning and design source of truth for Pollution Craft. It is an Astro Starlight site; the site is published to GitHub Pages on every merge to `main`.

## Layout

All content is Markdown/MDX in `src/content/docs/`:

- `brief/` — goals, users, scope, acceptance criteria (the what and why)
- `design/` — architecture; `design/decisions/` holds ADRs (`NNNN-title.md`, never renumber, supersede instead)
- `plan/` — roadmap; `plan/tasks/` holds one brief per task (`NNN-title.md`)
- `reference/` — glossary and other lookups

## Conventions

- Every page needs `title` frontmatter. Optional: `status` (`draft | proposed | accepted | superseded`) and `owner`. Treat only `accepted` as authoritative.
- Use relative links; the site is served under a sub-path.
- Update the page in the same change that alters the decision or plan. Do not leave contradictions between pages.
- Sidebar is auto-generated from folders; no manual nav edits needed.

## Commands

- `npm ci` — install
- `npm run dev` — local preview at http://localhost:4321
- `npm run check && npm run build` — what CI runs; run before opening a PR
