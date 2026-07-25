import express from "express";
import cors from "cors";

import monitorRoutes from "./routes/monitorRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (request, response) => {
  response.json({
    success: true,
    message: "Page Monitor API is running"
  });
});

app.use("/api/monitors", monitorRoutes);

app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: "Route not found"
  });
});

export default app;