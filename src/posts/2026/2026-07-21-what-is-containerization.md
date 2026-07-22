---
title: Docker 與 Podman 要達成的是同一件事：什麼是容器化
date: 2026-07-21
tags:
  - Docker
  - Podman
  - devops
description: 容器不是縮小版 VM，而是被 namespaces、cgroups 與 rootfs 限制的普通 Linux process。本文用原生 Linux 命令手工做出一個容器，再回頭解釋 Docker 與 Podman 各自用什麼架構達成同一個 OCI 目標。
---

> **查核資訊：** 本文於 2026-07-21 依 Linux man pages（namespaces(7)、cgroups(7)、unshare(1)）、OCI 規格 repo 與 Docker／Podman 官方文件查核。文中版本資訊（Docker Engine 29.x、Podman 6.0.x、OCI runtime-spec v1.3.0、image-spec v1.1.1）與各工具預設行為可能隨新版本變動；示範命令以使用 cgroups v2 的 Linux 環境為準。

每天 `docker run` 或 `podman run`，卻說不清楚容器跟 VM 差在哪、image 的 layer 是什麼、namespace 又隔離了什麼——這是很多工程師的共同狀態。工具太好用，把底層藏得太乾淨。

這篇文章要補的就是那個心智模型。我們會用原生 Linux 命令手工做出一個「容器」，親眼看到容器其實只是一個被限制的普通 process；再回頭看 Docker 與 Podman 這兩套工具，各自用什麼架構達成同一個目標。懂了這一層，日常那些「進不去、砍不掉、限制沒生效」的除錯會突然變簡單。

## 容器化到底在解決什麼

先把目標說清楚。容器化（containerization）要解決的是三個綁在一起的老問題：

1. **打包（image）**：應用程式連同它依賴的 library、設定與工具，包成一份可以帶著走的檔案系統快照。解決「在我機器上可以跑」的環境飄移問題。
2. **隔離（runtime）**：讓同一台主機上的多個應用互不干擾——看不到彼此的 process、檔案與網路，也搶不走彼此的記憶體與 CPU。
3. **分發（registry）**：打包好的東西要能推上去、拉下來、驗證內容沒被動過，部署才能自動化。

這三件事在容器出現前都有各自的解法：打包靠 deb／rpm 或 VM image，隔離靠 VM 或乖乖約定，分發靠套件庫或檔案伺服器。2013 年 Docker 開源後真正的貢獻，是把三件事整合成一組順手的工作流程：`docker build`、`docker run`、`docker push`。Podman 後來走進同一個戰場，目標完全相同，只是架構選擇不同——這是文章後半段的主題。

但不管哪套工具，底下做隔離的機制都不是它們發明的，而是 Linux kernel 本來就有的功能。所以先把工具放一邊，直接跟 kernel 打交道。

## 容器不是 VM：它是一個被限制的 process

最常見的誤解是把容器當成「輕量 VM」。這個比喻在架構圖上看起來成立，在機制上完全不成立。

VM 虛擬的是硬體：hypervisor 模擬出 CPU、記憶體與磁碟，上面跑一個完整的 guest OS，有自己的 kernel。容器沒有這些——容器裡的 process 就直接跑在 host 的 kernel 上，只是 kernel 限制了它「看得到什麼」與「用得了多少」。

|  | VM | 容器 |
|---|---|---|
| 隔離單位 | 整台虛擬機器（虛擬硬體 + guest OS） | process（或一組 process） |
| kernel | 每台 VM 自己一份 | 全部共用 host kernel |
| 啟動時間 | 秒到分鐘（要開機） | 毫秒到秒（只是 fork process） |
| 資源開銷 | 每台 VM 固定吃掉一份 OS 的記憶體 | 接近原生 process |
| 隔離強度 | 硬體層邊界，較強 | kernel 層邊界，取決於設定 |

![VM 與容器的分層比較：VM 在 Hypervisor 上各自帶一份 Guest OS kernel；容器全部共用 host 的 Linux kernel，以 namespaces 與 cgroups 隔離](/assets/images/what-is-containerization-vm-vs-container-layers-v2.png)

不用背這張表，host 上直接驗證就好。起一個容器，然後在 **host** 上找它：

