import {
  NOTIFICATION_ALARM,
  NOTIFICATION_DATA_KEY,
  PREVIEW_MAX_LENGTH
} from "./config.js";

import {
  getPendingNotifications,
  acknowledgeNotification
} from "./services/api.js";

function truncateText(value, maxLength = PREVIEW_MAX_LENGTH) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function getMonitorDomain(monitor) {
  try {
    return new URL(monitor.url).hostname.replace(/^www\./, "");
  } catch {
    return "Monitored page";
  }
}

function createNotificationMessage(change) {
  const addedText = change?.addedText?.trim() || "";

  const removedText = change?.removedText?.trim() || "";

  if (addedText && removedText) {
    return truncateNotificationText(
      `Changed to: ${addedText}`,
      180
    );
  }

  if (addedText) {
    return truncateNotificationText(
      `Added: ${addedText}`,
      180
    );
  }

  if (removedText) {
    return truncateNotificationText(
      `Removed: ${removedText}`,
      180
    );
  }

  return (
    change?.summary ||
    "The page content has changed."
  );
}

async function saveNotificationData(
  notificationId,
  monitor,
  change
) {
  const stored = await chrome.storage.local.get(
    NOTIFICATION_DATA_KEY
  );

  const notificationData = stored[NOTIFICATION_DATA_KEY] || {};

  notificationData[notificationId] = {
    monitorId: monitor._id,
    url: monitor.url,
    changeId: change?._id || null,
    createdAt: Date.now()
  };

  await chrome.storage.local.set({
    [NOTIFICATION_DATA_KEY]: notificationData
  });
}

async function getNotificationData(notificationId) {
  const stored = await chrome.storage.local.get(
    NOTIFICATION_DATA_KEY
  );

  return (
    stored[NOTIFICATION_DATA_KEY]?.[notificationId] ||
    null
  );
}

async function removeNotificationData(notificationId) {
  const stored = await chrome.storage.local.get(
    NOTIFICATION_DATA_KEY
  );

  const notificationData = stored[NOTIFICATION_DATA_KEY] || {};

  delete notificationData[notificationId];

  await chrome.storage.local.set({
    [NOTIFICATION_DATA_KEY]: notificationData
  });
}

async function showChangeNotification(monitor, change) {
  const notificationId =
    `monitor-change-${monitor._id}-${Date.now()}`;

  const pageTitle =
    truncateText(monitor.title, 50) ||
    getMonitorDomain(monitor);

  await saveNotificationData(
    notificationId,
    monitor,
    change
  );

  await chrome.notifications.create(
    notificationId,
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL(
        "ui/icons/icon.png"
      ),
      title: `${pageTitle} changed`,
      message: createNotificationMessage(change),
      contextMessage:
        `Smart Page Monitor • ${getMonitorDomain(monitor)}`,
      priority: 2,
      requireInteraction: false,
      buttons: [
        {
          title: "Open page"
        },
        {
          title: "View changes"
        }
      ]
    }
  );
}

