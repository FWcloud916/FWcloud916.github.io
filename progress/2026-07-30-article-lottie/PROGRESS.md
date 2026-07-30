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
| `site` | current branch | N/A | Eleventy article runtime and approved first pilot; no deployment |

## Background & goals

Add a static-first article Lottie contract to the Eleventy blog. Every animation retains a meaningful poster, while a small post bootstrap conditionally loads a pinned same-origin light/SVG player only when motion is allowed.

## Task list

- [x] Add the pinned local player, same-origin asset passthrough, and article bootstrap.
- [x] Add accessible poster fallback, playback controls, viewport behavior, and reduced-motion handling.
- [x] Add runtime, content-contract, and build-output tests.
- [x] Integrate the approved line-budget pilot figure, JSON, and poster into the latest post.
- [x] Verify the generated post and passthrough asset hashes.
- [x] Run the final `npm test` and `npm run build` gates.
- [x] Record the implementation commit and close this item.

## Work log

### 2026-07-30

- Established a clean 56/56 passing test baseline before implementation.
- Added the article figure runtime without adding or publishing a pilot animation.
- Final verification passed: `npm test` (66/66) and `npm run build`.
- Recorded implementation commit `4cf5400`; no push or deployment was performed.
- Integrated the approved 1200×675 line-budget ratchet pilot with byte-identical JSON and poster assets; retained the previous static image.
- Re-ran `npm test` (66/66) and `npm run build`, then verified the generated figure and both published asset hashes.
- Recorded pilot commit `2875bea`; no push or deployment was performed.
- Browser QA exposed that the constrained CanvasKit authoring dialect omitted several defaults that
  `lottie-web` expects. Added in-memory compatibility normalization for layers, shapes, easing
  keyframes, and native-text output while keeping the source JSON and poster as the no-JavaScript
  fallback.
- Final browser QA passed on a clean local page: 16:9 SVG playback, complete Traditional Chinese
  labels, pause/resume/replay controls, meaningful final hold, no console warnings, and no Lottie
  scripts on the home page. Final verification passed: `npm test` (68/68) and `npm run build`.

## Outcome

The blog now accepts validated, static-first article Lottie figures. The latest post contains the first approved pilot with an accessible poster fallback; eligible visitors receive same-origin light/SVG playback with viewport-aware controls.

**Final status:** done
**PR / Commit:** Runtime `4cf5400`; pilot `2875bea`; browser compatibility fix `c5130ba`
**Follow-ups:** Push and deployment remain intentionally unperformed.
