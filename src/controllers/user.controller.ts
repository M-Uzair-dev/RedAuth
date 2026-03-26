import type { Request, Response } from "express";
import handleError from "../utils/handleError.js";
import userService from "../services/user.service.js";

const getCurrentUser = async (req: Request, res: Response) => {
  try {
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
export default {
  getCurrentUser,
};
