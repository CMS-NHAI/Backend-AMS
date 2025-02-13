// dbService.js - Handles database queries
import { prisma } from '../../config/prismaClient.js'
import { RESPONSE_MESSAGES } from '../../constants/responseMessages.js';
import { STATUS_CODES } from '../../constants/statusCodeConstants.js';
import APIError from '../../utils/apiError.js';

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
        lte: endDate
      },
      ...(project_id && { ucc_id: project_id })
    },
    select: {
      attendance_id: true,
        ucc_id: true,
        check_in_time: true,
        check_in_lat: true,
        check_in_lng: true,
        check_in_accuracy: true,
        check_in_device_id: true,
        check_in_ip_address: true,
        check_in_remarks: true,
        check_in_geofence_status: true,
        check_out_time: true,
        check_out_lat: true,
        check_out_lng: true,
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
  throw new APIError(STATUS_CODES.BAD_REQUEST,RESPONSE_MESSAGES.ERROR.MARKIN_ATTENDANCE_UPDATE_FAILED)
}
}

export const updateMarkoutAttendance =async(attendanceData) =>{

  const lat=attendanceData.check_out_lat
  const long=attendanceData.check_out_lng
  try{
    await prisma.$queryRaw`
    UPDATE tenant_nhai.am_attendance
    SET 
      "check_out_time" = ${attendanceData.check_out_time}::timestamp,
      "check_out_lat" = ${attendanceData.check_out_lat}::numeric,
      "check_out_lng" = ${attendanceData.check_out_lng}::numeric,
      "check_out_loc" = public.ST_GeographyFromText('SRID=4326;POINT(' || ${lat} || ' ' || ${long} || ')'),
      "check_out_remarks" = ${attendanceData.check_out_remarks},
      "check_out_geofence_status" = ${attendanceData.check_out_geofence_status},
      "updated_by" = ${attendanceData.updated_by},
      "updated_at" = NOW()
    WHERE "attendance_id" = ${attendanceData.attendance_id};
  `;
  
  }catch(error){
    throw new APIError(STATUS_CODES.BAD_REQUEST,RESPONSE_MESSAGES.ERROR.MARKOUT_ATTENDANCE_UPDATE_FAILED)
  }
}

export const getTeamAttendaceCount=async(ids,whereCondition)=>{
  console.log(whereCondition,"whereCondition")
  const couemployeesPunchedInToday = await prisma.am_attendance.findMany({
    distinct: ['user_id'],
    where: {
      user_id: {
        in: ids
      },
      attendance_date:whereCondition.attendance_date
    },
    select:{
      user_id:true
    }
  })
  return couemployeesPunchedInToday.length
}
