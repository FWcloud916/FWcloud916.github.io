---
title: Docker Image - 基本概念
date: 2020-03-08
updated: 2026-07-13
tags:
  - Docker
  - Docker Image
  - Image
  - w3HexSchool
description: Docker image 的唯讀分層、tag 與 digest，以及 pull、build、inspect、rm 常用指令。
---

Docker image 是執行 container 所需檔案、binary、library 與設定的標準化套件。Image 建立後不會直接被修改；內容變更時會產生新的 layer 與新 image。Tag 是方便閱讀的名稱，digest 才是特定內容的不可變識別值。

## Image 和 container 的關係

Image 是可重複使用的套件，container 是它的執行實例。同一個 image 可以啟動多個 container；container runtime 產生的可寫資料不會反向修改原始 image。

Image 通常由多個 layer 組成。不同 image 可以共用相同 layer，因此下載或儲存時不一定要重複保存全部內容。

## 常用指令

### 列出本機 image

```bash
docker image ls
```

### 從 registry 下載

```bash
docker image pull nginx:alpine
```

正式部署應明確指定 tag，對可重現性要求更高時可固定 digest，避免 `latest` 指向的內容日後改變。

### 從 Dockerfile 建置

```bash
docker image build --tag my-app:1.0 .
```

最後的 `.` 是 build context；Dockerfile 中的 `COPY` 只能讀取 context 內允許的檔案。應搭配 `.dockerignore` 排除 `.git`、dependency cache、secret 和其他不需要的內容。

### 查看詳細資料與 history

```bash
docker image inspect my-app:1.0
docker image history my-app:1.0
```

### 移除 image

```bash
docker image rm my-app:1.0
```

若仍有 container 引用該 image，必須先確認並清理 container，不要在不理解影響時直接強制刪除。

## Tag 與 digest 怎麼選

- **Tag** 適合人員閱讀與版本管理，例如 `my-app:1.0`。
- **Digest** 對應確切 image 內容，例如 `nginx@sha256:...`。
- 開發流程可以使用有意義的 tag；需要嚴格重現的部署則保存並使用 digest。

回到 [Docker 基礎學習路線](/posts/2026/2026-07-13-docker-basics-guide/)，或繼續閱讀 [Dockerfile 基本概念](/posts/2020/2020-03-15-docker-basic-dockerfile/)。

## 官方參考資料

- [Docker：What is an image?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/)
- [docker image CLI](https://docs.docker.com/reference/cli/docker/image/)
- [docker image pull](https://docs.docker.com/reference/cli/docker/image/pull/)
