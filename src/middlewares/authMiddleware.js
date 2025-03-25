/**
 * @author Deepak
 *
 */
import { prisma } from "../config/prismaClient.js";
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";

/**
 * Middleware to check if the logged-in user has the "PD" (Project Director) designation.
 * 
 * @param {Request} req - The request object containing user details.
 * @param {Response} res - The response object to send errors if authorization fails.
 * @param {NextFunction} next - The next middleware function to proceed if authorized.
 * 
 * @returns {Response | void} - Returns an error response if unauthorized, otherwise calls `next()`.
 * 
 * @throws {Error} If there is an internal server error.
 */
export const isPD = async (req, res, next) => {
    try {
        const loggedInUserId = req?.user?.user_id;
        if (!loggedInUserId) {
            return res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: RESPONSE_MESSAGES.ERROR.NO_USER_ID });
        }

        const user = await prisma.user_master.findUnique({
            where: {
                AND: [
                    { user_id: loggedInUserId },
                    {
                        designation: {
                            equals: STRING_CONSTANT.PD,
                            mode: STRING_CONSTANT.INSENSITIVE
                        }
                    }
                ]
            },
            select: { designation: true }
        });

        if (!user) {
            return res.status(STATUS_CODES.FORBIDDEN).json({ success: false, message: RESPONSE_MESSAGES.ERROR.FORBIDDEN });
        }

        // Check if designation is "PD"
        const isPD = (user.designation || STRING_CONSTANT.NA).toLowerCase() === (req?.user?.designation || STRING_CONSTANT.EMPTY).toLowerCase();

        if (!isPD) {
            return res.status(STATUS_CODES.FORBIDDEN).json({ success: false, message: RESPONSE_MESSAGES.AUTH.ONLY_PD });
        }

        next();

    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};
