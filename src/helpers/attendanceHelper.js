export const isSunday = (date) => date.getDay() === 0

export const getTotalWorkingDays = (filterDays) => {
  let days = []
  for (let i = 1; i <= parseInt(filterDays); i++) {
    let date = new Date()
    date.setDate(date.getDate() - i)
    if (!isSunday(date)) {
      days.push(date)
    }
  }
  return days
}

export const calculateTotalworkinghours = (attendanceRecords) => {
  return attendanceRecords.reduce((sum, record) => {
    if (record.check_in_time && record.check_out_time) {
      const checkIn = record.check_in_time
      // new Date(`${record.date}T${record.check_in_time}:00Z`);
      let checkOut = record.check_out_time
      //  new Date(`${record.date}T${record.check_out_time}:00Z`);

      if (checkOut < checkIn) {
        checkOut.setDate(checkOut.getDate() + 1) // Handle midnight crossing
      } //attendanceRecord variable will give the values
      const hours = (checkOut - checkIn) / (1000 * 60 * 60) // Convert ms to hours
      return sum + hours
    }
  }, 0)
}
