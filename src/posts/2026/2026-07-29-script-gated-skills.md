---
title: Script-Gated Skills：當 Anthropic 說「刪掉 80% 系統提示」，哪些東西不能刪
date: 2026-07-29
tags:
  - ai
  - agent-skills
  - automation
description: 從一次把 SKILL.md 從 302 行砍到 159 行的真實重構出發，對照 Anthropic 的 Claude 5 context engineering 六條新規則，說明哪些規則該交給模型判斷、哪些不變量必須編進 script 與工具介面。
---

> **查核資訊：** 本文於 2026-07-29 依 Anthropic 官方文章、mattpocock/skills 的 `writing-great-skills` 原文，以及 `skill-progress-tracker` 公開 repo 的 PR #1 內容查核。行數、測試數與 commit 皆取自該 PR 的最終合併狀態；上游文件與 repo 後續可能變動。

Anthropic 在 2026-07-24 說，他們對 Claude Opus 5 與 Claude Fable 5 拿掉了 Claude Code **超過 80%** 的系統提示，而且「在我們的 coding evaluations 上沒有可測量的損失」。

這種話很容易被讀成一句許可：你的 `SKILL.md` 也該砍掉八成。

四天後我確實砍了一次。`skill-progress-tracker` 的 `SKILL.md` 從 302 行降到 159 行，中間八個 commit，每一個都跑完整驗證關卡才進下一個。但真正花掉最多判斷力的，不是決定刪什麼——是決定**哪幾行不能刪**，以及為什麼那幾行不能刪的理由，跟官方文章其實不衝突。

這篇講的就是留下來的那一半。

## 兩種流派：說服模型，還是限制介面

Agent Skill 生態現在大致有兩條路線。

**Prompt 紀律派**把工程紀律寫成散文。像 mattpocock 的 `skills` repo，用資訊層級、修剪與命名把 skill 寫得精準好讀，靠模型被說服而遵守。這條路輕、可組合、模型無關——但保證是軟的。模型願意配合就成立，不願意就不成立。

**介面保證派**把不變量編進 script 與工具介面。狀態轉移由程式碼強制、危險操作由 exit code 擋、共用區塊用 md5 檢查逐 byte 同步。這條路重、綁工具，但保證是硬的：模型不同意也沒用，因為它根本沒有那條路徑可走。

一個具體對照，同一件事的兩種寫法：

| | Prompt 紀律派 | 介面保證派 |
|---|---|---|
| 表達位置 | `SKILL.md` 的散文 | `scripts/*.py` 的驗證與 exit code |
| 遵守方式 | 模型讀到並同意 | 模型繞不過去 |
| 改壞的代價 | 下次也許還是對的 | eval 立刻紅 |
| 換模型 | 要重新測說服力 | 不受影響 |
| 成本 | 幾行字 | 要寫測試、要維護 |

我的立場是這不是二選一，是一條光譜，而且**分界線的位置有明確判準**：品味規則交給模型判斷，安全不變量交給介面。

問題從來不是「該不該刪」，是「界線劃在哪」。

## writing-great-skills 真正能拿來用的四個工具

mattpocock 的 `writing-great-skills` 是我這次重構的方法論來源。它談的東西不少，這裡只講我實際用上、而且改變了判斷的四個。

**Branch 判準的 progressive disclosure。** 它把 progressive disclosure 定義成「往下移一階——離開 `SKILL.md` 進入連結檔案——好讓頂層維持可讀」。關鍵在判準：如果一段內容只服務單一分支，它就不該佔用永遠載入的頂層預算。這個判準比「太長就拆」精確得多，因為它可以直接回答「拆哪一段」。

**逐句 no-op 測試。** 判準只有一句：「這句話相對於預設行為，有改變任何東西嗎？」沒有就是 no-op，刪掉。重點是**整句刪除**，不是把它修得更短——修剪只會讓 no-op 變成更省字的 no-op，token 還是照付。

**Leading words。** 定義是「已經住在模型 pretraining 裡、agent 會拿來思考的壓縮概念」。這是四個工具裡最省字的一個：一個對的既有概念，抵得過一整段解釋。

**六個 failure mode 當 lint。** premature completion（還沒真的做完就收尾）、duplication（同一個意思出現在兩個地方）、sediment（過時內容因為不敢刪而堆積）、sprawl（每句都好但整體太長）、no-op（模型本來就會做的事）、negation（用禁止來引導反而提高了該行為的可及性）。

