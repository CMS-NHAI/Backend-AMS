/**
 * @author: Deepak
 */

import { getLocationDetails } from "../services/locationService.js";
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
        res.status(200).json({
            success: true,
            data: locationDetails
          });
      
    } catch(err) {
        logger.error({
            message: 'Error Occured while processing request',
            error: err.message,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });
        
    }
}
