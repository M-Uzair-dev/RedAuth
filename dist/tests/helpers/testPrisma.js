import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
let _prisma = null;
function getPrisma() {
    if (!_prisma) {
        const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        _prisma = new PrismaClient({ adapter });
    }
    return _prisma;
}
export default new Proxy({}, {
    get(_, prop) {
        return getPrisma()[prop];
    },
});
//# sourceMappingURL=testPrisma.js.map