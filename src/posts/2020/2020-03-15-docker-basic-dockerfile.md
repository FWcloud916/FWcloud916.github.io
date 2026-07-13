---
title: Dockerfile - 基本概念
date: 2020-03-15
updated: 2026-07-13
tags:
  - Docker
  - Dockerfile
  - w3HexSchool
description: Dockerfile 常用指令、Node.js 範例、build cache 與避免把不必要檔案打進 image 的做法。
---

Dockerfile 是描述如何建立 container image 的文字檔。每個指令都應有明確目的：選擇 base image、安裝 dependency、複製應用程式、設定工作目錄，最後指定 container 啟動時執行的程式。

## 常用指令

| 指令 | 用途 |
|------|------|
| `FROM` | 指定 base image 並開始新的 build stage |
| `WORKDIR` | 設定後續指令的工作目錄 |
| `COPY` | 從 build context 或其他 stage 複製檔案 |
| `RUN` | 在 build 階段執行指令並產生 layer |
| `CMD` | 提供 container 預設啟動命令或參數 |
| `ENTRYPOINT` | 指定 container 的主要 executable |
| `ENV` | 設定 image 與 container 使用的環境變數 |
| `ARG` | 設定只在 build 階段使用的變數 |
| `EXPOSE` | 描述應用程式監聽的 port，不會自動發布 port |
| `USER` | 指定後續 build 或 runtime 使用者 |

一般檔案優先用 `COPY`；只有確實需要 `ADD` 的遠端來源或自動解壓等能力時再使用 `ADD`。

## Node.js 範例

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

先複製 lockfile 並安裝 dependency，再複製其餘程式碼，可以讓只有應用程式檔案變更時重用 dependency layer 的 build cache。範例中的版本只是示意；實際專案應使用受支援版本並定期更新 base image。

搭配 `.dockerignore`：

```text
.git
node_modules
npm-debug.log
.env*
```

Secret 不應透過 `COPY`、`ARG` 或 `ENV` 永久寫入 image layer；建置或執行時應使用平台提供的 secret 機制。

## 建置與執行

```bash
docker image build --tag my-node-app:1.0 .
docker container run --rm -p 3000:3000 my-node-app:1.0
```

`EXPOSE 3000` 只提供 metadata；`-p 3000:3000` 才把 container port 發布到 host。

回到 [Docker 基礎學習路線](/posts/2026/2026-07-13-docker-basics-guide/)，或複習 [Docker Image 基本概念](/posts/2020/2020-03-08-docker-basic-image/)。

## 官方參考資料

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Writing a Dockerfile](https://docs.docker.com/get-started/docker-concepts/building-images/writing-a-dockerfile/)
- [Build secrets](https://docs.docker.com/build/building/secrets/)
