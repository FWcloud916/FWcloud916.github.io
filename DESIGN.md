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
  heading-1: { fontFamily: "Huninn + system font-sans fallback stack (ui-sans-serif, system-ui, …)", fontSize: "2.25rem", fontWeight: 700, lineHeight: "2.5rem" }
  heading-2: { fontFamily: "Huninn + system fallback stack", fontSize: "1.875rem", fontWeight: 700, lineHeight: "2.25rem" }
  heading-3: { fontFamily: "Huninn + system fallback stack", fontSize: "1.5rem", fontWeight: 700, lineHeight: "2rem" }
  body: { fontFamily: "Huninn + system fallback stack", fontSize: "1rem", fontWeight: 400, lineHeight: "1.5rem" }
  post-body: { fontFamily: "Huninn + system fallback stack", fontSize: "1.125rem", fontWeight: 400, lineHeight: "prose-lg defaults (@tailwindcss/typography)" }
  caption: { fontFamily: "Huninn + system fallback stack", fontSize: "0.875rem", fontWeight: 400, lineHeight: "1.25rem" }
rounded: { none: "0", sm: "0.25rem", lg: "0.5rem", full: "9999px" }
spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem", xxl: "3rem" }
components:
  nav: { background: "{colors.surface}", shadow: "shadow-sm", link-color: "{colors.text-secondary}", link-hover: "{colors.text-primary}", mobile-gap: "1rem", desktop-gap: "1.5rem" }
  card: { background: "{colors.surface}", rounded: "{rounded.lg}", shadow: "shadow-md", shadow-hover: "shadow-lg", padding: "{spacing.lg}" }
  topic-card: { extends: "{components.card}", body: "description + article count link" }
  work-card: { extends: "{components.card}", layout: "stacked → 16rem image + body at md", body: "type + description + tags + optional install command + actions" }
  tag-chip-post: { background: "{colors.accent-surface}", color: "{colors.accent-text}", rounded: "{rounded.full}", padding: "{spacing.xs} 0.75rem", hover-background: "#bedbff" }
  tag-chip-card: { background: "{colors.chip-neutral-surface}", color: "{colors.text-muted}", rounded: "{rounded.sm}", padding: "{spacing.xs} {spacing.sm}", hover-background: "{colors.border}" }
  tag-chip-index: { background: "{colors.accent-surface}", color: "{colors.accent-text}", rounded: "{rounded.lg}", padding: "{spacing.sm} {spacing.md}", hover-background: "#bedbff" }
  code-block: { background: "{colors.code-block-background}", rounded: "{rounded.lg}", shadow: "shadow-md", padding: "{spacing.md}" }
  inline-code: { background: "{colors.chip-neutral-surface}", rounded: "{rounded.sm}", fontSize: "{typography.caption.fontSize}" }
  info-banner: { background: "{colors.info-surface}", border: "1px solid #bedbff", rounded: "{rounded.lg}", color: "{colors.accent-text}", padding: "{spacing.lg}" }
  article-lottie: { background: "{colors.chip-neutral-surface}", rounded: "{rounded.lg}", shadow: "shadow-md", aspectRatio: "16 / 9", controlGap: "{spacing.md}", control: "blue-600 on white" }
  hero-band: { background: "gray-900 (inverted {colors.text-primary})", rounded: "{rounded.lg}", shadow: "shadow-md", heading: "text-white, text-5xl → text-7xl", body-on-dark: "text-gray-300", caption-on-dark: "text-gray-400", kicker-on-dark: "text-blue-400", decorative-accent: "text-blue-600 at opacity-20 (monogram watermark, aria-hidden)" }
  tech-chip: { background: "{colors.accent-surface}", color: "{colors.accent-text}", rounded: "{rounded.full}", padding: "{spacing.xs} {spacing.md}", hover-background: "#bedbff" }
  cta-button-primary: { background: "blue-600", color: "white", rounded: "{rounded.lg}", padding: "0.75rem 1.5rem", hover-background: "blue-700" }
  cta-button-secondary: { border: "1px solid blue-600", color: "blue-600", background: "white", rounded: "{rounded.lg}", padding: "0.75rem 1.5rem", hover-background: "blue-50" }
---
# FW Blog Design System

## Overview

