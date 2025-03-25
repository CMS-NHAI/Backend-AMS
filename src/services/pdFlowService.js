/**
 * @author Deepak
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../config/prismaClient.js";
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";
import APIError from "../utils/apiError.js";
import { PRISMA_ERROR_CODES } from "../constants/attendanceConstant.js";

export async function updateAttendanceStatus(attendanceId, action, userId) {
    try {
        if (action === STRING_CONSTANT.APPROVE) {
            return await prisma.am_attendance.update({
                where: { attendance_id: parseInt(attendanceId) },
                data: { approval_status: true, approval_date: new Date() },
            });
        }

        if (action === STRING_CONSTANT.REJECT) {
            return await prisma.am_attendance.update({
                where: { attendance_id: parseInt(attendanceId) },
                data: { approval_status: false, approval_date: new Date() },
            });
        }

        throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.INVALID_ACTION);
    } catch (error) {
        console.log("ERRRRRRRRRRRR ::::::::: ", error)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_ERROR_CODES.P2025) {
            throw new APIError(STATUS_CODES.NOT_FOUND, RESPONSE_MESSAGES.ERROR.ATTENDANCE_RECORD_NOT_FOUND);
        }
        throw error;
    }
}

/**
 * Enables or disables attendance for a given user and logs the change.
 * 
 * @param {number} userId - ID of the user whose attendance status is being updated.
 * @param {boolean} enabled - `true` to enable, `false` to disable attendance.
 * @param {number} adminId - ID of the admin making the change.
 */
export async function updateEmployeeAttendanceStatus(userId, enabled, adminId) {
    try {
        const userData = await prisma.user_master.findFirst({
            where: { user_id: parseInt(userId) },
            select: { is_attendance_disabled: true }
        });

        if (!userData) {
            throw new APIError(STATUS_CODES.NOT_FOUND, RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND);
        }

        // If the status is already the same, return a response
        if (userData.is_attendance_disabled === !enabled) {
            return {
                success: false,
                message: `Attendance is already ${enabled ? "enabled" : "disabled"}.`
            };
        }

        // Prepare log data
        const timestamp = new Date();
        const oldValue = userData.is_attendance_disabled.toString();
        const newValue = (!enabled).toString(); // Flip `enabled` since DB stores `is_attendance_disabled`

        // Update the `user_master` table
        await prisma.user_master.update({
            where: { user_id: parseInt(userId) },
            data: {
                is_attendance_disabled: !enabled,
                attendance_enabled_date: enabled ? timestamp : null,
                attendance_disabled_date: !enabled ? timestamp : null
            }
        });

        await prisma.user_change_log.create({
            data: {
                user_id: parseInt(userId),
                change_field: "is_attendance_disabled",
                old_value: oldValue,
                new_value: newValue,
                created_by: adminId,
                created_at: timestamp,
                updated_at: timestamp
            }
        });

        return {
            success: true,
            message: `Attendance successfully ${enabled ? "enabled" : "disabled"}.`
        };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_ERROR_CODES.P2025) {
            throw new APIError(STATUS_CODES.NOT_FOUND, RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND);
        }
        throw error;
    }
}
