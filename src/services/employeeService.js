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
        const result = await getTeamUserIds(userId, new Set());

        const userIds = result.userIds;
        const { limit = 10, page = 2, startDate, endDate, uccId, filterType } = req.query;

        const limitInt = parseInt(limit, 10);
        const pageInt = parseInt(page, 10);
        const skip = (pageInt - 1) * limitInt;

        // Validate date range if provided
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        const { calculatedStartDate, calculatedEndDate } = getDateRange(filterType, startDate, endDate);

        const filters = {
            attendance_date: {
                gte: calculatedStartDate.toISOString(),
                lte: calculatedEndDate.toISOString(),
            },
            user_id: {
                in: userIds,
            },
            check_in_time: {
                not: null
            },
            ucc_id: uccId && uccId !== STRING_CONSTANT.ALL ? uccId : undefined
        };

        const attendanceRecords = await prisma.am_attendance.findMany({
            where: filters,
            skip: skip,
            take: limitInt,
            include: {
                user_master: {
                    select: {
                        name: true,
                        designation: true,
                        user_profile_pic_path: true
                    }
                }
            }
        });

        const response = attendanceRecords.map(record => ({
            attendanceId: record.attendance_id,
            name: record.user_master.name,
            profilePicPath: record.user_master.user_profile_pic_path,
            designation: record.user_master.designation,
            userId: record.user_id
        }));

        return {
            employeeDetails: response,
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
function getDateRange(filterType, startDate, endDate) {
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
            throw new Error('Invalid filter type');
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
 * Fetches attendance records for employees managed by the reporting manager (userId),
 * applying pagination and optional filtering based on uccId.
 * 
 * @param {Object} req - The request object containing query parameters for pagination and uccId filter.
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
        const result = await getTeamUserIds(userId, new Set());

        const userIds = result.userIds;
        const { limit = 10, page = 2, uccId } = req.query;

        const limitInt = parseInt(limit, 10);
        const pageInt = parseInt(page, 10);
        const skip = (pageInt - 1) * limitInt;

        const filters = {
            user_id: {
                in: userIds,
            },
            ucc_id: uccId && uccId !== STRING_CONSTANT.ALL ? uccId : undefined
        };
        const attendanceRecords = await prisma.am_attendance.findMany({
            where: filters,
            skip: skip,
            take: limitInt,
            include: {
                user_master: {
                    select: {
                        name: true,
                        designation: true,
                        user_profile_pic_path: true
                    }
                }
            }
        });

        const response = attendanceRecords.map(record => ({
            attendanceId: record.attendance_id,
            name: record.user_master.name,
            profilePicPath: record.user_master.user_profile_pic_path,
            designation: record.user_master.designation,
            userId: record.user_id
        }));

        return {
            employeeDetails: response,
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
