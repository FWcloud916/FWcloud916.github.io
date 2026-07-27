# Migration inventory: legacy-progress

**Slug:** legacy-progress
**Schema version:** 2
**Created:** 2026-07-27
**Updated:** 2026-07-27

This record is generated and reconciled by `update_progress.py
migration-inventory` and `update_progress.py migration-audit`. It is the
durable migration audit trail: the legacy source(s) below MUST NOT be deleted
until `migration-audit <slug>` exits 0 and `migration-finalize --decision
delete` records explicit approval.

## Sources

<!-- MIGRATION_SOURCES_START -->
| Source | SHA-256 |
|---|---|
| `PROGRESS.md` | 6f238de6711d70c280f7d1acdd03bc214155c8812a13454cc55cd511c2f70cb0 |
<!-- MIGRATION_SOURCES_END -->

## Migration outcome

<!-- MIGRATION_OUTCOME_START -->
**State:** deleted
**Decision date:** 2026-07-27
**Completion date:** 2026-07-27
**Confirmed sources:** ["PROGRESS.md"]
**Approval fingerprint:** 3fda70cc60b9d17e40ccc0eab011b59ae15d63124f49b0e6ac29a7324d41ce06
<!-- MIGRATION_OUTCOME_END -->

`migration-audit` opens only the pre-deletion gate. Record the user's durable
choice with `migration-finalize <slug> --decision retain` or
`migration-finalize <slug> --decision delete`. The delete decision does not
delete anything; after the approved sources are removed separately, use
`migration-finalize <slug> --confirm-deleted` to record completion.

Keep every source byte-identical while this migration is open. If a source
must change, re-run `migration-inventory` — it preserves the Disposition and
Destination and Evidence of every unchanged entry, but resets every human sign-off whenever
the source or generated inventory changes.

## How to fill this in

1. Rows below are generated from the source(s). Do not hand-add, hand-delete,
   or hand-edit the `ID`, `Kind`, `Source`, `Loc`, `Section`, or `Entry`
   cells — re-run `migration-inventory` instead. `migration-audit` detects
   hand edits to every generated field except informational `Loc` and refuses
   to pass.
2. Every row whose `Kind` is `actionable` or `ambiguous` MUST get a
   `Disposition` of `migrated` or `excluded` and a valid `Destination`. A
   `migrated` row also needs non-trivial `Evidence`: a unique, row-specific single-line
   locator copied from the destination item's `PROGRESS.md`. `TBD` in any
   required cell blocks the audit.
   An unrecognized heading in the source becomes `ambiguous` — this is
   deliberate: an empty-looking WIP section elsewhere in the same document
   does not excuse an unclassified section from review.
3. Rows whose `Kind` is `done`, `empty`, or `historical` are pre-filled as
   `not-applicable`. `done` and `historical` rows may instead be `migrated` or
   `excluded`; `empty` rows may only be `not-applicable`.

<!-- MIGRATION_DISPOSITIONS_START -->
| Disposition | Meaning | Destination cell | Evidence cell |
|---|---|---|---|
| `TBD` | Unresolved (generated default) | blocks the audit | blocks the audit |
| `migrated` | Copied into a tracker item | the destination item's slug — it MUST already exist | unique, row-specific locator copied from that item's `PROGRESS.md` |
| `excluded` | User-approved drop | the user's reason (required) | `—` |
| `not-applicable` | Empty, already-done, or disclosed historical/reference row | `—` | `—` |
<!-- MIGRATION_DISPOSITIONS_END -->

## Entries

