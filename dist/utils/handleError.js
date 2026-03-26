import { ZodError } from "zod";
import { appError } from "../errors/errors.js";
let handleError = (e, res) => {
    // this is the fun part, we handle different errors differently
    // if this is our custom thrown error, we handle it differently because it has an extra statusCode property
    if (e instanceof appError) {
        return res.status(e.statusCode).json({
            success: false,
            message: e.message,
            type: e.type || "APP_ERROR",
        });
    }
    // if its a zod error, we handle it according to zod's structure, using the (.issues) and mapping it to make it more readable.
    if (e instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            type: "VALIDATION_ERROR",
            details: e.issues.map((err) => ({
                field: err.path.join("."),
                message: err.message,
            })),
        });
    }
    // if it's something else, send a 500 and an "Internal Server Error"
    console.log("An error occurred: ", e);
    res.status(500).json({ success: false, message: "Internal Server Error" });
};
export default handleError;
//# sourceMappingURL=handleError.js.map