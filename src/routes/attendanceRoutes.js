import express from 'express'
// import { getUserDetails } from "../services/userService";
import { getAttendanceOverview , getAttendanceDetails, getAllProjects,markAttendance} from '../controllers/attendanceController.js'
import {validate} from '../middlewares/validate.js'
import { validateToken } from '../middlewares/validateToken.js'
import { fetchlocationBydate } from '../controllers/locationController.js'
import { markAttendaceSchema } from '../validations/attendanceValidation.js'

const router = express.Router()

router.get('/getOverviewDetails/', validateToken, getAttendanceOverview)
router.get('/getAttendanceDetails/',validateToken,getAttendanceDetails);
router.get('/getAllProjects', validateToken, getAllProjects);
router.get("/locationByDate", validateToken, fetchlocationBydate);
router.post("/markAttendance",validateToken,validate(markAttendaceSchema),markAttendance)
export default router
