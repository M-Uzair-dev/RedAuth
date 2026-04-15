import type { Request, Response } from "express";
import handleError from "../utils/handleError.js";
import userService from "../services/user.service.js";
import { appError, errorType } from "../errors/errors.js";
import userSchema from "../schemas/user.schema.js";
import cacheUser from "../utils/cacheUser.js";
import { redis } from "../lib/redis.js";

const getCurrentUser = async (req: Request, res: Response) => {
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
  } catch (e: any) {
    handleError(e, res);
  }
};

const updateCurrentUser = async (req: Request, res: Response) => {
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
  } catch (e: any) {
    handleError(e, res);
  }
};

const deleteCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.userId)
      throw new appError(400, "Please login", errorType.BAD_REQUEST);
    const success = await userService.deleteUser(req.userId);
    if (success) {
      await cacheUser.deleteUserFromCache(req.userId);
      req.log.info({ userId: req.userId }, "User deleted successfully");
      return res.status(200).json({
        success: true,
        message: "User deleted successfully!",
      });
    }
    req.log.error({ userId: req.userId }, "Failed to delete user");
    throw new appError(404, "User not found!", errorType.USER_NOT_FOUND);
  } catch (e: any) {
    handleError(e, res);
  }
};

const getUserSessions = async (req: Request, res: Response) => {
  try {
    if (!req.userId)
      throw new appError(400, "Please login", errorType.BAD_REQUEST);

    const { device } = userSchema.getUserSessions.parse(req.query);

    const sessions = (await userService.getUserSessions(req.userId)) as {
      id: string;
      deviceName: string | null;
      lastActive: Date | null;
      device: string | null;
      current: boolean | null;
    }[];
    await Promise.all(
      sessions.map(async (session) => {
        const lastActive = await redis.get(`last-active-${session.id}`);
        session.lastActive = lastActive ? new Date(lastActive) : null;
        session.current = session.device == device;
      }),
    );
    return res.status(200).json({
      success: true,
      message: "Sessions fetched successfully!",
      data: {
        sessions,
      },
    });
  } catch (e: any) {
    handleError(e, res);
  }
};
const revokeSession = async (req: Request, res: Response) => {
  try {
    if (!req.userId)
      throw new appError(400, "Please login", errorType.BAD_REQUEST);

    const { tokenId } = userSchema.revokeSessionSchema.parse(req.body);

    await userService.revoke_session(req.userId, tokenId);
    req.log.info({ userId: req.userId, tokenId }, "Session revoked");
    return res.status(200).json({
      success: true,
      message: "Sessions revoked successfully!",
    });
  } catch (e: any) {
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
