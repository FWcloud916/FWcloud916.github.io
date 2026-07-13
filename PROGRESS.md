# FW Blog — Progress

> **Last session:** 2026-07-13 · commit `85da9e5` · tests: passing (45/45)

## Now (WIP = 1)

_Nothing in progress — pick up the next item from "Next steps" below._

## Feature list

| # | Behavior | Verify with | State |
|---|---|---|---|
| 1 | Verification gate: vitest (filter units + content checks + build smoke), wired into CI before deploy | `npm test` | passing |
| 2 | Site generates all pages (posts, tags, feed, llms.txt) without errors | `npm test` (build smoke) | passing |
| 3 | Production build (11ty + Tailwind CSS) completes | `npm run build` | passing |
| 4 | Chinese tags produce valid pinyin URLs (e.g. 工具 → /tags/gong-ju/); colliding/empty slugs fail the build | `npm test` (tests/filters.test.mjs) | passing |
| 5 | RSS feed carries the 10 newest posts (was: 10 oldest once count > 10) | `npm test` (tests/build.test.mjs feed assertion) | passing |
| 6 | Reading time is CJK-aware (Chinese long-form no longer stuck at 1 分鐘) | `npm test` (tests/filters.test.mjs readingTime) | passing |
| 7 | Google Analytics enabled | set `googleAnalyticsId` in src/_data/site.json, then `npm run build` and grep gtag in _site | active (`G-QBS6V0SVT1`) |
| 8 | Technical SEO: canonical, social cards, JSON-LD, sitemap/robots, noindex controls, Search Console hook | `npm test` (SEO build assertions) | passing |
| 9 | AISO foundation: author entity, honest freshness, all-post llms.txt, AI crawler policy, Bing verification, IndexNow, answer-first content clusters | `npm test` + `node scripts/submit-indexnow.mjs HEAD HEAD` | deployed; all external setup steps complete |
| 10 | Bing SEO/GEO scan hygiene: descriptive homepage title/description; every sitemap HTML page has exactly one H1 and `html[lang=zh-TW]` | `npm test` + production sitemap audit | local passing; rescan after deploy |

## Done

- 2026-07-13 — **AISO 基礎建設與內容優化 closed.** Goal: 提升文章在 Google AI features、ChatGPT Search、Bing Copilot 等 AI 搜尋中的可發現性、可引用性與成效可量測性。All scope items complete: author entity／freshness structured data／IndexNow／llms.txt／crawler policy (commit `529eaaf`); Google Search Console, Bing Webmaster Tools and GA4 AI-referral measurement baselines established; social API article rewritten answer-first; Docker cluster refreshed. See entries below for the individual steps and commits.
- 2026-07-13 — GA4 AI referral Exploration built via browser automation: free-form Exploration `AI referral sessions` on the imfw.io property, rows Session source → Landing page + query string, values Sessions + Engaged sessions, regex filter over 7 AI-search hosts, Last 28 days. Auto-saved in GA4 Explore; no matching sessions yet (expected on a low-traffic site). Synced docs/aiso.md.
- 2026-07-13 — Bing Webmaster Tools ownership verified and `https://imfw.io/sitemap.xml` submitted; synced docs/aiso.md and docs/project-overview.md.
- 2026-07-13 — Homepage SEO scan signals improved (`85da9e5`): descriptive `<title>`/description on `/`, matching `WebSite` JSON-LD; added build-smoke test asserting exactly one `<h1>` and `html[lang=zh-TW]` on every sitemap HTML page.
- 2026-07-13 — CI action bump to clear Node 20 deprecation ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)): `actions/checkout@v4→v7`, `actions/setup-node@v4→v6`, `peaceiris/actions-gh-pages@v3→v4` — all now run on Node 24 (v3 was node16). Build Node stays `node-version: '22'`. Synced docs/project-overview.md pipeline note.
- 2026-07-13 — Google Search Console ownership verified through DNS and `/sitemap.xml` submitted; HTML-meta token is intentionally unnecessary.
- `529eaaf` — AISO local implementation: author/freshness structured data, Bing verification, IndexNow, complete llms.txt, crawler policy, AISO runbook, social API rewrite, and refreshed Docker topic cluster (44/44 tests).
- 2026-07-13 — Google Analytics (GA4) enabled: set `googleAnalyticsId` in [src/_data/site.json](src/_data/site.json) (current ID `G-QBS6V0SVT1`; initially `G-H39765SSFE`, swapped same day); the pre-existing conditional gtag hook in `base.njk` now emits on every page (verified in `_site/index.html`). Synced docs/project-overview.md (§1.2, §1.3, integrations table).
- 2026-07-13 — Technical SEO completed: canonical and robots metadata, Open Graph/X cards, `WebSite`/`BlogPosting` JSON-LD, automatic legacy-post descriptions, 1200×630 default social image, `/sitemap.xml`, `/robots.txt`, Search Console hook, and build coverage.
- 2026-07-13 — Test gate established: vitest (26 tests: lib/filters units, frontmatter content checks, `_site/` build smoke) + `npm test` in CI before deploy. Fixed en route: feed.njk served the 10 **oldest** posts (`reverse | limit` → `limit`), readingTime was space-based and useless for Chinese (now CJK-aware), tag slug collisions/empty slugs now fail the build (`lib/filters.mjs`).
- 2026-07-13 — Documentation bootstrap: AGENTS.md (+ CLAUDE.md symlink), docs/project-overview.md, DESIGN.md, PROGRESS.md; stale-config fixes in README.md, QUICKSTART.md, docs/README.md (doc-architect Mode B).
- `6de29ec` — Post collection/layout wiring fixed; first 5 posts published (1× 2019, 4× 2020).
- `25bdeca` — Dependency refresh: Tailwind v4, eleventy-img v6, RSS v3; CI sharp regression fixed.

