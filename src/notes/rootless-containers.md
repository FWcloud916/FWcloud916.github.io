---
title: Rootless 容器：少掉 root daemon，不代表沒有權限限制
description: Rootless 讓容器內的 root 在 host 上仍以普通帳號運作，但不會讓 Linux 的權限邊界消失。
created: 2026-08-01
updated: 2026-08-01
maturity: growing
related:
  - /notes/container-isolation-model/
  - /posts/2026/2026-07-21-production-rootless-docker/
  - /posts/2026/2026-07-21-podman-rootless-production/
---

Rootless 的核心不是「容器裡沒有 root」，而是容器裡的 UID 0 不等於 host 的 UID 0。user namespace 讓 process 在自己的視角看起來像 root，但在 host 上仍受原本帳號的權限限制。

這會移除一條很直接的風險路徑：不必讓常駐 daemon 或容器管理服務以 host root 身分處理所有請求。但它沒有解決所有正式環境問題。低號連接埠、檔案擁有者、網路模式、cgroup delegation、storage 與 systemd 生命週期，仍可能成為真正的阻塞點。

所以 Rootless 不是安全勳章，而是一組權限邊界。評估部署時要把「降低誰能直接碰到 host root」與「工作負載能不能完整運作」分開驗證；前者驗證成立，不代表後者自然成立。

先用[容器隔離模型](/notes/container-isolation-model/)定位 user namespace，再比較[Rootless Docker](/posts/2026/2026-07-21-production-rootless-docker/)與[Rootless Podman](/posts/2026/2026-07-21-podman-rootless-production/)各自留下的限制。
