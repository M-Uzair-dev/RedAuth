import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";

export const tokenCleanupQueue = new Queue("tokenCleanupQueue", {
  connection: redisConnection,
});
