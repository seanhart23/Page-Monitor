import { getMonitors } from "../services/api.js";

const DEFAULT_SETTINGS = Object.freeze({
    notificationsEnabled: true,
    defaultCheckInterval: 30,
    autoDetectCurrentTab: true
});

import { API_BASE_URL } from "../config.js";

const elements = {
    notificationsEnabled:
        document.querySelector("#notificationsEnabled"),

    defaultCheckInterval:
        document.querySelector("#defaultCheckInterval"),

    autoDetectCurrentTab:
        document.querySelector("#autoDetectCurrentTab"),

    testNotificationButton:
        document.querySelector("#testNotificationButton"),

    notificationStatus:
        document.querySelector("#notificationStatus"),

    saveSettingsButton:
        document.querySelector("#saveSettingsButton"),

    saveMessage:
        document.querySelector("#saveMessage"),

    totalMonitors:
        document.querySelector("#totalMonitors"),

    activeMonitors:
        document.querySelector("#activeMonitors"),

    disabledMonitors:
        document.querySelector("#disabledMonitors"),

    totalChanges:
        document.querySelector("#totalChanges"),

    statisticsStatus:
        document.querySelector("#statisticsStatus"),

    connectionIndicator:
        document.querySelector("#connectionIndicator"),

    connectionLabel:
        document.querySelector("#connectionLabel"),

    connectionMessage:
        document.querySelector("#connectionMessage"),

    checkConnectionButton:
        document.querySelector("#checkConnectionButton"),

    extensionVersion:
        document.querySelector("#extensionVersion")
};

document.addEventListener("DOMContentLoaded", initializeSettingsPage);

async function initializeSettingsPage() {
    displayExtensionVersion();

    await Promise.allSettled([
        loadSettings(),
        loadStatistics(),
        checkBackendConnection()
    ]);

    addEventListeners();
}

function addEventListeners() {
    elements.saveSettingsButton.addEventListener(
        "click",
        saveSettings
    );

    elements.testNotificationButton.addEventListener(
        "click",
        sendTestNotification
    );

    elements.checkConnectionButton.addEventListener(
        "click",
        checkBackendConnection
    );

    elements.notificationsEnabled.addEventListener(
        "change",
        updateNotificationButtonState
    );
}

function displayExtensionVersion() {
    const manifest = chrome.runtime.getManifest();

    elements.extensionVersion.textContent =
        manifest.version ?? "Unknown";
}

async function loadSettings() {
    try {
        const storedSettings =
            await chrome.storage.sync.get(DEFAULT_SETTINGS);

        elements.notificationsEnabled.checked =
            storedSettings.notificationsEnabled;

        elements.defaultCheckInterval.value =
            String(storedSettings.defaultCheckInterval);

        elements.autoDetectCurrentTab.checked =
            storedSettings.autoDetectCurrentTab;

        updateNotificationButtonState();

    } catch (error) {
        console.error("Could not load settings:", error);

        showSaveMessage(
            "Settings could not be loaded.",
            "error"
        );
    }
}

async function saveSettings() {
    setSaveButtonLoading(true);
    clearSaveMessage();

    const settings = {
        notificationsEnabled:
            elements.notificationsEnabled.checked,

        defaultCheckInterval:
            Number(elements.defaultCheckInterval.value),

        autoDetectCurrentTab:
            elements.autoDetectCurrentTab.checked
    };

    try {
        await chrome.storage.sync.set(settings);

        showSaveMessage(
            "Settings saved.",
            "success"
        );

    } catch (error) {
        console.error("Could not save settings:", error);

        showSaveMessage(
            "Settings could not be saved.",
            "error"
        );

    } finally {
        setSaveButtonLoading(false);
    }
}

