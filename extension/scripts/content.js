const CARD_SELECTORS = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-playlist-renderer"
].join(",");

const analysisCache = new Map();
const inflightAnalysis = new Map();
let scanTimer = null;
let promptNoticeRendered = false;

bootstrap().catch((error) => {
  console.error("[Skiper] bootstrap failed", error);
});

function bootstrap() {
  injectBaseStyles();
  scheduleScan();
  startObservers();
  hookNavigationEvents();
  setInterval(() => {
    scheduleScan();
    ensureFeedbackButton();
  }, 2500);
  return ensurePromptExists();
}

function startObservers() {
  const observer = new MutationObserver(() => {
    scheduleScan();
    ensureFeedbackButton();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function hookNavigationEvents() {
  window.addEventListener("yt-navigate-finish", () => {
    scheduleScan();
    ensureFeedbackButton();
  });
}

function scheduleScan() {
  if (scanTimer !== null) {
    clearTimeout(scanTimer);
  }

  scanTimer = setTimeout(() => {
    scanTimer = null;
    scanRecommendationCards().catch((error) => {
      console.error("[Skiper] scan error", error);
    });
  }, 250);
}

async function scanRecommendationCards() {
  const cards = Array.from(document.querySelectorAll(CARD_SELECTORS));
  for (const card of cards) {
    const anchor = card.querySelector("a#thumbnail[href], a#video-title-link[href], a[href*='watch?v=']");
    if (!(anchor instanceof HTMLAnchorElement)) {
      continue;
    }

    const videoId = extractVideoId(anchor.href);
    if (!videoId) {
      continue;
    }

    const analysis = await ensureVideoAnalysis(videoId, anchor.href);
    if (!analysis) {
      continue;
    }

    applyCardVisualState(anchor, analysis);
  }
}

async function ensureVideoAnalysis(videoId, videoUrl) {
  if (analysisCache.has(videoId)) {
    return analysisCache.get(videoId);
  }

  if (inflightAnalysis.has(videoId)) {
    return await inflightAnalysis.get(videoId);
  }

  const task = callBackground({
    type: "analyzeVideo",
    payload: { videoIdOrUrl: videoId || videoUrl }
  })
    .then((data) => {
      analysisCache.set(videoId, data);
      return data;
    })
    .catch((error) => {
      if (!String(error).includes("User prompt is empty")) {
        console.warn("[Skiper] analyze error", videoId, error);
      }
      return null;
    })
    .finally(() => {
      inflightAnalysis.delete(videoId);
    });

  inflightAnalysis.set(videoId, task);
  return await task;
}

function applyCardVisualState(anchor, analysis) {
  const shouldHide = Number(analysis.averageScore ?? 0) < 5 || analysis.verdict === "hide";

  let overlay = anchor.querySelector(":scope > .skiper-mask");

  if (!shouldHide) {
    if (overlay) {
      overlay.remove();
    }
    anchor.dataset.skiperState = "clean";
    return;
  }

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "skiper-mask";
    overlay.textContent = "💩";
    anchor.appendChild(overlay);
  }

  anchor.style.position = "relative";
  anchor.style.display = "block";
  anchor.dataset.skiperState = "hidden";
}

async function ensurePromptExists() {
  const settings = await callBackground({ type: "getSettings" }).catch(() => ({ userPrompt: "" }));

  if (settings.userPrompt || promptNoticeRendered) {
    return;
  }

  promptNoticeRendered = true;

  const notice = document.createElement("div");
  notice.className = "skiper-prompt-notice";
  notice.innerHTML = [
    "<strong>Skiper setup required</strong>",
    "<span>Add your relevance prompt so Skiper can score recommendations.</span>",
    "<button type='button'>Open settings</button>"
  ].join("");

  const button = notice.querySelector("button");
  if (button) {
    button.addEventListener("click", () => {
      callBackground({ type: "openOptions" }).catch(() => undefined);
    });
  }

  document.body.appendChild(notice);
}

function ensureFeedbackButton() {
  if (!isWatchPage()) {
    const existing = document.getElementById("skiper-feedback-button");
    if (existing) {
      existing.remove();
    }
    return;
  }

  const titleHost = document.querySelector("ytd-watch-metadata #title h1") || document.querySelector("#above-the-fold #title h1");
  if (!(titleHost instanceof HTMLElement)) {
    return;
  }

  let button = document.getElementById("skiper-feedback-button");
  if (!button) {
    button = document.createElement("button");
    button.id = "skiper-feedback-button";
    button.type = "button";
    button.textContent = "Feedback";
    button.addEventListener("click", openFeedbackModal);
    titleHost.appendChild(button);
  }
}

function openFeedbackModal() {
  const existing = document.getElementById("skiper-feedback-modal");
  if (existing) {
    existing.remove();
  }

  const modal = document.createElement("div");
  modal.id = "skiper-feedback-modal";
  modal.innerHTML = `
    <div class="skiper-feedback-backdrop"></div>
    <div class="skiper-feedback-card">
      <h3>Skiper Feedback</h3>
      <p>Describe why this video was useful or useless for you.</p>
      <textarea placeholder="Example: too generic, no concrete examples, weak signal-to-noise ratio"></textarea>
      <div class="skiper-feedback-actions">
        <button class="secondary" data-close>Cancel</button>
        <button class="primary" data-submit>Submit</button>
      </div>
      <p class="skiper-feedback-status" aria-live="polite"></p>
    </div>
  `;

  const close = () => modal.remove();

  modal.querySelector("[data-close]")?.addEventListener("click", close);
  modal.querySelector(".skiper-feedback-backdrop")?.addEventListener("click", close);

  modal.querySelector("[data-submit]")?.addEventListener("click", async () => {
    const textarea = modal.querySelector("textarea");
    const status = modal.querySelector(".skiper-feedback-status");
    if (!(textarea instanceof HTMLTextAreaElement) || !(status instanceof HTMLElement)) {
      return;
    }

    const feedbackText = textarea.value.trim();
    if (feedbackText.length < 3) {
      status.textContent = "Please write a bit more detail.";
      return;
    }

    const currentVideoId = getCurrentVideoId();
    if (!currentVideoId) {
      status.textContent = "Could not detect current video ID.";
      return;
    }

    status.textContent = "Submitting and updating your preferences...";

    try {
      await callBackground({
        type: "submitFeedback",
        payload: {
          videoIdOrUrl: currentVideoId,
          feedback: feedbackText
        }
      });
      status.textContent = "Saved. Your prompt has been updated.";
      setTimeout(close, 700);
    } catch (error) {
      status.textContent = `Error: ${String(error)}`;
    }
  });

  document.body.appendChild(modal);
}

function getCurrentVideoId() {
  try {
    const url = new URL(window.location.href);
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || "";
    }
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.replace("/shorts/", "").split("/")[0] || "";
    }
  } catch (_error) {
    return "";
  }
  return "";
}

