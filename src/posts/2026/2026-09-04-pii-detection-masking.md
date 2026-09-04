---
title: 敏感資料防護：PII 偵測與遮罩
date: 2026-09-04
tags:
  - ai-security
  - ai
  - security
description: 用 24 個測試案例比較原文、應用程式規則、Presidio 內建辨識器與分層組合，釐清 PII 偵測、遮罩、授權與紀錄各自負責的邊界。
---

> **查核資訊：** 本文於 2026-08-25 查核 NIST PII 定義、OWASP LLM02:2026 與 Presidio 官方文件，並引用同日完成的離線固定案例實驗。PII 類型、法規要求、Presidio 支援範圍與模型版本仍可能改變；正式系統套用前，請依實際資料、語言、地區與法規重新驗證。

Day 25 限制 Agent 可以取得哪些資料，也限制獲准操作進入容器後能影響的範圍。資源授權與執行期沙箱仍然無法處理一個常見情況：使用者把個人資料貼進原本允許使用的文字欄位，或模型在回覆已獲授權的查詢時，把不必要的個人資料寫進回覆。

應用程式還需要加入 PII 偵測與遮罩。PII 是 personally identifiable information，中文常譯為可識別個人資訊。遮罩可以減少特定文字路徑中可見的敏感值，但遮罩只會處理偵測器找到的內容，也不能替代資料最小化、資源授權與保存期限。

本文用同一批測試資料比較四條路徑：保留原文、只用應用程式規則、只用 Presidio 內建辨識器，以及把兩者合併。四條路徑都沒有找出全部 16 個預期項目。分層組合找出其中 12 個，仍漏掉 4 個人名。

## PII 不是一張固定的格式清單

