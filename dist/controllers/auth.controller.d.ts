import type { Request, Response } from "express";
declare const _default: {
    login: (req: Request, res: Response) => Promise<void>;
    forgotPasswprd: (req: Request, res: Response) => Promise<void>;
    resetPassword: (req: Request, res: Response) => Promise<void>;
    signup: (req: Request, res: Response) => Promise<void>;
    verifyEmail: (req: Request, res: Response) => Promise<void>;
    resendVerificationEmail: (req: Request, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=auth.controller.d.ts.map