---
title: Agent 的上下文工程：文件是共享記憶，也是邊界
description: 讓 Agent 做對事情的關鍵，不是把所有內容塞進 prompt，而是把目標、限制與狀態放在可找到的位置。
created: 2026-08-01
updated: 2026-08-01
maturity: growing
related:
  - /notes/agent-skills-as-workflows/
  - /posts/2026/2026-07-22-documentation-for-ai-agents/
  - /posts/2026/2026-07-30-docs-need-ci/
---

Agent 最容易走偏的通常不是語法，而是上下文。它可以讀程式、改檔案、跑測試，卻不會憑空知道專案真正的目標、不能跨過的邊界，以及上一個 session 留下的未完成決策。

上下文工程要處理三種偏移：目標偏移，把「順手可以做」誤認成「這次應該做」；架構偏移，局部合理卻跨過模組或權限邊界；狀態偏移，新的 session 重做已完成工作或忘掉 blocker。

解法不是寫一份百科全書，而是分層放置資訊：入口文件負責路由，架構文件負責系統地圖，專題文件負責細節，進度文件負責現在與下一步。每一層都要能指向真正可執行的驗證命令。

文件因此同時是 agent 的輸入、限制與驗收介面。它不保證模型正確，但能讓錯誤更早被看見，讓下一個 context 不必靠鄰近程式碼猜故事。

接著看[Agent Skill 作為工作流](/notes/agent-skills-as-workflows/)，以及文件如何透過行數預算、術語裁決與 Fresh Session Test 進入 CI：[文件也需要 CI](/posts/2026/2026-07-30-docs-need-ci/)。
