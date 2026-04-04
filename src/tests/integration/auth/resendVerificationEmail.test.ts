import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import { generateUserData } from "@/tests/helpers/factories.js";
import request from "supertest";
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

describe("POST /auth/resendVerificationEmail", () => {
  it("should return 429 when requested within the 5-minute cooldown", async () => {
    const data = generateUserData();
    await request(app).post("/auth/signup").send(data);
    // signup already created a verification token — requesting again immediately hits the cooldown

    const res = await request(app)
      .post("/auth/resendVerificationEmail")
      .send({ email: data.email, device: data.device });

    expect(res.status).toBe(429);
  });

  it("should return 200 silently when the email is already verified", async () => {
    const data = generateUserData();
    await request(app).post("/auth/signup").send(data);

    // verify the email
    const emailMessage = await waitForEmail(
      data.email,
      "Verify Your Email Address",
    );
    const html = await getEmailBody(emailMessage.ID);
    const match = html.match(/\/verify-email\/([a-zA-Z0-9._-]+)/);
    if (!match) throw new Error("Verification token not found in email");
    await request(app)
      .post("/auth/verifyEmail")
      .send({ token: match[1] });

    await clearEmails();

    const res = await request(app)
      .post("/auth/resendVerificationEmail")
      .send({ email: data.email, device: data.device });

    expect(res.status).toBe(200);
    // confirm no email was sent
    await expect(
      waitForEmail(data.email, "Verify Your Email Address"),
    ).rejects.toThrow();
  });

  it("should return 400 when email format is invalid", async () => {
    const { device } = generateUserData();
    const res = await request(app)
      .post("/auth/resendVerificationEmail")
      .send({ email: "not-an-email", device });

    expect(res.status).toBe(400);
  });

  it("should return 400 when device is missing", async () => {
    const res = await request(app)
      .post("/auth/resendVerificationEmail")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
  });

  it("should return 200 silently when email does not exist", async () => {
    const { device } = generateUserData();
    const res = await request(app)
      .post("/auth/resendVerificationEmail")
      .send({ email: "ghost@example.com", device });

    expect(res.status).toBe(200);
  });
});
