---
title: 文件也需要 CI：從行數預算、術語裁決到 Fresh Session Test
date: 2026-07-30
tags:
  - ai
  - agent-skills
  - devops
description: 一次 doc-architect 重構加進整個 CONTEXT.md 模組，SKILL.md 卻從 225 行降到 216 行。拆解文件的三層機器保證——長度預算與棘輪、術語裁決的權限邊界、Fresh Session Test 的獨立驗收。
---

> **查核資訊：** 本文於 2026-07-30 依 [skill-doc-architect PR #1](https://github.com/FWcloud916/skill-doc-architect/pull/1) 的合併內容、該 repo `origin/main` 的實際檔案，以及 Anthropic 官方文章查核。行數、預算值與 eval 數量取自 PR 合併後狀態；上游後續可能變動。

加了一整個新模組，檔案反而變短了。

`doc-architect` 這次的重構塞進一個完整的 `CONTEXT.md` 專案詞彙表模組——樣板、四個 mode 的接線、三個新 eval scenario、Fresh Session Test 多一道題——`SKILL.md` 從 225 行降到 **216 行**。這 9 行是**含**新模組接線之後的淨值。

這不是壓縮技巧。是因為那個檔案的長度從頭到尾有東西在管：`verify.sh` 有一條行數預算檢查，而且預算會跟著實際行數往下棘輪。

[上一篇](/posts/2026/2026-07-29-script-gated-skills/)講的是 skill 的散文哪些能刪、哪些必須編進 script。這篇把同一個判準套到專案文件上，而且發現需要保證的不只一層。

## 為什麼文件靠自律守不住

文件腐壞的方式不是隨機的，它有固定的三種。

**長度會漲。** 每次補一段都合理，沒有任何一次補充該被擋下來，但半年後沒有人願意從頭讀完。

**詞彙會漂。** 同一個東西在 README 叫 A、在架構文件叫 B、在程式碼註解叫 C。每一次改名都是局部正確的，錯的是沒有人有權說「以後一律叫 A」。

**正確性會過期。** 文件寫的時候是對的，程式變了以後沒人回頭改。而且最糟的是——沒有人會知道，因為沒有任何機制會因此變紅。

這三種腐壞的共同點：**發生的當下都不會痛**。所以靠「大家記得維護」是沒有用的，那等於把成本推給半年後的自己。

要擋下來，得有三層不同的保證。

## 第一層：長度是預算，不是自律

`doc-architect` 的 `verify.sh` 有這麼一段：

```bash
report "$([ "$skill_lines" -le 216 ]; echo $?)" "SKILL.md within 216-line budget" "$skill_lines lines"
report "$([ "$agents_lines" -le 100 ]; echo $?)" "AGENTS.md within 100-line budget" "$agents_lines lines"
```

`SKILL.md` 不得超過 216 行，`AGENTS.md` 不得超過 100 行。超過就 CI 紅燈。

有意思的不是有預算，是**預算會往下棘輪**——像棘輪扳手，順向轉得動，反向卡死。這次重構把它從 225 改成 216，改的是上限本身。行數降下來之後，上限跟著鎖到新的位置：往下隨時可以，往上就卡住了。

這跟「我們盡量維持文件精簡」的差別在哪？差在**放寬的成本**。

自律的版本裡，多寫十行不需要任何人同意，甚至不會有人發現。棘輪的版本裡，多寫十行會讓 CI 紅，你得先把 `verify.sh` 那條 216 行的檢查改掉才過得去。

改那個數字是兩秒鐘的事，技術難度幾乎是零。但那個改動會進 diff、會被 reviewer 看到、會被問為什麼。真正被提高的不是門檻，是**可見度**——文件變長從靜默發生，變成一個要具名負責的決定。

![行數預算從 225 行的舊上限降到 216 行並鎖定，往下由重構帶動，要漲回去必須修改 verify.sh 而會出現在 diff 被 review 看見](/assets/images/docs-need-ci-line-budget-ratchet-v3.png)

這也解釋了為什麼加模組還能變短。當長度是會紅的數字，新增內容就不再是「往後面加一段」，而是一道必須先回答的題目：這 9 行要從哪裡挪出來？

這次挪出來的地方很具體，三個都是同一種病：**同一份規則被抄了兩份**。

- Mode B 的偵測順序，本來在流程裡寫一次、在 stacks 索引裡又寫一次 → 只留索引那份
- 混合／monorepo 專案的處置規則，散在偵測步驟與規劃步驟 → 收進「Plan before you write」
- 互動與 headless 的行為差異，本來每個 mode 各講一次 → 收進 Definition of Done 與稽核清單第六節

剩下的就是逐句 no-op 掃描——模型本來就會做的事，整句刪掉。

預算不是在懲罰寫作，是在強迫每次新增都先做一次刪除。而被逼著刪的時候，最先浮出來的永遠是重複，不是有用的內容。

## 第二層：詞彙有人裁決，而且那個人是使用者

`CONTEXT.md` 是這次新增的 opt-in 模組，專門處理術語漂移。它的樣板開頭寫得很直接：

> 專案根目錄的詞彙表——**關於東西叫什麼的裁決**。

不是「詞彙說明」，是裁決。這個用字差別是整個模組的設計核心。

它記三種東西：canonical 名稱與定義、`_Avoid_` 該避免的同義詞、以及已經被裁定的歧義。第三種長這樣：

```markdown
## Flagged ambiguities

- "<word>" 同時指 <X> 與 <Y>；<date> 裁定為 <X>。<Y> 現在叫 "<term>"。
```

記下來的不只是結論，還有**這個結論是什麼時候被誰定的**。半年後有人想改回去，他面對的不是模糊的慣例，是一筆有日期的決議。

### 誰有權裁決

樣板裡最關鍵的一句：

> **Rulings are decisions, not facts.** A canonical name and its Avoid list are chosen by the user, never derived from the code alone.

裁決是決定，不是事實。canonical 名稱與它的 Avoid 清單由**使用者**選定，永遠不能單從程式碼推導出來。

這條規則接下來變成一個具體的權限邊界：

- **互動執行**：一次裁決一個詞，給候選、給推薦的裁決、附一行理由，由使用者拍板
- **Headless 執行**：每個候選詞一律標記 `proposed — pending ruling`，決定保持開放

agent 可以偵測到「這個東西在三個地方有三個名字」——那是事實，可以從程式碼與文件推導。但「以後統一叫哪個」不是事實，那是取捨，牽涉到團隊習慣、對外文件、既有程式碼的改名成本。agent 沒有那個資訊，也不該假裝有。

這個 repo 自己的 `CONTEXT.md` 就誠實地留著 `proposed — pending ruling`：

```markdown
**Doc set** — the modular output a mode produces: core files plus selected modules.
_Avoid_: doc suite (proposed — pending ruling)
```

它知道 `doc suite` 是漂移，但它沒有自己拍板。這比一份看起來很完整、其實混了一堆 agent 自行決定的詞彙表誠實得多。

### 預算再出現一次

`CONTEXT.md` 也有硬預算：**約 80 行**。理由寫在樣板裡：

> 價值來自裁決密度，不是完整性——一個詞要值得一則條目，前提是叫錯它會造成真正的工作損失。

超過預算時，最無關痛癢的詞先被砍掉。

還有一條劃界規則：`CONTEXT.md` 管**命名**，`docs/domain-models.md` 管**結構**（實體、欄位、關聯、ER 圖）。同時出現在兩邊的詞，用相對路徑連過去，不重述——重述就是 duplication，review 會擋。

### 四個 mode 各自怎麼接

這個模組不是加一個檔案就算完，它要接進四種既有的執行流程，而**每一種的權限都不一樣**：

| Mode | 情境 | 對詞彙做什麼 |
|---|---|---|
| B | 從既有程式碼建文件 | 抽取術語，並偵測同義詞漂移 |
| G | 新專案訪談 | 訪談中使用者造的詞當場收集成候選 |
| U-1 | 依 diff 增量更新 | diff 帶進來的新詞**只當候選**，裁決留給使用者 |
| U-2 | 全面稽核 | 用 grep 檢查既有裁決有沒有被違反 |

U-1 那一列最值得看。增量更新是最常跑的模式，也最容易順手把新詞「就這樣定下來」——規則明講了不行，diff 引入的詞一律只是候選。

而 U-2 用 grep 檢查裁決，這是三層保證裡少數真正**自動**的部分：裁決一旦落地，違反它就是可偵測的字串比對，不需要人記得。

至於這個模組什麼時候該生成，doc-set 表的條件也不是「有詞彙就生」：Mode B 要抽取真的找到，Mode G 要訪談浮出**至少三個**需要定義的詞。門檻不到就不生——一份只有兩個詞的詞彙表沒有裁決密度，只是多一個要維護的檔案。

## 第三層：驗收要由不知情的人做

前兩層管的是文件的形狀，管不了它是不是**真的能用**。

`doc-architect` 的答案是 Fresh Session Test：一個只有這個 repo 當上下文的 agent，回答六個固定問題，而且每個答案都要標明出處在文件的哪一節。

| # | 問題 | 預期出處 |
|---|---|---|
| 1 | 這個系統是什麼？ | README 第一段 / AGENTS.md 身分句 |
| 2 | 它怎麼組織的？ | project-overview §3–4 |
| 3 | 我怎麼把它跑起來？ | README Quickstart / AGENTS.md Commands |
| 4 | 我怎麼驗證我的工作？ | test + lint 命令 |
| 5 | 這個 repo 追蹤什麼工作狀態？ | `PROGRESS.md`；沒有就答 `N/A` |
| 6 | 核心術語是什麼意思，避免哪些同義詞？ | `CONTEXT.md` §Language |

第六題是這次新增的，而且**只有在 `CONTEXT.md` 存在時才問**。沒有詞彙表的專案不會被問一個它答不出來的問題——這避免了「為了通過測試而硬生一份沒有裁決密度的詞彙表」。

### 為什麼不能自己扮演

這一節最關鍵的設計理由寫在稽核清單裡：

> 在剛寫完文件的同一個 session 裡自我模擬「一個只有 repo 當上下文的 agent」，並不是真的乾淨上下文——它記得自己剛做過的每一個決定，因此會**系統性地高估文件品質**。

這句話點破的東西很實在。文件寫完後自問「這樣夠清楚嗎」，答案幾乎必然是「夠」，因為問的人腦子裡還留著所有沒寫進文件的背景。這不是不誠實，是結構性的盲點。

所以做法是實際去 spawn 一個**沒有任何對話歷史**的 headless 子行程，把答案以 JSON 收回來。引用規則卡得很死：Q1–Q4 的引用必須指名真實存在的 Markdown 檔；`PROGRESS.md` 不存在時要用一字不差的 `PROGRESS.md absent at repository root`；Q6 的引用必須指名 `CONTEXT.md`。

不接受「我讀過了」這種自我宣稱，答案必須指得出來源——跟上一篇談的 script gate 是同一個手法：把「我有做」換成「我做了而且這裡是證據」。

![比較同一 session 自我模擬與獨立 headless 子行程：前者記得剛做過的每個決定、系統性高估文件品質、必須標記 degraded，不算獨立通過；後者零對話歷史、六題答案回傳 JSON、引用必須指名真實檔案，才算獨立通過](/assets/images/docs-need-ci-fresh-session-blind-spot.png)

### 降級要說出來

獨立執行器不可用時可以退回自我模擬，但規則要求標記 `degraded — independent runner unavailable`，而且 **MUST NOT** 報告成獨立通過或無條件的 `complete`。

還有一句寫得特別好：

> 供應商暫時失敗是重試或記錄降級的理由，不是捏造綠燈結果的理由。

這條規則防的是最隱蔽的一種失效——不是文件爛，是**驗收本身被摸魚**。而摸魚在事後幾乎看不出來，因為紀錄上就是一個通過。

評分則刻意留在原本的 session：腳本只負責提供答案，判斷「這是阻斷性缺口、通過、還是誠實的 TBD」仍然是規則的事。取得證據與判讀證據分開，跟第二層把「偵測漂移」與「裁決名稱」分開是同一種切法。

`test_fresh_session.py` 對 5 題與 6 題兩種形狀都有測試，11 個 case 全過。

## Mode G：把訪談本身當介面設計

前三層都是產出物的保證。這次還改了一個容易被忽略的東西：**取得資訊的過程**。

Greenfield 模式要訪談使用者才知道專案要做什麼。改法有四條：

**一次問一題，等答案，讓答案決定下一題。** 不是一次丟十個問題的表單。

**事實自己先查。** 現有檔案、git 狀態、既有文件——這些 agent 自己看得到的東西不准拿來問。原文的說法是：問題只花在**決策**上。

**每個問題自帶建議。** 語言、框架、架構形狀、資料庫、初始目錄結構、linter，每一個開放決策都要附 2–3 個候選、一個**標記出來的推薦**，加一行理由。不是把選擇丟回去讓使用者自己想。

**已經決定的不重新翻案。** 原文寫得很白：record, don't re-litigate。

還有一條同樣重要：沒決定的區塊一律寫 `TBD — not yet designed`，**絕不默默填上**。而且每個 TBD 都要標記它的回訪觸發條件（例如「等第一批 model 落地後」）。

這四條合起來，其實就是把一場對話當成介面在設計：輸入要驗證（事實自己查）、每次只處理一個決定、選項要窮舉並標出預設值、未定義的狀態要顯式存在而不是留空。

Headless 模式則直接跳過訪談，從請求裡取決策，其餘一律誠實 TBD。同一個 skill、同樣的規則，只是少了那個可以回答問題的人。

## 一個把「別給範例」變成實測的小實驗

上一篇提過 Anthropic 那份 Then/Now 表格裡的第二條：**提供使用範例 → 設計更有表達力的介面**。那時我只能從設計層面論證它。這個 PR 裡有一個直接的實測。

`AGENTS.md` 的樣板本來在「Hard constraints」那節給了三行示範：

```markdown
- MUST run `<test command>` and see it pass before declaring any task done (source: CI gate)
- MUST NOT edit `<generated dir>` by hand — regenerate via `<tool>` (source: <config file>)
- MUST NOT commit directly to `<default branch>` (source: repo settings / team rule)
```

看起來很合理——告訴模型約束長什麼樣子。實際行為卻是：模型去**抄這三行的形狀**，然後在目標 repo 裡找對應的東西填進去，而不是去找那個 repo 真正的約束是什麼。範例變成了天花板。

改法是整段拿掉，換成把介面本身定義清楚：

```markdown
<Non-negotiables only — the rules that break the build, the data, or the team's
process if violated. ≤ 15. Each is a MUST / MUST NOT with its source in
parentheses, found in THIS repo's config, CI, and team rules — the test-gate rule
is always one of them.>
```

規格說清楚了：格式（MUST／MUST NOT + 括號註明來源）、上限（≤ 15）、來源在哪裡找（這個 repo 的 config、CI、團隊規則）、以及唯一一條永遠成立的（測試關卡）。三行示範刪掉，淨變動 −5/+3 行。

驗證方式是跑一輪 live 10-scenario sweep 確認行為沒退步。

同一批還有第二個實驗：`SKILL.md` 裡的共用慣例本來重複寫在多處，收成一個指標 bullet，規則本體留在樣板與稽核清單。

兩個實驗都在 2026-07-24 那篇官方文章之後才驗證——PR 的敘述沒有掩飾這個順序。這不是獨立收斂後被印證，是拿官方的建議當假設，在自己的 repo 上跑了一次。

## 代價與證據

這些保證不是免費的。這個 PR 動了 52 個檔案、+1328/−228，從建立到合併跨了兩天（2026-07-28 → 07-29），版本 2.3.0 → 2.4.0。

驗證的部分：

- eval scenario **7 → 10**，新增的三個都針對詞彙表（`context-term-drift`、`context-no-terms-skip`、`context-avoid-drift-audit`）
- trigger matrix **16 → 18** 條
- live detection sweep **35/35**，重構前後各跑一次
- `test_fresh_session.py` **11/11**，涵蓋 5 題與 6 題兩種形狀

其中 live sweep 抓到了兩個**潛伏的契約不一致**——不是這次改動造成的，是本來就在那裡、只是沒人踩到。修法是從契約端修（vscode-extension 的 `build-tooling` 角色改成 additive、evidence 明確限定為 file-only），不是改測試讓它過。

description 那一段也順手瘦了：11 行/100 字 → 9 行/約 85 字。作法跟上一篇一樣——刪掉本文已經講過的身分句，每個 mode 給恰好一個 trigger、各配一個中文例子。全部 16 條 trigger matrix 條目逐條走過，確認 `generated` 與 `endpoint descriptions` 這兩個詞真的在承重，留下。

有一項誠實地沒打勾：互動式 Mode G 的實機測試，因為它需要一個真人受訪者。這件事寫在 PR 的 test plan 裡沒有假裝完成。

## 三層之間的關係

回頭看，三層保證各自擋掉一種腐壞，而且**擋不住彼此的**：

| 腐壞 | 保證 | 機制 | 誰有權放寬 |
|---|---|---|---|
| 長度會漲 | 行數預算 + 棘輪 | `verify.sh` 數行數，CI 紅燈 | 改 `verify.sh`，diff 可見 |
| 詞彙會漂 | `CONTEXT.md` 裁決 | canonical + `_Avoid_` + 歧義紀錄 | 只有使用者，headless 一律 pending |
| 正確性過期 | Fresh Session Test | 無上下文 agent + 引用驗證 | 沒有人——通不過就是通不過 |

有預算但沒有詞彙裁決，你會得到一份很短、但每個名詞都在漂的文件。有詞彙表但沒有驗收，你會得到一份自洽、但跟程式碼脫節的文件。三層都有，才是完整的。

至於順序，我的判斷是先做**驗收**。行數預算和詞彙表都需要先知道文件到底哪裡沒用——Fresh Session Test 會直接告訴你。

## 可以照做的五步

不用整套搬過來，這五步各自獨立有效：

1. **先跑一次假的 fresh session。** 開一個沒有上下文的對話，只給它 repo，問那六題。答不出來的就是你的文件破口——這一步不需要任何工具。
2. **量現在的行數，把它寫成上限。** 不是訂一個理想值，是把**今天的實際行數**寫進 CI。之後只能往下改。
3. **超過上限時先問「刪哪裡」。** 答案通常是重複的段落，不是有用的內容。找那些同一份規則被抄了兩份的地方。
4. **詞彙表只收會痛的詞。** 叫錯了會造成真正工作損失的才值得一則條目。訂個約 80 行的上限，寫下 canonical 名稱、該避免的同義詞、以及裁決日期。
5. **裁決留給人。** agent 可以偵測漂移、可以提候選、可以給推薦，但「以後統一叫哪個」是人的決定。沒人拍板就誠實寫「待裁決」，不要自己填。

第 1 步做完通常就會知道 2–5 要從哪裡開始。

上一篇的結論是「Prompt 越刪越短的前提，是介面越做越硬」。換到文件上是同一件事：文件能維持可讀，前提是有東西在管它的長度、名字和正確性，而那個東西不能是自律。

## 參考資料

- [skill-doc-architect PR #1：Grill-pruned SKILL.md, tightened trigger description, Mode G grilling, CONTEXT.md glossary module (2.4.0)](https://github.com/FWcloud916/skill-doc-architect/pull/1)
- [skill-doc-architect](https://github.com/FWcloud916/skill-doc-architect)
- [Anthropic：The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)（2026-07-24）
- [mattpocock/skills：writing-great-skills](https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md)
- 本站前一篇：[Script-Gated Skills：當 Anthropic 說「刪掉 80% 系統提示」，哪些東西不能刪](/posts/2026/2026-07-29-script-gated-skills/)
