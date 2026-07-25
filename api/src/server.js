import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { startMonitorScheduler } from "./services/monitorScheduler.js";


const port = process.env.PORT || 3000;

async function startServer() {
  await connectDatabase();

  startMonitorScheduler();

  app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
  });
}

startServer();