import pino from "pino";
import type { LoggerOptions } from "pino";

const isProduction = process.env.NODE_ENV === "production";

const config: LoggerOptions = {
  level: (process.env.LOG_LEVEL ||
    (isProduction ? "info" : "debug")) as pino.Level,

  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),

  base: {
    service: "auth-template",
    env: process.env.NODE_ENV ?? "development",
    version: process.env.npm_package_version,
  },
  redact: {
    paths: ["password", "newPassword", "token", "*.password", "*.token"],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

export const logger = pino(config);
