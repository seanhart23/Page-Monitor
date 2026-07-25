const API_BASE_URL = "http://localhost:3000/api";

export async function createMonitor(monitor) {
  const result = await apiFetch("/monitors", {
        method: "POST",
        body: JSON.stringify(monitor)
    });

    return result.data ?? result;
}

export async function getMonitors() {
  const result = await apiFetch("/monitors");
  return result.data ?? result;
}

export async function deleteMonitor(id) {
  return apiFetch(`/monitors/${id}`, {
        method: "DELETE"
    });
}

export async function checkMonitorNow(id) {
   return apiFetch(`/monitors/${id}/check`, {
        method: "POST"
    });
}

import {
    ensureInstallationCredentials
} from "./installation.js";

async function apiFetch(path, options = {}) {
    const credentials = await ensureInstallationCredentials();

    const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "X-Installation-Id":
                    credentials.installationId,
                "X-Installation-Secret":
                    credentials.installationSecret,
                ...options.headers
            }
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || "API request failed"
        );
    }

    return result;
}