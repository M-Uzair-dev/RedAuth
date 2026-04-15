import "dotenv/config";
import createServer from "./utils/createServer.js";
import { logger } from "./lib/logger.js";

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection — shutting down");
  process.exit(1);
});

const app = createServer();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server started");
});
