import express from 'express'
// import { getUserDetails } from "../services/userService";
import { getAttendanceOverview , getAttendanceDetails, getAllProjects} from '../controllers/attendanceController.js'
import validate from '../middlewares/validate.js'
import { validateToken } from '../middlewares/validateToken.js'
import { fetchlocationBydate, fetchNearestProject } from '../controllers/locationController.js'

const router = express.Router()

router.get('/getOverviewDetails/', validateToken, getAttendanceOverview)
router.get('/getAttendanceDetails/',validateToken,getAttendanceDetails);
router.get('/getAllProjects', validateToken, getAllProjects);
router.get("/locationByDate", validateToken, fetchlocationBydate);
router.get("/nearestUcc", validateToken, fetchNearestProject);


export default router
