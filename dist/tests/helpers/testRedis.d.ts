import { Redis } from "ioredis";
declare const getRedis: () => Redis;
declare const flushRedis: () => Promise<void>;
export { flushRedis, getRedis };
//# sourceMappingURL=testRedis.d.ts.map