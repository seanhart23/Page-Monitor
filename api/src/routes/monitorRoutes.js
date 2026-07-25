import { Router } from "express";

import {
  createMonitor,
  deleteMonitor,
  getMonitors
} from "../controllers/monitorController.js";

const router = Router();

router.get("/", getMonitors);
router.post("/", createMonitor);
router.delete("/:id", deleteMonitor);

export default router;