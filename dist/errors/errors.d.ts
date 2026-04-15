export declare enum errorType {
    ACCESS_TOKEN_EXPIRED = "ACCESS_TOKEN_EXPIRED",
    REFRESH_TOKEN_EXPIRED = "REFRESH_TOKEN_EXPIRED",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    BAD_REQUEST = "BAD_REQUEST",
    UNAUTHORIZED = "UNAUTHORIZED",
    TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
    NOT_FOUND = "NOT_FOUND",
    FORBIDDEN = "FORBIDDEN"
}
export declare class appError extends Error {
    statusCode: number;
    type: errorType | undefined;
    constructor(statusCode: number, message: string, type?: errorType);
}
//# sourceMappingURL=errors.d.ts.map