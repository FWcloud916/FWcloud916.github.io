import { describe, it, expect } from "vitest";
import { assertNoSlugCollisions } from "../lib/filters.mjs";
import { loadPosts } from "./helpers.mjs";

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
