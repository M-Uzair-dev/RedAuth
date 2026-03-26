import type { NextFunction, Request, Response } from "express";
interface AuthCookies {
    accessToken: string | undefined;
    refreshToken: string | undefined;
}
export declare const getCookies: (req: Request) => AuthCookies;
export declare const verifyUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=verifyUser.d.ts.map