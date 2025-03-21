/**
 * @author Deepak
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../config/prismaClient.js";
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";
import { LocationServiceError } from "../exception/LocationServiceError.js";
import { getTeamUserIds } from "../helpers/attendanceHelper.js";
import { logger } from "../utils/logger.js";


/**
 * Fetches and returns attendance location detail with success response 
 * else return error response along with error message and error code.
 * 
 * @param req Request data from front-end
 * @param res Response data to be send to front-end
 * @returns Response object with location details for single or team.
 */
export const getLocationDetails = async (req, res) => {
    const userId = req.user.user_id;
    const date = req.query?.date;
    const uccNo = req.query?.uccNo;
    const type = req.query?.type;
    const attendanceId = req.query?.attendanceId;

    if (!userId || !date || !uccNo || !type) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ message: RESPONSE_MESSAGES.ERROR.INVALID_REQUEST });
    }

    try {
        if (type === STRING_CONSTANT.SINGLE_TYPE) {
            if (!attendanceId) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ message: RESPONSE_MESSAGES.ERROR.INVALID_REQUEST });
            }
            const attendanceData = await prisma.$queryRaw`
                SELECT 
                attendance_id,
                user_id,
                attendance_date,
                check_in_geofence_status,
                check_in_remarks,
                check_in_accuracy,
                check_in_time,
                check_in_lat, 
                check_in_lng, 
                public.ST_AsGeoJSON(check_in_loc) AS check_in_loc, 
                check_out_geofence_status,
                check_out_remarks,
                check_out_accuracy,
                check_out_time,
                check_out_lat, 
                check_out_lng, 
                public.ST_AsGeoJSON(check_out_loc) AS check_out_loc
                FROM tenant_nhai.am_attendance 
                WHERE attendance_id = ${parseInt(attendanceId)}
                AND attendance_date = CAST(${date} AS DATE) AND ucc_id = ${uccNo};
            `;

            const stretchLineData = await getGisData(uccNo);

            if (attendanceData.length > 0) {
                attendanceData[0].check_out_loc = JSON.parse(attendanceData[0].check_out_loc);
                attendanceData[0].check_in_loc = JSON.parse(attendanceData[0].check_in_loc);

                await calculateAndAddDistance(attendanceId, date, uccNo, attendanceData);
            }

            return { attendanceData, stretchLineData };

        } else if (type === STRING_CONSTANT.MULTIPLE_TYPE) {
            const attendanceData = await getAttendanceLocationForTeam(userId, date, uccNo);

            if (attendanceData.length > 0) {
                attendanceData.map(data => {
                    data.check_out_loc = JSON.parse(data.check_out_loc);
                    data.check_in_loc = JSON.parse(data.check_in_loc);
                });
            } else {
                return res.status(200).json({ status: true, data: { message: RESPONSE_MESSAGES.SUCCESS.NO_TEAM_MEMBERS } })
            }


            const stretchLineData = await getGisData(uccNo);

            return { attendanceData, stretchLineData };
        } else {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: RESPONSE_MESSAGES.ERROR.INVALID_TYPE });
        }
    } catch (error) {
        logger.error({
            message: RESPONSE_MESSAGES.ERROR.ERROR_DB_FETCH,
            error: error,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });
        throw error;
    }
}

/**
 * Fetches and returns attendance location detail for single person or for reporting head's team.
 * 
 * @param parentId Parent id for which team details need to be fetched.
 * @param date Date to fetch team attendance location details.
 * @param uccNo UCC number for which team attendance location details.
 * @returns Team members attendance location 
 */
const getAttendanceLocationForTeam = async (parentId, date, uccNo) => {
    const parentIdCheckValue = await prisma.user_master.findUnique({
        where: {
            user_id: parentId
        }
    });

    if (!parentIdCheckValue) {
        throw new LocationServiceError("User id is not available.", STATUS_CODES.BAD_REQUEST);
    }

    const teamUserIds = (await getTeamUserIds(parentId, new Set())).userIds;
    if (teamUserIds.length > 0) {
        const teamLocationDetails = await prisma.$queryRaw`
        SELECT 
            att.attendance_id,
            att.user_id,
            att.attendance_date,
            att.check_in_geofence_status,
            att.check_in_remarks,
            att.check_in_accuracy,
            att.check_in_time,
            att.check_in_lat, 
            att.check_in_lng, 
            public.ST_AsGeoJSON(att.check_in_loc) AS check_in_loc, 
            att.check_out_geofence_status,
            att.check_out_remarks,
            att.check_out_accuracy,
            att.check_out_time,
            att.check_out_lat, 
            att.check_out_lng, 
            public.ST_AsGeoJSON(att.check_out_loc) AS check_out_loc,
            att.attendance_date,
            user_master.name AS full_name,
            user_master.first_name,
            user_master.middle_name,
            user_master.last_name,
            user_master.user_profile_pic_path
        FROM tenant_nhai.am_attendance att
        JOIN 
            tenant_nhai.user_master ON att.user_id = user_master.user_id
        WHERE att.user_id IN (${Prisma.join(teamUserIds)})
        AND att.attendance_date = CAST(${date} AS DATE) AND att.ucc_id = ${uccNo};
    `;

        return teamLocationDetails;
    } else {
        return [];
    }
}

