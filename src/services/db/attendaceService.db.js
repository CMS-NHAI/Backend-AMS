// dbService.js - Handles database queries
import { prisma } from '../../config/prismaClient.js'
import { RESPONSE_MESSAGES } from '../../constants/responseMessages.js';
import { STATUS_CODES } from '../../constants/statusCodeConstants.js';
import APIError from '../../utils/apiError.js';

export const getUserAttendance = async (userId, startDate, endDate,id) => {
  if(id){
    userId =Number(id);
  }
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
  const existingAttendance = await prisma.am_attendance.findFirst({
    where: {
      user_id: attendance.user_id,
      ucc_id: attendance.ucc_id,
      attendance_date: attendance.attendance_date,
    },
  });
  if(existingAttendance){
    throw new APIError(STATUS_CODES.OK,RESPONSE_MESSAGES.SUCCESS.RECORD_ALREADY_EXISTS)
  }else{
  return await prisma.$queryRaw`
  INSERT INTO tenant_nhai.am_attendance
  ("ucc_id", "check_in_time", "check_in_lat", "check_in_lng", "check_in_loc", "check_in_remarks","check_in_geofence_status", "attendance_date", "created_by", "created_at","user_id")
  VALUES
  (${attendance.ucc_id}, ${attendance.check_in_time}::timestamp, ${attendance.check_in_lat}::numeric, ${attendance.check_in_lng}::numeric, 
    public.ST_GeographyFromText('SRID=4326;POINT(' || ${lat} || ' ' || ${long} || ')'), 
  ${attendance.check_in_remarks},${attendance.check_in_geofence_status}, ${attendance.attendance_date}::date, ${attendance.created_by}, NOW(),${attendance.user_id}) RETURNING "attendance_id"`;
}
}

export const updateMarkoutAttendance =async(attendanceData) =>{

  const lat=attendanceData.check_out_lat
  const long=attendanceData.check_out_lng
    const attendanceExists = await prisma.am_attendance.findMany({
      where:{
        attendance_id:attendanceData.attendance_id
      }
    })

    if(attendanceExists.length == 0 || attendanceExists[0]?.check_out_time != null){
      throw new APIError(STATUS_CODES.BAD_REQUEST,RESPONSE_MESSAGES.ERROR.ATTENDANCE_ALREADY_MARKED)
    }
    if(attendanceExists.length > 0 ){
      const checkOutTime = new Date(attendanceData.check_out_time.replace(' ', 'T') + 'Z');
      const checkInTime = new Date(attendanceExists[0].check_in_time);
      if(checkInTime > checkOutTime){
        throw new APIError(STATUS_CODES.BAD_REQUEST,RESPONSE_MESSAGES.ERROR.CHECKOUT_TIME_IS_INCORRECT)
      }
      
      // const checkinTime = attendanceExists.check
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
    }else{
      return []
    }
}

export const getTeamAttendaceCount=async(ids,whereCondition)=>{
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

export const getTodayAttendance = async (userId, date) => {
  const todayAttendance = await prisma.am_attendance.findMany({
    where: {
      user_id: userId,
      attendance_date: date
    },
    select: {
      ucc_id: true,
      check_in_time: true,
      check_out_time: true,
      attendance_date: true,
      check_in_geofence_status: true,
      check_out_geofence_status: true,
      attendance_id:true
    }
  });

  if (todayAttendance.length === 0) {
    throw new APIError(STATUS_CODES.OK, RESPONSE_MESSAGES.SUCCESS.ATTENDANCE_NOT_MARKED);
  }

  // Get unique UCC IDs to avoid duplicate queries
  const uccIds = (todayAttendance.map((data) => data.ucc_id));

  // Fetch all project data in a single query
  const projectDataMap = await prisma.ucc_master.findMany({
    where: {
      id: { in: uccIds } // Fetch all relevant projects at once
    },
    select: {
      id: true,
      project_name: true
    }
  }).then((projects) =>
    projects.reduce((acc, project) => {
      acc[project.id] = project.project_name;
      return acc;
    }, {})
  );

  // Process attendance data
  const finalAttendanceData = todayAttendance.map((data) => {
    data.project_name = projectDataMap[data.ucc_id] || null;

    if (data.check_in_time) {
      data.attendanceStatus = "Present";
    }

    if (data.check_in_geofence_status) {
      if (
        data.check_in_geofence_status.toLowerCase() === "inside" &&
        data.check_out_geofence_status?.toLowerCase() === "inside"
      ) {
        data.locationStatus = "Onsite";
      } else {
        data.locationStatus = "Offsite";
      }
    }
    if(!data.check_out_time){
      data.check_out_geofence_status = ''
    }

    if (data.check_in_time && data.check_out_time) {
      const totalMilliseconds = data.check_out_time - data.check_in_time;
      data.totalWorkinghrs = `${Math.floor(totalMilliseconds / (1000 * 60 * 60))} hrs ${Math.floor((totalMilliseconds % (1000 * 60 * 60)) / (1000 * 60))} mins`;
    }

    return data;
  });

  return finalAttendanceData;

}

export const getTotalUsers=async (userId,uccId)=>{

  const userCount =  await prisma.ucc_user_mappings.findMany({
    distinct: ['user_id'],
    where:{
      ucc_id:uccId
    }
  })
  return userCount.length

}

export const getUsersPresentCount = async (uccId,startDate) => {
const presentCount = await prisma.am_attendance.findMany({
  distinct:['user_id'],
  where:{
    ucc_id:uccId,
    attendance_date:{
      gte:startDate
    }
  }
})
return presentCount
}
