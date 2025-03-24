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
import { getTeamAttendance, saveAttendance, updateMarkoutAttendance,saveOfflineAttendance } from '../services/db/attendaceService.db.js';
import { calculateDateRange } from '../services/attendanceDetailService.js';
import { processTeamAttendance } from '../services/attendanceDetailService.js';
import APIError from '../utils/apiError.js';
import { PrismaClient } from '@prisma/client';
import { TAB_VALUES } from '../constants/attendanceConstant.js';
import { exportToCSV } from '../utils/attendaceUtils.js';
import { RESPONSE_MESSAGES } from '../constants/responseMessages.js';
import { fetchCheckedInEmployees, getEmployeesByProject } from '../services/employeeService.js';
import { getProjectAttendanceCount } from '../services/projectService.js';
import { calculateTotalHours } from '../services/attendanceDetailService.js';
import { STRING_CONSTANT } from '../constants/stringConstant.js';

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
 
      const employeesData = await getEmployeesHierarchy(loggedInUserId);
      const totalEmployees = employeesData?.totalCount;
      const employeeUserIds = await getAttendanceForHierarchy(employeesData.hierarchy);
      const dateRange = calculateDateRange(month, year, date);
      const attendanceRecords = await getTeamAttendance(
        employeeUserIds,
        dateRange.startDate,
        dateRange.endDate,
        project_id
      );
      

      const result = await processTeamAttendance(
        employeeUserIds,
        attendanceRecords,
        totalEmployees,
        dateRange,
        date,
        parseInt(page),
        parseInt(limit)
      );
      
    
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

export const getTeamAttendanceDetails = async (req, res) => {
  const { month, year, project_id, date, exports, page = 1, limit = 500, offsiteOnly } = req.query;
  const loggedInUserId = req.user.user_id;
  
    try {
      const reqDesignation = req?.user?.designation;
      const userDesignation = await prisma.user_master.findFirst({
        where: {
          user_id: loggedInUserId
        },
        select: {
          designation: true,
          user_id: true
        }
      });
      const isPD = (reqDesignation || STRING_CONSTANT.EMPTY).toLowerCase() == (userDesignation?.designation || STRING_CONSTANT.EMPTY).toLocaleLowerCase();
      const employeesData = await getEmployeesHierarchy(loggedInUserId);
      const employeeUserIds = await getAttendanceForHierarchy(employeesData.hierarchy);
      const dateRange = calculateDateRange(month, year, date);
      const attendanceRecords = await getTeamAttendance(
        employeeUserIds,
        dateRange.startDate,
        dateRange.endDate,
        project_id,
        isPD,
        offsiteOnly
      );
      const employeeDetails = await prisma.user_master.findMany({
        where: {
          user_id: {
            in: employeeUserIds
          }
        },
        select: {
          user_id: true,
          name: true,
          email: true,
          designation: true
        }
      });
      const employeeMap = employeeDetails.reduce((acc, emp) => {
        acc[emp.user_id] = emp;
        return acc;
      }, {});
  
      // Process attendance records
      const processedAttendance = await Promise.all(attendanceRecords.map(async(record) => ({
        ...record,
        ...employeeMap[record.user_id], // Spread employee details into the record
        status: await determineStatus(record),
        total_hours: calculateTotalHours(record.check_in_time, record.check_out_time),
        project_name: await getProjectName(record.ucc_id),
        remarks: `check_in_remark: ${(record.check_in_remarks || STRING_CONSTANT.NA)}, check_out_remark: ${(record.check_out_remarks || STRING_CONSTANT.NA)}`
      })))
      
      const sortedAttendance = processedAttendance.sort((a, b) => {
        return new Date(b.check_in_time) - new Date(a.check_in_time);
      });
  
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedAttendance = sortedAttendance.slice(startIndex, endIndex);

      const result = {
        success: true,
        message: "Attendance details retrieved successfully",
        status: STATUS_CODES.OK,
        data: {
          attendance: paginatedAttendance,
          dateRange: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          },
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(processedAttendance.length / parseInt(limit)),
            totalRecords: processedAttendance.length,
            limit: parseInt(limit),
            hasNextPage: endIndex < processedAttendance.length,
            hasPreviousPage: startIndex > 0
          }
        }
      };
    
      if (exports == 'true') {
        const exportTeamAttendanceRecords = sortedAttendance.map(record => ({
          employee: record.name,
          date: new Date(record.attendance_date).toLocaleDateString(),
          designation: record.designation || '-',
          attendanceStatus: record.status,
          projectName: record.project_name || '-',
          totalHours: record.total_hours || '0.00',
          checkInTime: record.check_in_time ? 
            new Date(record.check_in_time).toLocaleTimeString() : '-',
          checkOutTime: record.check_out_time ? 
            new Date(record.check_out_time).toLocaleTimeString() : '-'
        }));
  
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
  
};

async function checkTotalHoliday() {
    const result = await prisma.holiday_master.findMany({});
    return result ? result : {};
}

export const determineStatus = async (record) => {
  
  // compare holiday date start
  const isHoliday = await checkTotalHoliday();
  if (Array.isArray(isHoliday) && isHoliday.some(holiday => 
    holiday.holiday_Date?.toISOString().slice(0, 10) === record?.attendance_date?.toISOString().slice(0, 10)
  )) {
    return 'Holiday';
  }
  // compare holiday date end

  if (!record.check_in_time) return 'Absent';
  
  const checkInStatus = record.check_in_geofence_status?.toUpperCase();
  const checkOutStatus = record.check_out_geofence_status?.toUpperCase();
  
  if (checkInStatus === 'OUTSIDE' || checkOutStatus === 'OUTSIDE') {
    return 'Offsite_Present';
  }
  return 'Present';
};

