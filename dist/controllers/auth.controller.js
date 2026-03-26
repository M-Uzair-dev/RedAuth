import handleError from "../utils/handleError.js";
import authSchema from "../schemas/auth.schema.js";
import authService from "../services/auth.service.js";
const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
};
const accessCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 60 * 1000,
    path: "/",
};
const setCookies = (res, tokens) => {
    res.cookie("refresh_token", tokens.refreshToken, refreshCookieOptions);
    res.cookie("access_token", tokens.accessToken, accessCookieOptions);
};
const login = async (req, res) => {
    try {
        const { email, password, device } = authSchema.loginSchema.parse(req.body);
        const response = await authService.Login(email, password, device, req);
        setCookies(res, response.tokens);
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: response.user,
            },
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const signup = async (req, res) => {
    try {
        const { name, email, password, device } = authSchema.signupSchema.parse(req.body);
        const response = await authService.Signup(name, email, password, device, req);
        setCookies(res, response.tokens);
        res.status(201).json({
            success: true,
            message: "Signup successful",
            data: {
                user: response.user,
            },
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const forgotPasswprd = async (req, res) => {
    try {
        const { email, device } = authSchema.forgotPasswordSchema.parse(req.body);
        await authService.forgotPassword(email, device);
        res.status(200).json({
            success: true,
            message: "Password reset email sent!",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = authSchema.resetPasswordSchema.parse(req.body);
        await authService.resetPassword(newPassword, token);
        res.status(200).json({
            success: true,
            message: "Password reset Successful, please login!",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const verifyEmail = async (req, res) => {
    try {
        const { token } = authSchema.verifyEmailSchema.parse(req.body);
        await authService.verifyEmail(token);
        res.status(200).json({
            success: true,
            message: "Email verification successful!",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const resendVerificationEmail = async (req, res) => {
    try {
        const { email, device } = authSchema.resendVerificationTokenSchema.parse(req.body);
        await authService.resendVerificationToken(email, device);
        res.status(200).json({
            success: true,
            message: "Verification email sent successfully!",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
export default {
    login,
    forgotPasswprd,
    resetPassword,
    signup,
    verifyEmail,
    resendVerificationEmail,
};
//# sourceMappingURL=auth.controller.js.map