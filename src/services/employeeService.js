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
        const { limit = 10, page = 1 } = req.query;
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
                user_profile_pic_path: true,
                is_attendance_disabled: true,
                attendance_disabled_date: true,
                attendance_enabled_date: true
            }
        });

        const today = new Date();
        const attendanceRecords = await prisma.am_attendance.findMany({
            where: {
                user_id: { in: uniqueUserIds },
                attendance_date: today
            },
            select: {
                user_id: true,
                check_in_time: true,
                check_out_time: true,
                check_in_geofence_status: true,
                check_out_geofence_status: true,
                attendance_date: true,
                approval_status: true,
                approval_date: true,
                attendance_status: true
            }
        });

        // Map attendance records to employees
        const attendanceMap = new Map();
        attendanceRecords.forEach(record => {
            const checkIn = record.check_in_time ? new Date(record.check_in_time) : null;
            const checkOut = record.check_out_time ? new Date(record.check_out_time) : null;
            let status = "Absent";

            // Determine status
            if (
                record.check_in_geofence_status === STRING_CONSTANT.OUTSIDE ||
                record.check_out_geofence_status === STRING_CONSTANT.OUTSIDE
            ) {
                status = "Offsite Present";
            } else if (record.check_in_time) {
                status = "Present";
            }

            // Create attendance entry
            const attendanceEntry = {
                check_in_time: checkIn,
                check_out_time: checkOut,
                totalHours: checkIn && checkOut ? (checkOut - checkIn) / (1000 * 60 * 60) : 0, // Convert ms to hours
                status,
                approval_status: record.approval_status,
                approval_date: record.approval_date,
                attendance_status: record.attendance_status
            };

            // If user already has records, append; otherwise, create new array
            if (!attendanceMap.has(record.user_id)) {
                attendanceMap.set(record.user_id, [attendanceEntry]);
            } else {
                attendanceMap.get(record.user_id).push(attendanceEntry);
            }
        });

        // Merge employee details with attendance data
        const employeeDataWithAttendance = employeeDetails.map(emp => ({
            ...emp,
            attendance: attendanceMap.get(emp.user_id) || [] // If no attendance, return null
        }));

        logger.info('User records and attendance data fetched successfully.');

        return {
            employeeDetails: employeeDataWithAttendance,
            paginationDetails: {
                limit,
                page,
                totalrecords: employeeDataWithAttendance.length
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