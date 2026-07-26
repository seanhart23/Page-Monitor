import "dotenv/config";

import { Monitor } from "../models/monitor.js";
import { checkMonitor } from "./monitorChecker.js";

export function startMonitorScheduler() {

    console.log("Monitor scheduler started");

    const schedulerInterval =
        Number(process.env.CHECK_INTERVAL_MS) || 60000;

    setInterval(async () => {

        try {

            const now = new Date();

            const monitors = await Monitor.find({
                enabled: true
            }).select("+lastContent");

            for (const monitor of monitors) {

                // Never checked before
                if (!monitor.lastChecked) {
                    try {
                        await checkMonitor(monitor);
                    } catch (err) {
                        console.error(err);
                    }
                    continue;
                }

                const minutesSinceLastCheck =
                    (now - monitor.lastChecked) / 60000;

                if (minutesSinceLastCheck >= monitor.checkInterval) {
                    await checkMonitor(monitor);
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