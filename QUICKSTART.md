# Quick Start Guide

Get your 11ty blog up and running in minutes!

## Prerequisites

- Node.js 18 or higher (CI builds with Node 22)
- npm or yarn
- Git
- A GitHub account (for deployment)

## Installation

### 1. Clone or Fork the Repository

```bash
git clone https://github.com/FWcloud916/FWcloud916.github.io.git
cd FWcloud916.github.io
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- 11ty
- Tailwind CSS
- Prism.js themes
- Image optimization plugins
- RSS feed generator

### 3. Configure Your Site

Edit `src/_data/site.json`:

```json
{
  "title": "Your Blog Name",
  "url": "https://yourdomain.com",
  "description": "Your blog description",
  "author": "Your Name",
  "currentYear": "2025"
}
```

### 4. Start Development Server

```bash
npm start
```

This will:
- Start the 11ty development server on `http://localhost:8080`
- Watch for file changes and rebuild automatically
- Compile Tailwind CSS in watch mode

Your blog should now be running at `http://localhost:8080`!

## Development Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start development server with hot reload |
| `npm test` | Run tests (filter units, post frontmatter checks, build smoke) |
| `npm run build` | Build for production |
| `npm run build:11ty` | Build 11ty only |
| `npm run build:css` | Build Tailwind CSS only |
| `npm run clean` | Remove `_site/` directory |

## Creating Your First Post

### 1. Create a New Markdown File

Create a file in the year subdirectory `src/posts/<year>/` with the format `YYYY-MM-DD-post-title.md`:

```bash
touch src/posts/2026/2026-07-13-my-first-post.md
```

### 2. Add Front Matter

```markdown
---
title: My First Blog Post
date: 2026-07-13
tags:
  - getting-started
  - tutorial
description: This is my first post on my new blog!
---

Your content goes here...
```

You don't need to set `layout` or a `posts` tag — `src/posts/posts.json` applies both to every file under `src/posts/` automatically.

### 3. Write Content

Use standard Markdown syntax:

```markdown
## Heading 2

This is a paragraph with **bold** and *italic* text.

### Code Example

```javascript
function hello() {
  console.log("Hello, World!");
}
```

### Lists

- Item 1
- Item 2
- Item 3

### Links

Check out [11ty documentation](https://www.11ty.dev/).
```

### 4. View Your Post

The post will automatically appear on your homepage and be accessible at a URL mirroring its file path (date prefix included):
- `http://localhost:8080/posts/2026/2026-07-13-my-first-post/`

## Adding Images

Place your image in `src/assets/images/` and use standard markdown:

```markdown
![Alt text](/assets/images/my-photo.jpg)
```

The build-time image transform automatically:
- Generates multiple sizes (300px, 600px, 1200px)
- Creates WebP format
- Adds lazy loading
- Makes images responsive

## Customizing Styles

### Global Styles

Edit `src/assets/css/input.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@layer components {
  .my-custom-class {
    @apply bg-blue-500 text-white p-4;
  }
}
```

### Tailwind Configuration

This project uses Tailwind CSS v4 — there is no `tailwind.config.js`. Configuration lives in CSS. To add custom theme values, use `@theme` in `src/assets/css/input.css`:

```css
@theme {
  --color-brand: #your-color;
}
```

See [DESIGN.md](DESIGN.md) for the site's design tokens and visual conventions before changing styles.

## Adding Pages

### 1. Create a New Page

Create `src/my-page.md`:

```markdown
---
layout: layouts/base.njk
title: My Page
permalink: /my-page/
---

# My Page Content

This is a custom page.
```

### 2. Add to Navigation

Edit `src/_includes/components/nav.njk`:

```html
<li>
  <a href="/my-page/" class="text-gray-600 hover:text-gray-900 transition">
    My Page
  </a>
</li>
```

## Deploying to GitHub Pages

### 1. Update CNAME (Optional)

If using a custom domain, edit `CNAME`:

```
yourdomain.com
```

### 2. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. Configure GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages"
3. Set source to `gh-pages` branch
4. Save

GitHub Actions will automatically build and deploy your site!

### 4. Verify Deployment

Your site will be available at:
- Custom domain: `https://yourdomain.com`
- GitHub Pages: `https://username.github.io/repository-name/`

## Working with Tags

Tags are automatically generated! Just add them to your post front matter:

```markdown
---
tags:
  - javascript
  - tutorial
  - web-development
---
```

This creates:
- Tag pages at `/tags/javascript/`, `/tags/tutorial/`, etc.
- Tag list page at `/tags/`
- Tag badges on posts

## RSS Feed

Your RSS feed is automatically generated at `/feed.xml`.

Readers can subscribe using:
```
https://yourdomain.com/feed.xml
```

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build
```

### CSS Not Updating

```bash
# Restart the development server
# Press Ctrl+C to stop, then:
npm start
```

### Port Already in Use

11ty uses port 8080 by default. If it's in use:

```bash
# Kill the process using port 8080
lsof -ti:8080 | xargs kill -9

# Or change the port in package.json
"watch:11ty": "eleventy --serve --port=3000"
```

## Next Steps

- ✅ Customize your site information in `site.json`
- ✅ Write your first blog post
- ✅ Update the about page
- ✅ Customize colors and styles
- ✅ Add your own images
- ✅ Deploy to GitHub Pages

## Need Help?

- 📚 [11ty Documentation](https://www.11ty.dev/docs/)
- 🎨 [Tailwind CSS Docs](https://tailwindcss.com/docs)
- 💬 [11ty Discord Community](https://www.11ty.dev/blog/discord/)
- 🐛 [Report Issues](https://github.com/FWcloud916/FWcloud916.github.io/issues)

---

Happy blogging! 🎉
