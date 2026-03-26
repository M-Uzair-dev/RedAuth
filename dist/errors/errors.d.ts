export declare enum errorType {
    ACCESS_TOKEN_EXPIRED = 0,
    REFRESH_TOKEN_EXPIRED = 1,
    INVALID_CREDENTIALS = 2,
    USER_NOT_FOUND = 3,
    BAD_REQUEST = 4,
    UNAUTHORIZED = 5
}
export declare class appError extends Error {
    statusCode: number;
    type: errorType | undefined;
    constructor(statusCode: number, message: string, type?: errorType);
}
//# sourceMappingURL=errors.d.ts.map