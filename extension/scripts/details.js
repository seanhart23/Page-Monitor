import {
  getMonitors,
  checkMonitorNow,
  deleteMonitor,
  getMonitorHistory
} from "../services/api.js";

const state = {
  monitor: null
};

const elements = {
  loadingState: document.getElementById("loading-state"),
  errorState: document.getElementById("error-state"),
  errorMessage: document.getElementById("error-message"),
  detailsView: document.getElementById("details-view"),
  closeErrorButton: document.getElementById("close-error-button"),
  openSettingsButton: document.getElementById("open-settings-button"),
  siteIcon: document.getElementById("site-icon"),
  domain: document.getElementById("domain"),
  title: document.getElementById("monitor-title"),
  url: document.getElementById("monitor-url"),
  statusPill: document.getElementById("status-pill"),
  openPageButton: document.getElementById("open-page-button"),
  checkNowButton: document.getElementById("check-now-button"),
  deleteButton: document.getElementById("delete-button"),
  changeCount: document.getElementById("change-count"),
  lastChange: document.getElementById("last-change"),
  lastChecked: document.getElementById("last-checked"),
  checkInterval: document.getElementById("check-interval"),
  historyTotal: document.getElementById("history-total"),
  historyLoading: document.getElementById("history-loading"),
  historyEmpty: document.getElementById("history-empty"),
  historyList: document.getElementById("history-list"),
  toast: document.getElementById("toast")
};

bindEvents();
await initialize();

function bindEvents() {
  elements.openPageButton.addEventListener("click", openWebsite);
  elements.checkNowButton.addEventListener("click", checkNow);
  elements.deleteButton.addEventListener("click", deleteSelectedMonitor);

  elements.openSettingsButton.addEventListener("click", async () => {
    await chrome.runtime.openOptionsPage();
  });

  elements.closeErrorButton.addEventListener("click", () => {
    window.close();
  });
}

async function initialize() {
  const monitorId = new URLSearchParams(
    window.location.search
  ).get("monitorId");

  if (!monitorId) {
    showError("No monitor ID was provided.");
    return;
  }

  try {
    const monitors = await getMonitors();

    if (!Array.isArray(monitors)) {
      throw new Error("The monitor list response was invalid.");
    }

    const monitor = monitors.find(
      item => String(item._id) === String(monitorId)
    );

    if (!monitor) {
      showError(
        "This monitor may have been deleted or is no longer available."
      );
      return;
    }

    state.monitor = monitor;
    renderMonitor(monitor);

    elements.loadingState.classList.add("hidden");
    elements.detailsView.classList.remove("hidden");

    await loadHistory(monitor._id);
  } catch (error) {
    console.error("Unable to load monitor details:", error);
    showError(error.message || "The monitor could not be loaded.");
  }
}

function renderMonitor(monitor) {
  const status = getMonitorStatus(monitor);

  document.title =
    `${monitor.title || "Monitor"} — Smart Page Monitor`;

  elements.title.textContent =
    monitor.title || "Untitled page";

  elements.domain.textContent =
    getDomain(monitor.url);

  elements.url.textContent =
    monitor.url || "";

  elements.siteIcon.textContent =
    getInitial(monitor);

  elements.statusPill.textContent =
    status.label;

  elements.statusPill.className =
    `status-pill ${status.className}`;

  elements.changeCount.textContent =
    String(monitor.changeCount ?? 0);

  elements.lastChange.textContent =
    monitor.lastChangedAt
      ? formatDateTime(monitor.lastChangedAt)
      : "Never";

  elements.lastChecked.textContent =
    monitor.lastCheckedAt
      ? formatDateTime(monitor.lastCheckedAt)
      : "Never";

  elements.checkInterval.textContent =
    formatInterval(monitor.checkInterval);
}

async function loadHistory(monitorId) {
  elements.historyLoading.classList.remove("hidden");
  elements.historyEmpty.classList.add("hidden");
  elements.historyList.innerHTML = "";

  try {
    const history = await getMonitorHistory(monitorId);

    if (!Array.isArray(history)) {
      throw new Error("The history response was invalid.");
    }

    elements.historyTotal.textContent =
      `${history.length} ${history.length === 1 ? "event" : "events"}`;

    elements.historyEmpty.classList.toggle(
      "hidden",
      history.length > 0
    );

    elements.historyList.innerHTML =
      history.map(renderHistoryEvent).join("");
  } catch (error) {
    console.error("Unable to load monitor history:", error);
    elements.historyEmpty.textContent =
      error.message || "Unable to load change history.";
    elements.historyEmpty.classList.remove("hidden");
  } finally {
    elements.historyLoading.classList.add("hidden");
  }
}

