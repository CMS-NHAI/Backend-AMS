import { format } from "@fast-csv/format";
import { RESPONSE_MESSAGES } from "../constants/responseMessages.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";
import { STRING_CONSTANT } from "../constants/stringConstant.js";

/**
 * Converts an array of objects to a CSV stream and sends it as a response.
 * @param {Object} res - Express response object.
 * @param {Array} data - Array of objects to be converted to CSV.
 * @param {Array} headers - Array of header objects [{ id: "id", title: "ID" }, ...].
 * @param {string} filename - Name of the downloaded file.
 */
export const exportToCSV = async (res, data,filename="users", headers = null) => {
    try {
        if (!data || data.length === 0) {
           // return res.status(STATUS_CODES.BAD_REQUEST).json({ message: RESPONSE_MESSAGES.ERROR.EXPORT_DATA_NOT_FOUND });
          //   data = [];
        }

        if (!headers) {
            headers = Object.keys(data[0]).map(key => ({
                id: key,
                title: key.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase()), // e.g., user_name -> User Name
            }));
        }

        Promise.all[await res.setHeader("Content-Type", "text/csv"),
        await res.setHeader("Content-Disposition", `attachment; filename=${filename}.csv`)];

        const csvStream = format({ headers: false });

        csvStream.pipe(res);
        const headerRow = headers.map(header => header.title);
        csvStream.write(headerRow);
        if (data && data.length > 0) {
            data.forEach(item => {
                const row = headers.map(header => 
                    item[header.id] || ''
                );
                csvStream.write(row);
            });
        }
        csvStream.end();
    } catch(error) {
        console.log(error, "error")
    }
};

/**
 * Converts a string query parameter into a boolean.
 * 
 * @param {string | undefined} value - The query parameter value.
 * @returns {boolean} - Returns `true` for "true", "1", and `false` otherwise.
 */
export const parseBoolean = (value) => {
    return value === STRING_CONSTANT.TRUE || value === STRING_CONSTANT.ONE;
};
