import { pinyin } from "pinyin-pro";

// 內建的 slug filter 不會轉寫中文（會直接被濾掉變成空字串），
// 這裡先把中文轉成拼音再 slugify，避免中文標籤產生空白／重複的網址。
export function toSlug(str) {
  const converted = pinyin(String(str), { toneType: "none", type: "string", nonZh: "consecutive" });
  return converted
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// 中文沒有空格，不能只用「切空格數單字」估閱讀時間：
// 先剝掉 HTML tag，CJK 字元以每分鐘 400 字計，其餘以每分鐘 200 詞計。
const CJK_CHARS_PER_MINUTE = 400;
const WORDS_PER_MINUTE = 200;

export function readingTime(html) {
  const text = String(html).replace(/<[^>]*>/g, " ");
  const cjkCount = (text.match(/\p{Script=Han}/gu) || []).length;
  const words = text.replace(/\p{Script=Han}/gu, " ").split(/\s+/).filter(Boolean).length;
  const minutes = cjkCount / CJK_CHARS_PER_MINUTE + words / WORDS_PER_MINUTE;
  return Math.max(1, Math.ceil(minutes));
}

// 文章未提供 description 時，從 Markdown／HTML 內容產生適合搜尋摘要的純文字。
export function seoDescription(content, limit = 160) {
  const text = String(content ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/{%[\s\S]*?%}|{{[\s\S]*?}}/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(?:>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

export function seoTags(tags = []) {
  return tags.filter((tag) => tag !== "posts");
}

// JSON-LD 位於 <script> 中，除了 JSON 編碼，也要避免內容提前關閉 script tag。
export function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// 不同 tag（如 Docker／docker、同音中文詞）可能轉出同一個 slug，兩個 tag 頁會搶同一個
// permalink；純符號 tag 會轉出空 slug 產生 /tags//。發現時直接讓 build 失敗。
export function assertNoSlugCollisions(tags) {
  const bySlug = new Map();
  for (const tag of tags) {
    const slug = toSlug(tag);
    if (!bySlug.has(slug)) bySlug.set(slug, new Set());
    bySlug.get(slug).add(tag);
  }
  const problems = [];
  for (const [slug, tagSet] of bySlug) {
    const names = [...tagSet].map((t) => `"${t}"`).join(", ");
    if (slug === "") {
      problems.push(`empty slug from tag(s): ${names}`);
    } else if (tagSet.size > 1) {
      problems.push(`slug "${slug}" collides between tags: ${names}`);
    }
  }
  if (problems.length) {
    throw new Error(
      `Tag slug check failed — rename the offending tag(s):\n- ${problems.join("\n- ")}`
    );
  }
}
