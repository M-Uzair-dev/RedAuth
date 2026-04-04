import {
  generateLoginData,
  generateUserData,
} from "@/tests/helpers/factories.js";
import { beforeAll, describe, expect, it } from "vitest";
import request, { type Response } from "supertest";
import prisma from "@/tests/helpers/testPrisma.js";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  const { default: createServer } = await import("@/utils/createServer.js");
  app = createServer();
});

const createUser = async (data: {
  name: string;
  email: string;
  password: string;
  device: string;
}): Promise<void> => {
  await request(app).post("/auth/signup").send(data);
};

const loginUser = async (
  data: Partial<{
    name: string;
    email: string;
    password: string;
    device: string;
  }>,
): Promise<Response> => {
  return await request(app).post("/auth/login").send(data);
};

describe("POST /auth/login", () => {
  it("Should properly allow login and return cookies", async () => {
    const data = generateUserData();
    const loginData = generateLoginData(data);

    await createUser(data);

    const response = await loginUser(loginData);

    expect(response.status).toBe(200);
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

  it("Should not allow login with wrong password", async () => {
    const data = generateUserData();
    const loginData = generateLoginData(data);

    await createUser(data);

    const response = await loginUser({
      ...loginData,
      password: "WrongPassword123!",
    });

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("Should return 400 when email is missing", async () => {
    const data = generateUserData();
    const loginData = generateLoginData(data);

    const { email, ...withoutEmail } = loginData;

    const response = await loginUser(withoutEmail);

    expect(response.status).toBe(400);
  });

  it("Should return 400 when password is missing", async () => {
    const data = generateUserData();
    const loginData = generateLoginData(data);

    const { password, ...withoutPassword } = loginData;

    const response = await loginUser(withoutPassword);

    expect(response.status).toBe(400);
  });

  it("Should return 400 when device is missing", async () => {
    const data = generateUserData();
    const loginData = generateLoginData(data);

    const { device, ...withoutDevice } = loginData;

    const response = await loginUser(withoutDevice);

    expect(response.status).toBe(400);
  });

  it("Should not allow login when user does not exist", async () => {
    const data = generateUserData();
    const loginData = generateLoginData(data);

    const response = await loginUser(loginData);

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("should be case insensitive", async () => {
    const data = generateUserData();
    const loginData = generateLoginData(data);

    await createUser(data);

    loginData.email = loginData.email.toUpperCase();
    const res = await loginUser(loginData);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(data.email.toLowerCase());
  });

  it("should return 400 when email format is invalid", async () => {
    const { device, password } = generateUserData();
    const res = await loginUser({ email: "not-an-email", password, device });
    expect(res.status).toBe(400);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("should return 400 when device is not a valid UUID", async () => {
    const { email, password } = generateUserData();
    const res = await loginUser({ email, password, device: "my-laptop" });
    expect(res.status).toBe(400);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("should support multiple concurrent sessions across different devices", async () => {
    const data = generateUserData();
    await createUser(data);

    const deviceA = generateUserData().device;
    const deviceB = generateUserData().device;

    const resA = await loginUser({
      ...generateLoginData(data),
      device: deviceA,
    });
    const resB = await loginUser({
      ...generateLoginData(data),
      device: deviceB,
    });

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const userId = resA.body.data.user.id;
    const sessions = await prisma.token.findMany({
      where: { userId, type: "REFRESH_TOKEN" },
    });

    // signup also creates one session, so there should be at least 2 from the two logins
    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });
});
