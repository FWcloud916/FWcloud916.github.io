---
title: Agent Skill 不是 Prompt：從撰寫、評測到自我提煉的工程化方法
date: 2026-07-24
tags:
  - ai
  - agent-skills
  - automation
description: 深入拆解 Agent Skill 的觸發、工作流、資源與驗證設計，並以 eval、失敗分類、人工審核及版本治理建立可稽核的自我提煉與升級迴路。
---

> **查核資訊：** 本文於 2026-07-24 依 Agent Skills 開放規格、OpenAI Codex 官方文件與 Anthropic 官方工程文章查核。各 agent 對安裝位置、選用欄位、觸發政策與工具權限的支援可能不同，實作前仍應確認所用 client 的最新文件。

把一段成功的 prompt 存成 `SKILL.md`，不會自動得到一個好用的 Agent Skill。你得到的通常只是一段下次也許還能用的文字。

一個真正可用的 Skill，更接近可執行的操作規約：它知道什麼時候該出場、需要讀哪些資料、哪些步驟可以自行判斷、哪些動作必須照順序、最後又要拿什麼證據證明工作完成。

這個差異很重要。Prompt 解決單次溝通，Skill 要承受不同使用者、不同輸入、不同模型版本與不同執行環境。要讓它越用越準，靠的不是繼續堆規則，而是把真實失敗變成可重播的測試，再用受控流程升版。

## 先看懂 Skill 真正執行的三個階段

