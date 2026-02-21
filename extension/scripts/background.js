const DEFAULT_API_BASE_URL = "https://api.skiper.stefanov.tech";
const ANALYSIS_CACHE_KEY = "analysisCache";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  if (!settings.userPrompt) {
    await chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: String(error instanceof Error ? error.message : error) }));
  return true;
});

async function handleMessage(message) {
  switch (message?.type) {
    case "getSettings":
      return await getSettings();
    case "saveSettings":
      await saveSettings(message.payload ?? {});
      return await getSettings();
    case "analyzeVideo":
      return await analyzeVideo(message.payload?.videoIdOrUrl ?? "");
    case "submitFeedback":
      return await submitFeedback({
        videoIdOrUrl: message.payload?.videoIdOrUrl ?? "",
        feedback: message.payload?.feedback ?? ""
      });
    case "openOptions":
      await chrome.runtime.openOptionsPage();
      return { opened: true };
    default:
      throw new Error("Unsupported message type");
  }
}

async function getSettings() {
  const data = await chrome.storage.sync.get(["userPrompt", "apiBaseUrl"]);
  return {
    userPrompt: typeof data.userPrompt === "string" ? data.userPrompt : "",
    apiBaseUrl: typeof data.apiBaseUrl === "string" && data.apiBaseUrl.trim() !== "" ? data.apiBaseUrl.trim() : DEFAULT_API_BASE_URL
  };
}

async function saveSettings(payload) {
  const dataToSave = {};
  if (typeof payload.userPrompt === "string") {
    dataToSave.userPrompt = payload.userPrompt.trim();
  }
  if (typeof payload.apiBaseUrl === "string" && payload.apiBaseUrl.trim() !== "") {
    dataToSave.apiBaseUrl = payload.apiBaseUrl.trim();
  }

  if (Object.keys(dataToSave).length > 0) {
    await chrome.storage.sync.set(dataToSave);
  }
}

async function analyzeVideo(videoIdOrUrl) {
  if (typeof videoIdOrUrl !== "string" || videoIdOrUrl.trim() === "") {
    throw new Error("Missing video ID or URL");
  }

  const settings = await getSettings();
  if (!settings.userPrompt) {
    throw new Error("User prompt is empty. Open Skiper settings and fill it in.");
  }

  const normalizedId = extractVideoId(videoIdOrUrl);
  const cached = await readFromCache(normalizedId);
  if (cached) {
    return cached;
  }

  const response = await fetch(`${settings.apiBaseUrl}/api/analyze-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoIdOrUrl,
      userPrompt: settings.userPrompt
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : `HTTP ${response.status}`;
    throw new Error(detail);
  }

  const data = {
    videoId: typeof payload.videoId === "string" ? payload.videoId : normalizedId,
    scores: payload.scores ?? { uniqueness: 0, density: 0, relevance: 0 },
    averageScore: Number(payload.averageScore ?? 0),
    verdict: payload.verdict === "hide" ? "hide" : "show",
    summary: typeof payload.summary === "string" ? payload.summary : ""
  };

  await writeToCache(data.videoId, data);
  return data;
}

async function submitFeedback({ videoIdOrUrl, feedback }) {
  if (typeof videoIdOrUrl !== "string" || videoIdOrUrl.trim() === "") {
    throw new Error("Missing current video ID");
  }
  if (typeof feedback !== "string" || feedback.trim().length < 3) {
    throw new Error("Feedback text is too short");
  }

  const settings = await getSettings();
  if (!settings.userPrompt) {
    throw new Error("User prompt is empty. Open Skiper settings and fill it in.");
  }

  const response = await fetch(`${settings.apiBaseUrl}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoIdOrUrl,
      userPrompt: settings.userPrompt,
      feedback: feedback.trim()
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : `HTTP ${response.status}`;
    throw new Error(detail);
  }

  const updatedUserPrompt = typeof payload.updatedUserPrompt === "string" ? payload.updatedUserPrompt.trim() : "";
  if (!updatedUserPrompt) {
    throw new Error("Backend returned an empty updated prompt");
  }

  await chrome.storage.sync.set({ userPrompt: updatedUserPrompt });
  return { updatedUserPrompt, videoId: payload.videoId ?? extractVideoId(videoIdOrUrl) };
}

async function readFromCache(videoId) {
  const state = await chrome.storage.local.get([ANALYSIS_CACHE_KEY]);
  const cache = typeof state[ANALYSIS_CACHE_KEY] === "object" && state[ANALYSIS_CACHE_KEY] !== null ? state[ANALYSIS_CACHE_KEY] : {};
  const entry = cache[videoId];

  if (!entry || typeof entry !== "object") {
    return null;
  }

  if (Date.now() - Number(entry.ts ?? 0) > CACHE_TTL_MS) {
    return null;
  }

  return entry.data ?? null;
}

async function writeToCache(videoId, data) {
  const state = await chrome.storage.local.get([ANALYSIS_CACHE_KEY]);
  const cache = typeof state[ANALYSIS_CACHE_KEY] === "object" && state[ANALYSIS_CACHE_KEY] !== null ? state[ANALYSIS_CACHE_KEY] : {};

  cache[videoId] = { ts: Date.now(), data };

  const entries = Object.entries(cache);
  if (entries.length > 400) {
    entries.sort((a, b) => Number((a[1]).ts ?? 0) - Number((b[1]).ts ?? 0));
    const trimmed = Object.fromEntries(entries.slice(-300));
    await chrome.storage.local.set({ [ANALYSIS_CACHE_KEY]: trimmed });
    return;
  }

  await chrome.storage.local.set({ [ANALYSIS_CACHE_KEY]: cache });
}

function extractVideoId(videoIdOrUrl) {
  const raw = String(videoIdOrUrl).trim();
  if (!raw.includes("youtube.com") && !raw.includes("youtu.be")) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace(/^\//, "");
    }
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") ?? raw;
    }
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.replace("/shorts/", "").split("/")[0];
    }
  } catch (_error) {
    return raw;
  }

  return raw;
}