```bash
docker run -d --name web nginx
ps aux | grep nginx
```

host 的 `ps` 看得到容器裡的 nginx process——因為它本來就是 host 上的一個 process，只是被貼上了各種限制。再從容器裡面看 kernel 版本：

```bash
docker exec web uname -r
uname -r
```

兩個輸出一模一樣。容器裡沒有另一個 kernel，`uname` 問到的是同一個。

所以正確的心智模型是：**容器 = 被 kernel 限制了視野與資源的普通 process**。接下來我們手工把這些限制一項一項加上去。

## 手工做出一個容器

以下示範需要一台 Linux 主機（VM 也行）、root 權限，以及 cgroups v2（近年主流發行版預設）。我們只用三樣原生工具：`chroot`、`unshare`、以及 `/sys/fs/cgroup` 底下的檔案。

### 第一步：換一個 root filesystem

容器給人的第一個「獨立世界」錯覺來自檔案系統：Alpine 容器裡看到的 `/` 是 Alpine 的目錄樹，不是 host 的。這件事 1979 年就有的 `chroot` 就能做到。

先弄到一份 Alpine 的根目錄。最省事的做法是請容器工具吐一份出來（這裡只是拿它當 tarball 下載器，還沒用到任何隔離功能）：

```bash
mkdir rootfs
podman export "$(podman create alpine)" | tar -C rootfs -x
ls rootfs
# bin  dev  etc  home  lib  ... 一棵完整的 Alpine 目錄樹
```

然後把一個 shell 關進去：

```bash
sudo chroot rootfs /bin/sh
```

在這個 shell 裡 `ls /` 看到的是 Alpine 的世界，`cat /etc/os-release` 會告訴你這是 Alpine Linux。但注意：這只是「換了視角」，process 清單、網路、hostname 全都還是 host 的。隔離要靠下一步。

（實際的 container runtime 用的是更嚴謹的 `pivot_root` 而非 `chroot`，因為 `chroot` 在持有特權時有已知的逃逸手法；概念上兩者做的是同一件事——換掉 process 眼中的 `/`。）

### 第二步：用 namespaces 縮小視野

namespace 是 kernel 提供的機制：把某種全域資源包一層，讓 namespace 裡的 process 以為自己擁有獨立的一份。namespaces(7) man page 直接寫明「namespace 的用途之一就是實作容器」。目前共有 8 種：

| Namespace | 隔離什麼 |
|---|---|
| Mount | 掛載點（每個容器看到不同的檔案系統結構） |
| PID | process ID（容器裡的 PID 1 不是 host 的 PID 1） |
| Network | 網路裝置、協定堆疊、連接埠 |
| UTS | hostname 與 domain name |
| IPC | System V IPC 與 POSIX message queue |
| User | user ID 與 group ID 的對應 |
| Cgroup | cgroup 目錄樹的可見範圍 |
| Time | 系統時鐘的偏移 |

`unshare(1)` 命令可以讓你逐項體驗。先從最直觀的 UTS 開始：

```bash
sudo unshare --uts sh
hostname demo-container   # 在新的 UTS namespace 裡改 hostname
hostname                  # → demo-container
exit
hostname                  # host 的 hostname 完全沒變
```

再看 PID namespace——這就是「容器裡的 ps 只看得到自己」的來源：

```bash
sudo unshare --pid --fork --mount-proc sh
echo $$    # → 1，這個 shell 以為自己是整台機器的第一個 process
ps aux     # 只看得到 sh 和 ps 自己
```

`--fork` 是必要的，因為 PID namespace 只對「之後 fork 出來的子 process」生效；`--mount-proc` 重新掛一份 `/proc`，`ps` 才會讀到新 namespace 的視野而不是 host 的。

Network namespace 則解釋了為什麼容器預設連不到外面、而連接埠又可以彼此重複：

```bash
sudo unshare --net sh
ip link    # 只剩一張還沒啟用的 lo，其他網路介面全部消失
```

新的 network namespace 是一片空白——真正的 runtime 會在這裡建一對 veth 虛擬網路介面，一端留在容器、一端接到 host 的 bridge，網路才通。每個容器有自己的一套連接埠空間，所以十個容器都可以各自監聽 80，`-p 8080:80` 做的就是把 host 的連接埠轉進某個 namespace。

