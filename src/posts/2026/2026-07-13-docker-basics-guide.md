---
title: Docker 基礎學習路線：從 Container、Image 到 Dockerfile
date: 2026-07-13
tags:
  - Docker
  - docker-learning-path
description: Docker 初學者的閱讀順序與實作路線，依序理解 container、image、Dockerfile，再完成第一個 nginx 與 Node.js image。
---

學 Docker 最有效的順序是：先理解 container 是隔離的 process，再理解 image 如何提供執行所需檔案，最後用 Dockerfile 建立自己的 image。不要一開始就背所有 CLI；先完成「run 現成 image → 觀察 container → build 自己的 image」這個循環。

## 適合誰

這條路線適合第一次接觸 Docker、想統一團隊開發環境，或需要把 Web 應用程式放進 container 的開發者。開始前只需要能使用 terminal，不要求 Kubernetes 或雲端平台知識。

## 核心關係

```text
Dockerfile ──build──> Image ──run──> Container
                         │
                         └──push／pull──> Registry
```

- **Dockerfile** 保存建置步驟。
- **Image** 是唯讀、分層、可分發的應用套件。
- **Container** 是 image 的執行實例。
- **Registry** 用來保存與分享 image。

## 第一步：理解 Container 為什麼存在

先讀 [Docker 基本概念](/posts/2020/2020-02-16-docker-basic-concept/)，理解 container 與 VM 的隔離方式和使用情境。接著用 [Docker Container 基本概念](/posts/2020/2020-02-22-docker-basic-container/)啟動 nginx，練習：

- `docker container run`
- port publishing
- bind mount
- 查看 log、停止與清理 container

完成標準：能解釋為什麼 `EXPOSE 80` 不等於 host 可以直接連到 port 80。

## 第二步：理解 Image 與版本

閱讀 [Docker Image 基本概念](/posts/2020/2020-03-08-docker-basic-image/)，練習 pull、list、inspect 與 remove。特別確認：

- image 為什麼由 layers 組成
- tag 與 digest 的差異
- 為什麼正式部署不應盲目依賴 `latest`

完成標準：能指出目前執行的 container 使用哪個 image tag 或 digest。

## 第三步：建立自己的 Image

閱讀 [Dockerfile 基本概念](/posts/2020/2020-03-15-docker-basic-dockerfile/)，用簡單 Node.js 專案完成：

1. 選擇明確版本的 base image。
2. 先複製 lockfile 並安裝 dependency。
3. 再複製應用程式，利用 build cache。
4. 透過 `.dockerignore` 排除 secret 和不必要檔案。
5. build image 並以 container 執行。

完成標準：修改一個程式檔後重新 build，能從輸出辨認 dependency layer 是否重用 cache。

## 建議的下一個主題

掌握這四篇後，再依需求學習：

- Docker Compose：管理多個互相依賴的服務。
- Named volume：保存需要跨 container 留存的資料。
- Container network：讓服務透過名稱互相連線。
- Multi-stage build：縮小正式 image，避免把建置工具帶進 runtime。
- Healthcheck 與 resource limits：讓部署平台能判斷服務狀態並限制資源。

## 官方延伸閱讀

- [Docker Get Started](https://docs.docker.com/get-started/)
- [Docker 官方入門 Lab](https://docs.docker.com/guides/lab-container-getting-started/)
- [Docker：What's next](https://docs.docker.com/get-started/introduction/whats-next/)
