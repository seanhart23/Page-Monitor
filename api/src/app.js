import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import monitorRoutes from "./routes/monitorRoutes.js";
import installationRoutes from "./routes/installationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import changeHistoryRoutes from "./routes/changeHistoryRoutes.js";
import websiteRoutes from "./routes/websiteRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, './views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));
app.use(cors({ origin: [ "http://localhost:3000", /^chrome-extension:\/\// ] }));
app.use(express.json());
app.use("/api", changeHistoryRoutes);
app.use("/api/monitors", monitorRoutes);
app.use("/api/installations", installationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/website", websiteRoutes);

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

app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: "Route not found"
  });
});

export default app;