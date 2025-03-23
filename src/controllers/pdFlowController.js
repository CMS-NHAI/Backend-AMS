/**
 * @author Deepak
 *  
 */

import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";
import { errorResponse } from "../helpers/errorHelper.js";
import { updateAttendanceStatus, updateEmployeeAttendanceStatus } from "../services/pdFlowService.js";

export async function insertAttendanceStatus(req, res) {
    try {
        const { attendanceId } = req.params;
        const userId = req?.user?.user_id;
        const { action } = req.body;

        if (![STRING_CONSTANT.APPROVE, STRING_CONSTANT.REJECT].includes(action.toUpperCase())) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: RESPONSE_MESSAGES.ERROR.INVALID_ACTION });
        }

        const attendance = await updateAttendanceStatus(attendanceId, action, userId);
        return res.json({ success: true, message: `Attendance ${action.toLowerCase()}d successfully`, attendance });

    } catch (error) {
        await errorResponse(req, res, error);
    }
}

export async function enableDisableEmployeeAttendance(req, res) {
    try {
        const { userId } = req.params;
        const { enabled } = req.body;
        const user = await updateEmployeeAttendanceStatus(userId, enabled);
        return res.json({success: true, message: `User attendance ${enabled ? "enabled" : "disabled"} successfully`, user });

    } catch (error) {
        await errorResponse(req, res, error);
    }
}
