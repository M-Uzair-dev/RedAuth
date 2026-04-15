import { beforeAll, describe, expect, it } from "vitest";
import { generateUserData } from "@/tests/helpers/factories.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import prisma from "@/tests/helpers/testPrisma.js";
let app;
beforeAll(async () => {
    const { default: createServer } = await import("@/utils/createServer.js");
    app = createServer();
});
describe("POST /auth/get-access-token", () => {
    it("should issue new tokens when a valid refresh token is provided", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const signupCookies = signupRes.get("Set-Cookie");
        const res = await request(app)
            .post("/auth/get-access-token")
            .send({ device: userData.device })
            .set("Cookie", signupCookies);
        expect(res.status).toBe(200);
        const newCookies = res.get("Set-Cookie");
        expect(newCookies.some((c) => c.startsWith("access_token="))).toBe(true);
        expect(newCookies.some((c) => c.startsWith("refresh_token="))).toBe(true);
    });
    it("should return 401 when no refresh token cookie is provided", async () => {
        const { device } = generateUserData();
        const res = await request(app)
            .post("/auth/get-access-token")
            .send({ device });
        expect(res.status).toBe(401);
    });
    it("should return 400 when device is missing", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const cookies = signupRes.get("Set-Cookie");
        const res = await request(app)
            .post("/auth/get-access-token")
            .send({})
            .set("Cookie", cookies);
        expect(res.status).toBe(400);
    });
});
describe("Token Security", () => {
    it("should nuke all sessions when a reused refresh token is detected", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const signupCookies = signupRes.get("Set-Cookie");
        const loginRes = await request(app).post("/auth/login").send({
            email: userData.email,
            password: userData.password,
            device: generateUserData().device,
        });
        const loginCookies = loginRes.get("Set-Cookie");
        const refreshToken = signupCookies
            .find((c) => c.startsWith("refresh_token="))
            .split(";")[0]
            .split("=")[1];
        const decoded = jwt.decode(refreshToken);
        await prisma.token.delete({ where: { id: decoded.tokenId } });
        await request(app)
            .post("/auth/get-access-token")
            .send({ device: userData.device })
            .set("Cookie", signupCookies);
        const resB = await request(app).get("/user/me").set("Cookie", loginCookies);
        expect(resB.status).toBe(401);
    });
    it("should return 401 with ACCESS_TOKEN_EXPIRED when access token is expired but refresh token is valid", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const signupCookies = signupRes.get("Set-Cookie");
        const expiredToken = jwt.sign({ id: signupRes.body.data.user.id, tokenId: "some-token-id" }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1s" });
        await new Promise((r) => setTimeout(r, 1500));
        const modifiedCookies = signupCookies
            .filter((c) => !c.startsWith("access_token="))
            .concat(`access_token=${expiredToken}`);
        const res = await request(app)
            .get("/user/me")
            .set("Cookie", modifiedCookies);
        expect(res.status).toBe(401);
        expect(res.body.type).toBe("ACCESS_TOKEN_EXPIRED");
    });
    it("should return 401 with REFRESH_TOKEN_EXPIRED when both tokens are expired", async () => {
        const expiredAccessToken = jwt.sign({ id: "fake-id", tokenId: "fake-token-id" }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1s" });
        const expiredRefreshToken = jwt.sign({ id: "fake-id", tokenId: "fake-token-id" }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1s" });
        await new Promise((r) => setTimeout(r, 1500));
        const res = await request(app)
            .get("/user/me")
            .set("Cookie", [
            `access_token=${expiredAccessToken}`,
            `refresh_token=${expiredRefreshToken}`,
        ]);
        expect(res.status).toBe(401);
        expect(res.body.type).toBe("REFRESH_TOKEN_EXPIRED");
    });
});
//# sourceMappingURL=tokens.test.js.map