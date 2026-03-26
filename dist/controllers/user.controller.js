import handleError from "../utils/handleError.js";
import userService from "../services/user.service.js";
const getCurrentUser = async (req, res) => {
    try {
        const user = await userService.getUser(req.userId);
        res.status(200).json({
            success: true,
            message: "User retrieved successfully",
            data: {
                user,
            },
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
export default {
    getCurrentUser,
};
//# sourceMappingURL=user.controller.js.map