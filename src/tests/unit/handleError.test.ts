import { describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";
import handleError from "@/utils/handleError.js";
import { appError, errorType } from "@/errors/errors.js";

const mockRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res); // allows chaining: res.status(400).json(...)
  return res;
};

describe("handleError", () => {
  it("should return the correct status code, message, and type for an appError", () => {
    const res = mockRes();
    const error = new appError(404, "User not found", errorType.USER_NOT_FOUND);

    handleError(error, res as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
      type: errorType.USER_NOT_FOUND,
    });
  });

  it("should fall back to APP_ERROR type when appError has no type", () => {
    const res = mockRes();
    const error = new appError(400, "Something went wrong");

    handleError(error, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Something went wrong",
      type: "APP_ERROR",
    });
  });

  it("should return 400 with VALIDATION_ERROR type and mapped details for a ZodError", () => {
    const res = mockRes();

    const schema = z.object({
      email: z.email(),
      age: z.number(),
    });
    let zodError: ZodError;
    try {
      schema.parse({ email: "not-an-email", age: "not-a-number" });
    } catch (e) {
      zodError = e as ZodError;
    }

    handleError(zodError!, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        type: "VALIDATION_ERROR",
        message: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
        ]),
      }),
    );
  });

  it("should return 500 for an unknown error", () => {
    const res = mockRes();
    const error = new Error("Something unexpected exploded");

    handleError(error, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal Server Error",
    });
  });
});
