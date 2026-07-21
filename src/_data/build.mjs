import { execSync } from "node:child_process";

// 建置版本字串，供靜態資源 cache-busting 使用（如 styles.css?v=xxxx）。
// 正式站經 CDN 快取（max-age=14400），沒有版本參數時新樣式最長 4 小時才生效。
// 優先用 git short hash：同一 commit 重建產出相同 URL，不會無謂打掉快取；
// 取不到 git 時（如從 tarball 建置）退回建置時間戳。
function resolveVersion() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return Date.now().toString(36);
  }
}

export default {
  version: resolveVersion(),
};
