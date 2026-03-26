import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import crypto from "crypto";
import { appError } from "../errors/errors.js";
import { errorType } from "../errors/errors.js";
import { v4 as uuid } from "uuid";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRY = parseInt(process.env.REFRESH_TOKEN_EXPIRY || "");
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = parseInt(process.env.ACCESS_TOKEN_EXPIRY || "");
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET;
const RESET_TOKEN_EXPIRY = parseInt(process.env.RESET_TOKEN_EXPIRY || "");
const VERIFICATION_TOKEN_SECRET = process.env.VERIFICATION_TOKEN_SECRET;
const VERIFICATION_TOKEN_EXPIRY = parseInt(process.env.VERIFICATION_TOKEN_EXPIRY || "");
if (!REFRESH_TOKEN_EXPIRY ||
    !REFRESH_TOKEN_SECRET ||
    !ACCESS_TOKEN_SECRET ||
    !ACCESS_TOKEN_EXPIRY ||
    !RESET_TOKEN_EXPIRY ||
    !RESET_TOKEN_SECRET ||
    !VERIFICATION_TOKEN_SECRET ||
    !VERIFICATION_TOKEN_EXPIRY) {
    console.log({
        REFRESH_TOKEN_EXPIRY,
        REFRESH_TOKEN_SECRET,
        ACCESS_TOKEN_SECRET,
        ACCESS_TOKEN_EXPIRY,
        RESET_TOKEN_EXPIRY,
        RESET_TOKEN_SECRET,
        VERIFICATION_TOKEN_SECRET,
        VERIFICATION_TOKEN_EXPIRY,
    });
    throw new Error("JWT Secret is required!");
}
const validateDevice = (device) => {
    // device must be provided, and not be empty
    if (!device || typeof device !== "string" || device.trim().length === 0) {
        throw new appError(400, "Device identifier is required", errorType.BAD_REQUEST);
    }
    // Prevent excessively long device strings
    if (device.length > 255) {
        throw new appError(400, "Device identifier is too long (max 255 characters)", errorType.BAD_REQUEST);
    }
};
const generateTokens = async (payload, device, deviceName = "unknown", db = prisma) => {
    // Validate device parameter before proceeding
    validateDevice(device);
    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY / 1000,
    });
    // accessToken is made. now here is the issue, we need to store the refresh token
    // in the DB but that DB record's id needs to be in the refresh token payload
    // So we basically need to put the record's id in the token and token in the record
    // so for that to be possible, we manually generate a uuid for the record and put it
    // inside of the refresh token payload, this way we can directly look up the record using
    // the uuid without having to do any hashing or comparisons in the DB query which is more
    // efficient and less error prone
    // generate a new uuid
    const refreshTokenId = uuid();
    // create data for the jwt refreshToken
    const refreshTokenPayload = {
        ...payload,
        tokenId: refreshTokenId,
    };
    // add it in the token payload
    const refreshToken = jwt.sign(refreshTokenPayload, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY / 1000,
    });
    // Hash the refresh token using SHA-256 for storage in DB
    const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");
    // Use upsert to handle the "one device, one token" logic atomically.
    // This uses the @@unique([userId, device, type]) constraint from your schema.
    await db.token.upsert({
        where: {
            userId_device_type: {
                userId: payload.id,
                device: device,
                type: "REFRESH_TOKEN",
            },
        },
        update: {
            // If a record exists for this device, we overwrite it with the new token data
            id: refreshTokenId,
            tokenHash,
            deviceName,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY),
        },
        create: {
            // If no record exists, create a brand new one
            id: refreshTokenId,
            type: "REFRESH_TOKEN",
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY),
            device: device,
            deviceName,
            userId: payload.id,
            tokenHash,
        },
    });
    return {
        refreshToken,
        accessToken,
    };
};
const verifyUser = async (accessToken, refreshToken) => {
    try {
        // at first, we check the access token
        const data = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
        // if access token was invalid, jwt would've thrown an error and sent us to the catch block
        // coming here means the access token is valid, so we send back the id
        return data.id;
    }
    catch (err) {
        try {
            // we are in the catch block, which means the access token is not valid
            // so now we need to throw an error, lets verify the refresh token to see if it's valid
            await getRefreshToken(refreshToken);
            // if getRefreshToken didn't threw an error, then it means the refresh token was valid. in that case, we throw an access token error
            throw new appError(401, "Access token expired. Use refresh token to continue.", errorType.ACCESS_TOKEN_EXPIRED);
        }
        catch (refreshErr) {
            // coming here means either it was a jwt error or our custom error
            // if it was our custom appError then throw it
            if (refreshErr instanceof appError)
                throw refreshErr;
            // if it was anything else then it was refreshToken validation error. in that case we send a refresh token error
            throw new appError(401, "Invalid session. Please login again.", errorType.REFRESH_TOKEN_EXPIRED);
        }
    }
};
const generateAccessToken = async (refreshToken, device) => {
    // Validate device parameter before proceeding
    validateDevice(device);
    // lets see if the given refresh token is valid JWT
    const record = await getRefreshToken(refreshToken, true);
    // this will either throw an error, or return a refreshToken record
    // coming here means we got the record, in that case we delete this record first
    await prisma.token.delete({
        where: {
            id: record.id,
        },
    });
    // lets get old token's payload (id and email)
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    // now that the previous record has been deleted, we generate new tokens
    const tokens = await generateTokens({
        id: payload.id,
        email: payload.email,
    }, device);
    return tokens;
};
const getRefreshToken = async (refreshToken, strict = false) => {
    try {
        // lets make sure the given token is valid
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        // coming here means that refresh token was valid, otherwise jwt would've sent us in catch block
        // now that jwt refresh token is valid, lets see if it exists in our DB and if its expired
        // finding the token using token id inside the refresh token payload, this way we can directly look it up without having to hash and compare
        const validTokenRecord = await prisma.token.findUnique({
            where: {
                id: decoded.tokenId,
            },
        });
        // Lets see if no token was found in the db
        if (!validTokenRecord) {
            // coming here means that even though token was valid, it was not found in the DB
            if (strict) {
                // If this is a strict check, and we are given a deleted refresh token
                // that is a big problem and means data was breached, in that case, we revoke all user sessions
                await prisma.token.deleteMany({
                    where: {
                        userId: decoded.id,
                    },
                });
            }
            throw new appError(401, "Session revoked or expired. Please login again.", errorType.REFRESH_TOKEN_EXPIRED);
        }
        // if the token is expired or of the wrong type we enter this condition
        if (validTokenRecord.expiresAt < new Date() ||
            validTokenRecord.type !== "REFRESH_TOKEN") {
            // if any of the above condition is true, we enter here and delete the token
            await prisma.token.delete({ where: { id: validTokenRecord.id } });
            // throw a refresh token error
            throw new appError(401, "Session revoked or expired. Please login again.", errorType.REFRESH_TOKEN_EXPIRED);
        }
        // so the token exists, and is not expired.
        // lets see if it contains the correct hashed token
        // Hash the incoming token and compare with stored hash
        const incomingTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");
        const isTokenValid = incomingTokenHash === validTokenRecord.tokenHash;
        // if it doesnt contain the correct hashed jwt token, it's invalid token
        if (!isTokenValid)
            throw new appError(401, "Session revoked or expired. Please login again.", errorType.REFRESH_TOKEN_EXPIRED);
        // coming here means we have found a valid refresh token, so we return true
        return validTokenRecord;
    }
    catch (e) {
        if (e instanceof appError)
            throw e;
        throw new appError(401, "Session revoked or expired. Please login again.", errorType.REFRESH_TOKEN_EXPIRED);
    }
};
const logout = async (refreshToken) => {
    try {
        // first lets find the token in DB
        const record = await getRefreshToken(refreshToken);
        // this will either throw an error, or return a refreshToken record
        // coming here means we got the record, in that case we delete this record
        await prisma.token.delete({
            where: {
                id: record.id,
            },
        });
    }
    catch (error) {
        // If the token is invalid or already deleted (appError), we consider logout successful
        // This is idempotent behavior - logging out an already logged out session is OK
        if (error instanceof appError) {
            // Expected error - token was already invalid/deleted, no action needed
            return;
        }
        // Unexpected error (e.g., DB connection failure) - log it for debugging
        console.error("Unexpected error during logout:", error);
        // Re-throw unexpected errors so they can be handled by the caller
        throw new appError(500, "An error occurred during logout");
    }
};
const logoutAll = async (userId) => {
    try {
        const result = await prisma.token.deleteMany({
            where: {
                userId,
                type: "REFRESH_TOKEN",
            },
        });
        return result.count;
    }
    catch (e) {
        throw new appError(500, "Something went wrong!");
    }
};
const generateForgotPasswordToken = async (userId, device, db = prisma) => {
    const tokenId = uuid();
    // 1. Generate the token
    const token = jwt.sign({ id: userId, tokenId }, RESET_TOKEN_SECRET, {
        expiresIn: RESET_TOKEN_EXPIRY / 1000,
    });
    // 2. Hash the token before storing
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    // 3. Delete old ones and Store the new record
    await prisma.$transaction(async (tx) => {
        await tx.token.deleteMany({
            where: {
                userId,
                type: "PASSWORD_RESET",
            },
        });
        await tx.token.create({
            data: {
                id: tokenId,
                type: "PASSWORD_RESET",
                tokenHash,
                userId,
                device,
                expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY),
            },
        });
    });
    return token;
};
const generateVerificationToken = async (userId, device, db = prisma) => {
    const tokenId = uuid();
    // 1. Generate the token
    const token = jwt.sign({ id: userId, tokenId }, VERIFICATION_TOKEN_SECRET, {
        expiresIn: VERIFICATION_TOKEN_EXPIRY / 1000,
    });
    // 2. Hash the token before storing
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    // 3. Delete old ones and Store the new record
    await prisma.$transaction(async (tx) => {
        await tx.token.deleteMany({
            where: {
                userId,
                type: "EMAIL_VERIFICATION",
            },
        });
        await tx.token.create({
            data: {
                id: tokenId,
                type: "EMAIL_VERIFICATION",
                tokenHash,
                userId,
                device,
                expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY),
            },
        });
    });
    return token;
};
export default {
    generateTokens,
    generateAccessToken,
    verifyUser,
    logout,
    logoutAll,
    generateForgotPasswordToken,
    generateVerificationToken,
};
//# sourceMappingURL=token.service.js.map