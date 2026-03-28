import type { User } from "@prisma/client";
declare const _default: {
    getUserFromCache: (userId: string) => Promise<Omit<User, "password" | "tokens"> | null>;
    addUserToCache: (userId: string, data: Omit<User, "password" | "tokens">, EX: number) => Promise<boolean>;
    deleteUserFromCache: (userId: string) => Promise<boolean>;
};
export default _default;
//# sourceMappingURL=cacheUser.d.ts.map