把這六個當成 checklist 逐條掃過去，比「看看哪裡可以精簡」有效太多，因為它們各自對應不同的刪除理由。

## 逐 commit 解剖：302 行怎麼變成 159 行

[PR #1](https://github.com/FWcloud916/skill-progress-tracker/pull/1) 在 2026-07-28 合併，20 個檔案、+764/−319。計畫內八個 commit，每個 commit 都跑完 `bash scripts/verify.sh` 的 22 項檢查、15 個 end-to-end scenario 與 ruff 才動下一個。

`SKILL.md` 有 302 行，其中約 110 行是 migration 的細節——而 migration 是**單一分支**。每一次呼叫這個 skill，不管使用者要做的是建立、更新還是關閉項目，都在付那 110 行的 context 稅。更糟的是 `workflow.md` 幾乎完整複述了同一份七步驟契約。

| # | Commit | 判斷重點 |
|---|---|---|
| 1 | Migration 拆進 `references/migration.md` | pointer 的措辭決定觸發率 |
| 2 | Description 重寫，一個分支一個 trigger | description 是全 repo 最貴的文字 |
| 3 | 加上 two-phase commit anchor | anchor 刻意放在 byte-sync 標記**之外** |
| 4 | 共用詞彙 + 六 failure-mode checklist | 詞彙放 `domain-models.md` 而不是新開 `CONTEXT.md` |
| 5 | README 第四份 paraphrase 收斂 | duplication 的長尾在 README |
| 6 | 對照 Anthropic 官方文章 | 記錄兩處刻意分歧 |
| 7 | 參數語意讓位給 `--help` | 刪除前先做覆蓋率矩陣 |
| 8 | Scope 逗號守衛（改 CLI） | 把唯一的靜默失敗變大聲 |

### Commit 1–2：搬走與重寫

Migration 的 110 行搬進 `references/migration.md`，成為唯一權威來源；`SKILL.md` 與 `workflow.md` 只留前置規則、閘門區塊，以及一句祈使句指標。

「read `references/migration.md` in full before running any migration command」跟「詳見 migration.md」在人類眼中是同一句話，在模型眼中不是。前者是條件明確的動作指令，後者是可以略過的補充說明。progressive disclosure 的成敗其實壓在這一行上——內容搬走了但沒人去讀，那不是拆分，是遺失。

Description 的重寫更關鍵，因為 description 是**唯一永遠載入、而且會被拿來做觸發判斷**的文字。原本它花了不少字重述本文已經講過的身分描述。改法是：把前置檢查的 leading word 提到最前面，五個生命週期分支（create / update / audit / close out / migrate）各給**恰好一個** trigger，其餘刪掉。

最後 110 個英文字，觸發邊界不變，trigger matrix 完全沒動。刪掉的全部是重複。

### Commit 3：anchor 為什麼要放在閘門外面

這是整個 PR 我最想拿出來講的一個決定。

Migration 有一段硬性閘門，三個檔案（`SKILL.md`、`workflow.md`、`agents/progress-tracker.md`）逐 byte 相同，由 `verify.sh` 用 md5 檢查。內容大意是：在兩個命令跑完、第二個 exit 0 之前，**不得**詢問是否刪除舊資料。這條規則是 KI-001 那次事故換來的——當時空的 WIP 區塊被誤判成「沒有待處理項目」，於是稽核就這樣過了。

這次要加一句 leading word anchor：

> Migration is a two-phase commit: the audit is the prepare phase; nothing is deleted until it votes yes.

Two-phase commit 是資料庫世界的既有概念，模型完全知道它的語意：prepare 階段可以失敗、可以回滾，commit 只在全票通過後發生。一句話取代一整段解釋，這就是 leading words 該有的效果。

問題是它放哪裡。放進 `MIGRATION_GATE` 標記**裡面**最直覺——反正都是講同一件事。但那會讓這句話變成第四份需要逐 byte 同步的內容，而它是散文，是最容易在後續編輯中被順手改掉的那種文字。md5 檢查會因此變得脆弱，而脆弱的檢查最後都會被放寬。

所以 anchor 放在標記正上方，閘門本身維持三份 byte-identical。同一個段落裡，一句話給模型思考，一段規則給程式驗證，各自用各自的機制維護。

`references/migration.md` 也刻意**不**複製那個閘門區塊——那會是第四份沒有被檢查的漂移副本。

![三個檔案共用逐 byte 相同的 MIGRATION_GATE 區塊並由 verify.sh 以 md5 檢查，two-phase commit anchor 刻意放在標記之外，references/migration.md 刻意不含該區塊](/assets/images/script-gated-skills-gate-anchor-placement.png)

兩派工具的共存，長得就是這樣。

### Commit 4–5：刻意的分歧，與 duplication 的長尾

`writing-great-skills` 建議把共用詞彙集中。我把它放進既有的 `docs/domain-models.md`，而不是新開一個 `CONTEXT.md`。理由是這個 repo 已經有一份 canonical 文件集，多開一個檔案等於多一個未來會 sediment 的地方。這是刻意偏離建議，記在 design decisions 裡。

六個 failure mode 則寫進 `AGENTS.md`，變成往後編輯 `SKILL.md` 的固定檢查表——把單次的重構方法變成常駐規則。

Commit 5 處理的是 duplication 的長尾。稽核條件在這個 repo 裡總共有四份 paraphrase，第四份在 README。README 是最容易漂移的地方，因為它的讀者是還沒安裝 skill 的人，改動它的人通常不會同時去改 `SKILL.md`。收斂成 two-phase commit 的說法加一個連結，指回權威文件。

`agents/progress-tracker.md` 則保留了一份精簡的 migration 描述——subagent 定義必須自我完備。這份重複是**接受**的，寫進 design decisions 當成 residual duplication，不假裝它不存在。

### Commit 7–8：介面能教的，就從文件刪掉

這兩個 commit 是後來才長出來的，也最能說明我的立場。

Commit 7 做了一件事：把 `SKILL.md` 裡的 Key-arguments 清單與參數說明整段刪掉，換成一句「第一次使用前先讀 `--help`」。

但刪除是**有前提的**。方法是先跑一份逐項覆蓋率矩陣：把要刪的每一句話拿出來，確認它要嘛已經寫在 `--help` 裡，要嘛能在使用者犯錯的當下，由一則可行動的錯誤訊息當場講清楚。教不了的就不刪。

矩陣跑完，剩下一個教不了的：`--scope` 裡沒有跳脫的逗號。這個輸入會被靜默地拆成兩個 entry，沒有錯誤、沒有警告，使用者要等到看見產出的表格才發現不對。

Commit 8 的處理方式不是把那條規則寫回文件，是**改 CLI**：

- 逗號旁邊有空白 → 判定為歧義並拒絕，錯誤訊息同時教兩種解法（要拆就拿掉空白，要當字面值就跳脫）
- 空 entry（頭尾或連續逗號）→ 拒絕，不再靜默丟棄
- 正常模式下兩個 CLI 都回吐解析結果：`Scope: api · worker  (2 entries)`

然後才把跳脫規則從 `SKILL.md` 移進 `--help`。同時新增 16 個 pytest case 與一個 `ambiguous-scope-refuse` scenario（總數來到 15），確認那個輸入會被拒絕**而且什麼都沒寫進去**。

這一步之後，`SKILL.md` 落在 159 行，只剩一條規則是介面教不了的。

順序很重要：不是「刪掉文件、改天再補防護」，是**先讓失敗變大聲，再刪文件**。反過來做就是把已知的坑留給使用者踩。

還有一個容易被略過的細節：改 CLI 前先確認了影響範圍——現有的 pytest case、scenario 與文件範例都沒有用到「空白緊鄰逗號」的寫法，所以沒有任何原本合法的輸入改變語意。

貫穿八個 commit 的作法是同一件事：**eval 全綠才進下一個**。多數人改 `SKILL.md` 是裸改，改完看起來順就送出去了。prompt 層的重構一樣可以有回歸保護，只是要先有 eval。

## 不能刪的那一半

Commit 6 是回頭把整個重構逐條對照 Anthropic 那篇文章。官方的 Then/Now 六條是這樣：

| Then | Now |
|---|---|
| 給 Claude 明確規則 | 讓 Claude 用判斷力 |
| 提供使用範例 | 設計更有表達力的工具介面 |
| 上下文全部先給 | 用 progressive disclosure，需要時才載入 |
| 重複說明 | 保持工具描述簡潔 |
| 手動維護 CLAUDE.md 記憶 | 自動記憶功能 |
| 單純的 markdown 規格 | 豐富的參考資料（HTML artifact、程式碼、評分表） |

第三條、第四條跟這次重構完全對得上，不用多說：110 行搬到分支後面、四份 paraphrase 收斂成一份。

真正值得停下來的是第一條與第二條，因為它們看起來一個要我刪、一個要我留。

### 一、被刪的是品味規則，不是安全規則

官方文章自己留了但書：這些建議適用「**除了高度重要的領域**」。

這句話很短，但它就是分界線。文章裡舉的被刪例子——不要刪檔案、不要寫多行註解區塊、特定 edge case 怎麼處理——共同點是它們都是**品味規則**：寫的時候就知道有些情況下會是錯的，只是當時模型不夠好，錯誤的規則仍然勝過沒有規則。模型變強之後，這類規則的期望值翻負，因為規則累積起來會互相牴觸，模型花力氣去調和指令，而不是解決你的問題。

`MIGRATION_GATE` 不是這種東西。它是一次真實事故（KI-001）換來的、由 script 強制執行的守衛，而且它保護的是**不可逆操作**：刪掉使用者的舊追蹤資料。這正是那個但書要留下的、承重的少數規則。

判準可以更簡單一點：**這條規則出錯的後果，是輸出比較醜，還是資料回不來？** 前者交給判斷力，後者留著。

### 二、「給範例 → 設計介面」本身就是介面保證派的官方背書

第二條表面上在講刪掉範例，實際上在講**把指令編進介面**。官方的例子很清楚：

> just listing status as an enumeration between pending, in_progress, and completed, hints to Claude about how to use it

把 status 列成列舉，比寫三段範例更能教會模型怎麼用。這是同一個方向再往前走一步——列舉是提示，**script 強制的狀態轉移是保證**。

`progress-tracker` 的 `in-progress → review → done` 不是寫在文件裡請模型遵守，是由腳本驗證的：跳過 `review` 直接進 `done` 會失敗。文件因此不需要花任何一行去解釋這件事。

官方叫你刪掉的那些字，之所以能刪，正是因為它們的意思被搬進了介面。刪除跟強化是同一個動作的兩面。

### 三、「80% 可刪」只對最強的模型成立

這是我覺得最容易被忽略的一條。

官方那句話的完整條件是：對 **Claude Opus 5 與 Claude Fable 5**，在 **Anthropic 自己的 coding evaluations** 上沒有可測量的損失。

我的 skill 不是只跑在那兩個模型上。它有 Codex plugin，會跑在其他 client、其他世代、其他規模的模型上。散文規則的效力**隨模型能力浮動**；script gate 的效力不會。一個 exit code 1 在 Opus 5 上是 1，在小模型上也是 1。

所以對任何要釋出給別人用、而你控制不了對方模型的 skill，介面保證不是保守，是唯一能跨模型攜帶的東西。

**Prompt 越刪越短的前提，是介面越做越硬。**

## 可以直接照做的六步

1. 量 `SKILL.md` 行數，標出只服務單一分支的段落——那是最貴、也最容易還的 context 債。
2. 逐句跑 no-op 測試：這句相對於預設行為改變了什麼？答不出來就整句刪，不要修短。
3. 重寫 description：一個分支一個 trigger、leading word 前置、刪掉本文已經講過的身分描述。
4. 找一個 pretrained 概念當 anchor（two-phase commit、dry run、feature flag），放在硬規則旁邊，但**不要**放進需要逐 byte 同步的區塊。
5. 刪參數說明前先做覆蓋率矩陣；教不了的那幾條，改介面讓它變大聲，而不是把文字寫回去。
6. 先有 eval 再動手。沒有 eval 的重構，你只是換了一個看起來比較舒服的版本。

如果想快速抓一輪，Claude Code 現在有 `/doctor` 可以幫忙 rightsize skills 與 `CLAUDE.md`。

## 最後

這次重構是 Claude Code 依照凍結的計畫執行、我逐 commit review 的，PR 描述、design decisions 與偏離紀錄都在公開 repo 裡。用 agent 去改善 agent 自己的 skill，這件事本身就是這篇文章的一部分——而它之所以能放心讓 agent 動手，正是因為那 22 項檢查跟 15 個 scenario 在後面接著。

界線該劃在哪，我目前的答案是「出錯後資料回不來的地方」。這條線在你的專案裡可能不一樣，歡迎到 repo 開 issue 聊。

## 參考資料

- [Anthropic：The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)（2026-07-24）
- [mattpocock/skills：writing-great-skills](https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md)
- [skill-progress-tracker PR #1：progressive-disclosure refactor of SKILL.md (302 → 159 lines)](https://github.com/FWcloud916/skill-progress-tracker/pull/1)
- [skill-progress-tracker](https://github.com/FWcloud916/skill-progress-tracker)