/**
 * Fetch NHAI centerlines data based on given UCC ID.
 * 
 * @param uccId for which centerlines data need to be fetched
 * @returns NHAI Centerlines data including wkb_geometry
 */
async function getGisData(uccId) {

    try {
        const result = await prisma.$queryRaw`
          SELECT 
            "ID",
            "UCC",
            public.ST_AsGeoJSON(geom) AS wkb_geometry  -- Convert geometry to GeoJSON
          FROM nhai_gis."UCCSegments" WHERE "UCC" = ${uccId};
        `;

        if (result.length > 0) {
            result[0].wkb_geometry = JSON.parse(result[0].wkb_geometry);
        }
        return result;
    } catch (error) {
        throw LocationServiceError(RESPONSE_MESSAGES.ERROR.CENTERLINES_ERROR);
    }
}

/**
 * Used to calculate and add the distance between centerlines and employee's attendance points.
 * 
 * @param attendanceId to fetch user data
 * @param attendanceDate to filter data based on date
 * @param uccId to map centerlines data
 * @param attendanceData to map or add the calculated distance
 */
async function calculateAndAddDistance(attendanceId, attendanceDate, uccId, attendanceData) {

    const result = await prisma.$queryRaw`
    WITH check_in_distance AS (
        SELECT 
            a.attendance_id AS source_id,
            r."ID" AS target_id, 
            a.ucc_id AS source_ucc_id,
            r."UCC" AS target_ucc, 
            a.check_in_loc AS check_in_geom,
            r.geom AS road_geom,
            public.ST_Distance(a.check_in_loc, r.geom) AS distance_in_meters,
            CASE 
                WHEN public.ST_DWithin(a.check_in_loc, r.geom, 200) THEN 'Within 200 meters'
                ELSE 'Outside 200 meters'
            END AS distance_message
        FROM 
            tenant_nhai.am_attendance a
        JOIN 
            nhai_gis."UCCSegments" r
        ON 
            a.ucc_id = r."UCC"
        WHERE 
            a.check_in_loc IS NOT NULL
            AND a.attendance_date = CAST(${attendanceDate} AS DATE)
            AND a.ucc_id = ${uccId}
            AND a.attendance_id = ${attendanceId}::integer
    ),
    check_out_distance AS (
        SELECT 
            a.attendance_id AS source_id,
            r."ID" AS target_id, 
            a.ucc_id AS source_ucc_id,
            r."UCC" AS target_ucc, 
            a.check_out_loc AS check_out_geom,
            r.geom AS road_geom,
            public.ST_Distance(a.check_out_loc, r.geom) AS distance_in_meters,
            CASE 
                WHEN public.ST_DWithin(a.check_out_loc, r.geom, 200) THEN 'Within 200 meters'
                ELSE 'Outside 200 meters'
            END AS distance_message
        FROM 
            tenant_nhai.am_attendance a
        JOIN 
            nhai_gis."UCCSegments" r
        ON 
            a.ucc_id = r."UCC"
        WHERE 
            a.check_out_loc IS NOT NULL
            AND a.attendance_date = CAST(${attendanceDate} AS DATE)
            AND a.ucc_id = ${uccId}
            AND a.attendance_id = ${attendanceId}::integer
    )
    SELECT 
        source_ucc_id,
        target_ucc,
        'Check-In' AS location_type,
        distance_in_meters,
        distance_message
    FROM 
        check_in_distance
    UNION ALL
    SELECT 
        source_ucc_id,
        target_ucc,
        'Check-Out' AS location_type,
        distance_in_meters,
        distance_message
    FROM 
        check_out_distance
    ORDER BY 
        source_ucc_id, location_type, distance_in_meters ASC;
    `;

    if (!result)
        throw new LocationServiceError("Unable to calculate the distnace. ");

    attendanceData.forEach(attendance => {
        result.forEach(distanceData => {
            // Add distance_in_meters and distance_message as dynamic keys
            attendance[`${distanceData.location_type.toLowerCase()}_distance`] = distanceData.distance_in_meters;
            attendance[`${distanceData.location_type.toLowerCase()}_distance_message`] = distanceData.distance_message;
        }
        );
    });
}