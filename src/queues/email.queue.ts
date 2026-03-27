// queues/email.queue.ts
import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";

export type EmailData = {
  to: string;
  subject: string;
  html: string;
  tokenId: string;
};

export const emailQueue = new Queue<EmailData>("email-queue", {
  connection: redisConnection,
});
