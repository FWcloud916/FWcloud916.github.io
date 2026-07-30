const PLAYER_SRC = "/assets/js/lottie-light-5.13.0.min.js";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SAFE_LOTTIE_PATH = /^\/assets\/lottie\/(?:[A-Za-z0-9][A-Za-z0-9_-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.json$/;
const SAFE_IMAGE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g)$/i;

let playerPromise;

export function resolveAnimationUrl(rawSource, locationHref) {
  if (typeof rawSource !== "string" || !SAFE_LOTTIE_PATH.test(rawSource)) {
    return null;
  }

  const url = new URL(rawSource, locationHref);
  const location = new URL(locationHref);
  if (url.origin !== location.origin || url.search || url.hash) {
    return null;
  }

  return url.href;
}

export function assetDirectoryForAnimation(animationUrl) {
  return new URL("./", animationUrl).href;
}

export function hasUnsafeAssets(animationData) {
  if (!Array.isArray(animationData?.assets)) {
    return false;
  }

  return animationData.assets.some((asset) => {
    if (!asset || typeof asset !== "object") {
      return true;
    }

    const hasImage = Object.hasOwn(asset, "p");
    const safePrefix = asset.u === undefined || asset.u === "" || asset.u === "./";
    const safeEmbedFlag = asset.e === undefined || asset.e === 0;
    if (!safePrefix || !safeEmbedFlag) {
      return true;
    }
    if (!hasImage) {
      return false;
    }

    return typeof asset.p !== "string" ||
      !SAFE_IMAGE_FILENAME.test(asset.p) ||
      asset.p.includes("..");
  });
}

export function remapFontsToHuninn(animationData) {
  const fonts = animationData?.fonts?.list;
  if (!Array.isArray(fonts)) {
    return animationData;
  }

  for (const font of fonts) {
    if (font && typeof font === "object") {
      font.fFamily = "Huninn";
      delete font.fPath;
      delete font.origin;
    }
  }
  return animationData;
}

export function normalizeLottieForWeb(animationData) {
  const normalizeKeyframes = (value) => {
    if (Array.isArray(value)) {
      for (const child of value) {
        normalizeKeyframes(child);
      }
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    if (value.a === 1 && Array.isArray(value.k)) {
      for (let index = 0; index < value.k.length - 1; index += 1) {
        const current = value.k[index];
        const next = value.k[index + 1];
        if (current && typeof current === "object" && Object.hasOwn(current, "e")) {
          current.i ??= next?.i ?? { x: [0], y: [1] };
          current.o ??= { x: [0.2], y: [0] };
        }
      }
    }
    for (const child of Object.values(value)) {
      normalizeKeyframes(child);
    }
  };

  const normalizeTransform = (transform) => {
    if (!transform || typeof transform !== "object") {
      return;
    }
    transform.sk ??= { a: 0, k: 0 };
    transform.sa ??= { a: 0, k: 0 };
  };

  const normalizeShapes = (shapes) => {
    if (!Array.isArray(shapes)) {
      return;
    }
    shapes.forEach((shape, index) => {
      if (!shape || typeof shape !== "object") {
        return;
      }
      shape.ix ??= index + 1;
      shape.hd ??= false;
      if (shape.ty === "rc" || shape.ty === "el") {
        shape.d ??= 1;
      } else if (shape.ty === "tr") {
        normalizeTransform(shape);
      } else if (shape.ty === "gr") {
        shape.np ??= Array.isArray(shape.it) ? shape.it.length : 0;
        shape.cix ??= 2;
        shape.bm ??= 0;
        normalizeShapes(shape.it);
      }
    });
  };

  const normalizeLayers = (layers) => {
    if (!Array.isArray(layers)) {
      return;
    }
    layers.forEach((layer, index) => {
      if (!layer || typeof layer !== "object") {
        return;
      }
      layer.ind ??= index + 1;
      layer.ddd ??= 0;
      layer.ao ??= 0;
      layer.bm ??= 0;
      normalizeTransform(layer.ks);
      if (layer.ty === 4) {
        layer.sr ??= 1;
        normalizeShapes(layer.shapes);
      }
      if (layer.ty === 5 && layer.t && typeof layer.t === "object") {
        layer.t.a ??= [];
        layer.t.p ??= {};
        layer.t.m ??= { g: 1, a: { a: 0, k: [0, 0] } };
        const documents = layer.t.d?.k;
        if (Array.isArray(documents)) {
          for (const keyframe of documents) {
            if (keyframe?.s && typeof keyframe.s === "object") {
              keyframe.s.ls ??= 0;
            }
          }
        }
      }
    });
  };

  animationData.ddd ??= 0;
  normalizeKeyframes(animationData);
  normalizeLayers(animationData.layers);
  if (Array.isArray(animationData.assets)) {
    for (const asset of animationData.assets) {
      normalizeLayers(asset?.layers);
    }
  }
  return animationData;
}

export function collapseNativeText(container) {
  for (const group of container.querySelectorAll("g[aria-label]")) {
    const label = group.getAttribute("aria-label");
    const nodes = [...group.querySelectorAll("text")];
    if (!label || nodes.length === 0) {
      continue;
    }
    nodes[0].textContent = label;
    for (const node of nodes.slice(1)) {
      node.remove();
    }
  }
}

export function createPlaybackController(animation, onStateChange = () => {}) {
  const state = {
    status: "idle",
    hasStarted: false,
    isVisible: false,
    userPaused: false,
  };

  const update = (status) => {
    state.status = status;
    onStateChange({ ...state });
  };

  return {
    state,
    onVisibility(isVisible) {
      state.isVisible = isVisible;
      if (isVisible) {
        if (!state.hasStarted) {
          state.hasStarted = true;
          state.userPaused = false;
          animation.play();
          update("playing");
        } else if (state.status === "paused" && !state.userPaused) {
          animation.play();
          update("playing");
        }
      } else if (state.status === "playing") {
        animation.pause();
        update("paused");
      }
    },
    toggle() {
      if (state.status === "complete") {
        state.hasStarted = true;
        state.userPaused = false;
        animation.goToAndPlay(0, true);
        update("playing");
      } else if (state.status === "playing") {
        state.userPaused = true;
        animation.pause();
        update("paused");
      } else {
        state.hasStarted = true;
        state.userPaused = false;
        animation.play();
        update("playing");
      }
    },
    complete() {
      state.userPaused = false;
      update("complete");
    },
  };
}

function loadLottiePlayer(documentRef, windowRef) {
  if (windowRef.lottie?.loadAnimation) {
    return Promise.resolve(windowRef.lottie);
  }
  if (playerPromise) {
    return playerPromise;
  }

  playerPromise = new Promise((resolve, reject) => {
    const script = documentRef.createElement("script");
    script.src = PLAYER_SRC;
    script.async = true;
    script.addEventListener("load", () => {
      if (windowRef.lottie?.loadAnimation) {
        resolve(windowRef.lottie);
      } else {
        reject(new Error("Lottie player 載入後沒有提供 API"));
      }
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Lottie player 載入失敗")), { once: true });
    documentRef.head.append(script);
  });

  return playerPromise;
}

async function waitForHuninn(documentRef) {
  if (!documentRef.fonts?.load) {
    return;
  }
  await documentRef.fonts.load("16px Huninn");
}

function waitForAnimation(animation) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Lottie 初始化逾時")), 10_000);
    const finish = (callback) => {
      clearTimeout(timeout);
      callback();
    };

    animation.addEventListener("DOMLoaded", () => finish(resolve));
    animation.addEventListener("data_failed", () => finish(() => reject(new Error("Lottie 資料載入失敗"))));
    animation.addEventListener("error", () => finish(() => reject(new Error("Lottie SVG 建立失敗"))));
  });
}

function setControlState(button, state) {
  const labels = {
    idle: "播放動畫",
    playing: "暫停動畫",
    paused: "繼續播放",
    complete: "重播動畫",
  };
  button.textContent = labels[state.status];
  button.setAttribute("aria-pressed", state.status === "playing" ? "true" : "false");
}

async function initializeFigure({ figure, player, documentRef, windowRef, fetchFn }) {
  const stage = figure.querySelector(".article-lottie__stage");
  const poster = stage?.querySelector("img");
  const source = resolveAnimationUrl(figure.dataset.lottieSrc, windowRef.location.href);
  if (!stage || !poster || !source) {
    throw new Error("文章 Lottie figure 合約不完整");
  }
  poster.classList.add("article-lottie__poster");

  const response = await fetchFn(source, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Lottie JSON 載入失敗（${response.status}）`);
  }

  const animationData = remapFontsToHuninn(normalizeLottieForWeb(await response.json()));
  if (hasUnsafeAssets(animationData)) {
    throw new Error("Lottie JSON 含有不安全的素材路徑");
  }
  await waitForHuninn(documentRef);

  const mount = documentRef.createElement("div");
  mount.className = "article-lottie__animation";
  mount.hidden = true;
  mount.setAttribute("aria-hidden", "true");
  stage.append(mount);

  const animation = player.loadAnimation({
    container: mount,
    renderer: "svg",
    loop: false,
    autoplay: false,
    animationData,
    assetsPath: assetDirectoryForAnimation(source),
    rendererSettings: {
      preserveAspectRatio: "xMidYMid meet",
      progressiveLoad: true,
    },
  });

  try {
    await waitForAnimation(animation);
    collapseNativeText(mount);
  } catch (error) {
    animation.destroy();
    mount.remove();
    throw error;
  }

  const controls = documentRef.createElement("div");
  controls.className = "article-lottie__controls";
  const button = documentRef.createElement("button");
  button.type = "button";
  button.className = "article-lottie__control";
  controls.append(button);
  const caption = figure.querySelector("figcaption");
  figure.insertBefore(controls, caption);

  const controller = createPlaybackController(animation, (state) => setControlState(button, state));
  setControlState(button, controller.state);
  button.addEventListener("click", () => controller.toggle());
  animation.addEventListener("complete", () => controller.complete());

  mount.hidden = false;
  poster.hidden = true;

  if ("IntersectionObserver" in windowRef) {
    const observer = new windowRef.IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === figure) {
          controller.onVisibility(entry.isIntersecting && entry.intersectionRatio > 0);
        }
      }
    }, { threshold: 0.15 });
    observer.observe(figure);
  } else {
    controller.onVisibility(true);
  }
}

export async function initializeArticleLotties({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  fetchFn = globalThis.fetch,
  playerLoader = loadLottiePlayer,
} = {}) {
  if (!documentRef || !windowRef) {
    return [];
  }

  const figures = [...documentRef.querySelectorAll("figure.article-lottie[data-lottie-src]")];
  if (figures.length === 0 || windowRef.matchMedia(REDUCED_MOTION_QUERY).matches) {
    return [];
  }

  const player = await playerLoader(documentRef, windowRef);
  return Promise.allSettled(figures.map((figure) =>
    initializeFigure({ figure, player, documentRef, windowRef, fetchFn })
  ));
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  initializeArticleLotties()
    .then((results) => {
      for (const result of results) {
        if (result.status === "rejected") {
          console.warn("文章 Lottie 初始化失敗，保留靜態 poster。", result.reason);
        }
      }
    })
    .catch((error) => {
      console.warn("文章 Lottie 初始化失敗，保留靜態 poster。", error);
    });
}
