import Express from "express";
import authController from "../controllers/auth.controller.js";
const router = Express.Router();
router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/forgotPassword", authController.forgotPasswprd);
router.post("/resetPassword", authController.resetPassword);
router.post("/verifyEmail", authController.verifyEmail);
export default router;
//# sourceMappingURL=auth.route.js.map