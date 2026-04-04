import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
let container;
export const createRedis = async () => {
    container = await new RedisContainer("redis:7-alpine").start();
    const host = container.getHost();
    const port = container.getPort();
    process.env.REDIS_HOST = host;
    process.env.REDIS_PORT = `${port}`;
};
export const stopRedis = async () => {
    container.stop();
};
//# sourceMappingURL=testRedis.js.map