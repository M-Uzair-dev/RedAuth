import { Redis } from "ioredis";
declare const redisConnection: {
    host: string;
    port: number;
    maxRetriesPerRequest: null;
};
declare const redis: Redis;
export { redis, redisConnection };
//# sourceMappingURL=redis.d.ts.map