import * as cheerio from "cheerio";
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
    const isElementMonitor = monitor.monitorType === "element";
    const selector = isElementMonitor ? monitor.contentSelector?.trim() : "body";

    try {
        if (!monitor.url) {
            throw new Error("This monitor does not have a URL.");
        }

        if (!selector) {
            throw new Error("This element monitor does not have a CSS selector.");
        }

        const response = await fetch(monitor.url,
            {
                redirect: "follow",

                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                        "AppleWebKit/537.36 (KHTML, like Gecko) " +
                        "Chrome/130.0.0.0 Safari/537.36",

                    Accept:
                        "text/html,application/xhtml+xml," +
                        "application/xml;q=0.9," +
                        "image/avif,image/webp,*/*;q=0.8",

                    "Accept-Language":
                        "en-US,en;q=0.9",

                    "Cache-Control":
                        "no-cache",

                    Pragma:
                        "no-cache"
                },

                signal: AbortSignal.timeout(15000)
            }
        );

        const html = await response.text();

        if (!response.ok) {
            throw new Error(`Page returned HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
            throw new Error(
                `The URL did not return an HTML webpage. Received: ${
                    contentType ||
                    "unknown content type"
                }`
            );
        }

        if (isElementMonitor && response.redirected && isLikelyAuthenticationUrl(response.url)) {
            throw new Error(
                "The webpage redirected to a login page. " +
                "Authenticated pages cannot currently be checked by the server."
            );
        }

        if (
            isElementMonitor &&
            isLikelyAuthenticationPage(
                html,
                response.url
            )
        ) {
            throw new Error(
                "The server received a login or authentication page instead of the monitored webpage."
            );
        }

        let selectorInspection = null;

        if (isElementMonitor) {
            selectorInspection =
                inspectElementSelector(
                    html,
                    selector
                );

            if (
                !selectorInspection.valid
            ) {
                throw new Error(
                    `The saved element selector is invalid: ${selector}`
                );
            }

            if (
                !selectorInspection.found
            ) {
                const likelyClientRendered =
                    isLikelyClientRenderedPage(
                        html
                    );

                console.error(
                    "ELEMENT NOT FOUND IN FETCHED HTML:",
                    {
                        monitorId:
                            String(
                                monitor._id
                            ),

                        requestedUrl:
                            monitor.url,

                        finalUrl:
                            response.url,

                        redirected:
                            response.redirected,

                        selector,

                        likelyClientRendered,

                        pagePreview:
                            createHtmlTextPreview(
                                html,
                                500
                            )
                    }
                );

                if (
                    likelyClientRendered
                ) {
                    throw new Error(
                        "The selected element was not present in the server-fetched HTML. " +
                        "The webpage may create this element with JavaScript after loading."
                    );
                }

                if (
                    response.redirected
                ) {
                    throw new Error(
                        "The selected element was not found after the webpage redirected to another URL."
                    );
                }

                throw new Error(
                    `The selected element was not found using selector: ${selector}`
                );
            }
        }

        let extractedContent;

        try {
            extractedContent =
                extractMeaningfulContent(
                    html,
                    {
                        contentSelector:
                            selector,

                        ignoreSelectors:
                            Array.isArray(
                                monitor.ignoreSelectors
                            )
                                ? monitor.ignoreSelectors
                                : []
                    }
                );
        } catch (error) {
            console.error(
                "CONTENT EXTRACTION FAILED:",
                {
                    monitorId:
                        String(
                            monitor._id
                        ),

                    selector,

                    error:
                        error instanceof
                        Error
                            ? error.message
                            : String(error)
                }
            );

            throw new Error(
                `Unable to use selector "${selector}": ${
                    error instanceof Error
                        ? error.message
                        : "Invalid selector"
                }`
            );
        }

        if (
            typeof extractedContent !==
            "string"
        ) {
            throw new Error(
                "The content extractor did not return text."
            );
        }

        /*
         * The normal extractor may return an empty value for
         * inputs, images, or elements whose value is stored
         * in an attribute rather than textContent.
         */
        if (
            isElementMonitor &&
            !extractedContent.trim() &&
            selectorInspection?.attributeText
        ) {
            extractedContent =
                selectorInspection
                    .attributeText;
        }

        if (
            isElementMonitor &&
            !extractedContent.trim()
        ) {
            console.error(
                "ELEMENT FOUND BUT CONTENT WAS EMPTY:",
                {
                    monitorId:
                        String(
                            monitor._id
                        ),

                    selector,

                    tagName:
                        selectorInspection
                            ?.tagName,

                    matchCount:
                        selectorInspection
                            ?.matchCount,

                    preview:
                        selectorInspection
                            ?.preview
                }
            );

            throw new Error(
                "The selected element was found, but it did not contain monitorable text."
            );
        }

        const normalizedContent =
            normalizePageText(
                extractedContent
            );

        if (!normalizedContent) {
            throw new Error(
                isElementMonitor
                    ? "The selected element contained no text after normalization."
                    : "The webpage contained no monitorable text."
            );
        }

        const newFingerprint =
            createFingerprint(
                normalizedContent
            );

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
                    monitor.changeCount ||
                    0
                ) + 1;

            monitor.notificationPending =
                true;
        }

        monitor.lastFingerprint =
            newFingerprint;

        monitor.lastContent =
            storedContent;

        await monitor.save();

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
                    String(
                        monitor._id
                    ),

                monitorType:
                    monitor.monitorType,

                requestedUrl:
                    monitor.url,

                selector,

                error:
                    errorMessage
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

        try {
            await monitor.save();
        } catch (saveError) {
            console.error(
                "UNABLE TO SAVE FAILED MONITOR STATUS:",
                {
                    monitorId:
                        String(
                            monitor._id
                        ),

                    error:
                        saveError instanceof
                        Error
                            ? saveError.message
                            : String(
                                saveError
                            )
                }
            );
        }

        return {
            success: false,
            changed: false,
            isFirstCheck: false,
            error:
                errorMessage
        };
    }
}

function inspectElementSelector(
    html,
    selector
) {
    let $;

    try {
        $ = cheerio.load(html);
    } catch (error) {
        console.error(
            "Unable to parse fetched HTML:",
            error
        );

        return {
            valid: true,
            found: false,
            matchCount: 0,
            tagName: null,
            textLength: 0,
            preview: "",
            attributeText: ""
        };
    }

    let matches;

    try {
        matches = $(selector);
    } catch {
        return {
            valid: false,
            found: false,
            matchCount: 0,
            tagName: null,
            textLength: 0,
            preview: "",
            attributeText: ""
        };
    }

    const matchCount =
        matches.length;

    if (!matchCount) {
        return {
            valid: true,
            found: false,
            matchCount: 0,
            tagName: null,
            textLength: 0,
            preview: "",
            attributeText: ""
        };
    }

    const firstMatch =
        matches.first();

    const textContent =
        normalizeInspectionText(
            firstMatch.text()
        );

    const attributeText =
        normalizeInspectionText(
            firstMatch.attr(
                "value"
            ) ||
            firstMatch.attr(
                "placeholder"
            ) ||
            firstMatch.attr(
                "alt"
            ) ||
            firstMatch.attr(
                "aria-label"
            ) ||
            firstMatch.attr(
                "title"
            ) ||
            ""
        );

    const combinedText =
        textContent ||
        attributeText;

    return {
        valid: true,
        found: true,
        matchCount,

        tagName:
            firstMatch
                .get(0)
                ?.tagName ||
            null,

        textLength:
            combinedText.length,

        preview:
            combinedText.slice(
                0,
                200
            ),

        attributeText
    };
}

function normalizeInspectionText(
    value
) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function createHtmlTextPreview(
    html,
    maxLength = 500
) {
    try {
        const $ =
            cheerio.load(html);

        $(
            "script, style, noscript, svg"
        ).remove();

        return normalizeInspectionText(
            $("body").text()
        ).slice(
            0,
            maxLength
        );
    } catch {
        return String(html || "")
            .replace(
                /<script\b[^>]*>[\s\S]*?<\/script>/gi,
                " "
            )
            .replace(
                /<style\b[^>]*>[\s\S]*?<\/style>/gi,
                " "
            )
            .replace(
                /<[^>]+>/g,
                " "
            )
            .replace(/\s+/g, " ")
            .trim()
            .slice(
                0,
                maxLength
            );
    }
}

function isLikelyAuthenticationUrl(
    url
) {
    try {
        const parsed =
            new URL(url);

        const value =
            `${parsed.hostname}${parsed.pathname}`
                .toLowerCase();

        const authenticationTerms = [
            "login",
            "log-in",
            "signin",
            "sign-in",
            "authenticate",
            "authentication",
            "account/login",
            "session/new",
            "oauth",
            "sso"
        ];

        return authenticationTerms.some(
            term =>
                value.includes(term)
        );
    } catch {
        return false;
    }
}

function isLikelyAuthenticationPage(
    html,
    finalUrl
) {
    if (
        isLikelyAuthenticationUrl(
            finalUrl
        )
    ) {
        return true;
    }

    const pageText =
        createHtmlTextPreview(
            html,
            2000
        ).toLowerCase();

    const strongSignals = [
        "sign in to continue",
        "log in to continue",
        "login to continue",
        "authentication required",
        "please sign in",
        "please log in"
    ];

    if (
        strongSignals.some(
            signal =>
                pageText.includes(
                    signal
                )
        )
    ) {
        return true;
    }

    /*
     * Do not classify every page containing a login
     * link as an authentication page. Require multiple
     * weaker signals.
     */
    const weakSignals = [
        "forgot password",
        "enter your password",
        "email address",
        "remember me",
        "create account"
    ];

    const matchingWeakSignals =
        weakSignals.filter(
            signal =>
                pageText.includes(
                    signal
                )
        ).length;

    return matchingWeakSignals >= 3;
}

function isLikelyClientRenderedPage(
    html
) {
    const normalizedHtml =
        String(html || "")
            .toLowerCase();

    const bodyText =
        createHtmlTextPreview(
            html,
            1500
        );

    const hasApplicationRoot =
        normalizedHtml.includes(
            'id="root"'
        ) ||
        normalizedHtml.includes(
            "id='root'"
        ) ||
        normalizedHtml.includes(
            'id="app"'
        ) ||
        normalizedHtml.includes(
            "id='app'"
        ) ||
        normalizedHtml.includes(
            'id="__next"'
        ) ||
        normalizedHtml.includes(
            'id="__nuxt"'
        );

    const hasFrameworkScripts =
        normalizedHtml.includes(
            "_next/static"
        ) ||
        normalizedHtml.includes(
            "__next_data__"
        ) ||
        normalizedHtml.includes(
            "__nuxt__"
        ) ||
        normalizedHtml.includes(
            "webpack"
        ) ||
        normalizedHtml.includes(
            "/assets/index-"
        ) ||
        normalizedHtml.includes(
            "/src/main."
        );

    const hasVeryLittleBodyText =
        bodyText.length < 150;

    return (
        hasApplicationRoot &&
        (
            hasFrameworkScripts ||
            hasVeryLittleBodyText
        )
    );
}