<!-- MIGRATION_TABLE_START -->
| ID | Kind | Source | Loc | Section | Entry | Disposition | Destination | Evidence |
|---|---|---|---|---|---|---|---|---|
| Ecf02fe07 | ambiguous | `PROGRESS.md` | 3 | FW Blog — Progress | **Last session:** 2026-07-21 · commit `595c4dd` · tests: passing (51/51) | migrated | fw-blog-roadmap | [migration:Ecf02fe07] |
| E0c741841 | actionable | `PROGRESS.md` | 7 | FW Blog — Progress > Now (WIP = 1) | _Nothing in progress — pick up the next item from "Next steps" below._ | migrated | fw-blog-roadmap | [migration:E0c741841] |
| Edd0f9b27 | ambiguous | `PROGRESS.md` | 13 | FW Blog — Progress > Feature list | #=1; Behavior=Verification gate: vitest (filter units + content checks + build smoke), wired into CI before deploy; Verify with=`npm test`; State=passing | migrated | fw-blog-roadmap | [migration:Edd0f9b27] |
| E494892a3 | ambiguous | `PROGRESS.md` | 14 | FW Blog — Progress > Feature list | #=2; Behavior=Site generates all pages (posts, tags, feed, llms.txt) without errors; Verify with=`npm test` (build smoke); State=passing | migrated | fw-blog-roadmap | [migration:E494892a3] |
| E3a66d69f | ambiguous | `PROGRESS.md` | 15 | FW Blog — Progress > Feature list | #=3; Behavior=Production build (11ty + Tailwind CSS) completes; Verify with=`npm run build`; State=passing | migrated | fw-blog-roadmap | [migration:E3a66d69f] |
| E2cc4335f | ambiguous | `PROGRESS.md` | 16 | FW Blog — Progress > Feature list | #=4; Behavior=Chinese tags produce valid pinyin URLs (e.g. 工具 → /tags/gong-ju/); colliding/empty slugs fail the build; Verify with=`npm test` (tests/filters.test.mjs); State=passing | migrated | fw-blog-roadmap | [migration:E2cc4335f] |
| Eb14a2ab5 | ambiguous | `PROGRESS.md` | 17 | FW Blog — Progress > Feature list | #=5; Behavior=RSS feed carries the 10 newest posts (was: 10 oldest once count > 10); Verify with=`npm test` (tests/build.test.mjs feed assertion); State=passing | migrated | fw-blog-roadmap | [migration:Eb14a2ab5] |
| Eb5cd2bb5 | ambiguous | `PROGRESS.md` | 18 | FW Blog — Progress > Feature list | #=6; Behavior=Reading time is CJK-aware (Chinese long-form no longer stuck at 1 分鐘); Verify with=`npm test` (tests/filters.test.mjs readingTime); State=passing | migrated | fw-blog-roadmap | [migration:Eb5cd2bb5] |
| Ef45896cd | ambiguous | `PROGRESS.md` | 19 | FW Blog — Progress > Feature list | #=7; Behavior=Google Analytics enabled; Verify with=set `googleAnalyticsId` in src/_data/site.json, then `npm run build` and grep gtag in _site; State=active (`G-QBS6V0SVT1`) | migrated | fw-blog-roadmap | [migration:Ef45896cd] |
| E25fa48f6 | ambiguous | `PROGRESS.md` | 20 | FW Blog — Progress > Feature list | #=8; Behavior=Technical SEO: canonical, social cards, JSON-LD, sitemap/robots, noindex controls, Search Console hook; Verify with=`npm test` (SEO build assertions); State=passing | migrated | fw-blog-roadmap | [migration:E25fa48f6] |
| E2781027b | ambiguous | `PROGRESS.md` | 21 | FW Blog — Progress > Feature list | #=9; Behavior=AISO foundation: author entity, honest freshness, all-post llms.txt, AI crawler policy, Bing verification, IndexNow, answer-first content clusters; Verify with=`npm test` + `node scripts/submit-indexnow.mjs HEAD HEAD`; State=deployed; all external setup steps complete | migrated | fw-blog-roadmap | [migration:E2781027b] |
| E38e69b9a | ambiguous | `PROGRESS.md` | 22 | FW Blog — Progress > Feature list | #=10; Behavior=Bing SEO/GEO scan hygiene: descriptive homepage title/description; every sitemap HTML page has exactly one H1 and `html[lang=zh-TW]`; Verify with=`npm test` + production sitemap audit; State=local passing; rescan after deploy | migrated | fw-blog-roadmap | [migration:E38e69b9a] |
| E03293dbe | ambiguous | `PROGRESS.md` | 23 | FW Blog — Progress > Feature list | #=11; Behavior=文章用純 markdown 插圖（image transform plugin），markdown 不經 nunjucks，code fence 裡的 `{{ }}` 不再需要 `{% raw %}`; Verify with=`npm test`（picture 輸出 + 無 nunjucks 殘留斷言）; State=passing | migrated | fw-blog-roadmap | [migration:E03293dbe] |
| E2ead53a2 | historical | `PROGRESS.md` | 27 | FW Blog — Progress > Done | 2026-07-21 — 圖片改純 markdown + 關閉 markdown 的 nunjucks 前處理（`595c4dd`）：`eleventy.config.mjs` 移除 `image` shortcode，改註冊 `eleventyImageTransformPlugin`（widths/formats/urlPath/defaultAttributes 與原 shortcode 相同，輸出 byte-equivalent `<picture>`）；`markdownTemplateEngine: "njk"` → `false`。遷移 2 篇文章的 4 個 shortcode 為 `![alt](/assets/images/…)`，移除 podman 文兩對 `{% raw %}`。新增 2 個 build 斷言（responsive picture 輸出、全站無 nunjucks 殘留）。docs/README.md、QUICKSTART.md、docs/sample-post.md、docs/project-overview.md、README.md 同步。Tests 51/51。 | not-applicable | — | — |
| E40bf3856 | historical | `PROGRESS.md` | 28 | FW Blog — Progress > Done | 2026-07-21 — CSS cache-busting(`247c395`):新增 [src/_data/build.mjs](src/_data/build.mjs) 輸出 `{{ build.version }}`(git short HEAD hash,取不到 git 時退回時間戳),`base.njk` 的 `styles.css` 與 `prism-one-dark.css` 連結加上 `?v=` 版本參數,繞過正式站 CDN 的 4 小時快取(max-age=14400;Huninn 字型部署時實際延遲 4 小時)。同 commit 重建 URL 不變。新增 build smoke 斷言驗證兩個連結帶版本參數。docs/project-overview.md 同步。Tests 48/48。 | not-applicable | — | — |
| Ef112ce66 | historical | `PROGRESS.md` | 29 | FW Blog — Progress > Done | 2026-07-21 — 全站預設字型改為 **Huninn(粉圓體)**(`3abaf07`):`base.njk` 加入 Google Fonts preconnect + `display=swap` stylesheet;`input.css` 以 `@theme` 覆寫 `--font-sans`(Huninn 置頂、系統堆疊 fallback);程式碼區塊等寬字型不受影響。瀏覽器驗證 body computed font 為 Huninn、`document.fonts.check` 通過。DESIGN.md typography 章節同步。注意 Huninn 僅 400 字重,粗體為瀏覽器合成。Tests 47/47。 | not-applicable | — | — |
| Ea57da71f | historical | `PROGRESS.md` | 30 | FW Blog — Progress > Done | 2026-07-13 — **AISO 基礎建設與內容優化 closed.** Goal: 提升文章在 Google AI features、ChatGPT Search、Bing Copilot 等 AI 搜尋中的可發現性、可引用性與成效可量測性。All scope items complete: author entity／freshness structured data／IndexNow／llms.txt／crawler policy (commit `529eaaf`); Google Search Console, Bing Webmaster Tools and GA4 AI-referral measurement baselines established; social API article rewritten answer-first; Docker cluster refreshed. See entries below for the individual steps and commits. | not-applicable | — | — |
| E89c36f25 | historical | `PROGRESS.md` | 31 | FW Blog — Progress > Done | 2026-07-13 — GA4 AI referral Exploration built via browser automation: free-form Exploration `AI referral sessions` on the imfw.io property, rows Session source → Landing page + query string, values Sessions + Engaged sessions, regex filter over 7 AI-search hosts, Last 28 days. Auto-saved in GA4 Explore; no matching sessions yet (expected on a low-traffic site). Synced docs/aiso.md. | not-applicable | — | — |
| Ec51195f0 | historical | `PROGRESS.md` | 32 | FW Blog — Progress > Done | 2026-07-13 — Bing Webmaster Tools ownership verified and `https://imfw.io/sitemap.xml` submitted; synced docs/aiso.md and docs/project-overview.md. | not-applicable | — | — |
| E15e7ebe2 | historical | `PROGRESS.md` | 33 | FW Blog — Progress > Done | 2026-07-13 — Homepage SEO scan signals improved (`85da9e5`): descriptive `<title>`/description on `/`, matching `WebSite` JSON-LD; added build-smoke test asserting exactly one `<h1>` and `html[lang=zh-TW]` on every sitemap HTML page. | not-applicable | — | — |
| E7faa9521 | historical | `PROGRESS.md` | 34 | FW Blog — Progress > Done | 2026-07-13 — CI action bump to clear Node 20 deprecation ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)): `actions/checkout@v4→v7`, `actions/setup-node@v4→v6`, `peaceiris/actions-gh-pages@v3→v4` — all now run on Node 24 (v3 was node16). Build Node stays `node-version: '22'`. Synced docs/project-overview.md pipeline note. | not-applicable | — | — |
| E5d57c015 | historical | `PROGRESS.md` | 35 | FW Blog — Progress > Done | 2026-07-13 — Google Search Console ownership verified through DNS and `/sitemap.xml` submitted; HTML-meta token is intentionally unnecessary. | not-applicable | — | — |
| Eb74f006c | historical | `PROGRESS.md` | 36 | FW Blog — Progress > Done | `529eaaf` — AISO local implementation: author/freshness structured data, Bing verification, IndexNow, complete llms.txt, crawler policy, AISO runbook, social API rewrite, and refreshed Docker topic cluster (44/44 tests). | not-applicable | — | — |
| E4af0511e | historical | `PROGRESS.md` | 37 | FW Blog — Progress > Done | 2026-07-13 — Google Analytics (GA4) enabled: set `googleAnalyticsId` in [src/_data/site.json](src/_data/site.json) (current ID `G-QBS6V0SVT1`; initially `G-H39765SSFE`, swapped same day); the pre-existing conditional gtag hook in `base.njk` now emits on every page (verified in `_site/index.html`). Synced docs/project-overview.md (§1.2, §1.3, integrations table). | not-applicable | — | — |
| E2c821fc1 | historical | `PROGRESS.md` | 38 | FW Blog — Progress > Done | 2026-07-13 — Technical SEO completed: canonical and robots metadata, Open Graph/X cards, `WebSite`/`BlogPosting` JSON-LD, automatic legacy-post descriptions, 1200×630 default social image, `/sitemap.xml`, `/robots.txt`, Search Console hook, and build coverage. | not-applicable | — | — |
| E54050a82 | historical | `PROGRESS.md` | 39 | FW Blog — Progress > Done | 2026-07-13 — Test gate established: vitest (26 tests: lib/filters units, frontmatter content checks, `_site/` build smoke) + `npm test` in CI before deploy. Fixed en route: feed.njk served the 10 **oldest** posts (`reverse \| limit` → `limit`), readingTime was space-based and useless for Chinese (now CJK-aware), tag slug collisions/empty slugs now fail the build (`lib/filters.mjs`). | not-applicable | — | — |
| Ef398a857 | historical | `PROGRESS.md` | 40 | FW Blog — Progress > Done | 2026-07-13 — Documentation bootstrap: AGENTS.md (+ CLAUDE.md symlink), docs/project-overview.md, DESIGN.md, PROGRESS.md; stale-config fixes in README.md, QUICKSTART.md, docs/README.md (doc-architect Mode B). | not-applicable | — | — |
| E026af72b | historical | `PROGRESS.md` | 41 | FW Blog — Progress > Done | `6de29ec` — Post collection/layout wiring fixed; first 5 posts published (1× 2019, 4× 2020). | not-applicable | — | — |
| E886527a6 | historical | `PROGRESS.md` | 42 | FW Blog — Progress > Done | `25bdeca` — Dependency refresh: Tailwind v4, eleventy-img v6, RSS v3; CI sharp regression fixed. | not-applicable | — | — |
| Ee2abb55c | empty | `PROGRESS.md` | 46 | FW Blog — Progress > Blockers | None currently open. | not-applicable | — | — |
| E15de4146 | actionable | `PROGRESS.md` | 50 | FW Blog — Progress > Next steps | Publish remaining posts (commit `6de29ec` says "first 5 posts" — more presumably queued). | migrated | fw-blog-roadmap | [migration:E15de4146] |
| E3fb056a1 | actionable | `PROGRESS.md` | 51 | FW Blog — Progress > Next steps | Monitor Search Console sitemap processing and indexing results; no repository change is required. | migrated | fw-blog-roadmap | [migration:E3fb056a1] |
| E70b03db9 | actionable | `PROGRESS.md` | 55 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Three-agent audit found the machine-readability foundation (JSON-LD, llms.txt, robots + OAI-SearchBot, IndexNow, sitemap, canonical/OG, CJK reading time) is strong and test-guarded. Remaining gaps, prioritized: | migrated | fw-blog-roadmap | [migration:E70b03db9] |
| E084d585e | actionable | `PROGRESS.md` | 59 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | **Tier 1 — quick technical wins (test-safe):** | migrated | fw-blog-roadmap | [migration:E084d585e] |
| Ea8068ea4 | actionable | `PROGRESS.md` | 60 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Favicon set + `theme-color` (none exist today) | migrated | fw-blog-roadmap | [migration:Ea8068ea4] |
| E3f3c2ea6 | actionable | `PROGRESS.md` | 61 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | `BreadcrumbList` JSON-LD + breadcrumb UI (biggest structured-data gap) | migrated | fw-blog-roadmap | [migration:E3f3c2ea6] |
| Ef5dbf541 | actionable | `PROGRESS.md` | 62 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Heading anchor IDs via `markdown-it-anchor` (AI engines can only cite whole pages today, not sections) | migrated | fw-blog-roadmap | [migration:Ef5dbf541] |
| E88aed4bd | actionable | `PROGRESS.md` | 63 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Resource hints (`preconnect` googletagmanager, `preload` main CSS, skip Prism CSS on code-free pages) | migrated | fw-blog-roadmap | [migration:E88aed4bd] |
| Eba9d24f9 | actionable | `PROGRESS.md` | 64 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Backfill `description`/`updated` on the one orphan post (`2019-03-19-nvm-install.md`) | migrated | fw-blog-roadmap | [migration:Eba9d24f9] |
| Ef98549e1 | actionable | `PROGRESS.md` | 66 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | **Tier 2 — AI-answer-engine structured data:** | migrated | fw-blog-roadmap | [migration:Ef98549e1] |
| E4f63f922 | actionable | `PROGRESS.md` | 67 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | `FAQPage`/`HowTo` schema (frontmatter-driven) — Docker guide and comparison posts qualify but aren't marked up | migrated | fw-blog-roadmap | [migration:E4f63f922] |
| Eff871c8c | actionable | `PROGRESS.md` | 68 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | `BlogPosting` publisher → `Organization` + logo; `image` → `ImageObject` | migrated | fw-blog-roadmap | [migration:Eff871c8c] |
| E8f68690e | actionable | `PROGRESS.md` | 69 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | `llms-full.txt` full-text companion to the existing index-only `llms.txt` | migrated | fw-blog-roadmap | [migration:E8f68690e] |
| E70844acd | actionable | `PROGRESS.md` | 70 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Strengthen author `sameAs` (only GitHub today — needs user-supplied profile URLs) | migrated | fw-blog-roadmap | [migration:E70844acd] |
| Ee2f381a7 | actionable | `PROGRESS.md` | 72 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | **Tier 3 — discovery, linking & content depth:** | migrated | fw-blog-roadmap | [migration:Ee2f381a7] |
| E411b01b6 | actionable | `PROGRESS.md` | 73 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Related-posts module; pull orphan posts (nvm, social-platform-apis) into a link cluster | migrated | fw-blog-roadmap | [migration:E411b01b6] |
| Ec67624d2 | actionable | `PROGRESS.md` | 74 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Full `/archive/` page + optional on-site search (Pagefind) as content grows | migrated | fw-blog-roadmap | [migration:Ec67624d2] |
| E52e306eb | actionable | `PROGRESS.md` | 75 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Unique (non-templated) tag-page descriptions | migrated | fw-blog-roadmap | [migration:E52e306eb] |
| E64172630 | actionable | `PROGRESS.md` | 76 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | **Content volume/breadth is the dominant weakness** — only 7 posts across ~2 topics (6 Docker + 1 API + 1 orphan). Not a code task; consider a second pillar cluster to match the Docker hub-and-spoke. | migrated | fw-blog-roadmap | [migration:E64172630] |
| E404d2116 | actionable | `PROGRESS.md` | 78 | FW Blog — Progress > Next steps > SEO / AI-SEO improvement backlog (2026-07-13 audit, not started) | Test constraint: `tests/build.test.mjs` asserts exact robots.txt bytes, JSON-LD shapes, and the one-`<h1>` rule — any future implementation above must update the matching assertion in the same commit. | migrated | fw-blog-roadmap | [migration:E404d2116] |
| E9136eff6 | historical | `PROGRESS.md` | 82 | FW Blog — Progress > Decision log | 2026-07-21 — 圖片插入方式定為純 markdown `![alt](/assets/images/<file>)`（root-relative 同時是 transform 的來源路徑與 passthrough fallback URL）。注意：transform 對遠端 `http(s)` 圖片會下載自託管，要原樣保留需寫 raw HTML `<img eleventy:ignore>`；逐圖覆寫 `sizes` 等屬性也用 raw HTML `<img>`（per-tag 屬性優先於 `defaultAttributes`）。feed.xml 內嵌 pre-transform 的 `<img>` 絕對 URL，依賴 `src/assets/images` passthrough 存活。 | not-applicable | — | — |
| Ea2a64f91 | historical | `PROGRESS.md` | 83 | FW Blog — Progress > Decision log | 2026-07-13 — Bing scan's “Meta Language tag missing” is not remediated with `meta http-equiv="content-language"`: HTML Living Standard marks that pragma non-conforming and recommends the existing root `<html lang="zh-TW">`. Production audit found one H1 and the correct `lang` on every sitemap HTML page; stale scan results should be rerun after deployment. | not-applicable | — | — |
| E0d1bd4da | historical | `PROGRESS.md` | 84 | FW Blog — Progress > Decision log | 2026-07-13 — Tag slug collisions (case variants, Chinese homophones) and empty slugs **fail the build** with a named-tag error, rather than auto-merging tags — user decision. | not-applicable | — | — |
| E20aa0b5a | historical | `PROGRESS.md` | 85 | FW Blog — Progress > Decision log | 2026-07-13 — Feed takes `collections.posts \| limit(10)` (newest first); reading speed constants: 400 CJK chars/min + 200 words/min (lib/filters.mjs). | not-applicable | — | — |
| E99ac4c97 | historical | `PROGRESS.md` | 86 | FW Blog — Progress > Decision log | 2026-07-13 — SEO descriptions prefer frontmatter, fall back to a normalized 160-character article excerpt, then the site description; social images prefer per-post `socialImage`, then `site.socialImage`. | not-applicable | — | — |
| Eaf28db82 | historical | `PROGRESS.md` | 87 | FW Blog — Progress > Decision log | 2026-07-13 — Docs: no domain-models.md (content model lives in [docs/project-overview.md](docs/project-overview.md) §5), no coding-style.md (no linter), no db-observation.md (no datastore). | not-applicable | — | — |
| E23e5a42d | historical | `PROGRESS.md` | 88 | FW Blog — Progress > Decision log | (from git history) Tailwind migrated to v4 CSS-based config — see [docs/project-overview.md](docs/project-overview.md) §2. | not-applicable | — | — |
| E1b1713dd | historical | `PROGRESS.md` | 89 | FW Blog — Progress > Decision log | (from code) Built-in `slug` filter overridden with pinyin-pro for Chinese tag URLs — see [docs/project-overview.md](docs/project-overview.md) §3 Key Principles. | not-applicable | — | — |
<!-- MIGRATION_TABLE_END -->

`Loc` is informational only (a line number in the source); `migration-audit`
never compares it — a source's content, not its line numbers, is its identity.

## Verified by `migration-audit` (do not hand-tick — these are computed, not attested)

- Every source entry has a record row, and every record row matches a source entry
- Every `actionable` / `ambiguous` row has a Disposition and a Destination
- Every `migrated` Destination resolves to an existing tracker item slug and
  its Evidence occurs exactly once in that item's `PROGRESS.md`
- Every `excluded` Destination states a reason
- No row's generated `ID`, `Kind`, `Source`, `Section`, or `Entry` was hand-edited
- `update_progress.py check` (tracker-internal consistency) passes

## Confirmed by the human before the deletion question

`migration-audit` reads these boxes but cannot verify them itself. The later
choice to retain or delete the source is deliberately not a sign-off here:
that question is asked only after this pre-deletion audit exits 0.

<!-- MIGRATION_SIGNOFF_START -->
- [x] The historical/reference sections listed by `migration-audit` were shown to the user
- [x] Every migrated entry was checked for semantic equivalence against its destination
- [x] The pointer audit passed: every live reference to the legacy source was updated
- [x] The link audit passed: every changed relative link resolves
<!-- MIGRATION_SIGNOFF_END -->
