import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { flushRedis, getRedis } from "../helpers/testRedis.js";
import { checkValidity } from "@/utils/rateLimiter.js";
import { appError, errorType } from "@/errors/errors.js";
let redis;
beforeAll(async () => {
    redis = getRedis();
});
beforeEach(async () => {
    await flushRedis();
});
describe("Rate Limiter", () => {
    it("Should only allow the number of requests under the limit", async () => {
        const ip = "1.2.3.4";
        const windowSeconds = 60;
        const maxRequests = 5;
        for (let i = 0; i < 5; i++) {
            await checkValidity(ip, windowSeconds, maxRequests, redis);
        }
        await expect(checkValidity(ip, windowSeconds, maxRequests, redis)).rejects.toThrow();
    });
    it("Should throw a 429 appError with the correct type when limit is exceeded", async () => {
        const ip = "2.2.2.2";
        const windowSeconds = 60;
        const maxRequests = 3;
        for (let i = 0; i < maxRequests; i++) {
            await checkValidity(ip, windowSeconds, maxRequests, redis);
        }
        const error = await checkValidity(ip, windowSeconds, maxRequests, redis).catch((e) => e);
        expect(error).toBeInstanceOf(appError);
        expect(error.statusCode).toBe(429);
        expect(error.type).toBe(errorType.TOO_MANY_REQUESTS);
    });
    it("Should be a proper sliding window approach", async () => {
        const ip = "1.2.3.4";
        const windowSeconds = 3;
        const maxRequests = 2;
        for (let i = 0; i < 5; i++) {
            await checkValidity(ip, windowSeconds, maxRequests, redis);
            await new Promise((res) => setTimeout(res, 1500));
        }
    });
    it("Should keep each user's rate limit separate", async () => {
        const ip1 = "1.2.3.4";
        const ip2 = "1.2.3.5";
        const windowSeconds = 3;
        const maxRequests = 2;
        for (let i = 0; i < 5; i++) {
            await checkValidity(ip1, windowSeconds, maxRequests, redis);
            await checkValidity(ip2, windowSeconds, maxRequests, redis);
            await new Promise((res) => setTimeout(res, 1500));
        }
    });
    it("Should fail open when Redis is down", async () => {
        const brokenRedis = {
            zadd: vi
                .fn()
                .mockRejectedValue(new Error("ECONNREFUSED: Redis connection refused")),
        };
        const error = await checkValidity("1.2.3.4", 60, 5, brokenRedis).catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(appError);
    });
});
//# sourceMappingURL=rateLimiter.test.js.map