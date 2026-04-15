import type { NextFunction, Request, Response } from "express";
import type { Redis } from "ioredis";
type config = {
    windowSeconds: number;
    maxRequests: number;
};
export declare const generalLimiter: (data: config) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const checkValidity: (ip: string, windowSeconds: number, maxRequests: number, r: Redis) => Promise<void>;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map