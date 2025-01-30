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