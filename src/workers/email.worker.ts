import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import { type EmailData } from "../queues/email.queue.js";
import prisma from "../lib/prisma.js";
import emailService from "../services/email.service.js";
import { logger } from "../lib/logger.js";

export const emailWorker = new Worker<EmailData>(
  "email-queue",
  async (job) => {
    const { to, subject, html } = job.data;

    await emailService.sendEmail(to, subject, html);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

emailWorker.on("completed", (job) => {
  logger.info({ email: job.data.to }, `Email job ${job.id} completed`);
});

emailWorker.on("failed", async (job, err) => {
  if (!job) return;

  const isFinalAttempt = job.attemptsMade === job.opts.attempts;

  if (isFinalAttempt) {
    logger.error(
      { jobId: job.id, err, attemptsMade: job.attemptsMade },
      "Email job permanently failed — deleting associated token",
    );

    const data = job.data;

    if (data.tokenId) {
      await prisma.token.delete({
        where: {
          id: data.tokenId,
        },
      });
    }
    // nice
  } else {
    logger.warn(
      {
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        error: err.message,
      },
      `Attempt ${job.attemptsMade} failed for job ${job.id}`,
    );
  }
});
