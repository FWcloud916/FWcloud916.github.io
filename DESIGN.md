---
colors:
  primary: "#155dfc"          # tailwind blue-600 — link/title hover accent
  background: "#f9fafb"       # tailwind gray-50 — page background (body)
  surface: "#ffffff"          # tailwind white — nav bar, post cards
  text-primary: "#101828"     # tailwind gray-900 — headings, body text
  text-secondary: "#4a5565"   # tailwind gray-600 — dates, reading time, nav links, footer
  text-muted: "#364153"       # tailwind gray-700 — card excerpts, gray tag chips
  border: "#e5e7eb"           # tailwind gray-200 — footer top border, info-banner border (blue-200 #bedbff)
  accent-surface: "#dbeafe"   # tailwind blue-100 — tag-chip background
  accent-text: "#193cb8"      # tailwind blue-800 — tag-chip text
  info-surface: "#eff6ff"     # tailwind blue-50 — empty-state banner background
  chip-neutral-surface: "#f3f4f6"  # tailwind gray-100 — card tag chips, inline code background
  code-block-background: "#282c34" # Prism One Dark (src/assets/css/input.css)
  success: "TODO — not found in code"
  warning: "TODO — not found in code"
  error: "TODO — not found in code"
typography:
  heading-1: { fontFamily: "Tailwind default font-sans stack (ui-sans-serif, system-ui, …)", fontSize: "2.25rem", fontWeight: 700, lineHeight: "2.5rem" }
  heading-2: { fontFamily: "Tailwind default font-sans stack", fontSize: "1.875rem", fontWeight: 700, lineHeight: "2.25rem" }
  heading-3: { fontFamily: "Tailwind default font-sans stack", fontSize: "1.5rem", fontWeight: 700, lineHeight: "2rem" }
  body: { fontFamily: "Tailwind default font-sans stack", fontSize: "1rem", fontWeight: 400, lineHeight: "1.5rem" }
  post-body: { fontFamily: "Tailwind default font-sans stack", fontSize: "1.125rem", fontWeight: 400, lineHeight: "prose-lg defaults (@tailwindcss/typography)" }
  caption: { fontFamily: "Tailwind default font-sans stack", fontSize: "0.875rem", fontWeight: 400, lineHeight: "1.25rem" }
rounded: { none: "0", sm: "0.25rem", lg: "0.5rem", full: "9999px" }
spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem", xxl: "3rem" }
components:
  nav: { background: "{colors.surface}", shadow: "shadow-sm", link-color: "{colors.text-secondary}", link-hover: "{colors.text-primary}" }
  card: { background: "{colors.surface}", rounded: "{rounded.lg}", shadow: "shadow-md", shadow-hover: "shadow-lg", padding: "{spacing.lg}" }
  tag-chip-post: { background: "{colors.accent-surface}", color: "{colors.accent-text}", rounded: "{rounded.full}", padding: "{spacing.xs} 0.75rem", hover-background: "#bedbff" }
  tag-chip-card: { background: "{colors.chip-neutral-surface}", color: "{colors.text-muted}", rounded: "{rounded.sm}", padding: "{spacing.xs} {spacing.sm}", hover-background: "{colors.border}" }
  tag-chip-index: { background: "{colors.accent-surface}", color: "{colors.accent-text}", rounded: "{rounded.lg}", padding: "{spacing.sm} {spacing.md}", hover-background: "#bedbff" }
  code-block: { background: "{colors.code-block-background}", rounded: "{rounded.lg}", shadow: "shadow-md", padding: "{spacing.md}" }
  inline-code: { background: "{colors.chip-neutral-surface}", rounded: "{rounded.sm}", fontSize: "{typography.caption.fontSize}" }
  info-banner: { background: "{colors.info-surface}", border: "1px solid #bedbff", rounded: "{rounded.lg}", color: "{colors.accent-text}", padding: "{spacing.lg}" }
---
# FW Blog Design System

## Overview

A clean, content-first blog look: near-white gray page background, white cards and nav, dark gray text, and a single blue accent used for hovers and tag chips. The one deliberate dark element is the Prism **One Dark** code block sitting on the light page. There is no bespoke theme layer — the design language IS Tailwind CSS v4 defaults plus utility classes in the Nunjucks templates; the only custom CSS is the prose/Prism reconciliation in [src/assets/css/input.css](src/assets/css/input.css).

All hex values above are sRGB conversions of the Tailwind v4 oklch palette tokens named in the comments (`node_modules/tailwindcss/theme.css`); in code, always write the **Tailwind class**, never the hex.

