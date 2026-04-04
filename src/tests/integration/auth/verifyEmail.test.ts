import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import { generateUserData } from "@/tests/helpers/factories.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import prisma from "@/tests/helpers/testPrisma.js";
import {
  waitForEmail,
  getEmailBody,
  clearEmails,
} from "@/tests/helpers/testMailpit.js";

let app: Express;
beforeAll(async () => {
  const { default: createServer } = await import("@/utils/createServer.js");
  app = createServer();
});

beforeEach(async () => {
  await clearEmails();
});

const getVerificationToken = async (email: string): Promise<string> => {
  const emailMessage = await waitForEmail(email, "Verify Your Email Address");
  const html = await getEmailBody(emailMessage.ID);
  const match = html.match(/\/verify-email\/([a-zA-Z0-9._-]+)/);
  if (!match) throw new Error("Verification token not found in email");
  return match[1];
};

describe("POST /auth/verifyEmail", () => {
  it("should return 400 for an invalid token", async () => {
    const res = await request(app)
      .post("/auth/verifyEmail")
      .send({ token: "this-is-not-a-valid-jwt" });

    expect(res.status).toBe(400);
  });

  it("should return 400 for an expired token", async () => {
    const data = generateUserData();
    await request(app).post("/auth/signup").send(data);

    const token = await getVerificationToken(data.email);
    const decoded = jwt.verify(
      token,
      process.env.VERIFICATION_TOKEN_SECRET!,
    ) as { tokenId: string };

    await prisma.token.update({
      where: { id: decoded.tokenId },
      data: { expiresAt: new Date() },
    });

    const res = await request(app)
      .post("/auth/verifyEmail")
      .send({ token });

    expect(res.status).toBe(400);
  });

  it("should return 400 when token field is missing", async () => {
    const res = await request(app).post("/auth/verifyEmail").send({});
    expect(res.status).toBe(400);
  });

  it("should return 400 when the token is used a second time", async () => {
    const data = generateUserData();
    await request(app).post("/auth/signup").send(data);

    const token = await getVerificationToken(data.email);

    // first use — succeeds, token is deleted from DB
    const firstRes = await request(app)
      .post("/auth/verifyEmail")
      .send({ token });
    expect(firstRes.status).toBe(200);

    // second use — token no longer in DB
    const secondRes = await request(app)
      .post("/auth/verifyEmail")
      .send({ token });
    expect(secondRes.status).toBe(400);
  });
});
