import express from "express";
import cors from "cors";

import monitorRoutes from "./routes/monitorRoutes.js";
import installationRoutes from "./routes/installationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import changeHistoryRoutes from "./routes/changeHistoryRoutes.js";

const app = express();

app.use(
    cors({
        origin: [
            "http://localhost:3000",
            /^chrome-extension:\/\//
        ]
    })
);
app.use(express.json());
app.use("/api/installations", installationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", changeHistoryRoutes);

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
        ${process.env.NODE_ENV}
    `);
});

app.get("/api/config", (req, res) => {
    res.send(`
        ${process.env.NODE_ENV}
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