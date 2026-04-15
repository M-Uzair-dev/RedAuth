import "dotenv/config";
import createServer from "./utils/createServer.js";
import { logger } from "./lib/logger.js";
import { emailWorker } from "./workers/email.worker.js";
import { cleanupWorker } from "./workers/tokenCleanup.worker.js";
import { redis } from "./lib/redis.js";
import prisma from "./lib/prisma.js";

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

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Server started");
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Graceful shutdown initiated");

  setTimeout(() => {
    logger.error("Graceful shutdown timeout — forcing exit");
    process.exit(1);
  }, 15_000).unref();

  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      await Promise.all([emailWorker.close(), cleanupWorker.close()]);
      logger.info("BullMQ workers closed");

      await redis.quit();
      logger.info("Redis disconnected");

      await prisma.$disconnect();
      logger.info("Database disconnected");

      logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during graceful shutdown");
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
