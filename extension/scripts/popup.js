import { MAX_MONITORS, PREVIEW_MAX_LENGTH } from "../config.js";
import {
  createMonitor,
  getMonitors,
  deleteMonitor,
  checkMonitorNow,
  getMonitorHistory
} from "../services/api.js";
import { validateUrl } from "../utils/urlValidator.js";

const state = {
  tab: null,
  monitors: [],
  selectedMonitor: null,
  selectedElement: null,
  search: "",
  filter: "all"
};

const elements = {
  shell: document.getElementById("app-shell"),
  title: document.getElementById("page-title"),
  url: document.getElementById("page-url"),
  watchButton: document.getElementById("watch-button"),
  status: document.getElementById("status"),
  healthCard: document.getElementById("health-card"),
  healthTitle: document.getElementById("health-title"),
  monitorCount: document.getElementById("monitor-count"),
  changedToday: document.getElementById("changed-today"),
  lastCheck: document.getElementById("last-check"),
  search: document.getElementById("monitor-search"),
  filter: document.getElementById("monitor-filter"),
  loading: document.getElementById("loading-state"),
  empty: document.getElementById("empty-state"),
  list: document.getElementById("monitor-list"),
  detailScreen: document.getElementById("detail-screen"),
  backButton: document.getElementById("back-button"),
  openPageButton: document.getElementById("open-page-button"),
  detailContent: document.getElementById("detail-content"),
  detailHeaderTitle: document.getElementById("detail-header-title"),
  detailTitle: document.getElementById("detail-title"),
  detailDomain: document.getElementById("detail-domain"),
  detailSiteIcon: document.getElementById("detail-site-icon"),
  detailStatus: document.getElementById("detail-status"),
  detailChangeCount: document.getElementById("detail-change-count"),
  detailLastChange: document.getElementById("detail-last-change"),
  detailLastChecked: document.getElementById("detail-last-checked"),
  checkNowButton: document.getElementById("check-now-button"),
  deleteButton: document.getElementById("delete-monitor-button"),
  historyTotal: document.getElementById("history-total"),
  historyLoading: document.getElementById("history-loading"),
  historyEmpty: document.getElementById("history-empty"),
  historyList: document.getElementById("history-list"),
  selectElementButton: document.getElementById("selectElementButton"),
  selectedElementPreview: document.getElementById("selectedElementPreview"),
  toast: document.getElementById("toast"),
  detailMonitorType:
    document.getElementById(
      "detail-monitor-type"
    ),

  detailMonitorDescription:
    document.getElementById(
      "detail-monitor-description"
    ),

  detailMonitorSelector:
    document.getElementById(
      "detail-monitor-selector"
    ),

  highlightElementButton:
    document.getElementById(
      "highlight-element-button"
    ),
};

await initialize();

async function initialize() {
  bindEvents();

  const {
    autoDetectCurrentTab = true
  } = await chrome.storage.sync.get({
    autoDetectCurrentTab: true
  });

  if (autoDetectCurrentTab) {
    await loadCurrentTab();
  }

  await restoreSelectedElement();
  await loadMonitors();
}

function bindEvents() {
  elements.watchButton.addEventListener("click", handleWatchPage);
  elements.selectElementButton?.addEventListener(
    "click",
    handleSelectElement
  );
  elements.highlightElementButton?.addEventListener(
    "click",
    handleHighlightElement
  );
  elements.search.addEventListener("input", event => {
    state.search = event.target.value.trim().toLowerCase();
    renderMonitorList();
  });
  elements.filter.addEventListener("change", event => {
    state.filter = event.target.value;
    renderMonitorList();
  });
  elements.list.addEventListener("click", event => {
    const card = event.target.closest(".monitor-card");
    if (!card) return;
    const monitor = state.monitors.find(item => String(item._id) === card.dataset.id);
    if (monitor) openDetail(monitor);
  });
  elements.backButton.addEventListener("click", closeDetail);
  elements.openPageButton.addEventListener("click", openSelectedPage);
  elements.checkNowButton.addEventListener("click", handleCheckNow);
  elements.deleteButton.addEventListener("click", handleDelete);
}

async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tab = tab ?? null;

  if (!tab?.url) {
    elements.title.textContent = "Current page unavailable";
    elements.url.textContent = "";
    updateWatchButton();
    return;
  }

  elements.title.textContent = tab.title || "Current page";
  elements.url.textContent = tab.url;

  const result = validateUrl(tab.url);

  elements.status.textContent =
    result.valid ? "" : result.reason;

  updateWatchButton();
}

