# FW Blog — Project Overview

> **Type:** Explanation
> **Audience:** Developers, AI assistants, and any tooling that needs project context
> **Last updated:** 2026-08-01
>
> Static personal blog (imfw.io) built with Eleventy 3 and Tailwind CSS v4, deployed to GitHub Pages. Related docs: [README.md](README.md) (how-tos), [../DESIGN.md](../DESIGN.md) (design system), [../AGENTS.md](../AGENTS.md) (agent guide).

---

## 1. Purpose

### 1.1 Core Responsibilities

- Publish blog posts written in Markdown (Traditional Chinese content about web development and technology) at https://imfw.io.
- Generate per-tag pages, an all-tags index, an Atom feed (`/feed.xml`), a sitemap (`/sitemap.xml`), crawler rules (`/robots.txt`), and an `llms.txt` (`/llms.txt`) for LLM crawlers.
- Optimize images at build time (responsive sizes, WebP) via `eleventyImageTransformPlugin` — posts use plain markdown `![alt](/assets/images/…)`.
- Progressively enhance approved article figures with local, same-origin Lottie JSON while retaining a static poster for no-JavaScript, reduced-motion, and error fallbacks.
- Publish small, public Digital Garden concept notes at stable `/notes/<slug>/` URLs. Notes complement
  posts with explicit maturity and relations; they are not shortened articles.

### 1.2 Relationship with Other Systems

- **GitHub Pages** serves the built site from the `gh-pages` branch; the custom domain `imfw.io` is bound via the `CNAME` file.
- **GitHub Actions** ([.github/workflows/deploy.yml](../.github/workflows/deploy.yml)) builds and deploys on every push to `main`.
- **Google Analytics (GA4)** is wired in [src/_includes/layouts/base.njk](../src/_includes/layouts/base.njk) and **enabled** — `googleAnalyticsId` in [src/_data/site.json](../src/_data/site.json) is set to `G-QBS6V0SVT1`.
- **Google Search Console** is verified through DNS. The optional HTML-meta hook remains available but unused, so `googleSiteVerification` is empty by design.
- **Bing Webmaster Tools** is verified through `bingSiteVerification`; `https://imfw.io/sitemap.xml` is submitted.
- **IndexNow** is called after successful GitHub Pages deployments. Its notifier submits affected public URLs without blocking an otherwise successful deploy.

### 1.3 Deprecated / Retired or Not-Yet-Enabled Features

- **Not used:** HTML-meta Search Console verification — ownership is already verified through DNS; the empty `googleSiteVerification` value intentionally emits no redundant tag.
- **Retired:** `tailwind.config.js` / `postcss.config.js` — removed in the Tailwind v4 migration; configuration now lives in CSS (`src/assets/css/input.css`). Do not recreate them.

## 2. Tech Stack

| Component | Version (lockfile) | Role |
|---|---|---|
| Node.js | 22 (CI: `node-version: '22'`) | runtime |
| @11ty/eleventy | 3.1.6 | static site generator (ESM config: [eleventy.config.mjs](../eleventy.config.mjs)) |
| tailwindcss + @tailwindcss/cli | 4.3.2 | CSS framework; v4 CSS-based config, compiled by the standalone CLI |
| @tailwindcss/typography | 0.5.20 | `prose` classes for Markdown post bodies |
| @11ty/eleventy-img | 6.0.4 | build-time image optimization (`eleventyImageTransformPlugin`) |
| @11ty/eleventy-plugin-rss | 3.0.0 | Atom feed filters (`dateToRfc3339`, `absoluteUrl`, …) |
| @11ty/eleventy-plugin-syntaxhighlight | 5.0.2 | Prism.js syntax highlighting at build time |
| prism-themes | 1.9.0 | Prism One Dark CSS (passthrough-copied from node_modules) |
| lottie-web | 5.13.0 | pinned local light/SVG article-animation player, loaded on demand |
| luxon | 3.7.2 | date formatting filters |
| pinyin-pro | 3.28.1 | Chinese→pinyin transliteration for the custom `slug` filter |
| npm-run-all | 4.1.5 | runs the two watch processes in parallel (`npm start`) |
| vitest | 3.2.7 | test runner (`npm test`): filter units, content checks, build smoke |
| gray-matter | 4.0.3 | frontmatter parsing in tests (tests/helpers.mjs) |

