import { createAlert } from "./alerts.js";
import { deleteMonitor, getMonitors, checkMonitorNow } from "../services/api.js";

const trackedPageElement = document.getElementById("tracked-pages");
const deleteButton = document.getElementsByClassName("delete-button");

export async function renderMonitorList() {
    const monitors = await getMonitors();
    
    trackedPageElement.innerHTML = monitors.map((item) => 
        `<tr>
            <td>
                <h3><strong>${item.title}</strong></h3>
                <div>Status: ${getStatusText(item)}</div>
                <div>Last checked: ${formatDate(item.lastCheckedAt)}</div>
                <div>Last changed: ${formatDate(item.lastChangedAt)}</div>
                <div>Changes: ${item.changeCount ?? 0}</div>
            </td>
            <td>
                <button class="check-monitor-button" data-id="${item._id}">Check now</button>
                <button class="delete-button" data-id="${item._id}">Delete</button>
            </td>
        </tr>`
    ).join('');

    const deleteButtons = document.querySelectorAll('.delete-button');
    deleteButtons.forEach((button) => {
        button.addEventListener('click', async (event) => {
            await deleteMonitor(event.target.getAttribute('data-id'));            
            renderMonitorList();
        });
    });

    const checkButtons = document.querySelectorAll('.check-monitor-button');
    checkButtons.forEach((button) => {
        button.addEventListener('click', async (event) => {
            await checkMonitorNow(event.target.getAttribute('data-id'));
            await renderMonitorList();
        });
    });

};

function formatDate(value) {
    if (!value) {
        return "Never";
    }

    return new Date(value).toLocaleString();
}

function getStatusText(monitor) {
    if (monitor.lastStatus === "failed") {
        return `Failed: ${monitor.lastError || "Unknown error"}`;
    }

    if (!monitor.lastCheckedAt) {
        return "Waiting for first check";
    }

    return "Success";
};

const REFRESH_INTERVAL_MS = 5000;

let refreshTimer = null;
let lastMonitorState = "";

async function refreshMonitorList() {
    try {
        const monitors = await getMonitors();

        const currentState = createMonitorState(monitors);

        if (currentState !== lastMonitorState) {
            renderMonitorList(monitors);
            lastMonitorState = currentState;
        }
    } catch (error) {
        console.error("Unable to refresh monitors:", error);
    }
}

function createMonitorState(monitors) {
    return JSON.stringify(
        monitors.map((monitor) => ({
            id: monitor._id,
            enabled: monitor.enabled,
            lastCheckedAt: monitor.lastCheckedAt,
            lastChangedAt: monitor.lastChangedAt,
            lastStatus: monitor.lastStatus,
            lastError: monitor.lastError,
            changeCount: monitor.changeCount
        }))
    );
}

function startMonitorPolling() {
    refreshMonitorList();

    refreshTimer = setInterval(
        refreshMonitorList,
        REFRESH_INTERVAL_MS
    );
}

function stopMonitorPolling() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

document.addEventListener(
    "DOMContentLoaded",
    startMonitorPolling
);

window.addEventListener(
    "unload",
    stopMonitorPolling
);