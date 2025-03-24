/**
 * @author Deepak
 */
import { prisma } from "../config/prismaClient.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";
import { getTeamUserIds } from "../helpers/attendanceHelper.js";
import { logger } from "../utils/logger.js";

/**
 * Fetches checked-in employees based on the given filters and pagination details.
 * @param {*} req front end request with query params
 * @param {*} userId User ID whose team details need to be fetched
 * @returns {Object} Response with employee details and pagination
 */
export async function fetchCheckedInEmployees(req, userId) {
    try {
        logger.info('Fetching attendance records based on the filter.');
        const { limit = 10, page = 1, startDate, endDate, uccId, filterType } = req.query;
        const result = await getTeamUserIds(userId, new Set());
        const userIds = result.userIds;

        const limitInt = parseInt(limit, 10);
        const pageInt = parseInt(page, 10);
        const skip = (pageInt - 1) * limitInt;

        // Validate date range if provided
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        logger.info('Calculating the date range for filtration.');
        const { calculatedStartDate, calculatedEndDate } = getDateRange(filterType, startDate, endDate);

        logger.info('Fetching user mapping data to fetch attendance.');
        const projectUserIds = await prisma.ucc_user_mappings.findMany({
            where: {
                user_id: {
                    in: userIds,
                },
                ucc_id: uccId && uccId !== STRING_CONSTANT.ALL ? uccId : undefined
            },
            select: {
                user_id: true
            }
        });

        logger.info('User mapping data fetched successfully.');

        const filters = {
            attendance_date: {
                gte: calculatedStartDate.toISOString(),
                lte: calculatedEndDate.toISOString(),
            },
            user_id: {
                in: projectUserIds.map(data => data.user_id),
            },
            check_in_time: {
                not: null
            },
            ucc_id: uccId && uccId !== STRING_CONSTANT.ALL ? uccId : undefined
        };

        logger.info('Fetching attendance records based on the user mapping and uccId.');
        const attendanceRecords = await prisma.am_attendance.findMany({
            where: filters,
            skip: skip,
            take: limitInt,
            select: {
                attendance_status: true,
                attendance_date: true,
                user_master: {
                    select: {
                        name: true,
                        designation: true,
                        user_profile_pic_path: true
                    }
                }
            }
        });

        logger.info('Attendance records fetched successfully.');
        const response = attendanceRecords.map(record => ({
            attendanceId: record.attendance_id,
            name: record.user_master.name,
            profilePicPath: record.user_master.user_profile_pic_path,
            designation: record.user_master.designation,
            userId: record.user_id,
            attendanceStatus: record.attendance_status,
            attendanceDate: record.attendance_date
        }));
        return {
            employeeDetails: response,
            checkOutCount: await getCheckOutCount(calculatedStartDate, calculatedEndDate, projectUserIds, uccId),
            paginationDetails: {
                limit,
                page,
                totalrecords: await getTotalRecords(filters)
            }
        };
    } catch (err) {
        logger.error(err);
        throw err;
    }
}

/**
 * Calculates the start and end date based on the filter type.
 * @param {string} filterType - Type of filter to apply ('Today', 'TWO WEEKS', or 'Custom')
 * @param {string} startDate - Custom start date (if filterType is 'Custom')
 * @param {string} endDate - Custom end date (if filterType is 'Custom')
 * @returns {Object} - Contains calculated start and end dates.
 */
export function getDateRange(filterType, startDate, endDate) {
    const today = new Date();
    let calculatedStartDate, calculatedEndDate;

    switch (filterType.toUpperCase()) {
        case 'TODAY':
            calculatedStartDate = today;
            calculatedEndDate = today;
            break;

        case 'TWO WEEKS':
            calculatedStartDate = new Date(today);
            calculatedStartDate.setDate(today.getDate() - 14);
            calculatedEndDate = today;
            break;

        case 'CUSTOM':
            if (!startDate || !endDate) {
                throw new Error('Start Date and End Date are required for Custom filter');
            }
            const start = new Date(startDate);
            const end = new Date(endDate);

            // Ensure custom range does not exceed 2 months
            if (end - start > 60 * 24 * 60 * 60 * 1000) {
                throw new Error('Custom date range cannot exceed two months');
            }

            calculatedStartDate = start;
            calculatedEndDate = end;
            break;

        default:
            calculatedStartDate = today;
            calculatedEndDate = today;
    }

    return { calculatedStartDate, calculatedEndDate };
}

/**
 * Get the total number of records for pagination.
 * 
 * @param {Object} filters - Object containing filters.
 * @returns {Number} - Total count of attendance records.
 */
async function getTotalRecords(filters) {
    return await prisma.am_attendance.count({
        where: filters
    });
}

/**
 * Fetches team records for employees managed by the Team Head,
 * applying pagination and optional filtering based on uccId.
 * 
 * @param {Object} req - The request object containing query and route parameters for pagination and uccId filter.
 * @param {string} userId - The reporting manager's userId used to fetch their team's userIds.
 * 
 * @returns {Object} - Returns an object containing:
 *   - `employeeDetails`: A list of employee details with pagination applied.
 *   - `paginationDetails`: Contains the pagination metadata, including limit, page, and total records.
 * 
 * @throws {Error} - Throws an error if there is any issue while fetching the data.
 */
export async function getEmployeesByProject(req, userId) {
    try {
        logger.info('Fetching employee details based on project.');
        logger.info('Fetching team user ids based on parent userId.');
        const result = await getTeamUserIds(userId, new Set());
        logger.info('Team user ids fetched successfully.');

        const userIds = result.userIds;
        const { limit = 10, page = 2 } = req.query;
        const uccId = req.params.uccId;

        const limitInt = parseInt(limit, 10);
        const pageInt = parseInt(page, 10);
        const skip = (pageInt - 1) * limitInt;

        const filters = {
            user_id: {
                in: userIds,
            },
            ucc_id: uccId && uccId !== STRING_CONSTANT.ALL ? uccId : undefined
        };
        const projectUserIds = await prisma.ucc_user_mappings.findMany({
            where: filters,
            select: {
                user_id: true
            }
        });

        logger.info('Fetching user records based on the filter.');
        const uniqueUserIds = [...new Set(projectUserIds.map(data => data.user_id))];
        const employeeDetails = await prisma.user_master.findMany({
            where: {
                user_id: {
                    in: uniqueUserIds
                }
            },
            skip: skip,
            take: limitInt,
            select: {
                user_id: true,
                name: true,
                designation: true,
                user_profile_pic_path: true
            }
        });

        logger.info('User records fetched successfully.');
        return {
            employeeDetails,
            paginationDetails: {
                limit,
                page,
                totalrecords: employeeDetails.length
            }
        };
    } catch (err) {
        logger.error(err);
        throw err;
    }
}

async function getCheckOutCount(calculatedStartDate, calculatedEndDate, projectUserIds, uccId) {
    logger.info('Calculating check out count of  my team.');
    return await prisma.am_attendance.count({
        where: {
            attendance_date: {
                gte: calculatedStartDate.toISOString(),
                lte: calculatedEndDate.toISOString(),
            },
            user_id: {
                in: projectUserIds.map(data => data.user_id),
            },
            check_in_time: null,
            ucc_id: uccId && uccId !== STRING_CONSTANT.ALL ? uccId : undefined
        }
    });
}