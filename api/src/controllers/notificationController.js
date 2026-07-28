import { Monitor } from "../models/monitor.js";
import { ChangeEvent } from "../models/changeEvent.js";

export async function getPendingNotifications(request, response) {
    try {
        const installationId = request.installation.installationId;
        const monitors = await Monitor.find({
            installationId,
            notificationPending: true
        })
            .select(
                "_id title url icon lastChangedAt changeCount"
            )
            .sort({
                lastChangedAt: -1
            })
            .lean();

        const notifications = await Promise.all(
            monitors.map(async monitor => {
                const change =
                    await ChangeEvent.findOne({
                        monitorId: monitor._id,
                        installationId
                    })
                        .sort({
                            checkedAt: -1
                        })
                        .select(
                            [
                                "summary",
                                "changeType",
                                "removedText",
                                "addedText",
                                "beforeContext",
                                "afterContext",
                                "removedWordCount",
                                "addedWordCount",
                                "wasTruncated",
                                "checkedAt"
                            ].join(" ")
                        )
                        .lean();

                return {
                    monitor,
                    change
                };
            })
        );

        return response.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error(
            "Unable to get notifications:",
            error
        );

        return response.status(500).json({
            success: false,
            message: "Unable to get pending notifications"
        });
    }
}

export async function acknowledgeNotification(
    request,
    response
) {
    try {
        const monitor =
            await Monitor.findOneAndUpdate(
                {
                    _id: request.params.monitorId,
                    installationId:
                        request.installation
                            .installationId,
                    notificationPending: true
                },
                {
                    $set: {
                        notificationPending: false,
                        lastNotifiedAt: new Date()
                    }
                },
                {
                    returnDocument: "after"
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
        console.error(
            "Unable to acknowledge notification:",
            error
        );

        return response.status(500).json({
            success: false,
            message: "Unable to acknowledge notification"
        });
    }
}