Notes:
- Templates are **Nunjucks** (`.njk`); Markdown files are NOT pre-processed by any template engine (`markdownTemplateEngine: false`), so `{{ }}` inside code fences renders literally — no `{% raw %}` wrappers needed.
- `package.json` pins `js-yaml@^3.15.0` via `overrides` for `gray-matter`.
- There is **no linter**. Tests run via vitest (`npm test`, see §10).

## 3. Architecture Overview

Classic static-site pipeline — no server-side code at runtime:

```
src/**（Markdown + Nunjucks + JSON data）
   │  npm run build:11ty （Eleventy: collections, filters, shortcodes）
   ▼
_site/**（HTML, feed.xml, sitemap.xml, robots.txt, llms.txt, optimized images）
   │  npm run build:css （Tailwind CLI: input.css → styles.css, minified）
   ▼
_site/assets/css/styles.css
   │  GitHub Actions（push to main）
   ▼
gh-pages branch → GitHub Pages → https://imfw.io
```

### Key Principles

- **Static-first output**: images, syntax highlighting, and feeds are generated at build. Article Lottie is optional progressive enhancement: every animation keeps a meaningful poster, while a small post bootstrap loads the local player only when an eligible figure is present and motion is allowed.
- **Data flows from `src/_data/site.json`**: templates MUST read site metadata as `{{ site.* }}`, never hardcode it.
- **Directory data over frontmatter**: [src/posts/posts.json](../src/posts/posts.json) supplies `layout: layouts/post.njk` and the `posts` tag to every post — individual posts do not repeat them.
- **One SEO source of truth**: [src/_includes/layouts/base.njk](../src/_includes/layouts/base.njk) builds canonical URLs, robots directives, Open Graph/X cards, and JSON-LD from page data plus `site.json`. Article descriptions prefer frontmatter, then a normalized 160-character content excerpt, then the site description; social images prefer per-post `socialImage`, then `site.socialImage`.
- **One author entity**: visible article bylines, `BlogPosting.author`, the About page's `ProfilePage` schema, and external profile links share the stable `https://imfw.io/about/#person` identity.
- **Honest freshness signals**: posts MAY define `updated`; the visible date, Open Graph metadata, `BlogPosting.dateModified`, sitemap `lastmod`, and `llms.txt` all use it. It MUST NOT precede `date` or be changed without a substantive content update.
- **Chinese-safe URLs**: the built-in `slug` filter is overridden (via [lib/filters.mjs](../lib/filters.mjs) `toSlug`) to transliterate Chinese via pinyin-pro; without it, CJK tags slugify to empty strings and collide. Tags whose slugs collide anyway (case variants, homophones) or come out empty **fail the build** (`assertNoSlugCollisions`, called from the `tagList` collection).
- **Curated discovery paths**: [src/_data/topics.json](../src/_data/topics.json) explicitly orders the posts in each high-value topic. Topic membership is not inferred from broad tags; article pages link back to their topics and recommend up to three same-topic posts. `/archive/` provides a direct crawlable link to every post, including standalone articles outside a topic.
- **Garden discovery paths**: the same topic manifest may explicitly order `noteUrls` before
  `postUrls`. Notes appear in topic pages, `/sitemap.xml`, and `/llms.txt`; they are intentionally
  excluded from the homepage, `/archive/`, and `/feed.xml` so the article inventory remains stable.
- **Explicit note relations**: a note's `related` frontmatter contains canonical root-relative
  `/notes/` or `/posts/` URLs. Templates resolve only those URLs and derive backlinks from other
  notes; tags never create note relations.
- **CSS builds after Eleventy**: `npm run build` runs `build:11ty` then `build:css` because Tailwind writes directly into `_site/assets/css/`.

## 4. Directory Structure

