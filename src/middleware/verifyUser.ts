import type { NextFunction, Request, Response } from "express";
import handleError from "../utils/handleError.js";
import tokenService from "../services/token.service.js";
import { appError, errorType } from "../errors/errors.js";
import { redis } from "../lib/redis.js";

interface AuthCookies {
  accessToken: string | undefined;
  refreshToken: string | undefined;
}

export const getCookies = (req: Request): AuthCookies => {
  return {
    accessToken: req.cookies?.access_token,
    refreshToken: req.cookies?.refresh_token,
  };
};

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { accessToken, refreshToken } = getCookies(req);

    if (!accessToken || !refreshToken) {
      throw new appError(401, "No tokens provided", errorType.UNAUTHORIZED);
    }

    const data = await tokenService.verifyUser(accessToken, refreshToken);

    req.userId = data.userId;
    await redis.set(
      `last-active-${data.tokenId}`,
      `${new Date()}`,
      "EX",
      604800, // 7 days
    );
    req.log.debug({ userId: req.userId }, "Request authenticated");
    next();
  } catch (e: any) {
    handleError(e, res);
  }
};
