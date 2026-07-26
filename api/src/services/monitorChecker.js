import { Monitor } from "../models/monitor.js";
import { ChangeEvent } from "../models/changeEvent.js";

import { extractMeaningfulContent } from "./contentExtractor.js";
import { createFingerprint } from "./fingerprint.js";

import {
    normalizePageText,
    limitStoredContent,
    createChangePreview
} from "../utils/createChangePreview.js";

export async function checkMonitor(monitor) {
    const checkedAt = new Date();

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

        const extractedContent =
            extractMeaningfulContent(html, {
                contentSelector:
                    monitor.contentSelector || "body",

                ignoreSelectors:
                    monitor.ignoreSelectors || []
            });

        /*
         * Normalize the full extracted content before
         * generating its fingerprint.
         */
        const normalizedContent =
            normalizePageText(extractedContent);

        /*
         * The fingerprint uses the complete normalized page
         * content, allowing changes anywhere in the extracted
         * content to be detected.
         */
        const newFingerprint =
            createFingerprint(normalizedContent);

        /*
         * Only a limited amount of page text is stored in
         * MongoDB for generating future change previews.
         */
        const storedContent =
            limitStoredContent(normalizedContent);

        const previousFingerprint =
            monitor.lastFingerprint;

        const previousContent =
            monitor.lastContent || "";

        const isFirstCheck =
            !previousFingerprint;

        const changed =
            !isFirstCheck &&
            previousFingerprint !== newFingerprint;

        /*
         * Update the common check-status fields.
         */
        monitor.lastCheckedAt = checkedAt;
        monitor.lastStatus = "success";
        monitor.lastError = null;
        monitor.lastCheckChanged = changed;

        if (changed) {
            /*
             * Compare the previously stored page text with
             * the latest stored page text.
             */
            const preview = createChangePreview(
                previousContent,
                storedContent,
                {
                    maxWords: 60,
                    contextWords: 8
                }
            );

            await ChangeEvent.create({
                monitorId: monitor._id,
                installationId:
                    monitor.installationId,

                previousFingerprint,
                newFingerprint,

                changeType:
                    preview.changeType,

                summary:
                    preview.summary,

                removedText:
                    preview.removedText,

                addedText:
                    preview.addedText,

                beforeContext:
                    preview.beforeContext,

                afterContext:
                    preview.afterContext,

                removedWordCount:
                    preview.removedWordCount,

                addedWordCount:
                    preview.addedWordCount,

                wasTruncated:
                    preview.wasTruncated,

                checkedAt
            });

            monitor.lastChangedAt = checkedAt;

            monitor.changeCount =
                Number(monitor.changeCount || 0) + 1;

            monitor.notificationPending = true;
        }

        /*
         * Save the new page state after generating the
         * change preview.
         *
         * This order is important. Updating lastContent before
         * createChangePreview() would compare the new page
         * against itself.
         */
        monitor.lastFingerprint =
            newFingerprint;

        monitor.lastContent =
            storedContent;

        await monitor.save();

        return {
            success: true,
            changed,
            isFirstCheck,
            fingerprint: newFingerprint
        };
    } catch (error) {
        monitor.lastCheckedAt = checkedAt;
        monitor.lastStatus = "failed";

        monitor.lastError =
            error instanceof Error
                ? error.message
                : "Unknown checking error";

        await monitor.save();

        return {
            success: false,
            changed: false,
            isFirstCheck: false,
            error: monitor.lastError
        };
    }
}