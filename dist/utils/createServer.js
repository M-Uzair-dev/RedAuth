import Express from "express";
import authRoutes from "../routes/auth.route.js";
import userRoutes from "../routes/user.route.js";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import "../workers/email.worker.js";
import "../workers/tokenCleanup.worker.js";
import { generalLimiter } from "../utils/rateLimiter.js";
const createServer = () => {
    const app = Express();
    app.use(Express.json());
    app.use(cookieParser());
    app.use(cors({
        credentials: true,
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
    }));
    app.use(helmet());
    app.use(generalLimiter({
        maxRequests: 100,
        windowSeconds: 60,
    }));
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
//# sourceMappingURL=createServer.js.map