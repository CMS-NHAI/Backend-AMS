import Joi from 'joi'
import moment from 'moment';

const today = moment().format('YYYY-MM-DD');
const fourteenDaysAgo = moment().subtract(14, 'days').format('YYYY-MM-DD');

export const markInAttendaceCountSchema =Joi.object({
  tabValue: Joi.string()
  .valid('myteam')
  .required()
  .messages({
    'any.only': "tabValue must be 'myteam'",
    'string.base': 'tabValue must be a string',
    'any.required': 'tabValue is required',
  }),
  date: Joi.string()
    .valid(today, fourteenDaysAgo)
    .required()
    .messages({
      'any.only': `Date must be '${today}' (today) or '${fourteenDaysAgo}' (14 days ago)`,
      'string.base': 'Date must be a string in YYYY-MM-DD format',
      'any.required': 'Date is required',
    }),
})
