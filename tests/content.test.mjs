import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { assertNoSlugCollisions } from "../lib/filters.mjs";
import { hasUnsafeAssets } from "../src/assets/js/article-lottie.js";
import { ROOT, loadNotes, loadPosts, loadSite, loadWorks } from "./helpers.mjs";

// 對 src/posts/**/*.md 的 frontmatter 做全量檢查（AGENTS.md 硬性約束的可執行版）
const posts = loadPosts();
const notes = loadNotes();
const works = loadWorks();
const site = loadSite();

function findRedundantTerminalHolds(value, outPoint, pathParts = [], findings = []) {
  if (Array.isArray(value)) {
    if (value.length >= 2 && value.every((entry) =>
      entry && typeof entry === "object" && Number.isFinite(entry.t)
    )) {
      const previous = value.at(-2);
      const terminal = value.at(-1);
      if (terminal.t === outPoint &&
          Object.hasOwn(previous, "s") &&
          Object.hasOwn(terminal, "s") &&
          JSON.stringify(previous.s) === JSON.stringify(terminal.s)) {
        findings.push(pathParts.join("/"));
      }
    }

    value.forEach((entry, index) =>
      findRedundantTerminalHolds(entry, outPoint, [...pathParts, index], findings)
    );
    return findings;
  }

  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      findRedundantTerminalHolds(entry, outPoint, [...pathParts, key], findings);
    }
  }
  return findings;
}

