---
title: Docker Image - 基本概念
date: 2020-03-08
tags:
  - Docker
  - Docker Image
  - Image
  - w3HexSchool
---
# Docker Image - 基本概念

簡述 Docker Image 的基本概念與常用指令

## 概念
image 是 container 的樣板，container 是根據 image 產生的

image 是根據 dockerfile 產生的，dockerfile 是 image 的藍圖

## 常用指令
```docker
docker image ls
```
列出所有 image

```docker
docker image pull [OPTIONS] NAME[:TAG|@DIGEST]
```
下載 image

```docker
docker image rm [OPTIONS] IMAGE [IMAGE...]
```
刪除 image

```docker
docker image build [OPTIONS] PATH | URL | -
```
根據 dockerfile 建立 image

## 參考
- [Docker 官方文件](https://docs.docker.com/engine/reference/commandline/image/)
