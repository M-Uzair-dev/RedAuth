import prisma from "../lib/prisma.js";
import { appError } from "../errors/errors.js";
const getUser = async (id, throwErrorIfNotFound = false) => {
    if (!id)
        throw new appError(404, "User not found!");
    const user = await prisma.user.findUnique({
        where: {
            id,
        },
    });
    if (!user) {
        if (!throwErrorIfNotFound)
            return user;
        throw new appError(404, "User not found!");
    }
    const { password, ...rest } = user;
    return rest;
};
export default {
    getUser,
};
//# sourceMappingURL=user.service.js.map