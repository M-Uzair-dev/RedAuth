import Express from "express";
import authController from "../controllers/auth.controller.js";
import userController from "../controllers/user.controller.js";
import { email } from "zod";

const router = Express.Router();

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/forgotPassword", authController.forgotPasswprd);
router.post("/resetPassword", authController.resetPassword);
router.post("/verifyEmail", authController.verifyEmail);
router.post("/resendVerificationEmail", authController.resendVerificationEmail);

export default router;
