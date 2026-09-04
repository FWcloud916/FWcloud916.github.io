---
title: 觀測性與稽核：看得見才守得住
date: 2026-09-05
tags:
  - ai-security
  - ai
  - security
description: 用 OpenTelemetry 比較保存原文與只保留允許欄位的 trace，再以六筆 HMAC 串接事件測試修改、刪除、交換、插入與尾端截斷，釐清觀測資料與稽核證據的責任邊界。
---

> **查核資訊：** 本文於 2026-08-25 查核 OpenTelemetry 官方規格與敏感資料指引、OWASP Logging Cheat Sheet、RFC 2104，並引用同日完成的離線 OpenTelemetry 與 HMAC 稽核鏈實驗。OpenTelemetry SDK、語意慣例、Collector 處理器與 log 管理要求仍可能改變；正式系統套用前，請重新確認實際版本、資料政策與法規義務。

安全事件沒有紀錄，團隊就無法回答哪一條政策放行了模型 request、哪個元件遮掉 PII，或模型回覆為什麼沒有進入後續動作。不過，把完整 prompt、模型回覆與使用者資料全部寫進 log，只是把原本的一份敏感資料複製到另一套權限、保存期限與匯出路徑都不同的系統。

觀測性需要足夠的關聯資訊，稽核需要可追查的安全決策。兩者都不需要預設保存原文。

Day 27 使用 OpenTelemetry SDK 在記憶體中建立兩條 trace。第一條刻意把測試輸入與輸出寫入 span 的屬性欄位（span attributes）；第二條只記錄允許清單列出的資料，包括 request ID、政策版本、事件名稱、內容雜湊、決策、原因代碼、PII 數量與結果狀態。安全 trace 再產生六筆 HMAC 串接事件，用來測試修改、刪除、交換、插入與尾端截斷。

## Trace 與稽核事件回答不同問題

[OpenTelemetry Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)使用 trace 記錄一筆 request 經過系統的完整路徑，並把路徑中的每個處理步驟記為一個 span。每個 span 可以記錄名稱、父子關係、起訖時間、屬性、事件與狀態；多個 span 會依父子關係組成一條完整的 trace。

Trace 適合回答一次 request 經過哪些元件、哪一段失敗，以及各階段花了多少時間。稽核事件則用來追查安全決策：哪個經過身分驗證的使用者或服務提出或核准動作、當時使用哪個政策版本、系統做出什麼判定，以及最後是否真的執行外部動作。

| 資料 | 主要問題 | 本文建議保存的內容 | 不應預設保存的內容 |
|---|---|---|---|
| Trace span | Request 經過哪些階段？ | trace ID、span ID、操作名稱、狀態、原因代碼、必要計數 | 完整 prompt、模型回覆、token、憑證與 PII |
| 稽核事件 | 哪個安全決策在何時成立？ | request ID、可信主體、動作、資源、政策版本、決策與結果 | 模型自稱的身分、未遮罩原文與不必要的推理內容 |
| 安全告警 | 哪個條件需要處理？ | 規則 ID、嚴重度、聚合計數、關聯 ID | 為了方便調查而無限制複製原始內容 |

同一筆 request 可以同時產生 trace 與稽核事件，但兩種資料不應共用同一份「什麼都記」的資料格式（schema）。Trace 可以依容量與延遲需求只保留部分紀錄；付款、發布、刪除、權限變更與政策拒絕等必要稽核事件，則應依組織要求完整保留。系統不能因為只保留部分 trace，就隨機遺失重要的安全決策。

## OpenTelemetry 不會替應用程式判斷敏感資料

