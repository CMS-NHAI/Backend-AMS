// dbService.js - Handles database queries
import { prisma } from '../../config/prismaClient.js'

export const getUserAttendance = async (userId, startDate, endDate) => {
  return await prisma.am_attendance.findMany({
    where: {
      user_id: userId,
      attendance_date: { gte: startDate, lt: endDate },
    },
  })
}

export const getTeamAttendance = async (employeeUserIds, startDate, endDate, project_id) => {
  return await prisma.am_attendance.findMany({
    where: {
      user_id: {
        in: employeeUserIds
      },
      attendance_date: {
        gte: startDate,
        lt: endDate
      },
      ...(project_id && { ucc_id: project_id }) 
    },
    select: {
      attendance_id: true,
        ucc_id: true,
        check_in_time: true,
        check_in_lat: true,
        check_in_lng: true,
        check_in_loc: true,
        check_in_accuracy: true,
        check_in_device_id: true,
        check_in_ip_address: true,
        check_in_remarks: true,
        check_in_geofence_status: true,
        check_out_time: true,
        check_out_lat: true,
        check_out_lng: true,
        check_out_loc: true,
        check_out_accuracy: true,
        check_out_device_id: true,
        check_out_ip_address: true,
        check_out_remarks: true,
        check_out_geofence_status: true,
        created_by: true,
        created_at: true,
        updated_by: true,
        updated_at: true,
        attendance_date: true,
        user_id: true
    },
    orderBy: {
      attendance_date: 'desc'
    }
  });
};
