import { prisma } from "../config/prismaClient.js";
import { getTeamUserIds } from "../helpers/attendanceHelper.js";

export async function fetchCheckedInEmployees(req, userId) {
    try {
        const result = await getTeamUserIds(userId, new Set());

        const userIds = result.userIds;

        const checkedInEmployeeDetails = await prisma.am_attendance.findMany({
            where: {
                user_id: {
                    in: result.userIds
                },
                check_in_time: {
                    not: null
                }
            }
        });

        return checkedInEmployeeDetails;

    } catch (err) {

    }
}
