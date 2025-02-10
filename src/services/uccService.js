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
            console.log("Failed no attendance found for nearest UCC");
            throw new APIError(RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOUND);
        }

        const uccIds = attendance.map(att => att.ucc_id);
        console.log("ATT UCC :::: ");

        const uccProjectNames = await prisma.ucc_master.findMany({
            where: {
                permanent_ucc: {
                    in: uccIds,
                },
                is_deleted: false,
            },
            select: {
                permanent_ucc: true,
                project_name: true,
            },
        });

        console.log("Project names based on UCC fetched successfully.");
        // Return the ucc_id and project_name pairs.
        return uccProjectNames.map(row => ({
            ucc_id: row.permanent_ucc,
            project_name: row.project_name
        }));
    } catch (error) {
        console.log("EROR nearest UCC :: ", error);
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

        const uccs = await fetchUccIdsForUser(userId);

        if (uccs.length === 0) {
            return {
                statusCode: 404,
                message: "No UCCs found for the user.",
                allUccs: [],
                nearestUcc: null,
                message: RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOUND

            };
        }

        const uccIds = uccs.map(ucc => ucc.ucc_id);

        const result = await prisma.$queryRaw`
            SELECT 
                ogc_fid, 
                cs.ucc, 
                public.ST_Distance(public.ST_SetSRID(public.ST_MakePoint(${parseFloat(lat)}, ${parseFloat(long)}), 4326), cs.wkb_geometry) AS distance_in_meters,
                um.project_name
            FROM 
                nhai_gis.nhaicenterlines cs
            LEFT JOIN
                tenant_nhai.ucc_master um
            ON
                cs.ucc = um.permanent_ucc
            WHERE 
                cs.ucc IN (${Prisma.join(uccIds)});
        `;


        if (result.length === 0) {
            console.log("Unable to calculate distance.");
            return {
                statusCode: 404,
                allUccs: uccIds,
                nearestUcc: null,
                message: RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOUND,
            };
        }

        console.log("Distance for UCC is fetched Successfully..");

        const sortedUccs = result.sort((a, b) => a.distance_in_meters - b.distance_in_meters);

        const nearestUcc = sortedUccs[0];

        const message = nearestUcc.distance_in_meters > 200
            ? RESPONSE_MESSAGES.SUCCESS.OUTSIDE_WORK_AREA
            : RESPONSE_MESSAGES.SUCCESS.INSIDE_WORK_AREA;

        return {
            statusCode: 200,
            allUccs: uccs,
            nearestUcc: nearestUcc,
            message: message,
        };

    } catch (error) {
        console.log("Nearest UCC Error :: ", error);
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

