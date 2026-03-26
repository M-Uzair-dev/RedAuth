import type { Request } from "express";
export type LoginMeta = {
    ip: string;
    location: string;
    browser: string;
    device: string;
    time: string;
};
export declare const getLoginMeta: (req: Request) => Promise<LoginMeta>;
export declare const getDevice: (req: Request) => string;
//# sourceMappingURL=getRequestInfo.d.ts.map