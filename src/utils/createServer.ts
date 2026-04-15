import Express from "express";
import authRoutes from "../routes/auth.route.js";
import userRoutes from "../routes/user.route.js";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import "../workers/email.worker.js";
import "../workers/tokenCleanup.worker.js";
import { generalLimiter } from "../utils/rateLimiter.js";
import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger.js";

// Add BEFORE all other middleware

const createServer = () => {
  const app = Express();

  app.use(Express.json());
  app.use(cookieParser());
  app.use(
    cors({
      credentials: true,
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
    }),
  );
  app.use(helmet());
  app.use(
    generalLimiter({
      maxRequests: 100,
      windowSeconds: 60,
    }),
  );
  app.use(
    pinoHttp({
      logger,
      // Generate a unique request ID for every request
      genReqId(req) {
        return req.headers["x-request-id"] ?? crypto.randomUUID();
      },
      // Log level by response status
      customLogLevel(req, res, err) {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      // What to log on each request
      customSuccessMessage(req, res) {
        return `${req.method} ${req.url} → ${res.statusCode}`;
      },
      // Redact sensitive headers/body from request logs
      redact: ["req.headers.authorization", "req.headers.cookie"],
      // Don't log health check spam
      autoLogging: {
        ignore(req) {
          return req.url === "/health";
        },
      },
    }),
  );
  app.get("/", async (req, res) => {
    res.status(200).json({
      success: true,
      message: "Api is working!",
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "API is working properly!" });
  });

  app.use("/auth", authRoutes);
  app.use("/user", userRoutes);
  return app;
};
export default createServer;
