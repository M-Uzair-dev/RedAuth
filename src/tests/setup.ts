import { beforeAll, beforeEach } from "vitest";
import prisma from "./helpers/testPrisma.js";

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

  process.env.FRONTEND_URL = "http://localhost:3000";
});

beforeEach(async () => {
  await prisma.token.deleteMany();
  await prisma.user.deleteMany();
});
