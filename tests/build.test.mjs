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
const postOutputPath = (post) => post.file.replace(/^src\//, "").replace(/\.md$/, "/index.html");
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));

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

  it("共用 SEO metadata 使用正式站絕對網址", () => {
    const home = read("index.html");
    expect(home).toContain('<link rel="canonical" href="https://imfw.io/">');
    expect(home).toContain('<meta property="og:url" content="https://imfw.io/">');
    expect(home).toContain('<meta property="og:image" content="https://imfw.io/assets/images/og-default.png">');
    expect(home).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(home).toContain('href="https://imfw.io/feed.xml"');
    expect(home).not.toContain('name="google-site-verification"');
  });

  it("文章有獨立摘要、article metadata 與可解析的 BlogPosting JSON-LD", () => {
    const post = newestPost(posts);
    const html = read(postOutputPath(post));
    expect(html).toContain(`<meta name="description" content="${escapeHtml(post.data.description)}">`);
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('<meta property="article:tag" content="api">');
    expect(html).not.toContain('<meta property="article:tag" content="posts">');

    const schema = jsonLd(html).find((entry) => entry["@type"] === "BlogPosting");
    expect(schema).toMatchObject({
      headline: post.data.title,
      description: post.data.description,
      url: "https://imfw.io/posts/2026/2026-07-13-social-platform-apis-2026/",
      image: "https://imfw.io/assets/images/og-default.png",
      inLanguage: "zh-TW",
    });
    expect(schema.keywords).toEqual(post.data.tags);
  });

  it("缺 description 的舊文會從正文產生截短摘要", () => {
    const post = posts.find((item) => !item.data.description);
    const html = read(postOutputPath(post));
    const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
    expect(description).toBeTruthy();
    expect(description).not.toBe("分享 Web 開發和技術的心得");
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it("首頁有 WebSite JSON-LD，404 禁止索引", () => {
    const website = jsonLd(read("index.html")).find((entry) => entry["@type"] === "WebSite");
    expect(website).toMatchObject({
      name: "FW Blog",
      url: "https://imfw.io",
      description: "分享 Web 開發和技術的心得",
      inLanguage: "zh-TW",
    });
    expect(read("404.html")).toContain('<meta name="robots" content="noindex, nofollow">');
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

  it("sitemap 收錄內容與所有 tag，並排除非索引端點", () => {
    const sitemap = read("sitemap.xml");
    expect(sitemap).toMatch(/^<\?xml version="1\.0" encoding="utf-8"\?>/);
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain("<loc>https://imfw.io/</loc>");
    expect(sitemap).toContain("<loc>https://imfw.io/about/</loc>");
    for (const tag of new Set(posts.flatMap((post) => post.data.tags ?? []))) {
      expect(sitemap).toContain(`<loc>https://imfw.io/tags/${toSlug(tag)}/</loc>`);
    }
    expect(sitemap).not.toContain("404.html");
    expect(sitemap).not.toContain("feed.xml");
    expect(sitemap).not.toContain("llms.txt");
    expect(sitemap.trimEnd()).toMatch(/<\/urlset>$/);
  });

  it("robots 指向 sitemap，預設分享圖是 1200×630 PNG", () => {
    expect(read("robots.txt")).toBe("User-agent: *\nAllow: /\n\nSitemap: https://imfw.io/sitemap.xml\n");

    const image = fs.readFileSync(path.join(SITE_DIR, "assets/images/og-default.png"));
    expect(image.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
  });
});
