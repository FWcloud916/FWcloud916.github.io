import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const POSTS_DIR = path.join(ROOT, "src", "posts");
export const SITE_DIR = path.join(ROOT, "_site");

// 讀出所有文章的 frontmatter，回傳 [{ file, data, content }]（file 為相對 repo root 路徑）
export function loadPosts() {
  return fs
    .readdirSync(POSTS_DIR, { recursive: true })
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const abs = path.join(POSTS_DIR, f);
      const { data, content } = matter(fs.readFileSync(abs, "utf8"));
      return { file: path.relative(ROOT, abs), data, content };
    });
}

export function newestPost(posts) {
  return [...posts].sort((a, b) => new Date(b.data.date) - new Date(a.data.date))[0];
}

// Nunjucks autoescape 對應：斷言 HTML 內容時要先做同樣的跳脫
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
