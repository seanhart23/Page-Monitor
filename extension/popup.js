document.addEventListener("DOMContentLoaded", async () => {
  const titleElement = document.getElementById("page-title");
  const urlElement = document.getElementById("page-url");
  const watchButton = document.getElementById("watch-button");
  const statusElement = document.getElementById("status");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.url) {
      throw new Error("Could not read the current page.");
    }

    titleElement.textContent = tab.title || "Current page";
    urlElement.textContent = tab.url;

    watchButton.addEventListener("click", async () => {
      await chrome.storage.local.set({
        monitoredPage: {
          title: tab.title || "Untitled page",
          url: tab.url,
          savedAt: new Date().toISOString()
        }
      });

      statusElement.textContent = "Page saved!";
    });
  } catch (error) {
    titleElement.textContent = "Unable to read this page.";
    urlElement.textContent = "";
    watchButton.disabled = true;
    statusElement.textContent = error.message;
  }
});