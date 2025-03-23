/**
 * @author Deepak
 */
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import APIError from "../utils/apiError.js";
import { logger } from "../utils/logger.js";

/**
 * Custom error handling middleware that logs the error details and sends the appropriate response to the client.
 * If the error is an instance of `APIError`, it sends a response with the error's status code and message. 
 * For other errors, it sends a generic internal server error response.
 * 
 * @param {Object} req - The request object, used for logging the URL and method.
 * @param {Object} res - The response object, used to send the error response.
 * @param {Error} error - The error object that occurred during the request processing.
 * 
 * @returns {Promise<void>} A promise that resolves when the error response is sent to the client.
 */
export async function errorResponse(req, res, error) {
    logger.error({
        message: error.message,
        error: error,
        url: req.url,
        method: req.method,
        time: new Date().toISOString(),
    });
    if (error instanceof APIError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false, message: RESPONSE_MESSAGES.ERROR.REQUEST_PROCESSING_ERROR
    });
}