// dbService.js - Handles database queries
import { prisma } from '../../config/prismaClient.js'

export const getUserAttendance = async (userId, startDate, endDate) => {
  return await prisma.am_attendance.findMany({
    where: {
      user_id: userId,
      is_active: true,
      attendance_date: { gte: startDate, lt: endDate },
    },
  })
}

export const getTeamAttendance = async (userIds, startDate, endDate) => {
  return await prisma.am_attendance.findMany({
    where: {
      user_id: { in: userIds },
      attendance_date: { gte: startDate, lt: endDate },
    },
  })
}
