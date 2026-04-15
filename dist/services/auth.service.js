import prisma from "../lib/prisma.js";
import { appError, errorType } from "../errors/errors.js";
import tokenService from "./token.service.js";
import emailService from "./email.service.js";
import bcrypt from "bcrypt";
import { getLoginMeta, getDevice } from "../utils/getRequestInfo.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
const frontend = process.env.FRONTEND_URL;
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const VERIFICATION_TOKEN_SECRET = process.env.VERIFICATION_TOKEN_SECRET;
if (!frontend ||
    !RESET_TOKEN_SECRET ||
    !VERIFICATION_TOKEN_SECRET ||
    !REFRESH_TOKEN_SECRET)
    throw new Error("Some env vars were not found in env");
const Signup = async (name, email, userPassword, device, req) => {
    email = email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (existingUser) {
        throw new appError(409, "A user with this email already exists.", errorType.BAD_REQUEST);
    }
    const hashedPassword = await bcrypt.hash(userPassword, 12);
    let response = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });
        const deviceName = getDevice(req);
        const tokens = await tokenService.generateTokens({
            id: newUser.id,
            email,
        }, device, deviceName, tx);
        return { user: newUser, tokens };
    });
    // generate and send token via email for email verification
    const { token, tokenId } = await tokenService.generateVerificationToken(response.user.id, device);
    try {
        await emailService.sendVerificationEmail(response.user.email, `${frontend}/verify-email/${token}`, tokenId);
    }
    catch (e) {
        await prisma.token.delete({
            where: {
                id: tokenId,
            },
        });
    }
    const { password, ...rest } = response.user;
    return { user: rest, tokens: response.tokens };
};
const Login = async (email, userPassword, device, req) => {
    const user = await prisma.user.findUnique({ where: { email } });
    const dummyHash = "$2a$12$R9h/cIPz0gi.URQHeNHGaOTmMiYeL7WrgfU8tBvGvN/7oW6Lp2T3.";
    const isMatch = await bcrypt.compare(userPassword, user?.password || dummyHash);
    if (!user || !isMatch)
        throw new appError(401, "Invalid Credentials");
    const loginData = await getLoginMeta(req);
    const tokens = await tokenService.generateTokens({
        id: user.id,
        email,
    }, device, loginData.device);
    try {
        await emailService.sendLoginAlertEmail(user.email, `${frontend}/secure-account`, loginData);
    }
    catch (error) {
        logger.error({ err: error }, "Failed to send login alert email");
    }
    const { password, ...rest } = user;
    return {
        user: rest,
        tokens,
    };
};
const forgotPassword = async (email, device) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (user) {
        // create a lock in redis
        // this will solve the "double click" problem where a user accidentally double clicks and sends two requests at the same time
        // this will create a "lock" in redis that will last 60 seconds
        // if we didnt acquire a lock, it means a lock already exists, in that case, we do not send another email
        const lock = await redis.set(`reset:${user.id}`, "1", "EX", 60, // 1 minute
        "NX");
        if (!lock)
            return true;
        // User exists - generate token and send email
        const { token, tokenId } = await tokenService.generateForgotPasswordToken(user.id, device);
        try {
            await emailService.sendResetPasswordEmail(user.email, `${frontend}/reset-password/${token}`, tokenId);
        }
        catch (error) {
            await prisma.token.delete({
                where: {
                    id: tokenId,
                },
            });
        }
    }
    else {
        // User doesn't exist - simulate the same operations to take similar time
        // Generate a dummy token (not stored)
        const dummyToken = jwt.sign({ dummy: true }, "DummySecret", {
            expiresIn: 3600,
        });
        crypto.createHash("sha256").update(dummyToken).digest("hex");
        // Maybe add a small delay to match DB operations
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    // Always return success with the same message
    return true;
};
const resetPassword = async (newPassword, token) => {
    // decode the token provided
    let decoded;
    try {
        decoded = jwt.verify(token, RESET_TOKEN_SECRET);
    }
    catch (e) {
        throw new appError(400, "Invalid Reset Token");
    }
    // after decoding, get the token from db
    const existingToken = await prisma.token.findUnique({
        where: {
            id: decoded.tokenId,
        },
    });
    // if token is not in db, throw error
    if (!existingToken)
        throw new appError(400, "Invalid Reset Token");
    let userId = existingToken.userId;
    // now lets make sure the token contains propoer hash, is not expired
    const isMatch = crypto.createHash("sha256").update(token).digest("hex") ===
        existingToken.tokenHash;
    if (!isMatch || existingToken.expiresAt < new Date())
        throw new appError(400, "Invalid Reset Token");
    // now lets update the passsword
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction(async (tx) => {
        // in a prisma transaction, we update user password and delete the tokens
        await tx.user.update({
            where: {
                id: userId,
            },
            data: {
                password: hashedPassword,
            },
        });
        // now we delete the current reset token and all user sessions
        await tx.token.deleteMany({
            where: {
                userId: existingToken.userId,
                OR: [{ id: existingToken.id }, { type: "REFRESH_TOKEN" }],
            },
        });
    });
    return true;
};
const verifyEmail = async (token) => {
    let decoded;
    try {
        decoded = jwt.verify(token, VERIFICATION_TOKEN_SECRET);
    }
    catch (e) {
        throw new appError(400, "Invalid Verification Token");
    }
    const tokenRecord = await prisma.token.findUnique({
        where: {
            id: decoded.tokenId,
        },
    });
    if (!tokenRecord)
        throw new appError(400, "Invalid Verification Token");
    const isMatch = crypto.createHash("sha256").update(token).digest("hex") ===
        tokenRecord.tokenHash;
    if (!isMatch || tokenRecord.expiresAt < new Date())
        throw new appError(400, "Invalid Verification Token");
    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: {
                id: tokenRecord.userId,
            },
            data: {
                emailVerified: true,
            },
        });
        await tx.token.delete({
            where: {
                id: tokenRecord.id,
            },
        });
    });
    return true;
};
const resendVerificationToken = async (email, device) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            tokens: {
                where: { type: "EMAIL_VERIFICATION" },
                orderBy: { createdAt: "desc" },
                take: 1,
            },
        },
    });
    if (!user) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return true;
    }
    if (user.emailVerified) {
        return true;
    }
    const lastToken = user.tokens[0];
    const COOLDOWN_MS = 60000 * 5; // 5 minutes
    if (lastToken) {
        const timeElapsed = Date.now() - lastToken.createdAt.getTime();
        if (timeElapsed < COOLDOWN_MS) {
            const minutesLeft = Math.ceil((COOLDOWN_MS - timeElapsed) / (1000 * 60));
            throw new appError(429, `Please wait ${minutesLeft} minutes before requesting another email.`);
        }
    }
    const { token, tokenId } = await prisma.$transaction(async (tx) => {
        await tx.token.deleteMany({
            where: {
                userId: user.id,
                type: "EMAIL_VERIFICATION",
            },
        });
        return await tokenService.generateVerificationToken(user.id, device, tx);
    });
    try {
        await emailService.sendVerificationEmail(user.email, `${frontend}/verify-email/${token}`, tokenId);
    }
    catch (error) {
        logger.error({ err: error }, "Verification email failed to send");
        await prisma.token.deleteMany({
            where: { userId: user.id, type: "EMAIL_VERIFICATION" },
        });
        throw new appError(500, "We couldn't send the email. Please try again in a moment.");
    }
    return true;
};
const logout = async (req) => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken)
            return;
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const tokenId = decoded.tokenId;
        await prisma.token.delete({
            where: {
                id: tokenId,
            },
        });
        await redis.set(`revoked-${tokenId}`, "true", "EX", 60 * 30);
    }
    catch (e) {
        return;
    }
};
const logoutAll = async (userId) => {
    const sessions = await prisma.token.findMany({
        where: {
            userId,
            type: "REFRESH_TOKEN",
        },
    });
    await prisma.token.updateMany({
        where: {
            userId,
            type: "REFRESH_TOKEN",
        },
        data: {
            expiresAt: new Date(),
        },
    });
    await Promise.all(sessions.map(async (session) => {
        await redis.set(`revoked-${session.id}`, "true", "EX", 60 * 30);
    }));
};
const getNewAccessToken = async (refreshToken, device) => {
    const newTokens = await tokenService.generateAccessToken(refreshToken, device);
    return newTokens;
};
const changePassword = async (userId, newPassword) => {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            password: hashedPassword,
        },
    });
    const userSessions = await prisma.$transaction(async (tx) => {
        // 1. Update the records
        await tx.token.updateMany({
            where: { userId, type: "REFRESH_TOKEN" },
            data: { expiresAt: new Date() },
        });
        // 2. Fetch the records you just updated
        const sessions = await tx.token.findMany({
            where: { userId, type: "REFRESH_TOKEN" },
            select: { id: true }, // Or whatever fields you need
        });
        return sessions;
    });
    if (!userSessions)
        return;
    await Promise.all(userSessions.map(async (session) => {
        await redis.set(`revoked-${session.id}`, "true", "EX", 60 * 30);
    }));
};
export default {
    Signup,
    Login,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationToken,
    logout,
    logoutAll,
    getNewAccessToken,
    changePassword,
};
//# sourceMappingURL=auth.service.js.map