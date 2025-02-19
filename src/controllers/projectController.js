/**
 * @author Deepak
 */
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";
import { getProjectDetails, projectOverviewDetails, projectOverviewDetailsforWeb } from "../services/projectService.js";
import APIError from "../utils/apiError.js";
import { exportToCSV } from "../utils/attendaceUtils.js";
import { logger } from "../utils/logger.js";
import moment from "moment";
/**
 * Controller to fetch project details.
 * 
 * @param req Request from front-end
 * @param res Response to front-end
 */
export const fetchProjectDetails = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { uccId, date } = req.query;

        if (!uccId || !date) {
            throw new APIError(STATUS_CODES.BAD_REQUEST, RESPONSE_MESSAGES.ERROR.INVALID_REQUEST);
        }
        if (!userId) {
            throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING);
        }
        const isExport = req.query?.export === STRING_CONSTANT.TRUE;

        const data = await getProjectDetails(req, userId, date, uccId, isExport);
        if (isExport) {
            const headers = [
                { id: 'project_ucc', title: 'Project UCC' },
                { id: 'project_name', title: 'Project Name' },
                { id: 'total_employees', title: 'Total Employees' },
                { id: 'present_percentage', title: 'Present Percentage' }
            ];

            return await exportToCSV(res, data.projectDetails, "ProjectDetails", headers);
        }

        res.status(STATUS_CODES.OK).json({ success: true, data });
    } catch (error) {
        logger.error({
            message: RESPONSE_MESSAGES.ERROR.REQUEST_PROCESSING_ERROR,
            error: error,
            url: req.url,
            method: req.method,
            time: new Date().toISOString(),
        });
        if (error instanceof APIError)
            res.status(error.statusCode).json({ success: false, error: error.message });

        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message
        });
    }
}

export const getProjectOverviewDetail =async (req,res)=>{
    try{
        const {filter} = req.query;
        const days = filter === "30" ? 30 : filter === "14" ? 14 : 7;
        const userId = req.user.user_id;
     const {uccId} =req.params

        if (!userId) {
            throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING);
        }

    const result =await projectOverviewDetails(userId,uccId,days);
        return res.status(STATUS_CODES.OK).json({
        success:true,
        message:RESPONSE_MESSAGES.SUCCESS.PROJECT_OVERVIEW_DETAILS_FETCHED,
        data:result
        })
    }catch(error){
        console.log("Error ::: ", error);
        if (error instanceof APIError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                data: null
            });
        }
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: error.message
        });
    }
}

    export const getProjectOverviewDetailWeb =async (req,res)=>{
    try{
        let userId =req.user.user_id;
    let {month,year,id} = req.query;
    const currentDate = moment();
    year = year || currentDate.year().toString();
    month = month || (currentDate.month() + 1).toString();
    month = month.padStart(2, '0');
    // Create a moment object for the first day of the month (startDate)
    const startDate = moment(`${year}-${month}-01`, 'YYYY-MM-DD').startOf('day').toDate();
    // Create the endDate (first day of the next month)
    const endDate = moment(startDate).add(1, 'month').startOf('day').toDate();

        //     const days = filter === "30" ? 30 : filter === "14" ? 14 : 7;
        //  const userId = req.user.user_id;
         const {uccId} =req.params

        if (!userId) {
            throw new APIError(STATUS_CODES.UNAUTHORIZED, RESPONSE_MESSAGES.ERROR.USER_ID_MISSING);
        }

        if(id){
          userId = Number(id)
        }
    
        const result =await projectOverviewDetailsforWeb(userId,uccId,startDate,endDate,year,month);

        return res.status(STATUS_CODES.OK).json({
            success:true,
            message:RESPONSE_MESSAGES.SUCCESS.PROJECT_OVERVIEW_DETAILS_FETCHED,
            data:result
        })
        }catch(error){
        console.log("Error ::: ", error);
        if (error instanceof APIError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                data: null
            });
        }
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: error.message
        });
    }
}
