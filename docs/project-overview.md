# FW Blog — Project Overview

> **Type:** Explanation
> **Audience:** Developers, AI assistants, and any tooling that needs project context
> **Last updated:** 2026-07-13
>
> Static personal blog (imfw.io) built with Eleventy 3 and Tailwind CSS v4, deployed to GitHub Pages. Related docs: [README.md](README.md) (how-tos), [../DESIGN.md](../DESIGN.md) (design system), [../AGENTS.md](../AGENTS.md) (agent guide).

---

## 1. Purpose

### 1.1 Core Responsibilities

- Publish blog posts written in Markdown (Traditional Chinese content about web development and technology) at https://imfw.io.
- Generate per-tag pages, an all-tags index, an Atom feed (`/feed.xml`), and an `llms.txt` (`/llms.txt`) for LLM crawlers.
- Optimize images at build time (responsive sizes, WebP) via the `image` shortcode.

### 1.2 Relationship with Other Systems

- **GitHub Pages** serves the built site from the `gh-pages` branch; the custom domain `imfw.io` is bound via the `CNAME` file.
- **GitHub Actions** ([.github/workflows/deploy.yml](../.github/workflows/deploy.yml)) builds and deploys on every push to `main`.
- **Google Analytics** is wired in [src/_includes/layouts/base.njk](../src/_includes/layouts/base.njk) but **not enabled** — `googleAnalyticsId` in [src/_data/site.json](../src/_data/site.json) is empty.

### 1.3 Deprecated / Retired or Not-Yet-Enabled Features

- **Not yet enabled:** Google Analytics (empty `googleAnalyticsId`, see §1.2).
- **Retired:** `tailwind.config.js` / `postcss.config.js` — removed in the Tailwind v4 migration; configuration now lives in CSS (`src/assets/css/input.css`). Do not recreate them.

## 2. Tech Stack

| Component | Version (lockfile) | Role |
|---|---|---|
| Node.js | 22 (CI: `node-version: '22'`) | runtime |
| @11ty/eleventy | 3.1.6 | static site generator (ESM config: [eleventy.config.mjs](../eleventy.config.mjs)) |
| tailwindcss + @tailwindcss/cli | 4.3.2 | CSS framework; v4 CSS-based config, compiled by the standalone CLI |
| @tailwindcss/typography | 0.5.20 | `prose` classes for Markdown post bodies |
| @11ty/eleventy-img | 6.0.4 | build-time image optimization (`image` shortcode) |
| @11ty/eleventy-plugin-rss | 3.0.0 | Atom feed filters (`dateToRfc3339`, `absoluteUrl`, …) |
| @11ty/eleventy-plugin-syntaxhighlight | 5.0.2 | Prism.js syntax highlighting at build time |
| prism-themes | 1.9.0 | Prism One Dark CSS (passthrough-copied from node_modules) |
| luxon | 3.7.2 | date formatting filters |
| pinyin-pro | 3.28.1 | Chinese→pinyin transliteration for the custom `slug` filter |
| npm-run-all | 4.1.5 | runs the two watch processes in parallel (`npm start`) |
| vitest | 3.2.7 | test runner (`npm test`): filter units, content checks, build smoke |
| gray-matter | 4.0.3 | frontmatter parsing in tests (tests/helpers.mjs) |

Notes:
- Templates are **Nunjucks** (`.njk`); Markdown files are also pre-processed as Nunjucks (`markdownTemplateEngine: "njk"`).
- `package.json` pins `js-yaml@^3.15.0` via `overrides` for `gray-matter`.
- There is **no linter**. Tests run via vitest (`npm test`, see §10).

## 3. Architecture Overview

Classic static-site pipeline — no server-side code at runtime:

```
src/**（Markdown + Nunjucks + JSON data）
   │  npm run build:11ty （Eleventy: collections, filters, shortcodes）
   ▼
_site/**（HTML, feed.xml, llms.txt, optimized images）
   │  npm run build:css （Tailwind CLI: input.css → styles.css, minified）
   ▼
_site/assets/css/styles.css
   │  GitHub Actions（push to main）
   ▼
gh-pages branch → GitHub Pages → https://imfw.io
```

