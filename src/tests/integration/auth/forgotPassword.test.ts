import {
  generateLoginData,
  generateUserData,
} from "@/tests/helpers/factories.js";
import {
  waitForEmail,
  getEmailBody,
  clearEmails,
} from "@/tests/helpers/testMailpit.js";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../helpers/testPrisma.js";
let app: Express;

beforeAll(async () => {
  const { default: createServer } = await import("@/utils/createServer.js");
  app = createServer();
});

beforeEach(async () => {
  await clearEmails();
});

const getEmailToken = async (
  email_address: string,
  tite: string = "Reset Your Password",
) => {
  const email = await waitForEmail(email_address, tite);
  const html = await getEmailBody(email.ID);
  const match = html.match(/\/reset-password\/([a-zA-Z0-9._-]+)/);
  if (!match) throw new Error("Reset token not found in email");
  const token = match[1];
  return token;
};

describe("/auth/forgotPassword", () => {
  it("sends reset email and allows password change", async () => {
    // 1. create a user
    const data = generateUserData();
    await request(app).post("/auth/signup").send(data);

    // 2. request password reset
    const forgotRes = await request(app)
      .post("/auth/forgotPassword")
      .send({ email: data.email, device: data.device });
    expect(forgotRes.status).toBe(200);

    // 3. wait for email to arrive in Mailpit (worker processes it async)
    const token = await getEmailToken(data.email);

    // 5. reset the password
    const resetRes = await request(app)
      .post("/auth/resetPassword")
      .send({ token, newPassword: "NewPassword123!" });
    expect(resetRes.status).toBe(200);

    // 6. verify old password no longer works
    const oldLoginRes = await request(app)
      .post("/auth/login")
      .send(generateLoginData(data));
    expect(oldLoginRes.status).toBe(401);

    // 7. verify new password works
    const newLoginRes = await request(app)
      .post("/auth/login")
      .send({ ...generateLoginData(data), password: "NewPassword123!" });
    expect(newLoginRes.status).toBe(200);
  });

  it("should return 200 even if email does not exist", async () => {
    const { device } = generateUserData();
    const res = await request(app)
      .post("/auth/forgotPassword")
      .send({ email: "nonexistent@example.com", device });
    expect(res.status).toBe(200);
  });

  it("should only accept a valid token", async () => {
    const userData = generateUserData();
    await request(app).post("/auth/signup").send(userData);

    const res = await request(app).post("/auth/forgotPassword").send({
      email: userData.email,
      device: userData.device,
    });
    expect(res.status).toBe(200);

    const token = await getEmailToken(userData.email);
    if (!token) {
      throw new Error("Token was not found");
    }
    let data = jwt.verify(token, process.env.RESET_TOKEN_SECRET!) as {
      id: string;
      tokenId: string;
    };
    if (!data.tokenId) {
      throw new Error("Token payload must contain the token's database uuid!");
    }
    await prisma.token.update({
      where: {
        id: data.tokenId,
      },
      data: {
        expiresAt: new Date(),
      },
    });
    let response = await request(app).post("/auth/resetPassword").send({
      token,
      newPassword: "NewPassword123!",
    });
    expect(response.status).toBe(400);
  });

  it("should not send two emails within 60 seconds for the same user", async () => {
    const data = generateUserData();
    await request(app).post("/auth/signup").send(data);

    // first request — should send email
    await request(app)
      .post("/auth/forgotPassword")
      .send({ email: data.email, device: data.device });
    await getEmailToken(data.email);

    // clear inbox so we can assert no new email arrives
    await clearEmails();

    // second request within the lock window — should be silently ignored
    const secondRes = await request(app)
      .post("/auth/forgotPassword")
      .send({ email: data.email, device: data.device });
    expect(secondRes.status).toBe(200);

    // no new email should arrive
    await expect(
      getEmailToken(data.email, "Reset Your Password"),
    ).rejects.toThrow();
  });

  it("should return 400 when device is missing", async () => {
    const res = await request(app)
      .post("/auth/forgotPassword")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
  });

  it("should return 400 when email is invalid", async () => {
    const { device } = generateUserData();
    const res = await request(app)
      .post("/auth/forgotPassword")
      .send({ email: "not-an-email", device });
    expect(res.status).toBe(400);
  });

  it("should return 400 when device is not a valid UUID", async () => {
    const res = await request(app)
      .post("/auth/forgotPassword")
      .send({ email: "test@example.com", device: "not-a-uuid" });
    expect(res.status).toBe(400);
  });

  it("should not allow reuse of a reset token", async () => {
    const data = generateUserData();
    await request(app).post("/auth/signup").send(data);

    await request(app)
      .post("/auth/forgotPassword")
      .send({ email: data.email, device: data.device });

    const token = await getEmailToken(data.email);

    // first use — succeeds
    const firstRes = await request(app)
      .post("/auth/resetPassword")
      .send({ token, newPassword: "NewPassword123!" });
    expect(firstRes.status).toBe(200);

    // second use — token deleted from DB, should fail
    const secondRes = await request(app)
      .post("/auth/resetPassword")
      .send({ token, newPassword: "AnotherPassword123!" });
    expect(secondRes.status).toBe(400);
  });

  it("should return 400 when resetting with a weak password", async () => {
    const data = generateUserData();
    await request(app).post("/auth/signup").send(data);

    await request(app)
      .post("/auth/forgotPassword")
      .send({ email: data.email, device: data.device });

    const token = await getEmailToken(data.email);

    const res = await request(app)
      .post("/auth/resetPassword")
      .send({ token, newPassword: "weakpassword" });
    expect(res.status).toBe(400);
  });

  it("should return 400 when token or newPassword is missing", async () => {
    const missingToken = await request(app)
      .post("/auth/resetPassword")
      .send({ newPassword: "NewPassword123!" });
    expect(missingToken.status).toBe(400);

    const missingPassword = await request(app)
      .post("/auth/resetPassword")
      .send({ token: "sometoken" });
    expect(missingPassword.status).toBe(400);
  });

  it("should revoke all active sessions after password reset", async () => {
    const data = generateUserData();

    // sign up and capture the refresh token cookie from login
    await request(app).post("/auth/signup").send(data);
    const loginRes = await request(app)
      .post("/auth/login")
      .send(generateLoginData(data));
    expect(loginRes.status).toBe(200);

    // confirm a REFRESH_TOKEN exists in DB for this user
    const userId = loginRes.body.data.user.id;
    const sessionsBefore = await prisma.token.findMany({
      where: { userId, type: "REFRESH_TOKEN" },
    });
    expect(sessionsBefore.length).toBeGreaterThan(0);

    // trigger password reset
    await request(app)
      .post("/auth/forgotPassword")
      .send({ email: data.email, device: data.device });
    const token = await getEmailToken(data.email);

    const resetRes = await request(app)
      .post("/auth/resetPassword")
      .send({ token, newPassword: "NewPassword123!" });
    expect(resetRes.status).toBe(200);

    // all REFRESH_TOKEN rows for this user should be gone
    const sessionsAfter = await prisma.token.findMany({
      where: { userId, type: "REFRESH_TOKEN" },
    });
    expect(sessionsAfter.length).toBe(0);
  });
});
