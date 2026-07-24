document.addEventListener("DOMContentLoaded", async () => {
  const titleElement = document.getElementById("page-title");
  const urlElement = document.getElementById("page-url");
  const watchButton = document.getElementById("watch-button");
  const deleteButton = document.getElementsByClassName("delete-button");
  const statusElement = document.getElementById("status");
  const trackedPageElement = document.getElementById("tracked-pages");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.url) {
      throw new Error("Could not read the current page.");
    }

    //Set initial popup data
    titleElement.textContent = tab.title || "Current page";
    urlElement.textContent = tab.url;
    getMonitoredPageList()

    //Alert generation
    createAlert = (message) => {
        statusElement.innerHTML = "<h2>" + message + "</h2>";
    }

    //Load table view in popup
    async function getMonitoredPageList() {
        //Get saved pages
        var { monitoredPages } = await chrome.storage.local.get({ monitoredPages: [] });
        //Add list items
        trackedPageElement.innerHTML = monitoredPages.map((item, index) => 
            `<tr>
                <td>${index}</td>
                <td>${item.title}</td>
                <td><button class="delete-button" id="delete-${index}" data-index="${index}">Delete</button></td>
            </tr>`
        ).join('');
        //Add event listeners to each button created
        const deleteButtons = document.querySelectorAll('.delete-button');
        deleteButtons.forEach((button, index) => {
            button.addEventListener('click', (event) => {
                var indexToRemove = Number(event.target.getAttribute('data-index'));
                chrome.storage.local.get(['monitoredPages'], (result) => {
                    if (result.monitoredPages && Array.isArray(result.monitoredPages)) {
                        const updatedList = result.monitoredPages.filter((_, index) => index !== indexToRemove);
                        chrome.storage.local.set({ monitoredPages: updatedList });
                        createAlert("Page removed!"); 
                        getMonitoredPageList()  
                    }
                });
            });
        });
    }
    
    //Add a new page to the list
    watchButton.addEventListener("click", async () => {
        async function addNewPage(newPageObject) {
            const { monitoredPages } = await chrome.storage.local.get({ monitoredPages: [] });            
            const updatedPages = [...monitoredPages, newPageObject];            
            await chrome.storage.local.set({ monitoredPages: updatedPages });
        }
        await addNewPage({ title: tab.title || "Untitled page", url: tab.url, savedAt: new Date().toISOString() });
        createAlert("Page saved!");       
        getMonitoredPageList()        
    })

  } catch (error) {
    titleElement.textContent = "Unable to read this page.";
    urlElement.textContent = "";
    watchButton.disabled = true;
    statusElement.textContent = error.message;
  }
});