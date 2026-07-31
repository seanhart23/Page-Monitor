import express from "express";
import { getPendingNotifications, acknowledgeNotification } from "../controllers/notificationController.js";
import { authenticateInstallation } from "../middleware/authenticateInstallation.js";

const router = express.Router();

router.use(authenticateInstallation);

router.get("/pending", getPendingNotifications);

router.post("/:monitorId/acknowledge", acknowledgeNotification);

export default router;