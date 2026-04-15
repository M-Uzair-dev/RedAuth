import { generateUserData } from "@/tests/helpers/factories.js";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { clearEmails, waitForEmail } from "@/tests/helpers/testMailpit.js";
import prisma from "../../helpers/testPrisma.js";
let app;
beforeAll(async () => {
    const { default: createServer } = await import("@/utils/createServer.js");
    app = createServer();
});
describe("Emailing Service", () => {
    it("should automatically send a verification email on signup", async () => {
        const data = generateUserData();
        await request(app).post("/auth/signup").send(data);
        await waitForEmail(data.email, "Verify Your Email Address");
    });
    it("Should automatically send a login alert email.", async () => {
        const data = generateUserData();
        await request(app).post("/auth/signup").send(data);
        await request(app).post("/auth/login").send({
            email: data.email,
            device: data.device,
            password: data.password,
        });
        await waitForEmail(data.email, "New Login Detected");
    });
    it("should resend a verification email when requested", async () => {
        const data = generateUserData();
        const SignupRes = await request(app).post("/auth/signup").send(data);
        await waitForEmail(data.email, "Verify Your Email Address");
        await clearEmails();
        await prisma.token.deleteMany({
            where: {
                userId: SignupRes.body.data.user.id,
                type: "EMAIL_VERIFICATION",
            },
        });
        const res = await request(app)
            .post("/auth/resendVerificationEmail")
            .send({ email: data.email, device: data.device });
        expect(res.status).toBe(200);
        await waitForEmail(data.email, "Verify Your Email Address");
    });
});
//# sourceMappingURL=emails.test.js.map