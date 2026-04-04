import { PostgreSqlContainer, StartedPostgreSqlContainer, } from "@testcontainers/postgresql";
import { execSync } from "child_process";
let container;
export const createDB = async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
        .withDatabase("authTesting")
        .withUsername("test")
        .withPassword("test")
        .start();
    const url = container.getConnectionUri();
    process.env.DATABASE_URL = url;
    execSync("npx prisma migrate deploy", {
        env: { ...process.env, DATABASE_URL: url },
        stdio: "inherit",
    });
    return url;
};
export const stopDB = async () => {
    container.stop();
};
//# sourceMappingURL=testDB.js.map