## Colors

- **Page:** body is `bg-gray-50 text-gray-900` ([src/_includes/layouts/base.njk](src/_includes/layouts/base.njk)); elevated surfaces (nav, cards) are `bg-white`.
- **Text hierarchy:** `text-gray-900` headings/titles → `text-gray-700` excerpts → `text-gray-600` metadata (dates, reading time, nav links, footer).
- **Accent:** blue only. Hover on titles/links: `hover:text-blue-600`. Tag chips: `bg-blue-100 text-blue-800` (post page, tags index) or neutral `bg-gray-100 text-gray-700` (post cards).
- **Code:** blocks are Prism One Dark on `#282c34` (the only raw hex in the codebase, `input.css`); inline code is `bg-gray-100` at `text-sm`.
- **Status colors:** none exist yet (`success`/`warning`/`error` are TODO) — the only message surface is the blue info banner (`bg-blue-50 border-blue-200 text-blue-800`) on the empty homepage.

## Typography

- No custom fonts — Tailwind's default `font-sans` system stack everywhere. Content is Traditional Chinese (`<html lang="zh-TW">`), so the system stack must not be replaced with a Latin-only webfont.
- Scale in use: `text-4xl font-bold` post/home titles → `text-3xl font-bold` section pages (tags) → `text-2xl font-bold` card titles → `text-sm` metadata and chips.
- Post bodies use `prose prose-lg max-w-none` (@tailwindcss/typography); don't hand-style Markdown output — extend the `.prose` overrides in `input.css` instead.

## Layout

- Single-column, centered: `max-w-4xl mx-auto px-4` for nav, main, and footer alike.
- Vertical rhythm on the Tailwind 0.25rem scale: `py-8` page padding, `space-y-6` between cards, `mb-8`/`mb-12` section gaps.
- Whitespace over dividers — the only border is the footer's `border-t border-gray-200`.

## Elevation & Depth

Three levels only: `shadow-sm` (nav bar) → `shadow-md` (cards, code blocks) → `shadow-lg` (card hover). No z-index layering, no modals.

## Shapes

- `rounded-lg` for containers (cards, code blocks, tags-index chips, banners).
- `rounded-full` pill chips on the post page; plain `rounded` for the small neutral chips on cards.
- Never mix radii within one component class.

## Components

- **Nav** ([nav.njk](src/_includes/components/nav.njk)): white bar, `shadow-sm`, site title bold left, links right; hover transitions `text-gray-600 → text-gray-900` (title → `text-blue-600`).
- **Post card** ([post-card.njk](src/_includes/components/post-card.njk)): white, `rounded-lg shadow-md hover:shadow-lg transition`, `p-6`; title, date + reading-time row, description (or 150-char truncation), neutral tag chips.
- **Tag chips**: three context variants (see `components` tokens); all get `transition` and a slightly darker background on hover; label is `#{{ tag }}`.
- **Code block**: One Dark background, `rounded-lg shadow-md`, `padding: 1rem` — enforced with `!important` in `input.css` to beat `.prose`; do not restyle via prose classes.
- **Interaction rule**: every hover state uses the `transition` utility; there are no buttons or form inputs yet — when adding one, use the primary blue on white with `rounded-lg`.

## Responsive Behavior

Mobile-first with Tailwind defaults; the layout is a fluid single column capped at `max-w-4xl`, so there are almost no breakpoint utilities in the templates. Images from the `image` shortcode are responsive (300/600/1200 px, `sizes` attribute).

## Do's and Don'ts

- ✅ Use Tailwind utility classes; ❌ don't write raw hex or inline styles (the sole exception, `#282c34`, already lives in `input.css`).
- ✅ Stay within the gray + blue palette; ❌ don't introduce new hues for decoration.
- ✅ Extend Markdown styling via `.prose` overrides in `input.css`; ❌ don't add per-element classes inside post content.
- ✅ Keep `lang="zh-TW"` text conventions (e.g. `yyyy年MM月dd日` dates, `N 分鐘閱讀`); ❌ don't switch UI copy to English piecemeal.
- ✅ Reuse `post-card.njk` / chip patterns for new list surfaces; ❌ don't fork near-duplicate components.

## Agent Prompt Guide

When generating UI for this project: write Nunjucks + Tailwind utilities only; pick colors by semantic role from the tokens above and translate them to the Tailwind class named in the token comment (e.g. `text-primary` → `text-gray-900`); wrap page content in the `max-w-4xl mx-auto px-4` column; add `transition` to anything with a hover state; and check the rendered result against `npm start` at http://localhost:8080.
