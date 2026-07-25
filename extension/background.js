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

async function processPendingNotifications() {
    try {
        const permissionLevel =
            await chrome.notifications.getPermissionLevel();

        const notifications =
            await getPendingNotifications();

        if (!Array.isArray(notifications)) {
            console.error(
                "Expected an array but received:",
                typeof notifications
            );

            return;
        }

        for (const monitor of notifications) {

            const notificationId =
                await chrome.notifications.create(
                    `monitor-change-${monitor._id}-${Date.now()}`,
                    {
                        type: "basic",
                        iconUrl: "./icons/icon.png",
                        title: "Page changed",
                        message:
                            monitor.title ||
                            monitor.url ||
                            "A monitored page changed",
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