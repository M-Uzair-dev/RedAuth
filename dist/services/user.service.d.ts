import type { User } from "@prisma/client";
declare const _default: {
    getUser: (id: string | undefined | null, throwErrorIfNotFound?: boolean) => Promise<Omit<User, "password"> | null>;
};
export default _default;
//# sourceMappingURL=user.service.d.ts.map