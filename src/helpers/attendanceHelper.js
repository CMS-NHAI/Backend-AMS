import { prisma } from "../config/prismaClient.js"
import { holidayList } from "./helpers.js"
export const isSunday = (date) => date.getDay() === 0

export const getTotalWorkingDays = async(filterDays) => {
  let days = []
  const holidays = await holidayList()
  for (let i = 1; i <= parseInt(filterDays); i++) {
    let date = new Date()
    date.setDate(date.getDate() - i)
    let formattedDate = date.toISOString().split('T')[0];
    if (!isSunday(date) && !holidays.includes(formattedDate)) {
      days.push(date)
    }
  }
  return days.length
}

export const calculateTotalworkinghours = (attendanceRecords) => {
  return attendanceRecords.reduce((sum, record) => {
    if (record.check_in_time && record.check_out_time) {
      const checkIn = record.check_in_time
      // new Date(`${record.date}T${record.check_in_time}:00Z`);
      let checkOut = record.check_out_time
      //  new Date(`${record.date}T${record.check_out_time}:00Z`);
      if (checkOut < checkIn) {
        checkOut.setDate(checkOut.getDate() + 1) // Handle midnight crossing
      } //attendanceRecord variable will give the values
      const hours = (checkOut - checkIn) / (1000 * 60 * 60) // Convert ms to hours
      return sum + hours
    }
    return sum;
  }, 0)
}

export const getTeamUserIds = async (userId, visitedUserId = new Set()) => {
  if (visitedUserId.has(userId)) {
      // Return an empty object to prevent infinite recursion due to circular dependency
      return { userIds: [], userDetails: [] };
  }

  visitedUserId.add(userId);

  // Fetching user team members with additional user details (name, designation)
  const teamUsers = await prisma.user_master.findMany({
      where: {
          parent_id: userId
      },
      select: {
          user_id: true,
          name: true,
          designation: true
      }
  });

  // Initialize arrays to hold userIds and userDetails
  let userIds = teamUsers.map(member => member.user_id);
  let userDetails = teamUsers.map(member => ({
      user_id: member.user_id,
      name: member.name,
      designation: member.designation
  }));

  // Recursively fetch user details for each team member and append to the arrays
  const recursiveResults = await Promise.all(
      teamUsers.map(
          async (memberUser) => {
              const { userIds: memberIds, userDetails: memberDetails } = await getTeamUserIds(memberUser.user_id, visitedUserId);
              return {
                  userIds: memberIds,
                  userDetails: memberDetails
              };
          }
      )
  );

  // Flatten the recursive results and append to current team data
  recursiveResults.forEach(result => {
      userIds = [...userIds, ...result.userIds];
      userDetails = [...userDetails, ...result.userDetails];
  });

  return {
      userIds,
      userDetails
  };
};