[OpenTelemetry 的敏感資料指引](https://opentelemetry.io/docs/security/handling-sensitive-data/)明確指出，OpenTelemetry 可以收集系統執行狀態的遙測資料（telemetry），但無法自行判斷特定系統中的敏感資料。實作者必須負責資料最小化、法規要求、使用者同意與保護措施，也要檢查用來加入追蹤紀錄的函式庫（instrumentation library）實際產生哪些屬性欄位。

官方指引建議只收集具有觀測用途的資料，並優先避免收集個資。OpenTelemetry Collector 是集中接收與處理遙測資料的元件，可以用 attribute processor 刪除或修改特定屬性、用 filter processor 移除整筆資料、用 redaction processor 只保留允許的屬性，或用 transform processor 改寫內容。這些處理器適合作為第二道防線，不能取代應用程式在資料產生位置執行的允許清單。

應用程式只要把原文寫入 span 的屬性欄位，原文就可能先經過應用程式記憶體、待傳送的暫存區、匯出元件、Collector 與傳輸路徑，最後才由 Collector 刪除。因此，應用程式應在建立 span 時就不要寫入不必要的原文。

## 實驗固定一筆 request 與兩條 trace

這次實驗只使用一筆虛構 request。測試輸入與測試輸出都包含同一個客戶編號與 `.test` 信箱；實驗事先把這兩個值登記為敏感資料標記（marker）。這些標記只用來計算原文是否進入 span 的屬性欄位，不代表正式系統的 PII 分類方式。

兩種設定都使用 OpenTelemetry SDK 1.44.0 建立 7 個 span：一個代表整筆 request 的根 span，加上六個安全處理階段。實驗使用 `InMemorySpanExporter`，只把結果留在記憶體中；沒有啟動 Collector，也沒有向網路傳送遙測資料。

| 設定 | 屬性欄位政策 |
|---|---|
| 原文設定（Unsafe attributes） | 根 span 保存完整測試輸入；output review span 保存完整測試輸出 |
| 允許清單設定（Safe attributes） | 只允許 request ID、政策版本、事件名稱、內容 SHA-256、決策、原因代碼、PII 數量與結果狀態 |

允許清單設定另外檢查三項條件：所有屬性名稱都在允許清單中、每個 span 都有 request ID／政策版本／事件名稱，以及 7 個 span 都使用同一個 trace ID。這三項只驗證欄位與關聯，不驗證事件內容是否真實。

## Trace 結果：原文設定命中四次，允許清單設定為零

完整實驗程式、測試資料雜湊、原始結果雜湊，以及排除敏感內容後的統計，都已固定在 [Day 27 不可變更的證據版本](https://github.com/FWcloud916/llm-app-security-lab/tree/day-27-observability-audit/evidence/day-27)。正式結果如下：

| 設定 | Span 數 | 標記命中 | 含標記的 span 數 | 允許清單違規 | 缺少必要屬性 | 使用同一個 trace ID |
|---|---:|---:|---:|---:|---:|---:|
| 原文設定（Unsafe attributes） | 7 | 4 | 2 | 不適用 | 不適用 | 不列入判定 |
| 允許清單設定（Safe attributes） | 7 | 0 | 0 | 0 | 0 | 是 |

原文設定把測試輸入寫入根 span，也把測試輸出寫入輸出檢查 span（output review span）。每段文字各含兩個標記，因此共有 4 次標記命中，分布在 2 個 span。

允許清單設定沒有出現兩個測試標記，允許清單違規與必要屬性缺漏都是 0，7 個 span 也共用同一個 trace ID。這表示固定的允許清單在這筆 request 中保留了實驗要求的關聯資料，並未保存事先登記的兩個原文值。

標記命中 0 次，不代表 trace 完全沒有敏感資訊。Request ID、資源識別資訊、內容雜湊、時間與事件順序仍可能與其他資料互相比對，進而連結到特定使用者或業務行為。正式系統仍要對遙測資料的儲存、查詢、匯出與保存期限套用資料分類與存取政策。

## 六筆稽核事件只保存安全決策資料

允許清單設定的 trace 在六個處理階段各產生一筆稽核事件，共六筆：

1. `request_received`：request 已進入應用程式。
2. `authorization_decided`：資源政策回傳 allow 與原因代碼。
3. `pii_detected`：偵測到兩個項目，處理方式為 replace。
4. `model_request_prepared`：送入模型的資料已完成準備。
5. `output_reviewed`：輸出檢查決定替換 PII。
6. `request_completed`：流程以 masked 狀態結束。

每筆事件保存順序編號（sequence）、時間、trace ID、request ID、政策版本、事件名稱、允許清單中的屬性，以及上一筆事件的 HMAC。內容雜湊可用來核對不同事件所指的內容是否一致；它不會保存測試原文，也不能取代原文的安全儲存與授權。

## HMAC 串接可以偵測修改，但不會讓儲存自動變成不可刪除

[RFC 2104](https://www.rfc-editor.org/info/rfc2104/)定義 HMAC。HMAC 使用秘密金鑰與雜湊函式，為每筆事件計算訊息驗證碼。驗證端會用相同金鑰重新計算；如果事件遭到修改，卻沒有重新產生有效的 HMAC，比對就會失敗。只有持有金鑰的一方才能產生新的有效 HMAC。

Day 27 先把每筆稽核事件轉成欄位順序固定的標準化 JSON（canonical JSON），讓內容相同的事件每次都產生相同的位元組序列，再用以下方式計算 HMAC：

```text
record_hmac[n] = HMAC-SHA-256(
  key,
  sequence + event + attributes + previous_hmac
)
```

第一筆事件的 `previous_hmac` 使用固定零值；從第二筆開始，每筆事件都在 `previous_hmac` 中保存上一筆的 `record_hmac`，形成前後串接。修改中間事件會讓該筆 HMAC 比對失敗；刪除或交換事件會破壞事件序號或前後連結；未持有金鑰的人也無法替插入的事件產生有效 HMAC。

實驗程式最後另建立一筆終點檢查點（terminal checkpoint），保存事件總數與最後一筆 HMAC，再用同一把金鑰計算檢查點的 HMAC。驗證端必須從稽核紀錄以外的獨立位置取得預期檢查點，才能判斷目前看到的是完整事件鏈，而不是一條較短但內部仍一致的事件鏈。

## 五種已登記的竄改全部被偵測，尾端截斷顯示檢查點的邊界

正式實驗對同一條六事件鏈執行下列比較：

| 測試 | 驗證結果 | 原因 |
|---|---|---|
| 原始六事件鏈 | 通過 | 每筆 HMAC、事件序號、前後連結與檢查點都一致 |
| 修改第二筆事件 | 偵測 | 該筆 HMAC 不一致 |
| 刪除中間事件 | 偵測 | 事件序號或前一筆 HMAC 不一致 |
| 交換兩筆事件 | 偵測 | 事件序號不一致 |
| 插入偽造事件 | 偵測 | 事件序號或該筆 HMAC 不一致 |
| 刪除尾端並提供檢查點 | 偵測 | 事件總數與最後一筆 HMAC 不符合檢查點 |
| 刪除尾端但不提供檢查點 | 通過 | 剩餘事件仍形成一條內部一致的事件鏈 |

實驗事前登記五種竄改，並在驗證時提供檢查點；五種竄改全數被偵測，結果是 5／5。另一項尾端截斷測試刻意不提供檢查點，驗證器因此接受剩餘的五筆事件。HMAC 鏈可以證明目前看到的事件彼此一致，但驗證端仍需要檢查點才能判斷事件集合是否完整。

檢查點若與稽核紀錄存放在同一個可修改的資料庫，攻擊者可能同時刪除兩者。正式系統應定期把終點檢查點送到權限不同的儲存空間，或只能新增、不能覆寫既有資料的位置。產生檢查點的頻率，會決定尾端最多可能累積多少筆尚未由外部紀錄確認的事件。

## HMAC 也不能證明事件原本就是真的

HMAC 可以驗證事件內容在產生驗證碼後是否遭到修改，但無法判斷 `decision=allow` 是否符合當時的實際政策，也無法發現追蹤程式漏記了一次工具呼叫。應用程式若一開始就寫入錯誤事件，正確計算的 HMAC 只會保護這份錯誤內容。

金鑰管理也需要獨立處理。Day 27 在執行期間隨機產生一把 32 位元組的測試金鑰；正式結果與公開檢查點都不保存這把金鑰。正式環境要處理金鑰的產生、存放、存取、輪替、版本、復原與撤銷；驗證端也要知道每段事件鏈應使用哪個金鑰版本。

若所有服務共用同一把 HMAC 金鑰，任何一個服務遭入侵後，都可能替其他服務偽造事件。每個服務使用不同金鑰可以縮小影響範圍，但會增加跨服務驗證與金鑰輪替的管理成本。HMAC 也不適合讓第三方公開驗證，因為驗證者取得金鑰後也會取得偽造能力；這類需求應評估數位簽章與外部透明紀錄。

## Log 內容、完整性與存取權限要分開設計

[OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)建議系統紀錄不要直接包含 session ID、access token、密碼、資料庫連線字串、加密金鑰、付款資料與其他高敏感資料，也要求紀錄在傳輸與儲存期間受到保護，避免未經授權的存取、修改與刪除。OWASP 也建議建立竄改偵測機制，並監控所有紀錄存取行為。

這些要求至少形成三道獨立控制：

1. **內容控制：** 應用程式預設只建立允許清單中的屬性；確實需要保存原文時，必須改走權限更嚴格的例外流程。
2. **完整性控制：** 事件序號、HMAC 與外部檢查點，可以協助發現內容修改、事件刪除與順序變更。
3. **存取與保存控制：** 只有指定角色可以查詢或匯出紀錄；系統必須記錄所有存取行為，並在保存期限到期後確實刪除資料。

靜態資料加密（encryption at rest）只能降低儲存媒體或備份遭到未授權讀取的風險。具有查詢權限的帳號仍可在系統解密後看見完整內容；加密也無法自動偵測應用程式使用合法憑證刪除事件。內容最小化、完整性、授權與保存期限各自處理不同風險，不能互相取代。

## 正式系統可以從固定事件契約開始

Day 27 的六事件流程可以縮成一份通用事件契約。正式系統至少要固定以下資料：

- `event_name`：使用已納入版本控制且數量有限的固定事件名稱，不把使用者內容放進名稱。
- `trace_id`、`request_id`：關聯同一條流程，並設定不可由模型自行指定的格式。
- `actor`：由應用程式的身分驗證與授權系統提供使用者、服務或 Agent 身分，不能採用模型文字中自行宣稱的身分。
- `action`、`resource`：記錄標準化後的操作與資源識別資訊，避免保存完整資源內容。
- `policy_version`、`decision`、`reason_code`：讓團隊重建當時使用的規則與判定原因。
- `approval_id`：高影響動作必須關聯到使用者的核准紀錄；該紀錄要包含使用者實際檢閱的動作、目標資源與參數。
- `content_digest`：只在需要核對內容是否一致時保存。若原文容易猜測，攻擊者可能事先計算候選內容的雜湊並進行比對，因此仍要評估字典攻擊（dictionary attack）與跨資料集連結風險。
- `result_status`：分清楚提案、阻擋、已執行、執行失敗與已補償，不能把模型提案記成外部副作用。

事件契約也要限制每個欄位的長度，並明確處理換行與分隔符號，避免攻擊者用超長內容耗盡遙測資料容量，或插入看似另一筆紀錄的內容。屬性值的種類過多也會增加儲存與查詢成本；計數、分類代碼與固定識別資訊通常比完整文字更適合作為預設值。

## 觀測資料必須真的接到偵測與處理流程

只產生 trace 與稽核紀錄不會自動改善安全性。團隊要先定義哪些事件需要告警，例如同一個使用者持續觸發 PII 遮罩、模型反覆要求存取未授權資源、特定動作的使用者確認頻繁失效、工具輸出多次遭輸出安全檢查阻擋，或稽核檢查點驗證失敗。

告警還要連到明確的處理流程。團隊必須指定由誰負責處理、多久內回應、處理人員可以暫停哪些功能、需要保存哪些額外證據，以及何時通知資料與系統負責人。若系統只把事件送進儀表板，卻沒有指定人員判讀與處理，觀測性只會增加成本與敏感資料副本。

Day 27 沒有測試 Collector、安全資訊與事件管理系統（SIEM）、告警規則與事故處理，因此沒有驗證完整的營運流程。正式系統也要測試遙測資料儲存系統中斷、暫存區滿載、跨服務事件順序改變、時鐘偏移、金鑰輪替，以及檢查點寫入失敗時的處理方式。

## 實驗限制

這次實驗只有一筆英文虛構 request、兩個敏感資料標記、兩條保存在記憶體中的 trace、每條 7 個 span、六筆稽核事件，以及一把只在執行期間使用的測試金鑰。實驗沒有啟動 Collector、網路匯出、遙測資料儲存系統、SIEM、資料庫或外部檢查點服務。

5／5 只表示本次驗證器偵測到事先登記的修改、刪除、交換、插入，以及提供檢查點的尾端截斷。實驗沒有測試並行事件、跨主機排序、事件重送、重複事件序號、時鐘回撥、金鑰洩漏、演算法遭到替換、授權管理員刪除紀錄，或儲存系統遭到入侵。

允許清單設定的 trace 沒有命中敏感資料標記，但這項結果只涵蓋事先登記的客戶編號與 `.test` 信箱。實驗沒有檢查姓名、地址、自由文字推論、trace ID 能否連結到特定對象，或第三方追蹤函式庫自動加入的其他屬性。

實驗只使用版本控制中的虛構資料，HMAC 金鑰只存在記憶體中。模型呼叫、網路呼叫與外部副作用都是 0。原始結果保留在 Lab 中不納入 Git 的目錄；公開的證據版本只包含程式版本、測試資料雜湊、統計與實驗限制。

## 觀測紀錄只保存必要資料

Day 27 的原文設定在 2 個 span 中記下 4 次敏感資料標記；允許清單設定保留 7 個 span 的關聯與安全決策資料，標記命中、允許清單違規與必要欄位缺漏都是 0。結果顯示 trace 可以保存流程的關聯與決策資訊，不必預設複製完整輸入與輸出。

六筆 HMAC 串接事件在提供終點檢查點時，偵測到 5／5 事先登記的竄改；沒有檢查點時，刪除尾端後的五筆事件仍形成一條內部一致的事件鏈。完整性控制不能只替每筆事件加入 HMAC，還要管理金鑰、事件序號、檢查點的獨立保存方式，以及驗證失敗後的處理流程。

下一篇會處理濫用與成本攻擊，實作 request、token、並行數與預算控制。Day 27 的事件契約會提供計數與原因代碼，但速率限制與預算仍必須在模型呼叫前由應用程式執行。

## 參考資料

- [OpenTelemetry Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry — Handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [OpenTelemetry — How to write semantic conventions](https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [RFC 2104 — HMAC: Keyed-Hashing for Message Authentication](https://www.rfc-editor.org/info/rfc2104/)
- [LLM Application Security Lab — Day 27 evidence checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-27-observability-audit/evidence/day-27)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10407722)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 27／31 篇**

[上一篇：敏感資料防護：PII 偵測與遮罩](https://imfw.io/posts/2026/2026-09-04-pii-detection-masking/) · 下一篇：濫用與成本攻擊：DoS、Token 榨取與速率限制

<!-- series-nav:end -->
