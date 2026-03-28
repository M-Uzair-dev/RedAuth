import Express from "express";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import "./workers/email.worker.js";

const app = Express();
const PORT = process.env.PORT || 5000;

app.use(Express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
  }),
);
app.use(helmet());
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
