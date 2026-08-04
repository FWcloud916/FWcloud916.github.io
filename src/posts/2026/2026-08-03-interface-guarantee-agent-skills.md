---
title: 介面保證派：把 Skill 的不變量編進工具與 Script
date: 2026-08-03
tags:
  - ai
  - agent-skills
  - security
description: 從 schema、工具參數、狀態機、dry-run 與驗證閘門出發，拆解介面保證派如何在程式中落實 Skill 的不可逆邊界，以及這些保證仍然無法涵蓋的地方。
---

> **查核資訊：** 本文於 2026-08-03 依 Agent Skills 官方規格，以及 Anthropic 官方 agent 與 context engineering 文章查核。工具介面、Skill runtime 與模型行為可能變動；文中的「介面保證派」是本文拿來分析的框架，不是官方分類。程式碼片段是說明設計的示意，不是可直接套用的安全元件。

如果一條規則違反後會刪掉資料、發錯文章、跳過核准、洩漏憑證，或讓狀態進入無法回復的位置，那條規則就不該只寫在 `SKILL.md`。

這不是因為模型完全不值得信任，而是因為語言規則的保證強度有限。模型讀到「發布前必須得到確認」，可能照做，也可能把上一輪的確認、使用者模糊的「可以了」或自己的推論當成確認。介面保證派的做法，是讓 `publish` 命令需要一個可驗證的核准輸入，讓錯誤狀態回傳非零 exit code，讓前置條件未通過時根本沒有寫入路徑。

這篇使用「介面保證派」這個分析名稱，指一種把 Skill 的重要不變量搬進 schema、工具參數、Script、權限、狀態機與測試的設計偏向。它不是把所有規則都硬編碼，而是先問：哪些事情值得讓程式拒絕？拒絕時能不能不留下半成品？保證的範圍能不能被證明？

前一篇談的是如何用 Prompt 讓模型選對路；這一篇談的是如何讓介面層根本沒有危險路徑可走，或至少在跨過最後一道門時把它擋下來。

## 「介面」不只是 UI，也不只是 API schema

對 Agent 而言，介面是它能看見、能呼叫、能傳入參數、能讀到結果的整條控制面。它包括：

- tool name、description 與參數名稱；
- JSON schema、enum、required fields 與型別限制；
- CLI 的命令、旗標、stdin、錯誤訊息與 exit code；
- 檔案格式、狀態欄位、目錄邊界與寫入方式；
- 權限、憑證 scope、dry-run／apply 的分離；
- 測試、hash、artifact 與人類核准所形成的證據鏈。

