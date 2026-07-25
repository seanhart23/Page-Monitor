import crypto from "node:crypto";

export function createFingerprint(content) {
    if (typeof content !== "string") {
        throw new TypeError("Fingerprint content must be a string.");
    }

    return crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");
}