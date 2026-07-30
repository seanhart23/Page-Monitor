import express from "express";
import { getMonitorHistory } from "../controllers/changeHistoryController.js";
import { authenticateInstallation } from "../middleware/authenticateInstallation.js";

const router = express.Router();

router.get("/monitors/:monitorId/history", authenticateInstallation, getMonitorHistory);

export default router;