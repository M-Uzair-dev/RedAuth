import z from "zod";
const partialUser = z.object({
    name: z.string("Name is required").nonempty("Name is required"),
});
export default {
    partialUser,
};
//# sourceMappingURL=user.schema.js.map