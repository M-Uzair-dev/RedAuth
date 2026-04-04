import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { Prisma } from "@prisma/client";
import userService from "@/services/user.service.js";
import { appError, errorType } from "@/errors/errors.js";

vi.mock("@/lib/prisma.js", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    token: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/redis.js", () => ({
  redis: {
    set: vi.fn(),
  },
}));

import prisma from "@/lib/prisma.js";

const p2025 = new Prisma.PrismaClientKnownRequestError("Record not found", {
  code: "P2025",
  clientVersion: "1.0",
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUser", () => {
  it("should return null when user is not found and throwErrorIfNotFound is false", async () => {
    (prisma.user.findUnique as Mock).mockResolvedValue(null);

    const result = await userService.getUser("non-existent-id", false);

    expect(result).toBeNull();
  });

  it("should throw appError when user is not found and throwErrorIfNotFound is true", async () => {
    (prisma.user.findUnique as Mock).mockResolvedValue(null);

    await expect(
      userService.getUser("non-existent-id", true),
    ).rejects.toMatchObject({
      statusCode: 404,
      type: errorType.USER_NOT_FOUND,
    });
  });
});

describe("editUser", () => {
  it("should return null on P2025 error when throwErrorIfNotFound is false", async () => {
    (prisma.user.update as Mock).mockRejectedValue(p2025);

    const result = await userService.editUser("non-existent-id", { name: "New Name" }, false);

    expect(result).toBeNull();
  });

  it("should throw appError on P2025 error when throwErrorIfNotFound is true", async () => {
    (prisma.user.update as Mock).mockRejectedValue(p2025);

    await expect(
      userService.editUser("non-existent-id", { name: "New Name" }, true),
    ).rejects.toMatchObject({
      statusCode: 404,
      type: errorType.USER_NOT_FOUND,
    });
  });

  it("should rethrow unexpected errors", async () => {
    const dbError = new Error("DB connection lost");
    (prisma.user.update as Mock).mockRejectedValue(dbError);

    await expect(
      userService.editUser("any-id", { name: "New Name" }),
    ).rejects.toThrow("DB connection lost");
  });
});

describe("deleteUser", () => {
  it("should return false when user is not found (P2025)", async () => {
    (prisma.user.delete as Mock).mockRejectedValue(p2025);

    const result = await userService.deleteUser("non-existent-id");

    expect(result).toBe(false);
  });

  it("should rethrow unexpected errors", async () => {
    const dbError = new Error("DB connection lost");
    (prisma.user.delete as Mock).mockRejectedValue(dbError);

    await expect(userService.deleteUser("any-id")).rejects.toThrow(
      "DB connection lost",
    );
  });
});
