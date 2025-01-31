import express from 'express'
// import { getUserDetails } from "../services/userService";
import { getAttendanceOverview } from '../controllers/attendanceController.js'
import validate from '../middlewares/validate.js'
import { validateToken } from '../middlewares/validateToken.js'

const router = express.Router()

router.get('/getOverviewDetails/', validateToken, getAttendanceOverview)

export default router