describe("post frontmatter", () => {
  it("至少有一篇文章", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it.each(posts.map((p) => [p.file, p]))("%s", (_file, post) => {
    // 必填欄位
    expect(post.data.title, "缺 title").toBeTruthy();
    expect(post.data.date, "缺 date").toBeTruthy();

    // 檔名 YYYY-MM-DD- 前綴要和 frontmatter date 一致
    const prefix = post.file.match(/(\d{4}-\d{2}-\d{2})-[^/]+\.md$/)?.[1];
    expect(prefix, "檔名沒有 YYYY-MM-DD- 前綴").toBeTruthy();
    const date = new Date(post.data.date).toISOString().slice(0, 10);
    expect(date).toBe(prefix);

    // updated 是選填；若提供，必須是有效日期且不得早於發布日
    if (post.data.updated) {
      const updated = new Date(post.data.updated);
      expect(Number.isNaN(updated.valueOf()), "updated 不是有效日期").toBe(false);
      expect(updated.valueOf(), "updated 不得早於 date").toBeGreaterThanOrEqual(new Date(post.data.date).valueOf());
    }

    // layout 與 posts tag 由 src/posts/posts.json 供給，不可手動設定
    expect(post.data.layout, "layout 不可手動設定（posts.json 會給）").toBeUndefined();
    expect(post.data.tags ?? [], "posts tag 不可手動加（posts.json 會給）").not.toContain("posts");
  });
});

describe("Garden note frontmatter", () => {
  it("至少有一篇概念筆記", () => {
    expect(notes.length).toBeGreaterThan(0);
  });

  it.each(notes.map((note) => [note.file, note]))("%s", (_file, note) => {
    expect(note.data.title, "缺 title").toBeTruthy();
    expect(note.data.description, "缺 description").toBeTruthy();
    expect(note.data.created, "缺 created").toBeTruthy();
    expect(note.data.updated, "缺 updated").toBeTruthy();
    expect(["seedling", "growing", "evergreen"]).toContain(note.data.maturity);
    expect(Array.isArray(note.data.related), "related 必須是陣列").toBe(true);
    expect(note.data.related.length, "related 不可為空").toBeGreaterThan(0);
    expect(note.data.related, "related URL 不得重複").toEqual([...new Set(note.data.related)]);
    for (const url of note.data.related) {
      expect(url, `${note.file} 的 related URL`).toMatch(/^\/(?:notes|posts)\/[A-Za-z0-9_./-]+\/$/);
    }

    const prefix = note.file.match(/src\/notes\/([^/]+)\.md$/)?.[1];
    expect(prefix, "筆記檔名必須是 slug").toBeTruthy();
    expect(prefix).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(note.data.layout, "layout 由 notes.json 供給").toBeUndefined();
    expect(note.data.permalink, "permalink 由檔案路徑供給").toBeUndefined();
    expect(new Date(note.data.updated).valueOf()).toBeGreaterThanOrEqual(new Date(note.data.created).valueOf());
  });
});

describe("作品庫資料", () => {
  const allowedCategories = ["agent-skill", "project", "tool"];
  const categoryIds = works.categories.map((category) => category.id);
  const postUrls = new Set(posts.map((post) =>
    `/${post.file.replace(/^src\//, "").replace(/\.md$/, "/")}`
  ));

  it("分類與作品識別碼合法且不重複", () => {
    expect(works.categories.length, "至少需要一個作品分類").toBeGreaterThan(0);
    expect(categoryIds).toEqual([...new Set(categoryIds)]);
    expect(categoryIds.every((id) => allowedCategories.includes(id))).toBe(true);
    for (const category of works.categories) {
      expect(category.title, `分類 ${category.id} 缺 title`).toBeTruthy();
      expect(category.description, `分類 ${category.id} 缺 description`).toBeTruthy();
    }

    expect(works.items.length, "至少需要一筆公開作品").toBeGreaterThan(0);
    const itemIds = works.items.map((work) => work.id);
    expect(itemIds).toEqual([...new Set(itemIds)]);
  });

  it.each(works.items.map((work) => [work.id, work]))("%s", (_id, work) => {
    expect(work.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(categoryIds, "category 必須指向已定義分類").toContain(work.category);
    expect(work.title, "缺 title").toBeTruthy();
    expect(work.description, "缺 description").toBeTruthy();
    expect(Array.isArray(work.tags), "tags 必須是陣列").toBe(true);
    expect(work.tags.length, "tags 不可為空").toBeGreaterThan(0);
    expect(work.tags, "tags 不得重複").toEqual([...new Set(work.tags)]);
    expect(work.primaryAction?.label, "缺 primaryAction.label").toBeTruthy();
    expect(work.primaryAction?.url, "primaryAction.url 必須是 HTTPS").toMatch(/^https:\/\//);

    if (work.installCommand !== undefined) {
      expect(work.installCommand.trim(), "installCommand 不可為空").toBeTruthy();
    }
    if (work.relatedPost) {
      expect(work.relatedPost).toMatch(/^\/posts\/[A-Za-z0-9_./-]+\/$/);
      expect(postUrls, `relatedPost 不存在：${work.relatedPost}`).toContain(work.relatedPost);
    }
    if (work.image) {
      expect(work.image).toMatch(/^\/assets\/images\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:jpe?g|png|webp)$/);
      expect(fs.existsSync(path.join(ROOT, "src", work.image.replace(/^\//, ""))), `缺少 ${work.image}`).toBe(true);
      expect(work.imageAlt, "圖片必須提供 imageAlt").toBeTruthy();
    }
  });
});

describe("site social", () => {
  it("social 結構完整，且每筆網址都列入 authorSameAs", () => {
    expect(Array.isArray(site.social), "social 必須是陣列").toBe(true);
    expect(site.social.length, "至少需要一筆社群連結").toBeGreaterThan(0);

    const ids = site.social.map((item) => item.id);
    expect(ids, "social id 不得重複").toEqual([...new Set(ids)]);

    for (const item of site.social) {
      expect(item.id, `${item.id} 必須是 kebab-case`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(item.label, `${item.id} 缺 label`).toBeTruthy();
      expect(item.url, `${item.id} 的 url 必須是 HTTPS`).toMatch(/^https:\/\//);
      expect(site.authorSameAs, `${item.id} 的 url 必須列入 authorSameAs`).toContain(item.url);
    }
  });

  it("authorEmail 是有效地址，且不得混進 sameAs 或 social", () => {
    expect(site.authorEmail, "缺 authorEmail").toBeTruthy();
    expect(site.authorEmail, "authorEmail 必須是純地址，不含 mailto:").toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

    // sameAs 的語意是「同一實體的其他個人檔案頁」，mailto: 不屬於這類；
    // Person.email 才是 email 的正確欄位。
    for (const url of site.authorSameAs) {
      expect(url, "authorSameAs 不得包含 mailto:").not.toMatch(/^mailto:/i);
    }
    expect(
      site.social.some((item) => item.url.includes(site.authorEmail)),
      "email 不得成為 social 項目",
    ).toBe(false);
  });

  it("每個社群 id 在 social-links.njk 都有對應圖示", () => {
    const partial = fs.readFileSync(
      path.join(ROOT, "src", "_includes", "components", "social-links.njk"),
      "utf8",
    );
    for (const item of site.social) {
      expect(partial, `social-links.njk 缺 ${item.id} 的圖示`).toContain(`item.id == "${item.id}"`);
    }
  });
});

describe("tag slugs", () => {
  it("全站 tag 沒有 slug 碰撞（與 build 守衛互為鏡像）", () => {
    const tags = new Set(posts.flatMap((p) => p.data.tags ?? []));
    expect(() => assertNoSlugCollisions([...tags])).not.toThrow();
  });
});

describe("文章 Lottie figure 合約", () => {
  const figures = posts.flatMap((post) =>
    [...post.content.matchAll(/<figure\b[^>]*class=["'][^"']*\barticle-lottie\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/g)]
      .map((match) => [post.file, match[0]])
  );

  it("每個 article-lottie figure 都有同源 JSON、可及名稱、poster 與 caption", () => {
    for (const [file, figure] of figures) {
      expect(figure, file).toMatch(/data-lottie-src=["']\/assets\/lottie\/(?:[A-Za-z0-9][A-Za-z0-9_-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.json["']/);
      expect(figure, file).toMatch(/class=["'][^"']*\barticle-lottie__stage\b[^"']*["']/);
      expect(figure, file).toMatch(/role=["']img["']/);
      expect(figure, file).toMatch(/aria-label=["'][^"']+["']/);
      expect(figure, file).toMatch(/<img\b[^>]*\beleventy:ignore\b[^>]*>/);
      expect(figure, file).toMatch(/<img\b[^>]*\bsrc=["']\/assets\/images\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:jpe?g|png|webp)["'][^>]*>/);
      expect(figure, file).toMatch(/<img\b[^>]*\balt=["'][^"']+["'][^>]*>/);
      expect(figure, file).toMatch(/<figcaption>[\s\S]*\S[\s\S]*<\/figcaption>/);
    }
  });

  it("每篇文章至多三個動畫，且引用的檔案存在並符合 article v1 預算", () => {
    for (const post of posts) {
      const postFigures = figures.filter(([file]) => file === post.file);
      expect(postFigures.length, `${post.file} 的 Lottie 數量`).toBeLessThanOrEqual(3);

      for (const [, figure] of postFigures) {
        const lottieSource = figure.match(/data-lottie-src=["']([^"']+)["']/)?.[1];
        const posterSource = figure.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/)?.[1];
        expect(lottieSource, `${post.file} 缺 Lottie JSON 路徑`).toBeTruthy();
        expect(posterSource, `${post.file} 缺 poster 路徑`).toBeTruthy();
        if (!lottieSource || !posterSource) {
          continue;
        }
        const lottieFile = path.join(ROOT, "src", lottieSource);
        const posterFile = path.join(ROOT, "src", posterSource);
        expect(fs.existsSync(lottieFile), `缺少 ${lottieSource}`).toBe(true);
        expect(fs.existsSync(posterFile), `缺少 ${posterSource}`).toBe(true);
        expect(fs.statSync(lottieFile).size, `${lottieSource} 超過 1 MB`).toBeLessThanOrEqual(1_000_000);

        const animationData = JSON.parse(fs.readFileSync(lottieFile, "utf8"));
        expect(animationData.w, `${lottieSource} 寬度`).toBe(1200);
        expect(animationData.h, `${lottieSource} 高度`).toBe(675);
        expect(animationData.fr, `${lottieSource} FPS`).toBe(24);
        expect(
          findRedundantTerminalHolds(animationData, animationData.op),
          `${lottieSource} 在排除性的 op 上含重複終點 keyframe，可能造成重播狀態未重設`
        ).toEqual([]);
        expect((animationData.op - animationData.ip) / animationData.fr, `${lottieSource} 長度（秒）`)
          .toBeGreaterThanOrEqual(4);
        expect((animationData.op - animationData.ip) / animationData.fr, `${lottieSource} 長度（秒）`)
          .toBeLessThanOrEqual(12);
        const hasUnsafeAsset = hasUnsafeAssets(animationData);
        expect(hasUnsafeAsset, `${lottieSource} 含不安全的 asset`).toBe(false);
        if (hasUnsafeAsset) {
          continue;
        }

        const localImages = (animationData.assets ?? []).filter((asset) => typeof asset?.p === "string");
        const localImageBytes = localImages.reduce((total, asset) => {
          const imageFile = path.join(path.dirname(lottieFile), asset.p);
          expect(fs.existsSync(imageFile), `缺少 ${path.posix.join(path.posix.dirname(lottieSource), asset.p)}`).toBe(true);
          return total + fs.statSync(imageFile).size;
        }, 0);
        expect(localImageBytes, `${lottieSource} 的 local image assets 合計超過 5 MB`)
          .toBeLessThanOrEqual(5_000_000);
      }
    }
  });
});
