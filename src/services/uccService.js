import { Prisma } from "@prisma/client";
import { prisma } from "../config/prismaClient.js";
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import APIError from "../utils/apiError.js";
import { logger } from "../utils/logger.js";

/**
 * Fetches all ucc_ids associated with the given user_id.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<string[]>} - A list of ucc_id strings.
 */
async function fetchUccIdsForUser(userId) {
    try {
        const attendance = await prisma.am_attendance.findMany({
            where: {
                user_id: parseInt(userId),
            },
            select: {
                ucc_id: true,
            },
        });

        if (attendance.length === 0) {
            throw new APIError(RESPONSE_MESSAGES.ERROR.UCC_NOT_FOUND);
        }

        return attendance.map(att => att.ucc_id);
    } catch (error) {
        logger.error({
            message: RESPONSE_MESSAGES.ERROR.UNABLE_TO_FETCH_UCC,
            error: error,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });
        throw new APIError(RESPONSE_MESSAGES.ERROR.UNABLE_TO_FETCH_UCC);
    }
}

/**
 * Fetches the nearest ucc and calculates the distance from the provided lat, long.
 * @param {number} lat - Latitude of the user.
 * @param {number} long - Longitude of the user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Object>} - Returns an object containing all UCCs, nearest UCC, and message.
 */
export async function getUccDetails(lat, long, userId) {
    try {
        if (isNaN(lat) || isNaN(long)) {
            throw new APIError(RESPONSE_MESSAGES.ERROR.INVALID_LAT_LNG);
        }

        const uccIds = await fetchUccIdsForUser(userId);

        if (uccIds.length === 0) {
            return {
                allUccs: [],
                nearestUcc: null,
                message: RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOUND,
            };
        }

        const result = await prisma.$queryRaw`
      SELECT 
        ogc_fid, 
        ucc, 
        public.ST_Distance(public.ST_SetSRID(public.ST_MakePoint(${parseFloat(lat)}, ${parseFloat(long)}), 4326), wkb_geometry) AS distance_in_meters
      FROM 
        nhai_gis.nhaicenterlines
      WHERE 
        ucc IN (${Prisma.join(uccIds)});
    `;

        if (result.length === 0) {
            return {
                allUccs: uccIds,
                nearestUcc: null,
                message: RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOUND,
            };
        }

        const sortedUccs = result.sort((a, b) => a.distance_in_meters - b.distance_in_meters);

        const nearestUcc = sortedUccs[0];

        const message = nearestUcc.distance_in_meters > 200
            ? RESPONSE_MESSAGES.SUCCESS.OUTSIDE_WORK_AREA
            : RESPONSE_MESSAGES.SUCCESS.INSIDE_WORK_AREA;

        return {
            allUccs: uccIds,
            nearestUcc: nearestUcc,
            message: message,
        };

    } catch (error) {
        logger.error({
            message: RESPONSE_MESSAGES.ERROR.UNABLE_TO_FETCH_NEAREST_UCC,
            error: error,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });
        throw new APIError(RESPONSE_MESSAGES.ERROR.UNABLE_TO_FETCH_NEAREST_UCC);
    }
}

