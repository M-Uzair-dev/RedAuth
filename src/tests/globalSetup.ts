import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer } from "@testcontainers/redis";
import { GenericContainer } from "testcontainers";
import { execSync } from "child_process";

export async function setup() {
  const pg = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("authTesting")
    .withUsername("test")
    .withPassword("test")
    .start();

  const redis = await new RedisContainer("redis:7-alpine").start();

  const mailpit = await new GenericContainer("axllent/mailpit")
    .withExposedPorts(1025, 8025)
    .start();

  const dbUrl = pg.getConnectionUri();
  process.env.DATABASE_URL = dbUrl;
  process.env.REDIS_HOST = redis.getHost();
  process.env.REDIS_PORT = String(redis.getPort());
  process.env.MAIL_HOST = mailpit.getHost();
  process.env.MAIL_PORT = String(mailpit.getMappedPort(1025));
  process.env.MAIL_USER = "";
  process.env.MAIL_PASS = "";
  process.env.MAILPIT_API_URL = `http://${mailpit.getHost()}:${mailpit.getMappedPort(8025)}`;

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "inherit",
  });

  return async () => {
    await pg.stop();
    await redis.stop();
    await mailpit.stop();
  };
}
