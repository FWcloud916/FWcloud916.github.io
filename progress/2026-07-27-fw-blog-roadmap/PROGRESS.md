# FW Blog Roadmap

**Slug:** fw-blog-roadmap
**Status:** in-progress
**Ticket:** N/A
**Related plan:** [fw-blog-roadmap-PROGRESS.md](../_plans/fw-blog-roadmap-PROGRESS.md)
**Created:** 2026-07-27
**Updated:** 2026-07-30

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `site` | `main` | N/A | Tier 1 implementation underway |

## Background & goals

Continue the FW Blog publishing, monitoring, and SEO/AI-SEO roadmap migrated
from the legacy root `PROGRESS.md`. The byte-identical source snapshot is
versioned at [fw-blog-roadmap-PROGRESS.md](../_plans/fw-blog-roadmap-PROGRESS.md).

### Source-to-roadmap migration map

Each locator below corresponds to one blocking schema-v2 inventory row. The
source text is retained verbatim enough for row-level audit and future work.

- [migration:Ecf02fe07] **Last session:** 2026-07-21 · commit `595c4dd` · tests: passing (51/51)
- [migration:E0c741841] _Nothing in progress — pick up the next item from "Next steps" below._
- [migration:Edd0f9b27] #=1; Behavior=Verification gate: vitest (filter units + content checks + build smoke), wired into CI before deploy; Verify with=`npm test`; State=passing
- [migration:E494892a3] #=2; Behavior=Site generates all pages (posts, tags, feed, llms.txt) without errors; Verify with=`npm test` (build smoke); State=passing
- [migration:E3a66d69f] #=3; Behavior=Production build (11ty + Tailwind CSS) completes; Verify with=`npm run build`; State=passing
- [migration:E2cc4335f] #=4; Behavior=Chinese tags produce valid pinyin URLs (e.g. 工具 → /tags/gong-ju/); colliding/empty slugs fail the build; Verify with=`npm test` (tests/filters.test.mjs); State=passing
- [migration:Eb14a2ab5] #=5; Behavior=RSS feed carries the 10 newest posts (was: 10 oldest once count > 10); Verify with=`npm test` (tests/build.test.mjs feed assertion); State=passing
- [migration:Eb5cd2bb5] #=6; Behavior=Reading time is CJK-aware (Chinese long-form no longer stuck at 1 分鐘); Verify with=`npm test` (tests/filters.test.mjs readingTime); State=passing
- [migration:Ef45896cd] #=7; Behavior=Google Analytics enabled; Verify with=set `googleAnalyticsId` in src/_data/site.json, then `npm run build` and grep gtag in _site; State=active (`G-QBS6V0SVT1`)
- [migration:E25fa48f6] #=8; Behavior=Technical SEO: canonical, social cards, JSON-LD, sitemap/robots, noindex controls, Search Console hook; Verify with=`npm test` (SEO build assertions); State=passing
- [migration:E2781027b] #=9; Behavior=AISO foundation: author entity, honest freshness, all-post llms.txt, AI crawler policy, Bing verification, IndexNow, answer-first content clusters; Verify with=`npm test` + `node scripts/submit-indexnow.mjs HEAD HEAD`; State=deployed; all external setup steps complete
- [migration:E38e69b9a] #=10; Behavior=Bing SEO/GEO scan hygiene: descriptive homepage title/description; every sitemap HTML page has exactly one H1 and `html[lang=zh-TW]`; Verify with=`npm test` + production sitemap audit; State=local passing; rescan after deploy
- [migration:E03293dbe] #=11; Behavior=文章用純 markdown 插圖（image transform plugin），markdown 不經 nunjucks，code fence 裡的 `{{ }}` 不再需要 `{% raw %}`; Verify with=`npm test`（picture 輸出 + 無 nunjucks 殘留斷言）; State=passing
- [migration:E15de4146] Publish remaining posts (commit `6de29ec` says "first 5 posts" — more presumably queued).
- [migration:E3fb056a1] Monitor Search Console sitemap processing and indexing results; no repository change is required.
- [migration:E70b03db9] Three-agent audit found the machine-readability foundation (JSON-LD, llms.txt, robots + OAI-SearchBot, IndexNow, sitemap, canonical/OG, CJK reading time) is strong and test-guarded. Remaining gaps, prioritized:
- [migration:E084d585e] **Tier 1 — quick technical wins (test-safe):**
- [migration:Ea8068ea4] Favicon set + `theme-color` (none exist today)
- [migration:E3f3c2ea6] `BreadcrumbList` JSON-LD + breadcrumb UI (biggest structured-data gap)
- [migration:Ef5dbf541] Heading anchor IDs via `markdown-it-anchor` (AI engines can only cite whole pages today, not sections)
- [migration:E88aed4bd] Resource hints (`preconnect` googletagmanager, `preload` main CSS, skip Prism CSS on code-free pages)
- [migration:Eba9d24f9] Backfill `description`/`updated` on the one orphan post (`2019-03-19-nvm-install.md`)
- [migration:Ef98549e1] **Tier 2 — AI-answer-engine structured data:**
- [migration:E4f63f922] `FAQPage`/`HowTo` schema (frontmatter-driven) — Docker guide and comparison posts qualify but aren't marked up
- [migration:Eff871c8c] `BlogPosting` publisher → `Organization` + logo; `image` → `ImageObject`
- [migration:E8f68690e] `llms-full.txt` full-text companion to the existing index-only `llms.txt`
- [migration:E70844acd] Strengthen author `sameAs` (only GitHub today — needs user-supplied profile URLs)
- [migration:Ee2f381a7] **Tier 3 — discovery, linking & content depth:**
- [migration:E411b01b6] Related-posts module; pull orphan posts (nvm, social-platform-apis) into a link cluster
- [migration:Ec67624d2] Full `/archive/` page + optional on-site search (Pagefind) as content grows
- [migration:E52e306eb] Unique (non-templated) tag-page descriptions
- [migration:E64172630] **Content volume/breadth is the dominant weakness** — only 7 posts across ~2 topics (6 Docker + 1 API + 1 orphan). Not a code task; consider a second pillar cluster to match the Docker hub-and-spoke.
- [migration:E404d2116] Test constraint: `tests/build.test.mjs` asserts exact robots.txt bytes, JSON-LD shapes, and the one-`<h1>` rule — any future implementation above must update the matching assertion in the same commit.

