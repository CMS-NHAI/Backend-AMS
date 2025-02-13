import { prisma } from '../config/prismaClient.js'
import {
  getUserAttendance,
  getTeamAttendance,
  getTeamAttendaceCount,
  getTodayAttendance
} from '../services/db/attendaceService.db.js'
import {
  getTotalWorkingDays,
  calculateTotalworkinghours,
} from '../helpers/attendanceHelper.js'
import {
  ATTENDANCE_STATUS,
  TAB_VALUES,
  FILTERS,
} from '../constants/attendanceConstant.js'
import { STATUS_CODES } from '../constants/statusCodeConstants.js'
import { RESPONSE_MESSAGES } from '../constants/responseMessages.js'
import APIError from '../utils/apiError.js'

export const getAttendanceOverviewService = async (
  userId,
  filter,
  tabValue,
  id
) => {
  if (!userId) {
      throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING )
  }

  if (!filter) {
    throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.MISSING_FILTER)
  }

  if (!tabValue || !["me", "myteam"].includes(tabValue)) {
      throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.MISSING_TAB_VALUE )
  }

  let startDate,
    endDate = new Date()
  switch (filter) {
    case FILTERS.LAST_30_DAYS:
      startDate = new Date(new Date().setDate(endDate.getDate() - 30))
      break
    case FILTERS.LAST_7_DAYS:
      startDate = new Date(new Date().setDate(endDate.getDate() - 7))
      break
    case FILTERS.LAST_14_DAYS:
      startDate = new Date(new Date().setDate(endDate.getDate() - 14))
      break
      case FILTERS.LAST_60_DAYS:
      startDate = new Date(new Date().setDate(endDate.getDate() - 60))
      break
    default:
      throw new APIError( STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.INVALIDFILTER)
  }

  let attendanceRecords = []
  let totalEmployees ;
  if (tabValue === TAB_VALUES.ME) {
    attendanceRecords = await getUserAttendance(userId, startDate, endDate,id)
  } else if (tabValue === TAB_VALUES.MYTEAM) {
    const employeesData = await getEmployeesHierarchy(userId)
    totalEmployees=employeesData?.totalCount;
    const employeeUserIds = await getAttendanceForHierarchy(
      employeesData.hierarchy
    )
    console.log(employeeUserIds,"employeeUserIds");
    attendanceRecords = await getTeamAttendance(
      employeeUserIds,
      startDate,
      endDate
    )
    
  }

  const totalDays = getTotalWorkingDays(filter).length
  const presentDays = attendanceRecords.filter((record) =>
    // [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.LATE].includes(
    //   record.status.toUpperCase()
    // )
    record.check_in_time !== null
  ).length
  const absentDays = totalDays - presentDays
  const attendancePercent = totalDays
    ? ((presentDays / totalDays) * 100).toFixed(2)
    : 0
  const totalWorkHours = await calculateTotalworkinghours(attendanceRecords)
  const avgWorkHours = presentDays ? (totalWorkHours / totalDays).toFixed(2) : 0
  const avgHours = Math.floor(avgWorkHours);
  const avgMinutes = Math.round((avgWorkHours - avgHours) * 60);
  return {
    totalPresent: presentDays,
    attendancePercent: attendancePercent,
    avgWorkHrs: `${avgHours}hr ${avgMinutes}min`,
    leaves: absentDays,
    totalEmployees
  }
}

export const getEmployeesHierarchy = async (userId) => {
  const employees = await prisma.user_master.findMany({
    where: {
      parent_id: userId,
    },
    select: { user_id: true },
  })
  let totalCount = employees.length
  
  for (const user of employees) {
    const childData = await getEmployeesHierarchy(user.user_id) // Recursive call
    user.children = childData.hierarchy // Assign children
    totalCount += childData.totalCount // Add child count
  }

  return { hierarchy: employees, totalCount }
}

export const getAttendanceForHierarchy = async (hierarchy) => {
  // Step 1: Flatten the hierarchy to get all user_ids
  const allUsersIds = await extractUserIds(hierarchy)
  return allUsersIds
}

const extractUserIds = async (users, userIds = []) => {
  await users.forEach(async (user) => {
    userIds.push(user.user_id) // Add the user_id of the current user
    if (user.children && user.children.length > 0) {
      await extractUserIds(user.children, userIds) // Recursively add children user_ids
    }
  })
  return userIds
}

export const getMarkInAttendanceCountService=async ( userId,filter,tabValue)=>{
  try{
  if (tabValue === TAB_VALUES.MYTEAM) {
    const employeesData = await getEmployeesHierarchy(userId)
    let totalEmployees =employeesData?.totalCount;
    const employeeUserIds = await getAttendanceForHierarchy(
      employeesData.hierarchy
    )
    let whereCondition = {}
    let startDate,endDate;
    let markedInAttendanceCount;
    
    if(filter ==="yesterday"){
      endDate = new Date();
      
      startDate = new Date(new Date().setDate(endDate.getDate() - 1))
      whereCondition.attendance_date = {
        gte: startDate,
        lte: endDate
    };

      markedInAttendanceCount = await getTeamAttendaceCount(employeeUserIds,whereCondition)
    }else{
      const todayDate = new Date();
      whereCondition.attendance_date = todayDate;
      markedInAttendanceCount = await getTeamAttendaceCount(employeeUserIds,whereCondition)
    }

    const attendaceCount ={
      markedIn:markedInAttendanceCount,
      notInYet:(totalEmployees - markedInAttendanceCount)
    }

    return attendaceCount
  }else{
    throw new APIError(STATUS_CODES.NOT_ACCEPTABLE,RESPONSE_MESSAGES.ERROR.INVALID_TABVALUE)
  }
}catch(error){
throw new APIError(STATUS_CODES.BAD_REQUEST,RESPONSE_MESSAGES.ERROR.RECORD_FETCHING_FAILED)}
}

export const getUserAttendanceAndProjectDetailsService=async(userId)=>{
try{
  const date = new Date()
return await getTodayAttendance(userId,date)
}catch(error){
throw new APIError(STATUS_CODES.BAD_REQUEST,RESPONSE_MESSAGES.ERROR.FAILED_TO_GET_USERS_ATTENDANCE_DATA)
}

}
