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
    expect(home).toContain("<title>Web 開發、API、自動化與 Docker 實作筆記 - FW Blog</title>");
    expect(home).toContain('<meta name="description" content="FW 的繁體中文技術部落格，分享 Web 開發、API 整合、自動化、Docker 與靜態網站的實作經驗、踩坑紀錄和可重現的技術研究。">');
    expect(home).toContain('<link rel="canonical" href="https://imfw.io/">');
    expect(home).toContain('<meta property="og:url" content="https://imfw.io/">');
    expect(home).toContain('<meta property="og:image" content="https://imfw.io/assets/images/og-default.png">');
    expect(home).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(home).toContain('href="https://imfw.io/feed.xml"');
    expect(home).not.toContain('name="google-site-verification"');
    expect(home).toContain('<meta name="msvalidate.01" content="543C842E7A8211188B337FE85195010F">');
  });

  it("文章有獨立摘要、article metadata 與可解析的 BlogPosting JSON-LD", () => {
    const post = newestPost(posts);
    const html = read(postOutputPath(post));
    expect(html).toContain(`<meta name="description" content="${escapeHtml(post.data.description)}">`);
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain(`<meta property="article:tag" content="${escapeHtml(post.data.tags[0])}">`);
    expect(html).not.toContain('<meta property="article:tag" content="posts">');

    const schema = jsonLd(html).find((entry) => entry["@type"] === "BlogPosting");
    expect(schema).toMatchObject({
      headline: post.data.title,
      description: post.data.description,
      url: `https://imfw.io/${postOutputPath(post).replace(/index\.html$/, "")}`,
      image: "https://imfw.io/assets/images/og-default.png",
      inLanguage: "zh-TW",
      author: {
        "@id": "https://imfw.io/about/#person",
        name: "FW",
        url: "https://imfw.io/about/",
        sameAs: ["https://github.com/FWcloud916"],
      },
    });
    expect(schema.dateModified).toBe(schema.datePublished);
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

  it("文章更新日期會同步到畫面、metadata、JSON-LD 與 sitemap", () => {
    const post = posts.find((item) => item.data.updated && new Date(item.data.updated) > new Date(item.data.date));
    expect(post).toBeTruthy();
    const html = read(postOutputPath(post));
    const updatedIso = new Date(post.data.updated).toISOString();
    const updatedDisplay = updatedIso.slice(0, 10).replace(/(\d{4})-(\d{2})-(\d{2})/, "$1年$2月$3日");
    expect(html).toContain(`<meta property="article:modified_time" content="${updatedIso}">`);
    expect(html).toContain(`更新：<time datetime="${updatedIso}">${updatedDisplay}</time>`);
    const schema = jsonLd(html).find((entry) => entry["@type"] === "BlogPosting");
    expect(schema.dateModified).toBe(updatedIso);
    expect(read("sitemap.xml")).toContain(`<lastmod>${updatedIso}</lastmod>`);
  });

  it("首頁有 WebSite JSON-LD，404 禁止索引", () => {
    const website = jsonLd(read("index.html")).find((entry) => entry["@type"] === "WebSite");
    expect(website).toMatchObject({
      name: "FW Blog",
      url: "https://imfw.io",
      description: "FW 的繁體中文技術部落格，分享 Web 開發、API 整合、自動化、Docker 與靜態網站的實作經驗、踩坑紀錄和可重現的技術研究。",
      inLanguage: "zh-TW",
    });
    expect(read("404.html")).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it("每個 HTML 頁只有一個 H1，且宣告繁體中文語言", () => {
    const htmlFiles = fs.readdirSync(SITE_DIR, { recursive: true }).filter((file) => file.endsWith(".html"));
    for (const file of htmlFiles) {
      const html = read(file);
      expect(html, `${file} 缺少 html lang`).toContain('<html lang="zh-TW">');
      expect(html.match(/<h1\b/gi)?.length ?? 0, `${file} 的 H1 數量不等於 1`).toBe(1);
    }
  });

  it("作者頁有 ProfilePage JSON-LD", () => {
    const profile = jsonLd(read("about/index.html")).find((entry) => entry["@type"] === "ProfilePage");
    expect(profile).toMatchObject({
      url: "https://imfw.io/about/",
      mainEntity: {
        "@type": "Person",
        "@id": "https://imfw.io/about/#person",
        name: "FW",
        sameAs: ["https://github.com/FWcloud916"],
      },
    });
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

  it("CSS 連結帶版本參數（cache-busting，繞過 CDN 4 小時快取）", () => {
    const home = read("index.html");
    expect(home).toMatch(/href="\/assets\/css\/styles\.css\?v=[0-9a-z]+"/);
    expect(home).toMatch(/href="\/assets\/css\/prism-one-dark\.css\?v=[0-9a-z]+"/);
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

  it("robots 允許搜尋 crawler 並指向 sitemap，預設分享圖是 1200×630 PNG", () => {
    expect(read("robots.txt")).toBe("User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: https://imfw.io/sitemap.xml\n");

    const image = fs.readFileSync(path.join(SITE_DIR, "assets/images/og-default.png"));
    expect(image.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
  });

  it("發布 IndexNow 驗證 key", () => {
    expect(read("39245e75ee9fd5fa1be891668b72c3d0.txt").trim()).toBe("39245e75ee9fd5fa1be891668b72c3d0");
  });

  it("llms.txt 收錄全部文章、作者與機器可讀摘要", () => {
    const llms = read("llms.txt");
    expect(llms).toContain("Author: FW (https://imfw.io/about/)");
    for (const post of posts) {
      expect(llms).toContain(`### ${post.data.title}`);
      expect(llms).toContain(`https://imfw.io/${postOutputPath(post).replace(/index\.html$/, "")}`);
      expect(llms).toContain("- Description:");
    }
  });
});
