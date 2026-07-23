---
title: 如何與 AI 合作，我勸你善良：文件是 Agent 不走偏的起點
date: 2026-07-22
tags:
  - ai
  - agent-skills
  - automation
description: AI 能把迭代速度拉高，卻不會自動知道專案的目標、限制與歷史；本文拆解文件如何成為人與 agent 共用的邊界、共享記憶與驗證介面，並介紹 doc-architect skill 的實務工作流。
---

> **查核資訊：** 本文於 2026-07-22 依 Agent Skills 規格、AGENTS.md 官方網站、DORA 研究，以及 `doc-architect` 上游 v2.3.0（commit `dfa2ee1`）查核。Agent 工具支援範圍、plugin 安裝方式與 skill 行為可能更新，實際使用前請再次確認上游文件。

AI 很強大，但人是愚蠢且自負的生物。

這句話更像提醒。AI 可以在幾分鐘內改完 API、補測試，再順手重構三個 class。Commit 一直增加，人很容易把大量產出誤認為接近正確答案。

問題是，**快速移動和朝正確方向移動，是兩件不同的事**。

身為工程師，我一開始使用 AI 時常遇到這個困難。AI 隨時都能推出新版本，人的審查能力與專案記憶卻沒有一起加速。解法看似完美時，我們最容易忽略背後的假設、限制與邊界。

所以這篇不談怎麼寫出更厲害的 prompt，而是先問一個更基礎的問題：**要求 AI 進入專案工作前，我們有沒有提供足以做對事情的條件？**

## 把沒有文件的專案交出去，不是信任

先別談 AI，換成人就很清楚了。

將一狗票需求隨意丟給一個新人，期待他短時間內全部完成，這是善良嗎？把沒有文件的專案交給缺少經驗的同事，等他踩中只有資深成員知道的坑，再責怪他「怎麼連這個都不知道」，當然也不是。

善良不只是態度溫和，而是尊重對方取得資訊、理解限制與驗證結果的需要。AI 可以讀程式碼、搜尋檔案、執行工具，卻不會憑空知道團隊沒寫下來的默契：

- 服務真正負責的邊界，還有哪些功能看似存在、其實已經停用。
- 當初為什麼選這個架構，而不是另一個更常見的做法。
- 哪些目錄是 generated code，不能直接修改。
- 哪一條測試命令才是完成工作的 verification gate。
- 目前做到哪裡，上一個 session 留下什麼未完成決策。

沒有這些資訊，agent 仍會靠鄰近程式碼推測，交出局部測試可能也會過的答案。完全壞掉很好擋；能跑卻違反方向的結果，才會被帶進下一輪。

## Agent 最常走偏的不是語法，而是上下文

程式碼能回答「系統現在怎麼做」，不一定能回答「為什麼這樣做」與「接下來應該做什麼」。資訊只留在人腦或對話紀錄裡，agent 很容易出現三種偏移。

| 偏移 | 會發生什麼事 | 文件要補上的邊界 |
|---|---|---|
| 目標偏移 | 把「可以順手做」當成「這次應該做」，越改越大 | 系統責任、非目標、observable outcome |
| 架構偏移 | 局部程式碼合理，卻跨過 module、資料或權限邊界 | Architecture、domain model、coding conventions |
| 狀態偏移 | 換一個 session 後重新發明昨天，或重做已完成工作 | 目前狀態、驗證結果、blocker 與 next steps |

聊天紀錄不是可靠的專案狀態。Context 可能被壓縮，下一個 agent 也沒有昨天的記憶。狀態若沒有回到 repository，新的 session 只能從 `git status` 和 commit 猜故事。Repo 才是 system of record，對話不是。

![AI 快速迭代比較圖；沒有文件時循環產生目標、架構與狀態偏移，有文件護欄時則經路由、實作、驗證與進度更新形成可控制迭代。](/assets/images/documentation-for-ai-agents-iteration-guardrails-v3.png)

## 文件不是把整個專案塞進 context

聽到「給 AI 更多上下文」，最直覺的做法是寫一份超長文件，每次全部餵進 prompt。這種方法看似完整，實際上既浪費 context，也會把真正重要的限制埋在文字中間。

