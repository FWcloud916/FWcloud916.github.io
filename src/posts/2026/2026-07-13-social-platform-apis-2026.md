---
title: 2026 年社群平台 API 現況：單人開發者的生存指南
date: 2026-07-13
tags:
  - api
  - social-media
  - automation
description: 為了做自動發文工具，把 X、Facebook、Instagram、Threads 四個平台的 API 研究了一輪 — 申請門檻、費用、token 管理與免審核範圍的第一手整理。
---

最近在做部落格的自動發文工具，文章發布後自動轉發到 X 、 Facebook 、 Instagram 、 Threads

結果最花時間的不是寫程式，而是搞懂四個平台的 API 現在長什麼樣子

如果你的印象還停留在「 Twitter API 免費申請就能用」的年代，這篇整理了新的現況
以下都是實際申請、查過官方文件的第一手資訊

## X：開始需要付費

X 在 2026 年 2 月把開發者方案全面改成**按次計費**，新開發者已經沒有免費方案可以選了

- 發一則貼文 : **$0.015**
- 貼文含連結 : **$0.20** ( 貴 13 倍，平台就是不想讓你導流出去 )
- 讀取 : $0.005/則，每月上限 200 萬則

舊的 Free tier ( 每月 500 則 ) 只剩既有用戶沿用，Basic ( $200/月 ) 跟 Pro ( $5,000/月 ) 也關閉新申請了

對自動發文來說，等於**每篇文章 $0.2 美元**
錢不多，但你會開始思考「這則值得發嗎」

### 技術面

- OAuth 2.0 Authorization Code + PKCE，要 `offline.access` scope 才拿得到 refresh token
- 一個坑 : **refresh token 每次刷新都會輪替**，沒把新的存回去，下一次刷新就直接失效

## Meta 三平台：dev mode 是單人工具的甜蜜點

Facebook 、 Instagram 、 Threads 都掛在 Meta 開發者平台下，有一條對個人工具超級友善的共通規則

> App 維持 Development mode 、你的帳號持有 app role 的情況下
> 對「自己的資產」發文**不需要 App Review，完全免費**

App Review 是 Meta 出名的繁瑣流程 ( 要錄影、要寫使用情境、要等審核 )
但那是給「服務其他使用者」的 App 用的
單人工具只操作自己的粉專、自己的 IG 、自己的 Threads — dev mode 就是完全體!!

### Facebook：只能發粉專，但 token 幾乎永生

- **個人檔案不能用 API 發文**，只能發粉絲專頁，想自動發文要先開一個粉專
- 權限要 `pages_manage_posts` + `pages_read_engagement` + `pages_show_list`
- 發文就是對 `/{page-id}/feed` POST 一個 `message` ( 可帶 `link` 產生預覽卡 )
- 用長效 User token 換到的 **Page token 幾乎不過期**，換一次可以用超久，是最簡單的

### Instagram：不用綁粉專了，但圖片比較麻煩

2024 年中推出的「 Instagram API with Instagram Login 」是個大改善
以前發 IG 要先有 FB 粉專、把帳號綁上去、權限一路串過去
現在直接用 IG 帳號登入授權就好 ( 帳號要轉商業或創作者，免費、可逆 )

不過內容發布的限制是四平台最多的

- 圖片**只收 JPEG**
- 圖片必須放在**公開 URL** — Meta 的伺服器會自己來抓，不能直接上傳檔案
  - 個人工具可以租圖床或是把圖丟到靜態部落格一起部署
- 發布是**兩段式** : 先建 media container 、再 publish
- API 發文上限 25 則/24 小時

### Threads：目前對開發者最友善

Threads API 意外地是四個裡面體驗最好的

- 免費，純文字就能發 ( 不像 IG 強制要圖 )
- 每則 500 字，發文上限 250 則/24 小時
- **支援串文** : 用 `reply_to_id` 回覆自己的貼文就能串起來，做出「主文講重點、細節放留言」的格式
  - 回覆另計額度 ( 1,000 則/24 小時 )，不吃發文額度
  - 回覆自己的貼文也不需要額外權限
- 一樣是兩段式發布，官方建議 container 建立後等 30 秒再 publish

要注意 Threads 跟 IG 是**完全獨立的產品**
即使掛在同一個 Meta App 下，token 、 App Secret 、權限 ( `threads_basic` + `threads_content_publish` ) 都是分開的一套

## Token 管理：三種生命週期

| 平台 | Token 效期 | 維護方式 |
|------|-----------|---------|
| X | access token 短效 | 遇 401 用 refresh token 換新 ( **會輪替，要回存** ) |
| Facebook | 幾乎不過期 | 不用管 |
| Instagram | 60 天 | 存滿 24 小時後可刷新，**過期就不能刷**，只能重新授權 |
| Threads | 60 天 | 同上，跟 IG 分開刷 |

IG 跟 Threads 的「 60 天過期就死」最容易出事
忘記刷新，兩個月後你的自動發文就靜悄悄地壞掉囉
可以考慮透過排程自動刷新

## 給單人開發者的建議

1. **從 Threads 開始** — 免費、純文字可發、限制最少，驗證整條流程的最佳起點
2. **FB/IG 一起辦** — 同一個 Meta App 搞定 ; IG 的 JPEG + 公開 URL 限制先想好圖從哪來
3. **X 想清楚再上** — 含連結每則 $0.2，一年發 100 篇就是 $20，如果讀者不在 X 上這筆可以省
4. **Token 刷新自動化** — 60 天剛好長到讓你忘記它的存在

平台 API 的免費紅利確實過去了
但對「只操作自己帳號」的個人工具來說，2026 年的現況比想像中友善

## 參考資料

- [X API pricing 2026 ( Postproxy 整理 )](https://postproxy.dev/blog/x-api-pricing-2026/)
- [X OAuth 2.0 Authorization Code Flow](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)
- [Meta Pages API — Get Started](https://developers.facebook.com/docs/pages-api/getting-started/)
- [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)
- [Instagram Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Threads API — Access Tokens and Permissions](https://developers.facebook.com/docs/threads/get-started/get-access-tokens-and-permissions/)
- [Threads API — Create Replies](https://developers.facebook.com/docs/threads/retrieve-and-manage-replies/create-replies/)
