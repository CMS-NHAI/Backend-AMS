/**
 * @author Deepak
 */
import { prisma } from "../config/prismaClient.js";
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";
import { getTeamUserIds } from "../helpers/attendanceHelper.js";
import APIError from "../utils/apiError.js";
import { logger } from "../utils/logger.js";
import { getTotalUsers, getUsersPresentCount } from "./db/attendaceService.db.js";
import { calculateTotalworkinghours, getTotalWorkingDays, getMonthWiseTotalWorkingDays } from "../helpers/attendanceHelper.js";
/**
 * Fetches project attendance details for a team based on the provided user ID, date, and UCC ID.
 * This function calculates the total employees and present employees percentage for each UCC project
 * related to the reporting manager's team.
 *
 * @param {Object} req - The HTTP request object.
 * @param {number} userId - The reporting manager's user ID to get the team details.
 * @param {string} date - The date for which attendance data is required (in YYYY-MM-DD format).
 * @param {string} ucc_id - The UCC ID to filter data for a specific project or "all" to get data for all projects.
 * @returns {Object} - Returns an object containing the project details.
 * @throws {Error} - Throws an APIError if an issue occurs during database queries or data processing.
 */
export const getProjectDetails = async (req, userId, date, ucc_id, isExport) => {
    try {
        logger.info({
            message: 'Fetching project details.',
            method: req.method,
            url: req.url,
            status: STRING_CONSTANT.INPROGRESS,
            time: new Date().toISOString(),
        });

        // Validate pagination parameters
        const page = parseInt(req.query?.page) || 2;
        const limit = parseInt(req.query?.limit) || 10

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        logger.info({
            message: 'Fetching team details for the reporting manager.',
            method: req.method,
            url: req.url,
            status: STRING_CONSTANT.INPROGRESS,
            time: new Date().toISOString(),
        });
        // Fetch team userIds based on the given reporting manager userId
        const teamDetails = await getTeamUserIds(userId, new Set());
        const teamUserIds = teamDetails.userIds;


        logger.info({
            message: 'Fetching attendance data.',
            method: req.method,
            url: req.url,
            date,
            time: new Date().toISOString(),
        });
        // Fetch attendance data for the team members on the specified date
        const attendanceData = await prisma.am_attendance.findMany({
            where: {
                user_id: {
                    in: teamUserIds,
                },
                attendance_date: new Date(date),
            },
            select: {
                ucc_id: true,
                user_id: true,
                check_in_time: true,
            },
        });

        if (attendanceData.length === 0) {
            logger.error({
                message: 'No attendance records found for the given userID.',
                method: req.method,
                url: req.url,
                date,
                status: STRING_CONSTANT.FAILURE,
                time: new Date().toISOString(),
            });
            throw new APIError(STATUS_CODES.NOT_FOUND, RESPONSE_MESSAGES.SUCCESS.NO_ATENDANCE_RECORD);
        }

        let uccIdsToFetch = [];

        // If "all" is provided as the ucc_id, fetch all UCCs related to the given user_ids
        if (ucc_id === STRING_CONSTANT.ALL) {
            uccIdsToFetch = [...new Set(attendanceData.map(entry => entry.ucc_id))];
        } else {
            uccIdsToFetch = [ucc_id];
        }

        logger.info({
            message: 'Fetching UCC details for the relevant UCC IDs.',
            method: req.method,
            url: req.url,
            status: STRING_CONSTANT.INPROGRESS,
            time: new Date().toISOString(),
        });

        const totalRecords = await prisma.ucc_master.count({
            where: {
                permanent_ucc: {
                    in: uccIdsToFetch,  // Filtering by UCC IDs that are present in attendance data
                },
            },
        });

        const uccDetails = await prisma.ucc_master.findMany({
            where: {
                permanent_ucc: {
                    in: uccIdsToFetch,
                },
            },
            select: {
                ucc_id: true,
                permanent_ucc: true,
                project_name: true,
            },
            take: isExport ? undefined : limit,
            skip: isExport ? undefined : offset,
        });

        const projectDetails = uccDetails.map((ucc) => {
            const uccAttendance = attendanceData.filter(entry => entry.ucc_id.trim() === ucc.permanent_ucc.trim());

            const totalEmployees = uccAttendance.length;

            // Count present employees (those who have check_in_time)
            const presentEmployees = uccAttendance.filter(entry => entry.check_in_time).length;

            const presentPercentage = totalEmployees > 0
                ? ((presentEmployees / totalEmployees) * 100).toFixed(2)
                : 0;

            return {
                project_ucc: ucc.permanent_ucc,
                project_name: ucc.project_name,
                total_employees: totalEmployees,
                present_percentage: presentPercentage,
            };
        });
        logger.info({
            message: 'Returning project details successfully.',
            method: req.method,
            url: req.url,
            projectDetails: projectDetails.length,
            status: STRING_CONSTANT.SUCCESS,
            time: new Date().toISOString(),
        });

        return {
            projectDetails,
            pagination: {
                page: page,
                limit: limit,
                totalRecords: totalRecords,
            },
        };
    } catch (error) {
        throw error
    }
}

