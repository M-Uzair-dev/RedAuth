import Express from "express";
import userController from "../controllers/user.controller.js";
import { verifyUser } from "../middleware/verifyUser.js";
const router = Express.Router();
router.get("/me", verifyUser, userController.getCurrentUser);
router.patch("/me", verifyUser, userController.updateCurrentUser);
router.delete("/me", verifyUser, userController.deleteCurrentUser);
export default router;
//# sourceMappingURL=user.route.js.map