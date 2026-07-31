---
title: 把專用動畫流程抽成 Agent Skill：lottie-maker 如何讓 Lottie 可建立、可診斷、可驗證
date: 2026-07-31
tags:
  - ai
  - agent-skills
  - automation
  - Lottie
description: 從內容管線的專用 Lottie workflow 出發，拆解如何把 motion brief、portable profile、CanvasKit 預覽與決定性驗證整理成可跨專案使用的 lottie-maker Agent Skill。
---

> **查核資訊：** 本文於 2026-07-31 依 Airbnb Lottie 官方文件、Lottie Community Specification、Skia Skottie 文件、Agent Skills 官方規格與 `lottie-maker` 實際程式及測試查核。Lottie 規格、player 支援範圍與工具版本仍可能變動，使用前應以目標 player 的最新文件與實測結果為準。

把一套專案內能正常工作的動畫流程搬出去，最容易犯的錯，是先複製整個資料夾，再把專案名稱搜尋取代掉。

檔案看起來獨立了，裡面卻可能仍假設固定的 9:16 Reel、1200×675 文章圖、品牌配色、特定字型、發文目錄，甚至只有原專案才存在的 renderer。這不是泛用化，只是把耦合藏得比較遠。

[`lottie-maker`](https://github.com/FWcloud916/skill-lottie-maker) 的起點正是這個問題。我們原本在內容自動化專案裡有一套 `design-lottie-motion` workflow，能產生 Reel 與文章動畫，也有 validator、poster、contact sheet 和人工 QA。它在自己的場景很好用，但換一個比例、語言或產品，就得先理解一大包不屬於新任務的規則。

我們要抽離的核心，不是「畫幾個 shape」的能力，而是一份更小、可以重複執行的合約：先定義動畫意圖，再建立 bundle；先檢查 portable subset，再渲染；最後用畫面與 hash 證明結果，不接受一句「應該可以播放」。

## Lottie 不是塞進 JSON 的影片

[Lottie 官方文件](https://lottie.airbnb.tech/)將它描述為可在 Android、iOS、Web、React Native 與 Windows 播放的動畫系統，會解析由 Bodymovin 從 Adobe After Effects 匯出的 JSON，再由各平台 renderer 繪製。Bodymovin 原本由 Hernan Torrisi 建立，Airbnb 後續把這套方法延伸到多個平台。

這個差異很重要。MP4 記錄的是一格格畫素；Lottie JSON 描述的是時間軸、圖層、向量路徑、文字、transform、keyframe 與素材關係。播放器可以在 runtime 控制播放、暫停、進度、速度與方向，也能在不同尺寸下重新繪製向量內容。

所以在 `lottie-maker` 裡，`animation.json` 永遠是 canonical source。MP4、GIF、poster 和 contact sheet 只是檢查或交付用的衍生物，不能反過來取代原始動畫。

名稱本身也帶著一點動畫史。[Airbnb 的 Lottie 文件](https://lottie.airbnb.tech/)說明，Lottie 是以剪影動畫先驅 Lotte Reiniger 命名。這個名字很貼切：新的 runtime 技術沒有抹掉動態設計，反而讓設計意圖能以另一種媒介被保存與播放。

但 JSON 不代表天然相容。[Lottie Community Specification](https://lottiefiles.github.io/lottie-spec/)明確說明，目前正式文件仍在發展，只涵蓋社群已核准的部分功能。不同 player 對 expressions、文字、gradient、mask、effect 或額外欄位的支援可能不同。Schema valid 只能回答「符合這份 schema 嗎」，不能推導成「每個 player 都長得一樣」。

## 靈感不是來自一個 prompt，而是三層既有工作

第一層當然是 Lottie 本身。它把設計工具裡的時間軸轉成 runtime 可以解析的資料，讓動畫不必由每個平台工程師重新手刻一次。`lottie-maker` 延續的是同一個方向，只是把作者從 After Effects 擴充到能閱讀 brief、編輯 JSON、執行工具的 agent。

第二層來自 `brag-talker` 的 `design-lottie-motion`。那套專用 Skill 已經證明幾個規則不能省：

1. motion rationale 要先於 JSON，否則很容易只得到「有東西在動」。
2. copy、時間、poster frame 和 local assets 必須有單一來源。
3. validator 只能抓結構錯誤，poster 和 contact sheet 仍要由人看。
4. renderer 失敗時不能默默換工具，否則前後畫面已不是同一個驗證環境。

第三層是 Agent Skills 的設計方式。[Agent Skills 規格](https://agentskills.io/specification)讓一個 Skill 以 `SKILL.md` 搭配 `scripts/`、`references/` 與 `assets/` 封裝；啟動時先看 `name` 與 `description`，需要時才載入完整指令與資源。官方的[撰寫建議](https://agentskills.io/skill-creation/best-practices)也特別強調：有效的 Skill 應從真實任務、人工修正、版本歷史與失敗案例抽取，而不是請模型憑空生成一份「最佳實務」。

因此我們沒有從空白 `SKILL.md` 開始，而是反過來問：原流程中哪些是 Lottie 共通問題，哪些只是部落格或 Reel 的政策？

## 泛用化不是刪掉限制，而是把限制變成 profile

原本的文章動畫固定 1200×675、24 FPS，Reel 則固定直式版面與社群安全區。獨立 Skill 改成四個具名 profile，加上一個有上限的 custom mode：

| Profile | 畫布 | FPS | 預設長度 | 預設循環 |
|---|---:|---:|---:|---:|
| `landscape-16x9` | 1200×675 | 24 | 6 秒 | 否 |
| `portrait-9x16` | 1080×1920 | 24 | 6 秒 | 否 |
| `square-1x1` | 1080×1080 | 24 | 6 秒 | 否 |
| `icon` | 512×512 | 30 | 2 秒 | 是 |

Custom mode 仍要求 width、height、FPS 與 duration 全部明確，而且 FPS 乘上秒數必須得到整數 frame count。這不是故意刁難，而是避免 `op`、poster frame 與輸出媒體各自用不同方式四捨五入。

Skill 負責判斷語意、流程與停止條件；Node CLI 處理可重複的機械工作：

```text
brief.yaml
    │
    ├─ init / clone
    ▼
animation.json ── inspect / compare / validate
    │
    ▼
CanvasKit + Skottie ── render twice ── SHA-256 compare
    │
    ├─ poster.png
    ├─ contact-sheet.png
    └─ optional MP4 / GIF
```

[Skia 官方文件](https://skia.org/docs/user/modules/skottie/)把 Skottie 定位為在 Skia 上播放 Bodymovin／Lottie JSON 的 native player。`lottie-maker` 固定 CanvasKit 與 Skottie 版本，目的不是宣稱它代表所有 player，而是讓同一個驗證環境可以被重播。

## 範例一：齒輪不是裝飾，而是一個改善循環

第一個實作是三個互相咬合的齒輪。大齒輪順時針，小齒輪反向，對應 `Observe → Refine → Verify → Repeat`。如果三個齒輪都用同方向旋轉，畫面仍然會動，機械關係卻是錯的；這正是 motion rationale 要先寫的原因。

Repo 裡的原始示範是 720×720、30 FPS、4 秒的無縫循環。文章版則依 accessibility 合約改成 1200×675、24 FPS，只播放一輪並停在完整狀態；想再看一次可以按「重播」。這不是哪一版比較高級，而是 delivery profile 不同：icon 或背景狀態適合循環，長文裡的說明圖應讓讀者有機會停下來看。

<figure class="article-lottie" data-lottie-src="/assets/lottie/lottie-maker-agent-skill-skill-improvement-cycle.json">
  <div class="article-lottie__stage" role="img" aria-label="三個互相咬合的齒輪依序帶動 Observe、Refine、Verify、Repeat，完成一輪 Skill 改善循環後停在完整狀態。">
    <img eleventy:ignore src="/assets/images/lottie-maker-agent-skill-skill-improvement-cycle-poster.jpg" alt="三個互相咬合的齒輪依序帶動 Observe、Refine、Verify、Repeat，完成一輪 Skill 改善循環後停在完整狀態。" loading="lazy" decoding="async">
  </div>
  <figcaption>齒輪不是裝飾：每個改善階段都會帶動下一個階段。</figcaption>
</figure>

最短的建立流程先跑 dry-run：

```bash
node skills/lottie-maker/scripts/lottie-maker.mjs init \
  --id skill-improvement-gear-loop \
  --profile custom --width 720 --height 720 --fps 30 --duration 4 \
  --title "Skill 循環改善" \
  --intent "用咬合齒輪表達 Observe、Refine、Verify、Repeat" \
  --out ./work --dry-run
```

確認路徑、時間與預估輸出後，才移除 `--dry-run` 建立 bundle。接下來不是直接交付，而是依序 `validate`、`render`、視覺抽查與 `verify`。

## 範例二：同一個意圖，換畫布不等於等比例縮放

把 16:9 動畫塞進 9:16，最簡單的方法是縮小到看得見全貌；最常見的結果也是所有東西都小到看不清楚。Profile 的作用不只提供尺寸，而是提醒作者重新安排 focal group、安全區與文字密度。

第二個示範保留同一個「訊號」：圓點與短線的關係不變，但依序放入 landscape、portrait、square 與 icon 容器。讀者看到的是相同語意如何重新配置，而不是四張不同主題的動畫。

<figure class="article-lottie" data-lottie-src="/assets/lottie/lottie-maker-agent-skill-profile-portability.json">
  <div class="article-lottie__stage" role="img" aria-label="同一個圓點與短線訊號依序配置到 16:9 橫式、9:16 直式、1:1 方形與 icon 畫布，最後並排比較四種 profile。">
    <img eleventy:ignore src="/assets/images/lottie-maker-agent-skill-profile-portability-poster.jpg" alt="同一個圓點與短線訊號依序配置到 16:9 橫式、9:16 直式、1:1 方形與 icon 畫布，最後並排比較四種 profile。" loading="lazy" decoding="async">
  </div>
  <figcaption>Profile 決定的不是縮放比例，而是同一個視覺意圖如何重新配置。</figcaption>
</figure>

Profile 也讓 agent 不必每次重新猜合理預設：文章圖先用 `landscape-16x9`，社群直式素材從 `portrait-9x16` 開始，小型循環元件則用 `icon`。真的有特殊畫布時再進 custom mode，不把每個任務都假裝成例外。

## 範例三：驗證不是一句「看起來可以」

第三個示範把安全與重現性放進同一條路徑。輸入先經 `inspect`；若 asset 使用 remote URL、data URL、越界路徑或 symlink，portable profile 會停止。檢查通過後才交給固定版本的 CanvasKit／Skottie 渲染兩次，逐一比對抽樣 frame 與 poster 的 SHA-256。

<figure class="article-lottie" data-lottie-src="/assets/lottie/lottie-maker-agent-skill-deterministic-verification.json">
  <div class="article-lottie__stage" role="img" aria-label="Lottie JSON 先通過 Inspect；不安全的 remote asset 被封鎖，安全輸入則分別產生 Render A 與 Render B，兩者 SHA-256 相同後標記為 deterministic。">
    <img eleventy:ignore src="/assets/images/lottie-maker-agent-skill-deterministic-verification-poster.jpg" alt="Lottie JSON 先通過 Inspect；不安全的 remote asset 被封鎖，安全輸入則分別產生 Render A 與 Render B，兩者 SHA-256 相同後標記為 deterministic。" loading="lazy" decoding="async">
  </div>
  <figcaption>驗證同時保留失敗證據與重現性證據，不把 valid 說成全播放器保證。</figcaption>
</figure>

Repo 內還放了一份故意無效的 `unsafe-remote-asset.json`。它不是可播放範例，而是診斷 fixture：`inspect` 必須回報 `/assets/0/u` 是 remote asset，而且整個流程不得抓取那個 URL。

```bash
node skills/lottie-maker/scripts/lottie-maker.mjs inspect \
  examples/fixtures/unsafe-remote-asset.json --json
```

有效 bundle 則用：

```bash
node skills/lottie-maker/scripts/lottie-maker.mjs verify \
  examples/deterministic-verification \
  --out /tmp/lottie-verify
```

`deterministic: true` 只代表在這個固定環境、這些抽樣 frame 得到相同畫素結果。它不會神奇地證明 Safari、Android 與另一個 native player 全部一致。這條界線一定要寫清楚，否則 hash 只是讓錯誤承諾看起來更科學。

## 第一支影片就抓到一個規格外的洞

第一個完整影片試作使用文章常見的 1200×675。Lottie 本身可以正常渲染，但 FFmpeg 的 H.264 `yuv420p` 輸出因高度是奇數而失敗。

處理方式不是偷偷把 canonical JSON 改成 1200×676，而是只在 MP4 encoding 階段補 1px padding，JSON、poster 與 PNG frames 仍維持原尺寸，再補上一個 odd-height regression test。這個修正可在 [`130721b`](https://github.com/FWcloud916/skill-lottie-maker/commit/130721b1537537063bcceb5b21a627250049fafd) 查到。

這個小問題比一段「妥善處理影音相容性」有價值得多。它提供了明確輸入、失敗原因、修正邊界與可重播測試，也直接回到齒輪示範的意思：Observe、Refine、Verify，然後才 Repeat。

## Portable profile 是保守交集，不是完整 Lottie

`lottie-maker` 允許 shapes、native text、local images、precompositions、masks、trim paths 與 2D transforms，但 portable profile 主動拒絕 expressions、remote/data URLs、3D、effects，以及逃出 bundle 的 assets。

這會犧牲一部分 Lottie 能力，換來比較清楚的安全與重播邊界。如果目標是完整還原某個複雜 After Effects 專案，這個 Skill 不是適合的工具；它也不會修改 `.aep`、下載缺少素材、代替你發布，或把無效第三方 JSON 自動洗成「相容」。

另一方面，官方 schema 對部分實際可播放的 native text 欄位仍可能回報 advisory。工具因此把兩件事分開：portable-profile errors 會阻擋流程；official-schema advisories 會保留在報告，但不覆蓋實際 renderer 與人工 QA 的結果。

## 安裝後，先要求它證明，不要先要求它輸出影片

可以使用 Skills CLI 安裝：

```bash
npx skills add FWcloud916/skill-lottie-maker --skill lottie-maker
```

或者直接 clone repo，安裝固定 dependencies：

```bash
npm ci --ignore-scripts --prefix skills/lottie-maker
bash scripts/verify.sh
```

第一個任務不妨寫得具體一點：

```text
Use $lottie-maker to create a 1:1 four-second loop that explains a review cycle.
Keep all assets local, render a poster and contact sheet, then verify deterministic hashes.
```

這句話同時給了語意、profile、duration、loop、安全要求與完成證據。Agent 還是有設計空間，但不能只交回一份 JSON 就宣布完成。

把專用流程抽成泛用 Skill，最終不是讓規則變少，而是讓每一條規則都回到正確層級。文章或 Reel 的品牌政策留在內容專案；Lottie 的 bundle、portability、render 與 verification 留在 `lottie-maker`。齒輪會繼續轉，但每一圈都應該留下可以被檢查的改善。

## 參考資料

- [Lottie 官方文件](https://lottie.airbnb.tech/)
- [Lottie Community Specification](https://lottiefiles.github.io/lottie-spec/)
- [Skia：Skottie - Lottie Animation Player](https://skia.org/docs/user/modules/skottie/)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)
- [`FWcloud916/skill-lottie-maker`](https://github.com/FWcloud916/skill-lottie-maker)