async function checkNow() {
  const monitor = state.monitor;

  if (!monitor?._id) {
    return;
  }

  elements.checkNowButton.disabled = true;
  elements.checkNowButton.textContent = "Checking…";

  try {
    const result = await checkMonitorNow(monitor._id);

    showToast(
      result.changed
        ? "A change was detected."
        : "No change detected."
    );

    await refreshMonitor();
  } catch (error) {
    console.error("Unable to check monitor:", error);
    showToast(
      error.message || "Unable to check monitor.",
      true
    );
  } finally {
    elements.checkNowButton.disabled = false;
    elements.checkNowButton.textContent = "Check now";
  }
}

async function refreshMonitor() {
  const monitorId = state.monitor?._id;

  if (!monitorId) {
    return;
  }

  const monitors = await getMonitors();

  const refreshedMonitor = monitors.find(
    item => String(item._id) === String(monitorId)
  );

  if (!refreshedMonitor) {
    showError("This monitor is no longer available.");
    return;
  }

  state.monitor = refreshedMonitor;
  renderMonitor(refreshedMonitor);
  await loadHistory(refreshedMonitor._id);
}

async function deleteSelectedMonitor() {
  const monitor = state.monitor;

  if (!monitor?._id) {
    return;
  }

  const confirmed = window.confirm(
    `Delete “${monitor.title || "this monitor"}”?`
  );

  if (!confirmed) {
    return;
  }

  elements.deleteButton.disabled = true;

  try {
    await deleteMonitor(monitor._id);
    showToast("Monitor deleted.");

    setTimeout(() => {
      window.close();
    }, 500);
  } catch (error) {
    console.error("Unable to delete monitor:", error);
    showToast(
      error.message || "Unable to delete monitor.",
      true
    );
    elements.deleteButton.disabled = false;
  }
}

async function openWebsite() {
  if (!state.monitor?.url) {
    return;
  }

  await chrome.tabs.create({
    url: state.monitor.url
  });
}

function renderHistoryEvent(event) {
  const removedText =
    event.removedText?.trim() || "";

  const addedText =
    event.addedText?.trim() || "";

  const removedSection = removedText
    ? `
      <div class="history-preview history-preview--removed">
        <span class="history-preview__label">Removed</span>
        <p>${escapeHtml(removedText)}</p>
      </div>
    `
    : "";

  const addedSection = addedText
    ? `
      <div class="history-preview history-preview--added">
        <span class="history-preview__label">Added</span>
        <p>${escapeHtml(addedText)}</p>
      </div>
    `
    : "";

  const preview =
    removedSection || addedSection
      ? `
        <div class="history-previews">
          ${removedSection}
          ${addedSection}
        </div>
      `
      : "";

  return `
    <article class="history-item">
      <div class="history-marker">
        <span class="history-dot"></span>
      </div>

      <div class="history-content">
        <p class="history-date">
          ${escapeHtml(
    formatDateTime(
      event.checkedAt || event.createdAt
    )
  )}
        </p>

        <p class="history-summary">
          ${escapeHtml(
    event.summary || "Page content changed"
  )}
        </p>

        ${preview}
      </div>
    </article>
  `;
}

function getMonitorStatus(monitor) {
  if (monitor.lastStatus === "failed") {
    return {
      label: "Failed",
      className: "status-failed"
    };
  }

  if (monitor.lastCheckChanged) {
    return {
      label: "Changed",
      className: "status-changed"
    };
  }

  if (
    monitor.lastStatus === "pending" ||
    !monitor.lastCheckedAt
  ) {
    return {
      label: "Pending",
      className: "status-pending"
    };
  }

  return {
    label: "OK",
    className: "status-ok"
  };
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "Unknown website";
  }
}

function getInitial(monitor) {
  return (
    monitor.title ||
    getDomain(monitor.url) ||
    "W"
  )
    .trim()
    .charAt(0)
    .toUpperCase();
}

function formatInterval(value) {
  const minutes = Number(value);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "—";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${minutes} min`;
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function showError(message) {
  elements.loadingState.classList.add("hidden");
  elements.detailsView.classList.add("hidden");
  elements.errorMessage.textContent = message;
  elements.errorState.classList.remove("hidden");
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", isError);
  elements.toast.classList.add("visible");

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2800);
}