async function loadMonitors() {
  elements.loading.classList.remove("hidden");
  elements.empty.classList.add("hidden");
  elements.list.innerHTML = "";

  try {
    state.monitors = await getMonitors();
    updateSummary();
    updateWatchButton();
    renderMonitorList();
  } catch (error) {
    console.error(error);
    elements.list.innerHTML = '<div class="message-state">Unable to load monitors.</div>';
    showToast(error.message || "Unable to load monitors.", true);
  } finally {
    elements.loading.classList.add("hidden");
  }
}

function updateSummary() {
  const failures = state.monitors.filter(item => item.lastStatus === "failed").length;
  const changedToday = state.monitors.filter(item => item.lastCheckChanged && isToday(item.lastChangedAt)).length;
  const latest = getLatestDate(state.monitors.map(item => item.lastCheckedAt));

  elements.monitorCount.textContent = String(state.monitors.length);
  elements.changedToday.textContent = String(changedToday);
  elements.lastCheck.textContent = latest ? `Last check ${formatRelativeTime(latest)}` : "Not checked";
  elements.healthTitle.textContent = failures ? `${failures} monitor${failures === 1 ? "" : "s"} need attention` : "Everything looks good";
  elements.healthCard.classList.toggle("has-error", failures > 0);
}

function renderMonitorList() {
  const monitors = state.monitors.filter(monitor => {
    const searchable = `
    ${monitor.title || ""}
    ${monitor.url || ""}
    ${getDomain(monitor.url)}
    ${monitor.monitorType || ""}
    ${monitor.contentSelector || ""}
    ${monitor.selectedElement?.previewText || ""}
  `.toLowerCase(); const matchesSearch = !state.search || searchable.includes(state.search);
    const matchesFilter = state.filter === "all"
      || (state.filter === "changed" && monitor.lastCheckChanged)
      || (state.filter === "active" && monitor.enabled !== false)
      || (state.filter === "failed" && monitor.lastStatus === "failed");
    return matchesSearch && matchesFilter;
  });

  elements.empty.classList.toggle("hidden", state.monitors.length !== 0);

  if (!monitors.length && state.monitors.length) {
    elements.list.innerHTML = '<div class="message-state">No monitors match your search.</div>';
    return;
  }

  elements.list.innerHTML = monitors.map(renderMonitorCard).join("");
}

function truncateText(value, maxLength = PREVIEW_MAX_LENGTH) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function renderMonitorCard(monitor) {
  const status = getMonitorStatus(monitor);

  const icon = monitor.icon
    ? `<img src="${escapeAttribute(monitor.icon)}" alt="">`
    : escapeHtml(getInitial(monitor));

  const isElementMonitor =
    monitor.monitorType === "element";

  const monitorTypeLabel =
    isElementMonitor
      ? "Element"
      : "Page";

  const monitorTypeIcon =
    isElementMonitor
      ? "◎"
      : "▱";

  const selectedPreview =
    monitor.selectedElement?.previewText;

  const targetDescription =
    isElementMonitor
      ? selectedPreview
        ? truncateText(selectedPreview)
        : monitor.contentSelector || "Selected element"
      : "Entire page";

  return `
    <article
      class="monitor-card"
      data-id="${escapeAttribute(monitor._id)}"
      role="button"
      tabindex="0"
    >
      <div class="site-icon">
        ${icon}
      </div>

      <div class="monitor-copy">
        <div class="monitor-title-row">
          <h2>
            ${escapeHtml(
    monitor.title || "Untitled page"
  )}
          </h2>

          <span class="monitor-type-badge ${isElementMonitor
      ? "monitor-type-badge--element"
      : "monitor-type-badge--page"
    }">
            <span aria-hidden="true">
              ${monitorTypeIcon}
            </span>

            ${monitorTypeLabel}
          </span>
        </div>

        <p>
          ${escapeHtml(
      getDomain(monitor.url)
    )}
        </p>

        <p class="monitor-target-copy">
          ${isElementMonitor
      ? "Monitoring:"
      : "Monitoring:"
    }

          ${escapeHtml(targetDescription)}
        </p>

        <p class="${monitor.lastCheckChanged
      ? "changed-copy"
      : ""
    }">
          ${escapeHtml(status.meta)}
        </p>
      </div>

      <div class="monitor-side">
        <span class="status-pill ${status.className}">
          ${status.label}
        </span>

        <span class="chevron">
          ›
        </span>
      </div>
    </article>
  `;
}

