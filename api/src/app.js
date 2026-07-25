import express from "express";
import cors from "cors";

import monitorRoutes from "./routes/monitorRoutes.js";
import installationRoutes from "./routes/installationRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/installations", installationRoutes);

app.get("/api/health", (request, response) => {
  response.json({
    success: true,
    message: "Page Monitor API is running"
  });
});

app.get("/api/test-page", (req, res) => {
    res.send(`
        <h1>Page Monitor Test</h1>
        <p>Time: ${new Date()}</p>
    `);
});

app.use("/api/monitors", monitorRoutes);

app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: "Route not found"
  });
});

export default app;