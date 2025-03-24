/**
 * @author Deepak
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prismaClient.js";
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import APIError from "../utils/apiError.js";
import { logger } from "../utils/logger.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";

/**
 * Fetches all ucc_ids associated with the given user_id.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<string[]>} - A list of ucc_id strings.
 */
async function fetchUccIdsForUser(userId, req) {
    logger.info({
        message: 'Fetching UCC IDs for the given user.',
        method: req.method,
        url: req.url,
        status: STRING_CONSTANT.SUCCESS,
        time: new Date().toISOString(),
    });
    const attendance = await prisma.ucc_user_mappings.findMany({
        where: {
            user_id: parseInt(userId),
        },
        select: {
            ucc_id: true,
        },
    });

    if (attendance.length === 0) {
        logger.info({
            message: "No Ucc found for the given user's user id.",
            method: req.method,
            url: req.url,
            status: STRING_CONSTANT.SUCCESS,
            time: new Date().toISOString(),
        });
        throw new APIError(STATUS_CODES.NOT_FOUND, RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOUND);
    }

    const uccIds = attendance.map(att => att.ucc_id);

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

    logger.info({
        message: "Project names based on UCC fetched successfully.",
        method: req.method,
        url: req.url,
        status: STRING_CONSTANT.SUCCESS,
        time: new Date().toISOString(),
    });

    // Return the ucc_id and project_name pairs.
    return uccProjectNames.map(row => ({
        ucc_id: row.permanent_ucc,
        project_name: row.project_name,
        isNearest: false
    }));
}

/**
 * Fetches the nearest ucc and calculates the distance from the provided lat, long.
 * @param {number} lat - Latitude of the user.
 * @param {number} long - Longitude of the user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Object>} - Returns an object containing all UCCs, nearest UCC, and message.
 */
export async function getUccDetails(lat, long, userId, req) {
    if (isNaN(lat) || isNaN(long)) {
        throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.INVALID_LAT_LNG);
    }

    const uccs = await fetchUccIdsForUser(userId, req);

    if (uccs.length === 0) {
        return {
            statusCode: 404,
            message: RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOR_USERID,
            allUccs: [],
            nearestUcc: null,
            message: RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOUND
        };
    }

    const uccIds = uccs.map(ucc => ucc.ucc_id);

    const result = await prisma.$queryRaw`
            SELECT 
                cs."UCC", 
                public.ST_Distance(public.ST_SetSRID(public.ST_MakePoint(${parseFloat(lat)}, ${parseFloat(long)}), 4326), cs.geom) AS distance_in_meters,
                cs."ProjectName"
            FROM 
                nhai_gis."UCCSegments" cs
            LEFT JOIN
                tenant_nhai.ucc_master um
            ON
                cs."UCC" = um.permanent_ucc
            WHERE 
                cs."UCC" IN (${Prisma.join(uccIds)});
        `;
    console.log('result ', result);
    if (result.length === 0) {

        return {
            statusCode: STATUS_CODES.NOT_FOUND,
            allUccs: uccIds,
            nearestUcc: null,
            message: RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOUND,
        };
    }

    logger.info({
        message: "Distance for given UCC is fetched Successfully..",
        method: req.method,
        url: req.url,
        status: 'success',
        time: new Date().toISOString(),
    });

    const sortedUccs = result.sort((a, b) => a.distance_in_meters - b.distance_in_meters);

    const nearestUcc = sortedUccs[0];

    const isHoliday = await checkHoliday();

    const status = nearestUcc.distance_in_meters > 200
        ? { message: RESPONSE_MESSAGES.SUCCESS.OUTSIDE_WORK_AREA, geoFenceStatus: STRING_CONSTANT.OUTSIDE }
        : { message: RESPONSE_MESSAGES.SUCCESS.INSIDE_WORK_AREA, geoFenceStatus: STRING_CONSTANT.INSIDE };

    const uccsWithDetails = uccs.map((ucc) => {
        const mappedData = result.find(r => r.ucc === ucc.ucc_id);
        console.log('mapped Data ', mappedData);
        ucc["distance_in_meters"] = mappedData?.distance_in_meters || null;;
        ucc.isNearest = ucc.ucc_id === nearestUcc.ucc;
        ucc['message'] = status.message;
        ucc.project_name = mappedData?.ProjectName || null;

        return ucc;
    });

    return {
        status,
        uccs: uccsWithDetails,
        holidayDetails: {
            holiday_name: isHoliday.holiday_name,
            holiday_Date: isHoliday.holiday_Date,
            region: isHoliday.region,
            holiday_type: isHoliday.holiday_type
        }
    };
}

async function checkHoliday() {
    const result = await prisma.holiday_master.findFirst({
        where: {
            holiday_Date: new Date()
        }
    });

    return result ? result : {};
}

export async function getUccsBuffer(userId, req) {
    try {
        const uccs = await fetchUccIdsForUser(userId, req);

        if (uccs.length === 0) {
            return {
                statusCode: 404,
                message: RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOR_USERID,
                data: [],
                message: RESPONSE_MESSAGES.SUCCESS.NO_UCC_FOUND
            };
        }

        const uccIds = uccs.map(ucc => ucc.ucc_id);

        const result = await prisma.$queryRaw`
            SELECT DISTINCT ON (cs."UCC") 
                cs."ID"::integer AS "ID",
                cs."ProjectName",
                cs."State",
                public.ST_AsGeoJSON(cs.geom) AS geom_geojson,
                cs."UCC"
                FROM 
                    nhai_gis."UCCSegments" cs
                LEFT JOIN
                    tenant_nhai.ucc_master um
                ON
                    cs."UCC" = um.permanent_ucc
                WHERE 
                    cs."UCC" IN (${Prisma.join(uccIds)})
                ORDER BY cs."UCC", cs."ID";
          `;

        return result.map(row => {
            const geojson = JSON.parse(row.geom_geojson);
        
            if (geojson.type === "MultiLineString") {
                // Flatten MultiLineString to a single LineString
                geojson.type = "LineString";
                geojson.coordinates = geojson.coordinates.flat(); // Merge all coordinate arrays
            }
        
            return {
                ...row,
                geom_geojson: geojson,
            };
        });
    } catch (error) {
        throw error;
    }
}
