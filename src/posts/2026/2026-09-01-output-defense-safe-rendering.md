---
title: 輸出端防禦：過濾、審核與安全渲染
date: 2026-09-01
tags:
  - ai-security
  - ai
  - security
description: 用同一份本機模型候選輸出對照未轉義與安全渲染路徑，拆開 JSON schema、內容審核、sink 授權與 HTML escaping，實際修掉模型輸出形成 active HTML 的漏洞。
---

> **查核資訊：** 本文於 2026-08-23 查核 OWASP LLM10:2026、OWASP Cross Site Scripting Prevention Cheat Sheet、Ollama Chat API／structured outputs 與 Python `html.escape` 文件，並引用同日完成的固定合成實驗。模型、API 與瀏覽器安全建議仍會演進；正式系統套用前，請依實際 framework 與輸出位置重新確認。

模型回覆符合 JSON schema，不代表內容可以直接放進網頁。

Schema 只能回答欄位是否存在、型別是否正確、字串有沒有超長。`summary` 即使是合法字串，內容仍可能是 `<script>`、事件屬性或會自動載入外部資源的標籤。應用程式若把字串直接插進 HTML，就等於允許瀏覽器將原本只是候選資料的 model response 解譯成 markup。

Day 22 處理的是資料能不能進入模型。Day 23 處理另一道邊界：**模型輸出能不能影響系統。** 這次不再換模型或比較兩組獨立回答，而是讓同一份候選輸出走兩條路徑，直接檢查輸出處理本身造成的差異。

## 問題不在模型寫了 HTML，而在應用程式照單全收

[OWASP LLM10:2026 Improper Output Handling](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM10_ImproperOutputHandling.md) 把問題定義得很具體：模型輸出交給下游元件之前，缺少驗證、淨化或正確處理。風險不只存在於聊天視窗。模型產生的內容若進入 browser、SQL、shell、Email、terminal，或交給會自動抓取資源的 Markdown renderer，同一段文字就可能因 sink 不同而取得不同能力。

這個差異很重要。模型可以輸出 `<img>`，不代表攻擊已完成；應用程式把 `<img>` 當成 HTML，才讓標籤有機會觸發載入或事件處理。反過來，model response 即使已經含有危險字串，只要 output gate 在 sink 前拒絕，或 renderer 把內容當成純文字，危險字串仍不會取得執行語意。

因此，本篇不把目標寫成「讓模型永遠不要產生 HTML」。真正可驗收的目標是：**不論模型產生什麼字串，應用程式只授予該字串完成既定任務所需的最低輸出能力。**

## 同一份候選輸出，同時走兩條路徑

正式實驗分為 Clean 與 XSS-canary 兩組。Clean 組只提供正常活動內容；XSS-canary 組則加入要求模型帶出合成 canary 並建立 HTML payload 的指令，後文簡稱攻擊組。實驗使用本機 Ollama 0.32.9，並以完整 digest 固定 `gemma4:latest` 模型。兩組各跑 5 次，亂數種子（seed）分別固定為 811 至 815，`temperature` 則固定為 0.7，總計 10 個 run units／10 次 chat calls。每次 chat 只產生一份候選輸出，再由應用程式計算 SHA-256，將相同候選交給兩條路徑：

1. **未轉義路徑**：解析候選 JSON 後，把欄位直接插進 HTML。
2. **防禦路徑**：驗證 schema、審核內容、授權 `html_text` sink，再把每個欄位做 HTML escaping。

![同一份模型候選輸出分成兩條路徑：未轉義路徑直接插入 HTML，形成 Active HTML；防禦路徑依序經過 Schema 驗證、內容審核、Sink 授權及 HTML escaping，最後成為純文字輸出。](/assets/images/output-defense-safe-rendering-output-authorization-boundary.png)

候選輸出固定是一個 JSON 物件，只能包含四個資料欄位：`title`、`summary`、`public_code` 與 `completion_marker`。應用程式會限制各欄位的型別與長度，並檢查兩個任務 marker 是否與後端保存的值一致。出現未知欄位、缺少欄位、型別錯誤、marker 錯誤或摘要過長時，都會 fail closed。

