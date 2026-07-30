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

// 主題由人工策展的文章 URL 組成，避免用泛用 tag 自動歸類時混入不相關文章。
export function filterByUrls(posts = [], urls = []) {
  const postsByUrl = new Map(posts.map((post) => [post.url, post]));
  return urls.map((url) => postsByUrl.get(url)).filter(Boolean);
}

export function topicsForPost(topics = [], postUrl = "") {
  return topics.filter((topic) => topic.postUrls?.includes(postUrl));
}

// 相關文章只從相同人工策展主題挑選，再以共享 tag 數量與日期排序。
export function relatedPosts(posts = [], currentUrl = "", topics = [], limit = 3) {
  const topicUrls = new Set(
    topicsForPost(topics, currentUrl).flatMap((topic) => topic.postUrls ?? [])
  );
  if (topicUrls.size === 0) return [];

  const currentPost = posts.find((post) => post.url === currentUrl);
  const currentTags = new Set(seoTags(currentPost?.data?.tags));

  return posts
    .filter((post) => post.url !== currentUrl && topicUrls.has(post.url))
    .map((post) => ({
      post,
      sharedTags: seoTags(post.data?.tags).filter((tag) => currentTags.has(tag)).length,
    }))
    .sort((a, b) => b.sharedTags - a.sharedTags || b.post.date - a.post.date)
    .slice(0, limit)
    .map(({ post }) => post);
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