function isWatchPage() {
  return window.location.pathname === "/watch" || window.location.pathname.startsWith("/shorts/");
}

function extractVideoId(href) {
  if (!href) {
    return "";
  }

  try {
    const url = new URL(href, window.location.origin);
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || "";
    }
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.replace("/shorts/", "").split("/")[0] || "";
    }
  } catch (_error) {
    return "";
  }

  return "";
}

async function callBackground(message) {
  return await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message || "Runtime error");
        return;
      }
      if (!response?.ok) {
        reject(response?.error || "Unknown error");
        return;
      }
      resolve(response.data);
    });
  });
}

function injectBaseStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .skiper-mask {
      position: absolute;
      inset: 0;
      background: #000;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: clamp(26px, 2.4vw, 42px);
      z-index: 2;
      pointer-events: none;
      border-radius: 12px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
    }

    .skiper-prompt-notice {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      background: #0f1114;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 999px;
      padding: 8px 10px 8px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.32);
    }

    .skiper-prompt-notice button {
      border: 0;
      border-radius: 999px;
      padding: 8px 12px;
      font-weight: 600;
      cursor: pointer;
      background: #3a8fff;
      color: #fff;
    }

    #skiper-feedback-button {
      margin-left: 12px;
      border: 1px solid rgba(255,255,255,0.26);
      background: rgba(0,0,0,0.68);
      color: #fff;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      vertical-align: middle;
    }

    #skiper-feedback-modal {
      position: fixed;
      inset: 0;
      z-index: 999999;
      font-family: Arial, sans-serif;
    }

    .skiper-feedback-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.66);
    }

    .skiper-feedback-card {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(520px, calc(100vw - 32px));
      background: #0f1114;
      color: #f1f4f8;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.14);
      padding: 18px;
      box-shadow: 0 20px 80px rgba(0,0,0,0.45);
    }

    .skiper-feedback-card h3 {
      margin: 0 0 8px;
      font-size: 19px;
    }

    .skiper-feedback-card p {
      margin: 0 0 10px;
      font-size: 13px;
      color: #c2ccd6;
    }

    .skiper-feedback-card textarea {
      width: 100%;
      min-height: 120px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.18);
      background: #050608;
      color: #fff;
      padding: 10px;
      resize: vertical;
      box-sizing: border-box;
    }

    .skiper-feedback-actions {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .skiper-feedback-actions button {
      border: 0;
      border-radius: 10px;
      padding: 8px 12px;
      cursor: pointer;
      font-weight: 600;
    }

    .skiper-feedback-actions .secondary {
      background: #20242b;
      color: #d8e1eb;
    }

    .skiper-feedback-actions .primary {
      background: #2c9f67;
      color: #fff;
    }

    .skiper-feedback-status {
      min-height: 18px;
      margin-top: 10px !important;
      color: #9ad2ff !important;
    }
  `;
  document.documentElement.appendChild(style);
}
