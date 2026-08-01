---
title: Agent Skill：把成功做法變成可驗證的工作流
description: 一段 prompt 只有在觸發、資源、權限與驗證都被設計好時，才稱得上可重用的 Agent Skill。
created: 2026-08-01
updated: 2026-08-01
maturity: growing
related:
  - /notes/agent-context-engineering/
  - /posts/2026/2026-07-24-agent-skill-evolution/
  - /posts/2026/2026-07-29-script-gated-skills/
  - /posts/2026/2026-07-31-lottie-maker-agent-skill/
---

把一段成功的 prompt 存成 `SKILL.md`，不會自動得到一個好用的 Agent Skill。可重用的 skill 至少要回答四件事：什麼任務會觸發它、應該讀哪些資源、哪些不可變規則不能交給模型自由發揮，以及完成後用什麼證據驗收。

這也是 prompt 與 workflow 的分界。容易變動的判斷可以留給模型；安全邊界、檔案白名單、格式限制、重試政策與 API 呼叫順序，則應該落在 script 或工具介面。模型負責在路上做判斷，工具負責把懸崖標出來。

一個 skill 也需要能被新 session 重新理解。觸發描述、漸進式 references、失敗時何時停止，以及可重跑的驗證命令，都是 portability 的一部分；只把作者腦中的背景知識藏在對話裡，下一次就會重新猜。

評估 skill 不看它寫得多像規格書，而看另一個 context 能不能用它完成同一類任務，並在錯誤時停在正確的位置。

先讀[Agent 的上下文工程](/notes/agent-context-engineering/)，再看[Agent Skill 不是 Prompt](/posts/2026/2026-07-24-agent-skill-evolution/)與[Script-Gated Skills](/posts/2026/2026-07-29-script-gated-skills/)的實際取捨。
