---
title: 供應鏈風險：模型、套件與 MCP Server
date: 2026-08-29
tags:
  - ai-security
  - ai
  - security
  - api
description: 從模型權重、Python 套件到第三方 MCP Server，拆解不可變身分、雜湊、來源證明、可執行格式與執行時權限，並以離線固定矩陣建立 ALLOW、REVIEW、BLOCK 接入判斷。
---

> **查核資訊：** 本文於 2026-08-15 查核 OWASP LLM04:2026、Hugging Face Hub、SLSA v1.2
> 與 Model Context Protocol 2026-07-28 官方資料，並引用同日完成的固定合成實驗。規格、工具與
> 供應鏈建議仍可能更新，實際接入前請重新確認官方文件。

```text
下載模型 → 安裝套件 → 加入 MCP Server → Agent 多了一項能力
```

這條流程看起來只是開發環境設定，實際上每一個箭頭都會引入外部製作與維護的元件；這些元件可能
執行程式碼，也可能取得系統權限。模型權重會進入載入器，Python 套件會在安裝或 import 後執行，MCP Server 則可能
讀檔、連線、取得 token，再把工具介面交給 Agent。

如果只問「這個專案有沒有很多 stars」「套件名稱是不是看過」「檔案有沒有簽章」，我們得到的只是
零散線索，還沒有足以放行的判斷。

我一開始的判斷只有五個字：證據鏈優先。

完成現況盤點與固定矩陣後，我把它展開成一套接入規則：

> 外部元件不能只靠名稱、人氣、雜湊、簽章或 tool annotations 放行。接入前要把不可變身分、位元
> 完整性、來源與建置證明、可執行格式、執行時權限及更新差異串成證據鏈；證據完整且符合既定政策
> 才 `ALLOW`，資訊不足先 `REVIEW`，完整性不符、危險格式或權限漂移則 `BLOCK`。

這篇不會下載一個陌生模型、安裝疑似惡意套件，或真的啟動第三方 MCP Server。我要處理的是更早的
一道關卡：在元件取得執行機會以前，應用團隊要收集哪些證據，又該如何把證據變成一致的決策。

## 供應鏈不是一份依賴清單，而是一串信任轉移

[OWASP LLM04:2026 Supply Chain](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM04_SupplyChain.md)
把範圍放得很廣：模型、資料、adapter、轉換流程、套件與部署基礎設施都在供應鏈裡。這些元件不只
提供資料，也可能改變程式如何執行、模型如何回應，以及 Agent 能接觸哪些外部能力。

傳統 SBOM 能回答「用了哪些軟體元件」，AI 應用還要追問模型、資料與 adapter。OWASP 因此同時
提到 SBOM 與 AIBOM，以及簽章、雜湊和 provenance。這些資料的共同價值，是讓團隊能把目前執行的
位元組追溯到某個明確來源與流程，而不是只記得一個顯示名稱。

不過，證據之間不能互相冒充。我會把接入判斷拆成五個問題：

| 問題 | 要回答什麼 | 常見證據 | 單獨仍無法證明 |
|---|---|---|---|
| 身分 | 我拿到的到底是哪一版？ | immutable ref、完整 digest、精確版本 | 來源可信、內容安全 |
| 完整性 | 位元組有沒有被換掉？ | SHA-256、簽章驗證結果 | 建置者可信、行為安全 |
| 來源 | 誰在何時、用什麼流程產出？ | provenance、attestation、reviewed builder | artifact 沒有惡意行為 |
| 可執行性 | 載入或安裝時會跑什麼？ | 檔案格式、install hook、remote code 設定 | 執行後只取得必要權限 |
| 權限 | 元件在執行時能碰什麼？ | filesystem roots、egress hosts、secret scopes、tool snapshot | 下一次更新仍維持相同能力 |

