  import { prisma } from '../config/prismaClient.js'
  import { STATUS_CODES } from '../constants/statusCodeConstants.js'
  import { RESPONSE_MESSAGES } from '../constants/responseMessages.js'
  import APIError from '../utils/apiError.js'

  export const getAttendanceService = async (userId, month, year, project_id, page = 1, limit = 10, date) => {
    if (!userId) {
      throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING)
    }
    const employeeDetails = await prisma.user_master.findFirst({
      where: {
        user_id: userId
      },
      select: {
        user_id: true,
        name: true,
        email: true,
        designation: true
      }
    });
  
    if (!employeeDetails) {
      throw new APIError(STATUS_CODES.NOT_FOUND, RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND);
     }

    let dateRange = null;
    if(!date)
    {
     dateRange = calculateDateRange(month, year)
    }
    else{
        dateRange = calculateDateRange(month, year, date);
    }
    
    // if (project_id) {
    //   await validateProject(project_id)
    // }
  
    const { records: attendanceRecords, total, currentPage, totalPages } = 
      await fetchAttendanceRecords(userId, dateRange.startDate, dateRange.endDate, project_id, page, limit)
    
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return getEmptyResponse(dateRange)
    }
  
    const projectDetails = await fetchProjectDetails(attendanceRecords)
    const processedData = processAttendanceData(attendanceRecords, projectDetails);
    
  
    return {
      success: true,
      message: 'Attendance details retrieved successfully',
      status: STATUS_CODES.OK,
      data: {
        employee_details: employeeDetails,
        statistics: processedData.statistics,
        attendance: processedData.groupedAttendance,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        pagination: {
          currentPage,
          totalPages,
          totalRecords: total,
          limit
        }
      },
    }
  }

  export const calculateDateRange = (month, year, date) => {
    let startDate, endDate;
  
    if (date) {
      // Check if date is a number (for last n days) or a specific date string
      if (!isNaN(date)) {
        // If date is a number (e.g., 14 for last 14 days)
       
        const daysToFetch = parseInt(date);
        const currentDate = new Date();
        endDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999));
        startDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - (daysToFetch - 1), 0, 0, 0));
      } else {
        // If date is a specific date string (e.g., "2025-01-28")
        const specificDate = new Date(date);
        startDate = new Date(Date.UTC(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate(), 0, 0, 0));
        endDate = new Date(Date.UTC(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate(), 23, 59, 59, 999));
      }
    } else if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
    } else {
      const currentDate = new Date();
      startDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0));
      endDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999));
    }
  
    return { startDate, endDate };
  };
  
  const validateProject = async (project_id) => {
    const projectExists = await prisma.ucc_master.findFirst({
      where: {
        id: project_id,
      }
    })

    if (!projectExists) {
      throw new APIError(STATUS_CODES.NOT_FOUND, RESPONSE_MESSAGES.ERROR.PROJECT_NOT_FOUND)
    }
  }

  const fetchAttendanceRecords = async (userId, startDate, endDate, project_id, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    
    const records = await prisma.am_attendance.findMany({
      where: {
        user_id: userId,
        attendance_date: {
          gte: startDate,
          lte: endDate,
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
        attendance_date: 'desc',
      },
      skip,
      take: limit
    });
  
    const total = await prisma.am_attendance.count({
      where: {
        user_id: userId,
        attendance_date: {
          gte: startDate,
          lte: endDate,
        },
        ...(project_id && { ucc_id: project_id })
      }
    });
  
    return {
      records,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    };
  }

  const fetchProjectDetails = async (attendanceRecords) => {
    return await prisma.ucc_master.findMany({
      where: {
        id: {
          in: attendanceRecords.map(record => record.ucc_id)
        }
      },
      select: {
        ucc_id: true,
        project_name: true,
        id: true
      }
    })
  }

  const processAttendanceData = (attendanceRecords, projectDetails) => {
    const projectMap = createProjectMap(projectDetails)
    const processedRecords = processAttendanceRecords(attendanceRecords, projectMap)
    
    return {
      statistics: calculateStatistics(processedRecords),
      groupedAttendance: processedRecords
    }
  }

  const createProjectMap = (projectDetails) => {
    return projectDetails.reduce((acc, project) => {
      acc[project.id] = project.project_name
      return acc
    }, {})
  }

  const processAttendanceRecords = (records, projectMap) => {
    return records.map(record => {
      const attendanceDate = new Date(record.attendance_date);
      // Determine status based on check_in_time
      let status = record.check_in_time ? 'Present' : 'Absent';
      if (record.check_in_time) {
        const checkInStatus = record.check_in_geofence_status?.toUpperCase();
        const checkOutStatus = record.check_out_geofence_status?.toUpperCase();
        if (checkInStatus === 'OUTSIDE' || checkOutStatus === 'OUTSIDE') {
          status = 'Offsite_Present';
        }
      }
    
    
      return {
        ...record,
        status,
        total_hours: calculateTotalHours(record.check_in_time, record.check_out_time),
        project_name: projectMap[record.ucc_id] || 'Project Not Found'
      };
    });
  }

  const calculateTotalHours = (checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return '0 Hrs';
  
    try {
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);
      const timeDifference = checkOut.getTime() - checkIn.getTime();
      
      // Convert milliseconds to hours and minutes
      const totalMinutes = Math.floor(timeDifference / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      // Return only hours if minutes is 0
      if (minutes === 0) {
        return `${hours} Hrs`;
      }
      
      return `${hours} Hrs ${minutes} Mins`;
    } catch (e) {
      console.error('Error calculating hours:', e);
      return '0 Hrs';
    }
  }

  const calculateStatistics = (records) => {
    return {
      total: records.length,
      present: records.filter(record => record.chek_in_time).length,
      absent: records.filter(record => record.check_in_time==null).length
     
    }
  }

  const getEmptyResponse = (dateRange) => {
    
    return {
      success: false,
      status : STATUS_CODES.OK,
      message: 'No attendance records found for the specified period',
      data: {
        statistics: {
          total: 0,
          present: 0,
          absent: 0,
          leave: 0,
          total_working_hours: 0
        },
        attendance: [],
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      }
    }
  }

export const processTeamAttendance = async (employeeUserIds, attendanceRecords, totalEmployees, dateRange, date, page = 1, limit = 10) => {
  const currentPage = parseInt(page);
  const itemsPerPage = parseInt(limit);
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  const paginatedEmployeeIds = employeeUserIds.slice(startIndex, startIndex + itemsPerPage);
   
  const employeeDetails = await prisma.user_master.findMany({
      where: {
          user_id: {
              in: paginatedEmployeeIds
          }
      },
      select: {
          user_id: true,
          name: true,
          email: true,
          designation: true
      }
  }); 
  
  const projectDetails = await prisma.ucc_master.findMany({
      where: {
          id: {
              in: [...new Set(attendanceRecords.map(record => record.ucc_id).filter(Boolean))]
          }
      },
      select: {
          id: true,
          project_name: true
      }
  });
  
  const projectMap = projectDetails.reduce((acc, project) => {
      acc[project.id] = project.project_name;
      return acc;
  }, {});
  
  // Changed from object to array
  const employeeWiseAttendance = [];
  
  for (const employee of employeeDetails) {
      let employeeAttendance = attendanceRecords.filter(
          record => record.user_id === employee.user_id
      );

      if (date) {
          if (!isNaN(date)) {
              const daysToFetch = parseInt(date);
              const endDate = new Date();
              const startDate = new Date();
              startDate.setDate(startDate.getDate() - (daysToFetch - 1));
              
              employeeAttendance = employeeAttendance.filter(record => {
                  const recordDate = new Date(record.attendance_date);
                  return recordDate >= startDate && recordDate <= endDate;
              });
          } else {
              
              const targetDate = new Date(date);
              targetDate.setHours(0, 0, 0, 0);
              
              employeeAttendance = attendanceRecords.filter(record => {
                  const recordDate = new Date(record.attendance_date);
                  recordDate.setHours(0, 0, 0, 0);
                  return recordDate.getTime() === targetDate.getTime();
              });
          }
      } else {
          employeeAttendance = employeeAttendance.filter(record => {
              const recordDate = new Date(record.attendance_date);
              return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate;
          });
      }
  
      const processedAttendance = employeeAttendance.map(record => {
          const attendanceDate = new Date(record.attendance_date);
        
          let status = record.check_in_time ? 'Present' : 'Absent';
          if (record.check_in_time) {
            const checkInStatus = record.check_in_geofence_status?.toUpperCase();
            const checkOutStatus = record.check_out_geofence_status?.toUpperCase();
            if (checkInStatus === 'OUTSIDE' || checkOutStatus === 'OUTSIDE') {
              status = 'Offsite_Present';
            }
          }
         
          return {
              ...record,
              status,
              total_hours: calculateTotalHours(record.check_in_time, record.check_out_time),
              project_name: record.ucc_id ? projectMap[record.ucc_id] || 'Project Not Found' : ''
          };
      });
  
      const dateWiseAttendance = [];
      processedAttendance.forEach(record => {
         
          dateWiseAttendance.push(record);
      });

      const statistics = {
          total: processedAttendance.length,
          present: processedAttendance.filter(record => record.check_in_time!=null).length,
          absent: processedAttendance.filter(record => record.check_in_time==null).length
      };
  
      // Push to array instead of adding to object
      employeeWiseAttendance.push({
          employee_details: {
              user_id: employee.user_id,
              name: employee.name,
              email: employee.email,
              designation: employee.designation
          },
          statistics,
          attendance: dateWiseAttendance
      });
  }

  const totalRecords = employeeUserIds.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  
  return {
      success: true,
      message: 'Attendance details retrieved successfully',
      status: STATUS_CODES.OK,
      data: {
          total_employees: totalEmployees,
          employees: employeeWiseAttendance, // Now this is an array
          dateRange: {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
          },
          pagination: {
              currentPage,
              totalPages,
              totalRecords,
              limit: itemsPerPage,
              hasNextPage: currentPage < totalPages,
              hasPreviousPage: currentPage > 1
          }
      },
  };
};

  const calculateTotalWorkingHours = (attendance) => {
    return attendance.reduce((total, record) => {
      if (record.check_in_time && record.check_out_time) {
        const checkIn = new Date(record.check_in_time);
        const checkOut = new Date(record.check_out_time);
        return total + (checkOut - checkIn) / (1000 * 60 * 60);
      }
      return total;
    }, 0).toFixed(2);
  };

  const groupAttendanceByDate2 = (attendance) => {
    const dateWiseAttendance = {};
    for (const record of attendance) {
      const date = record.attendance_date.toISOString().split('T')[0];
      if (!dateWiseAttendance[date]) {
        dateWiseAttendance[date] = [];
      }
      dateWiseAttendance[date].push(record);
    }
    return dateWiseAttendance;
  };
