import mongoose from "mongoose";

import { Monitor } from "../models/monitor.js";
import { ChangeEvent } from "../models/changeEvent.js";

export async function getMonitorHistory(request, response) {
    try {
        const { monitorId } = request.params;

        if (!mongoose.isValidObjectId(monitorId)) {
            return response.status(400).json({
                success: false,
                message: "Invalid monitor ID."
            });
        }

        const installationId = request.installation.installationId;
        const monitor = await Monitor.findOne({_id: monitorId, installationId});

        if (!monitor) {
            return response.status(404).json({
                success: false,
                message: "Monitor not found."
            });
        }

        const history = await ChangeEvent.find({monitorId, installationId}).sort({ checkedAt: -1 }).limit(50).lean();

        return response.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error("Unable to load monitor history:", error);

        return response.status(500).json({
            success: false,
            message: "Unable to load change history."
        });
    }
}