A clean, content-first blog look: near-white gray page background, white cards and nav, dark gray text, and a single blue accent used for hovers and tag chips. The one deliberate dark element is the Prism **One Dark** code block sitting on the light page. There is no bespoke theme layer — the design language IS Tailwind CSS v4 defaults plus utility classes in the Nunjucks templates; the only custom CSS in [src/assets/css/input.css](src/assets/css/input.css) is the prose/Prism reconciliation and a `@theme` override putting Huninn at the front of `--font-sans`.

All hex values above are sRGB conversions of the Tailwind v4 oklch palette tokens named in the comments (`node_modules/tailwindcss/theme.css`); in code, always write the **Tailwind class**, never the hex.

## Colors

- **Page:** body is `bg-gray-50 text-gray-900` ([src/_includes/layouts/base.njk](src/_includes/layouts/base.njk)); elevated surfaces (nav, cards) are `bg-white`.
- **Text hierarchy:** `text-gray-900` headings/titles → `text-gray-700` excerpts → `text-gray-600` metadata (dates, reading time, nav links, footer).
- **Accent:** blue only. Hover on titles/links: `hover:text-blue-600`. Tag chips: `bg-blue-100 text-blue-800` (post page, tags index) or neutral `bg-gray-100 text-gray-700` (post cards).
- **Code:** blocks are Prism One Dark on `#282c34` (the only raw hex in the codebase, `input.css`); inline code is `bg-gray-100` at `text-sm`.
- **Status colors:** none exist yet (`success`/`warning`/`error` are TODO) — the only message surface is the blue info banner (`bg-blue-50 border-blue-200 text-blue-800`) on the empty homepage.
- **Dark inversion:** `bg-gray-900` is permitted as a surface **only** for the About page hero band ([about.njk](src/about.njk)) — an inversion of the existing gray ramp, not a new hue (the One Dark code block is the existing precedent for dark-on-light). On that surface, text steps down the ramp in the other direction: `text-white` heading, `text-gray-300` body, `text-gray-400` caption, and `text-blue-400` (not `blue-600`, which fails contrast on dark) for the accent kicker line. No other component may invert the ramp.

## Typography

- Default font is **Huninn**(粉圓體,justfont 開源字型), loaded from Google Fonts with `display=swap` in [src/_includes/layouts/base.njk](src/_includes/layouts/base.njk) and set as the first entry of `--font-sans` via `@theme` in `input.css`; the full system stack remains as fallback. Content is Traditional Chinese (`<html lang="zh-TW">`) — any replacement webfont must support CJK, which Huninn does.
- Huninn ships only weight 400; bold text (`font-bold`, `<strong>`) is browser-synthesized. This is expected — do not add other weights to the Google Fonts request.
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