export const getProjectName = async (ucc_id) => {
  if (!ucc_id) return 'Project Not Found';
  
  const project = await prisma.ucc_master.findFirst({
    where: { id: ucc_id },
    select: { project_name: true }
  });
  
  return project?.project_name || 'Project Not Found';
};

export const getAllProjects = async (req, res) => {
  try {
    const userId = req.user.user_id; // Get logged in user's ID
    const date = req.query?.date;

    // First get all active UCC mappings for this user
    const userProjects = await prisma.ucc_user_mappings.findMany({
      where: {
        user_id: userId,
        status: 'active'
      },
      select: {
        ucc_id: true
      }
    });
    
    // Extract ucc_ids from mappings
    const userUccIds = userProjects.map(project => project.ucc_id);
    // If no mappings found
    if (!userUccIds.length) {
      return res.status(STATUS_CODES.OK).json({
        success: false,
        status: STATUS_CODES.OK,
        message: 'No projects assigned to user',
        data: []
      });
    }

    // Get projects from ucc_master where ucc_id matches user's mappings
    const projects = await prisma.ucc_master.findMany({
      where: {
        id: {
          in: userUccIds
        }
      },
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
        project_name: 'asc'
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
      data: date ? await getProjectAttendanceCount(req, projects, date) : projects
    });

  } catch (error) {
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

    // Attendance enable/disable logic
    const userData = await checkAttendanceIsAllowedOrNot(userId);

    if(userData.is_attendance_disabled) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: true,
        message: `Your not allowed to mark-in your attendance as it is disabled on ${userData.attendance_disabled_date}.`
      });
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
        attendance_date: new Date(checkinTime.replace(' ', 'T') + 'Z').toISOString(),
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

    // Attendance enable/disable logic
    const userData = await checkAttendanceIsAllowedOrNot(userId);

    if(userData.is_attendance_disabled) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: true,
        message: `Your not allowed to mark-out your attendance as it is disabled on ${userData.attendance_disabled_date}.`
      });
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


export const markOfflineAttendance = async (req, res) => {
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
      const { ucc, faceauthstatus, checkinTime, checkinLat, 
        checkinLon, 
        checkinDeviceId, 
        checkinIpAddress, 
        checkinRemarks, 
        checkinDate, 
        checkInGeofenceStatus, 
        checkoutTime, 
        checkoutDeviceId,
        checkoutIpAddress,
        checkoutGeofenceStatus,
        checkoutRemarks,
        checkoutLat,
        checkoutLon } = attendanceData;

      if (faceauthstatus === "no") {
        throw new APIError(STATUS_CODES.NOT_ACCEPTABLE, RESPONSE_MESSAGES.ERROR.INVALID_FACEAUTHSTATUS);
      }

      const checkinDateTime = new Date(checkinTime.replace(' ', 'T') + 'Z');
      const checkoutDateTime = checkoutTime ? new Date(checkoutTime.replace(' ', 'T') + 'Z') : null;
      if (checkoutDateTime && checkoutDateTime < checkinDateTime) {
        throw new APIError(
          STATUS_CODES.BAD_REQUEST,
          RESPONSE_MESSAGES.ERROR.CHECKOUT_TIME_SHOULD_BE_AFTER_CHECKIN
        );
      }
      // Validate mark in and mark out time difference
      if (checkoutDateTime) {
        const timeDifference = (checkoutDateTime - checkinDateTime) / (1000 * 60 * 60); // Convert ms to hours
        if (timeDifference > 24) {
          throw new APIError(STATUS_CODES.BAD_REQUEST,RESPONSE_MESSAGES.ERROR.CHECKOUT_TIME_SHOULD_BE_LESS_THAN_24_HOURS);
        }
      }
      const markInOfflineAttendancedata = {
        ucc_id: ucc,
        check_in_time: checkinTime,
        check_in_lat: checkinLat,
        check_in_lng: checkinLon,
        check_in_device_id: checkinDeviceId,
        check_in_ip_address: checkinIpAddress,
        check_in_remarks: checkinRemarks,
        attendance_date: new Date(checkinTime.replace(' ', 'T') + 'Z').toISOString(),
        check_in_geofence_status: checkInGeofenceStatus,
        created_by: userId,
        created_at: new Date(),
        user_id: userId,
        check_out_time: checkoutTime,
        check_out_lat: checkoutLat,
        check_out_lng: checkoutLon,
        check_out_device_id: checkoutDeviceId,
        check_out_ip_address: checkoutIpAddress,
        check_out_remarks: checkoutRemarks,
        check_out_geofence_status: checkoutGeofenceStatus,
        updated_by: userId,
        updated_at: new Date()
      };

      const attendaceDetails = await saveOfflineAttendance(markInOfflineAttendancedata);
      processedData.push({
        checkinTime,
        checkinLat,
        checkinLon,
        attendaceId: attendaceDetails[0].attendance_id,
        checkoutTime,
        checkoutLat,
        checkoutLon
      });
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.SUCCESS.ATTENDACE_MARKED_SUCCESSFULLY,
      data: processedData, // Returning processed data of all attendance records
    });

  } catch (error) {
    console.log(error,"error faced")
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
}

async function checkAttendanceIsAllowedOrNot(userId) {
  // Attendance enable/disable logic
  const userData = await prisma.user_master.findUnique({
    where: {
      user_id: userId
    },
    select: {
      is_attendance_disabled: true,
      attendance_disabled_date: true
    }
  });

  return userData;
}
