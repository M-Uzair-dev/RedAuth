import { z } from "zod";
const emailSchema = z
    .email("Invalid email address")
    .transform((val) => val.trim().toLowerCase());
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
const deviceSchema = z.uuid({
    message: "Please include a {device} property with a valid uuid in request, you can generate a random uuid and store it in localstorage, then send it with each request. it is used to allow multiple sessions per user.",
});
const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    device: deviceSchema,
});
const signupSchema = z.object({
    name: z
        .string({ message: "Name is required" })
        .transform((val) => val.trim()),
    email: emailSchema,
    password: passwordSchema,
    device: deviceSchema,
});
const forgotPasswordSchema = z.object({
    email: emailSchema,
    device: deviceSchema,
});
const resetPasswordSchema = z.object({
    token: z.string({ message: "Token is required" }),
    newPassword: passwordSchema,
});
const resendVerificationTokenSchema = z.object({
    email: emailSchema,
    device: deviceSchema,
});
const verifyEmailSchema = z.object({
    token: z.string({ message: "Token is required" }),
});
const logoutSchema = z.object({
    device: deviceSchema,
});
const newAccessTokenSchema = z.object({
    device: deviceSchema,
});
export default {
    loginSchema,
    signupSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    resendVerificationTokenSchema,
    verifyEmailSchema,
    logoutSchema,
    newAccessTokenSchema,
};
//# sourceMappingURL=auth.schema.js.map