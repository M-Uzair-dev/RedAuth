import Express from "express";
import authController from "../controllers/auth.controller.js";
import { generalLimiter } from "../utils/rateLimiter.js";
const router = Express.Router();
const strictAuthLimiter = generalLimiter({
    windowSeconds: 900,
    maxRequests: 5,
});
router.post("/login", strictAuthLimiter, authController.login);
router.post("/signup", strictAuthLimiter, authController.signup);
router.post("/forgotPassword", strictAuthLimiter, authController.forgotPasswprd);
router.post("/resetPassword", strictAuthLimiter, authController.resetPassword);
router.post("/verifyEmail", strictAuthLimiter, authController.verifyEmail);
router.post("/resendVerificationEmail", strictAuthLimiter, authController.resendVerificationEmail);
export default router;
//# sourceMappingURL=auth.route.js.map