[Agent Skills 規格](https://agentskills.io/specification)採漸進式揭露（progressive disclosure）：agent 啟動時只看所有 skills 的 `name` 與 `description`；判斷任務相關後，才載入完整 `SKILL.md`；scripts、references 與 assets 則在需要時取用。

```text
使用者任務
    │
    ▼
name + description ── 是否觸發？
    │ yes
    ▼
SKILL.md ──────────── 怎麼做、何時停、如何驗證？
    │ as needed
    ├─ references/ ── domain knowledge、schema、policy
    ├─ scripts/ ───── deterministic checks、重複操作
    └─ assets/ ────── template、字型、輸出素材
```

![Agent Skill 三層載入架構，從 name 與 description 判斷觸發，載入 SKILL.md，再依需要取用 references、scripts 與 assets。](/assets/images/agent-skill-evolution-progressive-disclosure.png)

所以 Skill 有三個不同問題，不能混成一句「它有沒有用」：

1. **找不找得到**：該觸發時有沒有觸發，不該觸發時有沒有安靜。
2. **走不走得對**：載入後是否選對資料、工具、順序與停止條件。
3. **結果能不能證明**：產物是否符合 observable outcome，而不是 agent 自己說完成。

很多 Skill 失敗在第一關。`description: Helps with documents` 看起來簡潔，卻沒有任務意圖、檔案類型、觸發語句與排除邊界。後面的流程寫得再完整，沒被載入也是零。

## 撰寫 Skill，從真實工作倒推

最容易犯的錯，是開啟空白檔案就叫模型「幫我生成一個最佳實務 Skill」。[Agent Skills 的撰寫建議](https://agentskills.io/skill-creation/best-practices)指出，有效內容應來自實際任務、人工修正、runbook、API spec、review comment、版本歷史與已解決的 failure case。否則很容易只剩「妥善處理錯誤」這種誰都同意、誰都無法執行的句子。

### 第一步：先定義 Skill 的合約

動筆前先回答六個問題：

| 問題 | 要留下的內容 |
|---|---|
| 誰會叫它？ | 3–5 個真實 user prompts |
| 哪些任務不屬於它？ | 容易誤觸發的 near-miss |
| 輸入是什麼？ | 檔案、URL、參數、必要狀態 |
| 產出是什麼？ | 可觀察的檔案、diff、報告或外部狀態 |
| 哪裡最脆弱？ | 權限、付費、刪除、發布、資料污染 |
| 怎麼才算完成？ | 能實際執行的 test、lint、schema check 或人工 gate |

Skill 的邊界很像 function。太小，完成一件事要載入五個 skills，規則容易互相打架；太大，`description` 難以精準觸發，正文也會塞滿本次根本用不到的分支。

### 第二步：先寫 `description`，再寫正文

規格要求 `name` 最長 64 字元，只能使用小寫英數與連字號；`description` 最長 1,024 字元，並應同時說明「做什麼」與「何時使用」。真正重要的不是把字數用滿，而是描述 user intent。

```yaml
---
name: publish-blog
description: 發布已審核的 Markdown 文章到 Eleventy 部落格。當使用者要求發布、部署或上線指定文章時使用；只想撰寫、修文或預覽時不要觸發。
---
```

接著用兩組 prompts 測試它：should-trigger 要涵蓋口語、縮寫、錯字、沒有直接說出 skill 名稱的需求；should-not-trigger 則要挑關鍵字很像、意圖不同的 near-miss。「幫我發布這篇」是正例，「幫我看看發布後可能長怎樣」才是有價值的反例。

### 第三步：把正文寫成決策流程

好的 `SKILL.md` 不只列原則，還會讓下一個 agent 知道何時讀資料、何時執行、何時停下來問人。

```markdown
## Workflow

1. Read the target article and canonical publication state.
2. Stop if the article has not been explicitly approved.
3. Run the read-only validation commands.
4. Present the deployment diff and request confirmation.
5. Publish only after confirmation.
6. Verify the public URL, then record the result.
```

每一步至少要有 input、action、output 或 stop condition。只寫「先分析需求」「確保品質」沒有提供新的操作資訊。

控制強度也要分開設計。文案切角有多種合理答案，可以說明判斷原則，保留高自由度；schema migration、付費 API 與正式發布容錯率低，就該鎖定命令、順序與 approval gate。整份 Skill 全寫成 `MUST`，只會讓正常變體也被當成錯誤。

### 第四步：把穩定工作交給檔案與程式

`SKILL.md` 應保留每次執行都需要的核心路由。官方規格建議正文低於 5,000 tokens、500 行；詳細 API、不同 framework 的作法與長篇 examples 移到 `references/`，並明講載入條件，例如「收到非 2xx 回應時讀 `references/api-errors.md`」。

同一段 parsing、轉檔或驗證程式在多次執行中反覆重寫，就把它固定成 `scripts/`。模型擅長判斷，程式擅長算長度、驗 schema、比 hash 與回傳非零 exit code。把兩者硬是反過來用，通常又貴又不穩。

## 最佳化不能只看最後答案

一個輸出看起來不錯，不代表 Skill 有效。也許模型不用 Skill 就做得到；也可能最後碰巧成功，中間卻重試十次、讀錯三份文件，或差點執行不可逆操作。

最佳化時至少分開四組指標：

| 層次 | 觀測項目 | 常見修法 |
|---|---|---|
| Trigger | recall、precision、誤觸發 near-miss | 改 `description`，不要先改正文 |
| Trajectory | 讀檔、工具、重試、跳步、停問時機 | 補路由、default、gotcha 或 stop condition |
| Outcome | assertion pass rate、測試、人工品質 | 補驗證、template、deterministic script |
| Economics | tokens、時間、API 成本 | 刪常識、拆 references、重用 script |

[Agent Skills 的 eval 指南](https://agentskills.io/skill-creation/evaluating-skills)建議同一測試同時跑「有 Skill」與「無 Skill」，或拿新版對上一版。Assertions 要檢查可觀察結果，例如「產出的 JSON 可解析」「三個必要欄位都存在」；「結果很好」無法驗證，「必須逐字等於某句話」又太脆弱。語氣、設計與整體可用性則保留人工 review，必要時用 blind comparison 降低對新版本的偏見。

不要只收失敗案例。成功 trace 可以告訴你哪些指令其實沒被使用，兩邊都能滿足的 assertion 也代表 Skill 沒有增加辨識力。刪掉無效內容，有時比再加一條規則更接近升級。

## 自我提煉，不是讓 Agent 直接改正式版

Agent 的「自我反思」很適合提出假設，不適合自己當證人、法官與部署者。

如果每次被糾正就直接把新規則 append 到正式 `SKILL.md`，幾輪後通常會出現四種問題：把單一個案過度一般化、互相矛盾的規則持續累積、錯誤 feedback 污染共用流程，以及評測者改寫規則來迎合自己的 grader。

比較可靠的自我提煉迴路是：

```text
真實執行與人工修正
        │
        ▼
保存 prompt、trace、diff、validator 結果與成本
        │
        ▼
分類 failure：trigger / context / decision / action / verification
        │
        ▼
Agent 提出最小 candidate patch + 新增 regression case
        │
        ▼
隔離環境重播：舊版 vs 候選版，且跑完整既有 evals
        │
        ▼
人工檢視 diff、分數、trace、安全與成本
        │
        ├─ reject：保留證據，不污染正式版
        └─ approve：升版、記錄變更、保留 rollback
```

![受控的 Agent Skill 自我提煉迴路，從真實執行保存證據、分類失敗、建立候選修改、隔離重播到人工審核，再決定升版或拒絕。](/assets/images/agent-skill-evolution-self-refinement-loop-v2.png)

關鍵是「先把教訓寫成 test，再改 Skill」。沒有 regression case 的修正，只是一段很快會失去背景的文字；只跑新案例、不跑舊案例，則可能修好一次誤觸發，卻破壞十個原本正常的任務。

[Anthropic 的 agent eval 實務](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)也提醒，分數不能脫離 traces 解讀。Grader 可能不公平、測試可能模糊，甚至可能被繞過。自我升級因此需要多層證據：code-based checks 擋結構錯誤，model-based grading 比較難量化品質，人類負責校準目標、風險與例外。

### 什麼變動可以自動，什麼必須審核

可以讓 pipeline 自動收集失敗、建立候選 branch、執行 eval、產 benchmark 與摘要。涉及以下內容時，不應讓 runtime agent 無人監督地直接升版：

- 擴大 tools、網路、檔案或 credentials 權限。
- 改變刪除、付款、發布、部署等不可逆操作。
- 移除 confirmation、validation 或 audit log。
- 修改 grader、expected output 或 safety boundary。
- 從單一使用者 feedback 推廣成所有人的預設。

這不是不相信 agent，而是不讓同一個回饋迴路同時控制行為、評分與上線。能提出修改，和有權把修改變成正式規則，是兩件事。

## Skill 的成熟度，看它能不能被反駁

第一版 Skill 只要能完成一個真實任務，不必先寫成百科全書。第二版開始補 near-miss、gotchas 與驗證。再往後，建立固定 eval set、成本基準、版本紀錄與 rollback，才有資格談持續升級。

判斷一個 Skill 是否成熟，可以問四句：

1. 它有清楚說明什麼時候不該用嗎？
2. 它的關鍵產出能被 test 或外部狀態驗證嗎？
3. 拿掉 Skill 後，eval 成績真的會下降嗎？
4. 新版退步時，能指出是哪個案例、哪段 trace、哪個 diff 造成嗎？

答不出來的 Skill，不一定不能用；只是它仍是一組有幫助的提示，還不是可治理的工程資產。

Agent Skill 真正會累積的，不是 Markdown 行數，而是被保存下來的判斷：哪些上下文不可省、哪些錯誤會重演、哪個步驟必須由程式驗證、哪種改動值得成為下一版。讓 agent 參與提煉沒有問題，但升級必須經得起舊案例、新失敗與人類目標三方面的反駁。

## 參考資料

- [Agent Skills：Specification](https://agentskills.io/specification)
- [Agent Skills：Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)
- [Agent Skills：Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)
- [Agent Skills：Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills)
- [OpenAI Codex：Build skills](https://learn.chatgpt.com/docs/build-skills)
- [Anthropic：Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Anthropic：Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