[NIST 對 PII 的定義](https://csrc.nist.gov/glossary/term/personally_identifiable_information)包含兩種情況：資料本身可以辨識或追溯個人，或資料與其他可連結資訊合併後可以辨識個人。因此，電話、電子郵件與信用卡號容易被列入規則，但看似普通的客戶編號、日期、地點與職務也可能在特定資料庫中連回同一個人。

NIST 的 PII 定義會直接影響系統設計。偵測器不能只維護一份通用正規表示式清單，因為應用程式自己的識別碼與資料關聯也屬於判斷範圍。偵測器若看到一串數字就全部遮掉，也會破壞日期、版本、筆數與公開活動資訊。

PII 防護至少要回答四個問題：

| 問題 | 負責的控制 | PII 遮罩不能替代的部分 |
|---|---|---|
| 系統是否需要收集這項資料？ | 資料最小化與用途限制 | 遮掉副本，不能撤回已經收集的原文 |
| 目前使用者能否取得這筆資料？ | 身分驗證與資源授權 | 遮罩不是存取控制 |
| 這段文字含有哪些敏感項目？ | 規則、NER 與其他分類器 | 偵測結果會有漏判與誤判 |
| 找到之後要如何處理？ | 移除、替換、遮罩、雜湊或加密政策 | 同一種處理方式不適合所有用途 |

[OWASP LLM02:2026 Sensitive Information Disclosure](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM02_SensitiveInformationDisclosure.md)把揭露面擴大到最終回覆以外的工具參數、推理紀錄、檢索片段、log、telemetry 與 embedding。OWASP LLM02:2026 也要求系統在送入外部服務前縮小內容，並在 log 與 trace 進入觀測平台前先清理。PII 防護不能只在畫面顯示前跑一次正規表示式；系統必須先標出每一條資料路徑。

## Presidio 提供可擴充的偵測與去識別元件

Presidio 最初由 Microsoft 建立，現在是 Data Privacy Stack 組織下的社群治理開源專案。本文使用名稱「Presidio」，不把目前版本稱為 Microsoft 官方產品。

[Presidio Analyzer](https://presidio.dataprivacystack.org/analyzer/)會執行多個辨識器（recognizer），以正規表示式、命名實體辨識（Named Entity Recognition，NER）、上下文、驗證邏輯與其他方法找出文字中的敏感項目。Presidio Analyzer 提供內建辨識器，也允許應用程式加入自訂辨識器。分析結果至少包含項目類型、起始位置、結束位置與分數。

[Presidio 的支援項目文件](https://presidio.dataprivacystack.org/supported_entities/)也顯示不同資料會使用不同方法。例如，信用卡號會結合格式與 checksum（檢查碼）；電子郵件會結合格式、上下文與驗證；人名依賴 NLP；電話辨識器則可以依國家或地區設定。不同項目的偵測方式說明，通用偵測器不會自然理解每個產品的客戶編號，也不會在所有語言與命名方式上得到相同結果。

偵測完成後，[Presidio Anonymizer](https://presidio.dataprivacystack.org/anonymizer/)可以依項目類型套用 replace、redact、hash、mask 或 encrypt 等操作。Day 26 Lab 只使用 replace，把偵測到的文字改成類型標記。實驗選擇 replace 是為了讓結果容易核對，不代表正式系統都應使用同一種替換方式。

Presidio 官方 [FAQ](https://presidio.dataprivacystack.org/faq/)明確說明兩項限制。第一，自動偵測不能保證找出所有敏感資料，系統仍需其他保護。第二，Presidio 是需要依組織需求調整的程式庫或 SDK；Presidio API 也不內建身分驗證與授權。部署端必須自行加入對應的基礎設施控制。

## 實驗先固定資料與判定方式

這次實驗不呼叫 LLM，也不使用真實個資。24 個英文測試案例全部由版控內的虛構資料組成，其中 12 個含預先標記的敏感項目；另外 12 個是不含敏感項目的測試案例（負例），用來檢查偵測器是否誤判並改動正常文字。正例共標記 16 個項目，分布在輸入與輸出兩種資料流。

測試的五種類型如下：

| 類型 | 測試內容 | 偵測方式的預期差異 |
|---|---|---|
| `EMAIL_ADDRESS` | 使用 `.test` 保留網域的測試信箱 | 應用程式規則明確支援這種格式 |
| `PHONE_NUMBER` | `0900-000-026` 形式的台灣手機號碼 | 應用程式規則針對固定測試格式 |
| `CREDIT_CARD` | 通過 Luhn 檢查的測試卡號 | 應用程式規則另加 Luhn 驗證 |
| `CUSTOMER_ID` | `CUST-2601` 形式的客戶編號 | 只有應用程式知道這個識別碼格式 |
| `PERSON` | `Avery Example` 等虛構英文姓名 | 應用程式規則刻意不處理人名 |

12 個負例包含日期、毫秒數、build 編號、資料筆數、時間、單獨出現的 `Avery`，以及不符合客戶編號格式的 `CUST-ABCD`。12 個負例只能提供小範圍檢查，不能代表正式流量的誤判率。

實驗讓同一份文字分別通過四種測試組合（profile）：

1. **Raw：** 不執行偵測與遮罩，作為原文比較組。
2. **Application rules：** 使用應用程式定義的信箱、電話、信用卡與客戶編號規則，不含人名規則。
3. **Presidio built-in：** 使用 Presidio 2.2.364 內建辨識器與 `en_core_web_sm==3.8.0`。
4. **Layered：** 在同一個 Presidio registry 中同時載入內建辨識器與全部應用程式規則。

24 個案例乘以 4 種 profile，共有 96 次路徑評估。輸入與輸出各占 48 次。實驗程式（Runner）在執行前固定 profile、規則、分數門檻、案例文字與預期文字範圍（span），正式執行完成後才計算結果。

## 指標同時檢查漏判與誤判

每個預期項目都有精確的起始與結束位置。偵測結果必須同時符合類型與完整文字範圍，才列為 true positive（TP）。預期項目沒有被找出時列為 false negative（FN）；不在標記中的範圍被判為敏感資料時列為 false positive（FP）。

本文使用兩個常見比例：

```text
precision = TP / (TP + FP)
recall    = TP / (TP + FN)
```

Precision 表示偵測器標出的項目中，有多少確實是預期的敏感項目；recall 表示 16 個事前標記項目中，有多少被偵測器找出。Raw 沒有標出任何項目，所以 `TP + FP` 為 0，precision 沒有可計算的分母。Raw 的 precision 不是 0，也不能因為沒有 FP 就視為安全。

實驗另外直接檢查兩個結果。「未遮罩的預期值」（unmasked expected values）計算遮罩後仍完整出現的預期值；「被改動的負例」（changed negative cases）計算不含預期敏感項目的案例有多少被改動。未遮罩的預期值可以呈現漏判對實際文字的影響；被改動的負例則用來檢查系統是否只追求 recall，卻破壞正常內容。

## 結果：分層組合找出 12／16，仍漏掉四個人名

完整實驗程式、工具版本、測試資料雜湊、原始結果雜湊，以及移除測試原文後的統計，已固定在 [Day 26 immutable evidence checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-26-pii-detection-masking/evidence/day-26)。正式結果如下：

| Profile | TP | FP | FN | Precision | Recall | 未遮罩的預期值 | 被改動的負例 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Raw | 0 | 0 | 16 | 無法計算 | 0 | 16 | 0 |
| Application rules | 12 | 0 | 4 | 1.0000 | 0.7500 | 4 | 0 |
| Presidio built-in | 5 | 0 | 11 | 1.0000 | 0.3125 | 11 | 0 |
| Layered | 12 | 0 | 4 | 1.0000 | 0.7500 | 4 | 0 |

應用程式規則找出所有測試信箱、台灣手機號碼、通過 Luhn 檢查的測試卡號與客戶編號，共 12 個項目。應用程式規則刻意不含 `PERSON` 規則，因此漏掉 4 個人名。結果符合事前預測，也清楚顯示固定格式規則的能力邊界：規則只能處理事前定義的格式。

Presidio 內建路徑找出 5 個項目，包括 2 個信用卡號與 3 個電話號碼。Presidio 內建辨識器沒有找出這批 `.test` 信箱、產品專用客戶編號與四個虛構人名。這組數字只適用於鎖定版本、英文 NLP 模型與 24 個案例，不能視為 Presidio 的整體效能評估。

Layered 路徑把應用程式規則加入 Presidio 的辨識器清單（registry）後，找回所有固定格式項目，recall 從內建路徑的 0.3125 提高到 0.7500。不過，Layered 路徑仍然漏掉四個人名，所以最後與 Application rules 同為 12 個 TP、4 個 FN。在這批案例中，分層組合沒有超過單獨的應用程式規則。

四種路徑都沒有改動 12 個負例。Application rules、Presidio built-in 與 Layered 的 precision 都是 1.0，但 precision 1.0 只表示固定負例沒有產生 FP。正式流量會包含更多語言、格式、姓名、編碼、錯字與上下文，不能把 12 個負例的 0 FP 外推成正式環境的 precision。

## 為什麼加入內建 NER 仍然漏掉人名

人名沒有信用卡 checksum，也沒有客戶編號字首。NER 需要從語言與上下文判斷一段文字是不是人名，同一個字也可能是產品、地點、代號或普通名詞。實驗使用 `Example` 作為虛構姓氏，也讓案例與一般英文語料中的姓名分布不同。

實驗結果不支持「NER 沒有用」，也不支持「再加一條姓名正規表示式即可」。較精確的結論是：目前鎖定的 Presidio 與 spaCy 組合沒有在這四個案例中找出 `PERSON`，而應用程式規則原本就沒有負責人名。正式系統若需要處理台灣姓名、地址或公司內部識別碼，團隊必須建立符合自己資料分布的標記案例，調整 recognizer、語言模型、上下文與分數門檻，再重新測量 TP、FP 與 FN。

只看總 recall 也不夠。漏掉一個姓名、誤遮一個公開活動日期，以及漏掉一張完整信用卡號的風險不同。正式評估應依資料類型、用途與影響分開設定門檻，不能把所有 span 加總後只留一個平均數。

## 輸入與輸出都要處理，但責任不同

輸入端的遮罩要放在文字離開可信資料區域之前。系統應先完成使用者與資源授權，再依任務挑選最少資料，最後才把需要的文字送進模型。若先把完整客戶紀錄交給模型，再遮掉最終回覆，原文仍可能已經進入 prompt、供應商紀錄、cache 或 trace。

輸出端要處理模型重述、拼接或推導出的敏感內容。輸出偵測可以在回覆交給畫面、檔案、訊息平台或其他工具前再檢查一次，但輸出偵測不能撤回已經傳給模型的輸入。Day 23 的輸出授權與安全渲染仍要保留；PII 偵測與遮罩只處理敏感內容，不決定模型回覆能否觸發後續動作。

可以把流程寫成兩條直線：

```text
輸入：身分與資源授權 → 最少資料選取 → PII 偵測／處理 → 模型 request
輸出：模型回覆 → schema 與內容檢查 → PII 偵測／處理 → 已授權的顯示或動作
```

還有第三條容易遺漏的路徑：應用程式自己的 log、trace、錯誤回報與稽核事件。偵測器本身若把原文、完整 span 或替換前後內容寫入一般 log，防護元件反而會多建立一份敏感資料副本。Day 27 會專門處理觀測性與稽核，說明稽核需要保存哪些事件資料，以及哪些內容不該進入遙測系統。

## 替換、遮罩、雜湊與加密不是同一件事

偵測到敏感項目後，處理方式要配合後續用途：

| 操作 | 適合的目的 | 主要限制 |
|---|---|---|
| Replace | 只保留項目類型，例如 `<EMAIL_ADDRESS>` | 失去原值，也可能失去跨段落一致性 |
| Redact | 完全移除不需要的內容 | 可能破壞句子、格式或欄位結構 |
| Mask | 保留部分外觀，例如只顯示末四碼 | 剩餘字元與上下文仍可能協助識別 |
| Hash | 比對相同輸入是否重複出現 | 低熵值可能被猜測；key、salt 與用途設計很重要 |
| Encrypt | 經授權後可以還原 | 金鑰管理、權限、輪替與稽核都會成為新的安全邊界 |

Day 26 使用 replace，是因為實驗只要回答「預期值是否仍完整可見」。正式系統若需要讓模型維持同一人的對話關係，可以使用受控代碼（token）取代原值，再由模型外的可信元件維護原值與代碼的對照資料。原值與代碼的對照資料仍是敏感資料，必須限制存取、設定保存期限並避免進入一般 log。

雜湊也不是匿名化的捷徑。電話、身分證號或其他格式固定的值，其可能範圍通常有限；直接使用未加保護的 hash，攻擊者可能預先計算輸入與輸出的對照。系統若只需要建立不可逆的穩定識別值，應依威脅模型選擇使用金鑰的雜湊方法（keyed hash）、限制用途與輪替方式，並避免讓不同資料集共用可連結的識別值。

## 正式系統應建立自己的 PII 回歸測試

Day 26 結果最直接的工程用途，不是判定 Application rules 或 Presidio 哪一個比較好，而是建立一個可重複的評估方法。正式系統可以依下列順序處理：

1. **先列出資料路徑。** 盤點表單、上傳檔案、RAG 文件、模型 request、模型回覆、工具參數、cache、log、trace 與人工審查介面。
2. **依用途刪除不需要的資料。** 不收集、不檢索或不送入模型，通常比事後遮罩更可靠。
3. **維護產品專用資料類型。** 客戶編號、案件編號、會員代碼與內部帳號不一定存在於通用工具中。
4. **建立真實分布的標記資料。** 測試不同語言、地區、格式、錯字、編碼與上下文，但不要把真實個資提交到公開測試庫。
5. **依資料類型分別計算 TP、FP 與 FN。** 同時檢查漏判是否洩露敏感資料，以及誤判是否破壞正常功能。
6. **固定工具、模型、規則與政策版本。** 每次變更都重新執行同一批案例，檢查偵測率與誤判率是否退步。
7. **為高風險資料加入第二道檢查。** 可以讓兩套辨識器交叉檢查、直接依資料欄位套用處理規則、交由人工審查，或拒絕送入模型。
8. **把偵測服務放在授權邊界內。** 不要直接對不受信任網路暴露沒有身分驗證的 Presidio API。
9. **限制偵測紀錄。** 保存類型、政策版本、計數與決策原因；除非確有必要，不要保存完整原文。
10. **準備漏判處理流程。** 包含撤回輸出、清理 cache 與 trace、通知資料負責人，以及更新案例與規則。

上述工程清單不能替團隊判斷法規所定義的個人資料範圍、處理合法依據或通知義務。個資與通知要求取決於資料主體、地區、產業與處理目的，必須由組織的隱私與法務流程確認。

## 實驗限制

這次只有 24 個英文案例、16 個預期項目、5 種類型與 12 個負例。實驗沒有測中文姓名、地址、身分證號、醫療資料、自由格式識別碼、混淆文字、圖片、PDF 或正式流量，也沒有比較其他 NLP 模型與偵測服務。

每個預期結果使用精確 span；同一段文字被辨識成不同範圍或不同類型時，仍會列為錯誤。精確 span 判定便於重現，但不等同所有產品的業務判定。正式系統可能還要區分完整命中、部分命中、類型錯誤與處理後的剩餘風險。

實驗只使用版控內的虛構資料，模型呼叫、網路呼叫與外部副作用都是 0。Raw 原始結果保留在 Lab 的 gitignore 目錄，公開 checkpoint 只保存版本、hash、統計與限制。公開 checkpoint 讓實驗證據可以被驗證，但不表示正式系統可以保存含個資的原始樣本。

## 結果支持分層偵測，也留下明確缺口

應用程式規則在這批固定格式上找出 12／16，Presidio 內建辨識器找出 5／16。分層組合恢復所有產品專用格式，最後仍只有 12／16，四個人名保持未遮罩。加入通用工具可以擴充辨識方法，卻不會自動補齊產品資料、語言與模型的所有缺口。

這次實驗可直接帶回系統設計的結論是：**先用授權與資料最小化限制原文能否進入資料流，再用通用辨識器與產品專用規則找出敏感項目，最後依用途執行替換、移除、遮罩、雜湊或加密；每一層都要用自己的標記資料持續量測漏判與誤判。**

下一篇會把焦點移到 log、trace 與稽核事件。系統需要留下足以重建安全決策的證據，同時避免把完整 prompt、模型回覆與 PII 複製到更多觀測平台。

## 參考資料

- [NIST Glossary — Personally Identifiable Information](https://csrc.nist.gov/glossary/term/personally_identifiable_information)
- [OWASP LLM02:2026 Sensitive Information Disclosure](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/final/LLM02_SensitiveInformationDisclosure.md)
- [Presidio Analyzer](https://presidio.dataprivacystack.org/analyzer/)
- [Presidio Anonymizer](https://presidio.dataprivacystack.org/anonymizer/)
- [Presidio Supported Entities](https://presidio.dataprivacystack.org/supported_entities/)
- [Presidio FAQ](https://presidio.dataprivacystack.org/faq/)
- [LLM Application Security Lab — Day 26 evidence checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-26-pii-detection-masking/evidence/day-26)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10407478)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 26／31 篇**

[上一篇：最小權限與 Agent 沙箱化](https://imfw.io/posts/2026/2026-09-03-least-privilege-agent-sandboxing/) · [下一篇：觀測性與稽核：看得見才守得住](https://imfw.io/posts/2026/2026-09-05-observability-audit/)

<!-- series-nav:end -->
