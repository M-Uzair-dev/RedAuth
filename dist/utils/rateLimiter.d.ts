import type { NextFunction, Request, Response } from "express";
type config = {
    windowSeconds: number;
    maxRequests: number;
};
export declare const generalLimiter: (data: config) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map