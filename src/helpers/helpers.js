import { prisma } from "../config/prismaClient.js";
import { STATUS_CODES } from "../constants/statusCodeConstants.js";

export const isSunday = (date) => date.getDay() === 0;

export const getTotalWorkingDays = (filterDays) => {
    let days = [];
    for (let i = 1; i <= parseInt(filterDays); i++) {
      let date = new Date();
      date.setDate(date.getDate() - i);
      if (!isSunday(date)) {
        days.push(date);
      }
    }
    return days;
  }

export const holidayList = async() =>{
  const holidayData = await prisma.holiday_master.findMany({
    select: { holiday_Date: true }
  });

    if (holidayData.length === 0) {
      throw new Error(STATUS_CODES.NOT_FOUND, 'No holidays found.');
    }
   return holidayData.map(h => h.holiday_Date.toISOString().split('T')[0]);
}