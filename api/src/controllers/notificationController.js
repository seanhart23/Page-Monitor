import { Monitor } from "../models/monitor.js";

export async function getPendingNotifications(request, response) {
    try {
        const notifications = await Monitor.find({
            installationId: request.installation.installationId,
            notificationPending: true
        }).select(
            "_id title url lastChangedAt changeCount"
        );

        return response.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error("Unable to get notifications:", error);

        return response.status(500).json({
            success: false,
            message: "Unable to get pending notifications"
        });
    }
}

export async function acknowledgeNotification(request, response) {
    try {
        const monitor = await Monitor.findOneAndUpdate(
            {
                _id: request.params.monitorId,
                installationId: request.installation.installationId,
                notificationPending: true
            },
            {
                $set: {
                    notificationPending: false,
                    lastNotifiedAt: new Date()
                }
            },
            {
                new: true
            }
        );

        if (!monitor) {
            return response.status(404).json({
                success: false,
                message: "Pending notification not found"
            });
        }

        return response.json({
            success: true,
            data: monitor
        });
    } catch (error) {
        console.error("Unable to acknowledge notification:", error);

        return response.status(500).json({
            success: false,
            message: "Unable to acknowledge notification"
        });
    }
}