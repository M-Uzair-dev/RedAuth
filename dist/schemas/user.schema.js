import z from "zod";
const partialUser = z.object({
    name: z.string("Name is required").nonempty("Name is required"),
});
const revokeSessionSchema = z.object({
    tokenId: z.string("tokenId is required").min(1, "TokenId is required"),
});
export default {
    partialUser,
    revokeSessionSchema,
};
//# sourceMappingURL=user.schema.js.map