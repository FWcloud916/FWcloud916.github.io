---
title: Docker - 基本概念
date: 2020/02/16
tag: 
 - docker
 - w3HexSchool
---
# Docker - 基本概念

簡述 Docker 架構、優勢、好處並與 VM 作比較

## 建立環境

建立一個 Web Service 的環境
可能需要 Linux + Apache + MySQL + PHP (LAMP)
又或者再加上 Nginx 組成 LNAMP

### 使用 VM
一個環境就是一個**完整**的系統
在獨立開發的時候，或許這個情況並不會造成困擾
但是在團隊開發的時候，如果每個人都需要一個可以開發的環境

  - 整個團隊共用一個環境 => 每個開發者互相影響
  - 每個人有獨立的開發環境 => 很難確保每個人都有相同的環境

### 使用 Docker
Docker 不需要自己的系統，Docker 的架構是建立在原有的系統上，使用原有系統的運算資源，只安裝需要的東西，相比基於硬體上的系統建立，Docker 建立的系統只是一個程式而已

所以 Docker 具有快速建立、轉移、複製的特性

不過即便透過 namespace 隔離，但因為與原系統共用 kernel，所以 Docker 也不像 VM 是完全隔離的系統

## 資源分配及建立限制

### VM
  - 虛擬化硬體資源，執行自己的作業系統
  - 可以建立任何環境， Linux 、 MAC OS 或是 Windows

### Docker
  - Docker 使用原系統的 kernel 作為運算，不需要執行自己的作業系統
  - 只能建立相同 kernel 的環境使用

## Docker 帶來的優勢

  ### 快速建立相同環境
  當環境建立好之後（ image 、 Dockerfile ）可以在不同的機器直接部署、安裝
  ### 快速調整環境
  只需要調整 image 或 Dockerfile 就可完成環境的變更
  ### 節省資源提升效能
  不需要運行額外的作業系統，直接使用原本 kernel ，將資源更有效率的運用
