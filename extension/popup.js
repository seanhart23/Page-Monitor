import { createMonitor } from "./services/api.js";
import { renderMonitorList } from "./ui/renderMonitorList.js";
import { createAlert } from "./ui/alerts.js";
import { validateUrl } from "./utils/urlValidator.js";
import { getMonitorHistory } from "../services/api.js";

const titleElement = document.getElementById("page-title");
const urlElement = document.getElementById("page-url");
const watchButton = document.getElementById("watch-button");
const statusElement = document.getElementById("status");

let tab = null;

await initializePopup();
await renderMonitorList();

async function initializePopup() {
  [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab || !tab.url) {
    throw new Error("Could not read the current page.");
  }

  const result = validateUrl(tab.url);

  titleElement.textContent = tab.title || "Current page";
  urlElement.textContent = tab.url;

  if (!result.valid) {
    statusElement.textContent = result.reason;
    watchButton.disabled = true;
  }
}

watchButton.addEventListener("click", async () => {
  try {
    watchButton.disabled = true;

    const monitor = {
      id: crypto.randomUUID(),
      title: tab.title || "Untitled page",
      url: tab.url,
      icon: tab.favIconUrl,
      savedAt: new Date().toISOString()
    };

    const serverMonitor = await createMonitor(monitor);

    createAlert("Page saved!", "success");

    await renderMonitorList();

  } catch (error) {

    createAlert( error.message || "Unable to save page.", "error");

  } finally {

    watchButton.disabled = false;

  }
});

function escapeHtml(value) {
    const element =
        document.createElement("div");

    element.textContent =
        value ?? "";

    return element.innerHTML;
}

export function renderHistory(history) {
    if (!history.length) {
        return `
            <div class="history-empty">
                No changes recorded yet.
            </div>
        `;
    }

    return `
        <div class="history-list">
            ${history.map((event) => {
                const date =
                    new Date(
                        event.checkedAt
                    ).toLocaleString();

                return `
                    <div class="history-item">
                        <span class="history-dot"></span>

                        <div>
                            <div class="history-summary">
                                ${escapeHtml(
                                    event.summary
                                )}
                            </div>

                            <div class="history-date">
                                ${date}
                            </div>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// historyButton.addEventListener(
//     "click",
//     async () => {
//         historyContainer.innerHTML =
//             "Loading history...";

//         try {
//             const history =
//                 await getMonitorHistory(
//                     monitor._id
//                 );

//             historyContainer.innerHTML =
//                 renderHistory(history);
//         } catch (error) {
//             console.error(error);

//             historyContainer.innerHTML =
//                 "Unable to load history.";
//         }
//     }
// );