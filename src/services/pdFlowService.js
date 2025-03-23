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
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_ERROR_CODES.P2025) {
            throw new APIError(STATUS_CODES.NOT_FOUND, RESPONSE_MESSAGES.ERROR.ATTENDANCE_RECORD_NOT_FOUND);
        }
        throw error;
    }
}

export async function updateEmployeeAttendanceStatus(userId, enabled) {
    try {
        if (enabled) {
            return await prisma.user_master.update({
                where: { user_id: parseInt(userId) },
                data: { is_attendance_disabled: false, attendance_enabled_date: new Date() },
            });
        }

        if (!enabled) {
            return await prisma.user_master.update({
                where: { user_id: parseInt(userId) },
                data: { is_attendance_disabled: true, attendance_disabled_date: new Date() },
            });
        }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_ERROR_CODES.P2025) {
            throw new APIError(STATUS_CODES.NOT_FOUND, RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND);
        }
        throw error;
    }
}
