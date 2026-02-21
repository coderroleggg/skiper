const promptField = document.getElementById("userPrompt");
const apiBaseUrlField = document.getElementById("apiBaseUrl");
const saveButton = document.getElementById("save");
const status = document.getElementById("status");

init().catch((error) => {
  setStatus(`Error: ${String(error)}`);
});

async function init() {
  const settings = await callBackground({ type: "getSettings" });
  promptField.value = settings.userPrompt || "";
  apiBaseUrlField.value = settings.apiBaseUrl || "";
}

saveButton.addEventListener("click", async () => {
  setStatus("Saving...");
  try {
    const settings = await callBackground({
      type: "saveSettings",
      payload: {
        userPrompt: promptField.value,
        apiBaseUrl: apiBaseUrlField.value
      }
    });

    promptField.value = settings.userPrompt || "";
    apiBaseUrlField.value = settings.apiBaseUrl || "";
    setStatus("Saved");
  } catch (error) {
    setStatus(`Error: ${String(error)}`);
  }
});

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

function setStatus(text) {
  status.textContent = text;
}
