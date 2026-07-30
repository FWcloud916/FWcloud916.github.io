import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import pluginRss from "@11ty/eleventy-plugin-rss";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { DateTime } from "luxon";
import {
  toSlug,
  readingTime,
  seoDescription,
  seoTags,
  filterByUrls,
  topicsForPost,
  relatedPosts,
  safeJson,
  assertNoSlugCollisions,
} from "./lib/filters.mjs";

export default function(eleventyConfig) {
  // 外掛
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);

  // 圖片：文章用純 markdown ![alt](/assets/images/...) 插圖，
  // build 時由 transform 把輸出 HTML 的 <img> 升級成 responsive <picture>。
  // 遠端 http(s) 圖片不會被跳過而是下載自託管；要原樣保留改用 <img eleventy:ignore>。
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    extensions: "html",
    widths: [300, 600, 1200],
    formats: ["webp", "jpeg"],
    outputDir: "./_site/assets/img/",
    urlPath: "/assets/img/",
    cacheOptions: {
      duration: "1d",
      directory: ".cache",
    },
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
      sizes: "(min-width: 30em) 50vw, 100vw",
    },
    // failOnError 預設 true：圖片路徑錯誤直接讓 build 失敗
  });

  // Passthrough Copy
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("src/assets/images");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/lottie");
  eleventyConfig.addPassthroughCopy({
    "src/assets/icons/favicon.svg": "favicon.svg",
    "src/assets/icons/favicon.ico": "favicon.ico",
    "src/assets/icons/apple-touch-icon.png": "apple-touch-icon.png",
  });
  eleventyConfig.addPassthroughCopy({
    "node_modules/prism-themes/themes/prism-one-dark.css": "assets/css/prism-one-dark.css"
  });
  eleventyConfig.addPassthroughCopy({
    "node_modules/lottie-web/build/player/lottie_light.min.js": "assets/js/lottie-light-5.13.0.min.js"
  });

  // Watch targets
  eleventyConfig.addWatchTarget("src/assets/css/");

  // Collections
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/**/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("tagList", function(collection) {
    const tagSet = new Set();
    collection.getAll().forEach(item => {
      (item.data.tags || []).forEach(tag => {
        if (tag !== "posts") {
          tagSet.add(tag);
        }
      });
    });
    const tags = [...tagSet].sort();
    // 不同 tag 轉出同一個 slug 會讓兩個 tag 頁搶同一個網址，直接讓 build 失敗
    assertNoSlugCollisions(tags);
    return tags;
  });

  // Filters
  eleventyConfig.addFilter("dateDisplay", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('yyyy年MM月dd日');
  });

  eleventyConfig.addFilter("dateIso", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toISO();
  });

  eleventyConfig.addFilter("readingTime", readingTime);
  eleventyConfig.addFilter("seoDescription", seoDescription);
  eleventyConfig.addFilter("seoTags", seoTags);
  eleventyConfig.addFilter("filterByUrls", filterByUrls);
  eleventyConfig.addFilter("topicsForPost", topicsForPost);
  eleventyConfig.addFilter("relatedPosts", relatedPosts);
  eleventyConfig.addFilter("safeJson", safeJson);

  eleventyConfig.addFilter("filterByTag", (posts, tag) => {
    return posts.filter(post => {
      return post.data.tags && post.data.tags.includes(tag);
    });
  });

  eleventyConfig.addFilter("limit", (array, limit) => {
    return array.slice(0, limit);
  });

  // 覆寫內建的 slug filter，讓中文標籤（例如「工具」）也能轉出有效網址
  eleventyConfig.addFilter("slug", toSlug);

  // 確保 UTF-8 編碼
  eleventyConfig.setServerOptions({
    encoding: "utf-8"
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    // markdown 不經模板引擎前處理：code fence 裡的 {{ }}（Go template 等）不會再被 nunjucks 誤解析
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk"
  };
};
