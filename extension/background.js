import {
    getPendingNotifications,
    acknowledgeNotification
} from "./services/api.js";

const NOTIFICATION_ALARM =
    "check-pending-notifications";

    const NOTIFICATION_DATA_KEY = "pageMonitorNotificationData";
const PREVIEW_MAX_LENGTH = 110;

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

  const notificationData =
    stored[NOTIFICATION_DATA_KEY] || {};

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

  const notificationData =
    stored[NOTIFICATION_DATA_KEY] || {};

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
        "icons/icon.png"
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

    const notifications =
      await getPendingNotifications();

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
    const data =
      await getNotificationData(notificationId);

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
    chrome.runtime.getURL("details.html")
  );

  detailsUrl.searchParams.set(
    "monitorId",
    String(monitorId)
  );

  await chrome.tabs.create({
    url: detailsUrl.toString()
  });
}