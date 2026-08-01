---
title: 容器隔離模型：namespace、cgroup 與 rootfs 各管什麼
description: 把容器拆回 Linux kernel 的三個基本機制，先建立能用來除錯的心智模型。
created: 2026-08-01
updated: 2026-08-01
maturity: growing
related:
  - /notes/rootless-containers/
  - /posts/2026/2026-07-21-what-is-containerization/
  - /posts/2026/2026-07-21-production-rootless-docker/
---

容器不是縮小版 VM。比較準確的說法是：一個普通 Linux process，被幾層 kernel 機制限制了視野、資源與檔案系統。

- **namespace** 決定 process 看得到什麼。PID namespace 讓容器裡的 process 清單變窄，network namespace 讓網路介面與連接埠空間分開，user namespace 則讓容器內的 root 在 host 上仍只是普通帳號。
- **cgroup** 決定 process 用得了多少。CPU、記憶體與其他資源限制，是對 process 群組施加的上限，不是替容器變出一台新的機器。
- **rootfs** 決定 process 眼中的 `/` 長什麼樣子。它換的是檔案系統視角，host kernel 仍然是同一個。

除錯時先問「是哪一層的邊界出了問題」，通常比先換 Docker 或 Podman 指令有用：看得到卻不能用，常是 cgroup 或權限；看不到，常是 namespace；檔案路徑不對，才回頭看 rootfs。

這張地圖不等於完整的容器安全模型。capability、seccomp、SELinux／AppArmor、runtime 與網路設定都會再加邊界；它只是讓那些細節有地方可掛上去。

詳細的原生 Linux 示範與 Docker／Podman 架構比較，請讀[什麼是容器化](/posts/2026/2026-07-21-what-is-containerization/)；Rootless 的權限含義則接著看[Rootless 容器](/notes/rootless-containers/)。
