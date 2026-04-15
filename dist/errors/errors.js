export var errorType;
(function (errorType) {
    errorType["ACCESS_TOKEN_EXPIRED"] = "ACCESS_TOKEN_EXPIRED";
    errorType["REFRESH_TOKEN_EXPIRED"] = "REFRESH_TOKEN_EXPIRED";
    errorType["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    errorType["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    errorType["BAD_REQUEST"] = "BAD_REQUEST";
    errorType["UNAUTHORIZED"] = "UNAUTHORIZED";
    errorType["TOO_MANY_REQUESTS"] = "TOO_MANY_REQUESTS";
    errorType["NOT_FOUND"] = "NOT_FOUND";
    errorType["FORBIDDEN"] = "FORBIDDEN";
})(errorType || (errorType = {}));
export class appError extends Error {
    statusCode;
    type;
    constructor(statusCode, message, type) {
        super(message); // this will allow us to user err.message in the handleError utility file
        this.statusCode = statusCode;
        this.type = type;
    }
}
// creating this error class allows us to do:
// throw appError(404, "The requested resourse was not found")
// then we will use fallback in conltroller for :
// catch(e: any){handleError(e)}
// where handleError will handle different instances of errors like zod error, this custom appError and other if we make more in the future
//# sourceMappingURL=errors.js.map