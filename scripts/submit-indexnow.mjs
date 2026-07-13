import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const site = JSON.parse(fs.readFileSync(path.join(root, "src", "_data", "site.json"), "utf8"));
const siteUrl = site.url;
const key = site.indexNowKey;
const [from, to = "HEAD"] = process.argv.slice(2);

function sitemapUrls() {
  const sitemap = fs.readFileSync(path.join(root, "_site", "sitemap.xml"), "utf8");
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function changedFiles() {
  if (!from || /^0+$/.test(from)) return null;
  try {
    return execFileSync("git", ["diff", "--name-only", from, to], {
      cwd: root,
      encoding: "utf8",
    }).trim().split("\n").filter(Boolean);
  } catch (error) {
    console.warn(`無法讀取 ${from}..${to} 的 diff，改為通知 sitemap 全部 URL：${error.message}`);
    return null;
  }
}

function postUrl(file) {
  const match = file.match(/^src\/posts\/(\d{4})\/([^/]+)\.md$/);
  return match ? `${siteUrl}/posts/${match[1]}/${match[2]}/` : null;
}

function urlsToNotify(files) {
  const allUrls = sitemapUrls();
  if (files === null) return allUrls;

  const relevant = files.filter((file) =>
    file.startsWith("src/") ||
    file.startsWith("lib/") ||
    file === "eleventy.config.mjs"
  );
  if (relevant.length === 0) return [];

  const onlyPosts = relevant.every((file) => /^src\/posts\/\d{4}\/[^/]+\.md$/.test(file));
  if (!onlyPosts) return allUrls;

  const urls = new Set([`${siteUrl}/`]);
  for (const file of relevant) {
    const url = postUrl(file);
    if (url) urls.add(url);
  }
  for (const url of allUrls) {
    if (url.startsWith(`${siteUrl}/tags/`)) urls.add(url);
  }
  return [...urls];
}

const urls = urlsToNotify(changedFiles());
if (urls.length === 0) {
  console.log("沒有需要通知 IndexNow 的公開內容變更。");
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(siteUrl).host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList: urls,
  }),
});

if (!response.ok && response.status !== 202) {
  throw new Error(`IndexNow 回應 ${response.status}: ${await response.text()}`);
}

console.log(`IndexNow 已接受 ${urls.length} 個 URL（HTTP ${response.status}）。`);
