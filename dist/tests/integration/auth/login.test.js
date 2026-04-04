import { generateLoginData, generateUserData, } from "@/tests/helpers/factories.js";
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
    await request(app).post("/auth/signup").send(data);
};
const loginUser = async (data) => {
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
        const refreshToken = cookieArray.find((c) => c.startsWith("refresh_token="));
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
});
//# sourceMappingURL=login.test.js.map