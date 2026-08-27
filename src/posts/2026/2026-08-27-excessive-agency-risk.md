---
title: Excessive Agency：Agent 的過度代理風險
date: 2026-08-27
tags:
  - ai-security
  - ai
  - security
description: 以一個固定的惡意寄信提案為起點，拆解過度功能、過度權限與過度自主如何讓模型偏航造成真實副作用，並驗證最小權限、精確核准與批次警示的邊界。
---

> **查核資訊：** 本文於 2026-08-13 查核 OWASP LLM Top 10 2026 與 OWASP Top 10 for Agentic Applications 2026，並引用同日完成的固定合成實驗。OWASP 分類與 Agent 安全建議仍可能更新，實際設計時請重新確認官方資料。

Agent 草擬一封危險郵件，和 Agent 真的把郵件寄出去，是兩件不同的事。

模型偏航是第一個缺口。應用程式若又提供寄信功能、給予過大的下游權限，最後還省略人工核准，
同一段錯誤輸出才會一路變成真實副作用。這正是 Excessive Agency（過度代理）要處理的問題。

我一開始的想法是：只保留讀取來信與草擬回覆。

接著加入下游權限與實際寄送需求兩個反例後，我把判斷補完整：

> Agent 只負責讀信與草擬；後端依登入者身分限制資料範圍，並給 Agent 獨立的最小權限。寄信前由使用者檢閱實際送出的內容。系統可批次核准低風險草稿，但異常信件必須分離並單獨確認；關鍵字偵測只負責輔助標註與警報。

這段判斷不期待模型永遠拒絕惡意指令，而是假設模型終究會失守，再限制錯誤提案能走多遠。

## 三種「過度」要分開處理

[OWASP LLM03:2026](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM03_ExcessiveAgency.md)
把 Excessive Agency 的根因分成三類：

| 根因 | 郵件 Agent 的例子 | 對應控制 |
|---|---|---|
| 過度功能（excessive functionality） | 摘要工具同時提供寄信、刪信與退款 | 只提供工作需要的功能 |
| 過度權限（excessive permissions） | 讀信工具使用能存取全公司的共用管理員帳號 | 後端依登入者身分授權，Agent 使用獨立最小權限 |
| 過度自主（excessive autonomy） | Agent 不經確認就寄信、刪資料或付款 | 高影響動作綁定人工核准與確定性政策 |

三道防線處理的問題不同。移除 `send_mail`，代表 Agent 根本沒有寄信功能；保留功能但移除下游寄信
權限，代表 Agent 即使提出寄信要求也無法執行；兩者都保留時，人工核准才負責判斷這一次寄信是否
符合使用者意圖。

只做其中一道，不代表另外兩道可以消失。第三方工具可能把讀、寫、刪除包在一起；Agent 也可能拿到
服務帳號原本就有的廣泛權限。介面上看起來只有「整理信箱」，不等於下游系統真的只允許讀取。

## 實驗不再問模型會不會中招

前面的注入實驗已經說明模型輸出不能當成安全邊界。這次我直接把一個惡意寄信提案視為既定輸入，
固定收件者、主旨、正文、附件、動作與資源，再依序檢查五個階段：

```text
不可信的 Agent 提案
  → 功能是否存在
  → 登入者與 Agent 身分是否具有下游權限
  → 關鍵字規則是否標註風險
  → 使用者是否核准完全相同的動作內容
  → 記憶體內的合成副作用是否發生
```

正式實驗設計了 7 組測試情境，共產生 9 個待執行的動作提案。其中 6 組情境各有 1 個提案，批次核准
情境則一次包含 3 個提案。所有郵件地址都在 `.test` 網域，附件與身分都是假資料，副作用只寫入
記憶體內的 ledger。實驗沒有呼叫模型、沒有網路連線，也沒有接上真實信箱、付款系統或外部 API。

固定程式、fixture、事前預測與淨化結果都收錄在公開的
[Day 18 evidence checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-18-excessive-agency/evidence/day-18)。

## 同一個惡意提案，結果由控制面決定

7 組測試情境全都符合事前預測。9 個動作提案中，5 個寫入記憶體內的合成 ledger，4 個被阻擋：

| 案例 | 結果 | 原因 |
|---|---|---|
| 功能、權限與自主性都過大 | 執行 | Agent 自動執行寄信，關鍵字警示沒有阻擋權 |
| 移除寄信功能 | 阻擋 | `send_mail` 不在可用功能內 |
| 使用獨立唯讀權限 | 阻擋 | Agent 身分沒有下游寄信權限 |
| 核准完全相同的寄信內容 | 執行 | 實際動作與人工檢閱的 envelope 相同 |
| 核准後修改正文 | 阻擋 | envelope SHA-256 改變，原核准失效 |
| 三封信批次核准，其中一封命中警示 | 兩封執行、一封阻擋 | 警示信件退出批次，必須單獨檢閱 |
| 用未列入規則的同義詞改寫 | 執行 | literal keyword 沒有命中 |