## Task list

- [x] ~~Publish the remaining queued posts.~~ Stale — no queued drafts exist; see 2026-07-27 work log.
- [ ] Monitor Search Console sitemap processing and indexing results. _(external/manual — not code-verifiable; still open)_
- [ ] Rescan Bing SEO/GEO signals after deployment. _(external/manual — not code-verifiable; still open)_
- [x] Add a favicon set and `theme-color`. _(FW monogram SVG/ICO/Apple Touch Icon; blue browser theme color; build-tested)_
- [ ] Add `BreadcrumbList` JSON-LD and breadcrumb UI. _(confirmed missing — no match in `src/`, `lib/`, `eleventy.config.mjs`)_
- [ ] Add heading anchor IDs via `markdown-it-anchor`. _(confirmed missing — no dependency, no config reference)_
- [ ] Add resource hints and skip Prism CSS on code-free pages. _(partially done: Google Fonts `preconnect`/`display=swap` exists in `base.njk`; still missing `googletagmanager` preconnect, CSS `preload`, and conditional Prism loading)_
- [ ] Backfill `description` and `updated` for `2019-03-19-nvm-install.md`. _(confirmed missing — frontmatter has only `title`/`date`/`tags`)_
- [ ] Add frontmatter-driven `FAQPage`/`HowTo` schema. _(confirmed missing — no match anywhere)_
- [ ] Upgrade `BlogPosting` publisher/image structured data. _(confirmed unchanged — `base.njk:104-107` publisher is still `"@type": "Person"`, `image` is still a plain URL string, not `ImageObject`)_
- [ ] Generate `llms-full.txt`. _(confirmed missing — `src/llms.njk` only emits `/llms.txt`, index-only: title/date/tags/one-line description per post)_
- [ ] Strengthen author `sameAs` after profile URLs are supplied. _(confirmed unchanged — `site.authorSameAs` in `src/_data/site.json` still has only the GitHub URL; blocked on user supplying more profile URLs)_
- [ ] Add related posts and link orphan posts into a cluster. _(confirmed missing — no "related" module in `src/` or `lib/`)_
- [ ] Add `/archive/` and evaluate Pagefind as content grows. _(confirmed missing — no archive page, no `pagefind` dependency)_
- [ ] Write unique tag-page descriptions. _(confirmed still templated — `src/tags.njk` generates the same "瀏覽 FW Blog 中與 {{ tag }} 相關的文章。" for every tag)_
- [ ] Plan a second content pillar cluster. _(partially overtaken by events: post count grew 7→12 since the 2026-07-13 audit, with a 3rd emerging cluster — AI agent/documentation, 2 posts tagged `ai`/`agent-skills` — alongside Docker (~8 posts) and social-API automation (2-3 posts); still thin, so left open)_
- [ ] Update matching `tests/build.test.mjs` assertions with every SEO implementation. _(standing practice, not a one-off item — no existing assertions found for any of the unimplemented items above, so nothing to reconcile yet)_

