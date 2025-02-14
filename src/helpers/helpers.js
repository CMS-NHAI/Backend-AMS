import { prisma } from "../config/prismaClient.js";

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
    select: { holiday_date: true }
  });

    if (holidayData.length === 0) {
      throw new Error('No holidays found.');
    }
   return holidayData.map(h => h.holiday_date.toISOString().split('T')[0]);
}