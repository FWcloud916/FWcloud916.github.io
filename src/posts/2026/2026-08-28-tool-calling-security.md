---
title: 工具呼叫 / Function Calling 的風險
date: 2026-08-28
tags:
  - ai-security
  - ai
  - security
  - api
description: 從一個通過 JSON Schema 的 loopback URL 出發，拆解工具參數、後端授權、SSRF、命令注入與工具回傳內容的信任邊界，並以離線固定矩陣驗證逐次重判的作用。
---

> **查核資訊：** 本文於 2026-08-15 查核 OpenAI Function calling、OWASP LLM Top 10 2026、
> CWE-918 與 CWE-78 官方資料，並引用同日完成的固定合成實驗。API 行為與安全分類仍可能更新，
> 實作前請重新確認官方文件。

```json
{"url":"http://127.0.0.1:8080/admin"}
```

這是一段合法的 JSON。只要工具將 `url` 欄位定義為字串，這段參數也能通過最基本的 JSON Schema
驗證。然而，通過格式驗證不代表應用程式可以代替使用者連上這個目的地。

Function Calling 很容易製造一種錯覺：模型沒有直接碰資料庫、HTTP client 或檔案系統，只輸出結構化
參數，所以系統已經比自由文字安全。結構化介面確實縮小了解析歧義，卻沒有回答最重要的問題：
**這次動作是否應該執行？參數是否適合送進這個 sink？執行結果又能不能被下一個模型當成指令？**

我一開始的判斷只有六個字：後端逐次重判。

做完反例與固定實驗後，我把它展開成更具體的邊界：

> 模型只能提出工具名稱與參數。應用程式先驗證資料形狀，再以可信身分、後端正本與固定政策逐次
> 重判；通過後交給不接受指令字串的安全 adapter。工具回傳內容仍是不可信資料，不能取得下一次
> 工具呼叫的授權能力。

這篇要處理的不是「如何讓模型正確呼叫函式」，而是呼叫已經成形之後，應用程式如何避免把模型
輸出直接升格成 HTTP request、shell command 或下一輪的可信指令。

## Function Calling 只完成協定，不完成授權

