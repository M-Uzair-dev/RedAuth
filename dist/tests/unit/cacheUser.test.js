import { beforeEach, describe, expect, it, vi } from "vitest";
import cacheUser from "@/utils/cacheUser.js";
import { redis } from "@/lib/redis.js";
vi.mock("@/lib/redis.js", () => ({
    redis: {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
    },
}));
const validUser = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "John Doe",
    email: "john@example.com",
    emailVerified: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
};
beforeEach(() => {
    vi.clearAllMocks();
});
describe("getUserFromCache", () => {
    it("should return null when the key does not exist", async () => {
        redis.get.mockResolvedValue(null);
        const result = await cacheUser.getUserFromCache(validUser.id);
        expect(result).toBeNull();
    });
    it("should return the parsed user when the key exists", async () => {
        redis.get.mockResolvedValue(JSON.stringify(validUser));
        const result = await cacheUser.getUserFromCache(validUser.id);
        expect(result).toMatchObject({
            id: validUser.id,
            name: validUser.name,
            email: validUser.email,
        });
    });
    it("should return null and delete the key when cached data is corrupted JSON", async () => {
        redis.get.mockResolvedValue("{{not-valid-json");
        redis.del.mockResolvedValue(1);
        const result = await cacheUser.getUserFromCache(validUser.id);
        expect(result).toBeNull();
        expect(redis.del).toHaveBeenCalledWith(`user-${validUser.id}`);
    });
    it("should return null and delete the key when cached data fails schema validation", async () => {
        redis.get.mockResolvedValue(JSON.stringify({ name: "incomplete object missing required fields" }));
        redis.del.mockResolvedValue(1);
        const result = await cacheUser.getUserFromCache(validUser.id);
        expect(result).toBeNull();
        expect(redis.del).toHaveBeenCalledWith(`user-${validUser.id}`);
    });
    it("should return null when Redis throws", async () => {
        redis.get.mockRejectedValue(new Error("ECONNREFUSED"));
        const result = await cacheUser.getUserFromCache(validUser.id);
        expect(result).toBeNull();
    });
});
describe("addUserToCache", () => {
    it("should store the user and return true when data is valid", async () => {
        redis.set.mockResolvedValue("OK");
        const result = await cacheUser.addUserToCache(validUser.id, validUser, 3600);
        expect(result).toBe(true);
        expect(redis.set).toHaveBeenCalledWith(`user-${validUser.id}`, expect.any(String), "EX", 3600);
    });
    it("should return false and not call Redis when data fails schema validation", async () => {
        const invalidUser = { name: "incomplete" };
        const result = await cacheUser.addUserToCache("user-123", invalidUser, 3600);
        expect(result).toBe(false);
        expect(redis.set).not.toHaveBeenCalled();
    });
    it("should return false when Redis throws", async () => {
        redis.set.mockRejectedValue(new Error("ECONNREFUSED"));
        const result = await cacheUser.addUserToCache(validUser.id, validUser, 3600);
        expect(result).toBe(false);
    });
});
describe("deleteUserFromCache", () => {
    it("should delete the key and return true on success", async () => {
        redis.del.mockResolvedValue(1);
        const result = await cacheUser.deleteUserFromCache(validUser.id);
        expect(result).toBe(true);
        expect(redis.del).toHaveBeenCalledWith(`user-${validUser.id}`);
    });
    it("should return false when Redis throws", async () => {
        redis.del.mockRejectedValue(new Error("ECONNREFUSED"));
        const result = await cacheUser.deleteUserFromCache(validUser.id);
        expect(result).toBe(false);
    });
});
//# sourceMappingURL=cacheUser.test.js.map