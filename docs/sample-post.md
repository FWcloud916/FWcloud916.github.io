---
layout: layouts/post.njk
title: 歡迎來到 11ty 部落格
date: 2025-12-19
tags:
  - 11ty
  - tutorial
  - javascript
description: 這是一篇範例文章，展示 11ty 部落格的各種功能，包括 Markdown 渲染、程式碼語法高亮和圖片處理。
---

歡迎來到我的新部落格！這篇文章將展示這個使用 11ty、Tailwind CSS 和 Prism.js One Dark 主題建構的部落格的各種功能。

## Markdown 基本語法

這個部落格支援完整的 Markdown 語法，包括：

- **粗體文字**
- *斜體文字*
- ~~刪除線~~
- `行內程式碼`

### 清單

有序清單：

1. 第一項
2. 第二項
3. 第三項

無序清單：

- 項目 A
- 項目 B
- 項目 C

## 程式碼語法高亮

這個部落格使用 Prism.js One Dark 主題進行程式碼語法高亮。以下是一些範例：

### JavaScript

```javascript
// 這是一個簡單的 JavaScript 函式
function greet(name) {
  console.log(`Hello, ${name}!`);
  return `Welcome to my blog, ${name}`;
}

// 使用 async/await
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

greet('World');
```

### HTML

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>範例頁面</title>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>這是一個範例段落。</p>
</body>
</html>
```

### CSS

```css
/* Tailwind CSS 樣式範例 */
.prose {
  @apply max-w-none;
}

.card {
  @apply bg-white rounded-lg shadow-md p-6;
  transition: transform 0.2s ease-in-out;
}

.card:hover {
  @apply shadow-lg;
  transform: translateY(-2px);
}
```

## 引用

> 這是一段引用文字。引用可以用來強調重要的內容或引用他人的話。
>
> — 某位智者

## 連結

你可以訪問 [11ty 官方網站](https://www.11ty.dev/) 來了解更多關於這個強大的靜態網站生成器。

## 圖片

這個部落格支援圖片最佳化功能，可以自動生成多種尺寸和 WebP 格式。

### 標準 Markdown 圖片

![範例圖片](/assets/images/ball.jpg)

build 時 image transform 會自動把圖片生成多種尺寸（300px、600px、1200px）和 WebP 格式，並且支援延遲加載和響應式設計。

## 表格

| 功能 | 狀態 | 說明 |
|------|------|------|
| Markdown | ✅ | 完整支援 |
| 語法高亮 | ✅ | Prism One Dark |
| 圖片最佳化 | ✅ | 多尺寸 + WebP |
| RSS Feed | ✅ | Atom 格式 |
| 標籤系統 | ✅ | 自動生成頁面 |

## 結語

這個部落格提供了一個現代化的寫作環境，具備所有必要的功能來分享你的想法和知識。開始寫作吧！

---

**標籤：** #11ty #tutorial #javascript
