import { beforeAll } from "vitest";
beforeAll(() => {
    process.env.NODE_ENV = "test";
    process.env.ACCESS_TOKEN_EXPIRY = "900000";
    process.env.ACCESS_TOKEN_SECRET = "RedAuthAccessTokenSecret989326354";
    process.env.REFRESH_TOKEN_EXPIRY = "604800000";
    process.env.REFRESH_TOKEN_SECRET = "RedAuthRefreshTokenSecret989427w34823";
    process.env.RESET_TOKEN_EXPIRY = "1800000";
    process.env.RESET_TOKEN_SECRET = "RedAuthAccessTokenSecret97w3482345943";
    process.env.VERIFICATION_TOKEN_EXPIRY = "172800000";
    process.env.VERIFICATION_TOKEN_SECRET =
        "RedAuthVerificationTokenSecret97w3349583103";
    process.env.MAIL_HOST = "smtp.gmail.com";
    process.env.MAIL_PORT = "587";
    process.env.MAIL_USER = "test@gmail.com";
    process.env.MAIL_PASS = "testing";
    process.env.FRONTEND_URL = "https://redauth.uzairmanan.com";
});
//# sourceMappingURL=setup.js.map