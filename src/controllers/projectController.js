/**
 * @author Deepak
 */
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { getProjectDetails } from "../services/projectService.js";
import APIError from "../utils/apiError.js";
import { logger } from "../utils/logger.js";

/**
 * Controller to fetch project details.
 * 
 * @param req Request from front-end
 * @param res Response to front-end
 */
export const fetchProjectDetails = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { uccId, date } = req.query;

        if (!uccId || !date) {
            throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.INVALID_REQUEST);
        }
        if (!userId) {
            throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING);
        }

        const data = await getProjectDetails(req, userId, date, uccId);
        res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (error) {
        logger.error({
            message: RESPONSE_MESSAGES.ERROR.REQUEST_PROCESSING_ERROR,
            error: error,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });
        if (error instanceof APIError)
            res.status(error.statusCode).json({ success: false, error: error.message });

        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message
        });
    }
}
