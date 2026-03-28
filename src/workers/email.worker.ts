import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import { type EmailData } from "../queues/email.queue.js";
import prisma from "../lib/prisma.js";

const emailWorker = new Worker<EmailData>(
  "email-queue",
  async (job) => {
    const { to, subject, html } = job.data;

    console.log("Processing email job:", job.data.to);

    // this functionality is working and tested, i am commenting
    // this for testing purposes because of so many emails being sent
    // to testing accounts

    // await emailService.sendEmail(to, subject, html);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

emailWorker.on("completed", (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on("failed", async (job, err) => {
  if (!job) return;

  const isFinalAttempt = job.attemptsMade === job.opts.attempts;

  if (isFinalAttempt) {
    console.error(`❌ FINAL failure for job ${job.id}`);

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
    console.warn(`⚠️ Attempt ${job.attemptsMade} failed for job ${job.id}`);
  }
});
