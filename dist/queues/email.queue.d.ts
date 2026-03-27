import { Queue } from "bullmq";
export type EmailData = {
    to: string;
    subject: string;
    html: string;
    tokenId: string;
};
export declare const emailQueue: Queue<EmailData, any, string, EmailData, any, string>;
//# sourceMappingURL=email.queue.d.ts.map