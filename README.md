# FW Blog

A modern, fast, and elegant blog built with 11ty, Tailwind CSS, and Prism.js One Dark theme.

## ✨ Features

- 🚀 **Static Site Generation** - Built with 11ty for blazing fast performance
- 🎨 **Tailwind CSS** - Modern utility-first CSS framework with Typography plugin
- 🌙 **Prism One Dark Theme** - Beautiful syntax highlighting for code blocks (dark theme on light background)
- 📝 **Markdown Support** - Write content in Markdown with full formatting support
- 🏷️ **Tag System** - Automatic tag pages generation
- 📡 **RSS Feed** - Atom feed for blog subscribers
- 🖼️ **Image Optimization** - Automatic responsive images with WebP support
- 📱 **Responsive Design** - Mobile-first design that works on all devices
- ⚡ **GitHub Actions** - Automatic deployment to GitHub Pages
- 🔍 **SEO Ready** - Meta tags and semantic HTML

## 🚀 Quick Start

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests (filter units + content checks + build smoke)
npm test

# Build for production
npm run build
```

## 📁 Project Structure

```
.
├── eleventy.config.mjs       # 11ty configuration (collections, filters, shortcodes)
├── lib/                      # testable filter logic (pinyin slug, reading time, slug guard)
├── tests/                    # vitest suites (npm test)
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions workflow
├── docs/                     # Project documentation
├── src/
│   ├── _data/
│   │   └── site.json        # Site metadata
│   ├── _includes/
│   │   ├── layouts/         # Page layouts (base.njk, post.njk)
│   │   └── components/      # Reusable components (nav.njk, post-card.njk)
│   ├── assets/
│   │   ├── css/
│   │   │   └── input.css    # Tailwind CSS v4 entry (config lives here too)
│   │   └── images/          # Static images
│   ├── posts/               # Blog posts (Markdown, grouped by year)
│   │   └── posts.json       # Directory data: default layout + "posts" tag
│   ├── index.njk            # Homepage
│   ├── about.md             # About page
│   ├── 404.md               # Not-found page
│   ├── tags.njk             # Per-tag pages (auto-generated)
│   ├── tags-list.njk        # All-tags index at /tags/
│   ├── feed.njk             # Atom feed at /feed.xml
│   └── llms.njk             # llms.txt for LLM crawlers
├── _site/                   # Build output (generated)
├── CNAME                    # Custom domain (imfw.io)
└── package.json
```

## 📝 Writing Posts

Create a new Markdown file under `src/posts/<year>/` (e.g. `src/posts/2026/2026-07-13-my-post.md`). The layout and the `posts` tag are applied automatically by `src/posts/posts.json`:

```markdown
---
title: Your Post Title
date: 2026-07-13
tags:
  - javascript
  - tutorial
description: A brief description of your post
---

Your content here...
```

Chinese tags work too — the custom `slug` filter (in `eleventy.config.mjs`) transliterates them to pinyin for valid tag URLs.

## 🎨 Customization

### Site Information

Edit `src/_data/site.json`:

```json
{
  "title": "Your Blog Name",
  "url": "https://yourdomain.com",
  "description": "Your blog description",
  "author": "Your Name",
  "currentYear": "2026",
  "googleAnalyticsId": ""
}
```

### Styling

- Edit `src/assets/css/input.css` for custom CSS
- Tailwind CSS v4 is configured in CSS: `@import "tailwindcss"` and `@plugin "@tailwindcss/typography"` live in `input.css` — there is no `tailwind.config.js`
- Visual conventions and design tokens are documented in [DESIGN.md](DESIGN.md)

### Navigation

Edit `src/_includes/components/nav.njk` to customize the navigation menu.

## 🚢 Deployment

The blog automatically deploys to GitHub Pages when you push to the `main` branch.

### Requirements

1. Enable GitHub Pages in repository settings
2. Set source to `gh-pages` branch
3. Ensure `CNAME` file exists for custom domain (optional)

### Manual Deployment

```bash
npm run build
# Deploy _site/ folder to your hosting service
```

## 🛠️ Tech Stack

- [11ty](https://www.11ty.dev/) - Static site generator
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin) - Typography plugin
- [Prism.js](https://prismjs.com/) - Syntax highlighting (One Dark theme)
- [@11ty/eleventy-img](https://www.11ty.dev/docs/plugins/image/) - Image optimization
- [@11ty/eleventy-plugin-rss](https://www.11ty.dev/docs/plugins/rss/) - RSS feed generation
- [Luxon](https://moment.github.io/luxon/) - Date formatting
- [GitHub Actions](https://github.com/features/actions) - CI/CD

## 📚 Documentation

| Doc | What it covers |
|---|---|
| [docs/project-overview.md](docs/project-overview.md) | Architecture, directory map, content model, build pipeline, deployment |
| [docs/README.md](docs/README.md) | Configuration, content management, customization how-tos |
| [QUICKSTART.md](QUICKSTART.md) | Step-by-step setup and first post |
| [DESIGN.md](DESIGN.md) | Design tokens and visual conventions |
| [AGENTS.md](AGENTS.md) | Entry point for AI coding agents |

## 📄 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Contact

- GitHub: [@FWcloud916](https://github.com/FWcloud916)
- Website: [imfw.io](https://imfw.io)

---

Built with ❤️ using 11ty and Tailwind CSS
