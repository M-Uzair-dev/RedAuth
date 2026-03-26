import type { PrismaClient, Prisma } from "@prisma/client";
type payloadType = {
    id: string;
    email: string;
};
type DBClient = PrismaClient | Prisma.TransactionClient;
declare const _default: {
    generateTokens: (payload: payloadType, device: string, deviceName?: string, db?: DBClient) => Promise<{
        refreshToken: string;
        accessToken: string;
    }>;
    generateAccessToken: (refreshToken: string, device: string) => Promise<{
        refreshToken: string;
        accessToken: string;
    }>;
    verifyUser: (accessToken: string, refreshToken: string | null) => Promise<string>;
    logout: (refreshToken: string) => Promise<void>;
    logoutAll: (userId: string) => Promise<number>;
    generateForgotPasswordToken: (userId: string, device: string, db?: DBClient) => Promise<string>;
    generateVerificationToken: (userId: string, device: string, db?: DBClient) => Promise<string>;
};
export default _default;
//# sourceMappingURL=token.service.d.ts.map