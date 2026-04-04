import { Redis } from "ioredis";

const isProd = !!process.env.REDIS_URL;

const redisConnection: any = isProd
  ? new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
    })
  : {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
    };

const redis = isProd
  ? redisConnection
  : new Redis({
      ...redisConnection,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

if (redis instanceof Redis) {
  redis.on("ready", () => {
    console.log("✅ Redis connected");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis error:", err);
  });
}

export { redis, redisConnection };
