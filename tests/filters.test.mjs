import { describe, it, expect } from "vitest";
import {
  toSlug,
  readingTime,
  seoDescription,
  seoTags,
  safeJson,
  assertNoSlugCollisions,
} from "../lib/filters.mjs";

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

describe("seoDescription", () => {
  it("清除 Markdown、HTML 與多餘空白", () => {
    const content = `## 標題\n\n這是 **文章**，請看 [官方文件](https://example.com)。\n<div>補充內容</div>`;
    expect(seoDescription(content)).toBe("標題 這是 文章，請看 官方文件。 補充內容");
  });

  it("略過 fenced code 並保留 inline code 文字", () => {
    const content = "先使用 `npm test`。\n```bash\nsecret --token\n```\n完成。";
    expect(seoDescription(content)).toBe("先使用 npm test。 完成。");
  });

  it("超過限制時截短並加省略號", () => {
    expect(seoDescription("測".repeat(200), 20)).toBe(`${"測".repeat(19)}…`);
  });

  it("空內容回傳空字串", () => {
    expect(seoDescription()).toBe("");
  });
});

describe("seoTags", () => {
  it("排除 Eleventy 內部 posts tag", () => {
    expect(seoTags(["posts", "Docker", "工具"])).toEqual(["Docker", "工具"]);
  });
});

describe("safeJson", () => {
  it("輸出可解析 JSON 並中和 script 結束標籤", () => {
    const value = { title: "測試 </script><script>alert('&')</script>" };
    const serialized = safeJson(value);
    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(JSON.parse(serialized)).toEqual(value);
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
