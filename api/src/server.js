import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";

const port = process.env.PORT || 3000;

async function startServer() {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
  });
}

startServer();