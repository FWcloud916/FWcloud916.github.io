---
title: 模型只能提案，不能替自己授權：信任邊界與資料的影響範圍
date: 2026-08-15
tags:
  - ai-security
  - ai
  - security
description: 從刻意脆弱的 LLM 摘要器逐層追蹤資料，拆開身分、授權、內容與輸出用途，建立一份能判斷輸入可以影響什麼的 trust／taint worksheet。
---

> **查核資訊：** 本文於 2026-08-06 依 OWASP Authorization、Business Logic Security、OAuth 2.0、LLM Prompt Injection Prevention 與 Logging Cheat Sheets，以及 LLM Application Security Lab 的 Day 4 固定 commit `8be976a913335951271d99515489a194472f3785` 與 Day 6 checkpoint tag `day-06-authority-boundary` 查核。本文對 Day 4 baseline 的描述來自固定程式與既有實驗；Day 6 只驗證合成的 deterministic authority prototype，production session／token 驗證、資源內容處理與告警仍未完成。

如果 LLM 回傳一份語法完全正確的 JSON，裡面寫著 `"user_id": "admin"` 與 `"allow": true`，應用程式能相信什麼？

簡單來說：JSON parser 只能證明格式正確，不能證明模型真的代表 admin，更不能證明存取應該被允許。模型輸出到了權限層，就是權限層收到的一份外部輸入。

我先做兩個假設：

1. 輸入資料進入每一層時，都應視為不可信。
2. 權限必須由應用程式控管。

方向沒有錯，但「不可信」如果只剩一個紅色標籤，工程上仍然不知道下一步該做什麼。這篇要把標籤拆開：誰產生資料、誰能修改資料、資料可以影響哪個決定，以及資料接下來會進入哪個 sink，也就是哪個會使用資料並產生效果的位置。

## 信任邊界不只存在於網路兩端

前篇把 Day 4 摘要器拆成 CLI、`scenario.json`、synthetic fixtures、Python lab runner、Ollama／LLM 與 stdout。所有元件都在同一台電腦，Ollama 也只接受 loopback 連線，但資料的信任假設仍然一路改變。

CLI 參數進入 Python 時，Python 只能接受已知 scenario name，不能把任意字串當成檔案路徑。Fixture content 進入 prompt builder 時，內容可以成為摘要材料，不能取得修改 system message 的權威。Model response 回到 Python 時，回覆可以成為候選答案，不能直接成為授權結果、filesystem path 或可執行命令。

因此，trust boundary 不等於「資料有沒有跨主機」。只要資料進入下一個元件，而該元件對資料來源、完整性或權威的假設不同，資料就跨過一道需要重新檢查的邊界。

## 一項檢查合格，不會變成全面可信

Day 4 的 `scenario.json` 通過 JSON parsing，只能證明結構可以解析。路徑仍要限制在實驗目錄內，model digest 仍要符合固定情境，fixture content 仍不能被當成指令。

同樣地，權限層核准使用者讀取 `note-123`，只代表特定 subject 可以對特定 canonical resource 執行 `read`。權限層核准讀取後，筆記內容仍然可能包含 Prompt Injection；授權不會把筆記升格成 policy、identity 或下一個動作。

這裡需要兩道分開的 gate：

```text
Authorization gate
subject 能否對 resource 執行 action？

Interpretation / sink gate
取得的內容可以影響什麼？進入下一個 sink 前要驗證什麼？
```

[OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) 要求系統預設拒絕，並針對每次請求（request），檢查目前身分是否有權對特定物件（object）執行指定操作（operation）。 [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) 則分別檢查外部內容、模型輸出與模型提出的動作（proposed action）；模型 guardrail 不能取代確定性驗證與最小權限原則。

兩份文件回答不同問題。Authorization 決定資料能否跨過資源邊界；Prompt Injection 防禦與 sink validation（資料進入落點前的驗證）則限制資料跨過邊界後能造成的影響。

