import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { Redis } from "ioredis";
let redis;
const getRedis = () => {
    redis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
    });
    return redis;
};
const flushRedis = async () => {
    await redis.flushall();
};
export { flushRedis, getRedis };
//# sourceMappingURL=testRedis.js.map