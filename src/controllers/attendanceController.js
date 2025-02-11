/**
 * Author: Deepanshu
 * Date: 2025-01-28
 * Description: Controller for Attendance Management System
 * License: MIT
 */

import { STATUS_CODES } from '../constants/statusCodeConstants.js'
import { getAttendanceOverviewService ,getMarkInAttendanceCountService} from '../services/attendanceService.js'
import { getAttendanceService } from '../services/attendanceDetailService.js'
import { getEmployeesHierarchy, getAttendanceForHierarchy } from '../services/attendanceService.js'
import { getTeamAttendance,saveAttendance,updateMarkoutAttendance } from '../services/db/attendaceService.db.js';
import { calculateDateRange } from '../services/attendanceDetailService.js';
import { processTeamAttendance } from '../services/attendanceDetailService.js';
import APIError from '../utils/apiError.js';
import { PrismaClient } from '@prisma/client';
import { TAB_VALUES } from '../constants/attendanceConstant.js';
import { exportToCSV } from '../utils/attendaceUtils.js';
import { RESPONSE_MESSAGES } from '../constants/responseMessages.js';
const prisma = new PrismaClient();
/**
 * Get Attendace Overview of a user by Id.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */

export const getAttendanceOverview = async (req, res) => {
  const { filter, tabValue } = req.query
  // console.log(req,"request");
  const userId = req.user?.user_id
  
  try {
    const result = await getAttendanceOverviewService(userId, filter, tabValue)

    res.status(STATUS_CODES.OK).json({
      success: true,
      message:RESPONSE_MESSAGES.SUCCESS.ANALYTICSFETCHED,
      data:{...result},
    })
  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message, // Send the error message
      });
    }
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message })
  }
}

export const getAttendanceDetails = async (req, res) => {
  const { month, year, project_id, tabValue, date, exports, page = 1, limit = 10 , user_id} = req.query;
  const loggedInUserId = req.user.user_id;
  if(tabValue!=TAB_VALUES.ME && tabValue!=TAB_VALUES.MYTEAM|| !tabValue)
  {
    return res.status(STATUS_CODES.BAD_REQUEST).json({ 
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      message: RESPONSE_MESSAGES.ERROR.MISSING_TAB_VALUE
    });
  }

  if (tabValue != TAB_VALUES.MYTEAM) {
    try {
      
      const targetUserId = (tabValue === TAB_VALUES.ME && user_id) ? parseInt(user_id): loggedInUserId;
      const result = await getAttendanceService(targetUserId, month, year, project_id, parseInt(page), parseInt(limit));
      
      if(exports == 'true' && tabValue == TAB_VALUES.ME){
        // Export logic remains the same
        const exportAttendanceRecords = [];
        for(const[date,records] of Object.entries(result.data.attendance)){
          await records.forEach(record => {
            exportAttendanceRecords.push({
              date,
              attendaceStatus: record.status,
              projectName: record.project_name,
              totalHours: record.total_hours,
              checkOutTime: record.check_out_time,
              checkInTime: record.check_in_time
            });
          });
        }
        return await exportToCSV(res, exportAttendanceRecords, "MyAttendance");
      }
      
      return res.status(STATUS_CODES.OK).json(result);
    } catch (error) {
      if (error instanceof APIError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: error.message
      });
    }
  } else {
    try {
      if (date) {
      if (!isNaN(date)) {
      if(date!=14)
        {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            status: STATUS_CODES.BAD_REQUEST,
            message: RESPONSE_MESSAGES.ERROR.LAST_14_DAYS
          }); 
        }
      }
    }
      const employeesData = await getEmployeesHierarchy(loggedInUserId);
      console.log('employees data ', employeesData);
      const totalEmployees = employeesData?.totalCount;
      const employeeUserIds = await getAttendanceForHierarchy(employeesData.hierarchy);
      console.log('employee user ids ', employeeUserIds);
      const dateRange = calculateDateRange(month, year, date);
      const attendanceRecords = await getTeamAttendance(
        employeeUserIds,
        dateRange.startDate,
        dateRange.endDate,
        project_id
      );
      console.log("attendance records " , attendanceRecords);
      
      const result = await processTeamAttendance(
        employeeUserIds, 
        attendanceRecords, 
        totalEmployees, 
        dateRange,
        date,
        parseInt(page),
        parseInt(limit)
      );
      console.log('result=>>>>>>>>>>>>>>>>> ', result);

      return res.status(STATUS_CODES.OK).json(result);
    } catch (error) {
      // Error handling remains the same
      console.error('Error fetching team attendance:', error);
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: error.message
      });    }
  }
};

