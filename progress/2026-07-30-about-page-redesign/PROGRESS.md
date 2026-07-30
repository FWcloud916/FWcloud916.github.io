# About Page Redesign

**Slug:** about-page-redesign
**Status:** done
**Ticket:** N/A
**Related plan:** N/A
**Created:** 2026-07-30
**Updated:** 2026-07-30

---

## Scope

| Scope | Branch | Ticket | Notes |
|---|---|---|---|
| site | claude/about-page-redesign-b1685a | N/A | /about/ 全新視覺實驗 |

## Background & goals

> 現行 `src/about.md` 為純 Markdown、無 prose 包裝,與全站卡片式設計脫節。
> 目標:轉為 `src/about.njk`,以深色 hero + FW monogram、寫作原則卡片、
> 關注主題格線、技術 chip 牆、精選文章(重用 post-card)、聯絡 CTA
> 重新設計整頁;守灰 + blue-600 色調,不引入 JS。

## Task list

- [x] 建立 progress 項目與 INDEX 列
- [x] 撰寫 `src/about.njk`(hero / 寫作原則 / 關注主題 / 網站技術 / 精選文章 / 聯絡方式)
- [x] 刪除 `src/about.md`(同 commit,避免 permalink 衝突)
- [x] `npm run build` 檢查輸出合約(picture/alt/srcset、單一 h1、ProfilePage JSON-LD)
- [x] 瀏覽器視覺驗證(桌機 1280px、手機 390px)
- [x] `npm test` 全綠
- [x] 更新 DESIGN.md(hero-band / tech-chip / cta-button tokens)與 docs/project-overview.md
- [x] 收尾:progress 更新、commit

## Work log

### 2026-07-30

- 建立項目;計畫定稿於 `/Users/kdanmobile/.claude/plans/about-shimmering-nova.md`
- 完成 `src/about.njk`(deep-gray hero + FW monogram watermark、寫作原則編號卡、關注主題格線、
  技術 chip 牆、精選文章重用 `post-card.njk`、聯絡方式主/次按鈕),刪除舊 `src/about.md`
- `npm run build` 輸出合約手動核對通過(picture/alt/srcset、單一 h1、ProfilePage JSON-LD、
  sitemap、無殘留 nunjucks 標記)
- 瀏覽器驗證:桌機 1280px 與手機 375px 皆正常顯示、無水平捲動、圖片正確載入
- 順手修復環境問題:`node_modules/lottie-web` 缺失導致 `npm test` 的 Lottie bootstrap
  斷言失敗,`npm install` 補齊後 69/69 全綠(與本次頁面改版無關,package-lock.json
  僅正常化 peer-dep 標記)
- 更新 DESIGN.md(`hero-band`/`tech-chip`/`cta-button-*` tokens + Dark inversion 說明)與
  docs/project-overview.md(路由表、目錄樹的 about.md → about.njk)

## Outcome

**Final status:** done — `/about/` 全新視覺實驗上線,測試 69/69 全綠
**PR / Commit:** 待下一步 commit(本 session 尚未提交)
**Follow-ups:** nav 主動狀態(active state)、真實里程碑時間軸、`featured` frontmatter 精選旗標
