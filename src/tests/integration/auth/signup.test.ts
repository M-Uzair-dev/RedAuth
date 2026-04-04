import { generateUserData } from "@/tests/helpers/factories.js";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import request, { type Response } from "supertest";
import {
  waitForEmail,
  getEmailBody,
  clearEmails,
} from "@/tests/helpers/testMailpit.js";
import type { Express } from "express";
import prisma from "../../helpers/testPrisma.js";

let app: Express;

beforeAll(async () => {
  const { default: createServer } = await import("@/utils/createServer.js");
  app = createServer();
});

beforeEach(async () => {
  await clearEmails();
});

const createUser = async (
  data: Partial<{
    name: string;
    email: string;
    password: string;
    device: string;
  }>,
): Promise<Response> => {
  return await request(app).post("/auth/signup").send(data);
};

describe("POST /auth/signup", () => {
  it("Creates a new user and sets cookies", async () => {
    const data = generateUserData();

    let response = await createUser(data);

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(data.email.toLowerCase());
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.body.data.user.password).toBeUndefined();

    const cookies = response.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

    const accessToken = cookieArray.find((c) => c.startsWith("access_token="));
    expect(accessToken).toBeDefined();

    const refreshToken = cookieArray.find((c) =>
      c.startsWith("refresh_token="),
    );
    expect(refreshToken).toBeDefined();
    expect(accessToken).toContain("HttpOnly");
    expect(accessToken).toContain("Path=/");
    expect(refreshToken).toContain("HttpOnly");
    expect(refreshToken).toContain("Path=/");
  });

  it("Should not allow duplicate emails", async () => {
    const data = generateUserData();

    await createUser(data);
    let response = await createUser(data);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it("Should not accept a weak password", async () => {
    const data = generateUserData();
    data.password = "weakPassword";

    let res = await createUser(data);

    expect(res.status).toBe(400);
    expect(res.body.type).toBe("VALIDATION_ERROR");
  });

  it("should not register an invalid email", async () => {
    const data = generateUserData();
    data.email = "invalid-email";

    const res = await createUser(data);

    expect(res.status).toBe(400);
    expect(res.body.type).toBe("VALIDATION_ERROR");
  });

  it("Should throw an error when a required field is missing", async () => {
    const { email, password, device } = generateUserData();
    const userPayload = {
      email,
      password,
      device,
    };

    const res = await createUser(userPayload);
    expect(res.status).toBe(400);
    expect(res.body.type).toBe("VALIDATION_ERROR");
  });
  it("should treat emails as case-insensitive", async () => {
    const data = generateUserData();

    await createUser(data);

    const res = await request(app)
      .post("/auth/signup")
      .send({
        ...data,
        email: data.email.toUpperCase(),
      });

    expect(res.status).toBe(409);
  });

  it("should return 400 when device is missing", async () => {
    const { name, email, password } = generateUserData();
    const res = await createUser({ name, email, password });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when device is not a valid UUID", async () => {
    const data = generateUserData({ device: "not-a-uuid" });
    const res = await createUser(data);
    expect(res.status).toBe(400);
    expect(res.body.type).toBe("VALIDATION_ERROR");
  });

  it("should send a valid, and working verification email after signup.", async () => {
    const data = generateUserData();
    const res = await createUser(data);
    expect(res.status).toBe(201);

    const email = await waitForEmail(data.email, "Verify Your Email Address");
    const html = await getEmailBody(email.ID);
    const match = html.match(/\/verify-email\/([a-zA-Z0-9._-]+)/);
    if (!match) throw new Error("Verification token not found in email");
    const token = match[1];

    const verifyRes = await request(app)
      .post("/auth/verifyEmail")
      .send({ token });
    expect(verifyRes.status).toBe(200);
    const userRecord = await prisma.user.findUnique({
      where: {
        email: data.email.toLowerCase(),
      },
    });
    if (!userRecord) throw new Error("User was not found in the DB.");
    expect(userRecord.emailVerified).toBe(true);
  });
});
