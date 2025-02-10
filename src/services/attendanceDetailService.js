  import { prisma } from '../config/prismaClient.js'
  import { STATUS_CODES } from '../constants/statusCodeConstants.js'
  import { RESPONSE_MESSAGES } from '../constants/responseMessages.js'
  import APIError from '../utils/apiError.js'

  export const getAttendanceService = async (userId, month, year, project_id, page = 1, limit = 10) => {
    if (!userId) {
      throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING)
    }
  
    const dateRange = calculateDateRange(month, year)
    
    if (project_id) {
      await validateProject(project_id)
    }
  
    const { records: attendanceRecords, total, currentPage, totalPages } = 
      await fetchAttendanceRecords(userId, dateRange.startDate, dateRange.endDate, project_id, page, limit)
    
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return getEmptyResponse(dateRange)
    }
  
    const projectDetails = await fetchProjectDetails(attendanceRecords)
    const processedData = processAttendanceData(attendanceRecords, projectDetails)
  
    return {
      success: true,
      message: 'Attendance details retrieved successfully',
      status: STATUS_CODES.OK,
      data: {
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
      groupedAttendance: groupAttendanceByDate(processedRecords)
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
      const status = record.check_in_time ? 'PRESENT' : 'ABSENT';
    
      // Combine attendance date with check in/out times
      const checkInTime = record.check_in_time ? new Date(
        attendanceDate.getFullYear(),
        attendanceDate.getMonth(),
        attendanceDate.getDate(),
        new Date(record.check_in_time).getHours(),
        new Date(record.check_in_time).getMinutes()
      ).toISOString() : null;
  
      const checkOutTime = record.check_out_time ? new Date(
        attendanceDate.getFullYear(),
        attendanceDate.getMonth(),
        attendanceDate.getDate(),
        new Date(record.check_out_time).getHours(),
        new Date(record.check_out_time).getMinutes()
      ).toISOString() : null;
    
      return {
        ...record,
        status, // Add derived status
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        total_hours: calculateTotalHours(record.check_in_time, record.check_out_time),
        project_name: projectMap[record.ucc_id] || 'Project Not Found'
      };
    });
  }

  const calculateTotalHours = (checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return 0
    
    try {
      const checkIn = new Date(checkInTime)
      const checkOut = new Date(checkOutTime)
      const timeDifference = checkOut.getTime() - checkIn.getTime()
      return Math.round((timeDifference / (1000 * 60 * 60)) * 100) / 100
    } catch (e) {
      console.error('Error calculating hours:', e)
      return 0
    }
  }

  const calculateStatistics = (records) => {
    return {
      total: records.length,
      present: records.filter(record => record.chek_in_time).length,
      absent: records.filter(record => record.check_in_time==null).length,
      total_working_hours: Math.round(records.reduce((sum, record) => sum + record.total_hours, 0) * 100) / 100,
    }
  }

  const groupAttendanceByDate = (records) => {
    return records.reduce((acc, record) => {
      const date = record.attendance_date.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(record)
      return acc
    }, {})

  //   return records.map(record => ({
  //     date: record.attendance_date.toISOString().split('T')[0],
  //     records: [record]
  // })).reduce((acc, curr) => {
  //     const existingDate = acc.find(item => item.date === curr.date);
  //     if (existingDate) {
  //         existingDate.records.push(...curr.records);
  //     } else {
  //         acc.push(curr);
  //     }
  //     return acc;
  // }, []);

//   return records.sort((a, b) => 
//     new Date(b.attendance_date) - new Date(a.attendance_date)
// );

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

  // In a new file, e.g., services/attendanceService.js
//   export const processTeamAttendance = async (employeeUserIds, attendanceRecords, totalEmployees, dateRange, date, page = 1, limit = 10) => {
//     // Calculate pagination
//     const currentPage = parseInt(page);
//     const itemsPerPage = parseInt(limit);
//     const startIndex = (currentPage - 1) * itemsPerPage;
    
//     // Paginate employee IDs
//     const paginatedEmployeeIds = employeeUserIds.slice(startIndex, startIndex + itemsPerPage);
     
//     const employeeDetails = await prisma.user_master.findMany({
//         where: {
//             user_id: {
//                 in: paginatedEmployeeIds
//             }
//         },
//         select: {
//             user_id: true,
//             name: true,
//             email: true,
//             designation: true
//         }
//     }); 
    
//     const projectDetails = await prisma.ucc_master.findMany({
//         where: {
//             id: {
//                 in: [...new Set(attendanceRecords.map(record => record.ucc_id).filter(Boolean))]
//             }
//         },
//         select: {
//             id: true,
//             project_name: true
//         }
//     });
    
//     const projectMap = projectDetails.reduce((acc, project) => {
//         acc[project.id] = project.project_name;
//         return acc;
//     }, {});
    
//     const employeeWiseAttendance = {};
    
//     for (const employee of employeeDetails) {
//         // Filter attendance records for current employee
//         let employeeAttendance = attendanceRecords.filter(
//             record => record.user_id === employee.user_id
//         );

//         // Handle date filtering
//         if (date) {
//             // If date is a number (last n days)
//             if (!isNaN(date)) {
//                 const daysToFetch = parseInt(date);
//                 const endDate = new Date();
//                 const startDate = new Date();
//                 startDate.setDate(startDate.getDate() - (daysToFetch - 1));
                
//                 employeeAttendance = employeeAttendance.filter(record => {
//                     const recordDate = new Date(record.attendance_date);
//                     return recordDate >= startDate && recordDate <= endDate;
//                 });
//             } else {
//                 // If date is a specific date
//                 const targetDate = new Date(date).toISOString().split('T')[0];
//                 employeeAttendance = employeeAttendance.filter(record => 
//                     new Date(record.attendance_date).toISOString().split('T')[0] === targetDate
//                 );
//             }
//         } else {
//             // If no date specified, use dateRange
//             employeeAttendance = employeeAttendance.filter(record => {
//                 const recordDate = new Date(record.attendance_date);
//                 return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate;
//             });
//         }
    
//         const processedAttendance = employeeAttendance.map(record => {
//             const attendanceDate = new Date(record.attendance_date);
            
//             let checkInTime = null;
//             let checkOutTime = null;
            
//             if (record.check_in_time) {
//                 const checkInDate = new Date(record.check_in_time);
//                 checkInTime = new Date(
//                     attendanceDate.getFullYear(),
//                     attendanceDate.getMonth(),
//                     attendanceDate.getDate(),
//                     checkInDate.getHours(),
//                     checkInDate.getMinutes()
//                 ).toISOString();
//             }

//             if (record.check_out_time) {
//                 const checkOutDate = new Date(record.check_out_time);
//                 checkOutTime = new Date(
//                     attendanceDate.getFullYear(),
//                     attendanceDate.getMonth(),
//                     attendanceDate.getDate(),
//                     checkOutDate.getHours(),
//                     checkOutDate.getMinutes()
//                 ).toISOString();
//             }

//             return {
//                 ...record,
//                 check_in_time: checkInTime,
//                 check_out_time: checkOutTime,
//                 total_hours: calculateTotalHours(checkInTime, checkOutTime),
//                 project_name: record.ucc_id ? projectMap[record.ucc_id] || 'Project Not Found' : ''
//             };
//         });
    
//         const dateWiseAttendance = {};
//         processedAttendance.forEach(record => {
//             const dateKey = new Date(record.attendance_date).toISOString().split('T')[0];
//             if (!dateWiseAttendance[dateKey]) {
//                 dateWiseAttendance[dateKey] = [];
//             }
//             dateWiseAttendance[dateKey].push(record);
//         });

//         const statistics = {
//             total: processedAttendance.length,
//             present: processedAttendance.filter(record => record.check_in_time!=null).length,
//             absent: processedAttendance.filter(record => record.check_in_time==null).length,
//             total_working_hours: processedAttendance.reduce((total, record) => {
//                 return total + (record.total_hours || 0);
//             }, 0).toFixed(2)
//         };
    
//         employeeWiseAttendance[employee.user_id] = {
//             employee_details: {
//                 user_id: employee.user_id,
//                 name: employee.name,
//                 email: employee.email,
//                 designation: employee.designation
//             },
//             statistics,
//             attendance: dateWiseAttendance
//         };
//     }

//     // Calculate pagination metadata
//     const totalRecords = employeeUserIds.length;
//     const totalPages = Math.ceil(totalRecords / itemsPerPage);
    
//     return {
//         success: true,
//         message: 'Attendance details retrieved successfully',
//         status: STATUS_CODES.OK,
//         data: {
//             total_employees: totalEmployees,
//             employees: employeeWiseAttendance,
//             dateRange: {
//                 startDate: dateRange.startDate,
//                 endDate: dateRange.endDate,
//             },
//             pagination: {
//                 currentPage,
//                 totalPages,
//                 totalRecords,
//                 limit: itemsPerPage,
//                 hasNextPage: currentPage < totalPages,
//                 hasPreviousPage: currentPage > 1
//             }
//         },
//     };
// };

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
              // const targetDate = new Date(date).toISOString().split('T')[0];
              // employeeAttendance = employeeAttendance.filter(record => 
              //     new Date(record.attendance_date).toISOString().split('T')[0] === targetDate
              // );
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
          let checkInTime = null;
          let checkOutTime = null;
          
          if (record.check_in_time) {
              const checkInDate = new Date(record.check_in_time);
              checkInTime = new Date(
                  attendanceDate.getFullYear(),
                  attendanceDate.getMonth(),
                  attendanceDate.getDate(),
                  checkInDate.getHours(),
                  checkInDate.getMinutes()
              ).toISOString();
          }

          if (record.check_out_time) {
              const checkOutDate = new Date(record.check_out_time);
              checkOutTime = new Date(
                  attendanceDate.getFullYear(),
                  attendanceDate.getMonth(),
                  attendanceDate.getDate(),
                  checkOutDate.getHours(),
                  checkOutDate.getMinutes()
              ).toISOString();
          }

          return {
              ...record,
              check_in_time: checkInTime,
              check_out_time: checkOutTime,
              total_hours: calculateTotalHours(checkInTime, checkOutTime),
              project_name: record.ucc_id ? projectMap[record.ucc_id] || 'Project Not Found' : ''
          };
      });
  
      const dateWiseAttendance = {};
      processedAttendance.forEach(record => {
          const dateKey = new Date(record.attendance_date).toISOString().split('T')[0];
          if (!dateWiseAttendance[dateKey]) {
              dateWiseAttendance[dateKey] = [];
          }
          dateWiseAttendance[dateKey].push(record);
      });

      const statistics = {
          total: processedAttendance.length,
          present: processedAttendance.filter(record => record.check_in_time!=null).length,
          absent: processedAttendance.filter(record => record.check_in_time==null).length,
          total_working_hours: processedAttendance.reduce((total, record) => {
              return total + (record.total_hours || 0);
          }, 0).toFixed(2)
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
