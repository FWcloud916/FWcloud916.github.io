# Plan: 建立 11ty + Tailwind CSS 部落格（Prism One Dark 主題、圖片最佳化、語法高亮）

建立完整的 11ty 靜態部落格，整合 Tailwind CSS Typography、Prism.js One Dark 語法高亮主題、標籤系統、RSS feed、圖片最佳化、導航選單、關於頁面、404 頁面，文章列表包含摘要和閱讀時間，透過 GitHub Actions 自動部署到 gh-pages 分支（自訂網域：imfw.io）。

## 步驟

### 1. 初始化 Node.js 專案

初始化 Node.js 專案，建立 [package.json](package.json) 含開發/建構腳本（`npm-run-all` 並行執行 CSS watch 和 11ty serve），安裝相依套件：`@11ty/eleventy`、`tailwindcss`、`@tailwindcss/typography`、`postcss`、`autoprefixer`、`cssnano`、`@11ty/eleventy-plugin-rss`、`@11ty/eleventy-plugin-syntaxhighlight`、`@11ty/eleventy-img`、`prism-themes`、`npm-run-all`、`luxon`

### 2. 建立組態檔案

建立組態檔案：
- [.eleventy.js](.eleventy.js) 註冊外掛、設定 collections（posts、tagList）、filters（日期格式化、閱讀時間計算）、圖片 shortcode、passthrough copy
- [tailwind.config.js](tailwind.config.js) 掃描 `src/**/*.{html,njk,md,js}` 並配置 typography 外掛自訂 prose
- [postcss.config.js](postcss.config.js) 配置 Tailwind、autoprefixer、cssnano（production）
- [.gitignore](.gitignore) 排除 `node_modules/`、`_site/`、`.cache/`

### 3. 建立目錄結構

建立目錄結構：
- `src/_includes/layouts/`
- `src/_includes/components/`
- `src/posts/`
- `src/assets/css/`
- `src/assets/images/`
- `src/_data/`

### 4. 建立樣式和版面

建立樣式和版面：
- [src/assets/css/input.css](src/assets/css/input.css) 匯入 Tailwind directives 和覆寫 prose 程式碼區塊樣式
- [src/_includes/layouts/base.njk](src/_includes/layouts/base.njk) 包含 HTML 結構、meta tags、引入 One Dark CSS 和樣式、nav 元件
- [src/_includes/layouts/post.njk](src/_includes/layouts/post.njk) 顯示標題、日期、標籤、閱讀時間，內容區套用 `prose` 類別
- [src/_includes/components/nav.njk](src/_includes/components/nav.njk) 導航選單
- [src/_includes/components/post-card.njk](src/_includes/components/post-card.njk) 文章卡片顯示標題、日期、摘要、標籤

### 5. 設定 Collections 和 Filters

在 [.eleventy.js](.eleventy.js) 設定：
- `posts` collection 依日期降序排序
- `tagList` collection 提取唯一標籤
- 加入 `dateDisplay` filter（Luxon 格式化）
- 加入 `readingTime` filter（計算字數估算閱讀時間）
- 配置圖片 shortcode 產生響應式圖片（widths: [300, 600, 1200]、formats: [webp, jpeg]）

### 6. 建立標籤和 RSS

建立標籤和 RSS：
- [src/tags.njk](src/tags.njk) 使用 pagination 生成各標籤頁面並使用 post-card 元件
- [src/tags-list.njk](src/tags-list.njk) 標籤清單
- [src/_data/site.json](src/_data/site.json) 設定網站 metadata
- [src/feed.njk](src/feed.njk) 生成 Atom feed

### 7. 建立 GitHub Actions 工作流程

建立 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)：
- on push 到 main
- 設定 Node.js 20 和 cache
- `npm ci` 和 `NODE_ENV=production npm run build`
- 使用 `peaceiris/actions-gh-pages@v3` 部署 `_site/` 到 gh-pages 並設定 `cname: imfw.io`

### 8. 建立頁面內容

建立頁面內容：
- [src/index.njk](src/index.njk) 首頁使用 post-card 顯示最新文章
- [src/about.md](src/about.md) 關於頁面
- [src/404.md](src/404.md) 自訂 404 頁面
- [src/posts/2025-12-19-first-post.md](src/posts/2025-12-19-first-post.md) 範例文章包含 front matter、markdown、程式碼區塊、圖片 shortcode
