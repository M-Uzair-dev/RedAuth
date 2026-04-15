import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generalLimiter } from "@/utils/rateLimiter.js";
import { redis } from "@/lib/redis.js";
vi.mock("@/lib/redis.js", () => ({
    redis: {
        zadd: vi.fn(),
        zremrangebyscore: vi.fn(),
        zcard: vi.fn(),
        expire: vi.fn(),
    },
}));
const mockReq = (ip) => ({ ip, headers: {}, socket: { remoteAddress: ip } });
const mockRes = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
};
beforeEach(() => {
    vi.clearAllMocks();
});
afterEach(() => {
    vi.unstubAllEnvs();
});
describe("generalLimiter", () => {
    it("should short-circuit and call next() when NODE_ENV is test", async () => {
        // NODE_ENV is already "test" in this environment
        const next = vi.fn();
        const middleware = generalLimiter({ windowSeconds: 60, maxRequests: 5 });
        await middleware(mockReq("1.2.3.4"), mockRes(), next);
        expect(next).toHaveBeenCalled();
        expect(redis.zadd).not.toHaveBeenCalled();
    });
    it("should call next() for a valid request under the limit", async () => {
        vi.stubEnv("NODE_ENV", "production");
        redis.zadd.mockResolvedValue(1);
        redis.zremrangebyscore.mockResolvedValue(0);
        redis.zcard.mockResolvedValue(1);
        redis.expire.mockResolvedValue(1);
        const next = vi.fn();
        const middleware = generalLimiter({ windowSeconds: 60, maxRequests: 5 });
        await middleware(mockReq("1.2.3.4"), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
    it("should return 401 and not call next() when req.ip is missing", async () => {
        vi.stubEnv("NODE_ENV", "production");
        const next = vi.fn();
        const res = mockRes();
        const middleware = generalLimiter({ windowSeconds: 60, maxRequests: 5 });
        await middleware(mockReq(undefined), res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
    it("should fail open and call next() when Redis throws a non-appError", async () => {
        vi.stubEnv("NODE_ENV", "production");
        redis.zadd.mockRejectedValue(new Error("ECONNREFUSED"));
        const next = vi.fn();
        const res = mockRes();
        const middleware = generalLimiter({ windowSeconds: 60, maxRequests: 5 });
        await middleware(mockReq("1.2.3.4"), res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
    it("should return 429 and not call next() when the rate limit is exceeded", async () => {
        vi.stubEnv("NODE_ENV", "production");
        redis.zadd.mockResolvedValue(1);
        redis.zremrangebyscore.mockResolvedValue(0);
        redis.zcard.mockResolvedValue(6); // exceeds maxRequests: 5
        redis.expire.mockResolvedValue(1);
        const next = vi.fn();
        const res = mockRes();
        const middleware = generalLimiter({ windowSeconds: 60, maxRequests: 5 });
        await middleware(mockReq("1.2.3.4"), res, next);
        expect(res.status).toHaveBeenCalledWith(429);
        expect(next).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=generalLimiter.test.js.map