## Blockers

- None currently open.

## Next steps

- Publish remaining posts (commit `6de29ec` says "first 5 posts" — more presumably queued).
- Monitor Search Console sitemap processing and indexing results; no repository change is required.

### SEO / AI-SEO improvement backlog (2026-07-13 audit, not started)

Three-agent audit found the machine-readability foundation (JSON-LD, llms.txt,
robots + OAI-SearchBot, IndexNow, sitemap, canonical/OG, CJK reading time) is
strong and test-guarded. Remaining gaps, prioritized:

**Tier 1 — quick technical wins (test-safe):**
1. Favicon set + `theme-color` (none exist today)
2. `BreadcrumbList` JSON-LD + breadcrumb UI (biggest structured-data gap)
3. Heading anchor IDs via `markdown-it-anchor` (AI engines can only cite whole pages today, not sections)
4. Resource hints (`preconnect` googletagmanager, `preload` main CSS, skip Prism CSS on code-free pages)
5. Backfill `description`/`updated` on the one orphan post (`2019-03-19-nvm-install.md`)

**Tier 2 — AI-answer-engine structured data:**
6. `FAQPage`/`HowTo` schema (frontmatter-driven) — Docker guide and comparison posts qualify but aren't marked up
7. `BlogPosting` publisher → `Organization` + logo; `image` → `ImageObject`
8. `llms-full.txt` full-text companion to the existing index-only `llms.txt`
9. Strengthen author `sameAs` (only GitHub today — needs user-supplied profile URLs)

**Tier 3 — discovery, linking & content depth:**
10. Related-posts module; pull orphan posts (nvm, social-platform-apis) into a link cluster
11. Full `/archive/` page + optional on-site search (Pagefind) as content grows
12. Unique (non-templated) tag-page descriptions
13. **Content volume/breadth is the dominant weakness** — only 7 posts across ~2 topics (6 Docker + 1 API + 1 orphan). Not a code task; consider a second pillar cluster to match the Docker hub-and-spoke.

Test constraint: `tests/build.test.mjs` asserts exact robots.txt bytes, JSON-LD shapes, and the one-`<h1>` rule — any future implementation above must update the matching assertion in the same commit.

## Decision log

- 2026-07-13 — Bing scan's “Meta Language tag missing” is not remediated with `meta http-equiv="content-language"`: HTML Living Standard marks that pragma non-conforming and recommends the existing root `<html lang="zh-TW">`. Production audit found one H1 and the correct `lang` on every sitemap HTML page; stale scan results should be rerun after deployment.
- 2026-07-13 — Tag slug collisions (case variants, Chinese homophones) and empty slugs **fail the build** with a named-tag error, rather than auto-merging tags — user decision.
- 2026-07-13 — Feed takes `collections.posts | limit(10)` (newest first); reading speed constants: 400 CJK chars/min + 200 words/min (lib/filters.mjs).
- 2026-07-13 — SEO descriptions prefer frontmatter, fall back to a normalized 160-character article excerpt, then the site description; social images prefer per-post `socialImage`, then `site.socialImage`.
- 2026-07-13 — Docs: no domain-models.md (content model lives in [docs/project-overview.md](docs/project-overview.md) §5), no coding-style.md (no linter), no db-observation.md (no datastore).
- (from git history) Tailwind migrated to v4 CSS-based config — see [docs/project-overview.md](docs/project-overview.md) §2.
- (from code) Built-in `slug` filter overridden with pinyin-pro for Chinese tag URLs — see [docs/project-overview.md](docs/project-overview.md) §3 Key Principles.
