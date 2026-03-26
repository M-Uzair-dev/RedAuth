import type { User } from "@prisma/client";
import type { Request } from "express";
type Tokens = {
    accessToken: string;
    refreshToken: string;
};
declare const _default: {
    Signup: (name: string, email: string, userPassword: string, device: string, req: Request) => Promise<{
        user: Omit<User, "password">;
        tokens: Tokens;
    }>;
    Login: (email: string, userPassword: string, device: string, req: Request) => Promise<{
        user: Omit<User, "password">;
        tokens: Tokens;
    }>;
    forgotPassword: (email: string, device: string) => Promise<boolean>;
    resetPassword: (newPassword: string, token: string) => Promise<boolean>;
    verifyEmail: (token: string) => Promise<boolean>;
    resendVerificationToken: (email: string, device: string) => Promise<boolean>;
};
export default _default;
//# sourceMappingURL=auth.service.d.ts.map