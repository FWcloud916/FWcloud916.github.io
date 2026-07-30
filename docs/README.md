# FW Blog — Documentation

> **Type:** How-to guides
> **Audience:** Developers and AI assistants working on the blog
> **Last updated:** 2026-07-30

Complete documentation for the FW Blog.

## Table of Contents

- [Quick Start Guide](../QUICKSTART.md)
- [Project Overview](project-overview.md) — architecture, content model, deployment
- [Design System](../DESIGN.md) — design tokens and visual conventions
- [AISO Operations](aiso.md) — crawler policy, content checklist and measurement runbook
- [Configuration](#configuration)
- [Content Management](#content-management)
- [Customization](#customization)
- [Deployment](#deployment)
- [Advanced Topics](#advanced-topics)

## Configuration

### Site Configuration

All global site settings are stored in `src/_data/site.json`:

```json
{
  "title": "Your Blog Name",
  "url": "https://yourdomain.com",
  "description": "Your blog description",
  "author": "Your Name",
  "authorUrl": "https://example.com/about/",
  "authorDescription": "Your public author bio",
  "authorSameAs": ["https://github.com/your-account"],
  "currentYear": "2026",
  "socialImage": "/assets/images/og-default.png",
  "indexNowKey": "your-public-indexnow-key",
  "googleSiteVerification": "",
  "bingSiteVerification": "",
  "googleAnalyticsId": ""
}
```

These values are accessible in all templates via `{{ site.property }}`. Leave the verification and analytics IDs empty to keep their snippets disabled.

### 11ty Configuration

The `eleventy.config.mjs` file (ESM) contains all 11ty-specific configuration:

#### Collections

- **posts**: All blog posts sorted by date (newest first)
- **tagList**: All unique tags used across posts

#### Filters

- **dateDisplay**: Formats dates as "YYYY年MM月DD日"
- **dateIso**: Converts dates to ISO format
- **readingTime**: Calculates estimated reading time
- **seoDescription**: Converts Markdown/HTML into a normalized 160-character search snippet
- **seoTags**: Removes Eleventy's internal `posts` tag from public metadata
- **safeJson**: Serializes JSON-LD values without allowing content to close the script element
- **filterByTag**: Filters posts by specific tag
- **limit**: Limits array to specified number of items
- **slug**: Overrides the built-in slugifier — transliterates Chinese to pinyin (via pinyin-pro) so CJK tags get valid URLs (e.g. 工具 → `gong-ju`)

#### Image Transform

- **eleventyImageTransformPlugin**: Upgrades every `<img>` in output HTML to a responsive `<picture>` with multiple sizes and WebP format — posts use plain markdown `![alt](/assets/images/…)`

### Tailwind Configuration

This project uses **Tailwind CSS v4**, which is configured in CSS — there is no `tailwind.config.js` or `postcss.config.js`. Everything lives in `src/assets/css/input.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

/* Custom theme values */
@theme {
  --color-brand: #your-color;
}

/* Custom component styles */
@layer components {
  .my-class {
    @apply px-4 py-2;
  }
}
```

The CSS is compiled by the standalone Tailwind CLI (`@tailwindcss/cli`), invoked by the `build:css` / `watch:css` scripts in `package.json`. Minification is always on via the `--minify` flag. Content scanning is automatic in v4 — no `content` array needed.

## Content Management

### Blog Posts

#### File Structure

Posts are stored in year subdirectories `src/posts/<year>/` with the naming convention:
```
YYYY-MM-DD-post-slug.md
```

The post URL mirrors the file path: `/posts/<year>/YYYY-MM-DD-post-slug/`.

#### Front Matter

```yaml
---
title: Your Post Title          # Required: Post title
date: 2025-12-19               # Required: Publication date
updated: 2026-01-10            # Optional: substantive update; cannot precede date
tags:                           # Optional: Post tags (Chinese OK — slugified via pinyin)
  - javascript
  - tutorial
description: Brief description  # Optional: Post excerpt and SEO description
socialImage: /assets/images/post-card.png # Optional: 1200×630 image overriding the site default
---
```

The `layout` (`layouts/post.njk`) and the `posts` tag are supplied automatically by `src/posts/posts.json` — do not set them per post.

#### Content

Use standard Markdown syntax. The content will be rendered with:
- **Tailwind Typography** for styling
- **Prism.js One Dark** for code syntax highlighting

### Pages

#### Creating Static Pages

Create `.md` or `.njk` files in `src/`:

```markdown
---
layout: layouts/base.njk
title: Page Title
permalink: /page-slug/
---

# Page Content
```

#### Available Layouts

- **layouts/base.njk**: Base layout with header/footer
- **layouts/post.njk**: Blog post layout with metadata

### Tags

Tags are automatically processed:

1. Add tags to post front matter
2. Tag pages are auto-generated at `/tags/{tag}/`
3. Tag list page available at `/tags/`

### Navigation

Edit `src/_includes/components/nav.njk`:

```html
<ul class="flex gap-6">
  <li><a href="/">Home</a></li>
  <li><a href="/tags/">Tags</a></li>
  <li><a href="/about/">About</a></li>
  <!-- Add custom links -->
</ul>
```

## Customization

### Styling

#### Global CSS

Edit `src/assets/css/input.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .custom-button {
    @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600;
  }
}
```

#### Component Styles

Modify component files in `src/_includes/components/`:
- **nav.njk**: Navigation bar
- **post-card.njk**: Post preview cards

#### Layout Styles

Modify layout files in `src/_includes/layouts/`:
- **base.njk**: Main site structure
- **post.njk**: Individual post layout

### Code Highlighting

The blog uses Prism.js One Dark theme for syntax highlighting.

#### Supported Languages

All Prism.js languages are supported automatically:
- JavaScript/TypeScript
- HTML/CSS
- Python, Ruby, PHP
- Bash, Shell
- And many more...

#### Customizing Code Blocks

Edit the Prism CSS in `src/assets/css/input.css`:

```css
.prose pre[class*="language-"] {
  @apply rounded-lg shadow-md;
  background-color: #282c34 !important;
  padding: 1rem !important;
}
```

### Images

#### Using Markdown Syntax

Place your image in `src/assets/images/` and reference it with plain markdown:

```markdown
![Alt text](/assets/images/photo.jpg)
```

At build time `eleventyImageTransformPlugin` upgrades every `<img>` in the output
HTML to a responsive `<picture>` (widths 300/600/1200, WebP + JPEG, lazy loading,
default `sizes="(min-width: 30em) 50vw, 100vw"`). Notes:

- To override attributes per image (e.g. `sizes`), write a raw HTML `<img src alt sizes>`
  tag — per-tag attributes win over the plugin defaults.
- Remote `http(s)` images are downloaded and self-hosted by the transform; use
  `<img eleventy:ignore src="…">` to keep one untouched.
- Markdown files are NOT processed by Nunjucks (`markdownTemplateEngine: false`),
  so `{{ }}` inside code fences is safe as-is — no `{% raw %}` wrappers needed.

#### Configuration

Modify image settings in `eleventy.config.mjs`:

```javascript
eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
  widths: [300, 600, 1200],    // Generated sizes
  formats: ["webp", "jpeg"],    // Output formats
  outputDir: "./_site/assets/img/",
  urlPath: "/assets/img/",
  defaultAttributes: { loading: "lazy", decoding: "async", sizes: "…" },
});
```

### Article Lottie Animations

Article animations are progressive enhancements, not replacements for readable static content. Put reviewed JSON in `src/assets/lottie/`, put its 1200×675 poster in `src/assets/images/`, and add this raw HTML contract to the post:

```html
<figure class="article-lottie"
        data-lottie-src="/assets/lottie/example.json">
  <div class="article-lottie__stage"
       role="img"
       aria-label="Describe the complete meaning of the animation.">
    <img eleventy:ignore
         src="/assets/images/example-poster.jpg"
         alt="Describe the complete meaning of the animation."
         width="1200"
         height="675"
         loading="lazy"
         decoding="async">
  </div>
  <figcaption>Brief visible caption.</figcaption>
</figure>
```

Requirements:

- `data-lottie-src` MUST be a root-relative `.json` URL under `/assets/lottie/`. Absolute URLs, query strings, and path traversal are rejected.
- Article v1 JSON MUST be 1200×675 at 24 FPS, 4–12 seconds long, and no larger than 1 MB. A post MAY contain at most two animations.
- A Lottie image asset MAY use a bare `.png`, `.jpg`, or `.jpeg` filename stored beside its JSON. Its `u` MUST be absent, empty, or `./`; its `e` MUST be absent or `0`. URLs, path separators/traversal, embedded assets, other extensions, and more than 5 MB of local images are rejected.
- The stage MUST have `role="img"` and a complete `aria-label`; the poster MUST use the same meaningful `alt` and `eleventy:ignore` so the image transform does not replace the fallback.
- Keep a non-empty `figcaption`. The poster remains visible when JavaScript or the player fails and whenever the visitor requests reduced motion.
- The post layout loads only the small `article-lottie.js` bootstrap. It loads the pinned local light/SVG player and JSON after finding an eligible figure; animations play once on entry, pause offscreen, resume on return, and expose play/pause/replay controls.
- Lottie fonts are remapped in memory to the site's existing `Huninn` webfont. Do not add remote font paths to JSON.

### RSS Feed

The RSS feed is automatically generated at `/feed.xml`.

#### Customizing Feed

Edit `src/feed.njk`:

```xml
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>{{ site.title }}</title>
  <!-- Customize feed metadata -->
</feed>
```

## Deployment

### GitHub Pages (Automatic)

The repository includes GitHub Actions workflow for automatic deployment.

#### Workflow File

`.github/workflows/deploy.yml` triggers on:
- Push to `main` branch
- Manual workflow dispatch

#### Process

1. Checkout code
2. Setup Node.js 22
3. Install dependencies (`npm ci`)
4. Run the verification gate (`npm test`)
5. Build site (`npm run build`)
6. Deploy to `gh-pages` branch
7. Notify IndexNow about affected public URLs (non-blocking)

#### Custom Domain

The CNAME file is automatically preserved during deployment.

### Manual Deployment

#### Build

```bash
npm run build
```

#### Deploy to Static Hosting

Upload the `_site/` folder to:
- Netlify
- Vercel
- AWS S3
- Cloudflare Pages
- Any static host

### Environment Variables

CI sets `NODE_ENV=production` for the build (see `.github/workflows/deploy.yml`), but the output is the same either way: CSS minification is always on via the Tailwind CLI `--minify` flag in the `build:css` script.

## Advanced Topics

### Custom Collections

Add custom collections in `eleventy.config.mjs`:

```javascript
eleventyConfig.addCollection("featured", function(collection) {
  return collection.getFilteredByGlob("src/posts/**/*.md")
    .filter(post => post.data.featured === true);
});
```

### Custom Filters

Add custom filters in `eleventy.config.mjs`:

```javascript
eleventyConfig.addFilter("uppercase", function(value) {
  return value.toUpperCase();
});
```

Use in templates:

```njk
{{ title | uppercase }}
```

### Custom Shortcodes

Add shortcodes for reusable components:

```javascript
eleventyConfig.addShortcode("youtube", function(videoId) {
  return `<iframe src="https://www.youtube.com/embed/${videoId}"></iframe>`;
});
```

Use in content:

```markdown
{% youtube "dQw4w9WgXcQ" %}
```

### Performance Optimization

#### Image Optimization

- Use WebP format
- Generate multiple sizes
- Implement lazy loading
- Use responsive images

#### CSS Optimization

- Purge unused CSS with Tailwind
- Minify with cssnano in production
- Use critical CSS (optional)

#### Caching

Configure in `eleventy.config.mjs` (the image cache lives in `.cache/`, gitignored):

```javascript
cacheOptions: {
  duration: "1d",
  directory: ".cache",
}
```

### SEO Optimization

`layouts/base.njk` generates canonical URLs, robots directives, Open Graph/X cards, and `WebSite`/`BlogPosting`/`ProfilePage` JSON-LD. The default social card is configured by `site.socialImage`; a post can override it with `socialImage` frontmatter. Visible bylines and structured data share the author identity configured in `site.json`.

`/sitemap.xml` and `/robots.txt` are generated by `src/sitemap.njk` and `src/robots.njk`. Post `updated` values become visible updated dates, `dateModified`, and sitemap `lastmod`. Set `noindex: true` on a layout-backed page to emit `noindex, nofollow` and omit it from the sitemap. The 404 page already uses this setting.

Google Search Console ownership may be verified through DNS without changing this repository. If HTML-tag verification is used instead, set `googleSiteVerification` in `src/_data/site.json` to the supplied content token, then run `npm test` and inspect the built page's `<head>`. Keep it empty after DNS verification to avoid emitting a redundant tag.

For Bing Webmaster Tools, set `bingSiteVerification` to the `msvalidate.01` content token. IndexNow ownership uses the public `indexNowKey`; its matching root key page MUST remain deployed.

The operational AISO checklist, crawler policy and measurement procedure live in [aiso.md](aiso.md).

### Analytics

Set `googleAnalyticsId` in `src/_data/site.json`. The existing conditional hook in `layouts/base.njk` emits gtag only when the value is non-empty.

## Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear cache and node_modules
rm -rf node_modules _site .cache
npm install
npm run build
```

#### CSS Not Updating

- Restart development server
- Clear browser cache
- Make sure the class appears in a template Tailwind can see (v4 scans sources automatically)

#### Images Not Generating

- Verify image path is correct
- Check `.cache` directory permissions
- Ensure sufficient disk space

### Debug Mode

Enable verbose logging:

```bash
DEBUG=Eleventy* npm run build
```

## Resources

- [11ty Documentation](https://www.11ty.dev/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Prism.js Documentation](https://prismjs.com/)
- [Nunjucks Template Documentation](https://mozilla.github.io/nunjucks/)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License (declared in `package.json`).

---

Need help? [Open an issue](https://github.com/FWcloud916/FWcloud916.github.io/issues) on GitHub.
