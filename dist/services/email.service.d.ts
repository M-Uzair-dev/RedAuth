import type { LoginMeta } from "../utils/getRequestInfo.js";
import { type EmailData } from "../queues/email.queue.js";
export declare const addEmailJob: (data: EmailData) => Promise<void>;
export declare const sendEmail: (to: string, subject: string, html: string) => Promise<void>;
declare const _default: {
    sendVerificationEmail: (to: string, url: string, tokenId: string) => Promise<void>;
    sendLoginAlertEmail: (to: string, secureAccountUrl: string, loginMeta: LoginMeta) => Promise<void>;
    sendResetPasswordEmail: (to: string, url: string, tokenId: string) => Promise<void>;
    sendEmail: (to: string, subject: string, html: string) => Promise<void>;
};
export default _default;
//# sourceMappingURL=email.service.d.ts.map