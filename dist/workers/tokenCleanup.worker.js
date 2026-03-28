import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import prisma from "../lib/prisma.js";
import { tokenCleanupQueue } from "../queues/tokenCleanup.queue.js";
const cleanupWorker = new Worker("tokenCleanupQueue", async (job) => {
    console.log("Cleaning expired tokens...");
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
    console.log("Cleaned tokens!");
});
tokenCleanupQueue.add("Cleanup-job", {}, {
    repeat: {
        every: 10000, // 10 minutes
    },
});
//# sourceMappingURL=tokenCleanup.worker.js.map