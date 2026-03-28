import Express from "express";
import authController from "../controllers/auth.controller.js";
import { generalLimiter } from "../utils/rateLimiter.js";
import { verifyUser } from "../middleware/verifyUser.js";
const router = Express.Router();
const strictAuthLimiter = generalLimiter({
    windowSeconds: 300, // 5 minutes
    maxRequests: 10, // 10 requests
});
const stricterEmailLimiter = generalLimiter({
    windowSeconds: 300, // 5 minutes
    maxRequests: 3, // 3 requests
});
router.post("/login", strictAuthLimiter, authController.login);
router.post("/signup", strictAuthLimiter, authController.signup);
router.post("/forgotPassword", stricterEmailLimiter, authController.forgotPassword);
router.post("/resetPassword", strictAuthLimiter, authController.resetPassword);
router.post("/verifyEmail", strictAuthLimiter, authController.verifyEmail);
router.post("/resendVerificationEmail", stricterEmailLimiter, authController.resendVerificationEmail);
router.post("/logout", strictAuthLimiter, verifyUser, authController.logout);
router.post("/logout-all", strictAuthLimiter, verifyUser, authController.logoutAll);
router.post("/get-access-token", strictAuthLimiter, authController.getNewAccessToken);
export default router;
//# sourceMappingURL=auth.route.js.map