### Key Principles

- **Build-time everything**: images, syntax highlighting, feeds are generated at build; the deployed site is pure static files with no client-side JS (except the optional GA snippet).
- **Data flows from `src/_data/site.json`**: templates MUST read site metadata as `{{ site.* }}`, never hardcode it.
- **Directory data over frontmatter**: [src/posts/posts.json](../src/posts/posts.json) supplies `layout: layouts/post.njk` and the `posts` tag to every post — individual posts do not repeat them.
- **Chinese-safe URLs**: the built-in `slug` filter is overridden (via [lib/filters.mjs](../lib/filters.mjs) `toSlug`) to transliterate Chinese via pinyin-pro; without it, CJK tags slugify to empty strings and collide. Tags whose slugs collide anyway (case variants, homophones) or come out empty **fail the build** (`assertNoSlugCollisions`, called from the `tagList` collection).
- **CSS builds after Eleventy**: `npm run build` runs `build:11ty` then `build:css` because Tailwind writes directly into `_site/assets/css/`.

## 4. Directory Structure

```
.
├── eleventy.config.mjs        # Eleventy config: plugins, passthroughs, collections, filters, image shortcode
├── lib/filters.mjs            # testable filter logic: toSlug (pinyin), readingTime (CJK-aware), slug-collision guard
├── tests/                     # vitest: filters.test (units), content.test (frontmatter rules), build.test (_site smoke)
├── package.json               # scripts (build/start/test/clean); all deps are devDependencies
├── CNAME                      # "imfw.io" — passthrough-copied into _site/
├── QUICKSTART.md              # setup + first-post walkthrough
├── DESIGN.md                  # design tokens & visual conventions
├── AGENTS.md / CLAUDE.md      # agent guide (CLAUDE.md is a symlink)
├── PROGRESS.md                # agent-harness state (session log, feature list)
├── .github/
│   ├── workflows/deploy.yml   # build on push to main → deploy _site/ to gh-pages
│   └── prompts/               # original project-plan prompt (historical)
├── docs/
│   ├── README.md              # configuration / content-management / customization how-tos
│   ├── project-overview.md    # this file
│   └── sample-post.md         # example post showing frontmatter + Markdown features
├── src/
│   ├── _data/site.json        # global site metadata ({{ site.* }} in templates)
│   ├── _includes/
│   │   ├── layouts/base.njk   # HTML shell: <head>, nav, footer, GA hook
│   │   ├── layouts/post.njk   # article layout: title, date, reading time, tag chips
│   │   └── components/        # nav.njk (top bar), post-card.njk (list-item card)
│   ├── assets/
│   │   ├── css/input.css      # Tailwind v4 entry + prose/Prism overrides (THE Tailwind config)
│   │   └── images/            # static images (passthrough-copied)
│   ├── posts/
│   │   ├── posts.json         # directory data: default layout + "posts" tag
│   │   └── <year>/*.md        # posts, filenames YYYY-MM-DD-slug.md
│   ├── index.njk              # homepage: 10 newest posts
│   ├── about.md               # /about/
│   ├── 404.md                 # /404.html (GitHub Pages picks it up)
│   ├── tags.njk               # paginated per-tag pages at /tags/<slug>/
│   ├── tags-list.njk          # all-tags index at /tags/
│   ├── feed.njk               # Atom feed at /feed.xml
│   └── llms.njk               # /llms.txt for LLM crawlers
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
        +--> llms.njk (newest 10)                                     → /tags/{{ tag | slug }}/)
```

### Model Details

**Post** — a Markdown file under `src/posts/<year>/`. Frontmatter schema:

| Field | Required | Notes |
|---|---|---|
| `title` | yes | shown in `<title>`, post header, cards, feed |
| `date` | yes | `YYYY-MM-DD`; sorts collections; rendered via `dateDisplay` (`yyyy年MM月dd日`, UTC) |
| `tags` | no | list; Chinese tags allowed (slugified via pinyin); `posts` is added by directory data — never manually |
| `description` | no | card excerpt + meta description; missing → card falls back to truncated content (150 chars) |
| `layout` | no — **do not set** | supplied by `src/posts/posts.json` |