- **Nav** ([nav.njk](src/_includes/components/nav.njk)): white bar, `shadow-sm`, site title bold left, links right; hover transitions `text-gray-600 → text-gray-900` (title → `text-blue-600`). The five links are 首頁／花園／文章／作品／關於; mobile uses `gap-4 text-sm`, returning to `gap-6 text-base` at `sm`.
- **Post card** ([post-card.njk](src/_includes/components/post-card.njk)): white, `rounded-lg shadow-md hover:shadow-lg transition`, `p-6`; title, date + reading-time row, description (or 150-char truncation), neutral tag chips.
- **Topic card** ([topics-list.njk](src/topics-list.njk)): reuses the post-card surface/elevation and presents a curated topic description plus its current concept and article counts. Topic detail pages show `garden-note-card.njk` core concepts before the existing `post-card.njk` reading route.
- **Garden note card** ([garden-note-card.njk](src/_includes/components/garden-note-card.njk)): reuses the white card, gray text hierarchy, and blue link accent; it adds one restrained maturity chip (`bg-gray-100 text-gray-700`) and the note description without introducing a new color family.
- **Garden note page** ([garden-note.njk](src/_includes/layouts/garden-note.njk)): uses the same `max-w-4xl` article column and prose rhythm as posts. Breadcrumbs, maturity, created/updated dates, topic links, explicit related content, and note backlinks stay in the existing gray + blue system.
- **Work card** ([work-card.njk](src/_includes/components/work-card.njk)): a full-width white card that stacks on mobile and becomes a `16rem` image/body split at `md`. It shows a blue type kicker, neutral tags, an optional One Dark install-command block, and the existing primary/secondary CTA pair. Local images use the shared responsive image transform; cards without images omit the media column.
- **Related posts** ([post.njk](src/_includes/layouts/post.njk)): a separate `延伸閱讀` section after the article body, containing up to three existing post cards from the same curated topic.
- **Tag chips**: three context variants (see `components` tokens); all get `transition` and a slightly darker background on hover; label is `#{{ tag }}`.
- **Code block**: One Dark background, `rounded-lg shadow-md`, `padding: 1rem` — enforced with `!important` in `input.css` to beat `.prose`; do not restyle via prose classes.
- **Article Lottie**: a 16:9 `rounded-lg shadow-md` stage using the static poster as its default surface; the local SVG player replaces it only after successful initialization. The control row sits `1rem` below the stage. Controls use blue-600 on white, `rounded-lg`, and visible focus rings. The caption stays in the normal gray text hierarchy.
- **Hero band** ([about.njk](src/about.njk)): the About page only. `bg-gray-900 rounded-lg shadow-md`, two-column on `md:` (copy left, portrait right), an oversized `aria-hidden` monogram SVG watermark (`text-blue-600 opacity-20`, clipped by `overflow-hidden`) sits behind the portrait. See "Dark inversion" under Colors for the on-dark text ramp.
- **Tech chip**: enlarged `tag-chip-index`-style pill (`rounded-full bg-blue-100 text-blue-800`) carrying a bold name plus a lighter-weight role label, used for the About page's tech-stack wall.
- **CTA buttons** (About page contact section, also the existing [404.md](src/404.md) pattern): primary is `bg-blue-600 text-white rounded-lg hover:bg-blue-700`; secondary is `border border-blue-600 text-blue-600 bg-white rounded-lg hover:bg-blue-50`. Both `inline-flex items-center gap-2 px-6 py-3 transition`.
- **Social icon row** ([social-links.njk](src/_includes/components/social-links.njk)): a centered `<ul>` of 48×48 circular icon links driven by `site.social`, used in the About page contact section and in the global footer. Each link is `w-12 h-12 rounded-full bg-gray-100 text-gray-600`, inverting to `hover:bg-blue-600 hover:text-white` with `focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`. The 48px box doubles as the touch target. Icons are 24×24 inline SVG (Simple Icons, CC0) at `w-5 h-5` with `fill="currentColor"` and `aria-hidden="true"`; because the links carry no text, each MUST have an `aria-label`. The About page passes `socialSkip = ["github"]` so GitHub only appears as the primary CTA button there.
- **Interaction rule**: every hover state uses the `transition` utility. Buttons use the primary blue on white with `rounded-lg`; keyboard focus MUST remain visible.

## Brand Assets

- The favicon is a geometric white `FW` monogram on a blue-600 rounded square; its editable SVG source and generated fallbacks live in `src/assets/icons/`.
- The About portrait is the warm-toned developer illustration at `src/assets/images/fw-role.png`. Its orange/olive palette is a brand-illustration exception: it MUST NOT be reused as UI status or accent colors.
- Brand illustrations MAY introduce their own contained palette, while surrounding interface elements continue to use the gray + blue system above.

## Responsive Behavior

Mobile-first with Tailwind defaults; the layout is a fluid single column capped at `max-w-4xl`, so there are almost no breakpoint utilities in the templates. Images from the image transform are responsive (300/600/1200 px, `sizes` attribute). Work cards stack before `md`, and their install command MAY scroll inside its own code surface without widening the page. Article Lottie stages keep a fluid 16:9 aspect ratio and never require horizontal scrolling.

## Do's and Don'ts

- ✅ Use Tailwind utility classes; ❌ don't write raw hex or inline styles (the sole exception, `#282c34`, already lives in `input.css`).
- ✅ Stay within the gray + blue palette; ❌ don't introduce new hues for decoration.
- ✅ Extend Markdown styling via `.prose` overrides in `input.css`; ❌ don't add per-element classes inside post content.
- ✅ Keep `lang="zh-TW"` text conventions (e.g. `yyyy年MM月dd日` dates, `N 分鐘閱讀`); ❌ don't switch UI copy to English piecemeal.
- ✅ Reuse `post-card.njk` / chip patterns for new list surfaces; ❌ don't fork near-duplicate components.

## Agent Prompt Guide

When generating UI for this project: write Nunjucks + Tailwind utilities only; pick colors by semantic role from the tokens above and translate them to the Tailwind class named in the token comment (e.g. `text-primary` → `text-gray-900`); wrap page content in the `max-w-4xl mx-auto px-4` column; add `transition` to anything with a hover state; and check the rendered result against `npm start` at http://localhost:8080.
