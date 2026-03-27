import { Redis } from "ioredis";
const redisConnection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
};
const redis = new Redis({
    ...redisConnection,
    retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
    },
});
redis.on("ready", () => {
    console.log("✅ Redis connected");
});
redis.on("error", (err) => {
    console.error("❌ Redis error:", err);
});
export { redis, redisConnection };
//# sourceMappingURL=redis.js.map