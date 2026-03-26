import Express from "express";
import userController from "../controllers/user.controller.js";
import { verifyUser } from "../middleware/verifyUser.js";

const router = Express.Router();

router.get("/me", verifyUser, userController.getCurrentUser);

export default router;
