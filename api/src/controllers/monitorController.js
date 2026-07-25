const monitors = [];

export function getMonitors(request, response) {
  response.json({
    success: true,
    data: monitors
  });
}

export function createMonitor(request, response) {

  console.log("POST /api/monitors");
  console.log(request.body);

  const { id, title, url, savedAt } = request.body;

  if (!url) {
    return response.status(400).json({
      success: false,
      message: "URL is required"
    });
  }

  const duplicate = monitors.some(
    monitor => normalizeUrl(monitor.url) === normalizeUrl(url)
  );

  if (duplicate) {
    return response.status(409).json({
      success: false,
      message: "This page is already being monitored"
    });
  }

  const monitor = {
    id: crypto.randomUUID(),
    title: title?.trim() || "Untitled page",
    url: url.trim(),
    enabled: true,
    checkFrequency: "daily",
    createdAt: new Date().toISOString(),
    lastCheckedAt: null,
    lastChangedAt: null
  };

  monitors.push(monitor);

  return response.status(201).json({
    success: true,
    data: monitor
  });
}

export function deleteMonitor(request, response) {
  const { id } = request.params;
  const monitorIndex = monitors.findIndex(monitor => monitor.id === id);

  if (monitorIndex === -1) {
    return response.status(404).json({
      success: false,
      message: "Monitor not found"
    });
  }

  const [deletedMonitor] = monitors.splice(monitorIndex, 1);

  return response.json({
    success: true,
    data: deletedMonitor
  });
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);

    url.hash = "";

    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return value;
  }
}