async function sendTestNotification() {
  try {
    const permissionLevel =
      await chrome.notifications.getPermissionLevel();

    console.log("Notification permission:", permissionLevel);

    if (permissionLevel !== "granted") {
      throw new Error(
        "Chrome notification permission is not granted."
      );
    }

    const notificationId =
      await chrome.notifications.create(
        `smart-page-monitor-test-${Date.now()}`,
        {
          type: "basic",
          iconUrl: chrome.runtime.getURL(
            "icons/icon.png"
          ),
          title: "Smart Page Monitor",
          message: "Test successful! Notifications are working.",
          priority: 2
        }
      );

    console.log(
      "Test notification created:",
      notificationId
    );

    showInlineStatus(
      elements.notificationStatus,
      "Test notification sent.",
      "success"
    );
  } catch (error) {
    console.error(
      "Test notification failed:",
      error
    );

    showInlineStatus(
      elements.notificationStatus,
      error.message || "Unable to send notification.",
      "error"
    );
  }
}

function updateNotificationButtonState() {
    const enabled =
        elements.notificationsEnabled.checked;

    elements.testNotificationButton.disabled = !enabled;

    if (!enabled) {
        clearInlineStatus(elements.notificationStatus);
    }
}

async function checkBackendConnection() {
    setConnectionState(
        "checking",
        "Checking connection…",
        "Contacting the Smart Page Monitor service."
    );

    elements.checkConnectionButton.disabled = true;

    try {
        const response = await fetch(
            `${API_BASE_URL}/health`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Server returned status ${response.status}.`
            );
        }

        setConnectionState(
            "connected",
            "Connected",
            "The monitoring service is available."
        );

    } catch (error) {
        console.error(
            "Backend connection check failed:",
            error
        );

        setConnectionState(
            "disconnected",
            "Unable to connect",
            "The service may be temporarily unavailable."
        );

    } finally {
        elements.checkConnectionButton.disabled = false;
    }
}

function setConnectionState(
    state,
    label,
    message
) {
    elements.connectionIndicator.className =
        `status-indicator status-${state}`;

    elements.connectionLabel.textContent = label;
    elements.connectionMessage.textContent = message;
}

async function loadStatistics() {
  clearInlineStatus(elements.statisticsStatus);

  try {
    const result = await getMonitors();

    const monitors = Array.isArray(result)
      ? result
      : result.monitors ?? [];

    const activeCount = monitors.filter(
      monitor => monitor.enabled !== false
    ).length;

    const disabledCount =
      monitors.length - activeCount;

    const totalChanges = monitors.reduce(
      (total, monitor) => {
        return total + Number(
          monitor.changeCount ?? 0
        );
      },
      0
    );

    elements.totalMonitors.textContent =
      String(monitors.length);

    elements.activeMonitors.textContent =
      String(activeCount);

    elements.disabledMonitors.textContent =
      String(disabledCount);

    elements.totalChanges.textContent =
      String(totalChanges);

  } catch (error) {
    console.error(
      "Could not load statistics:",
      error
    );

    elements.totalMonitors.textContent = "—";
    elements.activeMonitors.textContent = "—";
    elements.disabledMonitors.textContent = "—";
    elements.totalChanges.textContent = "—";

    showInlineStatus(
      elements.statisticsStatus,
      "Statistics are temporarily unavailable.",
      "error"
    );
  }
}

function setSaveButtonLoading(isLoading) {
    elements.saveSettingsButton.disabled = isLoading;

    elements.saveSettingsButton.textContent =
        isLoading
            ? "Saving…"
            : "Save settings";
}

function showSaveMessage(message, type) {
    elements.saveMessage.textContent = message;
    elements.saveMessage.className =
        `save-message ${type}`;

    window.clearTimeout(showSaveMessage.timeoutId);

    showSaveMessage.timeoutId = window.setTimeout(
        clearSaveMessage,
        3000
    );
}

function clearSaveMessage() {
    elements.saveMessage.textContent = "";
    elements.saveMessage.className =
        "save-message";
}

function showInlineStatus(element, message, type) {
    element.textContent = message;
    element.className =
        `inline-status ${type}`;
}

function clearInlineStatus(element) {
    element.textContent = "";
    element.className = "inline-status";
}