function getMonitorStatus(monitor) {
  if (monitor.lastStatus === "failed") {
    return { label: "Failed", className: "status-failed", meta: monitor.lastError || "Check failed" };
  }
  if (monitor.lastCheckChanged) {
    return { label: "Changed", className: "status-changed", meta: monitor.lastChangedAt ? `Changed ${formatRelativeTime(monitor.lastChangedAt)}` : "Page changed" };
  }
  if (monitor.lastStatus === "pending" || !monitor.lastCheckedAt) {
    return { label: "Pending", className: "status-pending", meta: "Waiting for first check" };
  }
  return { label: "OK", className: "status-ok", meta: `Checked ${formatRelativeTime(monitor.lastCheckedAt)}` };
}

async function openMonitorDetails(
  monitorId
) {
  if (!monitorId) {
    console.error(
      "Cannot open details without a monitor ID."
    );

    return;
  }

  const detailsUrl =
    new URL(
      chrome.runtime.getURL(
        "ui/details.html"
      )
    );

  detailsUrl.searchParams.set(
    "monitorId",
    String(monitorId)
  );

  await chrome.tabs.create({
    url: detailsUrl.toString()
  });
}

async function handleWatchPage() {
  if (!state.tab?.url) return;

  elements.watchButton.disabled = true;
  elements.status.textContent = "Saving...";

  try {
    const storageResult =
      await chrome.storage.session.get(
        "selectedElement"
      );

    const selectedElement =
      state.selectedElement ||
      storageResult.selectedElement ||
      null;

    const {
      defaultCheckInterval = 30
    } = await chrome.storage.sync.get({
      defaultCheckInterval: 30
    });

    const payload = {
      title:
        state.tab.title ||
        "Untitled page",

      url:
        state.tab.url,

      icon:
        state.tab.favIconUrl ||
        "",

      checkInterval:
        Number(defaultCheckInterval),

      monitorType:
        selectedElement
          ? "element"
          : "page",

      contentSelector:
        selectedElement?.selector ||
        "body",

      comparisonMode:
        "text",

      selectedElement:
        selectedElement
          ? {
            tagName:
              selectedElement.tagName,

            previewText:
              selectedElement.text
          }
          : null
    };

    await createMonitor(payload);

    await chrome.storage.session.remove(
      "selectedElement"
    );

    state.selectedElement = null;

    elements.status.textContent = "";

    showToast(
      selectedElement
        ? "This element is now being monitored."
        : "This page is now being monitored."
    );

    await loadSelectedElement();
    await loadMonitors();

  } catch (error) {
    console.error(
      "Monitor creation failed:",
      error
    );

    elements.status.textContent =
      error.message ||
      "Unable to save page.";

    showToast(
      error.message ||
      "Unable to save page.",
      true
    );
  } finally {
    updateWatchButton();
  }
}

async function openDetail(monitor) {
  if (!monitor?._id) {
    console.error(
      "Cannot open monitor details: invalid monitor.",
      monitor
    );
    return;
  }

  state.selectedMonitor = monitor;
  renderDetail(monitor);

  const viewBtn = document.getElementById("viewFullDetailsBtn");

  viewBtn.onclick = () => {
    openMonitorDetails(monitor._id)
  };

  elements.shell.classList.add("detail-open");
  elements.detailScreen.setAttribute("aria-hidden", "false");
  elements.detailContent.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resetDetailScroll();

      elements.backButton.focus({
        preventScroll: true
      });
    });
  });

  await loadHistory(monitor._id);
}

