import { ChangeEvent } from "../models/changeEvent.js";

import {
    extractMeaningfulContent
} from "./contentExtractor.js";

import {
    createFingerprint
} from "./fingerprint.js";

import {
    normalizePageText,
    limitStoredContent,
    createChangePreview
} from "../utils/createChangePreview.js";

export async function checkMonitor(monitor) {
    const checkedAt = new Date();

    try {
        /*
         * Page monitors always inspect the body.
         * Element monitors inspect their saved CSS selector.
         */
        const selector =
            monitor.monitorType === "element"
                ? monitor.contentSelector?.trim()
                : "body";

        if (!selector) {
            throw new Error(
                "This element monitor does not have a CSS selector."
            );
        }

        console.log("MONITOR CHECK STARTED:", {
            id: monitor._id,
            url: monitor.url,
            monitorType: monitor.monitorType,
            contentSelector: selector,
            selectedElement: monitor.selectedElement
        });

        const response = await fetch(monitor.url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                    "AppleWebKit/537.36 (KHTML, like Gecko) " +
                    "Chrome/130.0.0.0 Safari/537.36",

                "Accept":
                    "text/html,application/xhtml+xml," +
                    "application/xml;q=0.9," +
                    "image/avif,image/webp,*/*;q=0.8",

                "Accept-Language":
                    "en-US,en;q=0.9",

                "Cache-Control":
                    "no-cache"
            },

            signal:
                AbortSignal.timeout(15000)
        });

        /*
         * Read the response before checking response.ok so the
         * returned page can still be inspected in the logs.
         */
        const html = await response.text();

        const selectorId =
            selector.startsWith("#")
                ? selector.slice(1)
                : null;

        console.log("FETCH RESULT:", {
            status: response.status,
            ok: response.ok,
            finalUrl: response.url,
            redirected: response.redirected,
            contentType:
                response.headers.get("content-type"),
            htmlLength: html.length,

            /*
             * This is only a rough diagnostic for ID selectors.
             * Cheerio performs the real selector lookup below.
             */
            containsSelectedId:
                selectorId
                    ? html.includes(`id="${selectorId}"`) ||
                      html.includes(`id='${selectorId}'`)
                    : null,

            pageStart:
                html.slice(0, 300)
        });

        if (!response.ok) {
            throw new Error(
                `Page returned HTTP ${response.status}`
            );
        }

        let extractedContent;

        try {
            extractedContent =
                extractMeaningfulContent(html, {
                    contentSelector:
                        selector,

                    ignoreSelectors:
                        Array.isArray(
                            monitor.ignoreSelectors
                        )
                            ? monitor.ignoreSelectors
                            : []
                });
        } catch (error) {
            throw new Error(
                `Unable to use selector "${selector}": ${
                    error instanceof Error
                        ? error.message
                        : "Invalid selector"
                }`
            );
        }

        console.log("EXTRACTION RESULT:", {
            selector,
            extractedType:
                typeof extractedContent,

            extractedLength:
                typeof extractedContent === "string"
                    ? extractedContent.length
                    : 0,

            preview:
                typeof extractedContent === "string"
                    ? extractedContent.slice(0, 300)
                    : extractedContent
        });

        if (
            typeof extractedContent !== "string"
        ) {
            throw new Error(
                "The content extractor did not return text."
            );
        }

        if (
            monitor.monitorType === "element" &&
            !extractedContent.trim()
        ) {
            throw new Error(
                `The selected element was not found using selector: ${selector}`
            );
        }

        /*
         * Normalize the extracted content before creating
         * its fingerprint.
         */
        const normalizedContent =
            normalizePageText(
                extractedContent
            );

        const newFingerprint =
            createFingerprint(
                normalizedContent
            );

        /*
         * Store a limited amount of content for future
         * change previews.
         */
        const storedContent =
            limitStoredContent(
                normalizedContent
            );

        const previousFingerprint =
            monitor.lastFingerprint;

        const previousContent =
            monitor.lastContent || "";

        const isFirstCheck =
            !previousFingerprint;

        const changed =
            !isFirstCheck &&
            previousFingerprint !==
                newFingerprint;

        monitor.lastCheckedAt =
            checkedAt;

        monitor.lastStatus =
            "success";

        monitor.lastError =
            null;

        monitor.lastCheckChanged =
            changed;

        if (changed) {
            const preview =
                createChangePreview(
                    previousContent,
                    storedContent,
                    {
                        maxWords: 60,
                        contextWords: 8
                    }
                );

            await ChangeEvent.create({
                monitorId:
                    monitor._id,

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

            monitor.lastChangedAt =
                checkedAt;

            monitor.changeCount =
                Number(
                    monitor.changeCount || 0
                ) + 1;

            monitor.notificationPending =
                true;
        }

        /*
         * Save the new state only after generating the
         * change preview.
         */
        monitor.lastFingerprint =
            newFingerprint;

        monitor.lastContent =
            storedContent;

        await monitor.save();

        console.log("MONITOR CHECK COMPLETED:", {
            id: monitor._id,
            monitorType:
                monitor.monitorType,
            selector,
            isFirstCheck,
            changed,
            normalizedLength:
                normalizedContent.length
        });

        return {
            success: true,
            changed,
            isFirstCheck,
            fingerprint:
                newFingerprint
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Unknown checking error";

        console.error(
            "MONITOR CHECK FAILED:",
            {
                monitorId:
                    monitor._id,

                url:
                    monitor.url,

                monitorType:
                    monitor.monitorType,

                contentSelector:
                    monitor.contentSelector,

                error:
                    errorMessage,

                stack:
                    error instanceof Error
                        ? error.stack
                        : undefined
            }
        );

        monitor.lastCheckedAt =
            checkedAt;

        monitor.lastStatus =
            "failed";

        monitor.lastError =
            errorMessage;

        monitor.lastCheckChanged =
            false;

        await monitor.save();

        return {
            success: false,
            changed: false,
            isFirstCheck: false,
            error:
                monitor.lastError
        };
    }
}