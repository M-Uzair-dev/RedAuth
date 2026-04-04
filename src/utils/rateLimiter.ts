import type { NextFunction, Request, Response } from "express";
import { redis } from "../lib/redis.js";
import handleError from "./handleError.js";
import { appError, errorType } from "../errors/errors.js";
import type { Redis } from "ioredis";

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
      if (process.env.NODE_ENV === "test") return next();
      if (!req.ip)
        throw new appError(
          401,
          "Request has no IP address",
          errorType.BAD_REQUEST,
        );
      await checkValidity(req.ip, windowSeconds, maxRequests, redis);
      next();
    } catch (e: any) {
      if (!(e instanceof appError)) {
        // infrastructure error (Redis down etc.) — fail open
        next();
        return;
      }
      handleError(e, res);
    }
  };
};

export const checkValidity = async (
  ip: string,
  windowSeconds: number,
  maxRequests: number,
  r: Redis,
) => {
  const key = `rateLimit-${ip}`;
  const currentTime = Date.now();
  await r.zadd(key, currentTime, `${currentTime}`);
  await r.zremrangebyscore(key, 0, currentTime - windowSeconds * 1000);
  const count = await r.zcard(key);
  await r.expire(key, windowSeconds);
  if (count > maxRequests) {
    throw new appError(
      429,
      "Too many requests, please wait before retrying!",
      errorType.TOO_MANY_REQUESTS,
    );
  }
};
