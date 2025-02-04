import { prisma } from '../config/prismaClient.js'
import { STATUS_CODES } from '../constants/statusCodeConstants.js'
import { RESPONSE_MESSAGES } from '../constants/responseMessages.js'
import APIError from '../utils/apiError.js'

export const getAttendanceService = async (userId, month, year, project_id) => {
  if (!userId) {
    throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING)
  }

  const dateRange = calculateDateRange(month, year)
  
  if (project_id) {
    await validateProject(project_id)
  }

  const attendanceRecords = await fetchAttendanceRecords(userId, dateRange.startDate, dateRange.endDate, project_id)
  
  if (!attendanceRecords || attendanceRecords.length === 0) {
    return getEmptyResponse(dateRange)
  }

  const projectDetails = await fetchProjectDetails(attendanceRecords)
  const processedData = processAttendanceData(attendanceRecords, projectDetails)

  return {
    success: true,
    message: 'Attendance details retrieved successfully',
    status : STATUS_CODES.OK,
    data: {
      statistics: processedData.statistics,
      attendance: processedData.groupedAttendance,
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
    },
  }
}

export const calculateDateRange = (month, year) => {
  let startDate, endDate

  if (month && year) {
    const monthNum = parseInt(month)
    const yearNum = parseInt(year)
    startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0))
    endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999))
  } else {
    const currentDate = new Date()
    startDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0))
    endDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999))
  }

  return { startDate, endDate }
}

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

const fetchAttendanceRecords = async (userId, startDate, endDate, project_id) => {
  return await prisma.am_attendance.findMany({
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
  })
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
  return records.map(record => ({
    ...record,
    total_hours: calculateTotalHours(record.check_in_time, record.check_out_time),
    project_name: projectMap[record.ucc_id] || 'Project Not Found'
  }))
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
    present: records.filter(record => record.status === 'PRESENT').length,
    absent: records.filter(record => record.status === 'ABSENT').length,
    leave: records.filter(record => record.status === 'LEAVE').length,
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
      attendance: {},
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
    }
  }
}

// In a new file, e.g., services/attendanceService.js
export const processTeamAttendance = async (employeeUserIds, attendanceRecords, totalEmployees, dateRange) => {
  // Fetch employee details
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

  // Group attendance by employee
  const employeeWiseAttendance = {};
  
  for (const employee of employeeDetails) {
    const employeeAttendance = attendanceRecords.filter(
      record => record.user_id === employee.user_id
    );

    // Calculate statistics for each employee
    const statistics = {
      total: employeeAttendance.length,
      present: employeeAttendance.filter(record => record.status === 'PRESENT').length,
      absent: employeeAttendance.filter(record => record.status === 'ABSENT').length,
      leave: employeeAttendance.filter(record => record.status === 'LEAVE').length,
      total_working_hours: calculateTotalWorkingHours(employeeAttendance)
    };

    // Group attendance by date
    const dateWiseAttendance = groupAttendanceByDate2(employeeAttendance);

    employeeWiseAttendance[employee.user_id] = {
      employee_details: {
        user_id: employee.user_id,
        name: employee.name,
        email: employee.email,
        designation: employee.designation
      },
      statistics,
      attendance: dateWiseAttendance
    };
  }

  return {
    success: true,
    message: 'Attendance details retrieved successfully',
    status: STATUS_CODES.OK,
    data: {
      total_employees: totalEmployees,
      employees: employeeWiseAttendance,
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
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
