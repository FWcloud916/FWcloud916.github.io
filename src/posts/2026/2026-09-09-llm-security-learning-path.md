---
title: LLM 應用資安怎麼學：從威脅地圖、攻擊靶場到紅隊工具
date: 2026-09-09
tags:
  - ai-security
  - ai
  - security
description: 從 OWASP 威脅地圖、攻擊靶場與 RAG／Agent 資料流開始，再用護欄和紅隊工具驗證防禦；每一階段都留下可重複檢查的成果。
---

> **查核資訊：** 本文於 2026-08-25 重新確認各項資源的官方頁面。OWASP 清單、靶場內容、模型版本與工具介面都可能變動；開始練習前，仍應回到官方文件確認目前狀態。

LLM 應用資安的資源不少，難點是安排學習順序：該先讀威脅分類、練習提示注入，還是直接安裝紅隊工具？

如果一開始就跑掃描器，報告裡會出現一串檢測程式（probe）、判定器（detector）、攻擊策略（attack strategy）與分數，但這些結果本身無法說明問題出現在輸入、模型處理、工具授權或輸出處理的哪個環節。如果只讀風險清單，也很容易記住十個名稱，卻無法判斷外部文件中的指示為什麼能改變 Agent 的工具操作。

先建立威脅地圖，再到安全靶場動手攻擊；接著把問題放回檢索增強生成（RAG）與 AI Agent 的資料流，最後才接上護欄與自動化紅隊工具。每一階段都要留下可檢查的成果，不能只把資源加入書籤。

![LLM 應用資安完整學習路線圖：四個階段由建立威脅地圖、練習攻擊、串接 RAG 與 Agent 到驗證防禦，並標示八個實作步驟、主要資源與每階段成果。](/assets/images/llm-security-learning-path-complete-roadmap.png)

## 先確定學習方法：回答、查證、實驗、修正

這套方法不先寫完整答案，再替文章補上參考資料，而是依序進行以下五個步驟：

1. 先用自己的話回答問題，留下當下的理解與不確定處。
2. 閱讀官方資料，拆開可查證的事實、自己的判斷與尚未處理的邊界。
3. 能操作的題目先寫下預測，再用最小案例驗證。
4. 記錄實際結果、失敗模式與限制，重新回答原本的問題。
5. 最後才把觀點變化與證據整理成文章。

模型輸出具有變動性，單次成功不代表控制穩定；工具顯示 `PASS`，也不代表整個應用程式安全。先寫下預測與測試條件，才能判斷實際結果支持原本的預測，還是只是剛好符合預期。

## 四個階段各自要回答什麼

| 階段 | 核心問題 | 主要資源 | 完成後應留下的成果 |
|---|---|---|---|
| 建立威脅地圖 | LLM 應用有哪些資產、信任邊界與常見失敗方式？ | OWASP GenAI LLM Top 10、OWASP AISVS | 一張自己的系統圖與初版風險清單 |
| 練習攻擊 | 直接提示注入、間接提示注入與工具濫用如何發生？ | Gandalf、HackAPrompt、PortSwigger、Simon Willison 的案例 | 攻擊紀錄、成功條件與未達成攻擊目標的案例 |
| 串接 RAG 與 Agent | 不可信資料如何進入模型的處理範圍，模型輸出又能觸發哪些功能？ | PortSwigger、供應商的 Agent 安全文件、自己的最小應用程式 | 資料來源、檢索、模型、工具與輸出處理的信任邊界圖 |
| 驗證防禦 | 哪一道控制負責阻擋、限制或偵測？工具結果能證明到哪裡？ | NeMo Guardrails、Prompt Guard、Llama Guard、garak、PyRIT | 有對照組的測試結果、判定方式與限制 |

這四個階段不是依工具難度排列，而是依理解所需的前後關係排列。先知道要保護什麼，才知道靶場裡的成功代表什麼；先看懂攻擊路徑，才知道護欄應放在哪裡；先定義判定方式，紅隊工具的結果才有解讀基礎。

