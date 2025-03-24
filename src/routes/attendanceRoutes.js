import express from 'express'
// import { getUserDetails } from "../services/userService";

import { checkedInEmployees, fetchEmployeesByProject, getAllProjects, getAttendanceDetails, getAttendanceOverview, getTeamAttendanceCount, getTeamAttendanceDetails, getUserTodayAttendanceData, markAttendance, markOfflineAttendance, markOutAttendance } from '../controllers/attendanceController.js'
import { fetchlocationBydate, fetchNearestProject, getBufferAroundUcc } from '../controllers/locationController.js'
import { validate } from '../middlewares/validate.js'
import { validateToken } from '../middlewares/validateToken.js'

import { STRING_CONSTANT } from '../constants/stringConstant.js'
import { enableDisableEmployeeAttendance, insertAttendanceStatus } from '../controllers/pdFlowController.js'
import { fetchProjectDetails, getProjectOverviewDetail, getProjectOverviewDetailWeb } from '../controllers/projectController.js'
import { checkedInEmployeesValidationSchema, markAttendaceSchema, markInAttendaceCountSchema, markOutAttendaceSchema, myProjectEmployeesParamsValidationSchema, myProjectEmployeesQueryValidationSchema, projectDetailsValidationSchema } from '../validations/attendaceValidation.js'
import { isPD } from '../middlewares/authMiddleware.js'

const router = express.Router()

router.get('/getOverviewDetails/', validateToken, getAttendanceOverview)
router.get('/getAttendanceDetails/',validateToken,getAttendanceDetails);
router.get('/getTeamAttendanceDetails/',validateToken,getTeamAttendanceDetails);

router.get('/getAllProjects', validateToken, getAllProjects);
router.get("/locationByDate", validateToken, fetchlocationBydate);
router.get("/nearestUcc", validateToken, fetchNearestProject);
router.get("/getMarkedInAttendaceCount",validateToken,validate(markInAttendaceCountSchema,"query"),getTeamAttendanceCount)
router.post("/markAttendance",validateToken,validate(markAttendaceSchema),markAttendance)
router.get("/checkedInEmployees",validateToken, validate(checkedInEmployeesValidationSchema, STRING_CONSTANT.QUERY), checkedInEmployees);
router.get("/projectDetails",validateToken,validate(projectDetailsValidationSchema, STRING_CONSTANT.QUERY),fetchProjectDetails);
router.get("/:uccId/projectOverviewDetails",validateToken,getProjectOverviewDetail) 
router.get("/:uccId/getWebProjectOverviewDetails",validateToken,getProjectOverviewDetailWeb)
router.post("/markOutAttendance",validateToken,validate(markOutAttendaceSchema),markOutAttendance)
router.get("/myProjectEmployees/:uccId",validateToken, 
    validate(myProjectEmployeesQueryValidationSchema, STRING_CONSTANT.QUERY), 
    validate(myProjectEmployeesParamsValidationSchema, STRING_CONSTANT.PARAMS), 
    fetchEmployeesByProject
);
router.get("/UserTodayAttendance",validateToken,getUserTodayAttendanceData)
router.post("/markOfflineAttendance",validateToken,markOfflineAttendance)
router.get("/fetchUccGeoJson",validateToken,getBufferAroundUcc);
router.patch("/updateAttendanceStatus/:attendanceId", validateToken, isPD, insertAttendanceStatus);
router.patch("/enableDisableEmployeeAttendance/:userId", validateToken, isPD, enableDisableEmployeeAttendance);


export default router
