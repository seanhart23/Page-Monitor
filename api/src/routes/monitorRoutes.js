import { Router } from "express";
import { createMonitor, deleteMonitor, getMonitors, checkMonitorNow } from "../controllers/monitorController.js";
import { authenticateInstallation } from "../middleware/authenticateInstallation.js";

const router = Router();

router.use(authenticateInstallation);

router.get("/", getMonitors);
router.post("/", createMonitor);
router.delete("/:id", deleteMonitor);
router.post("/:id/check", checkMonitorNow);

export default router;