## System prompt 也沒有免死金牌

System prompt 通常由應用程式控制，完整性可以比使用者輸入高。這不代表 system prompt 是祕密、存取控制或 parser 強制的資料／指令邊界。

Day 4 的 system message 已經把 reference notes 標成不可信資料，attack scenario 的模型仍然服從 `99-injection.md`，再從另一份筆記帶出 canary。實驗只證明該模型、prompt、fixture 與 payload 的行為，但至少足以否定一個過度樂觀的假設：在 system prompt 宣告「以下只是資料」，不會自動讓自然語言失去指令效果。

應用程式可以相信「這份 system prompt 由受控版本產生」，卻不能進一步推論「模型一定遵守」或「寫在裡面的 policy 一定被執行」。完整性、保密性與授權能力是三個不同問題。

## 把 Day 4 的資料逐項標記

「每一層都視為不可信」真正可操作的版本，是替每份資料記錄可以影響什麼（allowed influence），以及不得擁有哪些決定權（forbidden authority）。

| 資料 | 可以影響 | 不能決定 | 使用前檢查 |
|---|---|---|---|
| CLI scenario name | 選擇已知實驗情境 | 任意路徑或跳過驗證 | Exact allowlist |
| `scenario.json` | 固定模型、參數與 fixture 清單 | 未來服務的使用者授權 | Schema、路徑 containment、model digest |
| Synthetic fixture content | 提供待摘要資料 | 任務指令、身分、policy、其他資源 | 保留 provenance，限制 context 與 sink |
| Model read proposal | 提出 allowlisted `action` 與 opaque `resource_id` | `user_id`、tenant、role、policy、`allow` | Schema、canonical resource resolution |
| Session／API token | 驗證後建立 subject 與有限 claims | 超出 audience、scope 或 policy 的權限 | 有效性、audience、scope 與適用 claims |
| Model response | 候選回答 | 工具執行、HTML／SQL／shell input | 依實際 sink 驗證 |
| Evidence／log | 重現與稽核 | 因為由程式產生就視為可公開 | 最小化、分類、遮罩與存取控制 |

不過，只標記哪些資料不可信還不夠。系統仍要明確界定可信運算基礎（trusted computing base），也就是授權判斷可以採用的可信依據。這些依據包括經過驗證的 session／token、由後端可信來源取得的資源識別與歸屬資料，以及受到完整性保護的 policy。每項可信依據都必須有清楚來源，而且只能影響事先限定的決定；最終授權判斷則由受權限控管的函式執行。否則權限層根本沒有可信依據可用。

## 模型只能提案，不能替自己核准

我最後採用的規則是：

> 如果應用程式已經有可信的 session 或是 api token 的話，忽略 user_id 和 allow，只用可信 session 重新判斷
> 如果沒有的話則 直接拒絕整個要求

這個選擇和 [OWASP Business Logic Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html) 的邊界一致：會影響存取權（access）、所有權（ownership）或狀態（state）的值，應由應用程式根據可信的 server-side 資料重新推導；執行動作的使用者身分（acting user identity）應來自 server-side session 或 token，不能接受可編輯欄位自行聲明。

「可信的 API token」仍是簡寫。資源伺服器（resource server）不能只看到 token 就直接放行； [OWASP OAuth 2.0 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html) 要求資源伺服器檢查 token 是否適用於目前的受眾（audience）、資源（resource）與動作（action），並把權限限制在必要的授權範圍（scope）。Token 若已過期、audience 或 scope 錯誤，或無法驗證，就不能建立可供授權判斷使用的已驗證身分（trusted subject）。

這裡先用一個完全獨立的 prototype 驗證最小邊界。實驗不呼叫模型，執行結果也可以重現。
Prototype 所使用的應用程式身分（application identity），是合成 fixture 預先提供的「已驗證結果」。
這個 prototype 並未真的驗證 session／API token 的真偽、audience 或 scope，也沒有讀取任何資源內容。

