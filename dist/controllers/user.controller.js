import handleError from "../utils/handleError.js";
import userService from "../services/user.service.js";
import { appError, errorType } from "../errors/errors.js";
import userSchema from "../schemas/user.schema.js";
import cacheUser from "../utils/cacheUser.js";
import { redis } from "../lib/redis.js";
const getCurrentUser = async (req, res) => {
    try {
        if (!req.userId)
            throw new appError(400, "User not found!", errorType.USER_NOT_FOUND);
        // get cached user
        const existingUser = await cacheUser.getUserFromCache(req.userId);
        if (existingUser) {
            return res.status(200).json({
                success: true,
                message: "User retrieved successfully",
                data: {
                    user: existingUser,
                },
            });
        }
        const user = await userService.getUser(req.userId);
        if (user) {
            await cacheUser.addUserToCache(req.userId, user, 3600);
            res.status(200).json({
                success: true,
                message: "User retrieved successfully",
                data: {
                    user,
                },
            });
        }
        throw new appError(400, "User not found!", errorType.USER_NOT_FOUND);
    }
    catch (e) {
        handleError(e, res);
    }
};
const updateCurrentUser = async (req, res) => {
    try {
        if (!req.userId)
            throw new appError(400, "Please login", errorType.BAD_REQUEST);
        const partialData = userSchema.partialUser.parse(req.body);
        const user = await userService.editUser(req.userId, partialData);
        if (user) {
            await cacheUser.addUserToCache(req.userId, user, 3600);
            return res.status(200).json({
                success: true,
                message: "User updated successfully",
                data: {
                    user,
                },
            });
        }
        throw new appError(404, "User not found!", errorType.USER_NOT_FOUND);
    }
    catch (e) {
        handleError(e, res);
    }
};
const deleteCurrentUser = async (req, res) => {
    try {
        if (!req.userId)
            throw new appError(400, "Please login", errorType.BAD_REQUEST);
        const success = await userService.deleteUser(req.userId);
        if (success) {
            await cacheUser.deleteUserFromCache(req.userId);
            return res.status(200).json({
                success: true,
                message: "User deleted successfully!",
            });
        }
        throw new appError(404, "User not found!", errorType.USER_NOT_FOUND);
    }
    catch (e) {
        handleError(e, res);
    }
};
const getUserSessions = async (req, res) => {
    try {
        if (!req.userId)
            throw new appError(400, "Please login", errorType.BAD_REQUEST);
        const sessions = await userService.getUserSessions(req.userId);
        await Promise.all(sessions.map(async (session) => {
            const lastActive = await redis.get(`last-active-${session.id}`);
            session.lastActive = lastActive ? new Date(lastActive) : null;
        }));
        return res.status(200).json({
            success: true,
            message: "Sessions fetched successfully!",
            data: {
                sessions,
            },
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const revokeSession = async (req, res) => {
    try {
        if (!req.userId)
            throw new appError(400, "Please login", errorType.BAD_REQUEST);
        const { tokenId } = userSchema.revokeSessionSchema.parse(req.body);
        await userService.revoke_session(req.userId, tokenId);
        return res.status(200).json({
            success: true,
            message: "Sessions revoked successfully!",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
export default {
    getCurrentUser,
    deleteCurrentUser,
    updateCurrentUser,
    revokeSession,
    getUserSessions,
};
//# sourceMappingURL=user.controller.js.map