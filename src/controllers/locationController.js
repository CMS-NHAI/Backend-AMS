/**
 * @author: Deepak
 */

import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { getLocationDetails } from "../services/locationService.js";
import { getUccDetails } from "../services/uccService.js";
import APIError from "../utils/apiError.js";
import { logger } from "../utils/logger.js";

/**
 * Controller to fetch attendance location details.
 * 
 * @param req Request from front-end
 * @param res Response to front-end
 */
export const fetchlocationBydate = async (req, res) => {
    try {
        const locationDetails = await getLocationDetails(req, res);
        res.status(STATUS_CODES.OK).json({
            success: true,
            data: locationDetails
        });

    } catch (err) {
        logger.error({
            message: RESPONSE_MESSAGES.ERROR.REQUEST_PROCESSING_ERROR,
            error: err,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });
        res.status(err.status || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: err.message
        });

    }
}

/**
 * Controller to fetch nearest UCC details.
 * 
 * @param req Request from front-end
 * @param res Response to front-end
 */
export const fetchNearestProject = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { userLat, userLng } = req.query

        const uccDetails = await getUccDetails(userLat, userLng, userId, req);
        res.status(STATUS_CODES.OK).json({
            success: true,
            data: uccDetails
        });
    } catch (err) {
        logger.error({
            message: RESPONSE_MESSAGES.ERROR.REQUEST_PROCESSING_ERROR,
            error: err,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });

        if (err instanceof APIError) {
            res.status(STATUS_CODES.OK).json({
                success: true,
                message: err.message
            })
        }
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: err.message
        });
    }
}