我在執行前先做四個預測：

1. 有權限的 trusted subject，即使模型夾帶 `allow: false`，仍會被允許。
2. 沒有權限的 trusted subject，即使模型夾帶 `user_id: admin` 與 `allow: true`，仍會被拒絕。
3. 沒有 trusted identity 時，模型聲明的身分與 `allow` 都不能讓要求繼續。
4. 只要模型輸出出現這些 forbidden fields，就留下 `llm_authority_field_ignored` event。

命令固定執行 bundle 內的四個案例，不使用 Ollama，也不挑選案例重跑：

```bash
uv run llm-security-authority \
  --experiment day-06-authority-boundary \
  > evidence/raw/day-06/results.json

uv run llm-security-authority-report evidence/raw/day-06/results.json
```

結果如下：

| 案例 | Trusted identity | 模型夾帶的權限欄位 | 實際決定 | Security event |
|---|---|---|---|---|
| 有權限，模型未夾帶權限欄位 | 有效且有權限 | 無 | `ALLOW` | 無 |
| 有權限，模型偽造拒絕 | 有效且有權限 | `allow: false`、`user_id: admin` | `ALLOW` | `llm_authority_field_ignored` |
| 無權限，模型偽造允許 | 有效但無權限 | `allow: true`、`user_id: admin` | `DENY` | `llm_authority_field_ignored` |
| 缺少可信身分，模型偽造允許 | 缺少 | `allow: true`、`user_id: admin` | `DENY` | `llm_authority_field_ignored` |

「有權限，模型未夾帶權限欄位」與「有權限，模型偽造拒絕」都得到 `ALLOW`，原因不是模型說了
算，而是應用程式持有的可信身分確實有權限。模型偽造拒絕時雖然夾帶 `allow: false` 與假的
`user_id`，應用程式仍忽略這些欄位，依自己的 policy 重新判斷。

「無權限，模型偽造允許」得到 `DENY`，因為可信身分沒有權限；模型聲稱 `allow: true`、把使用者
寫成 `admin`，不能替應用程式補出權限。「缺少可信身分，模型偽造允許」也得到 `DENY`，而且流程
直接停止，正是我原本選擇的 default-deny 邊界。

在三個案例中，模型輸出都夾帶不應由模型決定的權限欄位，系統也都留下
`llm_authority_field_ignored` event。系統忽略這些欄位，可以避免模型影響這次授權判斷；事件紀錄
則能讓監控系統偵測模型輸出是否包含不應由模型決定的權限欄位。

四個案例都符合事前預測：2 個 `ALLOW`、2 個 `DENY`。其中 3 個案例各留下一筆 authority event。

這個結果只證明 prototype 會採用可信的應用程式狀態（trusted application state），並依固定 policy
做 default-deny 判斷。這個結果不能證明真正的 token validator、resource store、第二階段 LLM 或
production alerting 已經安全。

