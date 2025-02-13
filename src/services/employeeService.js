import { prisma } from "../config/prismaClient.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";
import { getTeamUserIds } from "../helpers/attendanceHelper.js";

export async function fetchCheckedInEmployees(req, userId) {
    try {
        const result = await getTeamUserIds(userId, new Set());

        const userIds = result.userIds;
        const { limit = 10, page = 2, startDate, endDate, uccId, filterType } = req.query;

        const limitInt = parseInt(limit, 10);
        const pageInt = parseInt(page, 10);
        const skip = (pageInt - 1) * limitInt;

        // Validate date range if provided
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        const { calculatedStartDate, calculatedEndDate } = getDateRange(filterType, startDate, endDate);

        const filters = {
            attendance_date: {
                gte: calculatedStartDate.toISOString(),
                lte: calculatedEndDate.toISOString(),
            },
            user_id: {
                in: userIds,
            },
            ucc_id: uccId && uccId !== STRING_CONSTANT.ALL ? uccId : undefined
        };

        const attendanceRecords = await prisma.am_attendance.findMany({
            where: filters,
            skip: skip,
            take: limitInt,
            include: {
                user_master: {
                    select: {
                        name: true,
                        designation: true,
                        user_profile_pic_path: true
                    }
                }
            }
        });

        const response = attendanceRecords.map(record => ({
            attendanceId: record.attendance_id,
            name: record.user_master.name,
            profilePicPath: record.user_master.user_profile_pic_path,
            designation: record.user_master.designation,
            userId: record.user_id
        }));

        return response;
    } catch (err) {
        throw err;
    }
}


function getDateRange(filterType, startDate, endDate) {
    const today = new Date();
    let calculatedStartDate, calculatedEndDate;

    switch (filterType.toUpperCase()) {
        case 'TODAY':
            calculatedStartDate = today;
            calculatedEndDate = today;
            break;

        case 'TWO WEEKS':
            calculatedStartDate = new Date(today);
            calculatedStartDate.setDate(today.getDate() - 14); // Subtract 14 days for "TWO WEEKS"
            calculatedEndDate = today;
            break;

        case 'CUSTOM':
            if (!startDate || !endDate) {
                throw new Error('Start Date and End Date are required for Custom filter');
            }
            const start = new Date(startDate);
            const end = new Date(endDate);

            // Ensure custom range does not exceed 2 months
            if (end - start > 60 * 24 * 60 * 60 * 1000) {
                throw new Error('Custom date range cannot exceed two months');
            }

            calculatedStartDate = start;
            calculatedEndDate = end;
            break;

        default:
            throw new Error('Invalid filter type');
    }

    return { calculatedStartDate, calculatedEndDate };
}




















// u have below table schema's
// user_master
// user_id	integer Auto Increment [nextval('user_master_user_id_seq')]
// unique_username	uuid NULL
// sap_id	character varying(50) NULL
// name	character varying(100)
// first_name	character varying(50) NULL
// middle_name	character varying(50) NULL
// last_name	character varying(50) NULL
// email	character varying(100) NULL
// mobile_number	character varying NULL
// user_type	character varying(30)
// organization_id	integer NULL [-1]
// level_id	integer [-1]
// user_role	json
// designation	character varying(100) NULL
// gender	character varying(10) NULL
// nationality	character varying(100) NULL
// date_of_birth	date NULL
// pan	json NULL
// aadhar_image	text
// user_image	text
// password_hash	character varying(255) NULL
// user_data	json NULL
// is_kyc_verified	boolean NULL
// last_kyc_verified_date	timestamptz NULL
// is_active	boolean NULL
// inactive_at	timestamptz NULL
// deactivation_reason	character varying(255) NULL
// activation_status	character varying(20) NULL
// created_at	timestamp NULL [CURRENT_TIMESTAMP]
// created_by	character varying(100) NULL
// updated_at	timestamp NULL [CURRENT_TIMESTAMP]
// updated_by	character varying(100) NULL
// is_digilocker_verified	boolean NULL
// office_location	character varying(255) NULL
// is_email_verified	boolean NULL
// is_whatsapp_update	boolean NULL
// verified_status	boolean NULL
// status	character varying(20) NULL
// location_id	integer NULL
// office_mobile_number	character varying(20) NULL
// user_keyclock_id	uuid NULL
// user_role_id	integer NULL
// user_roles	character varying NULL
// user_profile_pic_path	text NULL
// parent_id	integer NULLam_attendance:


// am_attendance:
// attendance_id	integer Auto Increment [nextval('am_attendance_attendance_id_seq')]
// ucc_id	character varying
// check_in_time	timestamp NULL
// check_in_lat	numeric(10,7) NULL
// check_in_lng	numeric(10,7) NULL
// check_in_loc	public.geography(Point,4326) NULL
// check_in_accuracy	double precision NULL
// check_in_device_id	character varying(200) NULL
// check_in_ip_address	character varying(45) NULL
// check_in_remarks	text NULL
// check_in_geofence_status	text NULL [INSIDE]
// check_out_time	timestamp NULL
// check_out_lat	numeric(10,7) NULL
// check_out_lng	numeric(10,7) NULL
// check_out_loc	public.geography(Point,4326) NULL
// check_out_accuracy	double precision NULL
// check_out_device_id	character varying(200) NULL
// check_out_ip_address	character varying(45) NULL
// check_out_remarks	text NULL
// check_out_geofence_status	text NULL [INSIDE]
// created_by	integer NULL
// created_at	timestamp NULL [CURRENT_TIMESTAMP]
// updated_by	integer NULL
// updated_at	timestamp NULL [CURRENT_TIMESTAMP]
// attendance_date	date NULL
// user_id	integer NULL
// Indexes
// PRIMARY	attendance_id
// Alter indexes

// Foreign keys
// Source	Target	ON DELETE	ON UPDATE
// user_id	user_master(user_id)	NO ACTION	NO ACTION

// Now I want to create an API in express and prisma and postgresql with below scenarios.

// I am getting limit, page, startDate, endDate, uccId in request queryParams.
// And I have 1 method which is returning me list of all employees userIds of Rm.

// Now I want to return the name, attendanceId, profilePicPath, designation, and userId,
// with given page and limit, start and endDate and if uccId is all fetch for all uccIds else fetch for given uccId.
