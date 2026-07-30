import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  assetDirectoryForAnimation,
  createPlaybackController,
  hasUnsafeAssets,
  initializeArticleLotties,
  remapFontsToHuninn,
  resolveAnimationUrl,
} from "../src/assets/js/article-lottie.js";
import { ROOT } from "./helpers.mjs";

describe("文章 Lottie runtime", () => {
  it("只接受本站 /assets/lottie/ 下的 JSON", () => {
    const location = "https://imfw.io/posts/2026/example/";
    expect(resolveAnimationUrl("/assets/lottie/example.json", location))
      .toBe("https://imfw.io/assets/lottie/example.json");
    expect(resolveAnimationUrl("/assets/lottie/series/example-01.json", location))
      .toBe("https://imfw.io/assets/lottie/series/example-01.json");

    for (const source of [
      "https://example.com/assets/lottie/example.json",
      "/assets/lottie/../images/example.json",
      "/assets/lottie/%2e%2e/example.json",
      "/assets/lottie/example.json?remote=1",
      "/assets/images/example.json",
      "/assets/lottie/example.js",
    ]) {
      expect(resolveAnimationUrl(source, location), source).toBeNull();
    }
  });

  it("local image assets 固定解析到已驗證 JSON 的同源目錄", () => {
    expect(assetDirectoryForAnimation("https://imfw.io/assets/lottie/example.json"))
      .toBe("https://imfw.io/assets/lottie/");
    expect(assetDirectoryForAnimation("https://imfw.io/assets/lottie/series/example.json"))
      .toBe("https://imfw.io/assets/lottie/series/");
  });

  it("在記憶體中把 Lottie 字型 family 映射為 Huninn", () => {
    const animationData = {
      fonts: {
        list: [
          { fName: "SourceHanSans", fFamily: "Source Han Sans", fPath: "https://example.com/font.ttf" },
          { fName: "Huninn", fFamily: "jf-openhuninn-2.1", origin: 3 },
        ],
      },
    };

    expect(remapFontsToHuninn(animationData)).toBe(animationData);
    expect(animationData.fonts.list).toEqual([
      { fName: "SourceHanSans", fFamily: "Huninn" },
      { fName: "Huninn", fFamily: "Huninn" },
    ]);
  });

  it("只接受同目錄的純檔名 PNG/JPEG asset", () => {
    expect(hasUnsafeAssets({ assets: [{ id: "precomp", layers: [] }] })).toBe(false);
    expect(hasUnsafeAssets({ assets: [{ p: "diagram.png", u: "./", e: 0 }] })).toBe(false);
    expect(hasUnsafeAssets({ assets: [{ p: "photo-01.JPEG" }] })).toBe(false);

    for (const asset of [
      { p: "../diagram.png" },
      { p: "nested/diagram.png" },
      { p: "nested\\diagram.jpg" },
      { p: "diagram.svg" },
      { p: "data:image/png;base64,abc", e: 1 },
      { p: "diagram.png", u: "https://example.com/" },
      { p: "diagram.png", u: "/assets/images/" },
      { p: "diagram.png", e: 1 },
    ]) {
      expect(hasUnsafeAssets({ assets: [asset] }), JSON.stringify(asset)).toBe(true);
    }
  });

  it("進入畫面只自動開始一次，離開後暫停並在回來時續播", () => {
    const animation = {
      play: vi.fn(),
      pause: vi.fn(),
      goToAndPlay: vi.fn(),
    };
    const statuses = [];
    const controller = createPlaybackController(animation, ({ status }) => statuses.push(status));

    controller.onVisibility(true);
    controller.onVisibility(false);
    controller.onVisibility(true);
    expect(animation.play).toHaveBeenCalledTimes(2);
    expect(animation.pause).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["playing", "paused", "playing"]);

    controller.toggle();
    controller.onVisibility(false);
    controller.onVisibility(true);
    expect(animation.play).toHaveBeenCalledTimes(2);
    controller.toggle();
    expect(animation.play).toHaveBeenCalledTimes(3);

    controller.complete();
    controller.onVisibility(true);
    expect(animation.play).toHaveBeenCalledTimes(3);
    controller.toggle();
    expect(animation.goToAndPlay).toHaveBeenCalledWith(0, true);
  });

  it("沒有 figure 或偏好 reduced motion 時不載入 heavy player", async () => {
    const playerLoader = vi.fn();
    const baseWindow = {
      location: { href: "https://imfw.io/posts/2026/example/" },
      matchMedia: vi.fn(() => ({ matches: false })),
    };

    await expect(initializeArticleLotties({
      documentRef: { querySelectorAll: () => [] },
      windowRef: baseWindow,
      playerLoader,
    })).resolves.toEqual([]);
    expect(playerLoader).not.toHaveBeenCalled();

    await expect(initializeArticleLotties({
      documentRef: { querySelectorAll: () => [{}] },
      windowRef: { ...baseWindow, matchMedia: vi.fn(() => ({ matches: true })) },
      playerLoader,
    })).resolves.toEqual([]);
    expect(playerLoader).not.toHaveBeenCalled();
  });

  it("lottie-web 版本固定為 5.13.0", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(packageJson.devDependencies["lottie-web"]).toBe("5.13.0");
  });
});