這五題形成的是證據鏈，不是五選一。只有 digest，最多能知道位元組是否相同；只有簽章，最多能知道
簽署者與內容是否對得上；只有 sandbox，也只能在元件取得執行機會後限制損害。Digest、簽章與
sandbox 都很重要，卻處理不同問題。

## 模型權重檔：大量數值，也可能帶來載入風險

模型名稱最容易造成錯覺。`latest`、分支名稱、model card 標題或下載頁面都是方便人閱讀的標記，卻
可能指向會變動的內容。若部署只記錄名稱，重新建置時拿到另一組位元組，團隊甚至無法判斷行為差異
來自程式、prompt，還是模型本身。

因此，第一步是固定不可變版本與完整 digest，並在載入前重新比對。這讓重現、回復舊版與事件調查有一個
共同座標，但 digest 只回答「是不是同一份位元組」，不回答「這份位元組該不該執行」。

第二步是檢查格式與載入行為。[Hugging Face Hub 的 Pickle Scanning 文件](https://huggingface.co/docs/hub/security-pickle)
明確提醒，反序列化 pickle 可能執行任意程式碼；掃描器能降低風險，卻不是萬無一失的保證。已簽署的
commit 可以協助確認來源，但不能因此證明其中的檔案安全。

這裡有一個很重要的分界：

- 改用 `safetensors` 之類不以任意程式碼反序列化為設計目標的格式，可以縮小「載入時執行程式碼」
  的攻擊面。
- 但安全格式不會證明模型沒有 behavioral backdoor、惡意微調或資料投毒。位元組可以安全載入，模型
  行為仍可能不符合需求。

所以模型接入至少要分成 artifact intake 與 behavior evaluation。Artifact intake 檢查身分、雜湊、
來源、格式及 remote code；behavior evaluation 才用固定測試集、紅隊案例與部署後監控評估行為。
若只用一句「模型已驗證」概括兩個階段，後續的人就不知道究竟驗證了什麼。

## 套件：鎖住版本，還沒鎖住來源與建置流程

套件管理器的 lock file 是必要基礎。精確版本與 artifact hash 可以防止依賴解析在不同時間任意漂移，
也能在取得檔案後比對內容。若沒有精確版本與 artifact hash，連「本次部署是不是昨天測過的那一版」
都難以回答。

但 lock file 不會自動證明以下事情：

- 名稱是不是預期的專案，而不是 typo、dependency confusion 或 slopsquatting 產生的近似名稱。
- 發布帳號是否被接管，或正常套件的新版本是否混入惡意內容。
- sdist 或 wheel 經過哪個 builder、使用哪些來源與步驟產生。
- 安裝 hook、原生 extension 或 import-time code 會執行什麼。
- transitive dependency 是否新增了網路、檔案或憑證存取能力。

[SLSA v1.2](https://slsa.dev/spec/v1.2/) 將 build provenance 用來描述 artifact 在哪裡、何時、如何
被產出。Build provenance 補上的是「產出過程」證據，不是另一個 checksum。正式流程可以依風險
要求來源 commit、建置服務身分、可驗證 attestation、簽章與可重現建置；即使是同一個組織內的元件，
也不應跳過來源與建置審查。

套件更新時，我不只看版本差異，還會看 lock diff 與能力差異：新增了哪些直接或間接依賴、是否從
wheel 改成需要本機建置的 sdist、是否出現 install script、是否新增原生程式碼，以及執行時是否需要
新的環境變數、網路目的地或檔案路徑。版本識別只是變更索引，不是核准本身。

## MCP Server：審的不只是工具名稱，而是另一個執行邊界

第三方 MCP Server 常被描述成「替 Agent 增加工具」，但從風險角度看，它更接近一個帶著傳輸、
認證、工具定義、資源存取與更新管道的外部程式。即使工具名稱只是 `search_docs`，server 的 process
仍可能看到檔案、環境變數與網路；遠端 server 則牽涉 access token、上游 API 與多租戶邊界。

[Model Context Protocol 2026-07-28 規格](https://modelcontextprotocol.io/specification/2026-07-28)
把授權資料存取與工具執行的決定留給使用者與應用程式。規格也提醒，tool annotations 除非來自可信
server，否則應視為不可信；remote MCP 的 access token 必須綁定 MCP Server 這個 audience，server
也不得把 client token 直接轉送給上游 API。

因此，審查 MCP Server 時不能只截一張 tool list。我會保存一份可比較的 capability snapshot：

| 層次 | 接入前要記錄 |
|---|---|
| Server 身分 | repository、publisher、immutable release、artifact digest、provenance |
| 啟動方式 | local command 或 remote endpoint、參數、工作目錄、更新方式 |
| 工具介面 | tool 名稱、description、input schema 的完整快照與 SHA-256 |
| 本機權限 | 可讀寫的 filesystem roots、可見的環境變數名稱、是否能啟動子程序 |
| 網路權限 | outbound host allowlist、port、redirect 與 DNS 政策 |
| 認證 | token audience、scope、保存位置、是否與上游憑證分離 |
| 變更 | 新增或移除工具、schema 變動、權限擴張、publisher 或 artifact 變更 |

這裡的 `tool annotations` 可以當說明或風險提示，不能當授權來源。真正的權限由 process sandbox、
filesystem mount、network egress、secret injection 與後端政策決定。Server 更新後若多了一個工具、
擴大一個 root 或新增 outbound host，即使版本簽章有效，也應視為需要重新核准的 capability drift。

## 用 ALLOW、REVIEW、BLOCK 取代模糊的「看起來可以」

接入流程如果只有通過與失敗，團隊很容易把「資訊不夠」誤當成「沒有發現問題」。我採用三種決策：

- `ALLOW`：必要證據完整，artifact 與 capability 都符合事前定義的政策。
- `REVIEW`：尚未發現確定違規，但缺少必要證據；補齊以前不能進入執行環境。
- `BLOCK`：完整性不符、格式或載入方式違反政策、token passthrough，或已核准能力發生漂移。

`REVIEW` 不是比較客氣的 allow，而是流程中的停止狀態，表示目前無法做出可辯護的決定。若有時間
壓力，正確動作是縮小功能、改用已核准版本，或由風險擁有者留下有期限的例外，而不是把缺少證據
改寫成低風險。

決策順序也很重要。若 artifact hash 已不相符，就不需要因為 provenance 欄位齊全而繼續放行；若
模型格式是政策明確禁止的 pickle，簽章有效也不能覆蓋格式閘門；若 MCP Server 的 filesystem roots
與 outbound hosts 已擴張，舊核准也應立即失效。

## 先盤點示範應用，而不是先下載可疑元件

這次實作分成兩部分。第一部分直接讀取公開 Lab commit 中已版控的 `uv.lock` 與實驗定義，不 import
候選套件、不載入模型，也不啟動 MCP Server。結果如下：

| 元件 | 觀察到的證據 | 判斷 | 缺口 |
|---|---|---|---|
| Python 套件 | 32 個 locked packages、436 個 artifact hashes | `REVIEW` | 沒有記錄 build provenance |
| 模型引用 | 15 個引用全都有完整 digest，共 2 組唯一 name/digest | `REVIEW` | 沒有記錄 artifact format、簽章或 provenance |
| MCP Server | 檢查 3 個宣告路徑，皆不存在 | `NOT_CONFIGURED` | 沒有 server 與 capability 可供判斷 |

這不表示 Lab 使用的套件或模型已經不安全；目前保存的證據只是不足以支持更強的供應鏈聲明。
32 個套件與 436 個 artifact hashes 可以支持版本固定與完整性比對，但 artifact hashes 沒有告訴我們
每個 artifact 的建置者與建置流程。15 個完整 digest 可以支持模型身分重現，但 model digests 沒有
告訴我們檔案格式與來源證明。

MCP 的 `NOT_CONFIGURED` 也要小心解讀。`NOT_CONFIGURED` 只表示這個 commit 在 `.mcp.json`、`mcp.json` 與
`config/mcp.json` 三個宣告路徑沒有設定，不能推論使用者層級、其他 client 或外部環境完全沒有 MCP
Server。沒有觀察到設定，和證明不存在，是兩種不同陳述。

## 固定矩陣：三類元件各測三種決策

第二部分使用 9 份固定合成 manifest，模型、套件與 MCP Server 各三份。每個案例都先寫下預期結果，
再交給同一個確定性 policy runner；runner 不做模糊評分，也不呼叫模型。

| 案例 | 關鍵證據或違規 | 結果 |
|---|---|---|
| 完整模型證據 | immutable ref、digest、provenance、允許格式皆符合 | `ALLOW` |
| 可變模型且無 digest | 缺 immutable ref 與 SHA-256 | `REVIEW` |
| 已簽署 pickle 模型 | 來源可辨認，但格式違反政策 | `BLOCK` |
| 完整套件證據 | 精確版本、digest、provenance 皆符合 | `ALLOW` |
| 套件缺 provenance | 有版本與 hash，不知道如何產出 | `REVIEW` |
| 套件 hash mismatch | 實際位元組與核准證據不同 | `BLOCK` |
| 完整 MCP 宣告 | tool snapshot、roots、hosts、secret names、token policy 皆符合 | `ALLOW` |
| 只有 tool annotations | 缺身分、來源與 capability 證據 | `REVIEW` |
| MCP capability drift | roots 與 outbound hosts 比核准版本擴張 | `BLOCK` |

9 組案例全都符合事前預測，分布正好是 3 `ALLOW`、3 `REVIEW`、3 `BLOCK`。模型、套件與 MCP
Server 各貢獻一種決策，因此結果不是靠某一類元件特例湊出來。

整個實驗的模型呼叫、網路呼叫、套件安裝、artifact 載入、MCP Server 啟動、subprocess 與外部副作用
都是 0。固定程式、fixture、原始證據雜湊與淨化摘要收錄在公開的
[Day 20 evidence checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-20-ai-supply-chain-security/evidence/day-20)。

其中最值得保留的反例是「已簽署 pickle」。如果把簽章當成最高通行證，這個案例會被放行；把來源與
可執行格式分開後，判斷就很清楚：簽章可以支持「誰發布了這些位元組」，卻不能把違反載入政策的格式
變安全。同樣地，MCP Server 原本通過審查，也不能把未來擴張的 filesystem root 與 outbound host
一起自動核准。

## 實驗沒有證明什麼

這套 runner 不是惡意程式掃描器、模型安全評測、套件 registry、簽章驗證器、SLSA conformance
checker、MCP client 或 sandbox。這套 runner 沒有驗證真實 attestation、重現建置、反序列化權重、
import 套件，也沒有連上任何第三方服務。

`ALLOW` 只表示合成證據符合這一版小型 intake policy，不代表元件不存在未知漏洞或惡意行為；
`BLOCK` 也只對應明確政策條件，不是全世界通用的危險分類。正式系統還需要漏洞管理、行為測試、
sandbox、最小權限、egress control、secret scope、監控、回復舊版與事件應變。

現況盤點同樣有邊界。這次盤點唯讀存取指定的版控檔案，沒有掃描開發者家目錄、IDE 設定、CI secret
或雲端環境。限定盤點範圍是刻意的選擇：文章需要一個可公開重現、沒有碰觸私人設定的證據範圍，而
不是假裝完成整台機器的鑑識。

因此，這組結果支持一項範圍較小、但可實作的結論：**外部元件的接入決策必須同時保存身分、完整性、來源、
可執行性與權限證據；任何單一徽章、雜湊、簽章或說明欄位，都不能替整條證據鏈背書。**

## 接入外部元件前，我會檢查這十二件事

1. **固定不可變身分。** 保存完整 digest、精確套件版本或 immutable release，不只記 `latest`、branch
   或顯示名稱。
2. **比對取得的位元組。** 在安裝、載入或啟動前驗證 SHA-256 或簽章；不符就 `BLOCK`，不能靠重新
   下載直到「剛好成功」。
3. **保存來源與建置證據。** 記錄 publisher、source commit、builder、provenance／attestation 與
   審閱時間；簽章只證明簽署關係，不代表安全。
4. **檢查 executable format。** 模型是否使用 pickle、是否要求 remote code；套件是否有 install
   hook、sdist 或原生 extension；MCP Server 如何啟動。
5. **核對名稱與所有權。** 確認 registry namespace、repository、publisher 與維護權轉移，防止 typo、
   dependency confusion 與相似名稱誤裝。
6. **展開 transitive dependencies。** 檢查新增、移除與來源變動，不只看直接依賴的一行版本號。
7. **保存工具與 schema 快照。** 對 MCP tool list、description 與 input schema 取 hash；annotation
   只當說明，不當授權。
8. **列出實際 capability。** 明確限制 filesystem roots、outbound hosts、subprocess、secret names、
   token audience 與 scope。
9. **把更新視為新決策。** Artifact、publisher、tool schema 或 capability 任一改變，都重新走 intake；
   不沿用舊版核准。
10. **讓 `REVIEW` 真正停止部署。** 證據缺失時先隔離，補齊或建立有期限、有負責人的例外，不預設
    放行。
11. **隔離第一次執行。** 即使 intake 通過，仍在最小權限、受控 egress、無生產 secret 的環境測試，
    並準備快速回復舊版。
12. **留下可查詢的決策紀錄。** 保存誰在何時依哪一版政策核准哪個 digest 與 capability snapshot，
    讓事件發生時能回答受影響範圍。

這份清單的核心不是收集越多文件越好，而是讓每一份證據都對應一個問題。若團隊說「有 SBOM」，就
追問 SBOM 是否涵蓋模型與 MCP Server；若團隊說「有簽章」，就追問簽章驗證了誰、哪一份 artifact，
以及 runtime capability 是否另行審查；若團隊說「跑在 sandbox」，就追問 sandbox 實際允許哪些
檔案、網路與 secret。

供應鏈管理很容易停在採購審查與合規文件，沒有持續核對實際部署的 artifact 與權限。比較可靠的
做法，是把 intake policy 寫成可測試規則，讓 CI 對 artifact 與 capability diff 做 fail-closed 檢查，
再由人工處理真正需要判斷的 `REVIEW`。CI 負責一致性，人工審查負責接受哪一種風險；CI 和人工審查
都不能只看元件的自我宣告。

前兩篇把 Agent 的動作拆成「模型提案、後端授權、工具 adapter 與結果邊界」。這一篇再往前追：提供
模型、套件與工具能力的元件，本身也必須先通過接入邊界。下一篇會把這些缺口串在一起，回顧一條從
間接注入、檢索污染、工具濫用到資料外洩的端到端 Agent 攻擊鏈。

## 參考資料

- [OWASP LLM04:2026 Supply Chain](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM04_SupplyChain.md)
- [Hugging Face Hub — Pickle Scanning](https://huggingface.co/docs/hub/security-pickle)
- [SLSA v1.2 Specification](https://slsa.dev/spec/v1.2/)
- [Model Context Protocol Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [LLM Application Security Lab — Day 20 evidence checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-20-ai-supply-chain-security/evidence/day-20)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10405830)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 20／31 篇**

[上一篇：工具呼叫 / Function Calling 的風險](https://imfw.io/posts/2026/2026-08-28-tool-calling-security/) · [下一篇：第三週回顧：一次端到端的 Agent 攻擊鏈](https://imfw.io/posts/2026/2026-08-30-end-to-end-agent-attack-chain/)

<!-- series-nav:end -->
