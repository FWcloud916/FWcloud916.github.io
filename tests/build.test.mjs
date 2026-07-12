import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { toSlug } from "../lib/filters.mjs";
import { ROOT, SITE_DIR, loadPosts, newestPost, escapeHtml } from "./helpers.mjs";

// 跑完整 production build 後對 _site/ 產物做 smoke 檢查
const posts = loadPosts();
const read = (p) => fs.readFileSync(path.join(SITE_DIR, p), "utf8");
const exists = (p) => fs.existsSync(path.join(SITE_DIR, p));

beforeAll(() => {
  execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
}, 180_000);

describe("build output", () => {
  it("CNAME 是 imfw.io（自訂網域靠它活著）", () => {
    expect(read("CNAME").trim()).toBe("imfw.io");
  });

  it("首頁包含最新一篇文章", () => {
    expect(read("index.html")).toContain(escapeHtml(newestPost(posts).data.title));
  });

  it("404 頁、llms.txt 存在", () => {
    expect(exists("404.html")).toBe(true);
    expect(exists("llms.txt")).toBe(true);
  });

  it("feed.xml 是 Atom feed，且第一個 entry 是最新文章", () => {
    const feed = read("feed.xml");
    expect(feed).toMatch(/^<\?xml/);
    expect(feed).toContain("<feed");
    const firstEntryTitle = feed.match(/<entry>\s*<title>([^<]*)<\/title>/)?.[1];
    expect(firstEntryTitle).toBe(escapeHtml(newestPost(posts).data.title));
  });

  it("CSS 已編譯且包含模板用到的 utility", () => {
    const css = read("assets/css/styles.css");
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain("bg-gray-50");
    expect(exists("assets/css/prism-one-dark.css")).toBe(true);
  });

  it("每個 tag 都有對應的 tag 頁", () => {
    expect(exists("tags/index.html")).toBe(true);
    const tags = new Set(posts.flatMap((p) => p.data.tags ?? []));
    for (const tag of tags) {
      expect(exists(`tags/${toSlug(tag)}/index.html`), `缺 /tags/${toSlug(tag)}/（tag: ${tag}）`).toBe(true);
    }
  });
});
