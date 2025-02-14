import express from 'express'
// import { getUserDetails } from "../services/userService";

import { getAttendanceOverview , getAttendanceDetails, getAllProjects,getTeamAttendanceCount,markAttendance,markOutAttendance, checkedInEmployees, fetchEmployeesByProject} from '../controllers/attendanceController.js'
import {validate} from '../middlewares/validate.js'
import { validateToken } from '../middlewares/validateToken.js'
import { fetchlocationBydate, fetchNearestProject } from '../controllers/locationController.js'

import { fetchProjectDetails,getProjectOverviewDetail } from '../controllers/projectController.js'
import { STRING_CONSTANT } from '../constants/stringConstant.js'
import { markInAttendaceCountSchema,markAttendaceSchema, markOutAttendaceSchema, projectDetailsValidationSchema, checkedInEmployeesValidationSchema, myProjectEmployeesValidationSchema } from '../validations/attendaceValidation.js'

const router = express.Router()

router.get('/getOverviewDetails/', validateToken, getAttendanceOverview)
router.get('/getAttendanceDetails/',validateToken,getAttendanceDetails);
router.get('/getAllProjects', validateToken, getAllProjects);
router.get("/locationByDate", validateToken, fetchlocationBydate);
router.get("/nearestUcc", validateToken, fetchNearestProject);
router.get("/getMarkedInAttendaceCount",validateToken,validate(markInAttendaceCountSchema,"query"),getTeamAttendanceCount)
router.post("/markAttendance",validateToken,validate(markAttendaceSchema),markAttendance)
router.get("/checkedInEmployees",validateToken, validate(checkedInEmployeesValidationSchema, STRING_CONSTANT.QUERY), checkedInEmployees);
router.get("/projectDetails",validateToken,validate(projectDetailsValidationSchema, STRING_CONSTANT.QUERY),fetchProjectDetails);
router.get("/:uccId/projectOverviewDetails",validateToken,getProjectOverviewDetail)
router.post("/markOutAttendance",validateToken,validate(markOutAttendaceSchema),markOutAttendance)
router.get("/myProjectEmployees",validateToken, validate(myProjectEmployeesValidationSchema, STRING_CONSTANT.QUERY), fetchEmployeesByProject)
router.get("/UserTodayAttendance",validateToken,getUserTodayAttendanceData)


export default router
