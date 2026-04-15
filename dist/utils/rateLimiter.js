import { redis } from "../lib/redis.js";
import handleError from "./handleError.js";
import { appError, errorType } from "../errors/errors.js";
export const generalLimiter = (data) => {
    const { windowSeconds, maxRequests } = data;
    return async function rateLimiter(req, res, next) {
        try {
            if (process.env.NODE_ENV === "test")
                return next();
            if (!req.ip)
                throw new appError(401, "Request has no IP address", errorType.BAD_REQUEST);
            await checkValidity(req.ip, windowSeconds, maxRequests, redis);
            next();
        }
        catch (e) {
            if (!(e instanceof appError)) {
                // infrastructure error (Redis down etc.) — fail open
                next();
                return;
            }
            handleError(e, res);
        }
    };
};
export const checkValidity = async (ip, windowSeconds, maxRequests, r) => {
    const key = `rateLimit-${ip}`;
    const currentTime = Date.now();
    await r.zadd(key, currentTime, `${currentTime}`);
    await r.zremrangebyscore(key, 0, currentTime - windowSeconds * 1000);
    const count = await r.zcard(key);
    await r.expire(key, windowSeconds);
    if (count > maxRequests) {
        throw new appError(429, "Too many requests, please wait before retrying!", errorType.TOO_MANY_REQUESTS);
    }
};
//# sourceMappingURL=rateLimiter.js.map