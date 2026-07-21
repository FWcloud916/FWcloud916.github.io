---
title: Podman 也有 Rootless 問題嗎？Daemonless 少掉什麼風險，又留下哪些限制
date: 2026-07-21
tags:
  - Podman
  - Docker
  - security
  - devops
description: 從 daemon、API socket、user namespace、網路、cgroup、storage 與 systemd，比較 Rootless Podman 和 Rootless Docker 在正式環境的共同限制與關鍵差異。
---

> **查核資訊：** 本文於 2026-07-21 依 Podman 與 Docker 官方文件查核。Podman networking、Quadlet、Linux kernel 與各發行版的預設值可能變動，部署前請再次確認實際安裝版本的文件與主機設定。

上一篇談[正式環境為什麼需要 Rootless Docker](https://imfw.io/posts/2026/2026-07-21-production-rootless-docker/)後，有人問了一個很合理的問題：

> Podman 本來就主打 rootless，又沒有 Docker daemon，它還會有一樣的問題嗎？

短答案是：**有些會，有些不會。**

Podman 的 daemonless 架構，確實避開了傳統 Docker 最醒目的風險：一般使用者不必使用 `/var/run/docker.sock` 控制一個以 host root 執行的常駐 daemon。但 Rootless Podman 和 Rootless Docker 都建立在 Linux user namespace、非特權網路與 cgroup delegation 上，因此 UID/GID、低號連接埠、device、storage 與資源限制等問題仍然存在。

判斷 Podman 是否適合 production，不能只看「daemonless」這個標籤。要先把兩種問題拆開：一種來自 container engine 的架構，另一種來自 Linux rootless 本身。

## 先分清楚兩層問題

傳統 rootful Docker 的控制路徑大致是：

```text
Docker CLI
    │
    ▼
/var/run/docker.sock
    │
    ▼
dockerd（host root）
    │
    ▼
containers
```

只要使用者能操作這個 socket，就能要求 root daemon 建立 container、掛載 host 目錄或啟動高權限 workload。因此加入 `docker` group 並不是單純取得「執行 Docker」的權限，而是取得 rootful daemon 的控制權。

[Podman 官方把 Podman 定義為 daemonless container engine](https://docs.podman.io/en/latest/markdown/podman.1.html)。在 Linux 上直接執行本機 rootless Podman CLI 時，命令會以目前使用者的權限建立和管理 container，不必先把要求交給一個常駐的 root daemon：

```text
Podman CLI（一般使用者）
    │
    ▼
OCI runtime＋user namespace
    │
    ▼
containers（不超過該使用者的 host 權限）
```

![Rootful Docker、Rootless Docker 與 Rootless Podman 的權限路徑比較，顯示 root daemon、user namespace 與 daemonless 本機操作的差異。](/assets/images/podman-rootless-production-engine-privilege-paths.png)

這是實質的安全差異。如果 deployment account 被入侵，攻擊者不會因為該帳號能執行 rootless Podman，就自動取得 host root。

不過 daemonless 解決的是控制面架構，不是移除 Linux kernel 對非 root process 的限制。Rootless Podman 仍然是 rootless process，不能憑空取得 host 上原本沒有的權限。

## Rootless Podman 仍然有的六個限制

### 1. 仍需要 subordinate UID/GID

[Podman rootless 文件](https://docs.podman.io/en/latest/markdown/podman.1.html#rootless-mode)說明，rootless 使用者需要在 `/etc/subuid` 與 `/etc/subgid` 取得可用的 subordinate ID range，Podman 再利用 user namespace 映射 container 內的 UID/GID。

這會帶來和 Rootless Docker 類似的實務問題：

- 不同使用者的 subordinate range 不應重疊。
- Container 內看起來是 UID 0，不等於 host root。
- 既有 bind mount 的 ownership 可能不符合映射後的 UID/GID。
- Image 使用超出 mapping range 的高 UID/GID 時，pull、build 或啟動可能失敗。

Podman 提供 `--userns=keep-id` 等工具改善部分 volume 使用情境，但它不會自動替所有既有資料目錄找出正確的 ownership 策略。Production migration 前仍應用實際 workload 測試，不要對大範圍目錄遞迴 `chown` 或直接放寬權限。

### 2. 特權連接埠與 rootless networking 仍需設計

非 root process 預設不能直接綁定 Linux 的特權連接埠（1024 以下），Rootless Podman 也不例外。[Podman 的 rootless 限制文件](https://github.com/containers/podman/blob/main/rootless.md)建議使用 reverse proxy、firewall redirect，或經審核後調整 `net.ipv4.ip_unprivileged_port_start`。

最容易說明與稽核的 production 架構通常是：

```text
Internet
   │ 80 / 443
   ▼
host reverse proxy 或 load balancer
   │ 8080 / 8443
   ▼
rootless Podman container
```

新版 Podman 以 `pasta` 作為 rootless networking 的主要工具；rootless bridge 的連接埠轉送也可能經過 `rootlessport`。官方文件指出，不同 forwarder 對原始 client IP 的保留方式不同，部分選項仍標示為 experimental。因此不能只看到 `podman run -p 8080:80` 成功，就假設 firewall path、source IP、container-to-host 與 container-to-container 行為都和 rootful bridge 一樣。[Podman create networking](https://docs.podman.io/en/latest/markdown/podman-create.1.html#network-mode-net)

### 3. cgroup limit 不一定真的生效

Compose 或 CLI 寫了 CPU、memory、pids 與 I/O limit，不代表 kernel 一定執行了這些限制。

[Podman 的 resource limit 文件](https://docs.podman.io/en/latest/markdown/podman-update.1.html)標示，多個 CPU 與 block I/O 選項不支援 rootless cgroup v1，在部分系統上非 root 使用者也可能沒有修改資源限制的權限。Podman 的 Quadlet 同樣要求 cgroup v2。

需要嚴格 resource control 時，至少要確認：

```bash
podman info --format '{{.Host.CgroupsVersion}}'
```

接著對真實 container 製造可控制的負載，從 host cgroup 狀態或監控資料證明限制有效。設定檔存在，只能證明你提出了要求，不能證明 kernel 已 enforcement。

### 4. `--privileged` 也不會把 rootless 變成 host root

[Podman 官方文件](https://docs.podman.io/en/latest/markdown/podman-create.1.html#privileged)明確說明：位於 user namespace 的 container，無法擁有超過啟動者的權限。

這是一個安全優點，也是一個相容性邊界。即使加上 `--privileged`，rootless container 仍可能無法建立 device node、操作特定 host device、載入 kernel module，或完成需要真正 host capability 的工作。

如果 workload 必須使用 GPU、TUN/TAP、USB、FUSE 或其他 device，不應先假設「加 `--device` 就好」。要檢查啟動者的 host 權限、supplementary groups、SELinux/AppArmor policy、OCI runtime 與實際 device 行為。

### 5. Storage 不只是換一個目錄

Rootless Podman 的 image 與 container storage 預設位於使用者的 `$HOME/.local/share/containers/storage`。這讓不同使用者的 container 資料自然分開，但也讓 home filesystem 成為 production 設計的一部分。

Podman 官方指出，rootless storage 不支援直接放在 NFS、Lustre、GPFS 等不理解 user namespace 的分散式檔案系統；這類環境應把 `graphroot` 指向 local storage。較舊的 kernel 也可能需要 `fuse-overlayfs` 才能在 user namespace 使用 OverlayFS。[Podman rootless storage](https://docs.podman.io/en/latest/markdown/podman.1.html#note-unsupported-file-systems-in-rootless-mode)

因此 production 上至少要確認：

- `graphroot` 實際位於哪個 filesystem；
- 容量、inode、備份與監控是否涵蓋該路徑；
- home directory 是否有 `noexec`、`nodev` 或集中式 storage policy；
- database 與 persistent volume 如何備份，而不是只備份 image layer。

### 6. 登出與 reboot 後仍要能恢復

Daemonless 不等於 container lifecycle 會自動符合 production 需求。直接在 SSH session 執行 `podman run -d`，不代表服務一定能跨過 logout 與 reboot。

Podman 官方建議交給 systemd 管理 production container；目前的宣告式做法是 Quadlet。Rootless Quadlet 放在 `~/.config/containers/systemd/` 等 user unit 路徑，不能只在 system-wide unit 加上 `User=deployer` 就當作 rootless service。[Podman Quadlet systemd unit](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)

一個最小的 rootless Web service 可以是：

```ini
# ~/.config/containers/systemd/web.container
[Unit]
Description=Rootless web service

[Container]
Image=docker.io/library/nginx:alpine
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user start web.service
loginctl show-user "$(id -un)" -p Linger
```

正式環境應把 image pin 到已審核的 digest，並確認 user manager 是否需要使用 `loginctl enable-linger` 在沒有登入 session 時持續運作。Linger 是 host policy 變更，不應被安裝 script 靜默開啟。

## `podman.socket` 會把熟悉的 socket 風險帶回來

Podman 本機 CLI 是 daemonless，但 Podman 仍提供 API service，讓 Docker API 工具、remote client、CI 或 dashboard 透過 socket 操作它。

Rootless socket 通常位於：

```text
/run/user/<uid>/podman/podman.sock
```

Rootful socket 則通常位於：

```text
/run/podman/podman.sock
```

[Podman system service 的 security 文件](https://docs.podman.io/en/latest/markdown/podman-system-service.1.html#security)直接指出，API 會授予完整 Podman 功能，可以用 service 執行身分任意執行程式，且 API 本身沒有細粒度限制或稽核能力。

所以掛載 rootless `podman.sock` 的 container，應視為該 deployment account 的 container administrator；若接觸的是 rootful socket，風險就上升到 host root。把 socket 以 `:ro` 掛載也不會讓 API request 變成唯讀。

這裡最容易犯的錯，是為了讓既有 `docker-compose` 或 dashboard 無痛相容，就長期開啟 Podman Docker-compatible API，卻仍把「Podman 是 daemonless」當成完整的威脅模型。相容層有它的價值，但開啟後就要把 socket 當成高權限控制面保護。

## Production 應該怎麼選？

Podman 並不是「完全沒有 Rootless Docker 問題的 Docker 替代品」。更準確的定位是：它移除了常駐 root daemon 這個預設依賴，但保留了 Linux rootless 必然存在的限制。

| 情境 | 判斷 |
|---|---|
| 單機 Linux、一般 Web/API、可由 reverse proxy 接 80/443 | Rootless Podman 很適合列為預設候選 |
| 希望避免 deployment account 控制 root daemon | 本機 rootless Podman CLI 有明確架構優勢 |
| 既有工具強依賴 Docker API socket | 可以啟用 rootless `podman.socket`，但仍視為該帳號完整管理權 |
| 需要嚴格 CPU、memory 或 I/O enforcement | 先驗證 cgroup v2、delegation 與真實負載 |
| Home 位於 NFS 或平行檔案系統 | 把 Podman `graphroot` 放到 local storage，再做容量與備份設計 |
| 需要 host device、特殊網路或真正 privileged workload | 做 workload-specific review，不要強套 rootless |
| 需要 production lifecycle 與依賴管理 | 優先評估 rootless Quadlet＋systemd user service |

![Rootless Podman 正式環境驗證流程，從 workload 盤點與 host privilege 判斷，依序檢查 UID/GID、網路、cgroup、storage、service lifecycle 與外部驗證。](/assets/images/podman-rootless-production-production-verification-v2.png)

## 上線前的驗證清單

安裝成功不是完成。至少用 target user 的真實 login session 驗證：

```bash
podman info
podman unshare cat /proc/self/uid_map
podman info --format '{{.Host.CgroupsVersion}}'
podman info --format '{{.Store.GraphRoot}}'
systemctl --user status web.service
loginctl show-user "$(id -un)" -p Linger
podman run --rm docker.io/library/alpine:latest id
podman port
```

再從外部 client 測試真實服務，確認：

- 80/443 到高號連接埠的路徑符合設計；
- firewall 與 source IP 行為符合監控、rate limit 和稽核需求；
- volume 的 UID/GID、SELinux/AppArmor 與讀寫權限正確；
- resource limits 確實生效；
- 登出或 reboot 後 service 能自動恢復；
- `podman.socket` 只有在必要時啟用，且權限與暴露範圍正確。

## 收尾：Daemonless 是優勢，不是豁免證明

Rootless Podman 的確少掉傳統 rootful Docker daemon 這個高價值攻擊面，這不是行銷文字，而是權限架構上的實際差異。

但 daemonless 不會改寫 Linux 的權限規則。User namespace、低號連接埠、網路轉送、cgroup、device、storage 和 user service lifecycle，仍然要逐項驗證。若再啟用 Podman API socket，也必須把它當成該帳號的完整 container control plane。

Production 真正需要的不是「Podman 比 Docker 安全」這句結論，而是一套能回答下列問題的證據：誰能啟動 container、誰能碰 socket、container 能存取哪些 host 資料、限制是否真的生效，以及主機重啟後會回到什麼狀態。

## 參考資料

- [Podman Docs — Podman CLI and rootless mode](https://docs.podman.io/en/latest/markdown/podman.1.html)
- [Podman Docs — Podman system service and API security](https://docs.podman.io/en/latest/markdown/podman-system-service.1.html)
- [Podman Docs — Podman create networking and privileges](https://docs.podman.io/en/latest/markdown/podman-create.1.html)
- [Podman Docs — Resource limit updates](https://docs.podman.io/en/latest/markdown/podman-update.1.html)
- [Podman Docs — Quadlet and systemd units](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
- [Podman Project — Rootless limitations](https://github.com/containers/podman/blob/main/rootless.md)
- [Podman Project — Rootless tutorial](https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md)
- [Docker Docs — Rootless mode](https://docs.docker.com/engine/security/rootless/)
- [Docker Docs — Rootless mode tips](https://docs.docker.com/engine/security/rootless/tips/)
