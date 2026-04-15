import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import prisma from "../lib/prisma.js";
import { tokenCleanupQueue } from "../queues/tokenCleanup.queue.js";
import { logger } from "../lib/logger.js";
const cleanupWorker = new Worker("tokenCleanupQueue", async () => {
    logger.debug("Token cleanup job started");
    await prisma.token.deleteMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
        },
    });
}, {
    connection: redisConnection,
});
cleanupWorker.on("completed", () => {
    logger.info("Expired tokens cleaned up");
});
await tokenCleanupQueue.upsertJobScheduler("token-cleanup", { pattern: "*/10 * * * *" }, { name: "Cleanup-job", data: {} });
//# sourceMappingURL=tokenCleanup.worker.js.map