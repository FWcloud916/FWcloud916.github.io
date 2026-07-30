# Article Lottie Runtime

**Slug:** article-lottie
**Status:** done
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
- [x] Run the final `npm test` and `npm run build` gates.
- [x] Record the implementation commit and close this item.

## Work log

### 2026-07-30

- Established a clean 56/56 passing test baseline before implementation.
- Added the article figure runtime without adding or publishing a pilot animation.
- Final verification passed: `npm test` (66/66) and `npm run build`.
- Recorded implementation commit `4cf5400`; no push or deployment was performed.

## Outcome

The blog now accepts validated, static-first article Lottie figures. Posts retain an accessible poster fallback, and eligible visitors receive same-origin light/SVG playback with viewport-aware controls.

**Final status:** done
**PR / Commit:** `4cf5400`
**Follow-ups:** Pilot article and its reviewed JSON/poster remain in the paired brag-talker task.
