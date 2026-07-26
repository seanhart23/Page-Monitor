import { Monitor } from "../models/monitor.js";
import { normalizeUrl } from "../utils/normalizeUrl.js";
import { checkMonitor } from "../services/monitorChecker.js";

export async function getMonitors(request, response) {
  try {
    const monitors = await Monitor.find({
      installationId:
        request.installation.installationId
    }).sort({
      createdAt: -1,
    });

    response.json({
      success: true,
      data: monitors
    });
  } catch (error) {
    console.error("Unable to load monitors:", error);

    response.status(500).json({
      success: false,
      message: "Unable to load monitors"
    });
  }
}

export async function createMonitor(request, response) {
  try {
    const { title, url, icon, checkInterval } = request.body;

    if (!url) {
      return response.status(400).json({
        success: false,
        message: "URL is required"
      });
    }

    let normalizedUrl;

    try {
      normalizedUrl = normalizeUrl(url);
    } catch {
      return response.status(400).json({
        success: false,
        message: "A valid URL is required"
      });
    }

    const existingMonitor = await Monitor.findOne({
      normalizedUrl,
      installationId:
        request.installation.installationId
    });

    if (existingMonitor) {
      return response.status(409).json({
        success: false,
        message: "This page is already being monitored"
      });
    }

    const monitor = await Monitor.create({
      title: title?.trim() || "Untitled page",
      url,
      normalizedUrl,
      icon,
      checkInterval: Number(checkInterval) || 30,
      installationId:
        request.installation.installationId
    });

    return response.status(201).json({
      success: true,
      data: monitor
    });
  } catch (error) {
    console.error("Unable to create monitor:", error);

    return response.status(500).json({
      success: false,
      message: "Unable to create monitor"
    });
  }
}

export async function deleteMonitor(request, response) {
  try {
    const monitor = await Monitor.findOneAndDelete({
      _id: request.params.id,
      installationId:
        request.installation.installationId
    });

    if (!monitor) {
      return response.status(404).json({
        success: false,
        message: "Monitor not found"
      });
    }

    return response.json({
      success: true,
      data: monitor
    });
  } catch (error) {
    console.error("Unable to delete monitor:", error);

    return response.status(500).json({
      success: false,
      message: "Unable to delete monitor"
    });
  }
}

export async function checkMonitorNow(request, response) {
    try {
        const monitor = await Monitor.findOne({
            _id: request.params.id,
            installationId:
                request.installation.installationId
        });

        if (!monitor) {
            return response.status(404).json({
                success: false,
                message: "Monitor not found"
            });
        }

        const result = await checkMonitor(monitor);

        return response.json({
            success: result.success,
            changed: result.changed,
            data: monitor,
            error: result.error
        });
    } catch (error) {
        console.error("Unable to check monitor:", error);

        return response.status(500).json({
            success: false,
            message: "Unable to check monitor"
        });
    }
}