export function validateUrl(url) {

    if (!url) {
        return {
            valid: false,
            reason: "No URL found."
        };
    }

    const blockedPrefixes = [
        "chrome://",
        "edge://",
        "about:",
        "file://",
        "chrome-extension://"
    ];

    for (const prefix of blockedPrefixes) {
        if (url.startsWith(prefix)) {
            return {
                valid: false,
                reason: "This type of page can't be monitored."
            };
        }
    }

    return {
        valid: true
    };
}