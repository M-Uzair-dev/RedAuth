import type { Request, Response } from "express";
import handleError from "../utils/handleError.js";
import userService from "../services/user.service.js";
import { appError, errorType } from "../errors/errors.js";
import userSchema from "../schemas/user.schema.js";

const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.userId)
      throw new appError(404, "User not found!", errorType.USER_NOT_FOUND);
    const user = await userService.getUser(req.userId);
    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        user,
      },
    });
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
    if (user)
      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: {
          user,
        },
      });
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
    if (success)
      return res.status(200).json({
        success: true,
        message: "User deleted successfully!",
      });
    throw new appError(404, "User not found!", errorType.USER_NOT_FOUND);
  } catch (e: any) {
    handleError(e, res);
  }
};
export default {
  getCurrentUser,
  deleteCurrentUser,
  updateCurrentUser,
};
