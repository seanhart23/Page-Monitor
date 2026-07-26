import {
    getPendingNotifications,
    acknowledgeNotification
} from "./services/api.js";

const NOTIFICATION_ALARM =
    "check-pending-notifications";

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

function createNotificationMessage(change) {
    const addedText =
        change?.addedText?.trim() || "";

    const removedText =
        change?.removedText?.trim() || "";

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

       for (const item of notifications) {
        const monitor = item.monitor;
        const change = item.change;

        if (!monitor) {
            console.warn(
                "Notification item is missing monitor:",
                item
            );

            continue;
        }

        const message =
            createNotificationMessage(change);

        await chrome.notifications.create(
            `monitor-change-${monitor._id}-${Date.now()}`,
            {
                type: "basic",
                iconUrl: "icons/icon.png",
                title: `${monitor.title} changed`,
                message,
                contextMessage:
                    change?.summary ||
                    "Smart Page Monitor",
                priority: 2,
                requireInteraction: true
            }
        );

        await acknowledgeNotification(
            monitor._id
        );
    }
        } catch (error) {
            console.error(
                "Notification processing error:",
                error
            );
        }
    }