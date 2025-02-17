/**
 * Author: Deepanshu
 * Date: 2025-01-28
 * Description: Controller for Attendance Management System
 * License: MIT
 */

import { STATUS_CODES } from '../constants/statusCodeConstants.js'
import { getAttendanceOverviewService ,getMarkInAttendanceCountService,getUserAttendanceAndProjectDetailsService} from '../services/attendanceService.js'
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
import { fetchCheckedInEmployees, getEmployeesByProject } from '../services/employeeService.js';
const prisma = new PrismaClient();
/**
 * Get Attendace Overview of a user by Id.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */

export const getAttendanceOverview = async (req, res) => {
  const { filter, tabValue,id } = req.query
  const userId = req.user?.user_id

  try {
    const result = await getAttendanceOverviewService(userId, filter, tabValue,id)

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
  const { month, year, project_id, tabValue, date, exports, page = 1, limit = 500 , user_id} = req.query;
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
      const result = await getAttendanceService(targetUserId, month, year, project_id, parseInt(page), parseInt(limit), date);
      if(exports == 'true' && tabValue == TAB_VALUES.ME){
        // Export logic remains the same
        const exportAttendanceRecords = result.data.attendance.map(record => ({
          date: new Date(record.attendance_date).toLocaleDateString(),
          attendanceStatus: record.status,
          projectName: record.project_name,
          totalHours: record.total_hours,
          checkInTime: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '-',
          checkOutTime: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'
        }));

        // Define custom headers for CSV
        const headers = [
          { id: 'date', title: 'Date' },
          { id: 'attendanceStatus', title: 'Attendance Status' },
          { id: 'projectName', title: 'Project Name' },
          { id: 'totalHours', title: 'Total Hours' },
          { id: 'checkInTime', title: 'Check In Time' },
          { id: 'checkOutTime', title: 'Check Out Time' }
        ];

        return await exportToCSV(res, exportAttendanceRecords, "MyAttendance", headers);
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
    //   if (date) {
    //   if (!isNaN(date)) {
    //   if(date!=14)
    //     {
    //       return res.status(STATUS_CODES.BAD_REQUEST).json({
    //         success: false,
    //         status: STATUS_CODES.BAD_REQUEST,
    //         message: RESPONSE_MESSAGES.ERROR.LAST_14_DAYS
    //       }); 
    //     }
    //   }
    // }
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
    
        if (exports == 'true') {
          let exportTeamAttendanceRecords = [];
          
          result.data.employees.forEach(employee => {
              if (employee.attendance.length > 0) {
                  // Only add records for employees who have attendance data
                  employee.attendance.forEach(record => {
                      exportTeamAttendanceRecords.push({
                          employee: employee.employee_details.name,
                          date : record.attendance_date,
                          designation: employee.employee_details.designation || '-',
                          attendanceStatus: record.status,
                          projectName: record.project_name || '-',
                          totalHours: record.total_hours || '0.00',
                          checkInTime: record.check_in_time ? 
                              new Date(record.check_in_time).toLocaleTimeString() : '-',
                          checkOutTime: record.check_out_time ? 
                              new Date(record.check_out_time).toLocaleTimeString() : '-'
                      });
                  });
              }
              // Skip employees with no attendance records
          });
      
          const headers = [
              { id: 'employee', title: 'Employee Name' },
              { id: 'date', title: 'Date' },
              { id: 'designation', title: 'Designation' },
              { id: 'attendanceStatus', title: 'Attendance Status' },
              { id: 'projectName', title: 'Project Name' },
              { id: 'totalHours', title: 'Total Working Hours' },
              { id: 'checkInTime', title: 'Check In Time' },
              { id: 'checkOutTime', title: 'Check Out Time' }
          ];
      
          return await exportToCSV(res, exportTeamAttendanceRecords, "TeamAttendance", headers);
      }


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
  const { dayFilter, tabValue } = req.query;
  try {
  const userId = req.user?.user_id;

  if(!userId){
    throw new APIError(STATUS_CODES.NOT_FOUND,RESPONSE_MESSAGES.ERROR.USER_ID_MISSING);
  }
    const result = await getMarkInAttendanceCountService(userId, dayFilter, tabValue)
    res.status(STATUS_CODES.OK).json({
      success: true,
      message:RESPONSE_MESSAGES.SUCCESS.ATTENDANCE_RECORDS_FETCHED_SUCCESSFULLY,
      data:result
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
    if (!userId) {
      throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING);
    }

    const attendanceDataArray = req.body.attendanceData; // Assuming attendanceData is an array of objects
    if (!Array.isArray(attendanceDataArray) || attendanceDataArray.length === 0) {
      throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.INVALID_ATTENDANCE_DATA);
    }

    const processedData = [];

    for (const attendanceData of attendanceDataArray) {
      const { ucc, faceauthstatus, checkinTime, checkinLat, checkinLon, checkinDeviceId, checkinIpAddress, checkinRemarks, checkinDate, checkInGeofenceStatus } = attendanceData;

      if (faceauthstatus === "no") {
        throw new APIError(STATUS_CODES.NOT_ACCEPTABLE, RESPONSE_MESSAGES.ERROR.INVALID_FACEAUTHSTATUS);
      }

      const markInAttendancedata = {
        ucc_id: ucc,
        check_in_time: checkinTime,
        check_in_lat: checkinLat,
        check_in_lng: checkinLon,
        check_in_device_id: checkinDeviceId,
        check_in_ip_address: checkinIpAddress,
        check_in_remarks: checkinRemarks,
        attendance_date: new Date(checkinTime.replace(' ', 'T')).toISOString(),
        check_in_geofence_status: checkInGeofenceStatus,
        created_by: userId,
        created_at: new Date(),
        user_id:userId
      };

     const attendaceDetails= await saveAttendance(markInAttendancedata);
      processedData.push({
        checkinTime,
        checkinLat,
        checkinLon,
        attendaceId:attendaceDetails[0].attendance_id

      });
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.SUCCESS.ATTENDACE_MARKED_SUCCESSFULLY,
      data: processedData, // Returning processed data of all attendance records
    });

  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        data: [],
      });
    } else {
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }
};


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
      check_out_time:data.checkoutTime,
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
  if(req.body.attendanceData.length == 1){
    responseData ={
      checkoutTime:req.body.attendanceData[0].checkoutTime,
      checkoutLat:req.body.attendanceData[0].checkoutLat,
      checkoutLon:req.body.attendanceData[0].checkoutLon
      }
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message:RESPONSE_MESSAGES.SUCCESS.ATTENDACE_MARKED_OUT_SUCCESSFULLY,
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

/**
 * Controller method for handling the request to fetch checked-in employees based on filter criteria.
 * 
 * This method processes the incoming request, extracts the `userId` from the authenticated user, and 
 * then calls the `fetchCheckedInEmployees` service to get the attendance details for the checked-in employees.
 * It returns the data in a paginated format, along with a success message. If an error occurs during
 * the process (e.g., missing user ID or internal server error), an appropriate error message is returned.
 * 
 * @param {Object} req - The request object containing query parameters (filterType, startDate, endDate, etc.) and user authentication data.
 * @param {Object} res - The response object used to send the response back to the client.
 * @returns {Object} - JSON response with either the success data or error message.
 */
export const checkedInEmployees = async (req, res) => {
  try {
    const userId = req.user.user_id;
    if (!userId) {
      throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING)
    }

    const data = await fetchCheckedInEmployees(req, userId);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data
    });
  } catch (error) {
    if (error instanceof APIError) {
      res.status(error.statusCode).json({
        success: false,
        message: error,
        data: result
      });
    }
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: error.message
    });
  }
}

