import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { generateUserData } from "@/tests/helpers/factories.js";
import prisma from "../../helpers/testPrisma.js";
let app;
beforeAll(async () => {
    const { default: createServer } = await import("@/utils/createServer.js");
    app = createServer();
});
describe("GET /user/me", () => {
    it("should return the authenticated user", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const cookies = signupRes.get("Set-Cookie");
        const res = await request(app).get("/user/me").set("Cookie", cookies);
        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe(userData.email.toLowerCase());
        expect(res.body.data.user.password).toBeUndefined();
    });
    it("should return 401 when called without authentication", async () => {
        const res = await request(app).get("/user/me");
        expect(res.status).toBe(401);
    });
});
describe("PATCH /user/me", () => {
    it("Should allow a user to edit their name", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const signupCookies = signupRes.get("Set-Cookie");
        const editRes = await request(app)
            .patch("/user/me")
            .send({ name: "newName" })
            .set("Cookie", signupCookies);
        expect(editRes.status).toBe(200);
        const user = await request(app)
            .get("/user/me")
            .set("Cookie", signupCookies);
        expect(user.body.data.user.name).toBe("newName");
    });
    it("should return 400 when name is missing", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const cookies = signupRes.get("Set-Cookie");
        const res = await request(app)
            .patch("/user/me")
            .send({})
            .set("Cookie", cookies);
        expect(res.status).toBe(400);
    });
    it("should return 400 when name is an empty string", async () => {
        const userData = generateUserData();
        const signupRes = await request(app).post("/auth/signup").send(userData);
        const cookies = signupRes.get("Set-Cookie");
        const res = await request(app)
            .patch("/user/me")
            .send({ name: "" })
            .set("Cookie", cookies);
        expect(res.status).toBe(400);
    });
    it("should return 401 when called without authentication", async () => {
        const res = await request(app)
            .patch("/user/me")
            .send({ name: "newName" });
        expect(res.status).toBe(401);
    });
});
describe("DELETE /user/me", () => {
    it("should allow a user to delete their account", async () => {
        const signupData = generateUserData();
        const user = await request(app).post("/auth/signup").send(signupData);
        const userCookies = user.get("Set-Cookie");
        const userId = user.body.data.user.id;
        expect(userId).toBeDefined();
        const deleteRes = await request(app)
            .delete("/user/me")
            .set("Cookie", userCookies);
        expect(deleteRes.status).toBe(200);
        const DeletedUser = await prisma.user.findUnique({
            where: { id: userId },
        });
        expect(DeletedUser).toBeFalsy();
    });
    it("should return 401 when called without authentication", async () => {
        const res = await request(app).delete("/user/me");
        expect(res.status).toBe(401);
    });
});
//# sourceMappingURL=user.test.js.map