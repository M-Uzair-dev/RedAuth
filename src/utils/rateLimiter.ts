import type { NextFunction, Request, Response } from "express";
import { redis } from "../lib/redis.js";
import handleError from "./handleError.js";
import { appError, errorType } from "../errors/errors.js";

type config = {
  windowSeconds: number;
  maxRequests: number;
};

export const generalLimiter = (data: config) => {
  const { windowSeconds, maxRequests } = data;
  return async function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const key = `rateLimit-${req.ip}`;
      const currentTime = Date.now();
      await redis.zadd(key, currentTime, `${currentTime}`);
      await redis.zremrangebyscore(key, 0, currentTime - windowSeconds * 1000);
      const count = await redis.zcard(key);
      await redis.expire(key, windowSeconds);
      if (count > maxRequests) {
        throw new appError(
          429,
          "Too many requests, please wait before retrying!",
          errorType.TOO_MANY_REQUESTS,
        );
      }
      next();
    } catch (e: any) {
      handleError(e, res);
    }
  };
};
