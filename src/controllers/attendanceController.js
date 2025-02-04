/**
 * Author: Deepanshu
 * Date: 2025-01-28
 * Description: Controller for Attendance Management System
 * License: MIT
 */

import { STATUS_CODES } from '../constants/statusCodeConstants.js'
import { getAttendanceOverviewService } from '../services/attendanceService.js'
import { getAttendanceService } from '../services/attendanceDetailService.js'
import { getEmployeesHierarchy, getAttendanceForHierarchy} from '../services/attendanceService.js'
import { getTeamAttendance } from '../services/db/attendaceService.db.js';
import { calculateDateRange } from '../services/attendanceDetailService.js';
import { processTeamAttendance } from '../services/attendanceDetailService.js';
import APIError from '../utils/apiError.js';


import { PrismaClient } from '@prisma/client';
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
      ...result,
    })
  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message, // Send the error message
      });
    }
    // console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false, message: error.message })
  }
}

// export const getAttendanceDetails = async (req, res) => {

//   const { month, year, project_id , tabValue } = req.query;
//   const userId = req.user.user_id;
//   if(tabValue!='myteam')
//   {
//   try {
//     const result = await getAttendanceService(userId, month, year, project_id);
//     console.log(result);
//     return res.status(result.success ? 200 : 400).json(result);
//   } catch (error) {
//     if (error instanceof APIError) {
//       return res.status(error.statusCode).json({
//         success: false,
//         message: error.message, // Send the error message
//       });
//     }
//     // console.error(error);
//     res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false, message: error.message })
//     return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
//       success: false,
//       status : STATUS_CODES.INTERNAL_SERVER_ERROR,
//       message: error.message
//     });
//   }
// }
// else {
//    const employeesData = await getEmployeesHierarchy(userId)
//       const totalEmployees=employeesData?.totalCount;
//       const employeeUserIds = await getAttendanceForHierarchy(
//         employeesData.hierarchy
//       )
//       console.log(employeeUserIds,"employeeUserIds");
//       const dateRange = calculateDateRange(month, year);
//       const attendanceRecords = await getTeamAttendance(
//         employeeUserIds,
//         dateRange.startDate,
//         dateRange.endDate
//       )
//       console.log("atttendance records " + JSON.stringify(attendanceRecords));
//       res.status(200).json({
//         success: true,
//         message: 'Attendance details retrieved successfully',
//         status : STATUS_CODES.OK,
//         data: {
//           attndance: attendanceRecords,
//           dateRange: {
//             startDate: dateRange.startDate,
//             endDate: dateRange.endDate,
//           },
//         },
//       })
      
// }

  
// };

export const getAttendanceDetails = async (req, res) => {
  const { month, year, project_id, tabValue } = req.query;
  const userId = req.user.user_id;

  if (tabValue != 'myteam') {
    try {
      const result = await getAttendanceService(userId, month, year, project_id);
      console.log(result);
      return res.status(200).json(result);
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
      const employeesData = await getEmployeesHierarchy(userId);
      const totalEmployees = employeesData?.totalCount;
      const employeeUserIds = await getAttendanceForHierarchy(employeesData.hierarchy);
      
      const dateRange = calculateDateRange(month, year);
      const attendanceRecords = await getTeamAttendance(
        employeeUserIds,
        dateRange.startDate,
        dateRange.endDate
      );

      const result = await processTeamAttendance(
        employeeUserIds, 
        attendanceRecords, 
        totalEmployees, 
        dateRange
      );

      return res.status(200).json(result);
      
    } catch (error) {
      console.error('Error fetching team attendance:', error);
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: error.message
      });
    }
  }
};

export const getAllProjects = async (req, res) => {
  try {
    // Get all active projects from ucc_master
    const projects = await prisma.ucc_master.findMany({
      
      select: {
        project_name: true,
        id : true,
        tender_id : true,
        tender_details : true,
        temporary_ucc : true,
        permanent_ucc : true ,
        ucc_id : true,
        contract_name : true,
        funding_scheme : true,
        status : true,
        stretch_name : true,
        usc : true

      },
      orderBy: {
        project_name: 'asc'  // Sort alphabetically by project name
      }
    });

    // If no projects found
    if (!projects || projects.length === 0) {
      return res.status(STATUS_CODES.OK).json({
        success: false,
        status : STATUS_CODES.OK,
        message: 'No projects found',
        data: []
      });
    }

    
    return res.status(STATUS_CODES.OK).json({
      success: true,
      status : STATUS_CODES.OK,
      message: 'Projects retrieved successfully',
      data: projects
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      status : STATUS_CODES.INTERNAL_SERVER_ERROR,
      message: error.message || 'Internal server error',
      data: []
    });
  }
};


 const getTotalWorkingDays = (filterDays) => {
  let days = [];
  for (let i = 1; i <= parseInt(filterDays); i++) {
    let date = new Date();
    date.setDate(date.getDate() - i);
    if (!isSunday(date)) {
      days.push(date);
    }
  }
  return days;
}