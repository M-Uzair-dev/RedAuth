import { beforeAll, describe, expect, it } from "vitest";
import { generateLoginData, generateUserData, } from "@/tests/helpers/factories.js";
import request from "supertest";
let app;
beforeAll(async () => {
    const { default: createServer } = await import("@/utils/createServer.js");
    app = createServer();
});
describe("POST /auth/change-password", () => {
    it("Should allow a user to change their password", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const cookies = signupRes.get("Set-Cookie");
        const res = await request(app)
            .post("/auth/change-password")
            .send({ newPassword: "NewPassword123!", confirmPassword: "NewPassword123!" })
            .set("Cookie", cookies);
        expect(res.status).toBe(200);
        // old session should be invalidated
        const meRes = await request(app).get("/user/me").set("Cookie", cookies);
        expect(meRes.status).toBe(401);
        // new password should work
        const loginRes = await request(app)
            .post("/auth/login")
            .send({ ...generateLoginData(userData), password: "NewPassword123!" });
        expect(loginRes.status).toBe(200);
    });
    it("Should not allow changing password to a weak password", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const cookies = signupRes.get("Set-Cookie");
        const res = await request(app)
            .post("/auth/change-password")
            .send({ newPassword: "weakpassword", confirmPassword: "weakpassword" })
            .set("Cookie", cookies);
        expect(res.status).toBe(400);
    });
    it("should return 400 when no password is provided", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const cookies = signupRes.get("Set-Cookie");
        const res = await request(app)
            .post("/auth/change-password")
            .send({})
            .set("Cookie", cookies);
        expect(res.status).toBe(400);
    });
    it("should return 400 when passwords do not match", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const cookies = signupRes.get("Set-Cookie");
        const res = await request(app)
            .post("/auth/change-password")
            .send({ newPassword: "NewPassword123!", confirmPassword: "DifferentPassword123!" })
            .set("Cookie", cookies);
        expect(res.status).toBe(400);
    });
    it("should return 401 when called without authentication", async () => {
        const res = await request(app)
            .post("/auth/change-password")
            .send({ newPassword: "NewPassword123!", confirmPassword: "NewPassword123!" });
        expect(res.status).toBe(401);
    });
});
//# sourceMappingURL=changePassword.test.js.map