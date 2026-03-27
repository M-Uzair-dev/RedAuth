// queues/email.queue.ts
import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";
export const emailQueue = new Queue("email-queue", {
    connection: redisConnection,
});
//# sourceMappingURL=email.queue.js.map