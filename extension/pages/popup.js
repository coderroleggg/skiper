const userPromptField = document.getElementById("userPrompt");
const apiBaseUrlField = document.getElementById("apiBaseUrl");
const saveButton = document.getElementById("save");
const openOptionsButton = document.getElementById("openOptions");
const status = document.getElementById("status");

bootstrap().catch((error) => {
  setStatus(`Error: ${String(error)}`);
});

async function bootstrap() {
  const settings = await callBackground({ type: "getSettings" });
  userPromptField.value = settings.userPrompt || "";
  apiBaseUrlField.value = settings.apiBaseUrl || "";
}

saveButton.addEventListener("click", async () => {
  setStatus("Saving...");
  try {
    const updated = await callBackground({
      type: "saveSettings",
      payload: {
        userPrompt: userPromptField.value,
        apiBaseUrl: apiBaseUrlField.value
      }
    });

    userPromptField.value = updated.userPrompt || "";
    apiBaseUrlField.value = updated.apiBaseUrl || "";
    setStatus("Saved");
  } catch (error) {
    setStatus(`Error: ${String(error)}`);
  }
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
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
