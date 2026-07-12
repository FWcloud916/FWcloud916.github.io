import { describe, it, expect } from "vitest";
import { toSlug, readingTime, assertNoSlugCollisions } from "../lib/filters.mjs";

describe("toSlug", () => {
  it("中文轉拼音（鎖住既有網址：工具 → gong-ju）", () => {
    expect(toSlug("工具")).toBe("gong-ju");
  });

  it("中英混合", () => {
    expect(toSlug("Docker 容器")).toBe("docker-rong-qi");
  });

  it("純英文照舊 slugify", () => {
    expect(toSlug("Docker Container")).toBe("docker-container");
  });

  it("大小寫不同的 tag 會轉出同一個 slug（碰撞守衛存在的前提）", () => {
    expect(toSlug("Docker")).toBe(toSlug("docker"));
  });

  it("純符號／emoji 會轉出空字串", () => {
    expect(toSlug("🚀")).toBe("");
    expect(toSlug("!!!")).toBe("");
  });
});

describe("readingTime", () => {
  it("中文長文以字數估算，不會永遠是 1 分鐘", () => {
    const text = "這是一段測試用的中文內容。".repeat(50); // 650 字，> 400 字/分
    expect(readingTime(text)).toBeGreaterThan(1);
  });

  it("英文以 200 詞/分估算", () => {
    const words = Array.from({ length: 450 }, (_, i) => `word${i}`).join(" ");
    expect(readingTime(words)).toBe(3);
  });

  it("HTML tag 不計入字數", () => {
    const html = `<pre class="language-js"><code>${"x ".repeat(10)}</code></pre>`;
    expect(readingTime(html)).toBe(1);
  });

  it("最短 1 分鐘", () => {
    expect(readingTime("短")).toBe(1);
    expect(readingTime("")).toBe(1);
  });
});

describe("assertNoSlugCollisions", () => {
  it("正常 tags 不會 throw", () => {
    expect(() => assertNoSlugCollisions(["Docker", "工具", "node"])).not.toThrow();
  });

  it("大小寫碰撞會 throw 並列出兩個 tag", () => {
    expect(() => assertNoSlugCollisions(["Docker", "docker"])).toThrow(/Docker.*docker|docker.*Docker/);
  });

  it("同音中文詞碰撞會 throw", () => {
    expect(() => assertNoSlugCollisions(["工具", "攻具"])).toThrow(/gong-ju/);
  });

  it("空 slug 會 throw", () => {
    expect(() => assertNoSlugCollisions(["🚀"])).toThrow(/empty slug/);
  });
});
