# Progress Item Index

Items are created by `new_progress.py`, then maintained with
`update_progress.py` by developers or agents. See [`README.md`](README.md)
for usage and invoke the installed `progress-tracker` skill for the full
workflow.

## Items

| Status | Item | Folder | Scope | Ticket | Plan | Created | Notes |
|---|---|---|---|---|---|---|---|
| `planning` | FW Blog Roadmap | `progress/2026-07-27-fw-blog-roadmap/` | `site` | N/A | [fw-blog-roadmap-PROGRESS.md](_plans/fw-blog-roadmap-PROGRESS.md) | 2026-07-27 |  |
| `done` | Article Lottie Runtime | `progress/2026-07-30-article-lottie/` | `site` | N/A | N/A | 2026-07-30 | Runtime `4cf5400`; pilot `2875bea`; tests/build pass; not deployed |

## Status legend

Keep each item's status here identical to the Status field in its
`PROGRESS.md`.

<!-- STATUS_LIFECYCLE_START -->
Status enum: `planning`, `in-progress`, `review`, `blocked`, `done`, `abandoned`

```
planning → in-progress ⇄ review → done
                ↕
             blocked

Any non-terminal status → abandoned
```
<!-- STATUS_LIFECYCLE_END -->

| Status | Meaning |
|---|---|
| `planning` | Item created, implementation not started (scaffold-script default) |
| `in-progress` | Under active development |
| `review` | PR/MR opened, in code review / QA — **not** `done`; that comes after merge |
| `blocked` | Paused on an external dependency |
| `done` | Development complete (PR/MR merged) |
| `abandoned` | Stopped without completing |
