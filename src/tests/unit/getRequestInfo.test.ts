import { afterEach, describe, expect, it, vi } from "vitest";
import { getDevice, getLoginMeta } from "@/utils/getRequestInfo.js";
import type { Request } from "express";

const mockReq = (options: {
  userAgent?: string;
  forwardedIp?: string;
  socketIp?: string;
}) =>
  ({
    headers: {
      "user-agent": options.userAgent ?? "",
      ...(options.forwardedIp
        ? { "x-forwarded-for": options.forwardedIp }
        : {}),
    },
    socket: { remoteAddress: options.socketIp ?? "127.0.0.1" },
  }) as unknown as Request;

describe("getDevice", () => {
  it("should return the device model for a mobile user-agent", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
    expect(getDevice(mockReq({ userAgent: ua }))).toBe("iPhone");
  });

  it("should return OS and type for a Windows desktop user-agent", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0";
    const result = getDevice(mockReq({ userAgent: ua }));
    expect(result).toContain("Windows");
    expect(result).toContain("desktop");
  });

  it("should return OS and type for a Linux desktop user-agent", () => {
    const ua =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0";
    const result = getDevice(mockReq({ userAgent: ua }));
    expect(result).toContain("Linux");
    expect(result).toContain("desktop");
  });

  it("should fall back to Unknown OS (desktop) when user-agent is empty", () => {
    expect(getDevice(mockReq({ userAgent: "" }))).toBe("Unknown OS (desktop)");
  });
});

describe("getLoginMeta", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return the correct location when fetch succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi
          .fn()
          .mockResolvedValue({ city: "London", country_name: "United Kingdom" }),
      }),
    );

    const result = await getLoginMeta(mockReq({ forwardedIp: "1.2.3.4" }));

    expect(result.location).toBe("London, United Kingdom");
    expect(result.ip).toBe("1.2.3.4");
  });

  it("should return Unknown location when fetch response has no city or country", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    const result = await getLoginMeta(mockReq({ forwardedIp: "1.2.3.4" }));

    expect(result.location).toBe("Unknown");
  });

  it("should return Unknown location when fetch throws a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const result = await getLoginMeta(mockReq({ forwardedIp: "1.2.3.4" }));

    expect(result.location).toBe("Unknown");
  });

  it("should return Unknown location when fetch times out (AbortError)", async () => {
    const abortError = Object.assign(new Error("The operation was aborted"), {
      name: "AbortError",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const result = await getLoginMeta(mockReq({ forwardedIp: "1.2.3.4" }));

    expect(result.location).toBe("Unknown");
  });

  it("should use x-forwarded-for header as the IP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    const result = await getLoginMeta(mockReq({ forwardedIp: "5.6.7.8" }));

    expect(result.ip).toBe("5.6.7.8");
  });

  it("should fall back to socket.remoteAddress when x-forwarded-for is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    const result = await getLoginMeta(mockReq({ socketIp: "9.9.9.9" }));

    expect(result.ip).toBe("9.9.9.9");
  });

  it("should return Unknown IP when neither header nor socket address is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    const req = ({
      headers: { "user-agent": "" },
      socket: { remoteAddress: undefined },
    }) as unknown as Request;

    const result = await getLoginMeta(req);

    expect(result.ip).toBe("Unknown");
  });
});
