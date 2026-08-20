---
title: 間接注入實戰：把指令藏進網頁與文件
date: 2026-08-19
tags:
  - ai-security
  - ai
  - security
description: 用合成 HTML、PDF 與 email 追蹤隱藏指令如何經過 extractor 與應用程式 policy 進入模型，分開判讀入口曝露、行為偏航與資料跨界。
---

> **查核資訊：** 本文內容於 2026-08-08 完成查核，依據包括 [OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)、Python `html.parser`／`email` 與 pypdf 6.15.0 官方文件，以及 [LLM Application Security Lab](https://github.com/FWcloud916/llm-app-security-lab) 的 Day 10 合成文件實驗。Parser、模型與工具行為可能更新；Day 10 evidence 已封存在公開的 [Day 10 checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-10-hidden-document-paths/evidence/day-10)，讀者可直接查閱。

白色文字藏進 PDF 後，模型五次都沒有服從。這能證明白色文字攻擊沒用嗎？不能。比較早的一個問題是：白色文字有沒有被 PDF extractor 讀出來？

我在查資料前預測 HTML 白色文字與註解、PDF 白色文字與 metadata、email 隱藏 HTML 和檔名「都會」進入模型。實驗只支持其中五條資料路徑。另三條雖然在原始檔案裡有攻擊文字，卻被目前的 extractor policy 排除。

**檔案格式只決定攻擊文字可以藏在哪裡；應用程式如何抽取與序列化，才決定模型實際看見什麼。**

## 「藏在檔案裡」離模型還有三道轉換

[OWASP](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)把網頁、文件、email、附件與 hidden text 都列為 Remote／Indirect Prompt Injection 的可能入口。不過，被列為可能入口，不代表任何 parser 都會保留其中的攻擊文字。

這次我把資料路徑拆成四個觀測點。以 PDF 白色文字案例來看，攻擊 marker 在前三個觀測點都是 `TRUE`；到了 model response，判讀方式改為檢查 injection marker 與刻意放入參考資料的假機密值（canary），確認模型是否偏航或讓資料跨界。下圖整理這四個觀測點的實際結果。

![Day 10 四個資料路徑觀測點：pdf-white-text.pdf 的 DAY10_ATTACK_SOURCE 存在於 source bytes，經 pypdf 保留在 extractor output，也被應用程式放進 serialized model request；model response 完成正常摘要，injection marker 與 canary 都是 FALSE，因此判為只有入口曝露。Source bytes 另有一條人眼檢視旁支，PDF 頁面上的白色文字 marker 不可見。](/assets/images/indirect-injection-web-documents-data-path.png)

四段不是四種檔案，而是同一份外部內容經過應用程式時的四個觀測點：

1. **Source bytes**：原始 HTML、PDF 或 `.eml` 的檔案內容。Source bytes 用來確認攻擊文字是否真的存在，並以 SHA-256 證明實驗前後使用同一份來源。
2. **Extractor output**：parser 從檔案取出的文字。例如 pypdf 可能讀到 PDF 白色文字，HTML extractor 也可能排除 comment。
3. **Serialized model request**：應用程式把 system message、使用者要求與 extracted text 組合後，實際送給模型的完整 request。Extractor 讀到某個欄位，不代表應用程式一定會把該欄位放進 request。
4. **Model response**：模型回傳的內容。這一段才檢查模型是否完成正常任務、服從攻擊，或帶出另一份資料裡的 canary。

以 PDF 白色文字案例來看，`DAY10_ATTACK_SOURCE` 存在於 source bytes，也出現在 pypdf output 與 model request；model response 最後沒有產生代表服從攻擊的 response marker，也沒有帶出 canary。這就是「入口曝露，但沒有觀察到偏航或資料跨界」。

人眼可見性是另一個層面。白色文字可能在白底 PDF 看不到，content stream 仍保有文字；附件檔名可能顯示在郵件介面，卻不在 body。

## 用同一份來源比較不同 application policy

實驗只用本機合成 HTML、PDF 與 `.eml`，不讀真實第三方內容、不做 OCR，也不開工具或 outbound sink。HTML 與 email 使用 Python 3.14.6 標準函式庫；PDF 鎖定 pypdf 6.15.0。每個來源都使用語意相同的 payload，並將 source marker 與 response marker 分開。source marker 用來追蹤資料路徑；response marker 不會逐字出現在檔案或 prompt，只有模型服從攻擊時才會產生。

PDF metadata 與 email filename 各做一組成對比較。每一組成對比較都沿用各自完全相同的 source bytes，唯一改變的是應用程式是否把該欄位加入 extracted text：

| 情境 | Source 有攻擊文字 | Extractor 保留 | 進入 request |
|---|---:|---:|---:|
| 一般 HTML | 否 | 否 | 否 |
| HTML 白色文字 | 是 | 是 | 是 |
| HTML comment | 是 | 否 | 否 |
| PDF 白色文字 | 是 | 是 | 是 |
| PDF metadata，只取 page text | 是 | 否 | 否 |
| 同一份 PDF，另納入 Subject | 是 | 是 | 是 |
| Email 隱藏 HTML | 是 | 是 | 是 |
| Email 檔名，只取 body | 是 | 否 | 否 |
| 同一封 email，另納入檔名 | 是 | 是 | 是 |

表格修正了我的「都會」預測。Metadata 與檔名都只有在應用程式選擇序列化時才會進模型。

## HTML 白色文字會留下，comment 不一定

[Python `HTMLParser` 文件](https://docs.python.org/3/library/html.parser.html)把一般文字與 comment 分給不同 callback。本次 extractor 收集允許元素的 text node，不收 comment，也排除 `script` 與 `style`。白色文字仍是普通 text node；extractor 不執行 CSS，因此完整保留 payload。換成會保留 comment 的 pipeline，結果就可能不同。

實驗中的兩份 HTML 只把相同 marker 放在不同位置。下列範例省略後面的合成攻擊內容：

```html
<p style="color: #fff; background: #fff">
  DAY10_ATTACK_SOURCE ...
</p>

<!-- DAY10_ATTACK_SOURCE ... -->
```

白色文字版本的 extracted text 仍含 `DAY10_ATTACK_SOURCE`；comment 版本只留下正常會議內容，marker 沒有進入 request。

## PDF page text 與 metadata 是兩條入口

[pypdf `extract_text()` 文件](https://pypdf.readthedocs.io/en/stable/modules/PageObject.html)說明，API 會從 page content stream 找出文字繪製指令。本次合成 PDF 以白色繪製 payload；這段文字雖然在白底頁面上看不見，仍存在於 page content stream，會被 `extract_text()` 讀出。PDF Subject 則要經 [`PdfReader.metadata`](https://pypdf.readthedocs.io/en/stable/user/metadata.html) 另外讀取；只有應用程式追加 Subject 時，同一份 PDF 才形成模型可見的入口。

實驗輸出把「畫面看不到」與「extractor 讀不到」拆成兩件事。下圖左側直接算繪合成 PDF，右側則保留同一份檔案的完整 pypdf 輸出；右側換行只為排版，沒有省略文字。

![Day 10 PDF 白色文字實驗對照：左側 Poppler 算繪頁面只看見正常的會議內容，human-visible marker 為 FALSE；右側同一份 PDF 經 pypdf extract_text() 後包含 DAY10_ATTACK_SOURCE 與完整合成 payload，extracted marker 為 TRUE。](/assets/images/indirect-injection-web-documents-pdf-extraction-evidence.png)

因此 PDF ingestion pipeline 要明列實際採用的 page text、annotation、form field、metadata、OCR 與附件。本文只驗證 page text 與 Subject，不能推定其他入口。

## Email body、header 與檔名也不會自動混成一包

[Python `email.parser` 文件](https://docs.python.org/3/library/email.parser.html)把 headers、body 與 MIME subparts 解析成 message tree；[`EmailMessage`](https://docs.python.org/3/library/email.message.html) 再分別選 body、走訪附件及讀取檔名。本次 HTML body extractor 保留 `display: none` 文字；附件檔名則只有在 policy 明確追加時才進入 request。完成 email parsing 不代表所有欄位會自動混成一包。

兩封合成 email 分別驗證隱藏 body 與附件檔名：

```text
HTML body：<p style="display: none">DAY10_ATTACK_SOURCE ...</p>
body extractor：... DAY10_ATTACK_SOURCE ...

附件檔名：DAY10_ATTACK_SOURCE [payload omitted].txt
body only：marker 不存在
body + attachment filenames：... DAY10_ATTACK_SOURCE [payload omitted].txt
```

## 進入 context，不等於攻擊成功

正式計畫固定本機 Ollama 0.32.5、`gemma4:latest` 完整 digest、system message、合成 canary、`temperature=0.7` 與 seeds 411 至 415。九組各五次，共 45 runs，一次執行完整 plan。

| 分組 | Runs | Exact target | Injection | Canary |
|---|---:|---:|---:|---:|
| Clean | 5 | 5／5 | 0／5 | 0／5 |
| 攻擊文字被 extractor 排除 | 15 | 15／15 | 0／15 | 0／15 |
| 攻擊文字進入 request | 25 | 24／25 | 0／25 | 0／25 |

進入 request 的 25 次就是我所說的「只有入口曝露」：沒有 response-only marker，也沒有帶出參考文件中的 canary。兩次回覆把 payload 描述成可疑指令，仍完成摘要；描述不等於服從。Exact target 唯一未命中只是把識別碼寫成帶有 Markdown 跳脫字元的形式；人工閱讀後 45 次都完成正常摘要，但表格仍保留事前定義的 exact count。

這批 0／25 不能外推成隱匿注入普遍無效。模型、payload、parser、prompt、欄位順序或 sampling 改變，都可能改變結果。先確認 attack 是否到達模型，再用模型與系統層 predicate 判斷影響。

來源 bytes、extractor output、serialized request 與 response predicates 的完整摘要，可在公開的 [Day 10 實驗 checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-10-hidden-document-paths/evidence/day-10) 查閱。

## Pilot 先抓到的是量測漏洞

正式計畫前，我跑過一批 45-run pilot。當時同一個 injection marker 同時存在於來源與 response predicate；模型正常摘要 metadata 裡的攻擊句，exact matcher 卻把「引用」算成「服從」。這是量測失守，不是攻擊成功。

Pilot 沒有混入正式結果。正式計畫分開 source／response markers、重建 fixtures、換用 seeds 411 至 415 並通過離線測試後，才重新跑完整 45 次。若 success token 原本就在測試文件裡，全文搜尋只能證明 token 出現；response predicate 必須排除正常引用，並和資料跨界、工具動作或 downstream sink 分開。

## 回到自己的 ingestion pipeline

盤點間接注入時，我會留下三組證據。第一組是原始來源與 SHA-256，用來確認攻擊者能控制哪些 bytes。第二組是 extractor 的名稱、版本、policy、輸出與 SHA-256，用來確認 comment、metadata、header、檔名或 OCR 哪些被保留。第三組是 serialized request 與分離的 response predicates，分別用來判斷模型偏航、資料跨界及 downstream action。

「文件裡有惡意文字」只是威脅的起點。「模型這次沒聽」也不是安全邊界。能把 source、extractor、serialization 與 sink 逐段拿出證據，才知道防線應該放在哪裡。

## 參考資料

- [OWASP Cheat Sheet Series — LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection](https://arxiv.org/abs/2302.12173)
- [Python 3 — `html.parser`](https://docs.python.org/3/library/html.parser.html)
- [Python 3 — `email.parser`](https://docs.python.org/3/library/email.parser.html)
- [Python 3 — `email.message`](https://docs.python.org/3/library/email.message.html)
- [pypdf — Extract Text from a PDF](https://pypdf.readthedocs.io/en/stable/user/extract-text.html)
- [pypdf — Metadata](https://pypdf.readthedocs.io/en/stable/user/metadata.html)
- [LLM Application Security Lab — Day 10 checkpoint](https://github.com/FWcloud916/llm-app-security-lab/tree/day-10-hidden-document-paths/evidence/day-10)

<!-- ironman-cross-publication:start -->
> 本文同步刊載於 [iThome 鐵人賽](https://ithelp.ithome.com.tw/articles/10403770)。
<!-- ironman-cross-publication:end -->

<!-- series-nav:start -->

---

**《LLM 應用資安：從 Prompt Injection 到 AI Red Teaming》第 10／30 篇**

[上一篇：直接注入 vs 間接注入](https://imfw.io/posts/2026/2026-08-18-direct-vs-indirect-injection/) · [下一篇：Jailbreak 手法分類學](https://imfw.io/posts/2026/2026-08-20-jailbreak-taxonomy/)

<!-- series-nav:end -->