Agent Skills 官方規格只定義 Skill 目錄與 `SKILL.md` 的格式，也提供 `scripts/`、`references/`、`assets/` 等可選目錄；它沒有因為檔案叫做 Skill，就自動替你保證 Script 內的商業規則。這個差異很重要：Skill format 負責 Skill 的發現與攜帶格式，介面保證則負責限制某個實作路徑上的行為。[Agent Skills 官方規格](https://agentskills.io/specification)

所以，介面保證派不是「把更多內容塞進 Skill」。它比較像把 Skill 拆成兩個責任：`SKILL.md` 說明模型應該如何思考與選擇；程式介面決定哪些輸入可接受、哪些狀態可進入、哪些副作用可以發生。

## 先分清楚四種不同強度的保證

「保證」這個詞很容易被用過頭。實務上至少要分成四層：

| 層次 | 能保證什麼 | 不能保證什麼 |
|---|---|---|
| 形狀保證 | 欄位存在、型別正確、值落在 enum | 使用者意圖正確、值指向的資源正確 |
| 流程保證 | 某狀態只能走允許的下一步 | 外部服務一定成功、所有人都只走這個流程 |
| 副作用保證 | 未通過前置條件時不寫入、不呼叫或不發布 | Script 本身沒有 bug、操作者沒有繞過它 |
| 證據保證 | 某次檢查產生了可重現的結果、hash 或 exit code | 檢查項目本身涵蓋了全部風險 |

例如，`status` 是 `pending`、`in_progress`、`completed` 三選一，這是形狀保證。它能避免拼錯 `complete`，卻不能阻止模型把 `pending` 直接改成 `completed`。若要保證流程，就要另外定義允許的 transition；若要保證不會偷偷寫入，就要讓 transition function 在拒絕時不修改資料。

介面保證派的第一個習慣，就是每次寫「保證」時把動詞補完整：保證格式？保證轉移？保證不寫入？保證當時有跑過檢查？沒有這個限定，文件很快就會把「驗證了其中一層」寫成「整個流程安全」。

## 第一個工具：用介面表達合法狀態，而不是用散文描述所有例外

Anthropic 在 context engineering 文章中把 Todo tool 的 `status` 列舉當成一個例子：有時候，把合法值直接放進介面，比在 Prompt 裡寫多個使用範例更能縮小模型的探索空間。這不是因為 enum 會自動理解工作流程，而是因為介面把一部分錯誤輸入變成不可能或容易拒絕的輸入。[Anthropic：The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)

一個簡化的狀態轉移可以長這樣：

```python
ALLOWED_TRANSITIONS = {
    "draft": {"review"},
    "review": {"approved", "draft"},
    "approved": {"published"},
    "published": set(),
}


def transition(current: str, target: str) -> str:
    if target not in ALLOWED_TRANSITIONS.get(current, set()):
        raise ValueError(f"invalid transition: {current} -> {target}")
    return target
```

這段程式只保證「被這個 function 接受的狀態轉移符合表格」。它還沒有處理鎖、並行更新、資料庫 transaction、外部發布是否成功，也沒有檢查使用者是否真的有權限。可是它已經比「請不要跳過 review」多了一個確定的失敗點：錯誤會被介面看見，而不是留給模型在下一個 token 自我提醒。

如果狀態轉移會寫入檔案或資料庫，還要把驗證放在寫入前，並讓失敗路徑不產生部分結果。否則你得到的是一個會報錯、卻已經把狀態寫壞的半保證。

## 第二個工具：讓危險選項在命令介面上分層

很多自動化流程只有一個命令，靠參數決定它現在是預覽還是正式執行：

```bash
tool publish --content article.md --confirm
```

問題不一定在 `--confirm` 這個字，而在於 preview 和 side effect 共用一個容易被誤叫的入口。模型只要把一個旗標補上，就從讀取狀態跨到外部發布；Prompt 再怎麼提醒，也很難把這兩種風險的差異固定下來。

更清楚的介面通常會把意圖拆成兩個階段：

```bash
tool publish --content article.md --dry-run
tool publish --content article.md --apply --approval-id APPROVAL_ID
```

第一個命令只產生計畫、差異與預計副作用；第二個命令要求已存在的核准證據，並重新驗證 dry-run 與 apply 之間沒有發生內容變更。這仍然不是絕對安全，但它把「看起來準備好了」與「現在真的要做」拆成兩個可觀察的事件。

可以再加上三個條件：

1. `--apply` 不接受空白或任意文字形式的 approval，而是接受具格式的核准識別碼。
2. apply 前重新計算來源內容的 hash；dry-run 之後內容變了，就拒絕執行。
3. 寫入採用暫存檔、fsync 與 atomic rename，避免程式中斷留下截斷檔案。

這些做法不會讓外部 API 永遠成功，也不會判斷使用者是不是被社交工程欺騙；它們做的是縮小「模型少做一步」時的副作用。

![介面保證派的副作用閘門，從 Prompt 的意圖經過工具介面與 Script gate，通過 dry-run、approval、hash 後才到達外部副作用；不合法輸入在前面被介面拒絕。](/assets/images/interface-guarantee-agent-skills-side-effect-gate.png)

## 第三個工具：把靜默錯誤改成大聲失敗

前文記錄過一個很典型的介面問題：`--scope` 接受逗號分隔的輸入，當逗號旁邊混入空白時，程式會靜默地把一個原本想表達的值拆成兩個項目。文件補一句「請注意逗號兩側不要有空白」可以暫時降低犯錯率，但真正的修法是讓 parser 拒絕歧義輸入，並說明如何改正。

一個示意版本：

```python
def parse_scope(raw: str) -> list[str]:
    if ", " in raw or " ," in raw:
        raise ValueError(
            "ambiguous scope: remove whitespace to separate entries, "
            "or escape the comma when it is part of a value"
        )

    entries = raw.split(",")
    if any(entry == "" for entry in entries):
        raise ValueError("scope cannot contain an empty entry")
    return entries
```

這個介面設計有三個比文件規則更可靠的地方：

- 錯誤在輸入當下發生，不必等到結果表格出現才發現解析錯了。
- 錯誤訊息同時告訴使用者兩種合法修法，減少「被拒絕但不知道怎麼辦」。
- 如果命令在 parse 之後才建立或修改資料，parse failure 可以保證這次沒有副作用。

Anthropic 的 agent 設計文章把這種方向稱為 poka-yoke：調整工具的參數，讓模型比較難犯錯；它也建議用多組輸入測試模型如何使用工具，而不是只測人類看起來合理的 happy path。文章提到，他們曾因模型在工作目錄改變後誤用相對路徑，改成要求絕對路徑後，工具使用結果明顯改善。[Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)

這裡的「保證」不是保證模型永遠不犯錯，而是把常見錯誤從「執行後才發現」提前成「介面拒絕」。失敗越早，回溯成本越低。

## 第四個工具：用 gate 把不可逆操作放到最後

Prompt 紀律可以提醒模型「先 audit，再 delete」。介面保證則會讓 `delete` 這個副作用依賴一個已通過的 audit 結果，而且在 audit 失效時退出，不進入刪除分支。

可以把流程想成兩階段提交：

```text
prepare
  ├─ 讀取目前狀態
  ├─ 檢查所有前置條件
  ├─ 產生 plan 與 fingerprint
  └─ 任一檢查失敗 → exit 1，不修改資料

commit
  ├─ 重新確認 fingerprint 沒變
  ├─ 需要時取得明確核准
  ├─ 執行不可逆操作
  └─ 寫入結果與證據
```

前文的 migration gate 是這種設計的具體例子：共用的硬規則由驗證 Script 檢查逐 byte 一致，Prompt 層的 two-phase commit anchor 放在 gate 之外，讓模型有一個熟悉概念可以思考，卻不把散文混進需要同步的機器區塊。這裡的重點不是 md5 本身有多神奇，而是每一種不變量都交給合適的維護機制：概念用文字，byte equality 用 hash，執行順序用程式。

這種分工也避免了一個常見錯誤：為了讓模型理解 gate，就在四份文件複製四份 gate。複製越多，漂移機率越高；真正的硬規則應該只有一個權威實作，其他地方只描述如何觸發它。

## 把「保證」寫成可驗證的契約

一個介面保證派 Skill，至少要能回答下面五個問題：

### 1. 合法輸入是什麼？

欄位是否 required？值是否有 enum？路徑是否必須絕對路徑？空字串、重複項目、未知旗標與額外欄位要拒絕還是忽略？

「忽略未知欄位」在相容性上很方便，在安全控制上卻可能很危險。模型以為傳入了 `approval_id`，程式如果把拼錯的 `approval-id` 靜默忽略，流程可能在沒有核准的情況下繼續。對重要欄位，fail closed 通常比寬鬆接受更容易稽核。

### 2. 哪些狀態可以互相轉換？

不要只列出狀態名稱，要列出 transition。若 `published` 是終態，程式就不應該默默接受 `published -> draft`，除非那其實是另一個明確的撤下流程，帶有不同權限與證據。

### 3. 副作用發生前最後一道檢查在哪裡？

檢查放在命令開頭不一定夠。若 audit 和 apply 之間可能有檔案、權限或外部資料改變，就需要在 commit 前重新確認關鍵 fingerprint。否則你驗證的是另一個版本的狀態。

### 4. 失敗會留下什麼？

exit code 1 只是訊號，不代表沒有副作用。要確認失敗前是否已建立檔案、寫入 metadata、發出遠端請求或消耗一次性 token。對不可逆流程，最好把計畫寫入明確的暫存位置，正式資料只有在所有 gate 通過後才替換。

### 5. 誰有能力繞過這條介面？

如果 Agent 同時能直接呼叫 shell、寫入相同資料庫、讀取相同 token，它可能繞過精心設計的 CLI。介面保證的前提是高風險副作用真的被收斂到受控的入口，權限也沒有給出另一條更寬的路。

## 介面保證派的工作流程

從一個已經靠 Prompt 運作的 Skill 開始，可以沿著下面的順序找出需要硬化的地方。

### 第一步：畫出副作用，而不是先畫工具

列出 Skill 會做的所有外部動作：寫檔、刪檔、改狀態、呼叫 API、發送訊息、建立權限、上傳媒體、提交 Git。對每一個動作標出可逆性、資料價值、需要的身份與失敗後的補救方式。

「產生摘要」通常可以留在 Prompt 層；「把摘要發布到公開帳號」就需要另外的 approval、內容 fingerprint 與 idempotency。兩個動作都可能由同一個 Skill 觸發，但不應該共用同一種保證強度。

### 第二步：為每個副作用定義前置條件

不要只寫「確認使用者同意」。把它拆成程式能檢查的條件，例如：來源檔存在、hash 與預覽一致、目標平台已選定、核准識別碼格式正確、目前狀態是 `reviewed`、上一次發布記錄不存在。

不能被程式檢查的判斷，才留給模型或人類；能檢查的就不要讓模型代為轉述。

### 第三步：設計窄介面與明確失敗

一個命令如果同時能 preview、mutate、delete、publish，模型很容易把它當成萬用工具。拆成幾個窄入口，讓每個入口的參數和副作用一致，通常更容易測試，也更容易在工具描述裡說清楚。

錯誤訊息要包含三件事：哪個條件失敗、目前觀察到什麼、下一步要做什麼。`invalid state` 幾乎沒有幫助；`cannot publish: status is draft; run review and obtain approval before --apply` 才能成為模型下一步的環境回饋。

### 第四步：建立失敗案例，不只建立成功範例

至少測試空值、拼錯 enum、跳過狀態、重複執行、內容在 dry-run 後變更、權限不足、外部 API timeout，以及副作用執行到一半時的恢復。每個案例都要確認兩件事：命令確實失敗，以及不該寫入的地方確實沒有被寫入。

Anthropic 建議對 agent 的工具做多組輸入測試，也強調 agent 需要從環境取得 ground truth、設定停止條件並在 sandbox 中測試。這些建議的共同點，是把可靠性從「模型看起來懂了」移到「系統留下了什麼證據」。

## 介面保證派的代價：硬化不是免費的

介面一旦開始拒絕輸入，成本就從 token 轉移到程式與維護：

- **開發成本**：要寫 parser、狀態機、atomic write、測試與錯誤訊息。
- **整合成本**：原本可接受的模糊輸入可能被拒絕，舊腳本需要遷移。
- **耦合成本**：Skill 不再只是 Markdown，會依賴特定 CLI、runtime、檔案格式與權限模型。
- **誤拒絕成本**：不完整的 schema 可能把合理的新情境也擋下來。
- **錯誤安全感**：一個綠色 exit code 可能只代表 parser 通過，並不代表外部目標收到正確結果。

因此，不是每個偏好都值得變成 gate。文字語氣、排序方式、是否要補一個非必要的說明段落，通常不值得寫狀態機；刪除 database、修改 production 權限、發布公開內容、更新 canonical state，則值得。

一個簡單的成本判準是：**這條規則失敗時，代價是否高於拒絕一次合法操作的代價？** 如果只是輸出不夠漂亮，硬 gate 可能讓流程變脆；如果是資料回不來或公開訊息無法撤回，寧可多一次人工處理，也不要讓模型靠記憶猜。

## 介面保證仍然有三個邊界

### 邊界一：介面只能管得到使用它的人

如果模型有另一個工具可以直接寫入相同的資料，或能直接執行 shell 改掉狀態檔，原本的 transition gate 只是建議。要談真正的安全，就要把權限收斂到同一個控制面，或在資料層再加一層 constraint。

### 邊界二：程式保證的是被寫下來的規則

狀態機若漏了一條 transition，會很穩定地錯；schema 若把危險欄位設成 optional，也會很穩定地漏掉檢查。介面比 Prompt 硬，不代表介面設計者不會判斷錯。它需要 code review、測試、版本管理與真實 failure case。

### 邊界三：外部世界不是 transaction

本機 hash 通過，不代表遠端資源沒有在下一秒變更；API 回傳 200，不代表下游使用者已經看到正確內容；dry-run 顯示可發布，不代表正式呼叫時 token、權限與網路仍然存在。外部副作用需要 idempotency、回讀驗證、重試策略與人工觀測，而不是一個漂亮的 `return 0`。

這三個邊界說明了為什麼 Prompt 與介面不能互相取代。模型擅長理解未結構化的意圖、處理例外與選擇下一步；程式擅長拒絕非法形狀、維護狀態、保存證據與原子化副作用。把它們放在錯的位置，才會產生「看起來很嚴謹、實際上沒有承重」的 Skill。

## 最實用的組合：Prompt 定政策，介面定機制，測試定證據

兩個流派最後不應該被做成二選一。較穩的架構是三層：

| 層 | 主要問題 | 適合放的內容 |
|---|---|---|
| Prompt 紀律 | 這個任務的意圖與判斷脈絡是什麼？ | 觸發條件、branch、步驟、trade-off、reference 指標 |
| 介面保證 | 哪些輸入與狀態允許通過？ | schema、enum、transition、權限、dry-run、atomic write |
| 測試與證據 | 這次真的完成了哪些可驗證事項？ | exit code、diff、hash、測試結果、回讀、audit log |

人類核准則放在不可逆副作用前，作為風險判斷，不要把它偷偷改寫成模型自己產生的一個布林值。

這個組合也能解釋 Anthropic 所說的「設計介面」：介面不是用來取代所有 Prompt，而是把最常見、最昂貴的錯誤，從語言層移到較能被驗證的層。官方 agent 設計文章把清楚的工具介面、工具文件、測試與防錯設計放在 Agent-Computer Interface 的核心；同一篇文章也提醒，agent 具備自主性就會帶來成本與錯誤累積，因此需要適當 guardrails。[Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)

## 介面保證派的實作清單

要把一個 Skill 從「請模型小心」推進到「系統能拒絕」，可以從下面幾題開始：

1. 列出所有副作用，並標記哪些不可逆、哪些涉及公開資料或高權限。
2. 把合法輸入、必填欄位、enum、路徑與空值行為寫進 schema 或 parser。
3. 把狀態名稱改成明確的 transition table，不要只在文件寫「不能跳過某一步」。
4. 把 preview 和 apply 分開；apply 前重新驗證內容 fingerprint 與 approval。
5. 對所有拒絕路徑確認 exit code、錯誤訊息與零副作用。
6. 對 parser、狀態機、atomic write 與外部回讀建立失敗案例。
7. 檢查 Agent 是否有另一條權限更寬的路徑可以繞過 gate。
8. 把介面契約當成程式碼維護，讓文件只描述如何選擇與解讀它。

如果其中一題答不出來，不代表 Skill 不能用；代表目前的「保證」還只是想法，沒有被收斂成可檢查的契約。

## 收尾：不要讓模型背一個本來可以由程式承擔的記憶題

介面保證派不是把模型當成敵人，而是承認模型不應該負責記住每一個不可逆的細節。Prompt 可以提醒、解釋、路由與協調；schema 可以縮小輸入空間；Script 可以拒絕非法狀態；測試與 artifact 可以留下這次真的發生了什麼。

真正值得硬化的地方，通常有一個共同特徵：錯一次之後，資料、權限或公開結果回不來。把那個邊界編進介面，會增加開發與維護成本，但也把錯誤從「模型這次有沒有記得」變成「系統是否接受」。

這就是兩個流派最精確的分工：Prompt 紀律派讓模型有方向又保留判斷空間；介面保證派讓高代價的錯誤沒有那麼容易變成動作。前者負責可理解，後者負責可拒絕，測試負責證明兩者沒有只停留在文件裡。

## 參考資料

- [Agent Skills 官方規格](https://agentskills.io/specification)
- [Anthropic：The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)
- [Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