chrome.runtime.onInstalled.addListener(() => {

  chrome.alarms.create(NOTIFICATION_ALARM, {
    periodInMinutes: 1
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(NOTIFICATION_ALARM, {
    periodInMinutes: 1
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {

  if (alarm.name !== NOTIFICATION_ALARM) {
    return;
  }

  processPendingNotifications();
});

function truncateNotificationText(
  text,
  maxLength = 180
) {
  const safeText = String(text)
    .replace(/\s+/g, " ")
    .trim();

  if (safeText.length <= maxLength) {
    return safeText;
  }

  return `${safeText.slice(
    0,
    maxLength - 1
  )}…`;
}

async function processPendingNotifications() {
  const {
    notificationsEnabled = true
  } = await chrome.storage.sync.get({
    notificationsEnabled: true
  });

  if (!notificationsEnabled) {
    return;
  }

  try {
    const permissionLevel =
      await chrome.notifications.getPermissionLevel();

    if (permissionLevel !== "granted") {
      console.warn(
        "Chrome notification permission is not granted."
      );

      return;
    }

    const notifications = await getPendingNotifications();

    if (!Array.isArray(notifications)) {
      console.error(
        "Expected an array but received:",
        typeof notifications
      );

      return;
    }

    if (notifications.length === 0) {
      return;
    }

    for (const item of notifications) {
      const monitor = item?.monitor;
      const change = item?.change;

      if (!monitor) {
        console.warn(
          "Skipping notification because monitor data is missing:",
          item
        );

        continue;
      }

      try {
        await showChangeNotification(
          monitor,
          change
        );

        await acknowledgeNotification(
          monitor._id
        );
      } catch (error) {
        console.error(
          `Unable to show notification for monitor ${monitor._id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error(
      "Unable to process pending notifications:",
      error
    );
  }
}

chrome.notifications.onClicked.addListener(
  async notificationId => {
    const data = await getNotificationData(notificationId);

    if (!data?.url) {
      return;
    }

    await chrome.tabs.create({
      url: data.url
    });

    await chrome.notifications.clear(
      notificationId
    );

    await removeNotificationData(
      notificationId
    );
  }
);

chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    const data =
      await getNotificationData(notificationId);

    if (!data) {
      return;
    }

    if (buttonIndex === 0 && data.url) {
      await chrome.tabs.create({
        url: data.url
      });
    }

    if (buttonIndex === 1) {
      await openMonitorDetails(data.monitorId);
    }

    await chrome.notifications.clear(
      notificationId
    );

    await removeNotificationData(
      notificationId
    );
  }
);

async function openMonitorDetails(monitorId) {
  if (!monitorId) {
    console.error("Cannot open details without a monitor ID.");
    return;
  }

  const detailsUrl = new URL(
    chrome.runtime.getURL("./ui/details.html")
  );

  detailsUrl.searchParams.set(
    "monitorId",
    String(monitorId)
  );

  await chrome.tabs.create({
    url: detailsUrl.toString()
  });
}

chrome.runtime.onMessage.addListener(
  (
    message,
    sender,
    sendResponse
  ) => {
    if (
      message.type ===
      "ELEMENT_SELECTED"
    ) {
      const selectedElement = {
        ...message.payload,

        tabId:
          sender.tab?.id || null,

        windowId:
          sender.tab?.windowId || null
      };

      chrome.storage.session
        .set({
          selectedElement,

          contentSelector:
            selectedElement.selector,

          selectionCompleted:
            true
        })
        .then(async () => {
          try {
            await chrome.action.openPopup({
              windowId:
                selectedElement.windowId ||
                undefined
            });

            sendResponse({
              success: true
            });
          } catch (error) {
            console.error(
              "Unable to reopen popup:",
              error
            );

            /*
             * The selection was still saved, even if Chrome
             * could not reopen the popup.
             */
            sendResponse({
              success: true,
              popupOpened: false,
              message:
                error instanceof Error
                  ? error.message
                  : "Selection saved, but popup could not open."
            });
          }
        })
        .catch(error => {
          console.error(
            "Unable to save selected element:",
            error
          );

          sendResponse({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Unable to save selected element."
          });
        });

      return true;
    }

    if (
      message.type ===
      "OPEN_AND_HIGHLIGHT_ELEMENT"
    ) {
      openAndHighlightElement(
        message.payload || {}
      )
        .then(() => {
          sendResponse({
            success: true
          });
        })
        .catch(error => {
          console.error(
            "Unable to open highlighted element:",
            error
          );

          sendResponse({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Unable to open page"
          });
        });

      return true;
    }

    return false;
  }
);

async function openAndHighlightElement({
  url,
  selector
}) {
  if (!url || !selector) {
    throw new Error(
      "A URL and selector are required."
    );
  }

  const tab =
    await chrome.tabs.create({
      url,
      active: true
    });

  if (!tab.id) {
    throw new Error(
      "Unable to open the monitored page."
    );
  }

  const tabId =
    tab.id;

  const handleTabUpdated =
    async (
      updatedTabId,
      changeInfo
    ) => {
      if (
        updatedTabId !== tabId ||
        changeInfo.status !== "complete"
      ) {
        return;
      }

      chrome.tabs.onUpdated.removeListener(
        handleTabUpdated
      );

      setTimeout(async () => {
        try {
          const result =
            await chrome.tabs.sendMessage(
              tabId,
              {
                type: "HIGHLIGHT_MONITORED_ELEMENT",
                selector
              }
            );

          if (!result?.success) {
            console.warn(
              "Monitored element could not be highlighted:",
              result?.message
            );
          }
        } catch (error) {
          console.error(
            "Unable to send highlight message:",
            error
          );
        }
      }, 800);
    };

  chrome.tabs.onUpdated.addListener(
    handleTabUpdated
  );
}