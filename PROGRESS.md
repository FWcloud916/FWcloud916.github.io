# FW Blog — Progress

> **Last session:** 2026-07-13 · commit `56cf7c5` · tests: passing (44/44)

## Now (WIP = 1)

### AISO 基礎建設與內容優化

- **State:** local implementation complete; waiting for deploy/dashboard verification
- **Started:** 2026-07-13
- **Implementation commit:** `56cf7c5`
- **Test status:** passing (44/44)
- **Goal:** 提升文章在 Google AI features、ChatGPT Search、Bing Copilot 等 AI 搜尋中的可發現性、可引用性與成效可量測性。
- **Scope:**
  1. 建立 Google Search Console、Bing Webmaster Tools 與 GA4 AI referral 量測基線。
  2. 補齊作者實體、文章更新日期、`dateModified` 與 sitemap `lastmod`。
  3. 將社群平台 API 文章重構為 answer-first、具來源與可獨立引用段落的格式。
  4. 更新 Docker 舊文並建立主題總覽與站內連結。
  5. 明確化 AI crawler policy、完善 `llms.txt`，並評估／導入 IndexNow。
- **Definition of done:** 上述項目完成或將需帳號權限的外部步驟明確記為 blocker；`npm test` 通過；受影響文件已同步；worktree 無暫存除錯產物；完成 commit。
- **Completed locally:** author `Person`／`ProfilePage`; visible publish/update dates; `dateModified`／sitemap `lastmod`; complete `llms.txt`; OAI-SearchBot policy; IndexNow CI notification; Bing verification meta; AISO runbook; answer-first social API article; refreshed four-article Docker cluster and new pillar page; nested worktree test exclusion.
- **Completed externally:** Google Search Console ownership verified through DNS; `https://imfw.io/sitemap.xml` submitted.
- **Remaining external steps:**
  1. After an approved push/deploy, verify Bing Webmaster Tools and submit `/sitemap.xml`.
  2. With GA4 dashboard access, create the AI referral report described in `docs/aiso.md`.

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
| 9 | AISO foundation: author entity, honest freshness, all-post llms.txt, AI crawler policy, Bing verification, IndexNow, answer-first content clusters | `npm test` + `node scripts/submit-indexnow.mjs HEAD HEAD` | local passing; external verification pending |

## Done

- 2026-07-13 — CI action bump to clear Node 20 deprecation ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)): `actions/checkout@v4→v7`, `actions/setup-node@v4→v6`, `peaceiris/actions-gh-pages@v3→v4` — all now run on Node 24 (v3 was node16). Build Node stays `node-version: '22'`. Synced docs/project-overview.md pipeline note.
- 2026-07-13 — Google Search Console ownership verified through DNS and `/sitemap.xml` submitted; HTML-meta token is intentionally unnecessary.
- `56cf7c5` — AISO local implementation: author/freshness structured data, Bing verification, IndexNow, complete llms.txt, crawler policy, AISO runbook, social API rewrite, and refreshed Docker topic cluster (44/44 tests).
- 2026-07-13 — Google Analytics (GA4) enabled: set `googleAnalyticsId` in [src/_data/site.json](src/_data/site.json) (current ID `G-QBS6V0SVT1`; initially `G-H39765SSFE`, swapped same day); the pre-existing conditional gtag hook in `base.njk` now emits on every page (verified in `_site/index.html`). Synced docs/project-overview.md (§1.2, §1.3, integrations table).
- 2026-07-13 — Technical SEO completed: canonical and robots metadata, Open Graph/X cards, `WebSite`/`BlogPosting` JSON-LD, automatic legacy-post descriptions, 1200×630 default social image, `/sitemap.xml`, `/robots.txt`, Search Console hook, and build coverage.
- 2026-07-13 — Test gate established: vitest (26 tests: lib/filters units, frontmatter content checks, `_site/` build smoke) + `npm test` in CI before deploy. Fixed en route: feed.njk served the 10 **oldest** posts (`reverse | limit` → `limit`), readingTime was space-based and useless for Chinese (now CJK-aware), tag slug collisions/empty slugs now fail the build (`lib/filters.mjs`).
- 2026-07-13 — Documentation bootstrap: AGENTS.md (+ CLAUDE.md symlink), docs/project-overview.md, DESIGN.md, PROGRESS.md; stale-config fixes in README.md, QUICKSTART.md, docs/README.md (doc-architect Mode B).
- `6de29ec` — Post collection/layout wiring fixed; first 5 posts published (1× 2019, 4× 2020).
- `25bdeca` — Dependency refresh: Tailwind v4, eleventy-img v6, RSS v3; CI sharp regression fixed.

## Blockers

- Browser control is unavailable in this session, so Bing Webmaster Tools verification／sitemap submission and the GA4 AI referral report cannot be completed from the dashboards.
- Pushing `main` deploys directly to production; local AISO commits are intentionally not pushed without explicit deployment approval.

## Next steps

- Publish remaining posts (commit `6de29ec` says "first 5 posts" — more presumably queued).
- Monitor Search Console sitemap processing and indexing results; no repository change is required.

## Decision log

- 2026-07-13 — Tag slug collisions (case variants, Chinese homophones) and empty slugs **fail the build** with a named-tag error, rather than auto-merging tags — user decision.
- 2026-07-13 — Feed takes `collections.posts | limit(10)` (newest first); reading speed constants: 400 CJK chars/min + 200 words/min (lib/filters.mjs).
- 2026-07-13 — SEO descriptions prefer frontmatter, fall back to a normalized 160-character article excerpt, then the site description; social images prefer per-post `socialImage`, then `site.socialImage`.
- 2026-07-13 — Docs: no domain-models.md (content model lives in [docs/project-overview.md](docs/project-overview.md) §5), no coding-style.md (no linter), no db-observation.md (no datastore).
- (from git history) Tailwind migrated to v4 CSS-based config — see [docs/project-overview.md](docs/project-overview.md) §2.
- (from code) Built-in `slug` filter overridden with pinyin-pro for Chinese tag URLs — see [docs/project-overview.md](docs/project-overview.md) §3 Key Principles.