固定的 Day 6 checkpoint 與 sanitized evidence 分別放在 [Lab tag](https://github.com/FWcloud916/llm-app-security-lab/tree/day-06-authority-boundary) 與 [evidence report](https://github.com/FWcloud916/llm-app-security-lab/blob/day-06-authority-boundary/evidence/day-06/README.md)。

![模型只提供 action 與 resource_id 提案。應用程式根據已驗證身分、後端資源資料與 policy 執行授權，忽略 user_id 與 allow，並留下紀錄。授權通過後讀取的內容仍以 untrusted_data 送入第二階段 LLM。](/assets/images/trust-boundaries-untrusted-input-authorization-flow-v3.png)

若要真正接進應用程式，仍需要實作以下 design sketch；Day 4 baseline 目前沒有這段程式：

```python
proposal = parse_model_output(model_output)
allowed = pick(proposal, "action", "resource_id")
forbidden = keys(proposal) - {"action", "resource_id"}

identity = validate_session_or_token(request)
if identity is None:
    audit("missing_trusted_identity", forbidden)
    return generic_deny()

if forbidden:
    audit("llm_authority_field_ignored", forbidden)

resource = resolve_canonical_resource(allowed["resource_id"])
decision = authorize(identity, allowed["action"], resource, policy)
if not decision.allowed:
    return generic_deny()

content = read_authorized_resource(resource)
return answer_llm(untrusted_data=content)
```

模型可以建議 `read note-123`，但不能提供或覆蓋 `user_id`、tenant、role、policy 與 allow／deny。沒有已驗證身分（trusted identity）就停止；即使已有已驗證身分，應用程式仍要針對 canonical resource 重新執行授權檢查。通過檢查後讀取的 content，仍須標記為 `untrusted_data`，再送入第二階段模型。

## 忽略權限欄位，也要留下 security signal

只把 `user_id` 與 `allow` 丟掉，會讓系統失去一個有價值的異常訊號。我的判斷是：

> 要紀錄，最好能設定警告器

Day 6 先定義 `llm_authority_field_ignored` 這種 security event。這筆 event 至少應包含 interaction ID、已驗證身分的替代識別碼（pseudonymous reference）、auth source 與 validation result、出現的 forbidden field names、action、canonical resource reference、policy version、decision、reason code 與 severity。

這類 event 不應寫入 raw session ID、access token、完整 prompt、resource content 或 secret。 [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) 建議記錄輸入驗證、身分驗證與授權失敗，以及可疑的業務行為；同時提醒過量紀錄會增加敏感資料曝露與告警疲勞（alarm fatigue）。

所以系統可以先把單筆事件標成 security warning；當監控發現重複探測、涉及多個 resource 或高風險 action 時，再把相關事件聚合成 alert。真實環境的門檻需要 production baseline 支持，這篇不憑空設定次數。告警聚合、通知路由、保存期限與 incident response，留到觀測性篇實作。

## 一條可以套回真實系統的判斷順序

遇到任何進入 LLM 應用的資料，可以依序問：

1. 誰產生或控制這份資料？來源能否被冒用或竄改？
2. 這份資料在目前 component 只能影響什麼？明確禁止決定什麼？
3. 驗證通過的是格式、身分、授權，還是特定 sink 的安全性？不要把其中一種當成全部。
4. 資料轉換後，資料來源與流轉紀錄（provenance），以及原有的使用限制，是否仍會跟著資料進入下一層？
5. 若資料可能影響超出允許範圍的權限決定，系統會安全地拒絕（fail closed）、留下可用但不含機敏資料的 evidence，還是默默繼續？

資料沒有永久不變的「可信／不可信」標籤。更實用的判斷方式是：**先確認資料會進入哪個元件、用來做什麼，再決定資料可以影響哪些判斷。** 下一篇會用第一週的概念做一次小型攻擊熱身；輸入、輸出與最小權限的正式防禦，仍要等後續篇目用相同 fixture 實作與重測。

## 參考資料

- [OWASP Cheat Sheet Series — Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP Cheat Sheet Series — Business Logic Security](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html)
- [OWASP Cheat Sheet Series — OAuth 2.0 Protocol](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [OWASP Cheat Sheet Series — LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Cheat Sheet Series — Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [LLM Application Security Lab — Day 4 fixed commit](https://github.com/FWcloud916/llm-app-security-lab/tree/8be976a913335951271d99515489a194472f3785)
- [LLM Application Security Lab — Day 6 authority boundary checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-06-authority-boundary)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10403061)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 6／30 篇**

[上一篇：對 LLM 應用做威脅建模](https://imfw.io/posts/2026/2026-08-14-threat-modeling-llm-apps/) · [下一篇：第一階段回顧與小型攻擊熱身](https://imfw.io/posts/2026/2026-08-16-first-week-attack-warmup/)

<!-- series-nav:end -->
