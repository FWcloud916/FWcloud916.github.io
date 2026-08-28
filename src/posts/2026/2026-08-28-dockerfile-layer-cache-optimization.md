---
title: Dockerfile 為什麼越改越慢？從 build context、layer 到 cache invalidation
date: 2026-08-28
tags:
  - Docker
  - devops
  - automation
description: 用一套可重現的 FastAPI lab 拆解 Docker build context、layer 與 cache key，重現只改一行程式卻重新安裝所有 dependencies 的情況，並示範如何找出第一個失效步驟。
---

> **查核資訊：** 本文於 2026-08-28 查核 Docker 官方的 build、Dockerfile 與 cache 文件，並在 arm64 Colima 環境重現文中實驗；使用的版本為 Docker client 29.6.2、server 29.2.1 與 Buildx v0.35.0。BuildKit、base image、package index 與網路狀態都可能影響 build 結果；文中的秒數只代表這台機器的觀察結果，不能視為跨環境的效能保證。

前面三篇先把容器的 process 模型、Rootless Docker 與 Podman 的權限邊界攤開：

- [Docker 與 Podman 要達成的是同一件事：什麼是容器化](https://imfw.io/posts/2026/2026-07-21-what-is-containerization/)
- [正式環境為什麼需要 Rootless Docker？從 root 權限風險到可驗證部署](https://imfw.io/posts/2026/2026-07-21-production-rootless-docker/)
- [Podman 也有 Rootless 問題嗎？Daemonless 少掉什麼風險，又留下哪些限制](https://imfw.io/posts/2026/2026-07-21-podman-rootless-production/)

這篇接著回到幾乎每個專案都會碰到、也最容易被一句「Docker 有 cache」帶過的 build 問題：

> 為什麼只改一行應用程式，下一次 build 卻又把全部 Python 套件下載、建 wheel、安裝一次？

簡單來說，Docker 不會只因為「dependencies 沒有變」就沿用 dependency installation 的結果。Builder 會根據 Dockerfile 指令、前一步的結果，以及該指令讀取的檔案判斷能否使用 cache。較前面的步驟只要失效，後續步驟就必須重跑。

如果 Dockerfile 先執行 `COPY . .`，再安裝 dependencies，README、測試、應用程式，以及其他仍在 build context 裡的檔案都會成為 cache 判斷的輸入。這些輸入只要有一項改變，dependency installation 的 cache 就可能一起失效。問題不在 cache 壞掉，而是 dependency installation 的 cache boundary 納入了經常變動的應用程式碼。

本文聚焦在 Dockerfile 的 cache 判讀方法：build context 包含什麼、cache key 看什麼、第一個 miss 在哪裡，以及 `CACHED` 到底證明了什麼。後續文章會沿用相同服務，實作 multi-stage、lockfile、cache mount、non-root 與最小 runtime image，再討論 production-ready Dockerfile 應具備的條件。

## Build 的輸入不只有 Dockerfile，還有 context

執行下面這行時，最後的 `.` 不是裝飾：

```bash
docker build -t example .
```

`.` 指定目前目錄為 build context。Dockerfile 裡的 `COPY` 與 `ADD` 只能從 context 取得一般本機檔案；builder 也會根據這些檔案的內容與 metadata，判斷該步驟能否使用 cache。Docker 官方的 [build context 文件](https://docs.docker.com/build/concepts/context/)把 context 定義為 build 可以存取的檔案集合，而不是「Dockerfile 所在資料夾」的另一個名字。

這個差異會直接影響 `COPY` 的輸入範圍。假設 repository 長這樣：

```text
.
├── app/
├── tests/
├── evidence/
├── pyproject.toml
├── uv.lock
├── README.md
└── Dockerfile
```

當 Dockerfile 使用 `COPY . .`，builder 要考慮的就不只有 `app/`。`tests/`、`evidence/` 與 README 如果沒有被 `.dockerignore` 排除，也會留在 context，成為這次 `COPY` 的輸入。

因此第一個診斷問題不是「Docker 為什麼沒 cache」，而是：

> 第一個 cache 失效的 Dockerfile 指令，實際做了什麼事情？

如果沒辦法拆解這個問題，調換幾行指令或清掉 cache，可能只是在碰運氣。

## `.dockerignore` 排除 context 中不需要的路徑，Dockerfile 決定 cache boundary

Builder 執行 Dockerfile 前，`.dockerignore` 會把符合 pattern 的路徑從 context 排除。這項排除能減少傳輸，也能避免把 `.git`、本機 virtual environment、測試 cache 或 `.env` 帶進 build，並降低無關檔案使 cache 失效的機會。

[公開 Docker lab](https://github.com/FWcloud916/docker-containerization-lab/tree/dockerfile-layer-cache-optimization) 使用的 `.dockerignore` 排除了以下項目：

```dockerignore
.git
.github
.venv
.pytest_cache
.ruff_cache
__pycache__
*.pyc
.env
.DS_Store
tests
```

這份 `.dockerignore` 有兩個限制：它不是 secret manager，也不能修正 Dockerfile 的指令順序。

第一，`.dockerignore` 是 context filter，不是 secret manager。排除 `.env` 可以避免 `COPY` 直接把該檔案帶進 image，但不能證明其他檔案不含 secret，也無法安全提供 build 過程真正需要的 credentials。Build secret 會留到後續文章討論。

第二，`.dockerignore` 不能修正 Dockerfile 的指令順序。假設 `COPY . .` 仍包含 `app/`、README 與實驗證據，這些檔案只要有一項改變，整個 `COPY` 的 cache key 就可能改變。排除不需要的輸入，與依照變動頻率把輸入拆成不同步驟，是兩件事。

## Image layer 和 build cache 是兩個不同的概念

討論 Dockerfile 時，常用「每一行都是一層」快速描述 image 結構。但要找出哪一個 build step 為什麼沒有命中 cache，還需要再深入理解 image layer 與 build cache 的差異。

Image layer 記錄 image filesystem 相較前一層的變更。Build cache 則是 builder 用來判斷能否重用某個 build step 既有結果的紀錄。`RUN`、`COPY` 會改變 filesystem；`WORKDIR`、`ENV` 等指令也會影響 image config 或後續執行環境。診斷 cache 時，不應只計算最終 image 有幾個 filesystem layer，而要檢查 BuildKit 對每個 step 顯示的是 `CACHED` 還是重新執行。

這次實驗的 API Dockerfile 採用以下常見寫法：

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY . .
RUN python -m pip install --no-cache-dir .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

這份 Dockerfile 能成功 build，也能啟動 FastAPI、PostgreSQL 與 Nginx，但 cache boundary 的切分方式很差。Dependency install 的直接 parent 是 `COPY . .`；該 `COPY` 一旦 miss，`pip install` 就會跟著重跑，不會只根據未變的 `pyproject.toml` 沿用先前結果。

另外，`pip install --no-cache-dir` 控制的是 pip download cache 是否留在 image 中；BuildKit 是否重用整個 `RUN` step，則是不同機制。`--no-cache-dir` 不會改變 Docker build cache 的判斷方式。

## Cache key 到底看什麼

Docker 官方的 [cache invalidation 說明](https://docs.docker.com/build/cache/invalidation/)可以整理成四項原則：

1. Builder 從 base image 開始，依序為每個指令尋找可利用的 cache record。
2. Builder 處理多數指令時，會比較目前的 Dockerfile 指令與先前留下的 cache record。只要指令內容改變，或前一個 build step 的結果不同，Builder 就不會利用該 cache record。
3. `ADD`、`COPY`，以及使用 bind mount 的 `RUN --mount=type=bind`，還會根據相關檔案的 metadata 計算 checksum。
4. 某個 build step 的 cache 一旦失效，後續依賴該結果的步驟也必須重新執行。

這四項原則還有一個容易誤判的細節：Docker 官方文件明確說明，檔案的 `mtime` 不納入 `ADD`／`COPY` cache checksum。如果只更新檔案時間戳，檔案內容與其他相關 metadata 都不變，`mtime` 本身不會造成 cache miss。

這和許多人使用傳統 build tool 累積的直覺不同。檔案時間變新，不代表 Docker 一定重建；反過來，整次 build 花費的實際時間（wall time）變短，也不能取代 `--progress=plain` 顯示的 step 狀態，直接當成 cache 命中的證據。

## 用實驗觀察輸入變更如何影響 cache

實驗在同一個 FastAPI 專案與同一份 Dockerfile 上執行三種 build 情境。完整環境、程序與結果記錄在公開 repo 的 [`dockerfile-layer-cache-optimization-results.md`](https://github.com/FWcloud916/docker-containerization-lab/blob/dockerfile-layer-cache-optimization/evidence/dockerfile-layer-cache-optimization-results.md)。

實驗在 arm64 Mac 的 Colima 上執行。Docker client 版本為 29.6.2、server 為 29.2.1，Buildx 為 v0.35.0；Docker VM 使用 Ubuntu 24.04.4 LTS 與 overlayfs。每種 build 情境都使用 `--progress=plain` 顯示完整 step：

```bash
/usr/bin/time -p docker build \
  --progress=plain \
  -t docker-containerization-lab-api:<checkpoint> .
```

三個輸入情境如下：

1. 不修改任何 source，在 cache 已存在的情況下再次 build（warm build）。
2. 只執行 `touch app/main.py` 更新 `mtime`，不改變檔案內容。
3. 暫時在 `app/main.py` 加入一行 comment，但不修改 dependency declaration。

觀察結果如下：

| 情境 | `COPY . .` | `pip install` | 實際花費時間（wall time） |
|---|---|---|---:|
| 未修改輸入（warm build） | `CACHED` | `CACHED` | 2.11 秒 |
| 只更新 `mtime` | `CACHED` | `CACHED` | 1.22 秒 |
| application source 內容改變 | executed | executed（該 step 8.8 秒） | 11.32 秒 |

在上述環境與輸入條件下，實驗得到兩個可重現的結論。

第一，只更新 `mtime` 時，`COPY` 與 dependency installation 都維持 `CACHED`，結果符合 Docker 官方的 checksum 說明。

第二，只修改 application source 內容時，`COPY . .` 的 cache 先失效，後續的 `RUN python -m pip install --no-cache-dir .` 便重新執行。Dependency declaration 雖然沒有改變，卻沒有獨立的 cache boundary；該 `RUN` 接到的 parent rootfs 結果已經不同，因此無法利用原 cache record。

1.22、2.11 與 11.32 秒不能用來預測其他主機。三種 build 情境的 registry metadata lookup、CPU、disk 與網路狀態都不完全相同。其他環境可以重複驗證的是 BuildKit step 狀態：哪些 step 顯示 `CACHED`、哪些重新執行，以及第一個 cache miss 如何影響後續步驟。

## `RUN` 成功命中 cache，也可能拿到舊套件

Build cache 會重用相同輸入已經產生的結果，不會替使用者判斷套件夠不夠新。

Docker 官方文件以 `RUN apt-get -y update` 說明這個邊界。對一般 `RUN`，cache lookup 不會檢查指令在 container 內修改了哪些檔案，也不會因為時間經過一週就自動失效。只要指令內容與前一個 build step 的結果相同，Builder 就可能利用先前的 cache record。

因此，build 速度與 dependencies 是否為目前應採用的版本，是兩個不同問題。Production build 至少要分開處理以下三件事：

- 可重現性：在 build input 與必要環境條件固定時，再次 build 能得到一致的預期產物；需要控制 lockfile、base image 身分與 build input。
- 更新政策：何時更新 lockfile、base image 或 package index。
- 強制重算：經過審核後使用 `--no-cache`、`--no-cache-filter` 或改變特定 stage 的輸入。

清除全部 cache 會讓所有 build step 重新執行，可能增加 build 時間，但不會自動滿足可重現性所需的條件。反過來，所有 step 都命中 cache，也不能證明 image 已經更新。

## Cache mount 是下載最佳化，不是 runtime dependency

BuildKit 支援在 `RUN` 中使用 cache mount，例如將 package manager 的下載 cache 掛載到該 step 的指定路徑。Docker 的 [cache optimization 文件](https://docs.docker.com/build/cache/optimize/)強調，cache mount 只能影響效能；即使 cache 為空、內容遭其他 build 改寫，或遭 garbage collection 清除，build 仍必須成功。

概念上可以寫成：

```dockerfile
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install .
```

Cache mount 能降低 step 重新執行時的下載成本，但不能修正前面示範的 parent invalidation。Application source 一旦改變，`RUN` 仍會重新執行；cache mount 只讓 package manager 有機會利用既有下載內容。

最佳化應先切分正確的 cache boundary，再為不可避免的重跑加入 cache mount。順序如果反過來，build 可能稍快，但 Dockerfile 仍沒有正確表達 dependency 關係。

## 找 cache 問題，不要先執行 `docker buildx prune`

`docker buildx prune` 會移除 build cache。這個命令用來管理 cache 容量，不是診斷 cache miss。還沒找出第一個 cache 失效的 step 就先執行 prune，會讓所有步驟都變成 miss，反而消除原本要觀察的證據。

診斷 cache miss 時，可以按照以下順序檢查：

1. 使用 `--progress=plain` 顯示每個 build step 的完整結果。
2. 找出第一個沒有顯示 `CACHED` 的 Dockerfile step。
3. 確認該 step 執行的指令、前一個 build step，以及直接讀取的檔案。
4. 確認 `.dockerignore` 是否已排除不需要進入 context 的路徑。
5. 區分「source bytes 改變」「dependency declaration 改變」「base image 改變」與「刻意更新套件」四種事件。
6. 只有在驗證沒有既有 cache 的 cold build，或需要管理磁碟容量時，才清除 cache，並在測試結果中記錄清除原因。

這套順序也能避免另一種常見錯誤：為了讓 build 顯示漂亮的 `CACHED`，把真正會影響產物的檔案排除出 context，或留到 build 之外才提供。Cache hit 必須先對應正確的輸入，才有討論速度的意義。

## 找出失效邊界後，再改造 Dockerfile

這次實驗已找出最先失效的 cache boundary：`COPY . .` 同時包含 dependency metadata、application source 與其他納入 context 的檔案。後續文章會沿用相同 lab，逐步改造 production Dockerfile：

- 先複製 dependency declaration 與 lockfile，再安裝 dependencies。
- 將 application source 放在較後面的獨立 `COPY` step。
- 使用 multi-stage 分開 build tools 與 runtime。
- 比較有無 cache mount 的 build 行為與改造前後的 image size，並檢查實際檔案內容及 non-root 執行狀態。
- 確認最佳化後的 build 在 cold cache、warm cache 與只修改 source 的情境下都能成功。

Dockerfile 應正確表達 dependency 關係。Dependency installation 如果只依賴 lockfile，README 或 application source 就不應先成為該步驟的 parent。

Builder 只會根據 Dockerfile 描述的 dependency 關係，判斷能否利用既有結果。正確切分 cache boundary，build 才能兼顧速度與可解釋性，並在輸入改變時確實重跑。

## 參考資料

- [Docker Docs — Build context](https://docs.docker.com/build/concepts/context/)
- [Docker Docs — Build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [Docker Docs — Optimize cache usage in builds](https://docs.docker.com/build/cache/optimize/)
- [Docker Docs — Building best practices](https://docs.docker.com/build/building/best-practices/)
- [Docker Docs — Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [docker-containerization-lab — Dockerfile layer and cache experiment](https://github.com/FWcloud916/docker-containerization-lab/tree/dockerfile-layer-cache-optimization)

<!-- series-nav:start -->

---

**系列：Docker 與容器化工程：從原理、Dockerfile 到 Production 安全**

推薦文章：[Podman 也有 Rootless 問題嗎？Daemonless 少掉什麼風險，又留下哪些限制](https://imfw.io/posts/2026/2026-07-21-podman-rootless-production/)

<!-- series-nav:end -->
