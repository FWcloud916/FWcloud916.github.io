# FW Blog — Progress

> **Last session:** 2026-07-13 · commit `d69de42` · tests: passing (26/26)

## Now (WIP = 1)

none

## Feature list

| # | Behavior | Verify with | State |
|---|---|---|---|
| 1 | Verification gate: vitest (filter units + content checks + build smoke), wired into CI before deploy | `npm test` | passing |
| 2 | Site generates all pages (posts, tags, feed, llms.txt) without errors | `npm test` (build smoke) | passing |
| 3 | Production build (11ty + Tailwind CSS) completes | `npm run build` | passing |
| 4 | Chinese tags produce valid pinyin URLs (e.g. 工具 → /tags/gong-ju/); colliding/empty slugs fail the build | `npm test` (tests/filters.test.mjs) | passing |
| 5 | RSS feed carries the 10 newest posts (was: 10 oldest once count > 10) | `npm test` (tests/build.test.mjs feed assertion) | passing |
| 6 | Reading time is CJK-aware (Chinese long-form no longer stuck at 1 分鐘) | `npm test` (tests/filters.test.mjs readingTime) | passing |
| 7 | Google Analytics enabled | set `googleAnalyticsId` in src/_data/site.json, then `npm run build` and grep gtag in _site | not_started |

## Done

- 2026-07-13 — Test gate established: vitest (26 tests: lib/filters units, frontmatter content checks, `_site/` build smoke) + `npm test` in CI before deploy. Fixed en route: feed.njk served the 10 **oldest** posts (`reverse | limit` → `limit`), readingTime was space-based and useless for Chinese (now CJK-aware), tag slug collisions/empty slugs now fail the build (`lib/filters.mjs`).
- 2026-07-13 — Documentation bootstrap: AGENTS.md (+ CLAUDE.md symlink), docs/project-overview.md, DESIGN.md, PROGRESS.md; stale-config fixes in README.md, QUICKSTART.md, docs/README.md (doc-architect Mode B).
- `6de29ec` — Post collection/layout wiring fixed; first 5 posts published (1× 2019, 4× 2020).
- `25bdeca` — Dependency refresh: Tailwind v4, eleventy-img v6, RSS v3; CI sharp regression fixed.

## Blockers

none

## Next steps

- Publish remaining posts (commit `6de29ec` says "first 5 posts" — more presumably queued).
- Decide whether to enable Google Analytics (row 7) or remove the dead gtag hook from base.njk.

## Decision log

- 2026-07-13 — Tag slug collisions (case variants, Chinese homophones) and empty slugs **fail the build** with a named-tag error, rather than auto-merging tags — user decision.
- 2026-07-13 — Feed takes `collections.posts | limit(10)` (newest first); reading speed constants: 400 CJK chars/min + 200 words/min (lib/filters.mjs).
- 2026-07-13 — Docs: no domain-models.md (content model lives in [docs/project-overview.md](docs/project-overview.md) §5), no coding-style.md (no linter), no db-observation.md (no datastore).
- (from git history) Tailwind migrated to v4 CSS-based config — see [docs/project-overview.md](docs/project-overview.md) §2.
- (from code) Built-in `slug` filter overridden with pinyin-pro for Chinese tag URLs — see [docs/project-overview.md](docs/project-overview.md) §3 Key Principles.
