export enum errorType {
  ACCESS_TOKEN_EXPIRED,
  REFRESH_TOKEN_EXPIRED,
  INVALID_CREDENTIALS,
  USER_NOT_FOUND,
  BAD_REQUEST,
  UNAUTHORIZED,
  TOO_MANY_REQUESTS,
}

export class appError extends Error {
  statusCode: number;
  type: errorType | undefined;

  constructor(statusCode: number, message: string, type?: errorType) {
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
