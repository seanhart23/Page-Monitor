
import { addNewPage } from "./services/storage.js";
import { getMonitoredPageList } from "./ui/renderMonitorList.js";
import { validateUrl } from "./utils/urlValidator.js";

const titleElement = document.getElementById("page-title");
const urlElement = document.getElementById("page-url");
const statusElement = document.getElementById("status");
const watchButton = document.getElementById("watch-button");

//Alert generation
export function createAlert(message){
    statusElement.innerHTML = "<h2>" + message + "</h2>";
}

//Set initial popup data
document.addEventListener("DOMContentLoaded", async () => {
    try {
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.url) {
            throw new Error("Could not read the current page.");
        }

        const result = validateUrl(tab.url);

        if (!result.valid) {
            statusElement.textContent = result.reason;
            titleElement.textContent = tab.title;
            watchButton.disabled = true;
            return;
        }

        titleElement.textContent = tab.title || "Current page";
        urlElement.textContent = tab.url;
        await getMonitoredPageList()

        //Add a new page to the list
        watchButton.addEventListener("click", async () => {
            await addNewPage({ title: tab.title || "Untitled page", url: tab.url, savedAt: new Date().toISOString() });
            createAlert("Page saved!");       
            await getMonitoredPageList()        
        })

    } catch (error) {

        titleElement.textContent = "Unable to read this page.";
        urlElement.textContent = "";
        watchButton.disabled = true;
        statusElement.textContent = error.message;

    }
});