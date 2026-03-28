import { z } from "zod";
declare const _default: {
    loginSchema: z.ZodObject<{
        email: z.ZodPipe<z.ZodEmail, z.ZodTransform<string, string>>;
        password: z.ZodString;
        device: z.ZodUUID;
    }, z.core.$strip>;
    signupSchema: z.ZodObject<{
        name: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        email: z.ZodPipe<z.ZodEmail, z.ZodTransform<string, string>>;
        password: z.ZodString;
        device: z.ZodUUID;
    }, z.core.$strip>;
    forgotPasswordSchema: z.ZodObject<{
        email: z.ZodPipe<z.ZodEmail, z.ZodTransform<string, string>>;
        device: z.ZodUUID;
    }, z.core.$strip>;
    resetPasswordSchema: z.ZodObject<{
        token: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>;
    resendVerificationTokenSchema: z.ZodObject<{
        email: z.ZodPipe<z.ZodEmail, z.ZodTransform<string, string>>;
        device: z.ZodUUID;
    }, z.core.$strip>;
    verifyEmailSchema: z.ZodObject<{
        token: z.ZodString;
    }, z.core.$strip>;
    logoutSchema: z.ZodObject<{
        device: z.ZodUUID;
    }, z.core.$strip>;
    newAccessTokenSchema: z.ZodObject<{
        device: z.ZodUUID;
    }, z.core.$strip>;
};
export default _default;
//# sourceMappingURL=auth.schema.d.ts.map