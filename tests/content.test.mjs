import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { assertNoSlugCollisions } from "../lib/filters.mjs";
import { hasUnsafeAssets } from "../src/assets/js/article-lottie.js";
import { ROOT, loadPosts } from "./helpers.mjs";

// 對 src/posts/**/*.md 的 frontmatter 做全量檢查（AGENTS.md 硬性約束的可執行版）
const posts = loadPosts();

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

  it("每篇文章至多兩個動畫，且引用的檔案存在並符合 article v1 預算", () => {
    for (const post of posts) {
      const postFigures = figures.filter(([file]) => file === post.file);
      expect(postFigures.length, `${post.file} 的 Lottie 數量`).toBeLessThanOrEqual(2);

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