最後是 user namespace，rootless 容器的地基：

```bash
unshare --user --map-root-user sh   # 注意：不用 sudo
id    # → uid=0(root)
```

沒有 sudo 也能「變成 root」——但這個 root 只在 namespace 裡有效，對應回 host 只是你原本的普通帳號。這個「容器裡是 root、host 上不是」的對應機制，就是我在 [rootless Docker](https://imfw.io/posts/2026/2026-07-21-production-rootless-docker/) 與 [rootless Podman](https://imfw.io/posts/2026/2026-07-21-podman-rootless-production/) 兩篇文章裡反覆處理的主角。

### 第三步：組合起來

把 rootfs 和 namespaces 疊在一起，一個看起來很像容器的東西就出現了：

```bash
sudo unshare --mount --uts --ipc --net --pid --fork chroot rootfs /bin/sh
# 進到 Alpine 的世界之後：
mount -t proc proc /proc
ps aux          # 只有 sh 和 ps
hostname box; hostname   # 改 hostname 不影響 host
```

一行命令，五種 namespace 加一個 chroot。這大概就是 `docker run -it alpine sh` 做的事情的骨架。

### 第四步：用 cgroups 限制資源

namespaces 管「看不看得到」，cgroups 管「用得了多少」。cgroup 讓 process 被組織成階層式的群組，對整個群組限制與監控資源用量。操作介面就是檔案系統——在 cgroups v2 下建一個目錄、寫幾個檔案：

```bash
sudo mkdir /sys/fs/cgroup/demo
echo 100M | sudo tee /sys/fs/cgroup/demo/memory.max      # 記憶體上限 100 MiB
echo "50000 100000" | sudo tee /sys/fs/cgroup/demo/cpu.max  # 每 100ms 最多用 50ms CPU（= 0.5 顆）
echo $$ | sudo tee /sys/fs/cgroup/demo/cgroup.procs      # 把目前的 shell 放進這個 cgroup
```

從此這個 shell 與它的所有子 process 加起來最多用 100 MiB 記憶體、半顆 CPU。超過 `memory.max` 會發生什麼？kernel 的 OOM killer 會把群組裡的 process 砍掉——這正是容器「Exit Code 137（OOMKilled）」的真身。你設定的 `docker run --memory=100m`，落到 kernel 就是這一行 `memory.max`。

### 收斂：容器 = namespaces + cgroups + rootfs

到這裡可以收斂出容器的完整定義：

> **容器 = 一個（或一組）普通 Linux process + namespaces（縮小視野）+ cgroups（限制資源）+ 獨立 rootfs（換一個世界）**，再加上幾層安全機制——capabilities 拿掉大部分 root 特權、seccomp 過濾可用的 system call、SELinux／AppArmor 限制存取範圍。

![容器的組成：一個普通 Linux process 被 namespaces（縮小視野）、cgroups（限制資源）與 rootfs（換一個世界）層層包住，全部跑在共用的 Linux kernel 上](/assets/images/what-is-containerization-container-anatomy-v2.png)

我們手工版少做了很多事：pivot_root、veth 網路、capabilities 與 seccomp、把這一切在 process 結束後清乾淨。這些「把 kernel 功能組裝成完整容器」的苦工，正是 container runtime 存在的理由。但機制上沒有任何魔法——全部都是 kernel 內建功能的組合。

## Image 與 layer：那個 rootfs 從哪來

手工示範裡我們用 `tar` 解出一份 rootfs。實務上這份 rootfs 來自 image，而 image 的核心設計是**分層（layer）**。

一份 image 是一疊唯讀的 layer，每層本質上就是一個 tarball，記錄「相對於下面那層，多了、改了、刪了哪些檔案」。`Containerfile`／`Dockerfile` 裡每個會改動檔案系統的指令（`RUN`、`COPY`、`ADD`）各產生一層。容器啟動時，runtime 用 union filesystem（Linux 上主要是 OverlayFS）把這疊唯讀 layer 合併成一個掛載點，再疊上一層屬於這個容器的可寫層——這就是容器看到的 `/`。

這個設計一次解決三個問題：

- **共用**：十個容器共用同一份 image 時，唯讀 layer 在磁碟上只存一份，每個容器只多一層薄薄的可寫層。
- **快取**：build 時每層有快取，`Dockerfile` 沒改到的前幾層直接重用，這就是把「少變動的指令放前面」能加速 build 的原因。
- **可驗證**：每層與整份 image 都以內容的 SHA-256 digest 定址（content-addressable）。`pull` 下來的東西跟 registry 上的位元組相同，改一個 byte 的 digest 就對不上。

順帶一提實作細節：傳統上 Docker 在 Linux 的預設 storage driver 是 `overlay2`，而 Docker Engine 29 起新安裝預設改用 containerd image store（以 snapshotter 管理 layer）；Podman 則透過 containers/storage 使用 overlay。名字不同，做的都是同一件事——把一疊唯讀 tarball 合成容器的 rootfs。

也因為「layer 唯讀、可寫層屬於容器」，你在容器裡改的任何檔案，容器刪掉就消失，永遠不會寫回 image。需要留下來的資料要用 volume 掛出去——這不是慣例問題，是機制決定的。

## OCI：讓 Docker 與 Podman 可以互換的標準

上面講的 image 格式、rootfs bundle、怎麼把 bundle 跑起來，如果每家工具各做各的，生態系就會分裂成「Docker 的容器」與「別家的容器」。2015 年 6 月 22 日，Docker、CoreOS 等廠商在 Linux Foundation 底下成立 Open Container Initiative（OCI），Docker 並把自家的容器格式與 runtime `runc` 捐出來當基礎。

OCI 維護三份規格，正好對應容器化的三個環節：

| 規格 | 管什麼 | 目前版本 |
|---|---|---|
| image-spec | image 的格式：layer、manifest、config 長什麼樣 | v1.1.1 |
| distribution-spec | registry 的 API：怎麼 push、pull、列 tag | v1.1.0 |
| runtime-spec | 拿到解開的 filesystem bundle 之後，怎麼把它跑成容器 | v1.3.0 |

分工是一條清楚的 pipeline：distribution-spec 定義怎麼從 registry 搬 image，image-spec 定義搬下來的東西怎麼解讀、怎麼組成 rootfs，runtime-spec 定義最後怎麼用 namespaces 與 cgroups 把它跑起來。實際執行最後一步的程式叫 OCI runtime——`runc`（Go 寫的參考實作）與 `crun`（C 寫的，更快更省記憶體）是最常見的兩個。

![OCI 三規格的分工：distribution-spec 定義從 registry 搬 image，image-spec 定義 image 如何組成 filesystem bundle，runtime-spec 定義 runc 或 crun 如何把 bundle 跑成容器](/assets/images/what-is-containerization-oci-specs-pipeline.png)

這就是為什麼 `podman run docker.io/library/nginx` 理所當然能跑：所謂「Docker image」其實是 OCI image，任何符合規格的工具都拉得下來、跑得起來。Docker 與 Podman 不是兩種容器技術，而是同一套標準的兩個實作。

## Docker 與 Podman 各自的答案

既然目標與標準都相同，兩者差在哪？差在**架構**——同一件事，兩種組裝方式。

**Docker 選擇 client-server。** 你敲的 `docker` 命令只是 client，透過 UNIX socket 把請求送給常駐的 `dockerd` daemon；daemon 負責管理 image、容器、網路與 volume 等所有物件，再往下交給 containerd 管容器生命週期，最後由 `runc` 真正建出 namespaces 與 cgroups。好處是有一個中心化的 API 服務：遠端管理、事件串流、外部系統整合都很自然。代價是這個 daemon 傳統上以 root 常駐，所有容器都是它的子孫——daemon 出事影響全部容器，而且能碰到 docker socket 的人形同拿到 root。這條風險線與它的解法，我在 [rootless Docker 那篇](https://imfw.io/posts/2026/2026-07-21-production-rootless-docker/) 有完整展開。

**Podman 選擇 daemonless。** 沒有常駐 daemon：`podman run` 直接以你的身分 fork-exec 出容器 process（透過 libpod library 管理，預設優先使用 `crun`）。CLI 刻意做到與 Docker 相容，官方文件甚至直接建議 `alias docker=podman`。沒有 daemon，就沒有「root 常駐服務」這個攻擊面，rootless 是它的自然型態；容器 process 掛在你的 session 或 systemd 之下，生命週期交給 systemd（Quadlet）管理也順理成章。代價是失去中心服務：需要 API 時得另外啟用 `podman.socket`（風險也跟著回來），跨主機管理與部分生態整合要自己補。細節在 [rootless Podman 那篇](https://imfw.io/posts/2026/2026-07-21-podman-rootless-production/)。

|  | Docker | Podman |
|---|---|---|
| 架構 | client + 常駐 daemon（dockerd → containerd → runc） | daemonless，直接 fork-exec（libpod → crun／runc） |
| 預設權限模型 | 傳統上 root daemon（另有 rootless mode） | root 與 rootless 皆為原生支援 |
| API 服務 | 內建（daemon 即 API server） | 選配（`podman.socket`，Linux 限定） |
| 服務化 | daemon 自帶 restart policy | 交給 systemd／Quadlet |
| 容器的父 process | dockerd 這一系 | 你的 shell 或 systemd |

注意這張表裡沒有「誰的容器比較快、比較輕」——因為跑起來的東西是同一種：同樣的 OCI image、同樣的 kernel 機制。選擇 Docker 或 Podman，選的是**管理容器的方式**，不是容器本身。

## 收尾：懂了 process，除錯就變簡單

回到開頭的心智模型：容器是被 namespaces、cgroups 與 rootfs 限制的普通 process。這句話能直接翻譯成除錯直覺：

- **容器裡看不到某個東西**（process、網路介面、檔案）？那是某個 namespace 擋掉的，去 host 上看 `/proc/<pid>/ns/` 就知道它活在哪些 namespace 裡。
- **容器被莫名砍掉、Exit 137**？那是 cgroup 的 `memory.max` 加 OOM killer，去 `/sys/fs/cgroup/` 對應目錄看 `memory.events` 有沒有 oom_kill。
- **在容器裡改的設定重啟後消失**？layer 唯讀、可寫層跟著容器走，機制如此，該用 volume 就用 volume。
- **`docker` 與 `podman` 之間遷移**？image 與 registry 都是 OCI 標準，真正要遷的是 daemon 與 systemd 之間的管理方式差異。

工具會一直換版本，kernel 機制十年來大致就是這一套。把這一層弄懂，上層不管是 Docker、Podman，還是 Kubernetes 底下的 containerd 與 CRI-O，看起來都是同一件事的不同包裝。

下一步如果你關心的是「這些東西怎麼安全地上 production」，rootless 與權限邊界就是主戰場——歡迎接著讀 [正式環境為什麼需要 Rootless Docker](https://imfw.io/posts/2026/2026-07-21-production-rootless-docker/) 與 [Podman 也有 Rootless 問題嗎](https://imfw.io/posts/2026/2026-07-21-podman-rootless-production/)。

## 參考資料

- [namespaces(7) — Linux manual page](https://man7.org/linux/man-pages/man7/namespaces.7.html)
- [cgroups(7) — Linux manual page](https://man7.org/linux/man-pages/man7/cgroups.7.html)
- [unshare(1) — Linux manual page](https://man7.org/linux/man-pages/man1/unshare.1.html)
- [Open Container Initiative — About](https://opencontainers.org/about/overview/)
- [OCI runtime-spec releases](https://github.com/opencontainers/runtime-spec/releases)
- [OCI image-spec releases](https://github.com/opencontainers/image-spec/releases)
- [OCI distribution-spec](https://github.com/opencontainers/distribution-spec)
- [Docker overview — Docker Docs](https://docs.docker.com/get-started/docker-overview/)
- [Select a storage driver — Docker Docs](https://docs.docker.com/engine/storage/drivers/select-storage-driver/)
- [Docker Engine 29 release notes](https://docs.docker.com/engine/release-notes/29/)
- [What is Podman? — Podman documentation](https://docs.podman.io/)
- [crun — GitHub](https://github.com/containers/crun)
