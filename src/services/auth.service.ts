import type { User } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { appError } from "../errors/errors.js";
import tokenService from "./token.service.js";
import emailService from "./email.service.js";
import bcrypt from "bcrypt";
import { getLoginMeta, getDevice } from "../utils/getRequestInfo.js";
import type { Request } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const frontend = process.env.FRONTEND_URL;
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET;
const VERIFICATION_TOKEN_SECRET = process.env.VERIFICATION_TOKEN_SECRET;

if (!frontend || !RESET_TOKEN_SECRET || !VERIFICATION_TOKEN_SECRET)
  throw new Error("Some env vars were not found in env");

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

type tokenPayloadType = { id: string; tokenId: string };

const Signup = async (
  name: string,
  email: string,
  userPassword: string,
  device: string,
  req: Request,
): Promise<{
  user: Omit<User, "password">;
  tokens: Tokens;
}> => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (existingUser)
    throw new appError(400, "A user with this email already exists.");
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
    const tokens = await tokenService.generateTokens(
      {
        id: newUser.id,
        email,
      },
      device,
      deviceName,
      tx,
    );

    return { user: newUser, tokens };
  });

  // generate and send token via email
  // TODO: Create a worker queue that will handle these requests rather than slowing down requests
  // failure of this email is not an issue, user can request a new one
  const { token, tokenId } = await tokenService.generateVerificationToken(
    response.user.id,
    device,
  );
  try {
    await emailService.sendVerificationEmail(
      response.user.email,
      `${frontend}/verifyEmail?t=${token}`,
      tokenId,
    );
  } catch (e) {
    await prisma.token.delete({
      where: {
        id: tokenId,
      },
    });
  }
  const { password, ...rest } = response.user;
  return { user: rest, tokens: response.tokens };
};

const Login = async (
  email: string,
  userPassword: string,
  device: string,
  req: Request,
): Promise<{
  user: Omit<User, "password">;
  tokens: Tokens;
}> => {
  const user = await prisma.user.findUnique({ where: { email } });

  const dummyHash =
    "$2a$12$R9h/cIPz0gi.URQHeNHGaOTmMiYeL7WrgfU8tBvGvN/7oW6Lp2T3.";

  const isMatch = await bcrypt.compare(
    userPassword,
    user?.password || dummyHash,
  );
  if (!user || !isMatch) throw new appError(404, "Invalid Credentials");
  const loginData = await getLoginMeta(req);
  const tokens = await tokenService.generateTokens(
    {
      id: user.id,
      email,
    },
    device,
    loginData.device,
  );

  try {
    await emailService.sendLoginAlertEmail(
      user.email,
      `${frontend}/secure-account`,
      loginData,
    );
  } catch (error) {
    console.error("Failed to send login alert:", error);
  }

  const { password, ...rest } = user;
  return {
    user: rest,
    tokens,
  };
};

const forgotPassword = async (
  email: string,
  device: string,
): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    // User exists - generate token and send real email
    const { token, tokenId } = await tokenService.generateForgotPasswordToken(
      user.id,
      device,
    );
    try {
      await emailService.sendResetPasswordEmail(
        user.email,
        `${frontend}/resetPassword?t=${token}`,
        tokenId,
      );
    } catch (error) {
      await prisma.token.delete({
        where: {
          id: tokenId,
        },
      });
    }
  } else {
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

const resetPassword = async (
  newPassword: string,
  token: string,
): Promise<boolean> => {
  // decode the token provided
  let decoded: tokenPayloadType;
  try {
    decoded = jwt.verify(token, RESET_TOKEN_SECRET) as tokenPayloadType;
  } catch (e) {
    throw new appError(400, "Invalid Reset Token");
  }

  // after decoding, get the token from db
  const existingToken = await prisma.token.findUnique({
    where: {
      id: decoded.tokenId,
    },
  });

  // if token is not in db, throw error
  if (!existingToken) throw new appError(400, "Invalid Reset Token");

  let userId = existingToken.userId;

  // now lets make sure the token contains propoer hash, is not expired
  const isMatch =
    crypto.createHash("sha256").update(token).digest("hex") ===
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

const verifyEmail = async (token: string): Promise<boolean> => {
  let decoded: tokenPayloadType;
  try {
    decoded = jwt.verify(token, VERIFICATION_TOKEN_SECRET) as tokenPayloadType;
  } catch (e) {
    throw new appError(400, "Invalid Verification Token");
  }
  const tokenRecord = await prisma.token.findUnique({
    where: {
      id: decoded.tokenId,
    },
  });

  if (!tokenRecord) throw new appError(400, "Invalid Verification Token");
  const isMatch =
    crypto.createHash("sha256").update(token).digest("hex") ===
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

const resendVerificationToken = async (email: string, device: string) => {
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
      throw new appError(
        429,
        `Please wait ${minutesLeft} minutes before requesting another email.`,
      );
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
    await emailService.sendVerificationEmail(
      user.email,
      `${frontend}/verifyEmail?t=${token}`,
      tokenId,
    );
  } catch (error) {
    console.error("Email failed to send:", error);

    await prisma.token.deleteMany({
      where: { userId: user.id, type: "EMAIL_VERIFICATION" },
    });

    throw new appError(
      500,
      "We couldn't send the email. Please try again in a moment.",
    );
  }

  return true;
};

export default {
  Signup,
  Login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationToken,
};
