import handleError from "../utils/handleError.js";
import tokenService from "../services/token.service.js";
import { appError, errorType } from "../errors/errors.js";
export const getCookies = (req) => {
    return {
        accessToken: req.cookies?.access_token,
        refreshToken: req.cookies?.refresh_token,
    };
};
export const verifyUser = async (req, res, next) => {
    try {
        const { accessToken, refreshToken } = getCookies(req);
        if (!accessToken || !refreshToken) {
            throw new appError(401, "No tokens provided", errorType.UNAUTHORIZED);
        }
        const userId = await tokenService.verifyUser(accessToken, refreshToken);
        req.userId = userId;
        next();
    }
    catch (e) {
        handleError(e, res);
    }
};
//# sourceMappingURL=verifyUser.js.map