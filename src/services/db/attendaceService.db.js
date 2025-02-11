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

export const getTeamAttendance = async (employeeUserIds, startDate, endDate, project_id) => {
  return await prisma.am_attendance.findMany({
    where: {
      user_id: {
        in: employeeUserIds
      },
      attendance_date: {
        gte: startDate,
        lte: endDate
      },
      ...(project_id && { ucc_id: project_id })
    },
    select: {
      attendance_id: true,
      user_id: true,
      attendance_date: true,
      status: true,
      check_in_time: true,
      check_out_time: true,
      check_in_lat: true,
      check_in_lng: true,
      check_out_lat: true,
      check_out_lng: true,
      geofence_status: true,
      is_online: true,
      ucc_id: true
    },
    orderBy: {
      attendance_date: 'desc'
    }
  });
};

export const saveAttendance = async (attendance) => {
  const lat = attendance.check_in_lat;
  const long = attendance.check_in_lng;
 try{
  await prisma.$queryRaw`
  INSERT INTO tenant_nhai.am_attendance
  ("ucc_id", "check_in_time", "check_in_lat", "check_in_lng", "check_in_loc", "check_in_remarks","check_in_geofence_status", "attendance_date", "created_by", "created_at")
  VALUES
  (${attendance.ucc_id}, ${attendance.check_in_time}::timestamp, ${attendance.check_in_lat}::numeric, ${attendance.check_in_lng}::numeric, 
    public.ST_GeographyFromText('SRID=4326;POINT(' || ${lat} || ' ' || ${long} || ')'), 
  ${attendance.check_in_remarks},${attendance.check_in_geofence_status}, ${attendance.attendance_date}::date, ${attendance.created_by}, NOW())`;
}catch(error){
  console.log(error,"error occured")
}
}
