---
title: 一個 Meta App 搞不定三平台：FB / IG / Threads 申請實戰踩坑記
date: 2026-07-20
tags:
  - meta-api
  - social-media
  - automation
description: 實際到 developers.facebook.com 幫自動發文工具辦 FB / IG / Threads 的 API 權限，結果建了兩個 App、管三組 Secret — dashboard 操作、Tester 邀請、token 生命週期的第一手踩坑記錄。
---

[上一篇](/posts/2026/2026-07-13-social-platform-apis-2026/)整理了 2026 年社群平台 API 的現況
這篇記錄實際到 developers.facebook.com 把 App 辦下來的過程

動手前我以為「一個 Meta App 搞定 FB / IG / Threads 三平台」
動手後發現 : 是**兩個 App、三組憑證**

以下是完整流程與每一個坑

## 先攤開地圖：兩個 App、三組憑證

| 平台 | 掛在哪個 App | 憑證 |
|------|------------|------|
| Facebook | App A ( Use case 選 Other → Business ) | App A 的 App ID / Secret |
| Instagram | App A 加 Instagram product | **另一組** Instagram App ID / Secret |
| Threads | **App B** ( Use case 選 Access the Threads API ) | App B 的 App ID / Secret |

為什麼會長這樣 ? 兩個坑造成的，一個一個講

## 坑一：Threads 必須另建一個獨立 App

新版的 Create App 流程裡，**Use case 決定一切** — 它決定這個 App 之後能加哪些 API 、權限與產品

問題來了 : 用 Other → Business 建立的 App ( FB / IG 用的那種 )
事後**加不進** Threads use case，dashboard 裡根本沒有這個選項

所以流程只能是 :

1. My Apps → **Create App** ( 不能沿用 FB / IG 那個 )
2. Use case 選 **Access the Threads API**
3. 在 use case 設定裡勾權限 : `threads_basic` ( 必要 ) + `threads_content_publish`
4. App settings → Basic 拿 App ID / App Secret

Threads 跟 IG 本來就是完全獨立的產品，token 、 Secret 、權限都分開
現在連 App 都要分開，心理上就當它們是不同公司吧

## 坑二：IG 會偷偷給你第二組 App ID / Secret

Instagram 用新的「 Instagram API with Instagram Login 」，好處是**不用綁 FB 粉專**了
IG 帳號轉成商業或創作者帳號 ( 免費、可逆 ) 就能直接授權

設定流程 :

1. App dashboard → Add Product → **Instagram** → 選 **Instagram API with Instagram Login**
2. 到「 API setup with Instagram business login 」頁面設定

坑就在第 2 步的頁面裡 —
這個 product 有**自己專屬的 Instagram App ID / App Secret**
跟 App settings → Basic 那組**不是同一組**!!

```bash
# .env — 同一個 App 卻有兩組憑證
META_APP_ID=...        # App settings → Basic ( FB 用 )
META_APP_SECRET=...
IG_APP_ID=...          # Instagram product 頁面 ( IG 用 )
IG_APP_SECRET=...
```

拿錯組去跑 OAuth，錯誤訊息不會告訴你「你拿錯組了」，只會讓你懷疑人生
發 IG 的另外兩個限制順便記著 : 圖片**只收 JPEG** 且必須放在**公開 URL** ( Meta 伺服器會自己來抓 )

## Facebook：坑最少，但要先有粉專

FB 反而是三個裡面最單純的，條件只有一個 :
**個人檔案不能用 API 發文**，要有一個你當管理員的粉絲專頁

1. App dashboard → Add Product → **Facebook Login for Business**
2. 到 [Graph API Explorer](https://developers.facebook.com/tools/explorer) 產生 User token，勾三個權限 :
   `pages_manage_posts` + `pages_read_engagement` + `pages_show_list`
3. 用它換**長效 Page token**

換到的 Page token 在 dev mode 、權限不變的情況下**幾乎不過期**
辦一次就可以忘記它，三平台裡的模範生

## Tester 邀請：發出去，還要記得去「接受」

IG 跟 Threads 都要把自己的帳號加成 Tester，而且是**兩段式**的 :
dashboard 發邀請是一段，到手機 App 裡接受邀請是另一段

- **Instagram** : product 頁加 Instagram Tester → 打開 IG App 接受邀請
- **Threads** : App roles → Roles 加 Threads Tester → 打開 Threads App
  ( 設定 → 帳號 → 網站權限 → 邀請 ) 接受

第二段超容易忘
忘了的症狀是 : token 拿得到，API 打下去卻一直吐權限錯誤，讓你回頭檢查程式碼半天

## Token 生命週期：三個平台三種個性

| 平台 | 效期 | 維護 |
|------|------|------|
| Facebook | 幾乎不過期 | 不用管 |
| Instagram | 60 天 | 過期前刷新 ; **過期就不能刷**，只能重新授權 |
| Threads | 60 天 | 同上，而且 token **存在滿 24 小時後才能刷新** |

Threads 那條「滿 24 小時才能刷」是文件裡一行小字
如果你授權完馬上測試刷新流程，會拿到失敗然後開始 debug 一個不存在的 bug ( 我 )

60 天的過期週期剛好長到讓人忘記它的存在
建議直接排一個**每月一次**的排程把 IG 跟 Threads 一起刷掉，一勞永逸

## 收尾：dev mode 就是完全體

整趟辦下來，最重要的還是這條共通規則 :

> App 維持 Development mode 、自己的帳號持有 app role
> 對「自己的資產」發文**不需要 App Review，完全免費**

不用錄影、不用寫使用情境、不用等審核
兩個 App 、三組憑證、幾封 Tester 邀請，換來三個平台的免費自動發文
比起隔壁按次計費的 X，這些 dashboard 上的小坑真的只是小坑啦

## 參考資料

- [Threads Use Case — App Development with Meta](https://developers.facebook.com/docs/development/create-an-app/threads-use-case/)
- [Threads API — Create an App](https://developers.facebook.com/docs/threads/get-started/create-an-app/)
- [Threads API — Access Tokens and Permissions](https://developers.facebook.com/docs/threads/get-started/get-access-tokens-and-permissions/)
- [Instagram Platform — Create an Instagram App](https://developers.facebook.com/docs/instagram-platform/create-an-instagram-app/)
- [Business Login for Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/)
- [Meta Pages API — Get Started](https://developers.facebook.com/docs/pages-api/getting-started/)
