import type { Request, Response } from "express";
declare const _default: {
    getCurrentUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    deleteCurrentUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    updateCurrentUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    revokeSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getUserSessions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
};
export default _default;
//# sourceMappingURL=user.controller.d.ts.map