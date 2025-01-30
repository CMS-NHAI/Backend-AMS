export const RESPONSE_MESSAGES = {
  // example
  // AUTH: {
  //     LOGIN_SUCCESS: "Login successful.",
  //     LOGIN_FAILED: "Invalid credentials.",
  //     UNAUTHORIZED: "You are not authorized to access this resource.",
  //   }

  ERROR: {
    USER_ID_MISSING: 'UserId is required.',
    MISSING_FILTER: 'filter is required.',
    MISSING_TAB_VALUE: 'Tabvalue is not provided',
    INVALIDFILTER: 'Invalid filter provided.',
    NOATTENDANCERECORDS: 'No attendance records found for the given range.',
    SERVERERROR: 'An error occurred while fetching attendance analytics.',
  },
  SUCCESS: {
    ANALYTICSFETCHED: 'Attendance analytics fetched successfully.',
  },
}
