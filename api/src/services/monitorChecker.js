import crypto from "crypto";
import { Monitor } from "../models/monitor.js";
import { extractMeaningfulContent } from "./contentExtractor.js";
import { createFingerprint } from "./fingerprint.js";
import { ChangeEvent } from "../models/changeEvent.js";

export async function checkMonitor(monitor) {
    try {
        const response = await fetch(monitor.url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 PageMonitorBot/1.0"
            },
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
            throw new Error(
                `Page returned HTTP ${response.status}`
            );
        }

        const html = await response.text();

        const cleanedContent = extractMeaningfulContent(html, {
            contentSelector: monitor.contentSelector || "body",
            ignoreSelectors: monitor.ignoreSelectors || []
        });

        const newFingerprint =
            createFingerprint(cleanedContent);

        

        const previousFingerprint =
            monitor.lastFingerprint;

        const isFirstCheck = !previousFingerprint;
        
        const changed =
            previousFingerprint !== null &&
            previousFingerprint !== newFingerprint;

        const checkedAt = new Date();

        monitor.lastCheckedAt = checkedAt;
        monitor.lastStatus = "success";
        monitor.lastError = null;
        monitor.lastFingerprint = newFingerprint;

        if (changed) {
            if (changed) {
                await ChangeEvent.create({
                    monitorId: monitor._id,
                    installationId: monitor.installationId,
                    previousFingerprint,
                    newFingerprint,
                    summary: "Page content changed",
                    checkedAt: new Date()
                });

                monitor.lastCheckChanged = true;
                monitor.lastChangedAt = new Date();
                monitor.changeCount += 1;
                monitor.notificationPending = true;
                console.log(cleanedContent);
            }
        } else {
            monitor.lastCheckChanged = false;
        }

        monitor.lastFingerprint =
            newFingerprint;

        monitor.lastCheckedAt =
            new Date();

        await monitor.save();

        return {
            success: true,
            changed,
            isFirstCheck,
            fingerprint: newFingerprint
        };
    } catch (error) {
        monitor.lastCheckedAt = new Date();
        monitor.lastStatus = "failed";
        monitor.lastError =
            error instanceof Error
                ? error.message
                : "Unknown checking error";

        await monitor.save();

        return {
            success: false,
            changed: false,
            error: monitor.lastError
        };
    }
}