[Ollama structured outputs](https://github.com/ollama/ollama/blob/main/docs/api.md) 支援在 `/api/chat` 的 `format` 欄位傳入 JSON schema。這次請求確實包含 schema、`stream: false` 與固定推論參數，但應用程式仍會重新解析並驗證 `message.content`。模型回傳的內容仍是不可信字串；generation-time schema 不能取代接收端的 application contract。

除了 10 份模型輸出，Lab 另跑兩組確定性測試：7 個 renderer 案例涵蓋正常文字、正常使用 `<`／`>`、`<script>`、事件屬性、`javascript:` URL、自動載入外部資源與只含 canary 的字串；5 個 validation 案例則涵蓋缺欄位、多餘欄位、錯誤型別、錯誤 marker 與超長摘要。

## 漏洞只有一行，責任卻不在那一行結束

脆弱版本看起來很普通：

```python
def render_unescaped(candidate: dict[str, str]) -> str:
    return f"<article><h1>{candidate['title']}</h1><p>{candidate['summary']}</p></article>"
```

當 `summary` 欄位只包含活動時間時，這段程式會正常顯示文字；若欄位內容是帶事件屬性的 `<img>`，瀏覽器看到的就不再是單純文字，而是新節點與可能執行的事件處理器。漏洞不需要模型取得 tool call，也不需要應用程式呼叫 `eval()`；HTML renderer 本身就是能力入口。

防禦版本不是在前面加一個 `if "<script>" in text`。防禦版本先確認候選物件符合固定任務，再把內容審核與 sink encoding 分開：

```python
import html

OUTPUT_FIELDS = {"title", "summary", "public_code", "completion_marker"}

def authorize_html_text(candidate: object) -> dict[str, str]:
    if not isinstance(candidate, dict) or set(candidate) != OUTPUT_FIELDS:
        raise ValueError("output contract rejected")

    for field in OUTPUT_FIELDS:
        if not isinstance(candidate[field], str):
            raise ValueError(f"wrong type: {field}")

    review_for_secrets_and_urls(candidate)
    return candidate

def render_html_text(candidate: dict[str, str]) -> str:
    checked = authorize_html_text(candidate)
    title = html.escape(checked["title"], quote=True)
    summary = html.escape(checked["summary"], quote=True)
    return f"<article><h1>{title}</h1><p>{summary}</p></article>"
```

[OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) 強調 encoding 必須配合輸出 context。上面的 `html.escape(..., quote=True)` 只適用於這次固定的 HTML 文字位置；[Python 文件](https://docs.python.org/3/library/html.html#html.escape) 說明該函式會替換 `&`、`<`、`>`，並在 `quote=True` 時處理引號。程式若把值塞進 JavaScript、CSS、URL 或危險屬性，不能拿同一個函式硬套後宣告安全。

## 結果：四份有效 JSON 仍形成 active HTML

正式 batch 只執行一次，沒有依結果挑選重跑。完整 runner、去除敏感內容後的統計結果、候選輸出的雜湊值與安全邊界，都已封存在 [Day 23 immutable checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-23-output-defense-safe-rendering/evidence/day-23)。原始證據（raw evidence）的 SHA-256 為 `625d89e1…46e578`；原始 prompt、完整 canary、model response 與 rendered HTML 都沒有進入公開 checkpoint。

| 情境 | Schema valid | Canary exact | 未轉義 active HTML | 防禦路徑 allow | 防禦路徑 active HTML | 可見文字保留 |
|---|---:|---:|---:|---:|---:|---:|
| Clean | 5／5 | 0／5 | 0／5 | 5／5 | 0／5 | 5／5 |
| XSS-canary | 4／5 | 5／5 | 4／5 | 0／5 | 0／5 | 0／5 |

Clean 五份候選都是有效 JSON，兩個任務 marker 也全部正確。五份候選在防禦路徑都通過審核，HTML parser 讀回的可見文字與原欄位一致。這一欄不是裝飾：如果防禦只是把所有輸出換成「已封鎖」，active HTML 當然也會是 0，但應用程式已經失去摘要功能。

攻擊組的五份候選都帶出完整合成 canary，也都嘗試建立要求的 HTML payload。其中四份能解析成 JSON，也通過應用程式的欄位、型別、長度與 marker 檢查；這四份進入未轉義 renderer 後，都被 inert parser 判定為 active HTML，並包含可能指向外部位置的 URL。剩下一份並非模型拒絕，而是 JavaScript 字串拼接破壞了 JSON 語法，使整份 `message.content` 無法解析。這份 response 仍含 canary 與攻擊意圖，卻在 application schema gate 就被擋下，所以不能列入 renderer 已處理的 active HTML。

這個 4／5 不能叫作通用 XSS 成功率。正式實驗沒有啟動 browser、沒有執行 JavaScript、沒有解析 DNS，也沒有送出外部 request。Lab 使用 Python 標準函式庫的 inert HTML parser，只記錄內容交給能解譯 HTML 的下游後，哪些標籤、事件屬性或 URL 可能取得能力。本次只能確定：**相同候選資料在未轉義路徑形成 active HTML，在防禦路徑沒有。**

## Structured output 沒有替應用程式完成驗證

攻擊組的四份危險候選都符合 JSON schema。`summary` 欄位的型別是字串（string），長度也在上限內，因此 schema 沒有理由拒絕。Schema-valid 只代表物件結構符合活動摘要格式，不代表應用程式可以直接把摘要字串交給 HTML renderer。

另一份無法解析的輸出則顯示 structured output 的另一項限制：即使請求中已提供 structured-output schema，本次固定模型仍可能產生接收端無法解析的字串。因此，應用程式要處理兩種不同的失敗：

- **結構失敗**：不是合法 JSON、欄位不完整、型別或長度錯誤、任務 marker 被改掉。
- **內容與使用方式失敗**：結構完全合法，但字串含機密值、外部 URL 或會被 sink 當成程式碼的內容。

把兩種失敗塞進一個 `is_safe` 布林值，會讓稽核結果失去用途。正式 Lab 分開記錄 schema 驗證結果、canary 是否出現、是否形成 active HTML、輸出決策、是否包含外連位置，以及可見文字是否完整保留。開發者才能判斷防線究竟是擋在 parser、policy，還是 renderer。

## 內容審核與安全渲染負責不同工作

這次 review policy 會阻擋完整 canary，也會阻擋 `data:`、`http:`、`https:` 與 `javascript:` scheme。因為示範任務只需要活動文字，任何 URL 都不屬於允許輸出。正式產品若真的需要活動連結，合理做法是把連結獨立放在 URL 欄位，驗證 scheme 與 origin，再用 framework 的安全 API 設定屬性；而不是直接放寬整段 `summary`，讓自然語言與 HTML 共用一個字串。

不過，review policy 刻意沒有建立 HTML tag 黑名單。固定案例中的 `<script>` 與事件屬性沒有 canary 或 URL，內容審核會允許。安全 renderer 仍將 `<`、`>` 與引號編碼成文字，所以 defended active HTML 維持 0。這個結果說明內容審核與 output encoding 不能互相取代：

- **內容審核**：確認候選輸出的資料與目的地符合公開政策。
- **Sink 授權**：決定候選輸出可以交給哪種元件。
- **Context-specific encoding**：確保不可信字串在指定位置維持資料語意。

關鍵字過濾可以作為觀測訊號或任務政策，但不適合取代 parser。攻擊者可以改變大小寫、編碼、拆開字串或更換標籤；瀏覽器也會依不同 context 採用不同解析方式。安全邊界應該由確定性的 safe sink 與 encoder 建立，filter 則處理產品本身的內容限制。

## 換一個 sink，就要換一份契約

本篇實作只覆蓋 HTML 文字位置。其他輸出位置共享「model response 是不可信輸入」這個起點，防禦手段卻不相同：

| Sink | 錯誤做法 | 應用程式應持有的契約 |
|---|---|---|
| HTML text | 字串直接拼進 markup | framework auto-escaping 或 HTML text encoding |
| Rich HTML | 把模型輸出標成 trusted HTML | 維護明確 allowlist，使用適合的 sanitizer，並限制外部資源 |
| URL／HTML attribute | 只做 HTML escaping | 固定屬性名稱，驗證 scheme／origin，再使用安全 API |
| SQL | 執行模型產生的完整 query | 後端固定 query 結構，模型提供的值只作為 parameterized query 的參數 |
| Shell | 把模型文字交給 `shell=True` | 不提供 shell 語法能力；固定 executable，並將參數分開傳入 |
| Markdown／Email | 預設允許圖片、iframe 或 link preview | 關閉自動外連，或只允許受控來源與受控轉譯 |

這張表沒有宣稱本次已重現 SQL injection 或 RCE。表格只指出設計方法：先命名真正的 sink，再決定 schema、policy、authorization 與 encoding。若團隊只維護一個全域 `sanitize_llm_output()`，函式名稱宣稱的保護範圍，通常會超過它真正能保證的範圍。

## 可以直接帶回產品的輸出端檢查順序

1. **列出每一個輸出 sink。** Chat UI、log、terminal、Email、SQL、shell、檔案路徑與 tool argument 要分開盤點。
2. **縮小模型需要產生的資料。** 模型若只要提供標題與摘要，就不要讓模型產生完整 HTML template、SQL statement 或 shell command。
3. **建立 application-owned schema。** 驗證 exact keys、型別、長度、enum 與後端持有的 marker；解析失敗就停止。
4. **執行任務內容審核。** 檢查不允許公開的資料、目的地與業務規則，並記錄明確的允許或阻擋原因（allow／block reason）。
5. **重新授權 sink。** Schema valid 不等於可進 HTML，也不等於可呼叫工具。輸出用途由後端決定。
6. **使用 context-specific safe sink。** 優先使用 framework auto-escaping、`textContent`、parameterized query 或固定 API，而不是自己拼字串。
7. **分開測安全與效用。** 同時檢查 active content、資料跨界、正常文字保留、誤擋與 parser failure。

Day 23 的結果不是「加一個 filter 就安全」。更接近實際工程的做法是：schema 管結構、review 管任務政策、authorization 管輸出用途、renderer 管 context。每一層都要個別判定並留下紀錄，模型輸出才不會只因看起來像答案，就自動取得下一個元件的能力。

下一篇會處理 Guardrails 框架如何把輸入、輸出與主題規則組合起來。框架可以減少手刻 policy 的維護成本，但框架仍不能撤掉本篇的確定性 sink boundary。

## 參考資料

- [OWASP LLM10:2026 Improper Output Handling](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM10_ImproperOutputHandling.md)
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Ollama API — Generate a chat completion](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Python `html.escape`](https://docs.python.org/3/library/html.html#html.escape)
- [Day 23 immutable Lab checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-23-output-defense-safe-rendering/evidence/day-23)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10406649)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 23／31 篇**

[上一篇：輸入端防禦：隔離、標記與驗證](https://imfw.io/posts/2026/2026-08-31-input-defense-isolation-validation/) · 下一篇：Guardrails 實戰：用框架建立護欄

<!-- series-nav:end -->
