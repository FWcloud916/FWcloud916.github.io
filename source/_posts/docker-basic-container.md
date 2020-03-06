---
title: Docker Container - 基本概念
date: 2020/02/22
tag: 
 - docker
 - Docker Container
 - Container
 - w3HexSchool
---
# Docker Container - 基本概念

簡述 Docker Container 使用方式、基本常用指令
<!--more-->
## 概念
container 是根據 image 產生的，image 是根據 dockerfile 產生的，所以 container 包含什麼、有什麼功能都是依據 dockerfile 的內容所決定的

image 可以想像成 container 的規格、標準，每次使用相同的 image 開啟 container 的時候，可以確保執行的功能都會是一模一樣的

## 常用指令
```docker
docker container run [OPTIONS] IMAGE [COMMAND] [ARG...]
```
運行一個 [nginx](https://hub.docker.com/_/nginx?tab=description)
```docker
docker container run -p 8080:80 nginx
```
![](nginx1.png)
如果電腦上沒有 nginx 的 image 會從 docker 的儲存庫下載，預設通常是官方的 [Docker Hub](https://hub.docker.com/)

上面這行指令中 `-p` 是 `--port` 的縮寫，傳入兩個參數，一個是主機的 port (8080) ，一個是 container 的（80），代表的意思是將 container 的 80 埠對應到主機的 8080 埠
所以在主機的電腦上可以開啟瀏覽器輸入 localhost:8080 就會看到 container 開啟的 nginx 伺服器
![](nginx2.png)

如果要知道開啟的 port 是多少，基本上有三種方法
- 從 Docker Hub 上的[說明](https://hub.docker.com/_/nginx?tab=description)中查詢![](dhub1.png)

- 從 Docker Hub 上的 [tag](https://hub.docker.com/layers/nginx/library/nginx/latest/images/sha256-d7ffce801c3c92dac436bc5dc65235384dcc1b6bbb8210ccb65f466f975f8f88?context=explore) 中查詢![](dhub2.png)

- 從 [dockerfile](https://github.com/nginxinc/docker-nginx/blob/5971de30c487356d5d2a2e1a79e02b2612f9a72f/mainline/buster/Dockerfile) 裡面查詢![](dhub3.png)

EXPOSE 是 dockerfile 中的指令，代表服務對外開啟的 port

這邊可以開始感受到
>dockerfile 是 image 的藍圖
>image 是 container 的樣板

所以在使用 image 的時候最好可以看到 dockerfile 才可以確保開啟的 container 有做什麼事情

```
docker container run -v ~/Documents/demo:/usr/share/nginx/html -p 8080:80 nginx
```
這次加上 `-v` 是 `--volume` 的縮寫，代表綁定檔案目錄，藉由設置這個參數可以修改 container 中要執行的檔案，這邊綁定了 nginx 的預設目錄，就可以修改預設顯示的頁面了
![](nginx3.png)

其他還有[許多參數](https://docs.docker.com/engine/reference/commandline/container_run/)可以設定

`-d` `--detach` 代表背景執行，執行後只會回傳 container ID

`-i` `--interactive` 開啟互動模式，可以直接操作 container
