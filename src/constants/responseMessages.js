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
    INVALID_FACEAUTHSTATUS:'User Face Authentication Failed',
    INVALID_REQUEST: "Invalid request date and ucc number is required",
    INVALID_TYPE: "Please provide a proper type value",
    ERROR_DB_FETCH: "Error Occured while fetching data from DB",
    CENTERLINES_ERROR: "Error Occured while fetching data from DB for centerlines.",
    MISSING_TAB_VALUE : "TabValue must be me and myteam",
    LAST_14_DAYS : "Date must be 14",
    USER_UCC_NOT_FOUND: "No ucc_ids found for the provided user_id",
    UNABLE_TO_FETCH_UCC: "Unable to fetch ucc_ids. Please try again later.",
    INVALID_LAT_LNG: "Invalid latitude or longitude provided",
    UNABLE_TO_FETCH_NEAREST_UCC: "Unable to fetch nearest UCC. Please try again later.",
    REQUEST_PROCESSING_ERROR: "Error Occured while processing request",
    MARKOUT_ATTENDANCE_UPDATE_FAILED:"Mark out attendance Update Failed",
    INVALID_ATTENDANCE_DATA:"Invalid Attendance Data",
    MARKIN_ATTENDANCE_UPDATE_FAILED:"Mark-in attendance Insertion Failed",
    INVALID_TABVALUE:"Invalid Tab Value",
    RECORD_FETCHING_FAILED:"Attendace Record Fetching Failed",
    FAILED_TO_GET_USERS_ATTENDANCE_DATA:"Failed to Fetch User Today Attendance",
    FAILED_TO_FETCH_PROJECT_OVERVIEW_DETAILS:"Failed to Fetch Project Overview Details"
    
  },
  SUCCESS: {
      ANALYTICSFETCHED: 'Attendance analytics fetched successfully.',
      NO_TEAM_MEMBERS: "No team members found to fetch data.",
      NO_UCC_FOUND: "No UCCs found in the database for the given user.",
      OUTSIDE_WORK_AREA: "You are out of your work area",
      INSIDE_WORK_AREA: "You are within your work area",
      ATTENDANCE_RECORDS_FETCHED_SUCCESSFULLY:'Attendance Count fetched Successfully',
      NO_UCC_FOR_USERID: "No UCC found for the given user's userID.",
      ATTENDACE_MARKED_SUCCESSFULLY: "You've Successfully Marked-in",
      NO_ATENDANCE_RECORD: "No attendance records found for the given user_ids and date",
      ATTENDACE_MARKED_OUT_SUCCESSFULLY:"You've Successfully Marked-out",
      ATTENDANCE_NOT_MARKED:"You haven't marked your attendance for today",
      FETCH_USER_TODAY_ATTENDANCE:"User Today Attendance Fetched Successfully",
      PROJECT_OVERVIEW_DETAILS_FETCHED:"Project Overview Details Fetched Successfully"
  },
}