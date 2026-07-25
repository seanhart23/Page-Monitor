import * as cheerio from "cheerio";

const DEFAULT_IGNORED_SELECTORS = [
    "script",
    "style",
    "noscript",
    "template",
    "svg",
    "canvas",
    "iframe",

    // Usually repeated site furniture
    "nav",
    "footer",

    // Common noisy or hidden elements
    "[hidden]",
    '[aria-hidden="true"]',
    ".advertisement",
    ".advert",
    ".ad",
    ".ads",
    ".cookie-banner",
    ".cookie-consent",
    ".newsletter-signup",
    ".social-share"
];

/**
 * Converts downloaded HTML into stable, meaningful page text.
 *
 * @param {string} html
 * @param {object} options
 * @param {string} options.contentSelector - Limit monitoring to one element.
 * @param {string[]} options.ignoreSelectors - Additional elements to remove.
 * @returns {string}
 */
export function extractMeaningfulContent(
    html,
    {
        contentSelector = "body",
        ignoreSelectors = []
    } = {}
) {
    if (typeof html !== "string" || html.trim() === "") {
        throw new TypeError("HTML must be a non-empty string.");
    }

    const $ = cheerio.load(html);

    const selectorsToRemove = [
        ...DEFAULT_IGNORED_SELECTORS,
        ...ignoreSelectors
    ];

    $(selectorsToRemove.join(",")).remove();

    const contentElement = $(contentSelector).first();

    if (contentElement.length === 0) {
        throw new Error(
            `Content selector did not match anything: ${contentSelector}`
        );
    }

    return normalizeText(contentElement.text());

}

export function normalizeText(text) {
    return text
        .replace(/\u00a0/g, " ") // Non-breaking spaces
        .replace(/\s+/g, " ")    // Newlines, tabs, repeated spaces
        .trim();
}