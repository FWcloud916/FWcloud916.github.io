---
title: Docker - 基本概念
date: 2020-02-16
updated: 2026-07-13
tags:
  - Docker
  - w3HexSchool
description: Docker container、image 與 VM 的差異，以及容器化為什麼能讓開發環境更一致。
---

Docker 把應用程式和它需要的檔案、函式庫及設定包成 image，再以隔離的 container process 執行。它比完整 VM 輕量、啟動快，也容易在開發機、CI 和正式環境重現；但 container 通常與 host 共用 kernel，隔離模型和 VM 不相同。

> 本文於 2026 年 7 月 13 日依目前 Docker 文件重新查核。不同作業系統上的 Docker Desktop 會使用虛擬化層，因此「與 host 共用 kernel」需要依實際平台理解。

## 為什麼需要一致的開發環境

建立一個 Web Service 可能同時需要 Linux、Web server、資料庫和語言 runtime。直接把所有依賴裝在每位開發者的電腦上，容易遇到版本不一致、套件互相影響，以及「我的電腦可以跑」的問題。

Container 讓每個服務以自己的隔離 process 執行，並由 image 定義執行時需要的檔案與設定。團隊可以在開發機、CI 和部署環境使用同一份 image，減少環境漂移。

## Container 和 VM 的差異

| 比較 | Container | Virtual machine |
|------|-----------|-----------------|
| 隔離單位 | Process 與相關 namespace／resource | 完整 guest OS |
| Kernel | 通常與 host 或虛擬化層共用 | Guest OS 有自己的 kernel |
| 啟動與體積 | 通常較快、較小 | 通常較慢、較大 |
| 適合情境 | 打包與執行應用服務 | 需要完整 OS 或較強邊界的工作負載 |

在 macOS 或 Windows 使用 Docker Desktop 時，Linux container 實際上會跑在輕量 Linux VM 裡；因此不是直接拿 macOS 或 Windows kernel 執行 Linux container。

## Docker 的核心物件

- **Dockerfile**：描述如何建置 image 的文字檔。
- **Image**：包含執行 container 所需檔案、函式庫與設定的唯讀分層套件。
- **Container**：由 image 建立並正在執行或已停止的實例。
- **Registry**：儲存和分發 image 的服務，例如 Docker Hub。

最簡化的流程是：撰寫 Dockerfile → build image → run container。

## Docker 帶來的優勢

### 重現環境

同一份 Dockerfile 與鎖定版本的 base image，可以建立可重複的應用環境。若需要完全固定內容，正式環境還可使用 image digest，而不只依賴會移動的 tag。

### 快速交付與回滾

image 可以經 registry 分發；部署與回滾時切換 image 版本，不必在伺服器上逐項重裝依賴。

### 提高資源使用效率

container 不需要為每個服務啟動完整 guest OS，通常能比 VM 更快啟動並使用更少額外資源。不過安全性、網路、儲存與資源限制仍需要明確設定，不能把 container 當成天然安全邊界。

## 下一步

按照 [Docker 基礎學習路線](/posts/2026/2026-07-13-docker-basics-guide/)繼續閱讀：

1. [Docker Container 基本概念](/posts/2020/2020-02-22-docker-basic-container/)
2. [Docker Image 基本概念](/posts/2020/2020-03-08-docker-basic-image/)
3. [Dockerfile 基本概念](/posts/2020/2020-03-15-docker-basic-dockerfile/)

## 官方參考資料

- [Docker：What is a container?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)
- [Docker：What is an image?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/)