function resetDetailScroll() {
  elements.detailContent.scrollTop = 0;
  elements.detailScreen.scrollTop = 0;
  elements.shell.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function closeDetail() {
  state.selectedMonitor = null;
  elements.shell.classList.remove("detail-open");
  elements.detailScreen.setAttribute("aria-hidden", "true");
  elements.detailContent.setAttribute("aria-hidden", "true");
  elements.historyList.innerHTML = "";

  requestAnimationFrame(() => {
    elements.watchButton.focus();
  });
}

function renderDetail(monitor) {
  const status = getMonitorStatus(monitor);
  elements.detailTitle.textContent = monitor.title || "Untitled page";
  elements.detailDomain.textContent = getDomain(monitor.url);
  elements.detailSiteIcon.textContent = getInitial(monitor);
  elements.detailStatus.textContent = status.label;
  elements.detailStatus.className = `status-pill ${status.className}`;
  elements.detailChangeCount.textContent = String(monitor.changeCount ?? 0);
  elements.detailLastChange.textContent = monitor.lastChangedAt ? formatCompactTime(monitor.lastChangedAt) : "Never";
  elements.detailLastChecked.textContent = monitor.lastCheckedAt ? formatCompactTime(monitor.lastCheckedAt) : "Never";
  const isElementMonitor =
    monitor.monitorType === "element";

  if (elements.detailMonitorType) {
    elements.detailMonitorType.textContent =
      isElementMonitor
        ? "Element monitor"
        : "Page monitor";
  }

  if (elements.detailMonitorDescription) {
    elements.detailMonitorDescription.textContent =
      isElementMonitor
        ? monitor.selectedElement?.previewText ||
        "Monitoring a selected element"
        : "Monitoring the entire page";
  }

  if (elements.detailMonitorSelector) {
    elements.detailMonitorSelector.textContent =
      isElementMonitor
        ? monitor.contentSelector || ""
        : "";

    elements.detailMonitorSelector.classList.toggle(
      "hidden",
      !isElementMonitor
    );
  }

  if (elements.highlightElementButton) {
    elements.highlightElementButton.classList.toggle(
      "hidden",
      !isElementMonitor
    );
  }
}

function renderHistoryEvent(event) {
  const removedText =
    event.removedText?.trim() || "";

  const addedText =
    event.addedText?.trim() || "";

  const removedSection = removedText
    ? `
            <div class="history-preview history-preview--removed">
                <span class="history-preview__label">
                    Removed
                </span>

                <p>${escapeHtml(removedText)}</p>
            </div>
        `
    : "";

  const addedSection = addedText
    ? `
            <div class="history-preview history-preview--added">
                <span class="history-preview__label">
                    Added
                </span>

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

            <div class="history-item__content">
                <p class="history-date">
                    ${escapeHtml(
    formatHistoryDate(
      event.checkedAt ||
      event.createdAt
    )
  )}
                </p>

                <p class="history-summary">
                    ${escapeHtml(
    event.summary ||
    "Page content changed"
  )}
                </p>

                ${preview}
            </div>
        </article>
    `;
}

async function loadHistory(monitorId) {
  elements.historyLoading.classList.remove(
    "hidden"
  );

  elements.historyEmpty.classList.add(
    "hidden"
  );

  elements.historyList.innerHTML = "";

  try {
    const history =
      await getMonitorHistory(monitorId);

    elements.historyTotal.textContent =
      `${history.length} ${history.length === 1
        ? "event"
        : "events"
      }`;

    elements.historyEmpty.classList.toggle(
      "hidden",
      history.length > 0
    );

    elements.historyList.innerHTML =
      history
        .map(renderHistoryEvent)
        .join("");
  } catch (error) {
    console.error(error);

    elements.historyEmpty.textContent =
      "Unable to load change history.";

    elements.historyEmpty.classList.remove(
      "hidden"
    );
  } finally {
    elements.historyLoading.classList.add(
      "hidden"
    );
  }
}

async function handleCheckNow() {
  const monitor = state.selectedMonitor;
  if (!monitor) return;
  elements.checkNowButton.disabled = true;
  elements.checkNowButton.textContent = "Checking...";

  try {
    const result = await checkMonitorNow(monitor._id);
    showToast(result.changed ? "A change was detected." : "No change detected.");
    await loadMonitors();
    const refreshed = state.monitors.find(item => item._id === monitor._id);
    if (refreshed) {
      state.selectedMonitor = refreshed;
      renderDetail(refreshed);
      await loadHistory(refreshed._id);
    }
  } catch (error) {
    showToast(error.message || "Unable to check monitor.", true);
  } finally {
    elements.checkNowButton.disabled = false;
    elements.checkNowButton.textContent = "Check now";
  }
}

async function handleDelete() {
  const monitor = state.selectedMonitor;
  if (!monitor) return;
  if (!window.confirm(`Delete “${monitor.title || "this monitor"}”?`)) return;

  elements.deleteButton.disabled = true;
  try {
    await deleteMonitor(monitor._id);
    closeDetail();
    showToast("Monitor deleted.");
    await loadMonitors();
  } catch (error) {
    showToast(error.message || "Unable to delete monitor.", true);
  } finally {
    elements.deleteButton.disabled = false;
  }
}

async function openSelectedPage() {
  if (state.selectedMonitor?.url) await chrome.tabs.create({ url: state.selectedMonitor.url });
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url || "Unknown website"; }
}

