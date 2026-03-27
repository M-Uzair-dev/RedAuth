import { type User } from "@prisma/client";
declare const _default: {
    getUser: (id: string, throwErrorIfNotFound?: boolean) => Promise<Omit<User, "password"> | null>;
    editUser: (id: string, fields: Partial<Omit<User, "password" | "email" | "id">>, throwErrorIfNotFound?: boolean) => Promise<Omit<User, "password"> | null>;
    deleteUser: (userId: string) => Promise<boolean>;
};
export default _default;
//# sourceMappingURL=user.service.d.ts.map