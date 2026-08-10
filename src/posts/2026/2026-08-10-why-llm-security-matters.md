---
title: 我從模型的不確定性開始理解 LLM 應用資安
date: 2026-08-10
tags:
  - ai-security
  - ai
  - security
description: 從客服退款與摘要流程拆解模型不確定性，找出意圖、決策、執行與資料邊界；安全控制由可驗證的程式與規則負責。
---

> **查核資訊：** 本文於 2026-08-03 依 OWASP、NIST 與 MITRE 官方資料查核。LLM、Agent 與相關風險分類仍在演進；後續文章涉及特定框架、模型或工具時，會重新確認最新文件。

我一開始認為，LLM 應用最大的風險，來自模型行為的不確定性。

這個答案沒有錯，但不夠完整。

一個只會回答問題的 chatbot，說錯話通常先是品質問題。但當它能搜尋公司知識庫、讀取客戶資料、呼叫 API、寄信，甚至替使用者執行操作，同一個錯誤判斷就可能變成真的事故。

真正的問題不只是模型會不會猜錯，而是：**系統是否讓一個不確定的判斷，取得了讀取資料與改變外部狀態的權力？**

這是我想在這個系列裡弄懂的事。

## 從一筆退款看見三條邊界

假設客服 Agent 可以呼叫這個工具：

```python
refund(order_id, amount)
```

如果模型誤判使用者意圖，它可能在對方沒有要求退款時呼叫工具，也可能填入不合理的金額。我最初想到的防線，是在執行前檢查權限。

但「這個人有退款權限」，不代表「這一筆退款合理」。還需要把工具能決定的事情縮小：由後端重新讀取訂單，依已付款與已退款金額計算可退餘額，而不是讓模型任意指定數字。介面也可以改成：

```python
refund_order(order_id, reason)
```

最後，即使權限與金額都正確，系統仍不能把模型推測的意圖當成使用者授權。高影響動作應顯示訂單與退款金額，再要求使用者透過可信介面明確確認。確認資料要綁定使用者、訂單、金額、有效期限與單次使用的 nonce，不能只把對話中的「好」交給模型判斷。

這和 [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) 的界線一致：風險常來自過度功能、過度權限與過度自主。OWASP 建議限制工具及其權限、在下游系統執行完整授權檢查，並要求使用者核准高影響操作。

![退款流程安全邊界圖：模型判斷只能提出建議，請求必須依序經過可信介面確認、後端規則驗證與最小權限工具，才能執行退款。](/assets/images/why-llm-security-matters-refund-security-boundaries.png)

這個例子讓我把模型的不確定性拆成三條邊界：

- **意圖邊界**：這真的是使用者要求的嗎？
- **決策邊界**：這只是模型建議，還是已經過業務規則驗證的決策？
- **執行邊界**：模型能呼叫哪些工具，又能控制哪些參數？

我得到的第一個結論是：

> 問題不是模型會推測，而是系統讓「推測」自動取得了「權力」。

## 很多事故並不新，只是換了一條路進來

再換一個例子。假設模型只能替客服摘要客戶的退貨原因，完全沒有退款工具，Prompt Injection 成功後似乎就不會直接改變訂單。

但如果模型看到其他客戶的資料，它仍可能把姓名、地址或訂單內容寫進摘要。這同時是可靠性問題與資安問題：模型做出超出預期的行為，而未授權資料也已經遭到揭露。

責任不能全部推給模型。如果其他客戶的資料已經被放進 context，第一個安全失敗通常發生在資料查詢、租戶隔離或存取控制。比較合理的資料流應該是：

```text
使用者身分
    ↓
資料列／租戶權限檢查
    ↓
只取用完成任務所需的資料
    ↓
LLM 產生摘要
    ↓
輸出跨入下一個元件前重新驗證
```

輸出驗證也不是前置防線失敗後才做的補救。即使每筆資料都經過授權，模型仍可能把合法內容組合成不該揭露的推論，或產生會被下游當成 HTML、SQL 或指令處理的文字。[OWASP LLM05:2025 Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/) 要求模型輸出送往其他元件前，依真正使用它的 context 完成驗證、清理與編碼。

LLM 輸出不是可信內容，而是下一個元件的不可信輸入；安全處理要發生在真正使用資料的 sink。

這些問題聽起來新，底層卻仍是熟悉的機密性、完整性、授權、輸入驗證、安全輸出與最小權限。LLM 沒有取代傳統資安，而是把自然語言、檢索資料與工具呼叫接進控制流程，讓既有弱點能從新的路徑被觸發、串接與放大。

## 先掌握可控的邊界

面對 [Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)，可以做關鍵字偵測、把外部內容標成不可信資料，也可以再用模型判斷輸入是否可疑。這些方法能增加防禦深度，卻不能提供確定的安全保證：文字能被改寫、拆分或換一種語言，檢查模型本身也可能誤判。

我會優先做另一件事：減少模型能取得的資料與工具。

如果模型只需要摘要退貨原因，就只提供完成摘要需要的商品資訊與客戶留言；姓名、Email、地址和付款資訊不應一起送出。客戶留言仍要視為不可信輸入，摘要模型也不需要任何退款或寫入權限。即使它聽從惡意指令，影響範圍也應被限制在一段尚未經過輸出檢查的文字。

這是我目前最重要的學習結論：

> 當模型的不確定性無法被消除，就先控制它能接觸的資料、工具與執行範圍。真正的安全決策，仍由可驗證的程式與規則負責，而不是要求模型永遠做對。

[OWASP 2025 Top 10 for LLMs and Gen AI Apps](https://genai.owasp.org/llm-top-10/) 把 Prompt Injection、敏感資訊洩漏、輸出處理不當、過度代理與向量／Embedding 弱點等風險分開整理；NIST 的 [Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1) 把生成式 AI 風險放回 AI 產品與服務的設計、開發、使用與評估；[MITRE ATLAS](https://atlas.mitre.org/) 則以 tactics 與 techniques 整理針對 AI 系統的攻擊行為。這些資料會是後續學習的地圖，但不會取代親手推演與驗證。

## 接下來，我想回答五個問題

這段學習的目標不是成為模型研究員，也不是保證做出「絕對安全」的 Agent。這種保證通常比寵物溝通師更值得懷疑。

我希望最後能對自己的 LLM 應用回答：

1. 哪些輸入與外部內容必須視為不可信？
2. 模型、RAG、工具與下游系統之間有哪些信任邊界？
3. 一次錯誤判斷或注入如何擴大成資料外洩與未授權動作？
4. 哪些控制只能降低發生機率，哪些能限制事故影響範圍？
5. 如何用可重複的測試與觀測證據，證明防線真的存在？

這是我為自己建立的學習邊界與檢查清單。下一篇先釐清其中一個基礎問題：LLM 資安和傳統資安之間，究竟是取代、延伸，還是既有問題的重新組合？

## 參考資料

- [OWASP GenAI Security Project — 2025 Top 10 Risk & Mitigations for LLMs and Gen AI Apps](https://genai.owasp.org/llm-top-10/)
- [OWASP GenAI Security Project — LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OWASP GenAI Security Project — LLM05:2025 Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)
- [OWASP GenAI Security Project — LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [NIST AI 600-1 — Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile](https://doi.org/10.6028/NIST.AI.600-1)
- [MITRE ATLAS](https://atlas.mitre.org/)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10401817)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 1／30 篇**

系列起點 · [下一篇：傳統資安 vs LLM 資安：到底哪裡不一樣](https://imfw.io/posts/2026/2026-08-11-traditional-vs-llm-security/)

<!-- series-nav:end -->
