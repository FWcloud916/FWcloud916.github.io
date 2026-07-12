import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import pluginRss from "@11ty/eleventy-plugin-rss";
import Image from "@11ty/eleventy-img";
import { DateTime } from "luxon";
import { toSlug, readingTime, assertNoSlugCollisions } from "./lib/filters.mjs";

export default function(eleventyConfig) {
  // 外掛
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);

  // Passthrough Copy
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("src/assets/images");
  eleventyConfig.addPassthroughCopy({
    "node_modules/prism-themes/themes/prism-one-dark.css": "assets/css/prism-one-dark.css"
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

  // 圖片 Shortcode
  eleventyConfig.addShortcode("image", async function(src, alt, sizes = "100vw") {
    let metadata = await Image(src, {
      widths: [300, 600, 1200],
      formats: ["webp", "jpeg"],
      outputDir: "./_site/assets/img/",
      urlPath: "/assets/img/",
      cacheOptions: {
        duration: "1d",
        directory: ".cache",
      },
    });

    let imageAttributes = {
      alt,
      sizes,
      loading: "lazy",
      decoding: "async",
    };

    return Image.generateHTML(metadata, imageAttributes);
  });

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
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
