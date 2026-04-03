import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { generateUserData } from "@/tests/helpers/factories.js";
import request from "supertest";

let app: Express;
beforeAll(async () => {
  const { default: createServer } = await import("@/utils/createServer.js");
  app = createServer();
});

describe("GET /user/sessions", () => {
  it("should show user their sessions", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);

    const { device: newDevice } = generateUserData();
    await request(app).post("/auth/login").send({
      email: userData.email,
      password: userData.password,
      device: newDevice,
    });

    const signupCookiesRaw = signupRes.headers["set-cookie"];
    const signupCookies = Array.isArray(signupCookiesRaw)
      ? signupCookiesRaw
      : ([signupCookiesRaw] as string[]);

    const res = await request(app)
      .get("/user/sessions?device=" + userData.device)
      .set("Cookie", signupCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions.length).toBe(2);
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

    const res = await request(app)
      .get("/user/sessions?device=" + userData.device)
      .set("Cookie", signupCookies);

    expect(res.status).toBe(200);
    const sessions = res.body.data.sessions;
    const current = sessions.find((s: any) => s.current === true);
    const notCurrent = sessions.find((s: any) => s.current === false);

    expect(current).toBeDefined();
    expect(current.device).toBe(userData.device);
    expect(notCurrent).toBeDefined();
    expect(notCurrent.device).toBe(deviceB);
  });

  it("should return 401 when called without authentication", async () => {
    const { device } = generateUserData();
    const res = await request(app).get("/user/sessions?device=" + device);
    expect(res.status).toBe(401);
  });

  it("should return 400 when device query param is missing", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const cookies = signupRes.get("Set-Cookie")!;

    const res = await request(app)
      .get("/user/sessions")
      .set("Cookie", cookies);

    expect(res.status).toBe(400);
  });

  it("should return 400 when device is not a valid UUID", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const cookies = signupRes.get("Set-Cookie")!;

    const res = await request(app)
      .get("/user/sessions?device=not-a-uuid")
      .set("Cookie", cookies);

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/logout", () => {
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

  it("should only logout the current session", async () => {
    const signupData = generateUserData();
    const session1 = await request(app).post("/auth/signup").send(signupData);
    const session1Cookies = session1.get("Set-Cookie")!;

    const session2 = await request(app).post("/auth/login").send({
      email: signupData.email,
      password: signupData.password,
      device: generateUserData().device,
    });
    const session2Cookies = session2.get("Set-Cookie")!;

    const logoutRes = await request(app)
      .post("/auth/logout")
      .set("Cookie", session1Cookies);
    expect(logoutRes.status).toBe(200);

    const session1Data = await request(app)
      .get("/user/me")
      .set("Cookie", session1Cookies);
    expect(session1Data.status).toBe(401);

    const session2Data = await request(app)
      .get("/user/me")
      .set("Cookie", session2Cookies);
    expect(session2Data.status).toBe(200);
  });

  it("should return 401 when called without authentication", async () => {
    const res = await request(app).post("/auth/logout");
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout-all", () => {
  it("should invalidate all sessions across all devices", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const signupCookies = signupRes.get("Set-Cookie")!;

    const loginRes = await request(app).post("/auth/login").send({
      email: userData.email,
      password: userData.password,
      device: generateUserData().device,
    });
    const loginCookies = loginRes.get("Set-Cookie")!;

    const logoutAllRes = await request(app)
      .post("/auth/logout-all")
      .set("Cookie", signupCookies);
    expect(logoutAllRes.status).toBe(200);

    const resA = await request(app).get("/user/me").set("Cookie", signupCookies);
    const resB = await request(app).get("/user/me").set("Cookie", loginCookies);

    expect(resA.status).toBe(401);
    expect(resB.status).toBe(401);
  });

  it("should return 401 when called without authentication", async () => {
    const res = await request(app).post("/auth/logout-all");
    expect(res.status).toBe(401);
  });
});

describe("POST /user/revokeSession", () => {
  it("should properly revoke a specific user session", async () => {
    const userA = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userA);
    const signupCookies = signupRes.get("Set-Cookie")!;

    const loginRes = await request(app).post("/auth/login").send({
      email: userA.email,
      password: userA.password,
      device: generateUserData().device,
    });
    const loginCookies = loginRes.get("Set-Cookie")!;

    const sessionsRes = await request(app)
      .get("/user/sessions?device=" + userA.device)
      .set("Cookie", signupCookies);

    const sessionToRevoke = sessionsRes.body.data.sessions.find(
      (s: any) => !s.current,
    );
    expect(sessionToRevoke).toBeDefined();

    const revokeRes = await request(app)
      .post("/user/revokeSession")
      .send({ tokenId: sessionToRevoke.id })
      .set("Cookie", signupCookies);
    expect(revokeRes.status).toBe(200);

    const meRes = await request(app).get("/user/me").set("Cookie", loginCookies);
    expect(meRes.status).toBe(401);
  });

  it("should return 404 when revoking a non-existent session", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const cookies = signupRes.get("Set-Cookie")!;

    const res = await request(app)
      .post("/user/revokeSession")
      .send({ tokenId: "00000000-0000-0000-0000-000000000000" })
      .set("Cookie", cookies);

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

    const sessionsRes = await request(app)
      .get("/user/sessions?device=" + userB.device)
      .set("Cookie", cookiesB);
    const userBSessionId = sessionsRes.body.data.sessions[0].id;

    const res = await request(app)
      .post("/user/revokeSession")
      .send({ tokenId: userBSessionId })
      .set("Cookie", cookiesA);

    expect(res.status).toBe(403);
    expect(res.body.type).toBe("FORBIDDEN");
  });

  it("should return 401 when called without authentication", async () => {
    const res = await request(app)
      .post("/user/revokeSession")
      .send({ tokenId: "00000000-0000-0000-0000-000000000000" });

    expect(res.status).toBe(401);
  });

  it("should return 400 when tokenId is missing", async () => {
    const userData = generateUserData();
    const signupRes = await request(app).post("/auth/signup").send(userData);
    const cookies = signupRes.get("Set-Cookie")!;

    const res = await request(app)
      .post("/user/revokeSession")
      .send({})
      .set("Cookie", cookies);

    expect(res.status).toBe(400);
  });
});
