import handleError from "../utils/handleError.js";
import authSchema from "../schemas/auth.schema.js";
import authService from "../services/auth.service.js";
import { appError, errorType } from "../errors/errors.js";
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
const clearCookies = (res) => {
    res.clearCookie("refresh_token");
    res.clearCookie("access_token");
};
const login = async (req, res) => {
    try {
        const { email, password, device } = authSchema.loginSchema.parse(req.body);
        const response = await authService.Login(email, password, device, req);
        setCookies(res, response.tokens);
        req.log.info({ userId: response.user.id }, "User logged in");
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
        req.log.info({ userId: response.user.id }, "User signed up");
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
const forgotPassword = async (req, res) => {
    try {
        const { email, device } = authSchema.forgotPasswordSchema.parse(req.body);
        await authService.forgotPassword(email, device);
        req.log.info({ email }, "Password reset email sent");
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
        req.log.info({ token }, "Password reset successful");
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
        req.log.info({ token }, "Email verification successful");
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
        req.log.info({ email }, "Verification email resent");
        res.status(200).json({
            success: true,
            message: "Verification email sent successfully!",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const logout = async (req, res) => {
    try {
        await authService.logout(req);
        clearCookies(res);
        req.log.info({ userId: req.userId }, "User logged out");
        res.status(200).json({
            success: true,
            message: "Logout successful!",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const logoutAll = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId)
            throw new appError(400, "User not found!", errorType.USER_NOT_FOUND);
        await authService.logoutAll(userId);
        clearCookies(res);
        req.log.info({ userId }, "User logged out from all devices");
        res.status(200).json({
            success: true,
            message: "Logout successful!",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const getNewAccessToken = async (req, res) => {
    try {
        const { device } = authSchema.newAccessTokenSchema.parse(req.body);
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken)
            throw new appError(401, "Refresh token invalid, please login again.", errorType.REFRESH_TOKEN_EXPIRED);
        const newTokens = await authService.getNewAccessToken(refreshToken, device);
        setCookies(res, newTokens);
        req.log.info({ userId: req.userId }, "New access token generated");
        res.status(200).json({
            success: true,
            message: "Access token generated successfully",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const changePassword = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId)
            throw new appError(400, "Please login", errorType.BAD_REQUEST);
        const { newPassword, confirmPassword } = authSchema.changePasswordSchema.parse(req.body);
        if (newPassword !== confirmPassword)
            throw new appError(400, "Passwords do not match", errorType.BAD_REQUEST);
        await authService.changePassword(userId, newPassword);
        clearCookies(res);
        req.log.info({ userId }, "Password changed, user logged out");
        res.status(200).json({
            success: true,
            message: "Password changed successfully, please login again!",
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
export default {
    login,
    forgotPassword,
    resetPassword,
    signup,
    verifyEmail,
    resendVerificationEmail,
    logout,
    logoutAll,
    getNewAccessToken,
    changePassword,
};
//# sourceMappingURL=auth.controller.js.map