export const getAllProjects = async (req, res) => {
  try {
    // Get all active projects from ucc_master
    const projects = await prisma.ucc_master.findMany({

      select: {
        project_name: true,
        id: true,
        tender_id: true,
        tender_details: true,
        temporary_ucc: true,
        permanent_ucc: true,
        ucc_id: true,
        contract_name: true,
        funding_scheme: true,
        status: true,
        stretch_name: true,
        usc: true

      },
      orderBy: {
        project_name: 'asc'  // Sort alphabetically by project name
      }
    });

    // If no projects found
    if (!projects || projects.length === 0) {
      return res.status(STATUS_CODES.OK).json({
        success: false,
        status: STATUS_CODES.OK,
        message: 'No projects found',
        data: []
      });
    }


    return res.status(STATUS_CODES.OK).json({
      success: true,
      status: STATUS_CODES.OK,
      message: 'Projects retrieved successfully',
      data: projects
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      status: STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error.message || 'Internal server error',
      data: []
    });
  }
};

export const getTeamAttendanceCount = async(req,res)=>{
  const { date, tabValue } = req.query;
  try {
  console.log(date,tabValue,"tabvalue")
  const userId = req.user?.user_id;

  if(!userId){
    throw new APIError(STATUS_CODES.NOT_FOUND,RESPONSE_MESSAGES.ERROR.USER_ID_MISSING);
  }
    const result = await getMarkInAttendanceCountService(userId, date, tabValue)

    res.status(STATUS_CODES.OK).json({
      success: true,
      message:RESPONSE_MESSAGES.SUCCESS.ATTENDANCE_RECORDS_FETCHED_SUCCESSFULLY,
      data,
    })
  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message, // Send the error message
      });
    }
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false, message: error.message })
  }




  
}


export const markAttendance = async (req, res) => {
  try {
    const userId = req.user.user_id;
    if(!userId){
      throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING)
    }
    const { ucc,faceauthstatus, checkinTime, checkinLat,checkinLon , checkinDeviceId, checkinIpAddress, checkinRemarks, checkinDate,checkInGeofenceStatus	} = req.body.attendanceData[0]
    if (faceauthstatus == "no") {
      throw new APIError(STATUS_CODES.NOT_ACCEPTABLE, RESPONSE_MESSAGES.ERROR.INVALID_FACEAUTHSTATUS)
    }
    const markInAttendancedata = {
      ucc_id:ucc,
      check_in_time:new Date(checkinTime.replace(' ', 'T')).toISOString(),
      check_in_lat:checkinLat,
      check_in_lng:checkinLon,
      check_in_device_id:checkinDeviceId,
      check_in_ip_address:checkinIpAddress,
      check_in_remarks:checkinRemarks,
      attendance_date:checkinDate,
      check_in_geofence_status:checkInGeofenceStatus,
      created_by:userId,
      created_at:new Date()
    }
    await saveAttendance(markInAttendancedata)

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message:RESPONSE_MESSAGES.SUCCESS.ATTENDACE_MARKED_SUCCESSFULLY,
      data:{
        checkinTime,
        checkinLat,
        checkinLon
      }
    })
  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        data:result
      });
    }
    else {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: error.message
      })
    }
  }
}

export const markOutAttendance=async (req,res)=>{
  try {
    const userId = req.user.user_id;
    if(!userId){
      throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING)
    }
    const attendaces = req.body.attendanceData
    for(const data of attendaces){
    // console.log(data,"data")
    if (data.faceauthstatus == "no") {
      throw new APIError(STATUS_CODES.NOT_ACCEPTABLE, RESPONSE_MESSAGES.ERROR.INVALID_FACEAUTHSTATUS)
    }
    const markOutAttendancedata = {
      attendance_id:data.attendanceId,
      check_out_time:new Date(data.checkoutTime.replace(' ', 'T')).toISOString(),
      check_out_lat:data.checkoutLat,
      check_out_lng:data.checkoutLon,
      check_out_device_id:data.checkoutDeviceId,
      check_out_ip_address:data.checkoutIpAddress,
      check_out_remarks:data.checkoutRemarks,
      check_out_geofence_status:data.checkoutGeofenceStatus,
      updated_by:userId,
      updated_at:new Date()
    }
    await updateMarkoutAttendance(markOutAttendancedata)
  }
let responseData;
  if(req.body.attendanceData.length <=1){
    responseData ={
      checkoutTime:req.body.attendanceData[0].checkoutTime,
      checkoutLat:req.body.attendanceData[0].checkoutLat,
      checkoutLon:req.body.attendanceData[0].checkoutLon
    }
  }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message:RESPONSE_MESSAGES.SUCCESS.ATTENDACE_MARKED_SUCCESSFULLY,
      responseData
    })
  } catch (error) {
    console.log(error,"erorr faced")
    if (error instanceof APIError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        // data:result
      });
    }
    else {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: error.message
      })
    }
  }
}


