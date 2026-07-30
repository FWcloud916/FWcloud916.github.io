# Article Lottie Runtime

**Slug:** article-lottie
**Status:** in-progress
**Ticket:** N/A
**Related plan:** N/A — approved in the paired brag-talker implementation session
**Created:** 2026-07-30
**Updated:** 2026-07-30

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| `site` | current branch | N/A | Eleventy article runtime only; no pilot article or deployment |

## Background & goals

Add a static-first article Lottie contract to the Eleventy blog. Every animation retains a meaningful poster, while a small post bootstrap conditionally loads a pinned same-origin light/SVG player only when motion is allowed.

## Task list

- [x] Add the pinned local player, same-origin asset passthrough, and article bootstrap.
- [x] Add accessible poster fallback, playback controls, viewport behavior, and reduced-motion handling.
- [x] Add runtime, content-contract, and build-output tests.
- [ ] Run the final `npm test` and `npm run build` gates.
- [ ] Record the implementation commit and close this item.

## Work log

### 2026-07-30

- Established a clean 56/56 passing test baseline before implementation.
- Added the article figure runtime without adding or publishing a pilot animation.

## Outcome

> Fill in after development finishes.

**Final status:**
**PR / Commit:**
**Follow-ups:** Pilot article and its reviewed JSON/poster remain in the paired brag-talker task.
