const API_BASE_URL = "http://localhost:3000/api";

const STORAGE_KEY = "installationCredentials";

export async function getInstallationCredentials() {
    const result = await chrome.storage.local.get(
        STORAGE_KEY
    );

    return result[STORAGE_KEY] ?? null;
}

export async function ensureInstallationCredentials() {
    const existingCredentials =
        await getInstallationCredentials();

    if (existingCredentials) {
        return existingCredentials;
    }

    const response = await fetch(
        `${API_BASE_URL}/installations/register`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ||
                "Unable to register installation"
        );
    }

    const credentials = result.data;

    await chrome.storage.local.set({
        [STORAGE_KEY]: credentials
    });

    return credentials;
}