[Lost in the Middle](https://arxiv.org/abs/2307.03172) 的研究發現，模型處理長輸入時，相關資訊放在開頭或結尾通常表現較好，放在中間時可能明顯下降。這不能直接推論每個 coding agent 都會犯相同錯誤，但足以提醒我們：**資訊存在，不等於它能在正確時機被找到與遵守。**

比較合理的方法是分層，讓 agent 先看到地圖，需要時再讀細節：

```text
任務進入專案
    │
    ▼
AGENTS.md：先讀什麼、不能做什麼、怎麼驗證
    │
    ├─ README.md：人類的定位與 quickstart
    ├─ docs/project-overview.md：架構、流程、整合與環境
    ├─ docs/domain-models.md：資料模型與商業機制
    ├─ docs/coding-style.md：實際的 linter 與程式慣例
    └─ PROGRESS.md：目前工作狀態與下一步
```

[AGENTS.md 官方網站](https://agents.md/)把它定位成「給 agent 的 README」：在可預期的位置提供建置、測試與專案慣例。`doc-architect` 再多做一個重要判斷：`AGENTS.md` 應該是**路由器，不是百科全書**。它保留專案身分、hard constraints、任務對應文件與真實命令，細節則放進 `docs/`。

Agent Skills 也採相同思路。[Agent Skills 規格](https://agentskills.io/specification)定義了漸進式揭露：啟動時只載入 skill 的名稱與描述，符合任務後才載入完整 `SKILL.md`，references、scripts 與 assets 則在需要時讀取。

文件架構要解決的不是「寫得夠不夠多」，而是：**哪個角色，在做哪種工作時，應該讀到哪一層資訊。**

## 好文件把快速迭代變成可控制的回饋迴路

文件常被當成開發完成後才補的交付品。對 agent 來說，這個順序剛好反了：文件是執行前的輸入、執行中的邊界，也是執行後的驗證索引。

DORA 對內部文件品質的研究，把 clarity、findability 與 reliability 等屬性納入衡量，並觀察到文件品質與組織績效、技術實務採用之間有明顯關聯。[DORA 的說明](https://dora.dev/capabilities/documentation-quality/)也把文件視為其他技術能力能否落實的基礎。這不代表補文件就能讓部署速度翻倍；文件縮短的是回饋路徑：

1. Agent 不必每次重掃 repo 才找到入口。
2. Generated directory、權限邊界與發布關卡不再靠運氣碰到。
3. 架構決策的理由被保留，不會被誤判為歷史包袱。
4. 「完成」連到真的能跑的測試或 lint command；程式碼變動也能找到應重查的文件。

速度來自少猜一次、少掃一次、少做一次錯的重構。Agent 再快，reviewer 仍有穩定的目標、邊界與 verification gate 可對照。

## 一套文件，各自只負責一件事

`doc-architect` 不會替每個專案生成同一包 Markdown。它把文件分成 core 與按需 module，先提出選擇與略過理由，再開始動手。

| 文件 | 負責回答的問題 |
|---|---|
| `README.md` | 這是什麼、怎麼跑、去哪裡讀更多 |
| `AGENTS.md` | 這個任務先讀哪份文件、有哪些 hard constraints、完成前跑什麼命令 |
| `docs/project-overview.md` | 系統責任、技術棧、架構、介面、整合與部署 |
| `docs/domain-models.md` | Entity 關係、狀態機、關鍵機制與不變條件 |
| `docs/coding-style.md` | 從實際 linter 與 code 整理出的慣例 |
| `docs/db-observation.md` | 改動 hot query 前，如何取得 query plan 與 index 證據 |
| `DESIGN.md` | UI 的 design tokens、元件與視覺慣例；有需要且使用者同意才建立 |
| `PROGRESS.md` | 現在做什麼、完成什麼、卡在哪裡；跨 session 開發且使用者同意才啟用 |

這個分工避免同一條規則散落各處，也讓維護可以局部進行：route 變更時重查 interface，schema 變更時重查 domain models，CI command 變更時更新 README 與 `AGENTS.md`。

![以 AGENTS.md 為路由器的專案文件架構，將開發任務導向核心 docs，再進入實作、驗證及差異驅動更新；README 提供人類入口，PROGRESS.md 保存跨 session 狀態。](/assets/images/documentation-for-ai-agents-documentation-router-v5.png)

## `doc-architect` 不只是 Markdown 產生器

截至本文查核時，[`doc-architect`](https://github.com/FWcloud916/skill-doc-architect) 最新版是 `2.3.0`，上游 `main` 對應 commit [`dfa2ee1`](https://github.com/FWcloud916/skill-doc-architect/commit/dfa2ee1d001d9d17af66a366f6ce651f0f93ffc9)。它把文件工作拆成四種可查核模式。

### Greenfield：不知道就明說不知道

新專案會先釐清目的、使用者、規模、介面、資料與部署偏好。未決定的地方寫 `TBD — not yet designed`，不把慣例補成既定事實。誠實的空白比漂亮的幻覺有用。

### Brownfield：從 code 找證據

既有 codebase 會先收集 manifest 訊號、判斷 stack，再讀 routes、models、workers、integrations、環境與 CI。模糊時先攤出證據。它採 WIP = 1，一次完成一份文件；已有文件時用 merge mode 補缺口。

### Update 與 audit：先指出會改哪裡

U-1 mode 先把 feature branch 的 changed paths 對應到應重查的章節。U-2 mode 則先產出 drift report，不會邊掃描邊重寫。Code 不同，不代表保存設計決策的文件必然錯。

### Verification 與 Fresh Session Test：別自己改考卷又自己打分

文件裡的命令必須來自真實設定。安全的唯讀檢查可以執行；migration、deployment 或需要憑證的操作只做靜態確認。專案若沒有 runnable test gate，skill 會明確警告 feedback loop 缺失，不會用想像的命令充數。

最後再讓一個沒有先前對話的獨立 context，只靠 repo 回答五個問題：

1. 這是什麼系統？
2. 它如何組織？
3. 要怎麼執行？
4. 如何驗證工作？
5. 這個 repo 是否追蹤目前工作狀態？

v2.3.0 的 runner 可使用 Claude Code 或 Codex CLI 提供獨立 context。若只能由原 session 自我模擬，就必須標成 degraded fallback。這很像新人到職測試：文件作者說「我都寫了」沒有意義，沒參與撰寫的人能否找到答案，才接近真正的可用性。

## 實際使用，先從最小閉環開始

不要把「建立完整文件」理解成停工寫百科全書。先讓 `README.md` 回答用途、啟動與測試，再用精簡的 `AGENTS.md` 放 hard constraints、任務路由與真實命令，最後由 project overview 補系統邊界、流程、整合與部署。其他 modules 只在真的需要時加入。

依照 v2.3.0 的[上游 README](https://github.com/FWcloud916/skill-doc-architect/blob/dfa2ee1d001d9d17af66a366f6ce651f0f93ffc9/README.md)，可以安裝成 Codex CLI plugin，或使用通用 skills CLI：

```bash
# Codex CLI plugin
codex plugin marketplace add FWcloud916/skill-doc-architect
codex plugin add doc-architect@doc-architect

# 互動選擇 agent 與安裝範圍
npx skills add FWcloud916/skill-doc-architect
```

接著依情境要求它工作：

```text
Use $doc-architect to plan the documentation architecture for this new project.

Use $doc-architect to bootstrap docs for this repo. Present the detected stack
and selected doc set before writing.

Use $doc-architect to map this branch diff to affected documentation sections.

Use $doc-architect to audit the current docs for drift. Report first; do not fix.
```

最容易踩到的坑，是一開始只說「幫我把所有文件補齊」。先確認 mode、stack、要建立與略過的 modules。文件架構本身就是專案決策，不該用一句模糊 prompt 跳過。

## 文件也會傷害專案，只是方式比較安靜

文件不是天然正確。錯誤文件往往比沒有文件更糟，因為它會讓 agent 很有信心地走錯。

- 把尚未建立的 CI、架構或權限政策寫成現況。
- 同一條命令散落多處，形成互相衝突的真相。
- 只列技術名稱，卻不說資料如何流動、誰不能呼叫誰。
- 文件寫著 `npm test`，實際上根本沒有這個 script。
- `AGENTS.md` 塞成巨型手冊，重要限制反而被埋掉。
- 保留舊 route、退休功能與不存在的 model，成為錯誤導航。

所以文件治理至少要有三條底線：每個主張都能追溯到本次讀過的 code 或明確決策；每條命令都有實際設定與驗證結果；code 變更能找到對應的文件更新範圍。

## 善良，是提供做對事情的條件

對 AI 善良，不是把它人格化，也不是降低要求。剛好相反，是承認 agent 有很強的生成與搜尋能力，也有上下文、記憶、工具權限與判斷上的限制，然後把合作方式設計得更誠實。

文件說明專案要去哪裡，hard constraints 標出不能走的路，測試與 lint 提供能反駁自信的證據，Fresh Session Test 則驗證另一個 context 是否真的讀得懂。

文件不會替你決策，也不保證 AI 正確。它讓錯誤更早被看見、假設有地方被挑戰，讓速度不必以失去方向為代價。

建立完整的文件，讓專案成員能快速理解目標、架構、流程與外部整合。對人與 AI 來說，都是善的開始。

## 參考資料

- [doc-architect v2.3.0 上游 repository](https://github.com/FWcloud916/skill-doc-architect)
- [doc-architect v2.3.0 README](https://github.com/FWcloud916/skill-doc-architect/blob/dfa2ee1d001d9d17af66a366f6ce651f0f93ffc9/README.md)
- [Agent Skills — Specification](https://agentskills.io/specification)
- [Agent Skills — Best practices](https://agentskills.io/skill-creation/best-practices)
- [AGENTS.md — An open format for guiding coding agents](https://agents.md/)
- [DORA — Documentation quality](https://dora.dev/capabilities/documentation-quality/)
- [2021 Accelerate State of DevOps Report](https://dora.dev/research/2021/dora-report/)
- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172)