export const projectOverviewDetails = async (userId, uccId, days) => {
    try{
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days);
        const totalUsersCount = await getTotalUsers(userId, uccId)
        const totalPresents = await getUsersPresentCount(uccId, startDate)
        const totalWorkHours = await calculateTotalworkinghours(totalPresents)
        const totalDays = await getTotalWorkingDays(days)
        const totalAbsent = totalDays - totalPresents.length
        const attendancePercentage = totalUsersCount > 0 ? (((totalPresents.length / (totalUsersCount * totalDays))) * 100).toFixed(2) : 0
        const averageWorkingHours= totalDays ? (totalWorkHours / totalDays).toFixed(2) : 0
        const avgHours = Math.floor(averageWorkingHours);
        const avgMinutes = Math.round((averageWorkingHours - avgHours) * 60);

        return {
            totalPresent: totalPresents.length,
            attendancePercent: attendancePercentage,
            avgWorkHrs: `${avgHours}hr ${avgMinutes}min`,
            leaves: totalAbsent,
        }
    } catch (error) {
        console.log(error,"error");
        throw new APIError(STATUS_CODES.BAD_REQUEST,error.message)
    }
}

export const projectOverviewDetailsforWeb =async(userId,uccId,startDate,endDate,year,month)=>{

    const projectExists = await prisma.ucc_master.findFirst({
        where:{
            id:uccId
        }
    })
    if(!projectExists){
        throw new APIError(STATUS_CODES.NOT_FOUND,RESPONSE_MESSAGES.ERROR.PROJECT_NOT_FOUND)
    }

    const getProjectWiseAttendance = await prisma.am_attendance.findMany({
      where:{
        user_id:userId,
        ucc_id:uccId,
        attendance_date:{
          gt:startDate,
          lte:endDate
            }
        }
    })
    console.log(getProjectWiseAttendance)
    const totalPresentDays = getProjectWiseAttendance? getProjectWiseAttendance.length : 0
    const totalWorkingDays =await getMonthWiseTotalWorkingDays(year,month)

    const totalAbsents = Math.abs(totalWorkingDays - totalPresentDays)
    const attendancePercentage = totalPresentDays ? (totalPresentDays/totalWorkingDays * 100).toFixed(2) : 0
    const totalWorkHours = await calculateTotalworkinghours(getProjectWiseAttendance)
    const averageWorkingHours=  totalPresentDays? (totalWorkHours / totalWorkingDays).toFixed(2) : 0

    return {
        totalPresentDays,
        totalAbsents,
        averageWorkingHours,
        attendancePercentage
    }
}

/**
 * Retrieves the attendance count for a list of projects on a given date along with project details.
 *
 * This function processes attendance records for the provided list of projects and
 * calculates the number of users who have checked in and the number of users who
 * have not checked in yet, based on the given date.
 *
 * @param {Object} req - The request object containing query parameters and other details.
 * @param {Array} projects - List of projects (each containing a `permanent_ucc` and other project details).
 * @returns {Array} - An array of objects, each containing the project details along with the attendance counts.
 * @throws {Error} - Throws an error if an issue occurs while processing the attendance data.
 */
export const getProjectAttendanceCount = async (req, projects, givenDate) => {
    try {
        const date = new Date(givenDate); // Expected format 'YYYY-MM-DD'

        const projectIds = projects.map(project => project.permanent_ucc);

        const attendanceRecords = await prisma.am_attendance.findMany({
            where: {
                ucc_id: { in: projectIds },
                attendance_date: date,
            },
        });

        const result = projects.map(project => {
            // Filter attendance records for the current project
            const projectAttendance = attendanceRecords.filter(
                (attendance) => attendance.ucc_id === project.permanent_ucc
            );

            // Count checked-in and not checked-in users
            const checkedInCount = projectAttendance.filter(
                (attendance) => attendance.check_in_time !== null
            ).length;

            const notInYetCount = projectAttendance.length - checkedInCount;

            return {
                project_detail: project,
                checked_in_count: checkedInCount,
                not_in_yet_count: notInYetCount,
            };
        });

        return result;
    } catch (error) {
        logger.error({
            message: RESPONSE_MESSAGES.ERROR.REQUEST_PROCESSING_ERROR,
            error: error,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });
        throw error;
    }
}