## 第一階段：用 OWASP 建立地圖，不把 Top 10 當檢查表

先用 [OWASP GenAI LLM Top 10 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) 建立共同語言，辨認提示注入、敏感資訊揭露、供應鏈、資料與模型投毒、不當輸出處理、過度代理能力等風險。Top 10 用來辨認風險，不能直接證明系統已完成安全驗證。

讀 Top 10 時，不要只抄分類名稱。應把每一項風險放回自己的系統，至少回答四個問題：

- 哪些資料或功能可能受影響？
- 攻擊者能控制哪些輸入或外部內容？
- 模型輸出會送到畫面、檢索器、程式解析器，還是能改變外部狀態的工具？
- 哪個應用程式元件負責授權、驗證、編碼、限制資源或留下稽核紀錄？

建立威脅地圖時，可以搭配 [OWASP Artificial Intelligence Security Verification Standard（AISVS）1.0](https://owasp.org/www-project-artificial-intelligence-security-verification-standard-aisvs-docs/)。AISVS 是公開的安全要求目錄，每項要求都設計成可測試、可實作與可驗證。Top 10 負責辨認風險，AISVS 提供可驗證的控制要求；依兩份文件整理清單，仍不代表通過 AISVS 或完成合規稽核。

最後，把使用者輸入、系統指示、檢索內容、工具回傳與模型輸出的來源、途中經過的解析與控制，以及能到達的功能或外部系統，畫成自己的資料流圖。

## 第二階段：用靶場建立攻擊手感

威脅分類提供名稱，靶場讓抽象名詞變成可觀察的行為。練習時不要只收集越獄提示，應該記下攻擊成立的條件。

### Gandalf：理解提示與防線如何互相拉扯

[Gandalf](https://gandalf.lakera.ai/) 會隨關卡逐步增加限制，適合用來初步觀察提示注入與防護規則的互動。每完成一關，除了保留成功提示，也要記錄提示利用的機制：角色扮演、格式轉換、資訊拆分、上下文混淆，或判定條件本身的漏洞。

不要把通關解讀為某一種提示可以穩定擊敗所有模型。關卡、模型與防護可能更新，同一句輸入也可能得到不同結果。真正值得留下的是攻擊假設與成功條件。

### HackAPrompt：觀察攻擊策略如何組合

[HackAPrompt](https://www.hackaprompt.com/) 提供提示攻擊題目與競賽形式，適合比較不同策略如何組合。閱讀公開解法時，重點不是複製一句成功提示，而是把它拆成可重複檢查的機制，例如要求模型改寫受限制內容、把目標藏在編碼中，或利用評分規則與輸出格式之間的落差。

競賽題目的成功條件由題目與評分器定義。它能訓練攻擊思路，但不能直接代表真實應用程式的資料授權、工具權限與輸出處理都會以相同方式失守。

### PortSwigger：把 LLM 攻擊接回 Web 應用程式

[PortSwigger Web Security Academy 的 Web LLM attacks](https://portswigger.net/web-security/llm-attacks) 將 LLM 放回 API、外掛與 Web 應用程式的情境，涵蓋 API 攻擊面、過度代理能力、間接提示注入、不安全輸出處理與連鎖利用。這份材料會把提示注入與伺服器端請求偽造（SSRF）、跨網站指令碼（XSS）、存取控制等既有問題連在一起；具備相應的 Web 安全基礎，較容易理解這些攻擊路徑。

練習時要區分兩層結果：模型是否產生了攻擊者想要的內容，以及應用程式是否真的執行了未授權操作。模型偏離指示是重要訊號，真正的影響仍取決於後端是否把模型輸出當成授權、是否限制工具與資源，以及高風險動作是否需要額外確認。

### Simon Willison：持續追蹤案例與設計邊界

[Simon Willison 的 prompt injection 主題頁](https://simonwillison.net/tags/prompt-injection/) 長期整理提示注入案例、失敗模式與防禦討論。這個主題頁不是官方標準，也不是循序靶場，適合在實作前後挑選與目前架構相關的文章，檢查系統是否同時接觸外部內容、私密資料與對外通訊，以及三者組合後產生的風險。

[LLMSecTest](https://llmsec.dev/) 目前仍處於早期開發階段（pre-alpha），是一套以 pytest 執行 LLM 應用安全測試的框架。部分互動實驗頁面仍可使用，但網站定位與內容正在變動，因此使用前要重新確認目前功能、可用頁面與工具成熟度。

## 第三階段：把攻擊放回 RAG 與 Agent 的資料流

使用者本身是攻擊者時，惡意指示會直接透過使用者輸入進入應用程式，形成直接提示注入。RAG 與 AI Agent 還會處理文件、網頁、電子郵件、資料庫欄位與工具回傳。即使攻擊者無法直接對模型輸入指示，也能把惡意指示藏在應用程式之後會取得的內容裡，形成間接提示注入。

[Anthropic 的提示注入防護文件](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks) 也把直接與間接提示注入分開：前者通常來自對抗性使用者輸入，後者來自網頁、文件或工具結果等第三方內容。這個分類適合用來檢查自己的資料來源，但實際控制仍要依應用程式架構設計。

接下來，建立一個最小 RAG 或工具呼叫應用程式，並標出以下路徑：

```text
使用者要求
  → 應用程式建立模型請求（request）
  → 檢索或工具取得外部內容
  → 應用程式將外部內容轉成模型能處理的格式
  → 模型產生回覆或工具提案
  → 應用程式驗證身分、資源、參數與動作
  → 顯示結果或執行外部操作
```

接著用一份正常文件與一份含惡意指示的文件測試同一個問題。記錄檢索器是否選取測試文件、應用程式是否把文件內容送進模型請求、模型輸出是否改變，以及後端是否允許模型提出的操作。四項結果要分開記錄，不能合併成單一的「攻擊成功」。

最後，分開標出三個邊界：哪些資料會進入模型的處理範圍、模型輸出會送到哪些解析或執行元件，以及哪一層程式真正負責資料與動作授權。

## 第四階段：再接上護欄與紅隊工具

等攻擊面與判定方式清楚後，再選工具處理特定問題。這些工具的名稱常一起出現在資源清單裡，實際責任並不相同。

| 工具 | 適合先驗證的問題 | 結果不能單獨證明什麼 |
|---|---|---|
| [NeMo Guardrails](https://docs.nvidia.com/nemo/guardrails/latest/home) | 輸入、輸出、主題與其他安全檢查如何編排 | 不能取代應用程式的身分與資源授權 |
| [Prompt Guard](https://huggingface.co/meta-llama/Prompt-Guard-86M) | 輸入是否具有提示注入或越獄特徵 | 分類結果不是穩定的安全邊界，也不是動作許可 |
| [Llama Guard](https://ai.meta.com/llama/get-started/) | 輸入與輸出是否符合設定的安全分類 | 不會替後端限制工具參數、資料範圍或副作用 |
| [garak](https://github.com/NVIDIA/garak) | 以多種 probe 與 detector 快速探索模型或系統的失敗方式 | 一輪沒有命中不代表沒有其他攻擊路徑 |
| [PyRIT](https://github.com/microsoft/PyRIT) | 編排單輪、多輪、情境式與人工參與的紅隊測試 | 自動評分仍需檢查評分條件、漏判與誤判 |

NeMo Guardrails 適合學習如何在模型前後安排可設定的檢查；Prompt Guard 與 Llama Guard 適合觀察分類器如何產生風險訊號；garak 適合快速執行一批結構化探測；PyRIT 適合編排攻擊策略、測試目標與評分方式，並保存結果。沒有必要為了完成清單而一次接上所有工具。

可以先選一項最小目標，例如「惡意文件被檢索後，應用程式仍不得執行未授權工具」。測試先建立一組正常內容與一組攻擊內容，再加入一項控制，並固定模型、設定、輸入、重複次數與判定方式。完成測試後，比較控制前後的結果，並記錄未涵蓋的限制。

## 底層基礎只在需要時補

先備知識分成三組：LLM／RAG／Agent 基本運作、Web 安全，以及 Python 搭配任一 LLM API 或本地模型。不必全部讀完才開始；遇到下列情況時再補：

- 如果看不懂嵌入向量（embedding）、檢索結果或函式呼叫（function calling）如何進入模型請求（request），就先補 RAG 與工具呼叫的資料流。
- 不熟 XSS、SSRF、注入與存取控制，就先完成 PortSwigger 對應的 Web 安全基礎。
- 無法固定輸入、設定、紀錄與輸出，就先建立一個可重複執行的 Python 測試程式。

解讀攻擊或防禦結果前，需要先說明資料來源、模型處理的內容、輸出流向，以及哪一層會實際改變外部狀態。

## 從零開始的八個步驟

1. 畫出自己的 LLM 應用程式資料流與外部功能。
2. 閱讀 OWASP GenAI LLM Top 10，將相關風險標到圖上。
3. 從 AISVS 選出與目前架構相關、可以驗證的要求。
4. 完成 Gandalf 或 HackAPrompt 的一組題目，記錄攻擊機制，不只保留成功提示。
5. 完成 PortSwigger 至少一個工具濫用或間接提示注入實驗，分開記錄模型偏航與實際副作用。
6. 建立一個最小 RAG 或工具呼叫案例，加入正常內容與攻擊內容。
7. 選一個護欄或分類器加入控制前後比較，保留正常對照案例。
8. 最後再用 garak 或 PyRIT 擴大測試，記錄工具版本、目標、案例數、判定方式與未測範圍。

每一步都要留下可檢查的成果，例如系統圖、威脅假設、攻擊紀錄、測試程式、原始結果或限制說明。系統圖、測試紀錄與限制說明能支撐後續文章和安全決策，也能在模型、提示、檢索器或工具權限變更後重新驗證。

## 資源只是入口，順序與證據才是路線

每一項資源都應回答明確問題：OWASP 用來建立威脅地圖，靶場用來理解攻擊條件，RAG 與 AI Agent 練習用來畫出信任邊界，護欄與紅隊工具則用來驗證特定控制與擴大測試。

學習 LLM 應用資安可以從最小系統開始：先寫下預測，執行可重複的測試，再用官方資料修正判斷。文章、清單與工具報告只能保存結果與證據，不能代替實際驗證。

## 參考資料

- [OWASP GenAI LLM Top 10 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
- [OWASP Artificial Intelligence Security Verification Standard 1.0](https://owasp.org/www-project-artificial-intelligence-security-verification-standard-aisvs-docs/)
- [Lakera Gandalf](https://gandalf.lakera.ai/)
- [HackAPrompt](https://www.hackaprompt.com/)
- [PortSwigger Web Security Academy — Web LLM attacks](https://portswigger.net/web-security/llm-attacks)
- [Simon Willison — Prompt injection](https://simonwillison.net/tags/prompt-injection/)
- [LLMSecTest](https://llmsec.dev/)
- [Anthropic — Mitigate jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)
- [NVIDIA NeMo Guardrails](https://docs.nvidia.com/nemo/guardrails/latest/home)
- [Meta Prompt Guard](https://huggingface.co/meta-llama/Prompt-Guard-86M)
- [Meta Llama Guard](https://ai.meta.com/llama/get-started/)
- [NVIDIA garak](https://github.com/NVIDIA/garak)
- [Microsoft PyRIT](https://github.com/microsoft/PyRIT)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10408806)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 31／31 篇**

[上一篇：總結：LLM 應用安全檢查清單與心法](https://imfw.io/posts/2026/2026-09-08-llm-security-checklist/) · 系列完結

<!-- series-nav:end -->