```
.
├── eleventy.config.mjs        # Eleventy config: plugins (incl. image transform), passthroughs, collections, filters
├── lib/filters.mjs            # testable slug, reading-time, SEO-summary/tag, and safe-JSON logic
├── tests/                     # vitest: filters.test (units), content.test (frontmatter rules), build.test (_site smoke)
├── vitest.config.mjs          # excludes nested .claude worktrees from the active test run
├── scripts/submit-indexnow.mjs # deployment-time IndexNow notifier
├── package.json               # scripts (build/start/test/clean); all deps are devDependencies
├── CNAME                      # "imfw.io" — passthrough-copied into _site/
├── QUICKSTART.md              # setup + first-post walkthrough
├── DESIGN.md                  # design tokens & visual conventions
├── AGENTS.md / CLAUDE.md      # agent guide (CLAUDE.md is a symlink)
├── progress/                  # canonical progress tracker: INDEX, item records, plans, migrations
├── .github/
│   ├── workflows/deploy.yml   # build on push to main → deploy _site/ to gh-pages
│   └── prompts/               # original project-plan prompt (historical)
├── docs/
│   ├── README.md              # configuration / content-management / customization how-tos
│   ├── aiso.md                # AI-search operations, crawler policy, content and measurement checklist
│   ├── project-overview.md    # this file
│   └── sample-post.md         # example post showing frontmatter + Markdown features
├── src/
│   ├── _data/site.json        # global site metadata ({{ site.* }} in templates)
│   ├── _data/build.mjs        # build version ({{ build.version }}): git short hash for CSS cache-busting
│   ├── _data/topics.json      # curated topic metadata + ordered canonical note/post URLs
│   ├── _includes/
│   │   ├── layouts/base.njk   # HTML shell: SEO/social metadata, JSON-LD, nav, footer, optional integrations
│   │   ├── layouts/post.njk   # article layout: title, date, reading time, tag chips
│   │   └── components/        # nav.njk (top bar), post-card.njk (list-item card)
│   ├── assets/
│   │   ├── css/input.css      # Tailwind v4 entry + prose/Prism overrides (THE Tailwind config)
│   │   ├── icons/             # favicon SVG/ICO + Apple Touch Icon (copied to site root)
│   │   ├── images/            # static images, About portrait and Lottie posters
│   │   ├── js/                # article Lottie bootstrap (passthrough-copied)
│   │   └── lottie/            # approved article Lottie JSON (passthrough-copied)
│   ├── posts/
│   │   ├── posts.json         # directory data: default layout, "posts" tag, article marker
│   │   └── <year>/*.md        # posts, filenames YYYY-MM-DD-slug.md
│   ├── notes/
│   │   ├── notes.json         # directory data: Garden note layout and marker
│   │   └── *.md               # public concept notes, stable /notes/<slug>/ URLs
│   ├── index.njk              # homepage: 10 newest posts
│   ├── archive.njk            # all posts at /archive/
│   ├── topics-list.njk        # curated topic index at /topics/
│   ├── topics.njk             # paginated topic detail pages with notes + posts
│   ├── about.njk              # /about/ — hero band, tech chips, featured posts, contact CTA
│   ├── 404.md                 # /404.html (GitHub Pages picks it up)
│   ├── tags.njk               # paginated per-tag pages at /tags/<slug>/
│   ├── tags-list.njk          # all-tags index at /tags/
│   ├── feed.njk               # Atom feed at /feed.xml
│   ├── llms.njk               # /llms.txt for LLM crawlers
│   ├── sitemap.njk            # search-engine sitemap at /sitemap.xml
│   ├── robots.njk             # crawler rules at /robots.txt
│   └── indexnow-key.njk       # public IndexNow ownership key
├── _site/                     # build output (gitignored)
└── .cache/                    # eleventy-img cache (gitignored)
```

Eleventy dirs (from `eleventy.config.mjs`): input `src`, output `_site`, includes `_includes`, data `_data`.

## 5. Domain Models (High-Level)

No database — the "domain model" is the content model: Markdown files + frontmatter, materialized into Eleventy collections at build time.

### Core Entity Relationships

```
+--------------------+       tags[] (frontmatter)        +-----------------+
|  Post              | --------------------------------> |  Tag            |
|  src/posts/<yr>/*.md|   many-to-many                   |  (derived set)  |
+--------------------+                                   +-----------------+
        |                                                        |
        | glob src/posts/**/*.md, sorted by date desc            | unique tags, sorted,
        v                                                        v "posts" excluded
  collections.posts                                        collections.tagList
        |                                                        |
        +--> index.njk (newest 10)                               +--> tags-list.njk (/tags/)
        +--> feed.njk (newest 10)                                +--> tags.njk (pagination size 1
        +--> llms.njk (all public posts)                              → /tags/{{ tag | slug }}/)
```

### Model Details

**Post** — a Markdown file under `src/posts/<year>/`. Frontmatter schema:

