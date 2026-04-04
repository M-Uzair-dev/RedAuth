import { generateUserData } from "@/tests/helpers/factories.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request, {} from "supertest";
import { createDB, stopDB } from "@/tests/helpers/testDB.js";
import { createRedis, stopRedis } from "@/tests/helpers/testRedis.js";
let app;
beforeAll(async () => {
    await createDB();
    await createRedis();
    const { default: createServer } = await import("@/utils/createServer.js");
    app = createServer();
});
afterAll(async () => {
    await stopDB();
    await stopRedis();
});
const createUser = async (data) => {
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
        const refreshToken = cookieArray.find((c) => c.startsWith("refresh_token="));
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
});
//# sourceMappingURL=signup.test.js.map