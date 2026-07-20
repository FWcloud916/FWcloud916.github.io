---
title: 正式環境為什麼需要 Rootless Docker？從 root 權限風險到可驗證部署
date: 2026-07-21
tags:
  - Docker
  - security
  - devops
  - ai
  - agent-skills
description: 從 Docker daemon、socket 與 user namespace 的權限邊界，說明正式環境採用 Rootless Docker 的價值、限制，以及如何用 skill-rootless-docker 安全完成盤點、安裝、遷移與驗證。
---

> **查核資訊：** 本文於 2026-07-21 依 Docker 官方文件與 `skill-rootless-docker` 專案內容查核。Docker 支援版本、套件庫指令與各 Linux 發行版的安全限制可能變動，實際修改主機前請再次確認官方文件。

很多 Docker 教學都會把這行指令列為安裝後的第一件事：

```bash
sudo usermod -aG docker "$USER"
```

登出再登入，之後執行 `docker compose up -d` 就不用一直輸入 `sudo`。操作變方便了，看起來也像是「讓一般使用者管理 Docker」。

問題是，**不用輸入 `sudo`，不代表你沒有 root 權限**。

[Docker 官方的 Linux post-installation 文件](https://docs.docker.com/engine/install/linux-postinstall/)直接警告：`docker` group 會授予使用者 root-level privileges。原因不是群組名稱特別危險，而是傳統 Docker Engine 的 daemon 本身以 root 執行；只要能控制它的 socket，就能要求它建立容器、掛載 host 路徑、操作網路與啟動高權限 workload。

在自己的開發機上，這個取捨有時可以接受。但到了長時間對外服務、保存正式資料，而且可能被 CI/CD 或管理工具操作的 production host，這條權限捷徑值得重新檢查。

我把這套檢查、安裝、遷移與驗證流程整理成 [`skill-rootless-docker`](https://github.com/FWcloud916/skill-rootless-docker)。它的目標不只是把 Rootless Docker 裝起來，而是避免 agent 在沒有盤點 workload、沒有說明影響、也沒有 rollback 的情況下，直接改掉一台正式主機。

這篇先回答最重要的問題：Rootless Docker 究竟降低了什麼風險？哪些 production workload 適合用？又要怎麼確認它真的部署完成，而不只是 installer 顯示 success？

## 問題不在 `sudo`，而在 daemon 的權限

Docker CLI 並不直接建立 container。當你執行 `docker run` 或 `docker compose up`，CLI 會透過 Docker API 把要求送給 daemon，再由 daemon 執行真正的工作。

傳統 rootful Docker 的關係大致是：

```text
developer / deployer
        │ Docker CLI
        ▼
/var/run/docker.sock
        │
        ▼
dockerd（host root）
        │
        └─ 建立 containers、掛載 host 路徑、設定網路與 cgroup
```

Unix socket 可以限制「誰能連線」，卻不會把連線後能呼叫的 Docker API 自動變成低權限版本。[Docker Engine security 文件](https://docs.docker.com/engine/security/)也特別舉例：能控制 daemon 的使用者，可以啟動一個把 host `/` 掛進 container 的 workload，進而修改 host filesystem。

因此，把 deployment account 加進 `docker` group，本質上不是授予「部署這個 app」的權限，而是授予「控制 rootful daemon」的權限。差距非常大。

這也解釋了另一個常見誤會：

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

`:ro` 只讓 container 不能改寫 socket 這個 filesystem entry，不會把送進 socket 的 `POST /containers/create` 等 API request 變成唯讀。只要應用程式能對 socket 發出有效要求，它仍然可以控制 daemon。若某個 dashboard、CI runner 或自動更新工具真的需要 Docker API，必須把它視為 daemon administrator；只需要少量操作時，應考慮有 allowlist 的 socket proxy，而不是因為寫了 `:ro` 就當作風險消失。

## Rootless Docker 改變了哪一層？

[Docker 的 Rootless mode](https://docs.docker.com/engine/security/rootless/) 會把 Docker daemon 和 containers 一起放進 user namespace，兩者都不以 host root 執行。

```text
deployer（一般使用者）
        │ Docker CLI / rootless context
        ▼
/run/user/<uid>/docker.sock
        │
        ▼
dockerd（由 deployer 擁有，位於 user namespace）
        │
        └─ containers（仍受同一個非 root 權限邊界限制）
```

{% image "src/assets/images/production-rootless-docker-privilege-model.png", "Rootful Docker 與 Rootless Docker 的權限邊界比較，顯示 socket、daemon 與 container 在 host root 或非 root user namespace 下的差異。", "(min-width: 30em) 50vw, 100vw" %}

user namespace 會把 container 看到的 UID/GID 映射到 host 上的一段 subordinate IDs。Container 裡的 process 可以看起來是 UID 0，但那個 UID 0 不等於 host 的 UID 0。

Rootless Docker 需要 `newuidmap`、`newgidmap`，而且目標使用者在 `/etc/subuid` 與 `/etc/subgid` 都要有至少 65,536 個 subordinate IDs。這些 range 不能靠複製教學裡常見的 `100000:65536` 隨便填；正式主機可能已有其他使用者、container runtime 或集中式身分管理配置，重疊的 range 必須先排除。

### 它和「container 內不用 root」不同

在 Dockerfile 寫 `USER app` 是很好的做法，但它只控制 container 內應用程式用哪個帳號執行。若背後仍是 rootful daemon，daemon 本身依然持有 host root 權限。

兩者應該疊加，而不是二選一：

- Container 內使用 non-root user，降低應用程式被入侵後能做的事。
- Docker daemon 使用 rootless mode，降低 daemon 或 runtime 邊界被突破後對 host 的影響。
- 再搭配最小 capabilities、seccomp、唯讀 filesystem、secrets 管理、image 更新與網路限制。

### 它和 `userns-remap` 也不同

[`userns-remap`](https://docs.docker.com/engine/security/userns-remap/) 同樣會重新映射 container 內的 UID/GID，但 Docker 官方文件指出，這個模式下 daemon 仍以 root 執行。Rootless mode 則連 daemon 本身都不持有 root 權限。

所以兩者處理的是不同深度的邊界：`userns-remap` 主要降低 container process 對 host UID 的權限；rootless 更進一步移除 daemon 的 host root 身分。

## 為什麼 production 特別需要評估 rootless？

我不會說每一台 production host 都能無條件改成 rootless。Kubernetes node、需要 host device 的 workload、複雜網路設備或依賴特定 kernel controller 的服務，都需要另外設計。

但對常見的「一台 Linux VM 加 Docker Compose」部署，Rootless Docker 應該從額外 hardening 選項，提升為預設評估項。

### 1. Production 的暴露時間與資料價值都更高

開發機可能只在工作時啟動，資料也能重建；production daemon 則長時間執行、接收外部流量、掛載 persistent volumes，還可能保存 database、上傳檔案與 deployment credentials。

Rootless 不會修掉應用程式漏洞，但當攻擊鏈跨過 container 或 Docker runtime 邊界時，daemon 沒有 host root 身分，能減少攻擊者直接取得整台主機最高權限的機會。這是 defense in depth：它不假設上一層永遠不會失敗，而是限制失敗之後的 blast radius。

### 2. Deployment account 不必同時成為系統管理員

理想的 production 權限分工是：

- administrator 負責套件、kernel、firewall、SSH 與 system service；
- `deployer` 負責自己的 rootless daemon 與 applications；
- application account 只取得執行服務需要的檔案與 secret。

日常部署因此不必使用 `sudo`，也不必讓 `deployer` 加入 rootful `docker` group。真的需要 host-level 變更時，再由獨立 administrator 執行一組已審核、可 rollback 的命令。

這個差異在自動化環境尤其重要。CI credential 外洩時，如果它只能控制某個 deployment account 的 rootless daemon，和它能控制 host root daemon，是兩種完全不同的事故範圍。

### 3. 權限邊界會變得更容易說明與稽核

Rootless daemon 的 socket 通常位於 `/run/user/<uid>/docker.sock`，資料預設放在 `~/.local/share/docker`，設定則位於 `~/.config/docker`。Service 由 `systemctl --user` 管理。

這讓「誰擁有 daemon、誰能連 socket、資料放在哪裡、服務如何啟動」都能對應到一個明確的 Linux account。比起所有 deployment automation 共用 `/var/run/docker.sock`，權限模型更容易被檢查。

不過別把 rootless socket 當成普通 IPC。拿到它的人依然能控制該使用者的所有 rootless containers，也可能讀到 containers 能存取的 secrets 與 bind mounts。Rootless 降低的是 host privilege，不是把 daemon API 變成低風險 API。

## 為什麼我把流程做成一個 skill？

Rootless Docker 的安裝命令不長，真正麻煩的是命令前後的決策。

- 主機是不是原生 Linux，而且以 systemd 運作？
- 要沿用既有 account，還是建立專用 `deployer`？
- 目前有沒有 rootful containers、volumes 或 systemd services？
- 新舊 daemon 要 coexist，還是正式 migration？
- Workload 是否依賴 80/443、Docker socket、bind mounts、devices 或嚴格的 cgroup limits？
- User service 能不能跨過 logout，並在 reboot 後自動啟動？

如果 agent 一看到「幫我裝 Rootless Docker」就直接跑安裝，很容易把 audit 變成 mutation，甚至停掉還在提供服務的 rootful daemon。

[`rootless-docker-setup`](https://github.com/FWcloud916/skill-rootless-docker) 把工作拆成固定順序：

1. **Read-only preflight**：先收集 host 與 target user 狀態，不安裝套件、不用 `sudo`、不修改 service。
2. **Change plan**：把已正確、必要、可選與不相容項目分開，列出命令、影響與 rollback。
3. **Explicit approvals**：套件、daemon migration、networking、access hardening 分組確認。
4. **Target-user installation**：setup tool 一律由真正的 non-root login session 執行。
5. **End-to-end validation**：檢查 context、socket、process owner、Compose、user service、linger、container 與對外連接埠。

{% image "src/assets/images/production-rootless-docker-deployment-workflow.png", "Rootless Docker 安全部署流程，從只讀 preflight、變更計畫、明確核准、目標使用者安裝到端對端驗證，失敗時停止診斷或回滾。", "(min-width: 30em) 50vw, 100vw" %}

可以透過 `skills` CLI 安裝：

```bash
npx skills add FWcloud916/skill-rootless-docker \
  --skill rootless-docker-setup
```

或安裝成 Codex plugin：

```bash
codex plugin marketplace add FWcloud916/skill-rootless-docker
codex plugin add rootless-docker@fwcloud916
```

接著不要一開始就要求它安裝，先要求 audit：

```text
Use $rootless-docker-setup to audit this Ubuntu host for rootless Docker
readiness for user deployer. Do not change the host.
```

這句 `Do not change the host` 並不是因為 skill 本身沒有安全規則，而是讓任務意圖再次變得明確：現在是盤點，不是安裝。

## 一條適合 Ubuntu production 的落地路線

以下不是可以直接複製到任何主機的萬用 script，而是一條變更順序。套件庫與支援版本會變動，實際安裝前仍要以 [Docker 官方 Ubuntu 文件](https://docs.docker.com/engine/install/ubuntu/) 為準。

### 第一步：選定 account 與 migration 策略

先指定一個 non-root account，例如 `deployer`。如果現有帳號已符合權限隔離目標，可以直接沿用；建立新帳號、安裝 SSH key 或移除 sudo 都是獨立的 access change，不能和 Docker 安裝一起默默完成。

接著明確選擇：

- **Fresh setup**：主機沒有既有 Docker workload。
- **Coexistence**：rootful 與 rootless daemon 暫時並存，靠 Docker context 明確選擇。
- **Migration**：盤點並停妥既有 workload 後，停用 rootful `docker.service` 與 `docker.socket`。

Migration 前至少要從 administrator context 盤點：

```bash
sudo docker ps -a
sudo docker image ls
sudo docker volume ls
sudo docker network ls
sudo systemctl list-dependencies --reverse docker.service
sudo ss -lntup
```

這些是 read-only inventory，但因為會使用 `sudo`，仍應讓主機擁有者先看到命令與目的。還要搜尋 deployment scripts、CI 與其他 system services 是否寫死 `/var/run/docker.sock`。

不要把 rootful `/var/lib/docker` 直接搬進 `~/.local/share/docker`，也不要在「migration」名義下刪除舊資料。Image 可以重拉，volume 與 database 則需要 workload-specific 的備份和搬遷方案。

### 第二步：跑 read-only preflight

Skill 內附的 `preflight.sh` 會要求明確 target user：

```bash
bash scripts/preflight.sh --user deployer
```

輸出使用 `check.<name>=<status>:<detail>` 格式，最後會得到：

- `overall=ready`：基礎條件齊全；
- `overall=needs-attention`：有缺少套件、subordinate IDs、cgroup 或衝突狀態；
- `overall=unsupported`：host class 不在 skill 支援範圍。

它會檢查 distribution、systemd、target account、`newuidmap`、`newgidmap`、subordinate IDs、rootful units 與 socket、rootless context、user socket、linger、cgroup v2、AppArmor/SELinux、firewall tools，以及特權連接埠（1024 以下）的使用政策。

`needs-attention` 不是「可以加 `--force` 跳過」，而是 change plan 的輸入。每個 attention 都要先判斷它是安裝前提、workload-specific 限制，還是刻意保留的 coexistence 狀態。

### 第三步：準備官方套件與 rootless prerequisites

Ubuntu 通常需要 `uidmap`、`dbus-user-session`、`slirp4netns`、`fuse-overlayfs`，以及 Docker 官方套件中的 `docker-ce-rootless-extras`。後者提供 `dockerd-rootless-setuptool.sh` 與所需整合。

新增 apt repository、安裝或移除套件都會修改 host，必須先展示：

- 完整命令與 repository URL；
- 會新增或移除哪些 packages；
- 是否可能自動啟動 rootful Docker；
- 失敗與 rollback 方式。

套件安裝完成後要立刻檢查 `docker.service` 和 `docker.socket`。Ubuntu 的 Docker packages 可能啟動 rootful system service；這不代表應該馬上停掉它，而是要回到前面核准過的 coexistence 或 migration 決策。

也不要為了方便改用 `curl ... | sh`。Skill 優先採用 Docker 的 signed distribution packages；只有 packages 路徑不可行時，才下載官方 standalone installer 到具名檔案，讓使用者檢查後另行批准。

Ubuntu、Debian 與 Fedora 的整體流程相同，但不要混用 package commands：

| Distribution | Rootless prerequisites 重點 | 安裝前特別確認 |
|---|---|---|
| Ubuntu | `uidmap`、`dbus-user-session`、`slirp4netns`、`fuse-overlayfs` | 新版 Ubuntu 的 unprivileged user namespace 與 AppArmor 狀態 |
| Debian | 與 Ubuntu 類似，使用 Debian 專屬 Docker repository | Derivative distribution 不能自行假設能沿用 Debian codename |
| Fedora | `newuidmap`、`newgidmap` 通常由 `shadow-utils` 提供，另檢查 `slirp4netns`、`fuse-overlayfs`、`iptables` | DNF command 版本、repository signing key 與 SELinux 狀態 |

實際命令應分別回到 Docker 官方的 [Ubuntu](https://docs.docker.com/engine/install/ubuntu/)、[Debian](https://docs.docker.com/engine/install/debian/) 或 [Fedora](https://docs.docker.com/engine/install/fedora/) 文件核對。Skill 也只會在 preflight 確認 `ID` 後載入對應 reference，不會把 Debian derivative 或其他 RPM distribution 當成等價環境。

### 第四步：用 target user 的真實 login session 安裝

Rootless service 不是一個寫了 `User=deployer` 的 system-wide service。Docker 官方的 [Rootless tips](https://docs.docker.com/engine/security/rootless/tips/) 明確說明，這種模式不受支援。

應透過 SSH 或真正的 login session 進入 target user，先確認環境，再執行 setup：

```bash
whoami
id -u
printf 'HOME=%s\nXDG_RUNTIME_DIR=%s\n' "$HOME" "$XDG_RUNTIME_DIR"
dockerd-rootless-setuptool.sh check
dockerd-rootless-setuptool.sh install
```

正常情況下，setup tool 會建立 `rootless` Docker context 與 user service。優先使用 context：

```bash
docker context use rootless
docker context inspect rootless
```

只有不支援 context 的程式才設定：

```bash
export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/docker.sock"
```

不要把 `DOCKER_HOST` 無條件寫進全域 shell 設定，否則它會覆蓋 context selection，之後在 rootful/rootless coexistence 或操作其他 remote context 時很容易連錯 daemon。

### 第五步：讓 service 跨過 logout 與 reboot

Production service 不能在 `deployer` 登出後跟著消失。先說明 user lingering 會讓該帳號的 user manager 在沒有登入 session 時持續存在，取得核准後，由 administrator 執行：

```bash
sudo loginctl enable-linger deployer
```

再由 `deployer` 執行：

```bash
systemctl --user enable --now docker.service
```

這兩個動作分屬 host policy 與 user service lifecycle，不要因為常被寫在同一段教學裡，就當成同一個無須說明的步驟。

### 第六步：處理 80/443 特權連接埠與 firewall

Rootless process 預設不能直接綁定特權連接埠。最單純的設計是讓 container 發布 8080/8443，再由 host reverse proxy 或外部 load balancer 接 80/443。

如果 rootless daemon 必須直接發布 80/443，Docker 文件提供兩類做法：

- 調低 `net.ipv4.ip_unprivileged_port_start`：影響 host 上所有 unprivileged processes，範圍較大。
- 對實際的 RootlessKit binary 設定 `CAP_NET_BIND_SERVICE`：範圍較窄，但 package upgrade 後可能需要重新檢查。

兩者都不是 base installation 的附帶步驟。要先確認需求、顯示 persistent config 或 binary path、取得 approval，再修改 sysctl 或 capability。

Firewall 也一樣。偵測到 `ufw`、`firewalld`、`nft` 或 `iptables`，不等於它正在管理這台主機，更不代表可以自動開放 80/443。應先讀取現有 policy，只新增實際需要、來源範圍最小的規則，最後從外部 client 驗證。

## Installer 顯示成功，還不算完成

正式環境最常見的錯誤，是看到 `dockerd-rootless-setuptool.sh install` exit code 0 就宣布完成。

至少要在 target user 的 login session 驗證：

```bash
docker context show
docker info
docker compose version
systemctl --user is-enabled docker.service
systemctl --user is-active docker.service
loginctl show-user "$(id -un)" -p Linger
pgrep -u "$(id -u)" -af 'dockerd|rootlesskit'
docker run --rm hello-world
```

重點不是每個 command 都「有輸出」，而是證據彼此一致：

- active context 指向 rootless user socket；
- `docker info` 的 Security Options 包含 `rootless`；
- daemon process 屬於 target user；
- Compose 可用；
- user service 已 enable 且 active；
- linger 符合 reboot 後啟動需求；
- 實際 container 能執行；
- 對外連接埠能通過預期的 firewall path；
- rootful daemon 是刻意停用，或刻意 coexist。

最好再做一次真實的 login boundary 或 reboot 驗證。否則你測到的可能只是當前 shell 留下來的環境，不是能在主機重啟後自動恢復的 production service。

## Rootless 的代價與不適用情境

Rootless 是更小的 host privilege，不是免費且透明的相容模式。

### cgroup resource limits 可能沒有完整生效

[Docker 官方的 Rootless tips](https://docs.docker.com/engine/security/rootless/tips/)說明，rootless mode 的 `--cpus`、`--memory`、`--pids-limit` 等 cgroup flags，需要 cgroup v2 與 systemd。即使條件成立，預設也可能只 delegation 部分 controllers。

因此 `docker compose.yml` 寫了 limit 不等於 kernel 真的 enforcement。需要 CPU、cpuset、I/O、memory 或 pids 控制的 workload，要檢查 `docker info`、可用 controllers 與 user service delegation。Docker 若警告某個 limit 被忽略，就不能把它列為已完成的 production guardrail。

### Bind mount 會遇到 UID/GID mapping

Container 內的 UID/GID 映射到 subordinate range 後，既有 host directory 的 ownership 可能不再符合預期。修正時應針對 workload 真正使用的窄路徑處理，不要為了讓 container 寫入，對大範圍目錄遞迴 `chown` 或開放權限。

### 特殊網路、device 與 orchestration 要另外評估

Rootless networking、特權連接埠、host firewall、device access 和嚴格 resource controls 都可能需要額外整合。Docker Desktop、沒有適當 systemd user session 的 WSL、non-systemd 或 immutable hosts，也不適合直接照這篇的 service 流程操作。

Kubernetes 與多節點 orchestration 更不是「把每台 host 改成 Rootless Docker」就完成。它們有自己的 runtime、node privilege、networking、storage 與 workload security model，應另做平台層級的設計。

### Rootless 也不會阻止 target user 傷害自己的資料

如果 `deployer` 本來就能寫入 `/srv/my-app/data`，那麼由它擁有的 rootless containers 也可能透過核准的 bind mount 修改這些資料。攻擊者拿到 rootless socket 後，仍能操作這個 daemon 及其可存取資源。

所以最精準的說法不是「Rootless Docker 讓 container 變安全」，而是：

> Rootless Docker 把 Docker daemon 與 containers 從 host root 權限移開，讓一層安全控制失敗時，不必直接等同整台主機最高權限失守。

## 一張 production 決策表

| 情境 | 建議 |
|---|---|
| 單機 Linux VM、Docker Compose、一般 Web/API/DB | 優先評估 rootless，通常是很好的預設 |
| 可由 reverse proxy 接 80/443 | Rootless 很適合，container 使用 host 上的高號連接埠 |
| 既有 rootful workload 正在服務 | 先 inventory，選 coexistence 或分階段 migration |
| CI 或 dashboard 需要 Docker socket | 仍視為 daemon admin；限制 account、socket 與可掛載資料 |
| 嚴格 CPU/I/O limits | 先驗證 cgroup v2 與 controller delegation |
| 大量既有 bind mounts | 先測 UID/GID mapping 與 ownership |
| 需要 host devices、特殊 networking 或 privileged workload | 不要強套，改做 workload-specific security review |
| Kubernetes、多節點或非 systemd host | 不套用本文流程，使用平台專屬設計 |

## 收尾：把 rootless 當成預設問題，而不是預設答案

正式環境要問的，不應只是「Docker 有沒有跑起來」，而是「這個 daemon 為什麼需要 host root？」

如果答案只是因為安裝教學一直這樣做，那就值得跑一次 read-only audit，盤點實際需求。對一般的單機 Linux 與 Docker Compose 部署，Rootless Docker 往往能用可接受的整合成本，換到更清楚的 account boundary 與更小的 host blast radius。

但別跳過限制，也別把 migration 當成一條停服務的指令。先 inventory、把 privileged changes 分組、逐項確認 rollback，最後用 context、socket、process owner、service lifecycle 與真實 workload 證明它能在 production 運作。

這正是 `skill-rootless-docker` 想固定下來的流程：不是讓 agent 更快取得 root，而是讓它知道什麼時候不該碰 root。

## 參考資料

- [Docker Docs — Rootless mode](https://docs.docker.com/engine/security/rootless/)
- [Docker Docs — Rootless mode tips](https://docs.docker.com/engine/security/rootless/tips/)
- [Docker Docs — Rootless mode troubleshooting](https://docs.docker.com/engine/security/rootless/troubleshoot/)
- [Docker Docs — Docker Engine security](https://docs.docker.com/engine/security/)
- [Docker Docs — Linux post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/)
- [Docker Docs — Isolate containers with a user namespace](https://docs.docker.com/engine/security/userns-remap/)
- [Docker Docs — Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [skill-rootless-docker — GitHub repository](https://github.com/FWcloud916/skill-rootless-docker)
