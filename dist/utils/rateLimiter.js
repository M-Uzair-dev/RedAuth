import { redis } from "../lib/redis.js";
import handleError from "./handleError.js";
import { appError, errorType } from "../errors/errors.js";
export const generalLimiter = (data) => {
    const { windowSeconds, maxRequests } = data;
    return async function rateLimiter(req, res, next) {
        try {
            const key = `rateLimit-${req.ip}`;
            const currentTime = Date.now();
            await redis.zadd(key, currentTime, `${currentTime}`);
            await redis.zremrangebyscore(key, 0, currentTime - windowSeconds * 1000);
            const count = await redis.zcard(key);
            await redis.expire(key, windowSeconds);
            if (count > maxRequests) {
                throw new appError(429, "Too many requests, please wait before retrying!", errorType.TOO_MANY_REQUESTS);
            }
            next();
        }
        catch (e) {
            handleError(e, res);
        }
    };
};
//# sourceMappingURL=rateLimiter.js.map