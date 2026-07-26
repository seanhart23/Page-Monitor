import "dotenv/config";

import { Monitor } from "../models/monitor.js";
import { checkMonitor } from "./monitorChecker.js";

export function startMonitorScheduler() {
    console.log("Monitor scheduler started");

    const schedulerInterval =
        Number(process.env.CHECK_INTERVAL_MS) || 60_000;

    setInterval(async () => {
        try {
            const now = new Date();

            const monitors = await Monitor.find({
                enabled: true
            }).select("+lastContent");

            for (const monitor of monitors) {
                try {
                    if (!monitor.lastCheckedAt) {
                        await checkMonitor(monitor);
                        continue;
                    }

                    const minutesSinceLastCheck =
                        (now.getTime() -
                            monitor.lastCheckedAt.getTime()) /
                        60_000;

                    if (
                        minutesSinceLastCheck >=
                        monitor.checkInterval
                    ) {
                        await checkMonitor(monitor);
                    }
                } catch (error) {
                    console.error(
                        `Monitor check failed for ${monitor._id}:`,
                        error
                    );
                }
            }
        } catch (error) {
            console.error(
                "Monitor scheduler error:",
                error
            );
        }
    }, schedulerInterval);
}