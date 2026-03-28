import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { appError, errorType } from "../errors/errors.js";
import { truncate } from "fs";
import { redis } from "../lib/redis.js";
const getUser = async (id, throwErrorIfNotFound = false) => {
    const user = await prisma.user.findUnique({
        where: {
            id,
        },
    });
    if (!user) {
        if (!throwErrorIfNotFound)
            return user;
        throw new appError(404, "User not found!");
    }
    const { password, ...rest } = user;
    return rest;
};
const editUser = async (id, fields, throwErrorIfNotFound = false) => {
    try {
        const user = await prisma.user.update({
            where: {
                id,
            },
            data: fields,
        });
        const { password, ...rest } = user;
        return rest;
    }
    catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025") {
            if (throwErrorIfNotFound)
                throw new appError(404, "User not found!", errorType.USER_NOT_FOUND);
            return null;
        }
        throw e;
    }
};
const deleteUser = async (userId) => {
    try {
        await prisma.user.delete({
            where: { id: userId },
        });
        return true;
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            return false;
        }
        throw error;
    }
};
const getUserSessions = async (userId) => {
    const userTokens = await prisma.token.findMany({
        where: {
            userId,
            type: "REFRESH_TOKEN",
        },
        select: {
            id: true,
            deviceName: true,
            lastActive: true,
        },
    });
    return userTokens;
};
const revoke_session = async (userId, tokenId) => {
    const token = await prisma.token.findUnique({
        where: {
            id: tokenId,
        },
    });
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
    if (!token)
        throw new appError(400, "Token not found.");
    if (!user)
        throw new appError(400, "Invalid session, please login again!");
    if (user.id !== token.userId)
        throw new appError(401, "Unable to revoke token.");
    await prisma.$transaction(async (tx) => {
        await tx.token.update({
            where: {
                id: token.id,
            },
            data: {
                expiresAt: new Date(),
            },
        });
        await redis.set(`revoked-${token.id}`, "true", "EX", 60 * 30);
    });
};
export default {
    getUser,
    editUser,
    deleteUser,
    getUserSessions,
    revoke_session,
};
//# sourceMappingURL=user.service.js.map