**Tag** — not a file; derived by the `tagList` collection from all post frontmatter (excluding `posts`). URL: `/tags/{{ tag | slug }}/`.

**Site metadata** — [src/_data/site.json](../src/_data/site.json): `title`, `url`, `description`, `author`, `currentYear`, `googleAnalyticsId`.

## 6. API / Interface Structure

Static HTML site — the "interface" is the generated URL surface:

| URL | Source | Purpose |
|---|---|---|
| `/` | src/index.njk | homepage, 10 newest posts |
| `/posts/<year>/<YYYY-MM-DD-slug>/` | src/posts/`<year>`/*.md | individual posts — default Eleventy permalink mirrors the file path, date prefix included (verified: `/posts/2019/2019-03-19-nvm-install/`) |
| `/tags/` | src/tags-list.njk | all tags with post counts |
| `/tags/<slug>/` | src/tags.njk | per-tag post list (pagination over `tagList`, size 1) |
| `/about/` | src/about.md | about page |
| `/404.html` | src/404.md | not-found page (excluded from collections) |
| `/feed.xml` | src/feed.njk | Atom feed, newest 10 posts (excluded from collections) |
| `/llms.txt` | src/llms.njk | machine-readable site summary for LLMs (excluded from collections) |
| `/assets/css/styles.css` | Tailwind CLI output | compiled site CSS |
| `/assets/css/prism-one-dark.css` | passthrough from node_modules/prism-themes | code-block theme |
| `/assets/img/…` | eleventy-img output | optimized images (webp + jpeg; 300/600/1200 px) |
| `/assets/images/…` | passthrough of src/assets/images | raw static images |

Template helpers registered in [eleventy.config.mjs](../eleventy.config.mjs): filters `dateDisplay`, `dateIso`, `readingTime` (CJK-aware: 400 CJK chars/min + 200 words/min, HTML-stripped — logic in [lib/filters.mjs](../lib/filters.mjs)), `filterByTag`, `limit`, `slug` (pinyin override, also in lib/filters.mjs); shortcode `image(src, alt, sizes)`.

## 7. Background Jobs & Scheduled Tasks

N/A — static site; no workers or schedules. The only automation is the deploy workflow (§10).

## 8. External Service Integrations

| Service | Where | Status |
|---|---|---|
| GitHub Pages | deploy target (`gh-pages` branch, CNAME `imfw.io`) | active |
| GitHub Actions | [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) | active |
| Google Analytics (gtag.js) | [src/_includes/layouts/base.njk](../src/_includes/layouts/base.njk), keyed by `site.googleAnalyticsId` | **not enabled** (empty ID) |

No other outbound integrations; the built site makes no API calls.

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

Push to `main` (or manual `workflow_dispatch`) → GitHub Actions: checkout → Node 22 setup (npm cache) → `npm ci` → `npm test` → `npm run build` (`NODE_ENV=production`) → `peaceiris/actions-gh-pages@v3` publishes `_site/` to the `gh-pages` branch with `cname: imfw.io`.

The verification gate is `npm test` (vitest): unit tests for [lib/filters.mjs](../lib/filters.mjs), frontmatter content rules for every post, and a build smoke suite that runs `npm run build` and asserts on `_site/` (CNAME, newest post on the homepage and first in feed.xml, compiled CSS, one page per tag). A failing test blocks the deploy. There is still no linter.

### Configuration Hierarchy

1. [src/_data/site.json](../src/_data/site.json) — site metadata (global template data).
2. [eleventy.config.mjs](../eleventy.config.mjs) — build behavior (collections, filters, shortcodes, passthroughs, dirs).
3. [src/assets/css/input.css](../src/assets/css/input.css) — Tailwind v4 configuration + custom CSS layers.
4. [package.json](../package.json) — build scripts and dependency pins (with `js-yaml` override).
5. [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) — CI/CD.
