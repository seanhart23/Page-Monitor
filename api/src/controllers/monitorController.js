import "dotenv/config";
import { Monitor } from "../models/monitor.js";
import { ChangeEvent } from "../models/changeEvent.js";
import { checkMonitor } from "../services/monitorChecker.js";
import { normalizeUrl } from "../utils/normalizeUrl.js";

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
    const installationId = request.installation.installationId;

    const maxMonitors =
      Number(
        process.env.MAX_MONITORS_PER_INSTALLATION
      ) ||
      Number(
        process.env.DEFAULT_MAX_MONITORS
      ) ||
      DEFAULT_MAX_MONITORS;

    const {
      title,
      url,
      icon,
      checkInterval,
      monitorType = "page",
      contentSelector = "body",
      comparisonMode = "text",
      selectedElement = null,
      ignoreSelectors = []
    } = request.body;

    if (!url) {
      return response.status(400).json({
        success: false,
        message: "URL is required"
      });
    }

    if (
      !["page", "element"].includes(
        monitorType
      )
    ) {
      return response.status(400).json({
        success: false,
        message: "Invalid monitor type"
      });
    }

    if (
      !["text", "html"].includes(
        comparisonMode
      )
    ) {
      return response.status(400).json({
        success: false,
        message: "Invalid comparison mode"
      });
    }

    const effectiveSelector = monitorType === "element" ? contentSelector?.trim() : "body";

    if (
      monitorType === "element" &&
      (
        !effectiveSelector ||
        effectiveSelector === "body"
      )
    ) {
      return response.status(400).json({
        success: false,
        code: "ELEMENT_SELECTOR_REQUIRED",
        message:
          "Element monitors require a selected element."
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

    const duplicateQuery = {
      installationId,
      normalizedUrl,
      contentSelector:
        effectiveSelector
    };

    const existingMonitor =
      await Monitor.findOne(
        duplicateQuery
      );

    if (existingMonitor) {
      return response.status(409).json({
        success: false,
        code:
          "MONITOR_ALREADY_EXISTS",
        message:
          monitorType === "element"
            ? "This element is already being monitored."
            : "This page is already being monitored."
      });
    }

    const monitorCount =
      await Monitor.countDocuments({
        installationId
      });

    if (
      monitorCount >= maxMonitors
    ) {
      return response.status(403).json({
        success: false,
        code:
          "MONITOR_LIMIT_REACHED",
        message:
          `You have reached the limit of ${maxMonitors} monitors.`,
        limit: maxMonitors,
        currentCount:
          monitorCount
      });
    }

    const monitor =
      await Monitor.create({
        installationId,

        title:
          title?.trim() ||
          "Untitled page",

        url,
        normalizedUrl,

        icon:
          icon || "",

        checkInterval:
          Number(checkInterval) ||
          30,

        monitorType,

        contentSelector:
          effectiveSelector,

        comparisonMode,

        selectedElement:
          monitorType === "element"
            ? selectedElement
            : null,

        ignoreSelectors:
          Array.isArray(
            ignoreSelectors
          )
            ? ignoreSelectors
            : []
      });

    return response.status(201).json({
      success: true,
      data: monitor,
      usage: {
        currentCount:
          monitorCount + 1,

        limit:
          maxMonitors
      }
    });

  } catch (error) {
    console.error(
      "Unable to create monitor:",
      error
    );

    if (error.code === 11000) {
      return response.status(409).json({
        success: false,
        code:
          "MONITOR_ALREADY_EXISTS",
        message:
          "This page or element is already being monitored."
      });
    }

    return response.status(500).json({
      success: false,
      message:
        "Unable to create monitor"
    });
  }
}

export async function deleteMonitor(request, response) {
  try {
    const monitor = await Monitor.findOneAndDelete({
      _id: request.params.id,
      installationId: request.installation.installationId
    });

    if (!monitor) {
      return response.status(404).json({
        success: false,
        message: "Monitor not found"
      });
    }

    await ChangeEvent.deleteMany({
      monitorId: monitor._id,
      installationId: request.installation.installationId
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
    }).select("+lastContent");

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