/**
 * @author Deepak
 */

import { Prisma } from '@prisma/client';
import { prisma } from "../config/prismaClient.js";
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";
import { LocationServiceError } from "../exception/LocationServiceError.js";
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
    let response;

    if (!userId || !date || !uccNo || !type) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ message: RESPONSE_MESSAGES.ERROR.INVALID_REQUEST });
    }

    try {
        if (type === STRING_CONSTANT.SINGLE_TYPE) {
            response = await prisma.$queryRaw`
                SELECT 
                attendance_id,
                check_in_lat, 
                check_in_lng, 
                CAST(check_in_loc AS TEXT) AS check_in_loc, 
                check_out_lat, 
                check_out_lng, 
                CAST(check_out_loc AS TEXT) AS check_out_loc, 
                accuracy, 
                geofence_status 
                FROM am_attendance 
                WHERE user_id = ${userId}
                AND attendance_date = CAST(${date} AS DATE) AND ucc_id = ${uccNo};
            `;
        } else if (type === STRING_CONSTANT.MULTIPLE_TYPE) {
            response = await getAttendanceLocationForTeam(userId, date, uccNo);
        } else {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: RESPONSE_MESSAGES.ERROR.INVALID_TYPE });
        }
    } catch (error) {
        logger.error({
            message: 'Error Occured while fetching data from DB',
            error: error,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });
        res.status(500).json({ status: false, message: RESPONSE_MESSAGES.ERROR.SERVERERROR });
    }

    return response;
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

    const teamUserIds = await getTeamUserIds(parentId, new Set());

    const teamLocationDetails = await prisma.$queryRaw`
        SELECT 
        attendance_id, 
        user_id,
        check_in_lat, 
        check_in_lng, 
        CAST(check_in_loc AS TEXT) AS check_in_loc, 
        check_out_lat, 
        check_out_lng, 
        CAST(check_out_loc AS TEXT) AS check_out_loc, 
        accuracy, 
        geofence_status
        FROM am_attendance 
        WHERE user_id IN (${Prisma.join(teamUserIds)})
        AND attendance_date = CAST(${date} AS DATE) AND ucc_id = ${uccNo};
    `;

    return teamLocationDetails;
}

/**
 * Fetch provided userId reporting person's userID's.
 * 
 * @param userId User id for which team user id's need to be fetched.
 * @param visitedUserId Set of user id's for which parent is already traversed.
 * @returns List of team user ID's.
 */
const getTeamUserIds = async (userId, visitedUserId = new Set()) => {
    if (visitedUserId.has(userId)) {
        // Return empty array to prevent infinite recurssion due to circular dependency
        return [];
    }

    visitedUserId.add(userId);

    const teamUserIds = await prisma.user_master.findMany({
        where: {
            parent_id: userId
        }, select: {
            user_id: true
        }
    });

    const memberUserIds = await Promise.all(
        teamUserIds.map(
            async (memberUser) => [memberUser.user_id, ...(await getTeamUserIds(memberUser.user_id, visitedUserId))]
        ));

    return memberUserIds.flat();
}
