---
title: 模型是提案者，不是授權者
description: LLM 可以提出動作與資源，但身分、權限與業務決策仍要由應用程式根據可信資料重新判斷。
created: 2026-08-17
updated: 2026-08-17
maturity: growing
related:
  - /posts/2026/2026-08-10-why-llm-security-matters/
  - /posts/2026/2026-08-14-threat-modeling-llm-apps/
  - /posts/2026/2026-08-15-trust-boundaries-untrusted-input/
---

LLM 很適合把自然語言整理成候選動作，卻不該決定誰有權執行。即使模型回傳可以解析的 JSON，格式正確也不能證明 JSON 裡聲稱的使用者身分可信，更不能證明應用程式應該允許這個動作。

## 提案只包含動作與資源

模型可以提議 `read note-123`；應用程式則只接受 allowlist 內的 `action` 與 `resource_id`。`user_id`、tenant、role、policy 與 `allow`／`deny` 都不屬於模型的決定範圍。即使模型輸出這些欄位，應用程式也要忽略欄位內容，並留下不含 token、完整 prompt 或資源內容的 security signal。

客服 Agent 若要處理退款，模型可以提出訂單編號與原因。後端要從可信資料重新確認訂單歸屬與退款狀態，再計算實際可退金額，不能接受模型自行填寫的結果。

## 授權必須回到應用程式

應用程式要從已驗證的 session 或 token 取得身分，並將模型提出的資源識別碼解析成後端實際使用的 canonical resource，再依目前的 action、resource 與 policy 逐次授權。[OWASP Business Logic Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html) 要求後端依可信資料重新推導會影響價格、存取、所有權與狀態的值。[OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) 也要求下游系統對每個請求執行完整授權，不把 allow／deny 交給 LLM。

## 這條邊界限制影響，不保證模型不犯錯

提案與授權分離，不會消除 Prompt Injection、幻覺或錯誤的工具選擇。這個設計限制的是錯誤能走多遠：模型可以提出錯誤的動作，卻不能替自己補出身分、權限或使用者確認。

應用程式完成授權檢查並取得內容後，這份內容送進下一個 LLM 時仍是不可信輸入。授權只能證明特定身分可以對特定資源執行特定動作，不會把資源內容變成 policy，也不會讓自然語言取得決定下一個動作的權力。
