---
title: 社群發布 API：平台能力不同，流程不能假設相同
description: X、Facebook、Instagram 與 Threads 都能自動發布，但權限、媒體、容器與費用邊界並不相同。
created: 2026-08-01
updated: 2026-08-01
maturity: growing
related:
  - /notes/social-api-token-lifecycle/
  - /posts/2026/2026-07-13-social-platform-apis-2026/
  - /posts/2026/2026-07-20-meta-app-setup-pitfalls/
---

「自動發文」不是單一 API 動作，而是一條平台各自不同的流程。文字能不能直接送、圖片要不要公開 URL、影片由誰託管、容器是否要等待處理、發布權限和內容權限是否分開，平台答案都可能不同。

因此整合層應該保留平台差異：先把共同的內容模型、dry-run、duplicate guard 與狀態回寫做好，再讓每個 publisher 實作自己的能力。把四個平台硬壓成同一個函式，短期看起來簡潔，遇到媒體或權限就會開始藏例外。

判斷平台是否「支援」某功能時，也要問支援的是哪一層：API 能建立 container，不代表能直接上傳本機檔；能發布文字，不代表能替同一則內容附加圖片；能取得 token，不代表 token 擁有發布權限。

這個概念頁只保留穩定的架構判斷。具體價格、額度、版本與申請步驟會變，應以[社群平台 API 現況](/posts/2026/2026-07-13-social-platform-apis-2026/)和[Meta App 踩坑記](/posts/2026/2026-07-20-meta-app-setup-pitfalls/)的查核日期為準。
