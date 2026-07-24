import { createAlert } from "../popup.js";

const trackedPageElement = document.getElementById("tracked-pages");
const deleteButton = document.getElementsByClassName("delete-button");
const watchButton = document.getElementById("watch-button");
const statusElement = document.getElementById("status");

export async function getMonitoredPageList() {
    var { monitoredPages } = await chrome.storage.local.get({ monitoredPages: [] });

    trackedPageElement.innerHTML = monitoredPages.map((item, index) => 
        `<tr>
            <td>${index}</td>
            <td>${item.title}</td>
            <td><button class="delete-button" id="delete-${index}" data-index="${index}">Delete</button></td>
        </tr>`
    ).join('');

    const deleteButtons = document.querySelectorAll('.delete-button');
    
    deleteButtons.forEach((button, index) => {
        button.addEventListener('click', (event) => {
            const indexToRemove = Number(event.target.getAttribute('data-index'));
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