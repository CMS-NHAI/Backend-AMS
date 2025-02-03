/**
 * @author: Deepak
 */

import { getLocationDetails } from "../services/locationService.js";
import { logger } from "../utils/logger.js";

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