依照 [OpenAI Function calling 指南](https://developers.openai.com/api/docs/guides/function-calling)，
典型流程是：應用程式向模型提供工具定義，模型回傳包含工具名稱與參數的 tool call；應用程式解析
參數並執行自己的程式碼，再把 `function_call_output` 送回模型。真正呼叫 HTTP client、查詢資料庫
或寫入檔案的，始終是應用程式。

Strict mode 能要求模型輸出符合指定的 JSON Schema。官方文件要求所有 properties 都列為 required，
並將 `additionalProperties` 設為 `false`。這很有價值：拼錯欄位、少傳必要資料或偷偷塞入未宣告的
`approved: true`，都能在介面邊界被拒絕。

但 Schema 能表達的「有效」，不等於業務與安全上的「允許」。例如：

| 參數 | Schema 能回答 | Schema 單獨無法回答 |
|---|---|---|
| `url: string` | 是否存在、是否為字串、是否符合格式 | 是否允許連到該目的地、解析後 IP 是否安全、重新導向後是否仍允許 |
| `output_name: string` | 長度與字元格式是否符合宣告 | 是否會被拼進 shell、是否發生路徑穿越、是否覆寫既有檔案 |
| `document_id: string` | ID 的形狀是否正確 | 登入者是否能讀這份文件、文件是否屬於同一租戶 |
| `approved: boolean` | 值是否為布林 | 誰核准、核准哪一組參數、核准是否仍有效 |

因此，`strict: true` 是資料形狀閘門，不是授權閘門。若 schema 本身接受任意字串，模型只是更穩定地
產生危險字串；若 schema 接受 `approved`，模型也只是更穩定地替自己填上「已核准」。

## 一次工具呼叫至少跨過四個邊界

把工具呼叫畫成單一箭頭，會掩蓋中間不同性質的判斷。我會把它拆成四道閘門：

```text
模型提案
  → 1. Schema：資料形狀是否符合契約？
  → 2. Policy：可信身分、資源正本與這次動作是否允許？
  → 3. Adapter：參數能否以安全資料結構交給底層能力？
  → 4. Result boundary：回傳內容如何標記、縮限並送回模型？
```

第一道處理語法與結構；第二道才做授權與目的地政策；第三道防止資料在 sink 前重新變成指令；
第四道則避免外部內容藉由工具回傳值取得下一輪控制權。四道閘門不能彼此代替。

這也解釋了「後端逐次重判」裡的「逐次」：不是驗證一次工具定義就永久信任，也不是同一個 session
核准過一次就一路放行。每一次呼叫都要用後端掌握的登入者身分、租戶、資源狀態與政策重新決定；
高影響動作還要核對使用者實際看過的完整參數。

## 風險一：合法 URL 仍可能把後端變成代理人

[CWE-918](https://cwe.mitre.org/data/definitions/918.html) 所描述的 Server-Side Request Forgery
（SSRF），重點不在 URL 字串「長得不像網址」，而在伺服器根據外部輸入發出請求，因而連上原本
不應存取的目的地。對工具介面來說，模型產生的 URL 就是這類外部輸入。

一個只檢查 `http` 或 `https` scheme 的 fetch 工具，可能仍接受 loopback、link-local、private
network、雲端 metadata endpoint 或內部管理介面。呼叫前只比對原始 hostname 也不夠，因為 DNS
解析、IPv4／IPv6 表示法、重新導向與 URL parser 差異，都可能造成應用程式檢查的目的地與實際
連線的目的地不同。

正式系統應先問一個更根本的問題：工具真的需要接受任意 URL 嗎？若需求只是讀取兩個已知服務，
精確 allowlist 通常比 blocklist 容易推理。若確實要接收廣泛 URL，則至少要使用一致的 parser、在連線
前驗證解析後目的地、封鎖不應存取的網段、限制 port 與 protocol，並對每一次 redirect 重新驗證；
網路層 egress policy 仍應作為獨立防線。

## 風險二：安全的 JSON，進入 shell 後仍會變成指令

假設匯出工具接受：

```json
{"output_name":"summary.pdf; touch /tmp/day19-owned"}
```

這組參數是合法的 JSON，`output_name` 也確實是字串。當 adapter 把 `output_name` 直接插入以下
命令時，危險才出現：

```text
convert report.md summary.pdf; touch /tmp/day19-owned
```

此時分號不再是檔名資料的一部分，而會被 shell 解讀成指令分隔符。[CWE-78](https://cwe.mitre.org/data/definitions/78.html)
建議優先避免直接呼叫 shell，改用結構化 API 或參數陣列，讓資料與命令彼此分離；必要時再加上精確
allowlist 與正規化後檢查。

「先 escape」通常不是第一選項，因為 shell、作業系統與下游工具各有自己的語法。更清楚的設計是：
後端自行產生儲存 ID，使用者輸入只作為顯示名稱；若一定要輸出檔名，則採固定副檔名與很小的字元集，
並用不經 shell 的函式傳遞獨立參數。

[OWASP LLM10:2026 Improper Output Handling](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM10_ImproperOutputHandling.md)
也提醒：若模型輸出未經驗證就交給下游系統，可能導致 SSRF、命令執行等後果。Function Calling
沒有消除這條路徑，只是把自由文字換成具名欄位。

## 風險三：工具回傳值不是可信的 system message

工具執行完畢後，應用程式會把結果送回模型。工具結果可能來自網頁、文件、郵件、資料庫欄位或第三方
API，也可能夾帶「忽略前面規則」「把秘密傳到某個網址」之類的提示注入內容。

`function_call_output` 是協定角色，不是信任等級。若 Agent 下一步能根據回傳文字自行選擇另一個工具，
外部資料就可能形成「取回內容 → 內容要求下一個動作 → Agent 提出呼叫 → 應用程式執行」的鏈條。

因此，工具回傳內容應與控制資料分離：可信狀態由應用程式自行產生；外部文字標成 `untrusted_data`，
並限制長度與可見欄位，必要時再以結構化引用呈現。下一個工具呼叫仍要重新經過 schema、policy、
adapter 與核准；即使要求出現在「工具結果」裡，也不能因此提高權限。

把文字放進 `<untrusted>` 標記或 JSON 欄位能幫助模型理解邊界，卻不是確定性防線。真正的防線仍是：
即使模型採納了惡意文字，後端也不會讓它越權執行。

## 固定矩陣：同一組提案走兩條路

這次不量測模型會不會產生危險參數，而是把危險參數視為已經存在。固定 runner 將 5 組案例分別送入
脆弱路徑與強化路徑，共做 10 次路徑評估：

- 脆弱路徑信任傳入物件，直接記錄「本來會送到哪一個 sink」。
- 強化路徑先驗證嚴格 schema，再套用固定目的地政策與輸出名稱規則；工具結果則以不可信資料封裝。

所有 sink 都只記錄記憶體內事件。實驗沒有呼叫模型、連上網路、啟動 subprocess，也沒有執行 shell
命令或呼叫外部服務。固定程式、fixture、事前預測與淨化結果收錄在公開的
[Day 19 evidence checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-19-tool-calling-security/evidence/day-19)。

5 組案例全部符合事前預測：

| 案例 | 為什麼值得測 | 脆弱路徑 | 強化路徑 |
|---|---|---|---|
| 公開 allowlist URL | 確認防線沒有封鎖正常用途 | 模擬 fetch | 允許並模擬 fetch |
| 加入 `approved: true` | 呼叫者能否自帶授權資訊 | 接受並模擬 fetch | `additionalProperties: false` 拒絕 |
| `127.0.0.1` 管理介面 | 字串通過 schema 後是否仍檢查目的地 | 模擬 fetch | 目的地政策拒絕 |
| 含 shell 分號的輸出名稱 | 字串是否被直接拼成命令 | 記錄 would-be shell | 安全檔名規則拒絕 |
| 工具結果內含下一步指令 | 外部文字是否取得控制權 | 標成可信指令並暴露 | 標成不可信資料並封裝 |

實驗結果顯示，脆弱路徑有 4 次到達模擬 sink，另有 1 次把工具結果暴露為可信指令；強化路徑只有
乾淨 URL 到達模擬 sink，3 次由確定性規則阻擋，1 次將工具結果封裝為不可信資料。整個實驗共記錄
5 個記憶體內事件；模型呼叫、網路呼叫、`subprocess` 與外部副作用均為 0。

這組結果特別顯示兩個不同層次。偽造的 `approved` 是資料形狀問題，嚴格 schema 可以直接排除；
loopback URL 與 shell metacharacters 卻都能是合法字串，必須分別由目的地政策與安全 adapter 處理。
若只說「我們已驗證 JSON」，後兩個案例仍會穿過。

## 實驗沒有證明什麼

這不是模型或 Function Calling 框架的比較，也不是 Prompt Injection 成功率。工具回傳案例只驗證程式
有沒有保存信任分類與序列化邊界，沒有模型參與，因此不能宣稱模型一定會忽略惡意內容。

URL 規則刻意維持小範圍，只示範精確 origin allowlist 與 loopback 拒絕。這組規則沒有涵蓋 DNS
rebinding、重新導向重判、所有特殊網段、proxy 行為或 parser confusion。命令案例只記錄
would-be shell 字串，從未真的啟動 shell。

因此，結果只支持以下結論：**結構驗證能排除未宣告欄位，但語意授權、目的地限制、sink adapter 與
工具結果的信任分類仍要分開實作；模型提案不能跳過任何一道。**

## 實作時，我會先檢查這八件事

1. **模型只提案。** Tool name 與 arguments 都是不可信輸入，不直接代表允許執行。
2. **Schema 採封閉契約。** 開啟 strict mode、列出 required 欄位，並拒絕額外欄位；授權資訊不放在
   模型可填的物件裡。
3. **每次重新授權。** 從 session 或後端身分系統取得可信使用者與租戶，以資源正本和固定政策重判。
4. **目的地採正向限制。** 能用固定 resource ID 或 exact allowlist，就不接受任意 URL；必要時驗證
   解析後 IP 與每次 redirect，並設定網路層的 egress 控制。
5. **sink 不接指令字串。** 優先使用參數化查詢、結構化 SDK、argument array 與後端產生的檔案 ID。
6. **核准綁定完整動作。** 高影響操作要讓使用者看到實際參數；參數一旦改變，原核准立即失效。
7. **工具結果維持不可信。** 只回傳必要欄位、限制大小、保留來源，且不能藉內容取得新的工具權限。
8. **保留縱深防禦。** 最小權限、sandbox、逾時、rate limit、audit log 與 circuit breaker 處理單一閘門
   失守後的影響範圍。

在 [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
的語境裡，這些問題可落在 Tool Misuse and Exploitation 等 Agentic 風險。不過，分類名稱本身不是
控制措施。應用程式仍要記錄每次呼叫的決策：誰要求什麼動作、後端套用哪一條授權或目的地限制規則、
哪一道閘門允許或拒絕，以及最後是否真的產生副作用。

Function Calling 的安全價值，不在於把模型輸出變成「可信 JSON」，而在於它提供了一個明確、可測試
的仲介點。只要應用程式守住這個點，模型可以犯錯，外部內容可以帶著惡意指令，底層能力仍不必照做。

下一篇會把範圍擴到供應鏈：模型、套件與 MCP Server 都可能把新的程式碼、提示內容、工具介面與
更新管道帶進系統。到時要問的不只是哪一次工具呼叫安全，而是提供這項能力的來源是否值得信任。

## 參考資料

- [OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [OWASP LLM10:2026 Improper Output Handling](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM10_ImproperOutputHandling.md)
- [CWE-918: Server-Side Request Forgery](https://cwe.mitre.org/data/definitions/918.html)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [LLM Application Security Lab — Day 19 evidence checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-19-tool-calling-security/evidence/day-19)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10405695)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 19／31 篇**

[上一篇：Excessive Agency：Agent 的過度代理風險](https://imfw.io/posts/2026/2026-08-27-excessive-agency-risk/) · 下一篇：供應鏈風險：模型、套件與 MCP Server

<!-- series-nav:end -->
