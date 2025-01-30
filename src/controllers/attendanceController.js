/**
 * Author: Deepanshu
 * Date: 2025-01-28
 * Description: Controller for Attendance Management System
 * License: MIT
 */

import { STATUS_CODES } from '../constants/statusCodeConstants.js'
import { RESPONSE_MESSAGES } from '../constants/responseMessages.js'
import { getAttendanceOverviewService } from '../services/attendanceService.js'

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

    res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: RESPONSE_MESSAGES.ERROR.SERVERERROR })
  }
}
