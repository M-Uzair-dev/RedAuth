import { generateLoginData, generateUserData, } from "@/tests/helpers/factories.js";
import { createDB, stopDB } from "@/tests/helpers/testDB.js";
import { createMailpit, stopMailpit, waitForEmail, getEmailBody, clearEmails, } from "@/tests/helpers/testMailpit.js";
import { createRedis, stopRedis } from "@/tests/helpers/testRedis.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import prisma from "../../helpers/testPrisma.js";
let app;
beforeAll(async () => {
    await createDB();
    await createRedis();
    await createMailpit();
    const { default: createServer } = await import("@/utils/createServer.js");
    app = createServer();
});
afterAll(async () => {
    await stopDB();
    await stopRedis();
    await stopMailpit();
});
beforeEach(async () => {
    await clearEmails();
});
const getEmailToken = async (email_address, tite = "Reset Your Password") => {
    const email = await waitForEmail(email_address, tite);
    const html = await getEmailBody(email.ID);
    const match = html.match(/\/reset-password\/([a-zA-Z0-9._-]+)/);
    if (!match)
        throw new Error("Reset token not found in email");
    const token = match[1];
    return token;
};
describe("/auth/forgotPassword", () => {
    it("sends reset email and allows password change", async () => {
        // 1. create a user
        const data = generateUserData();
        await request(app).post("/auth/signup").send(data);
        // 2. request password reset
        const forgotRes = await request(app)
            .post("/auth/forgotPassword")
            .send({ email: data.email, device: data.device });
        console.log(forgotRes.body);
        expect(forgotRes.status).toBe(200);
        // 3. wait for email to arrive in Mailpit (worker processes it async)
        const token = await getEmailToken(data.email);
        // 5. reset the password
        const resetRes = await request(app)
            .post("/auth/resetPassword")
            .send({ token, newPassword: "NewPassword123!" });
        expect(resetRes.status).toBe(200);
        // 6. verify old password no longer works
        const oldLoginRes = await request(app)
            .post("/auth/login")
            .send(generateLoginData(data));
        expect(oldLoginRes.status).toBe(401);
        // 7. verify new password works
        const newLoginRes = await request(app)
            .post("/auth/login")
            .send({ ...generateLoginData(data), password: "NewPassword123!" });
        expect(newLoginRes.status).toBe(200);
    });
    it("should return 200 even if email does not exist", async () => {
        const { device } = generateUserData();
        const res = await request(app)
            .post("/auth/forgotPassword")
            .send({ email: "nonexistent@example.com", device });
        expect(res.status).toBe(200);
    });
    it("should only accept a valid token", async () => {
        const userData = generateUserData();
        await request(app).post("/auth/signup").send(userData);
        const res = await request(app).post("/auth/forgotPassword").send({
            email: userData.email,
            device: userData.device,
        });
        expect(res.status).toBe(200);
        const token = await getEmailToken(userData.email);
        if (!token) {
            throw new Error("Token was not found");
        }
        let data = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
        if (!data.tokenId) {
            throw new Error("Token payload must contain the token's database uuid!");
        }
        await prisma.token.update({
            where: {
                id: data.tokenId,
            },
            data: {
                expiresAt: new Date(),
            },
        });
        let response = await request(app).post("/resetPassword").send({
            token,
            newPassword: "NewPassword123!",
        });
        expect(response.status).toBe(404);
    });
});
//# sourceMappingURL=forgotPassword.test.js.map