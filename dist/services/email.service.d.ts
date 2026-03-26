import type { LoginMeta } from "../utils/getRequestInfo.js";
export declare const sendEmail: (to: string, subject: string, html: string) => Promise<void>;
declare const _default: {
    sendVerificationEmail: (to: string, url: string) => Promise<void>;
    sendLoginAlertEmail: (to: string, secureAccountUrl: string, loginMeta: LoginMeta) => Promise<void>;
    sendResetPasswordEmail: (to: string, url: string) => Promise<void>;
};
export default _default;
//# sourceMappingURL=email.service.d.ts.map