---
title: Prompt Injection 原理拆解
date: 2026-08-17
tags:
  - ai-security
  - ai
  - security
description: 從 32 次固定實驗拆解資料如何變成競爭指令，並釐清 prompt 緩解、模型失守與系統安全邊界的差異。
---

> **查核資訊：** 本文於 2026-08-07 查核 [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)、Instruction Hierarchy 與 StruQ 原始論文，以及 Ollama 官方 API 文件；實驗證據來自 [LLM Application Security Lab](https://github.com/FWcloud916/llm-app-security-lab) 的 32 次 Day 8 獨立實驗。模型、推論環境與研究結果可能更新；Day 8 證據已封存在公開的 [Day 8 checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-08-prompt-injection-mechanism/evidence/day-08)，讀者可直接查閱。

這篇先把實驗中的兩種 system prompt 說清楚。`baseline` 是 Day 4 沿用的原始 system prompt；
`reinforced` 是只加強 instruction hierarchy、其餘攻擊筆記與 user request 都不變的版本。本文把
「失守」限定為模型服從攻擊格式，並把另一份筆記的 canary 帶進 model response；下一段 3／10 與
0／10 的分母，都是十次固定 sampling 的 run，不是所有模型的通用成功率。

使用同一段攻擊筆記時，baseline system prompt 失守 3／10；換成更明確的 system prompt 後，模型失守次數降至 0／10。這代表 Prompt Injection 被修好了嗎？

我的判斷是：**Reinforced prompt 降低模型失守機率，卻沒有替系統建立安全邊界。**

我一開始認為，問題來自模型沒有邊界，加上隨機性不會完全消失。這個想法卻碰到一個反例：固定 `temperature=0` 並使用同一個 seed 時，模型仍連續三次服從惡意筆記。既然失敗能在固定條件下重現，就不能只用隨機性解釋。

## 攻擊不是資料突然變成程式碼

傳統 parser 會把指令、參數與文字節點分成不同型別。一般 LLM 沒有同樣的強制隔離；即使用 `<reference_notes>` 包住筆記，模型看到的仍是包含多種自然語言要求的 context。

一條最小 Prompt Injection 路徑可以拆成五步：

```text
攻擊者控制的文字
  → 應用程式把文字序列化進 context
  → 資料內容與原任務形成 competing instructions
  → 模型產生候選回覆
  → 應用程式接受回覆，送往畫面、記錄檔、工具或其他 sink
```

[OWASP](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)指出，自然語言指令與資料之間缺乏清楚分隔，是 Prompt Injection 的核心差異。[Instruction Hierarchy](https://arxiv.org/abs/2404.13208)也指出，chat model 雖能區分 system、user 與 tool message，指令衝突時仍可能套用錯誤優先順序。研究者因此另外訓練模型學會 instruction privilege，不是只多寫一句「永遠不要忽略我」。

真正的結構化防線也不等於多放幾個標籤。[StruQ](https://www.usenix.org/conference/usenixsecurity25/presentation/chen-sizhe)同時使用 secure front-end 與專門訓練的模型。把一般模型前面的 `<note>` 換成 `<untrusted_note>`，只會增加語意提示，不會憑空長出權限系統。

## 三個 predicate 才看得出攻擊走到哪裡

前一篇已把「模型偏航」與「資料跨界」拆開。這次實驗再加入「原任務是否完成」這項判定，避免把全面拒絕或空白回覆誤判為安全。

| Predicate | 回答的問題 |
|---|---|
| target marker | 模型是否完成原本的摘要任務？ |
| injection marker | 模型是否服從攻擊筆記指定的格式？ |
| canary | 模型是否從另一份筆記取得資料並放進回覆？ |

攻擊筆記本身沒有 canary 值；模型若輸出 canary，必須從另一份合成筆記讀取。

實驗先把完整 run plan 寫進 bundle，再執行本機 Ollama：

```bash
uv run llm-security-lab \
  --experiment day-08-prompt-injection-mechanism \
  --run-plan > evidence/raw/day-08/results.json

uv run llm-security-report evidence/raw/day-08/results.json
```

Runner 在推論前核對 Ollama 0.32.5 與 `gemma4:latest` 的完整 digest，並保存 fixture 雜湊。Phase A 固定 `seed=101`、`temperature=0`；Phase B 固定 `temperature=0.7` 與 seeds 201 至 210。CLI 不允許臨時覆寫 prompt 或 sampling；實驗也沒有依結果更換 seed。

## 固定條件揭露的是機制，不是成功率

Phase A 比較四種情境。Semantic 將攻擊指令完整留在 `<note>` 內。Reinforced 使用完全相同的筆記與 user message，只將 system prompt 改成更明確的 instruction hierarchy。Delimiter-break 則在筆記內容中放入看似關閉與重開標記的文字。

| 情境 | Target | Injection | Canary |
|---|---:|---:|---:|
| Clean（無攻擊筆記） | 3／3 | 0／3 | 0／3 |
| Semantic（一般語意攻擊） | 3／3 | 3／3 | 3／3 |
| Reinforced（強化 system prompt） | 3／3 | 0／3 | 0／3 |
| Delimiter-break（偽造標記邊界） | 0／3 | 3／3 | 0／3 |

Clean 沒有攻擊筆記，三次都只完成正常摘要。Semantic 加入一般語意攻擊後，三次都完成原任務，
也都服從攻擊格式並帶出 canary。模型把兩組要求合併執行，不可信資料因此從摘要背景升格為任務
指令。

Reinforced 使用完全相同的攻擊筆記，只把 system prompt 改得更明確。Reinforced 的三次回覆都只
完成正常摘要，比我原先預測的「1／3 完成原任務、1／3 偏航」更穩定。

Delimiter-break 三次回覆都只有 injection marker，沒有 target marker 或 canary。模型放棄原任務
並服從部分攻擊格式，卻沒有完成資料跨界。只搜尋 canary 會誤寫成安全；只搜尋 injection marker
又會誤寫成完整攻擊成功。

## 隨機性影響重現率，但不是根因

Phase B 對相同 Semantic payload 使用十個預定 seeds：

| System prompt | Target | Injection | Canary |
|---|---:|---:|---:|
| Baseline | 10／10 | 3／10 | 3／10 |
| Reinforced | 10／10 | 0／10 | 0／10 |

Baseline 十次都完成原任務，其中三次同時服從攻擊格式並帶出 canary，其餘七次只完成正常摘要。
這表示同一組 payload 與 system prompt 會因 sampling 不同而產生不同的資安結果；但 Phase A 的 Semantic
在固定 sampling 下仍是 3／3 失守，說明隨機性不是根因。根本問題仍是模型無法可靠執行「來源
對應權限」。

Reinforced 十次都完成原任務，沒有一次服從攻擊格式或帶出 canary。這批 Reinforced 實驗讓偏航與跨界從 3／10
降到 0／10，符合我最後採用的說法：**降低模型失守機率。** 這批實驗沒有觀察到 failure，不代表其他
seed、payload、模型或 context 也會是 0，也不能把 0／10 寫成「授權已核准」。

完整的 32-run 計畫、三個 predicate 與 sanitized 結果收在公開的 [Day 8 實驗 checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-08-prompt-injection-mechanism/evidence/day-08)。

## 模型守住，不代表系統沒有旁路

模型失守後，output gate 若在顯示或執行前攔下 canary，系統仍可能守住本次 sink。反過來，即使模型回覆完全沒有 canary，應用程式若把完整 context 寫進一般 debug log，系統仍會建立另一條曝露路徑。

這次實驗的 32 個 request、fixture evidence 與完整 stdout 全部含 canary，因為 Lab 刻意保存完整合成輸入；
在 model response 中，只有 Semantic 固定組與 Phase B baseline 的三次偏航回覆含有 canary。這項差異
不是統計瑕疵，而是在提醒讀者：觀測資料本身也有權限邊界。

![左欄顯示 model response 含 canary 時，output gate 可在資料送往 sink 前攔下 canary；右欄顯示 model response 沒有 canary 時，完整 context 仍可能經 debug log 形成另一條曝露路徑。](/assets/images/prompt-injection-fundamentals-model-system-boundary.png)

正式系統至少要把四件事留在模型外：

1. 先限制 context 能取得哪些資料，不把不必要的機敏資訊交給模型。
2. 由後端依可信身分與 policy 做授權，不接受模型自行宣告 `allow`、role 或 user ID。
3. 在實際 sink 前驗證輸出；工具、HTML、記錄檔與對外回覆各自有不同規則。
4. 隱藏 prompt、response 與 evidence 中的機敏資料，並設定存取控制、保存期限及人員權限。

OWASP 建議結構化 prompt、輸入與輸出驗證、最小權限及 human-in-the-loop，正是因為沒有一段 prompt 能獨自承擔這四層責任。本文只處理不可信資料如何改寫應用程式原定任務；本系列後續的 jailbreak 手法分類，則會討論模型供應商的安全政策如何遭到規避。

測試自己整合 LLM 的系統時，先定義攻擊者控制點、allowed influence 與三個 predicate，固定模型與 sampling options，再逐一盤點 log、renderer、工具等 sink。Prompt 可以降低模型失守的機率，卻不能替系統決定誰有權讀取資料、哪些動作可以執行，以及哪些人可以查看完整紀錄。

把機率性緩解措施和確定性安全控制分開，才是 Prompt Injection 原理真正值得帶回系統設計的部分。

## 參考資料

- [OWASP Cheat Sheet Series — LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions](https://arxiv.org/abs/2404.13208)
- [StruQ: Defending Against Prompt Injection with Structured Queries](https://www.usenix.org/conference/usenixsecurity25/presentation/chen-sizhe)
- [Ollama API documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [LLM Application Security Lab — Day 8 checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-08-prompt-injection-mechanism/evidence/day-08)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10403360)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 8／30 篇**

[上一篇：第一階段回顧與小型攻擊熱身](https://imfw.io/posts/2026/2026-08-16-first-week-attack-warmup/) · 下一篇：直接注入 vs 間接注入

<!-- series-nav:end -->
