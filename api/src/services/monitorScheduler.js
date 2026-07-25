import "dotenv/config";
import { Monitor } from "../models/monitor.js";
import { checkMonitor } from "./monitorChecker.js";

export function startMonitorScheduler() {

    console.log("Monitor scheduler started");

    setInterval(async () => {

        console.log("Checking monitors...");

        const monitors = await Monitor.find({
            enabled: true
        });

        for (const monitor of monitors) {
            await checkMonitor(monitor);
        }

    }, process.env.CHECK_INTERVAL_MS);

}