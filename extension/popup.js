
import { addNewPage } from "./services/storage.js";
import { getMonitoredPageList } from "./ui/renderMonitorList.js";
import { createAlert } from "./ui/alerts.js";
import { validateUrl } from "./utils/urlValidator.js";

const titleElement = document.getElementById("page-title");
const urlElement = document.getElementById("page-url");
const watchButton = document.getElementById("watch-button");
const statusElement = document.getElementById("status");

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

if (!tab || !tab.url) {
    throw new Error("Could not read the current page.");
}

const result = validateUrl(tab.url);

if (!result.valid) {
    titleElement.textContent = tab.title;
    statusElement.textContent = result.reason;
    watchButton.disabled = true;
} else {
    titleElement.textContent = tab.title || "Current page";
    urlElement.textContent = tab.url;
    await getMonitoredPageList()
}

watchButton.addEventListener("click", async () => {
    await addNewPage({ title: tab.title || "Untitled page", url: tab.url, savedAt: new Date().toISOString() });
    createAlert("Page saved!");       
    await getMonitoredPageList()        
})
