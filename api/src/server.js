import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { startMonitorScheduler } from "./services/monitorScheduler.js";

const port = process.env.PORT || 3000;
const environment = process.env.NODE_ENV;
var url = "";

if(environment === "development"){
  url = `http://localhost:${port}`
} else {
  url = "https://smart-page-monitor-api.onrender.com/api"
}

async function startServer() {
  await connectDatabase();

  startMonitorScheduler();

  app.listen(port, () => {
    console.log(`API running in ${environment} at ${url}`);
  });
}

startServer();