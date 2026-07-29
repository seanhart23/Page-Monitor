import {
  API_BASE_URL,
  STORAGE_KEY
} from "../config.js";

export async function getInstallationCredentials() {
  const result =
    await chrome.storage.local.get(
      STORAGE_KEY
    );

  const credentials =
    result[STORAGE_KEY] ?? null;

  if (
    !credentials?.installationId ||
    !credentials?.installationSecret
  ) {
    return null;
  }

  return credentials;
}

export async function ensureInstallationCredentials() {
  const existingCredentials =
    await getInstallationCredentials();

  if (existingCredentials) {
    return existingCredentials;
  }

  const registrationUrl =
    `${API_BASE_URL}/installations/register`;

  console.log(
    "Registering new installation:",
    registrationUrl
  );

  const response =
    await fetch(
      registrationUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        }
      }
    );

  const responseText =
    await response.text();

  let result = {};

  if (responseText.trim()) {
    try {
      result =
        JSON.parse(responseText);
    } catch {
      throw new Error(
        `Installation registration returned invalid JSON. ` +
        `Status: ${response.status}. ` +
        `Response: ${responseText.slice(0, 200)}`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      result.message ||
      `Unable to register installation. HTTP ${response.status}`
    );
  }

  const credentials =
    result.data;

  if (
    !credentials?.installationId ||
    !credentials?.installationSecret
  ) {
    throw new Error(
      "The installation API did not return valid credentials."
    );
  }

  await chrome.storage.local.set({
    [STORAGE_KEY]:
      credentials
  });

  console.log(
    "New installation registered:",
    credentials.installationId
  );

  return credentials;
}