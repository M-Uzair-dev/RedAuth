export var errorType;
(function (errorType) {
    errorType[errorType["ACCESS_TOKEN_EXPIRED"] = 0] = "ACCESS_TOKEN_EXPIRED";
    errorType[errorType["REFRESH_TOKEN_EXPIRED"] = 1] = "REFRESH_TOKEN_EXPIRED";
    errorType[errorType["INVALID_CREDENTIALS"] = 2] = "INVALID_CREDENTIALS";
    errorType[errorType["USER_NOT_FOUND"] = 3] = "USER_NOT_FOUND";
    errorType[errorType["BAD_REQUEST"] = 4] = "BAD_REQUEST";
    errorType[errorType["UNAUTHORIZED"] = 5] = "UNAUTHORIZED";
    errorType[errorType["TOO_MANY_REQUESTS"] = 6] = "TOO_MANY_REQUESTS";
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