/**
 * Fetches the list of employees by project based on the provided `userId` and query parameters.
 * It retrieves project details, including employee data, and paginates the results.
 * If the `userId` is missing or the request fails, appropriate error messages are thrown.
 * 
 * @param {Object} req - The request object containing the user details and query parameters
 * @param {Object} res - The response object used to send the final response back to the client
 * 
 * @throws {APIError} - Throws an error if the userId is missing or if any error occurs during the fetch process
 * @returns {Object} - A JSON response containing the success status, employee data, and pagination details
 */
export const fetchEmployeesByProject = async (req, res) => {
  try {
    const userId = req.user.user_id;
    if (!userId) {
      throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING)
    }

    const data = await getEmployeesByProject(req, userId);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data
    });
  } catch (error) {
    console.log("Employees by project :: ", error);
    if (error instanceof APIError) {
      res.status(error.statusCode).json({
        success: false,
        message: error,
        data: result
      });
    }
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: error.message
    });
  }
}

export const getUserTodayAttendanceData =async(req,res)=>{
  const { id } = req.query
  let userId = req.user.user_id;
  try{
  if (!userId) {
    throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING)
  }
  if(id){
    userId = Number(id)
  }
  const result =await getUserAttendanceAndProjectDetailsService(userId)

  return res.status(STATUS_CODES.OK).json({
    success:true,
    message:RESPONSE_MESSAGES.SUCCESS.FETCH_USER_TODAY_ATTENDANCE,
    data:result
  })

}catch(error){
  if (error instanceof APIError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      data: []
    });
  }
  res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
    status: false,
    message: error.message
  });
}
}