function getInitial(monitor) {
  return (monitor.title || getDomain(monitor.url) || "W").trim().charAt(0).toUpperCase();
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function getLatestDate(values) {
  const times = values.filter(Boolean).map(value => new Date(value).getTime()).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)) : null;
}

function formatRelativeTime(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCompactTime(value) { return formatRelativeTime(value); }

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isToday(date)) return `Today · ${time}`;
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", isError);
  elements.toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => elements.toast.classList.remove("visible"), 2600);
}

const openSettingsButton = document.querySelector("#openSettingsButton");

openSettingsButton?.addEventListener(
  "click",
  async () => {
    await chrome.runtime.openOptionsPage();
  }
);

function updateWatchButton() {
  const limitReached =
    state.monitors.length >= MAX_MONITORS;

  const currentUrlValidation =
    state.tab?.url
      ? validateUrl(state.tab.url)
      : {
        valid: false,
        reason: "Current page unavailable"
      };

  const buttonText =
    elements.watchButton.querySelector(
      "span:last-child"
    );

  if (limitReached) {
    elements.watchButton.disabled = true;
    elements.watchButton.title =
      `Maximum of ${MAX_MONITORS} monitors reached`;

    if (buttonText) {
      buttonText.textContent =
        "Monitor limit reached";
    }

    return;
  }

  if (!currentUrlValidation.valid) {
    elements.watchButton.disabled = true;
    elements.watchButton.title =
      currentUrlValidation.reason || "";

    if (buttonText) {
      buttonText.textContent =
        state.selectedElement
          ? "Monitor selected element"
          : "Monitor this page";
    }

    return;
  }

  elements.watchButton.disabled = false;
  elements.watchButton.title = "";

  if (buttonText) {
    buttonText.textContent =
      state.selectedElement
        ? "Monitor selected element"
        : "Monitor this page";
  }
}


async function loadSelectedElement() {
  const result =
    await chrome.storage.session.get(
      "selectedElement"
    );

  const storedElement =
    result.selectedElement;

  const belongsToCurrentTab =
    storedElement &&
    (
      storedElement.tabId == null ||
      storedElement.tabId === state.tab?.id
    );

  state.selectedElement =
    belongsToCurrentTab
      ? storedElement
      : null;

  const preview = elements.selectedElementPreview;

  if (!preview) {
    console.error('Missing HTML element with id="selectedElementPreview"');
    return;
  }

  if (!state.selectedElement) {
    preview.innerHTML = "";
    preview.hidden = true;
    updateWatchButton();
    return;
  }

  preview.innerHTML = `
    <strong>Selected element</strong>

    <div>
      ${escapeHtml(state.selectedElement.text || "No visible text found")}
    </div>`;

  preview.hidden = false;
  updateWatchButton();
}

async function handleSelectElement() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    showToast("This page cannot be selected.", true);
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "START_ELEMENT_SELECTION"
    });

    window.close();
  } catch (error) {
    console.error("Unable to start element selection:", error);
    showToast(
      "Refresh the webpage and try again.",
      true
    );
  }
}

async function handleHighlightElement() {
  const monitor =
    state.selectedMonitor;

  if (
    !monitor?.url ||
    monitor.monitorType !== "element" ||
    !monitor.contentSelector
  ) {
    showToast(
      "This monitor does not have an element selector.",
      true
    );

    return;
  }

  try {
    await chrome.runtime.sendMessage({
      type:
        "OPEN_AND_HIGHLIGHT_ELEMENT",

      payload: {
        url:
          monitor.url,

        selector:
          monitor.contentSelector
      }
    });
  } catch (error) {
    console.error(
      "Unable to highlight element:",
      error
    );

    showToast(
      "Unable to open the monitored element.",
      true
    );
  }
}

async function restoreSelectedElement() {
  try {
    const {
      selectedElement,
      selectionCompleted
    } =
      await chrome.storage.session.get([
        "selectedElement",
        "selectionCompleted"
      ]);

    state.selectedElement =
      selectedElement || null;

    await loadSelectedElement();

    if (selectionCompleted) {
      await chrome.storage.session.remove(
        "selectionCompleted"
      );
    }
  } catch (error) {
    console.error(
      "Unable to restore selected element:",
      error
    );
  }
}