| Field | Required | Notes |
|---|---|---|
| `title` | yes | shown in `<title>`, post header, cards, feed |
| `date` | yes | `YYYY-MM-DD`; sorts collections; rendered via `dateDisplay` (`yyyy年MM月dd日`, UTC) |
| `tags` | no | list; Chinese tags allowed (slugified via pinyin); `posts` is added by directory data — never manually |
| `description` | no | card excerpt + meta description; missing → card uses rendered content (150 chars), SEO uses normalized source content (160 chars) |
| `socialImage` | no | site-relative or absolute social image URL; missing → `site.socialImage` |
| `updated` | no | substantive update date; MUST be on/after `date`; drives visible and machine-readable freshness signals |
| `layout` | no — **do not set** | supplied by `src/posts/posts.json` |

**Tag** — not a file; derived by the `tagList` collection from all post frontmatter (excluding `posts`). URL: `/tags/{{ tag | slug }}/`.

**Topic** — an object in [src/_data/topics.json](../src/_data/topics.json) with `slug`, `title`,
`shortTitle`, `description`, and ordered `noteUrls`／`postUrls` arrays. A note or post MAY belong to
more than one topic. Topic pages render core notes first, then preserve the explicit article order;
note relations remain explicit and are not inferred from tags.

**Garden note** — a Markdown file under `src/notes/` with frontmatter `title`, `description`,
`created`, `updated`, `maturity`, and a unique non-empty `related` list of canonical `/notes/` or
`/posts/` URLs. The directory data supplies `layouts/garden-note.njk` and `isGardenNote: true`.
Maturity values are `seedling`（萌芽）, `growing`（成長中）, and `evergreen`（常青）. Notes use
`/notes/<slug>/` and are included in sitemap／llms surfaces but not the article archive or Atom feed.

**Site metadata** — [src/_data/site.json](../src/_data/site.json): site and author identity, display values, browser `themeColor`, IndexNow key, Google/Bing verification tokens, and analytics ID. Empty optional verification/analytics values keep their snippets disabled.

**Build version** — [src/_data/build.mjs](../src/_data/build.mjs): exposes `{{ build.version }}` (git short hash of HEAD; falls back to a timestamp when git is unavailable). `base.njk` appends it as `?v=` to both CSS links so a deploy bypasses the CDN's 4-hour `max-age` cache; rebuilding the same commit keeps the same URL.

**Index control** — layout-backed pages MAY set `noindex: true`; the base layout emits `noindex, nofollow`, and the sitemap excludes the page. The 404 page uses this setting.

## 6. API / Interface Structure

Static HTML site — the "interface" is the generated URL surface:

