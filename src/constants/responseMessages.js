export const RESPONSE_MESSAGES = {
  // example 
  // AUTH: {
  //     LOGIN_SUCCESS: "Login successful.",
  //     LOGIN_FAILED: "Invalid credentials.",
  //     UNAUTHORIZED: "You are not authorized to access this resource.",
  //   }

  ERROR: {
    USER_ID_MISSING: 'UserId is required.',
    MISSING_FILTER: 'Day is required.',
    MISSING_TAB_VALUE: 'Please select tab value as me or myteam',
    INVALIDFILTER: 'Invalid filter provided.',
    NOATTENDANCERECORDS: 'No attendance records found for the given range.',
    SERVERERROR: 'An error occurred while fetching attendance analytics.',
    PROJECT_NOT_FOUND:'Project not Found',
    EXPORT_DATA_NOT_FOUND:"No data available for export",
    INVALID_REQUEST: "Invalid request date and ucc number is required",
    INVALID_TYPE: "Please provide a proper type value",
    ERROR_DB_FETCH: "Error Occured while fetching data from DB",
    CENTERLINES_ERROR: "Error Occured while fetching data from DB for centerlines.",
    MISSING_TAB_VALUE : "TabValue must be me and myteam",
    LAST_14_DAYS : "Date must be 14"
  },
  SUCCESS: {
      ANALYTICSFETCHED: 'Attendance analytics fetched successfully.',
      NO_TEAM_MEMBERS: "No team members found to fetch data.",
      ATTENDANCE_RECORDS_FETCHED_SUCCESSFULLY:'Attendance Count fetched Successfully'
  },
}