import express from 'express'
// import { getUserDetails } from "../services/userService";
import { getAttendanceOverview , getAttendanceDetails, getAllProjects,getTeamAttendanceCount,markAttendance,markOutAttendance} from '../controllers/attendanceController.js'
import {validate} from '../middlewares/validate.js'
import { validateToken } from '../middlewares/validateToken.js'
import { fetchlocationBydate, fetchNearestProject } from '../controllers/locationController.js'

import { markInAttendaceCountSchema,markAttendaceSchema, markOutAttendaceSchema } from '../validations/attendaceValidation.js'

const router = express.Router()

router.get('/getOverviewDetails/', validateToken, getAttendanceOverview)
router.get('/getAttendanceDetails/',validateToken,getAttendanceDetails);
router.get('/getAllProjects', validateToken, getAllProjects);
router.get("/locationByDate", validateToken, fetchlocationBydate);
router.get("/nearestUcc", validateToken, fetchNearestProject);
router.get("/getMarkedInAttendaceCount",validateToken,validate(markInAttendaceCountSchema,"query"),getTeamAttendanceCount)
router.post("/markAttendance",validateToken,validate(markAttendaceSchema),markAttendance)
router.post("/markOutAttendance",validateToken,validate(markOutAttendaceSchema),markOutAttendance)

export default router
