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

# Build for production
npm run build
```

## 📁 Project Structure

```
.
├── .eleventy.js              # 11ty configuration
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions workflow
├── src/
│   ├── _data/
│   │   └── site.json        # Site metadata
│   ├── _includes/
│   │   ├── layouts/         # Page layouts
│   │   └── components/      # Reusable components
│   ├── assets/
│   │   ├── css/
│   │   │   └── input.css    # Tailwind CSS input
│   │   └── images/          # Static images
│   ├── posts/               # Blog posts (Markdown)
│   ├── index.njk            # Homepage
│   ├── about.md             # About page
│   ├── tags.njk             # Tag pages (auto-generated)
│   └── feed.njk             # RSS feed
├── _site/                   # Build output (generated)
├── package.json
├── tailwind.config.js       # Tailwind configuration
└── postcss.config.js        # PostCSS configuration
```

## 📝 Writing Posts

Create a new Markdown file in `src/posts/`:

```markdown
---
layout: layouts/post.njk
title: Your Post Title
date: 2025-12-19
tags:
  - javascript
  - tutorial
description: A brief description of your post
---

Your content here...
```

## 🎨 Customization

### Site Information

Edit `src/_data/site.json`:

```json
{
  "title": "Your Blog Name",
  "url": "https://yourdomain.com",
  "description": "Your blog description",
  "author": "Your Name"
}
```

### Styling

- Edit `src/assets/css/input.css` for custom CSS
- Modify `tailwind.config.js` for Tailwind customization

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

## 📄 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Contact

- GitHub: [@FWcloud916](https://github.com/FWcloud916)
- Website: [imfw.io](https://imfw.io)

---

Built with ❤️ using 11ty and Tailwind CSS
