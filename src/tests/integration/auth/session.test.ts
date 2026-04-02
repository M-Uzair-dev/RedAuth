import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { generateUserData } from "@/tests/helpers/factories.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import prisma from "@/tests/helpers/testPrisma.js";

let app: Express;
beforeAll(async () => {
  const { default: createServer } = await import("@/utils/createServer.js");
  app = createServer();
});

describe("Handle User Sessions", () => {
  it("Should show user their sessions", async () => {
    const userData = generateUserData();

    const signupRes = await request(app).post("/auth/signup").send(userData); // creates one user session

    const { device: newDevice } = generateUserData();

    await request(app).post("/auth/login").send({
      email: userData.email,
      password: userData.password,
      device: newDevice,
    }); // creates another user session

    const signupCookiesRaw = signupRes.headers["set-cookie"];
    expect(signupCookiesRaw).toBeDefined();

    const signupCookies = Array.isArray(signupCookiesRaw)
      ? signupCookiesRaw
      : ([signupCookiesRaw] as string[]);

    const sessions = await request(app)
      .get("/user/sessions?device=" + userData.device)
      .set("Cookie", signupCookies);

    expect(sessions.status).toBe(200);
    expect(sessions.body.data.sessions.length).toBe(2);
  });

  it("should properly revoke a specific user session", async () => {
    const userA = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userA);
    const signupCookies = signupRes.get("Set-Cookie")!;

    const { device: deviceB } = generateUserData();
    const loginRes = await request(app).post("/auth/login").send({
      email: userA.email,
      password: userA.password,
      device: deviceB,
    });
    const loginCookies = loginRes.get("Set-Cookie")!;

    const sessionsRes = await request(app)
      .get("/user/sessions?device=" + userA.device)
      .set("Cookie", signupCookies);

    expect(sessionsRes.status).toBe(200);

    const sessionToRevoke = sessionsRes.body.data.sessions.find(
      (s: any) => !s.current,
    );
    expect(sessionToRevoke).toBeDefined();

    const revokeRes = await request(app)
      .post("/user/revokeSession")
      .send({ tokenId: sessionToRevoke.id })
      .set("Cookie", signupCookies);

    expect(revokeRes.status).toBe(200);

    const userMeRes = await request(app)
      .get("/user/me")
      .set("Cookie", loginCookies);

    expect(userMeRes.status).toBe(401);
  });

  it("Should send back 401 - ACCESS_TOKEN_EXPIRED when user has an expired access token but valid refresh token", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);

    const signupCookies = signupRes.get("Set-Cookie")!;
    const expiredToken = jwt.sign(
      {
        id: signupRes.body.data.user.id,
        tokenId: "some-token-id",
      },
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: "1s",
      },
    );
    await new Promise((r) => setTimeout(r, 1500));

    const modifiedCookies = signupCookies
      .filter((c) => !c.startsWith("access_token="))
      .concat(`access_token=${expiredToken}`);

    const userResponse = await request(app)
      .get("/user/me")
      .set("Cookie", modifiedCookies);

    expect(userResponse.status).toBe(401);

    expect(userResponse.body.type).toBe("ACCESS_TOKEN_EXPIRED");
  });

  it("Should return 401 - REFRESH_TOKEN_EXPIRED when both access token and refresh token are invalid", async () => {
    const expiredAccessToken = jwt.sign(
      { id: "fake-id", tokenId: "fake-token-id" },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "1s" },
    );
    const expiredRefreshToken = jwt.sign(
      { id: "fake-id", tokenId: "fake-token-id" },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: "1s" },
    );
    await new Promise((r) => setTimeout(r, 1500));

    const userResponse = await request(app)
      .get("/user/me")
      .set("Cookie", [
        `access_token=${expiredAccessToken}`,
        `refresh_token=${expiredRefreshToken}`,
      ]);

    expect(userResponse.status).toBe(401);
    expect(userResponse.body.type).toBe("REFRESH_TOKEN_EXPIRED");
  });

  it("should nuke all sessions when logout-all is called", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const signupCookies = signupRes.get("Set-Cookie")!;

    const { device: deviceB } = generateUserData();
    const loginRes = await request(app).post("/auth/login").send({
      email: userData.email,
      password: userData.password,
      device: deviceB,
    });
    const loginCookies = loginRes.get("Set-Cookie")!;

    const logoutAllRes = await request(app)
      .post("/auth/logout-all")
      .set("Cookie", signupCookies);
    expect(logoutAllRes.status).toBe(200);

    const resA = await request(app)
      .get("/user/me")
      .set("Cookie", signupCookies);
    const resB = await request(app).get("/user/me").set("Cookie", loginCookies);

    expect(resA.status).toBe(401);
    expect(resB.status).toBe(401);
  });

  it("should nuke all sessions when a reused refresh token is detected", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const signupCookies = signupRes.get("Set-Cookie")!;

    const { device: deviceB } = generateUserData();
    const loginRes = await request(app).post("/auth/login").send({
      email: userData.email,
      password: userData.password,
      device: deviceB,
    });
    const loginCookies = loginRes.get("Set-Cookie")!;

    const refreshToken = signupCookies
      ?.find((c: any) => c.startsWith("refresh_token="))!
      .split(";")[0]!
      .split("=")[1]!;

    const decoded = jwt.decode(refreshToken) as { tokenId: string };
    await prisma.token.delete({ where: { id: decoded.tokenId } });

    await request(app)
      .post("/auth/get-access-token")
      .send({ device: userData.device })
      .set("Cookie", signupCookies);

    const resB = await request(app).get("/user/me").set("Cookie", loginCookies);
    expect(resB.status).toBe(401);
  });

  it("should logout and invalidate that session", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const signupCookies = signupRes.get("Set-Cookie")!;

    const logoutRes = await request(app)
      .post("/auth/logout")
      .set("Cookie", signupCookies);
    expect(logoutRes.status).toBe(200);

    const res = await request(app).get("/user/me").set("Cookie", signupCookies);
    expect(res.status).toBe(401);
  });

  it("should issue new tokens when a valid refresh token is provided", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const signupCookies = signupRes.get("Set-Cookie")!;

    const res = await request(app)
      .post("/auth/get-access-token")
      .send({ device: userData.device })
      .set("Cookie", signupCookies);

    expect(res.status).toBe(200);
    const newCookies = res.get("Set-Cookie")!;
    const hasAccessToken = newCookies.some((c) =>
      c.startsWith("access_token="),
    );
    const hasRefreshToken = newCookies.some((c) =>
      c.startsWith("refresh_token="),
    );
    expect(hasAccessToken).toBe(true);
    expect(hasRefreshToken).toBe(true);
  });

  it("should correctly mark the current session based on device", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const signupCookies = signupRes.get("Set-Cookie")!;

    const { device: deviceB } = generateUserData();
    await request(app).post("/auth/login").send({
      email: userData.email,
      password: userData.password,
      device: deviceB,
    });

    const sessionsRes = await request(app)
      .get("/user/sessions?device=" + userData.device)
      .set("Cookie", signupCookies);

    expect(sessionsRes.status).toBe(200);
    const sessions = sessionsRes.body.data.sessions;
    const current = sessions.find((s: any) => s.current === true);
    const notCurrent = sessions.find((s: any) => s.current === false);

    expect(current).toBeDefined();
    expect(current.device).toBe(userData.device);
    expect(notCurrent).toBeDefined();
    expect(notCurrent.device).toBe(deviceB);
  });

  it("should return 404 when revoking a non-existent session", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const signupCookies = signupRes.get("Set-Cookie")!;

    const res = await request(app)
      .post("/user/revokeSession")
      .send({ tokenId: "00000000-0000-0000-0000-000000000000" })
      .set("Cookie", signupCookies);

    expect(res.status).toBe(404);
    expect(res.body.type).toBe("NOT_FOUND");
  });

  it("should return 403 when revoking another user's session", async () => {
    const userA = generateUserData();
    const userB = generateUserData();

    const signupResA = await request(app).post("/auth/signup").send(userA);
    const cookiesA = signupResA.get("Set-Cookie")!;

    const signupResB = await request(app).post("/auth/signup").send(userB);
    const cookiesB = signupResB.get("Set-Cookie")!;

    // get userB's session id
    const sessionsRes = await request(app)
      .get("/user/sessions?device=" + userB.device)
      .set("Cookie", cookiesB);
    const userBSessionId = sessionsRes.body.data.sessions[0].id;

    // userA tries to revoke userB's session
    const res = await request(app)
      .post("/user/revokeSession")
      .send({ tokenId: userBSessionId })
      .set("Cookie", cookiesA);

    expect(res.status).toBe(403);
    expect(res.body.type).toBe("FORBIDDEN");
  });
});