| URL | Source | Purpose |
|---|---|---|
| `/` | src/index.njk | homepage, 10 newest posts |
| `/posts/<year>/<YYYY-MM-DD-slug>/` | src/posts/`<year>`/*.md | individual posts — default Eleventy permalink mirrors the file path, date prefix included (verified: `/posts/2019/2019-03-19-nvm-install/`) |
| `/archive/` | src/archive.njk | all posts, newest first; complete crawlable article inventory |
| `/topics/` | src/topics-list.njk | manually curated topic index |
| `/topics/<slug>/` | src/topics.njk | ordered reading path for one curated topic |
| `/notes/<slug>/` | src/notes/*.md | public Digital Garden concept note |
| `/tags/` | src/tags-list.njk | all tags with post counts |
| `/tags/<slug>/` | src/tags.njk | per-tag post list (pagination over `tagList`, size 1) |
| `/about/` | src/about.njk | about page — hero, principles, topics, tech chips, featured posts, contact CTA |
| `/404.html` | src/404.md | not-found page (excluded from collections) |
| `/feed.xml` | src/feed.njk | Atom feed, newest 10 posts (excluded from collections) |
| `/llms.txt` | src/llms.njk | machine-readable site summary for LLMs (excluded from collections) |
| `/sitemap.xml` | src/sitemap.njk | indexable content and every generated tag URL |
| `/robots.txt` | src/robots.njk | allows crawling and advertises the sitemap |
| `/<indexNowKey>.txt` | src/indexnow-key.njk | public IndexNow ownership proof |
| `/assets/css/styles.css` | Tailwind CLI output | compiled site CSS; linked with `?v=<git short hash>` for CDN cache-busting |
| `/assets/css/prism-one-dark.css` | passthrough from node_modules/prism-themes | code-block theme; linked with `?v=<git short hash>` |
| `/assets/img/…` | eleventy-img output | optimized images (webp + jpeg; 300/600/1200 px) |
| `/assets/images/…` | passthrough of src/assets/images | raw static images |
| `/assets/lottie/…` | passthrough of src/assets/lottie | approved same-origin article Lottie JSON and optional sibling PNG/JPEG assets |
| `/assets/js/article-lottie.js` | passthrough of src/assets/js | post bootstrap; validates figures and conditionally loads the player |
| `/assets/js/lottie-light-5.13.0.min.js` | passthrough from pinned lottie-web | light SVG player, fetched only by eligible article figures |
| `/favicon.svg`, `/favicon.ico` | src/assets/icons | browser favicon set, passthrough-copied to the site root |
| `/apple-touch-icon.png` | src/assets/icons | 180×180 Apple home-screen icon |

Template helpers registered in [eleventy.config.mjs](../eleventy.config.mjs): filters `dateDisplay`,
`dateIso`, `readingTime` (CJK-aware: 400 CJK chars/min + 200 words/min), `seoDescription`
(Markdown/HTML to a 160-character search snippet), `seoTags`, `safeJson` (script-safe JSON-LD
serialization), `filterByTag`, `filterByUrls`, `topicsForPost`, `topicsForNote`, `relatedPosts`,
`relatedContent`, `backlinksForTarget`, `maturityLabel`, `limit`, `slug` (pinyin override); plugin
`eleventyImageTransformPlugin` (responsive images from plain `<img>`/markdown). Filter logic lives in
[lib/filters.mjs](../lib/filters.mjs).

## 7. Background Jobs & Scheduled Tasks

N/A — static site; no workers or schedules. The only automation is the deploy workflow (§10).

## 8. External Service Integrations

| Service | Where | Status |
|---|---|---|
| GitHub Pages | deploy target (`gh-pages` branch, CNAME `imfw.io`) | active |
| GitHub Actions | [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) | active |
| Google Search Console | DNS ownership verification; optional HTML-meta hook in [src/_includes/layouts/base.njk](../src/_includes/layouts/base.njk) | verified through DNS; sitemap submitted; HTML token intentionally empty |
| Bing Webmaster Tools | same layout, keyed by `site.bingSiteVerification` | verified; sitemap submitted |
| Google Analytics (gtag.js) | [src/_includes/layouts/base.njk](../src/_includes/layouts/base.njk), keyed by `site.googleAnalyticsId` | active (`G-QBS6V0SVT1`) |
| lottie-web | local npm dependency and post bootstrap | active only on article pages containing an approved Lottie figure |
| IndexNow | [scripts/submit-indexnow.mjs](../scripts/submit-indexnow.mjs), called by deploy workflow | active after deploy; non-blocking notification |

The deployed pages make no runtime API calls other than GA and same-origin Lottie JSON/player requests on eligible article pages; IndexNow runs only in CI after deployment.

## 9. Database / Data Stores

N/A — static site, no datastore. Content lives in Markdown files in the repo; the only cache is `.cache/` (eleventy-img, 1-day duration, gitignored).

## 10. Environments & Deployment

### Environments

| Environment | How | Notes |
|---|---|---|
| Local dev | `npm start` → http://localhost:8080 | eleventy --serve + Tailwind watch in parallel (npm-run-all) |
| Production | GitHub Pages at https://imfw.io | built by CI with `NODE_ENV=production` |

No staging environment; no env files or secrets beyond the implicit `GITHUB_TOKEN` in CI.

### Deployment Pipeline

Push to `main` (or manual `workflow_dispatch`) → GitHub Actions: full-history checkout → Node 22 setup (npm cache) → `npm ci` → `npm test` → `npm run build` (`NODE_ENV=production`) → `peaceiris/actions-gh-pages@v4` publishes `_site/` to the `gh-pages` branch with `cname: imfw.io` → non-blocking IndexNow notification for affected public URLs.

The verification gate is `npm test` (vitest): unit tests for [lib/filters.mjs](../lib/filters.mjs), frontmatter content rules for every post, and a build smoke suite that runs `npm run build` and asserts on `_site/` (CNAME, feed order, compiled CSS, tag pages, SEO metadata/JSON-LD, sitemap/robots, and social-image dimensions). A failing test blocks the deploy. There is still no linter.

### Configuration Hierarchy

1. [src/_data/site.json](../src/_data/site.json) — site metadata (global template data).
2. [eleventy.config.mjs](../eleventy.config.mjs) — build behavior (collections, filters, shortcodes, passthroughs, dirs).
3. [src/assets/css/input.css](../src/assets/css/input.css) — Tailwind v4 configuration + custom CSS layers.
4. [package.json](../package.json) — build scripts and dependency pins (with `js-yaml` override).
5. [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) — CI/CD.
