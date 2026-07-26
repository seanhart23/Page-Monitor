import express from "express";

import {
    getMonitorHistory
} from "../controllers/changeHistoryController.js";

import {
    authenticateInstallation
} from "../middleware/authenticateInstallation.js";

const router = express.Router();

router.get(
    "/monitors/:monitorId/history",
    authenticateInstallation,
    getMonitorHistory
);

// router.get(
//   "/monitors/:monitorId/changes",
//   authenticateInstallation,
//   async (req, res, next) => {
//     try {
//       const monitor = await Monitor.findOne({
//         _id: req.params.monitorId,
//         installationId: req.installationId
//       });

//       if (!monitor) {
//         return res.status(404).json({
//           error: "Monitor not found"
//         });
//       }

//       const changes = await Change.find({
//         monitorId: monitor._id,
//         installationId: req.installationId
//       })
//         .sort({ detectedAt: -1 })
//         .limit(20)
//         .lean();

//       return res.json({
//         changes
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// );
export default router;