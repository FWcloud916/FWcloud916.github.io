# AISO Operations

> **Type:** Runbook
> **Audience:** Blog owner and developers maintaining AI-search visibility
> **Last updated:** 2026-07-13

This runbook covers AI Search Optimization for FW Blog. AISO builds on normal search fundamentals: public text must be crawlable and indexable, claims must be supported, author and update signals must agree, and performance must be measured instead of inferred.

## Current Controls

- Canonical URLs, robots metadata, Open Graph/X cards and structured data are generated centrally by `layouts/base.njk`.
- `BlogPosting` uses a stable author entity linked to `/about/`; `/about/` publishes matching `ProfilePage` and `Person` data.
- Optional post `updated` drives the visible updated date, `article:modified_time`, `dateModified`, sitemap `lastmod` and `llms.txt`.
- `/llms.txt` lists every public post with its canonical URL, publication/update dates, tags and description. It is an experimental discovery aid, not a guaranteed ranking signal.
- `robots.txt` explicitly permits OAI-SearchBot and permits other crawlers through the wildcard policy.
- GitHub Actions notifies IndexNow after deployment when content-facing files changed. Notification failure is logged but MUST NOT fail a completed site deployment.

## Crawler Policy

The current policy permits both search/discovery crawlers and model-training crawlers under `User-agent: *`. OAI-SearchBot is listed explicitly so ChatGPT Search access is unambiguous.

Changing training access is a content-policy decision. If the owner chooses to block model training while retaining search discovery, GPTBot and Google-Extended MUST be evaluated separately from OAI-SearchBot and Googlebot; they MUST NOT be treated as interchangeable user agents.

## Content Checklist

Before publishing or substantively updating an article:

1. Start with a direct answer or conclusion that can stand on its own.
2. State the intended audience, assumptions, tested environment and verification date when the topic changes over time.
3. Use descriptive headings; keep one primary H1 supplied by the post layout.
4. Put official sources next to the claims they support, and distinguish official rules, first-hand results and author judgment.
5. Prefer tables for comparisons and ordered lists for procedures.
6. Add internal links to the relevant topic overview and sibling articles.
7. Set `description`; set `updated` only for a substantive change.
8. Run `npm test` before pushing `main`.

## External Setup

These steps require access to third-party dashboards and cannot be completed solely from the repository.

### Google Search Console

1. Keep the DNS verification record active; no HTML meta tag is required.
2. Submit `https://imfw.io/sitemap.xml` and confirm its processing status.
3. Record indexed pages, Web impressions, clicks and queries monthly. Google AI features are included in the Web search type rather than a separate AISO report.

Status: ownership verified through DNS and `https://imfw.io/sitemap.xml` submitted. Continue monitoring processing and indexing results in Search Console.

### Bing Webmaster Tools

1. Deploy the configured `msvalidate.01` meta tag.
2. Verify `https://imfw.io/` in Bing Webmaster Tools.
3. Submit `https://imfw.io/sitemap.xml` and confirm its processing status.
4. Use AI Performance to record cited URLs and citation changes where the report is available.

Status: token configured; dashboard verification and sitemap submission remain after deploy.

### Google Analytics 4

Create an exploration or report filtered by page referrer／session source for at least `chatgpt.com`, `perplexity.ai` and `copilot.microsoft.com`. Record sessions, engaged sessions and landing pages monthly. Referral hostnames MAY change and SHOULD be reviewed against observed GA4 data rather than treated as a permanent exhaustive list.

Status: GA4 collection is active; custom AI referral report requires dashboard access.

## Monthly Scorecard

Record these values on the same day each month:

| Metric | Source | Purpose |
|---|---|---|
| Valid indexed pages | Search Console／Bing Webmaster | Detect discovery or indexing regressions |
| Search impressions and clicks | Search Console | Understand query demand and organic reach |
| AI citation count and cited URLs | Bing AI Performance | Identify content selected as answer evidence |
| AI referral sessions and engaged sessions | GA4 | Measure visits and visit quality |
| Articles updated with verified sources | Repository | Keep freshness work honest and auditable |

Do not use raw publication volume as the primary AISO success metric. Prefer accurate indexing, citations, qualified visits and useful topic coverage.
