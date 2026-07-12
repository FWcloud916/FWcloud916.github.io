---
title: Dockerfile - 基本概念
date: 2020-03-15
tags:
  - Docker
  - Dockerfile
  - w3HexSchool
---
# Dockerfile - 基本概念

簡述 Dockerfile 的基本語法與常用指令

## 概念
Dockerfile 是 image 的藍圖，描述如何建立一個 image

## 常用指令
- `FROM`：指定基礎 image
- `RUN`：執行指令
- `COPY`：複製檔案到 image
- `ADD`：複製檔案或目錄到 image，並自動解壓縮壓縮檔
- `CMD`：container 啟動時執行的指令
- `EXPOSE`：開放的 port
- `ENV`：設定環境變數
- `WORKDIR`：設定工作目錄

## 範例
```dockerfile
FROM node:12
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

## 參考
- [Dockerfile 文件](https://docs.docker.com/engine/reference/builder/)