## Work log

### 2026-07-30

- Added a geometric `FW` favicon set (SVG, multi-size ICO, 180×180 Apple
  Touch Icon) and configured the shared layout to emit the icon links and the
  blue-600 browser `theme-color` from site data.
- Added the user-supplied FW developer illustration to the About page with
  meaningful Traditional Chinese alternative text, explicit dimensions and
  responsive image output; documented its warm palette as a contained brand
  exception rather than a new UI color family.
- Added build coverage for icon metadata, binary formats/dimensions and the
  responsive About portrait. Documentation impact reviewed and synchronized
  across DESIGN.md, docs/README.md and docs/project-overview.md.
- Verification: `npm test` passes 69/69. Production output was served locally
  and checked in Chrome: the 512px desktop portrait and 358px portrait at a
  390px mobile viewport render without horizontal overflow; favicon metadata,
  theme color and alternative text are present.

### 2026-07-27

- Migrated the complete legacy inventory into this roadmap, retained a
  byte-identical plan snapshot, and added row-specific Evidence locators.
- Audited "Publish the remaining queued posts": checked `src/posts/**/*.md`
  (12 posts already published, 2019–2026) and every git branch/worktree
  (`cool-noether-4b6d53`, `default-font-huninn-909a87`,
  `ga-integration-check-39b39f`) for draft content — none found. The item
  traced back to commit `6de29ec` ("first 5 posts"); 7 more have shipped
  since with no drafts left queued. Marked done as stale/moot in the task
  list above.
- Audited every other task-list item against the current codebase
  (`base.njk`, `eleventy.config.mjs`, `src/_data/site.json`, `src/tags.njk`,
  `src/llms.njk`, `tests/build.test.mjs`, package deps): all remaining
  Tier 1–3 items are still genuinely unimplemented, confirmed by direct
  grep/read rather than assumption. Two items got nuance added rather than
  a flat "still open": resource hints (Google Fonts preconnect already
  exists, the rest doesn't) and the second-content-pillar item (post count
  grew 7→12 with a 3rd cluster emerging, but each non-Docker cluster is
  still only 2-3 posts). The two Search Console/Bing items are external
  monitoring steps with no repository signal to check either way.

## Outcome

> Fill in after development finishes.

**Final status:**
**PR / Commit:**
**Follow-ups:**
