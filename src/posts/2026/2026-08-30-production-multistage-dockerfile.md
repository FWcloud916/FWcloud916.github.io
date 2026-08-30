---
title: Production Dockerfile 最佳化：multi-stage、依賴快取與最小 runtime image
date: 2026-08-30
tags:
  - Docker
  - devops
  - security
  - automation
description: 承接 Dockerfile cache 實驗，用同一套 FastAPI lab 實作 multi-stage、lockfile-first、BuildKit cache mount 與 non-root runtime，並比較 Debian slim、Alpine、distroless 的大小、相容性與操作邊界。
---

> **查核資訊：** 本文於 2026-08-30 查核 Docker、uv 與 Distroless 官方文件，並在 arm64 Colima 環境完成實驗；使用 Docker client 29.6.2、server 29.2.1、Buildx 0.35.0 與 uv 0.11.25。文中的秒數與 image 大小只代表這台機器、這組 dependencies 和當時上游 image 的觀察結果，不是跨架構或跨專案的效能保證。

在 [Dockerfile 為什麼越改越慢？](https://imfw.io/posts/2026/2026-08-28-dockerfile-layer-cache-optimization/) 的實驗中，有一個沒優化的 Dockerfile：先 `COPY . .`，再安裝 dependencies。只要 application source 改變，dependency installation 就跟著重新執行。

找出第一個 cache 失效的 step 之後，真正的工作才開始。

Production Dockerfile 不能只追求「下一次 build 有沒有變快」。它還要回答：dependency layer 的輸入是否清楚？Build tool 是否留在 runtime？Process 以誰的身分執行？Image 換成 Alpine 或 distroless 之後，native dependency 是否真的能載入？

這篇沿用同一套 FastAPI、PostgreSQL 與 Nginx lab，把先前觀察到的 cache 問題改造成可驗證的 multi-stage build。我會先完成 Debian slim 版本，再用完全相同的 API 測試比較 Alpine 與 distroless。重點不是選出「全世界最小的 image」，而是看懂每一次縮減究竟拿掉了什麼，又增加了哪些相容性與維運成本。

## Multi-stage 要分開的是責任，不只是檔案大小

Docker 的 multi-stage build 允許一份 Dockerfile 使用多個 `FROM`。後面的 stage 可用 `COPY --from` 取用前面 stage 的產物，不必把前面 stage 的完整 filesystem 帶進最終 image。

這個機制很適合把兩種責任拆開：

- Builder stage 負責安裝 dependency tool、解析 lockfile、下載套件與建立 virtual environment。
- Runtime stage 只負責啟動應用程式，接收執行時真正需要的 artifact。

這裡的 artifact 是 `/app/.venv` 與 `/app/app`。`uv`、lockfile、`pyproject.toml`、tests，以及 builder 裡的 package cache 都不必出現在 runtime。

但 multi-stage 不是安全沙盒。它不會自動修正有漏洞的 dependency，不會阻止應用程式以 root 執行，也不會讓錯誤傳入 build 的 secret 自動變安全。它提供的是一條明確的 artifact 邊界；哪些東西跨過邊界，仍由 Dockerfile 作者決定。

## 先固定實驗輸入，再談結果

這次公開 lab 使用下列主要輸入：

| 用途 | Image 或工具 |
|---|---|
| Debian slim builder/runtime | `python:3.13-slim`，固定至實驗當下的 digest |
| Alpine builder/runtime | `python:3.13-alpine`，固定至實驗當下的 digest |
| Distroless builder | `python:3.13-slim-trixie`，與 slim 使用同一個 digest |
| Distroless runtime | `gcr.io/distroless/python3-debian13:nonroot`，固定至實驗當下的 digest |
| Dependency tool | `uv==0.11.25` |

這份 checkpoint 以 digest 鎖定同一組 image bytes。單獨寫 `python:3.13-slim` 時，tag 日後可以指向新版 image；固定 digest 後，build 不會在沒有修改 Dockerfile 的情況下默默換掉 base image。

代價也很直接：digest 不會自己取得後續安全修補。Production 流程仍要定期檢查上游更新、審核變更、更新 digest，然後重新執行測試。可重現性與更新速度是兩條不同的控制，不能只做其中一條。

## 完整 slim Dockerfile

主要版本使用 Debian slim：

```dockerfile
# syntax=docker/dockerfile:1

ARG PYTHON_IMAGE=python:3.13-slim@sha256:7ce4b6dfe35e55397b7cda544f8a13f191b7ae28dc5aad71fe664dbc9bc2623f
ARG UV_VERSION=0.11.25

FROM ${PYTHON_IMAGE} AS builder
ARG UV_VERSION

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

RUN python -m pip install --no-cache-dir "uv==${UV_VERSION}"

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,id=uv-slim,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

FROM ${PYTHON_IMAGE} AS runtime

ARG APP_UID=10001
ARG APP_GID=10001

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:${PATH}"

RUN groupadd --gid "${APP_GID}" app \
    && useradd --uid "${APP_UID}" --gid "${APP_GID}" \
        --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin app

WORKDIR /app

COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --chown=app:app app /app/app

USER app

EXPOSE 8000
CMD ["/app/.venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

這份 Dockerfile 有四條刻意建立的邊界：base image 與 tool version、dependency metadata、builder artifact，以及 runtime source。接下來逐一拆開。

## Lockfile-first 讓 dependency layer 只讀取必要輸入

前一版先 `COPY . .`，dependency installation 的 parent filesystem 因此包含 application source。新版先複製 `pyproject.toml` 與 `uv.lock`：

```dockerfile
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,id=uv-slim,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project
```

Application source 要到 runtime stage 的最後才複製。只改 `app/main.py` 時，dependency metadata 沒有改，`uv sync` 那一層就能繼續使用既有 layer cache。

`uv sync --frozen` 要求使用現有 lockfile，不在 build 中重新鎖版；`--no-dev` 不安裝 development dependency；`--no-install-project` 則先不安裝目前專案本身。組合後，dependency layer 只負責依據已提交的 lockfile 建立 production dependency environment。

這不是說所有專案都必須複製整個 virtual environment。Node.js、Go、Rust 或 Java 會有不同 artifact；Python 專案如果包含需要系統函式庫的 native extension，也必須確認 runtime 提供相容的動態函式庫。可以搬的是「已經定義並驗證的 runtime artifact」，不是任意 builder 目錄。

## Layer cache 與 cache mount 解決不同問題

`RUN --mount=type=cache` 容易和 Docker layer cache 混在一起。這兩者其實負責不同層次：

- Layer cache 決定整個 `RUN uv sync ...` 是否需要執行。
- Cache mount 在該 `RUN` 必須執行時，提供 package manager 可利用的下載或建置快取。

如果 lockfile bytes 改變，`COPY pyproject.toml uv.lock` 的結果就改變，後面的 `RUN` 必須重新執行。Cache mount 不會把這個 step 偽裝成 `CACHED`；它只讓重新執行的 uv 有機會避免再次下載相同套件。

因此 Dockerfile 的正確順序仍然是：先切好 dependency cache boundary，再加入 cache mount。Cache mount 不能補救把 application source 放在 dependency layer 前面的設計錯誤。

Cache mount 也不能成為 build 正確性的必要條件。BuildKit 可能清除它，CI 也可能在全新的 builder 上執行。Cache 為空時，build 必須仍能從 lockfile 完成；cache 存在時，只是少做重複下載。

## 實驗一：source 改變，不再拖著 dependency layer 重跑

實驗使用獨立的 `docker-container` Buildx builder，並以 `--progress=plain` 記錄每個 step。這樣不會把先前在預設 builder 的 cache 混進第一次測試。

Slim 版本的結果如下：

| 情境 | Dependency step | Source `COPY` | Wall time |
|---|---|---|---:|
| 第一次 isolated build | executed，16.4 秒 | executed | 54.99 秒 |
| 完全相同的 warm build | `CACHED` | `CACHED` | 2.46 秒 |
| 只改 application source bytes | `CACHED` | executed | 2.06 秒 |

第一次 build 包含 base image 與 Dockerfile frontend 下載，因此 54.99 秒不能拿來預測別台機器。真正對應設計目標的是 step 狀態：source bytes 改變後，`COPY app /app/app` 重新執行，但 `uv sync` 仍是 `CACHED`。

換句話說，Dockerfile 現在清楚表達「application source 依賴 production dependencies，production dependencies 不依賴 application source」。這才是 build 變快背後可解釋的原因。

## 實驗二：lockfile 改變時，cache mount 減少重複下載

第二組實驗只在 `uv.lock` 暫時加入一行合法 TOML comment，不改 dependency graph。這會改變檔案 bytes，迫使 dependency layer 重新執行，又能避免把結果混同於真正的版本更新。

| 情境 | Dependency step | 下載行為 | Wall time |
|---|---:|---|---:|
| 有 cache mount | 0.8 秒 | 15 個套件直接利用 cache，沒有重新下載 | 3.53 秒 |
| 無 cache mount | 3.4 秒 | 重新下載兩個 platform-specific binary wheels | 7.43 秒 |

無 cache mount 的 control Dockerfile 除了移除 `--mount`，其餘 slim build 邏輯相同。這個結果可以得到一個小結論：在同台主機、相同 lockfile 與已建立的 package cache 下，cache mount 降低了 lockfile layer 失效後的重複下載成本。

它沒有證明每次都會快 4 秒，也沒有證明 cache 內容可信。Dependency 完整性仍由 lockfile 的版本與 hash 驗證處理；cache mount 只是可丟棄的效能資料。

## Runtime stage 只接收兩項 artifact

Builder 做完之後，runtime stage 只執行兩個 `COPY`：

```dockerfile
COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --chown=app:app app /app/app
```

第一個 `COPY` 跨 stage 取得已建立的 virtual environment；第二個 `COPY` 才從 build context 取得 application source。這裡沒有 `COPY . .`，也沒有把 builder 的 `/root/.cache/uv` 搬過來。

實際啟動三種 runtime 後，我用 image 內的 Python 檢查 filesystem。三者都有 `/app/app`，但都沒有 `/app/uv.lock`、`/app/pyproject.toml`、`/app/tests` 或 `uv` executable。

這項檢查驗證了 artifact allowlist。Runtime 不是靠 `.dockerignore` 猜哪些檔案不需要，而是由兩個明確的 `COPY` 決定允許進入的內容。

## Non-root 要驗證實際 UID，不只看 Dockerfile 有沒有 `USER`

Slim 與 Alpine 版本建立固定 UID/GID `10001` 的 `app` 使用者，distroless 使用官方 `nonroot` variant 的 UID `65532`。三個 image 的設定與實際 process UID 都經過檢查：

| Runtime | Image 設定 | 實際 UID |
|---|---|---:|
| Debian slim | `USER app` | 10001 |
| Alpine | `USER app` | 10001 |
| Distroless | `USER nonroot` | 65532 |

固定數值 UID 的好處，是 bind mount、Kubernetes `runAsUser` 或其他 runtime policy 可以對同一個身分做明確檢查。這不代表 UID `10001` 本身具有特殊安全性；重點是 process 不以容器內 UID 0 執行，而且應用程式需要寫入的路徑與擁有者要一併設計。

Non-root 也不是 rootless container engine 的同義詞。這一層的 `USER` 限制 image 內預設 process 身分；Docker daemon 是否 rootful、user namespace 如何映射，以及 host 上誰能操作控制面，是另外的邊界。

## Debian slim、Alpine、distroless，到底差在哪裡

三種 image 都成功跑起同一個 API，不代表它們可以無條件互換。

### Debian slim：維運摩擦較低的基準

Slim 版本保留 Debian userland 與 shell，對常見 manylinux wheel、臨時診斷與既有操作工具通常比較直覺。這次最終 image 最大，約 55.9 MB，但它也提供三者中最接近 builder 的 runtime 環境。

這裡的「最大」只適用於這組 image 與 dependencies。換一個 framework、加入系統套件或改成 amd64，絕對大小與排序都可能不同。

### Alpine：體積小，但 musl 是相容性決策

Alpine 版本約 27.8 MB，是這次最小的 image。它使用 musl libc，不是 Debian 系列常見的 glibc。Python package 如果提供相符的 musllinux wheel，安裝可以很順利；如果沒有，builder 可能需要 compiler、header 與對應的 development package，runtime 也可能需要額外 shared library。

本次 `psycopg-binary` 與 `pydantic-core` 都取得可用的 Alpine wheel，API 測試也成功。這只能證明這份 lockfile 在此架構與 image 上可用，不能推出所有 Python dependency 都適合 Alpine。

因此選 Alpine 前要問的不是「它是不是比較小」，而是 dependency inventory 是否支援 musl、團隊是否能處理 native build，以及 production 診斷工具要放在哪裡。

### Distroless：縮小操作面，也拿掉臨時除錯方式

Distroless 版本約 35.2 MB，沒有 shell，也沒有 package manager。Runtime `ENTRYPOINT` 必須使用 JSON vector form，不能依賴 `/bin/sh -c` 展開字串。

這次還有一個容易踩到的細節：Distroless Python 位於 `/usr/bin/python`，官方建議使用相同 Debian 與 Python minor line 的 builder。Builder 因此先建立 `/usr/bin/python` symlink，再用這個路徑建立 virtual environment；否則把 venv 複製進 runtime 後，interpreter link 可能指向不存在的 `/usr/local/bin/python`。

實測 builder 是 Python 3.13.15，distroless runtime 是 3.13.5。兩者同屬 CPython 3.13 與 Debian 13，這次 native dependencies 也通過完整 API 測試，但「minor line 相同」不是所有 native library 都必然相容的證明。每次更新 builder、runtime 或 lockfile，都要在最終 image 內執行 import 與端到端測試。

沒有 shell 會減少某些在容器內臨時操作的路徑，也會讓 `docker exec ... sh` 失效。這是一項明確的維運取捨，不是自動取得的完整安全保證。團隊需要把診斷能力移到 logs、metrics、traces、health endpoints，或使用另外管理且不進入 production 的 debug image。

## 三種 runtime 的實測結果

本機 `docker image inspect` 與 runtime 檔案檢查得到以下結果：

| Runtime | Image size | Shell | `uv` | Build metadata | API test |
|---|---:|---|---|---|---|
| Debian slim | 55,854,805 bytes | `/usr/bin/sh` | 無 | 無 | 通過 |
| Alpine | 27,837,435 bytes | `/bin/sh` | 無 | 無 | 通過 |
| Distroless | 35,173,070 bytes | 無 | 無 | 無 | 通過 |

「Build metadata 無」指 `/app` 裡沒有 `uv.lock`、`pyproject.toml` 或 tests，不代表 image 裡完全沒有 OS metadata、Python package metadata 或其他必要檔案。

三種版本都以同一份 Compose stack 啟動。Nginx 是唯一 published port，PostgreSQL 只在 internal backend network，API healthcheck 直接呼叫 virtual environment 裡的 Python，因此不依賴 runtime 是否有 shell。每一種版本都完成以下驗證：

```text
GET  /livez  -> live
GET  /readyz -> ready
POST /items  -> 建立 id 1
GET  /items  -> 讀回剛建立的 item
```

只跑 `docker build` 不能證明最小 runtime 能工作。至少要在 final stage 檢查 interpreter、native dependency、non-root 權限、healthcheck 與真正的請求路徑。

## 怎麼選 runtime base

我會先從維運與相容性需求選擇，再把 size 當成結果之一：

| 情境 | 優先考慮 | 需要接受的代價 |
|---|---|---|
| 需要常見 glibc 相容性與較直接的診斷方式 | Debian slim | Image 可能比另外兩種大 |
| Dependencies 已驗證支援 musl，團隊也能維護 native build | Alpine | musl 相容性與套件建置成本 |
| Runtime 只需啟動單一程式，觀測與除錯流程已外部化 | Distroless | 沒有 shell/package manager，builder/runtime 配對要更嚴格 |

不要只比較壓縮後的 MB。還要比較 CVE 修補流程、base image 更新頻率、architecture support、dependency wheel、事故處理方式，以及團隊能否在沒有互動式 shell 的情況下取得足夠證據。

## Production Dockerfile 還要防哪些誤解

第一，image 小不等於漏洞少。刪除不用的檔案可以縮小攻擊面與掃描雜訊，但留下的 OS package、language runtime 與 application dependency 仍可能有漏洞。

第二，multi-stage 不會抹掉已經進入 build 系統的 secret。不要用 `ARG`、`ENV` 或一般 `COPY` 傳入 token，再期待沒有把那一層複製到 final stage 就萬事安全。需要 credential 的 build 應使用 BuildKit secret mount，並另外驗證 cache、log 與 provenance 邊界。

第三，`USER nonroot` 不會限制所有 Linux capability，也不會自動建立 read-only root filesystem。Capability、seccomp、`no-new-privileges`、read-only rootfs 與 resource limits 屬於 runtime hardening，後續文章會各自驗證。

第四，digest pinning 不是更新機制。它讓變更可見，但仍需要自動化提出更新、人工或政策審核，以及完整 rebuild 與測試。

第五，cache hit 不是 supply-chain 證據。它只能表示 builder 找到可利用的既有結果；dependency 是否來自預期來源、artifact 是否有 SBOM、provenance 與簽章，是另一套問題。

## 一份可以實際驗收的清單

完成 production Dockerfile 時，可以逐項留下證據：

1. 使用 `--progress=plain`，確認只改 source 時 dependency step 維持 `CACHED`。
2. 修改 lockfile，確認 dependency step 會重新執行，而不是誤用舊 layer。
3. 在 cache mount 為空的 builder 上執行一次，證明 cache 不是必要輸入。
4. 列出 final stage 的明確 `COPY --from` 與 context `COPY` allowlist。
5. 在 runtime 內確認 build tool、lockfile、tests 與其他不必要檔案不存在。
6. 讀取實際 process UID，確認不是 0，並測試所有需要讀寫的路徑。
7. 在 final image 裡 import native dependencies，不只在 builder 跑 unit tests。
8. 用 final image 跑 healthcheck 與至少一條完整請求路徑。
9. 記錄 base image digest，並建立後續更新與重驗流程。
10. 把 image size 當成本與攻擊面的其中一項指標，不把它當成唯一安全分數。

公開 lab 的 [`production-multistage-dockerfile` checkpoint](https://github.com/FWcloud916/docker-containerization-lab/tree/production-multistage-dockerfile) 保存 slim、Alpine、distroless、無 cache mount control、Compose overrides 與完整實驗證據。所有暫時修改都已復原，checkpoint 可以直接重跑。

## 從「build 得快」走向「知道交付了什麼」

先前的實驗找出 `COPY . .` 是第一個 cache 失效的邊界；這次則把 dependency metadata、application source 與 runtime artifact 拆成不同責任。

結果不只是 warm build 從此比較快。核心在於，我們能回答 final image 裡有什麼、沒有什麼，source 與 lockfile 各會讓哪一層重跑，以及三種 runtime base 為何不能只看大小決定。

Production Dockerfile 的價值，是把 build dependency 與交付邊界寫成能被測試的規則。當這些規則可以重現，下一步才有資格深入 OCI image：tag、manifest 與 digest 到底代表什麼，registry 傳輸的又是哪一組 bytes。

## 參考資料

- [Docker Docs — Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Docs — Optimize cache usage in builds](https://docs.docker.com/build/cache/optimize/)
- [Docker Docs — Building best practices](https://docs.docker.com/build/building/best-practices/)
- [Docker Docs — Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [uv Docs — Using uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/)
- [GoogleContainerTools/distroless — Official repository and Python examples](https://github.com/GoogleContainerTools/distroless)
- [docker-containerization-lab — Production multi-stage checkpoint](https://github.com/FWcloud916/docker-containerization-lab/tree/production-multistage-dockerfile)

<!-- series-nav:start -->

---

**系列：Docker 與容器化工程：從原理、Dockerfile 到 Production 安全**

<!-- series-nav:end -->
