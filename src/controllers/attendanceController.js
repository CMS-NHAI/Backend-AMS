/**
 * Author: Deepanshu
 * Date: 2025-01-28
 * Description: Controller for Attendance Management System
 * License: MIT
 */

import { STATUS_CODES } from '../constants/statusCodeConstants.js'
import { getAttendanceOverviewService } from '../services/attendanceService.js'
import APIError from '../utils/apiError.js'

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

export const getAttendanceDetails = async (req, res) => {
  const { month, year , project_id } = req.query;
  const userId = req.user.user_id;
  
  try {
    let startDate, endDate;

    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      // Create date range with UTC to avoid timezone issues
      startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
    } else {
      // Default to current month with same UTC handling
      const currentDate = new Date();
      startDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0));
      endDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999));
    }
    if (project_id) {
      const projectExists = await prisma.ucc_master.findFirst({
        where: {
          id: project_id,
        }
      });

      if (!projectExists) {
        return res.status(200).json({
          success: false,
          message: 'Project not found',
          data: null
        });
      }
    }


    const attendanceRecords = await prisma.am_attendance.findMany({
      where: {
        user_id: userId,
        attendance_date: {
          gte: startDate,
          lte: endDate,
        },
        is_active: true,
        ...(project_id && { ucc_id: project_id })
      },
      select: {
        attendance_id: true,
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
        attendance_date: 'desc',
      },
    });
    
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No attendance records found for the specified period',
        data: {
          statistics: {
            total: 0,
            present: 0,
            absent: 0,
            leave: 0,
            total_working_hours: 0
          },
          attendance: {},
          dateRange: {
            startDate,
            endDate,
          },
        }
      });
    }
    const projectDetails = await prisma.ucc_master.findMany({
      where: {
        id: {
          in: attendanceRecords.map(record => record.ucc_id)
        }
      },
      select: {
        ucc_id: true,
        project_name: true,
        id : true
      }
    });
     console.log(projectDetails);
    const projectMap = projectDetails.reduce((acc, project) => {
      acc[project.id] = project.project_name;
      return acc;
    }, {});

    const processedRecords = attendanceRecords.map(record => {
      let totalHours = 0;
      
      if (record.check_in_time && record.check_out_time) {
        try {
          // Convert the datetime strings to Date objects
          const checkIn = new Date(record.check_in_time);
          const checkOut = new Date(record.check_out_time);
          
          // Calculate the difference in milliseconds
          const timeDifference = checkOut.getTime() - checkIn.getTime();
          
          // Convert milliseconds to hours and round to 2 decimal places
          totalHours = Math.round((timeDifference / (1000 * 60 * 60)) * 100) / 100;
        } catch (e) {
          console.error('Error calculating hours:', e);
          console.log('Check-in:', record.check_in_time);
          console.log('Check-out:', record.check_out_time);
          totalHours = 0;
        }
      }
    
      return {
        ...record,
        total_hours: totalHours || 0,
        project_name: projectMap[record.ucc_id] || 'Project Not Found'
      };
    });

    const statistics = {
      total: processedRecords.length,
      present: processedRecords.filter(record => record.status === 'PRESENT').length,
      absent: processedRecords.filter(record => record.status === 'ABSENT').length,
      leave: processedRecords.filter(record => record.status === 'LEAVE').length,
      total_working_hours: Math.round(processedRecords.reduce((sum, record) => sum + record.total_hours, 0) * 100) / 100,
    };

    const groupedAttendance = processedRecords.reduce((acc, record) => {
      const date = record.attendance_date.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      message: 'Attendance details retrieved successfully',
      data: {
        statistics,
        attendance: groupedAttendance,
        dateRange: {
          startDate,
          endDate,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching attendance details:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message
    });
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
      return res.status(200).json({
        success: false,
        message: 'No projects found',
        data: []
      });
    }

    
    return res.status(200).json({
      success: true,
      message: 'Projects retrieved successfully',
      data: projects
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({
      success: false,
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