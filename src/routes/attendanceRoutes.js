import express from 'express'
// import { getUserDetails } from "../services/userService";
import { getAttendanceOverview , getAttendanceDetails, getAllProjects,getTeamAttendanceCount,markAttendance, checkedInEmployees} from '../controllers/attendanceController.js'
import {validate} from '../middlewares/validate.js'
import { validateToken } from '../middlewares/validateToken.js'
import { fetchlocationBydate, fetchNearestProject } from '../controllers/locationController.js'

import { markInAttendaceCountSchema,markAttendaceSchema, projectDetailsValidationSchema } from '../validations/attendaceValidation.js'
import { fetchProjectDetails } from '../controllers/projectController.js'
import { STRING_CONSTANT } from '../constants/stringConstant.js'

const router = express.Router()

router.get('/getOverviewDetails/', validateToken, getAttendanceOverview)
router.get('/getAttendanceDetails/',validateToken,getAttendanceDetails);
router.get('/getAllProjects', validateToken, getAllProjects);
router.get("/locationByDate", validateToken, fetchlocationBydate);
router.get("/nearestUcc", validateToken, fetchNearestProject);
router.get("/getMarkedInAttendaceCount",validateToken,validate(markInAttendaceCountSchema,"query"),getTeamAttendanceCount)
router.post("/markAttendance",validateToken,validate(markAttendaceSchema),markAttendance)
router.get("/checkedInEmployees",validateToken,checkedInEmployees)
router.get("/projectDetails",validateToken,validate(projectDetailsValidationSchema, STRING_CONSTANT.QUERY),fetchProjectDetails)

export default router
