import { createAlert } from "./alerts.js";
import { deleteMonitor, getMonitors } from "../services/api.js";

const trackedPageElement = document.getElementById("tracked-pages");
const deleteButton = document.getElementsByClassName("delete-button");

export async function renderMonitorList() {
    const monitors = await getMonitors();
    
    trackedPageElement.innerHTML = monitors.map((item, index) => 
        `<tr>
            <td>${index}</td>
            <td>${item.title}</td>
            <td><button class="delete-button" id="${item.id}">Delete</button></td>
        </tr>`
    ).join('');

    const deleteButtons = document.querySelectorAll('.delete-button');
    deleteButtons.forEach((button) => {
        button.addEventListener('click', async (event) => {
            await deleteMonitor(event.target.id);            
            renderMonitorList();
        });
    });

};