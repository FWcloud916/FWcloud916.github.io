---
title: Docker Container - 基本概念
date: 2020-02-22
updated: 2026-07-13
tags:
  - Docker
  - Docker Container
  - Container
  - w3HexSchool
description: 用 nginx 練習 docker run、port publishing、bind mount 與 container 生命週期。
---

Container 是 image 的可執行實例。最常用的起點是 `docker run`：它會在本機沒有 image 時先下載，再建立並啟動 container。本篇用 nginx 示範 port publishing、bind mount、背景執行與清理流程。

## 啟動第一個 container

```bash
docker container run --name web -d -p 8080:80 nginx
```

這行指令會：

- 以 `nginx` image 建立名為 `web` 的 container。
- `-d`／`--detach` 讓它在背景執行。
- `-p`／`--publish` 將 host 的 `8080` 對應到 container 的 `80`。

完成後開啟 `http://localhost:8080`，應該會看到 nginx 預設頁面。

> Dockerfile 的 `EXPOSE 80` 只是描述服務預期監聽的 port，不會自動把 port 發布到 host；實際對外映射仍要使用 `-p` 或其他網路設定。

## 查看狀態與 log

```bash
docker container ls
docker container logs web
docker container inspect web
```

- `ls` 列出執行中的 container。
- `logs` 查看主要 process 寫到標準輸出的 log。
- `inspect` 查看完整設定、網路和 mount 資訊。

## 把本機檔案掛進 container

先準備一個含 `index.html` 的本機目錄，再執行：

```bash
docker container run --name custom-web -d \
  -p 8081:80 \
  --mount type=bind,source="$HOME/Documents/demo",target=/usr/share/nginx/html,readonly \
  nginx
```

這個 bind mount 讓 nginx 讀取本機目錄內容。`readonly` 可避免 container 修改本機檔案。路徑需要依自己的環境調整；正式資料持久化則應比較 bind mount 與 named volume 的差異。

## 停止與清理

```bash
docker container stop web custom-web
docker container rm web custom-web
```

停止 container 不會自動刪除它；不再需要時再以 `rm` 清理。要查看包含已停止 container 的清單，可使用：

```bash
docker container ls --all
```

## Image、Dockerfile 與 Container 的關係

Dockerfile 定義建置步驟，image 保存建置結果，container 則是 image 的執行實例。同一個 image 可以啟動多個彼此獨立的 container，但每個 container 的 runtime 狀態不同。

回到 [Docker 基礎學習路線](/posts/2026/2026-07-13-docker-basics-guide/)，或繼續了解 [Docker Image](/posts/2020/2020-03-08-docker-basic-image/)。

## 官方參考資料

- [Docker：What is a container?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)
- [docker container run](https://docs.docker.com/reference/cli/docker/container/run/)
- [Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
