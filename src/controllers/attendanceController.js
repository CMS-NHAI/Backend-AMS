/**
 * Author: Deepanshu
 * Date: 2025-01-28
 * Description: Controller for Attendance Management System 
 * License: MIT
 */

import { prisma } from "../config/prismaClient.js";
import jwt from "jsonwebtoken";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { getTotalWorkingDays } from "../helpers/helpers.js";
import {getEmployeesHierarchy,getAttendanceForHierarchy} from "../services/attendanceService.js";


/**
 * Get Attendace Overview of a user by Id.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */

export const getAttendanceOverview = async (req, res) => {
  const { filter,tabValue } = req.query;
  // console.log(req,"request");
  const userId = req.user.user_id;
  console.log(userId, "userId");
  try {
    if (!userId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: RESPONSE_MESSAGES.ERROR.USER_ID_MISSING });
    }
    
    if (!filter) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: RESPONSE_MESSAGES.ERROR.MISSING_FILTER });
    }
    
    if (!tabValue) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: RESPONSE_MESSAGES.ERROR.MISSING_TAB_VALUE });
    }

    // Default filter is 'last_7_days'
    let startDate;
    let endDate = new Date(); // Current date

    // Determine the date range based on the filter
    switch (filter) {
      case '30':
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 30); // 30 days ago
        break;
      case '7':
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 7); // 7 days ago
        break;
      case '14':
        startDate = new Date();
        startDate.setDate(1); // Start of current month
        break;
      default:
        return res.status(400).json({ message: RESPONSE_MESSAGES.ERROR.INVALIDFILTER });
    }

    // Fetch attendance records within the date range
    if(tabValue === 'me'){
      const attendanceRecords = await prisma.am_attendance.findMany({
        where: {
          user_id: userId,
          is_active: true,
          attendance_date: {
            gte: startDate,
            lt: endDate
          }
        },
        // orderBy: {
        //   attendance_id: 'asc', // or 'desc' for descending order
        // },
      });
      console.log(attendanceRecords, "attendanceRecords>>>>>");

      if (attendanceRecords.length === 0) {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          status: STATUS_CODES.NOT_FOUND,
          message: RESPONSE_MESSAGES.ERROR.NOATTENDANCERECORDS
        });
      }
      const totalDays = getTotalWorkingDays(filter).length;
      console.log(totalDays, "totalDays");
      const presentDays = attendanceRecords.filter(record => record.status.toUpperCase() == 'PRESENT' || 'LATE').length;
      const absentDays = totalDays - presentDays;
      const attendancePercent = totalDays
        ? ((presentDays / totalDays) * 100).toFixed(2)
        : 0;
      console.log(totalDays, presentDays, absentDays, attendancePercent, "djshsjgdsdgud")
      const totalWorkHours = attendanceRecords.reduce((sum, record) => {
        if (record.check_in_time && record.check_out_time) {
          const checkIn = record.check_in_time
          // new Date(`${record.date}T${record.check_in_time}:00Z`);
          let checkOut = record.check_out_time
          //  new Date(`${record.date}T${record.check_out_time}:00Z`);

          if (checkOut < checkIn) {
            checkOut.setDate(checkOut.getDate() + 1); // Handle midnight crossing
          }//attendanceRecord variable will give the values
          const hours = (checkOut - checkIn) / (1000 * 60 * 60); // Convert ms to hours
          return sum + hours;
        }
      }, 0);

      const avgWorkHours = presentDays
        ? (totalWorkHours / totalDays).toFixed(2)
        : 0;

      res.status(200).json({
        success: true,
        totalPresent: presentDays,
        attendance_percent: attendancePercent,
        work_hrs: avgWorkHours,
        leaves: absentDays,
      })
    }

    if(tabValue ==="myteam"){
      console.log("myteam");
     const assosiatedEmployeesData= await getEmployeesHierarchy(userId)
      console.log(JSON.stringify(assosiatedEmployeesData),"assosiatedEmployeesData")

      const employeesUserIds = await getAttendanceForHierarchy(assosiatedEmployeesData.hierarchy);

      // const attendanceDetails = await prisma.am_attendance.findMany({
      //   where:{

      //   }
      // })

    
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: RESPONSE_MESSAGES.ERROR.SERVERERROR });
  }
};