前三個案例使用完全相同的惡意 action envelope，SHA-256 都是
`84bc2863bfbc15bb1623bc0852add7619ba47354aeb36b0c9c7d621c9208d1ef`。在功能、權限與自主性都過大的
配置下，提案會執行；移除功能或移除權限，都能各自阻擋同一個提案。差異不在模型突然變乖，而是
控制面不再讓模型具備完成動作的條件。

## 人工確認必須綁定真正要執行的內容

「寄出前問一下」仍然太模糊。使用者應該看到收件者、主旨、正文、附件與動作類型，系統再把核准
綁定到同一份不可變的 action envelope。只要其中一個欄位在核准後改變，舊核准就應失效。

本次實驗用 canonical JSON 計算 envelope SHA-256。安全草稿經過檢閱後可以寄出；另一個案例只在
核准後改寫正文，hash 隨即不同，執行階段因 `approval_missing_or_stale` 而停止。Hash 在這裡用來
驗證實驗中的內容綁定概念，不是可以直接搬去正式環境的簽章或身分驗證方案。

批次核准不必一律禁止。使用者可以一次檢閱多封低風險信件，但每一封仍要有自己的 action
envelope。命中風險訊號、收件者異常或影響較高的信件，應離開批次路徑，改成單獨確認。否則一封
惡意草稿只要混在九封正常草稿中，就很容易利用審閱疲勞過關。

## 關鍵字警示不是第四種授權

我原本提出「搜尋危險關鍵字並做標註及警報」，這道防線有價值，但只能當輔助訊號。

實驗中的規則能抓到 `salary` 與 `password`。批次案例命中 `password` 後，該封信被分離並要求單獨
檢閱；可是另一封信把 `salary` 改寫成未列入規則的 `compensation`，規則就沒有標註，郵件仍依
批次核准進入合成 ledger。

攻擊者還可以用錯字、編碼、分句、圖片或其他語言繞過字面比對。關鍵字規則適合提高審閱優先順序、
產生 audit event 或觸發警報，不適合回答「這個人能不能寄這封信」。授權仍要由後端根據可信的
使用者身分、Agent 身分、動作、資源與政策，逐次進行完整的授權檢查；關鍵字是否命中，不能擴張
原本沒有的權限。

![惡意寄信提案要越過功能、權限與人工核准三道防線才會產生合成副作用，任一道防線都能獨立阻擋；關鍵字警示只提供標註與警報，不具阻擋權。](/assets/images/excessive-agency-risk-defense-gates.png)

## 把 Agent 當成受限制的執行主體

一個可落地的寄信流程可以採用以下順序：

1. 模型只能提出結構化動作與參數，提案本身不帶授權結論。
2. 後端從已驗證的 session 取得使用者身分，不採信模型聲稱的 user、role 或 `allow`。
3. Agent 使用獨立且權限範圍受限的下游身分，不能沿用共用管理員帳號。
4. 後端逐次驗證 subject、Agent、action 與 resource，並讓不需要的功能從工具介面消失。
5. 風險規則只做標註、排序與警報。
6. 高影響動作要求使用者檢閱完整 envelope；批次中的例外改走單獨核准。
7. 執行前再次驗證 envelope 與核准版本，執行後留下受保護的 audit trail。

![郵件 Agent 授權邊界架構圖：可信的使用者身分、Agent 身分與包含動作、資源、政策的 Agent 提案，由後端逐次進行完整的授權檢查；人工檢閱完整 envelope 也連到授權檢查。關鍵字規則僅以虛線提供標註與警報，不能擴張寄信權限；寄信執行使用 Agent 的獨立最小權限。](/assets/images/excessive-agency-risk-authorization-boundary.png)

OWASP 也要求授權由確定性邏輯完成，不能讓 LLM 自己判斷動作是否獲准；高影響動作則需要
human-in-the-loop。在更完整的 Agent 系統中，Excessive Agency 可能表現為 OWASP Agentic Top 10 的
[Tool Misuse、Identity & Privilege Abuse 與 Cascading Failures](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)。

這次實驗沒有證明人工一定看得出惡意內容，也沒有量測 Prompt Injection 成功率。因此，實驗結果只
支持以下結論：**即使 Agent 已提出危險動作，功能、下游權限與精確核准仍能各自限制副作用；關鍵字
警示則不能取代其中任何一道。**

下一篇會把鏡頭拉近工具介面本身：即使 Agent 有權呼叫某個工具，工具參數、回傳內容與底層 sink
仍可能形成另一條注入路徑。

## 參考資料

- [OWASP LLM03:2026 Excessive Agency](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM03_ExcessiveAgency.md)
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [LLM Application Security Lab — Day 18 evidence checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-18-excessive-agency/evidence/day-18)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10405352)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 18／31 篇**

[上一篇：向量資料庫與 Embedding 的安全議題](https://imfw.io/posts/2026/2026-08-26-vector-database-embedding-security/) · 下一篇：工具呼叫 / Function Calling 的風險

<!-- series-nav:end -->
