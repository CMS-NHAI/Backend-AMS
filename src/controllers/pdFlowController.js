import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { fetchOffsiteEmployeesDetails } from "../services/pdFlowService.js";

export async function getOffsiteEmployeesDetails(req, res) {
    try {
        const userId = req?.user?.userId;
        const data = await fetchOffsiteEmployeesDetails(req, userId);
        res.status(STATUS_CODES.OK).json(data);
    } catch (error) {
        console.log("ERRRR :::: ", error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            status: STATUS_CODES.INTERNAL_SERVER_ERROR,
            message: error.message
          });
    }
}