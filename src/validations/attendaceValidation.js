import Joi from 'joi'
import moment from 'moment';

// const today = moment().format('YYYY-MM-DD');
// const fourteenDaysAgo = moment().subtract(14, 'days').format('YYYY-MM-DD');

export const markInAttendaceCountSchema = Joi.object({
  tabValue: Joi.string()
  .valid('myteam')
  .required()
  .messages({
    'any.only': "tabValue must be 'myteam'",
    'string.base': 'tabValue must be a string',
    'any.required': 'tabValue is required',
  }),
  dayFilter: Joi.string()
    .valid("today", "yesterday")
    .required()
    .messages({ 
      "any.only": "dayFilter must be 'today' or 'yesterday'" ,
      'any.required': 'tabValue is required'
    })
})

export const markAttendaceSchema = Joi.object({
  attendanceData: Joi.array().items(
    Joi.object({
      checkinDate: Joi.string()
        .isoDate()
        .required()
        .messages({
          'string.empty': 'Checkin Date should not be empty.',
          'string.isoDate': 'Checkin Date must be in YYYY-MM-DD format',
          'any.required': 'Checkin Date is required.'
        }),
      checkinTime: Joi.string()
        .pattern(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) (\d{2}):([0-5]\d):([0-5]\d)$/)
        .required()
        .messages({
          'string.empty': 'Checkin Time should not be empty.',
          'string.pattern.base': 'checkinTime must be in HH:MM:SS format',
          'any.required': 'Checkin Date is required.'
        }),
      checkinRemarks: Joi.string().allow("").optional(),
      checkInGeofenceStatus: Joi.string().valid("INSIDE", "OUTSIDE").required().messages({
        "any.only": "faceauthstatus must be 'yes' or 'no'",
        "any.required": "Geofence status is required",
      }),
      project: Joi.string().required(),

      ucc: Joi.string().required(),

      checkinLat: Joi.number().required().messages({
        'number.base': 'Value must be a number.',
        'any.required': 'Float value is required.',
      }),

      checkinLon: Joi.number().required().messages({
        'number.base': 'Value must be a number.',
        'any.required': 'Float value is required.',
      }),

      faceauthstatus: Joi.string()
        .valid("yes", "no")
        .required()
        .messages({ "any.only": "faceauthstatus must be 'yes' or 'no'" })
    },
    )
  )
});

export const projectDetailsValidationSchema = Joi.object({
  date: Joi.date().iso().required().messages({
    'date.base': 'date must be a valid date',
    'date.format': 'date must be in the format YYYY-MM-DD',
    'any.required': 'date is required',
  }),
  uccId: Joi.string().trim().custom((value, helpers) => {
    // If ucc_id is "all", it is valid
    if (value === 'all') {
      return value;
    }

    // Ensure ucc_id is a non-numeric string
    if (/^\d+$/.test(value)) {
      return helpers.error('string.pattern.base', { message: 'ucc_id cannot be purely numeric' });
    }

    // Validate string as alphanumeric
    const regex = /^[A-Za-z0-9]+$/;
    if (!regex.test(value)) {
      return helpers.error('string.pattern.base', { message: 'ucc_id must be alphanumeric and can include letters and numbers only' });
    }

    return value;
  }).required().messages({
    'string.base': 'ucc_id must be a string',
    'string.empty': 'ucc_id cannot be an empty string',
    'any.required': 'ucc_id is required',
    'string.pattern.base': 'ucc_id must be alphanumeric and can include letters and numbers only',
  }),
  limit: Joi.number().integer().positive().default(10).max(100).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.positive': 'Limit must be a positive integer',
    'any.default': 'Default limit is 10',
    'number.max': 'Limit cannot be more than 100',
  }),
  page: Joi.number().integer().positive().default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.positive': 'Page must be a positive integer',
    'any.default': 'Default page is 1',
  }),
});

export const markOutAttendaceSchema = Joi.object({
  attendanceData: Joi.array().items(
    Joi.object({
      attendanceId: Joi.number().integer().required(),
      checkoutTime: Joi.string()
        .pattern(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) (\d{2}):([0-5]\d):([0-5]\d)$/)
        .required()
        .messages({
          'string.empty': 'Checkin Time should not be empty.',
          'string.pattern.base': 'checkinTime must be in HH:MM:SS format',
          'any.required': 'Checkin Date is required.'
        }),
      checkoutDeviceId: Joi.string().allow('').optional(),
      checkoutIpAddress: Joi.string().allow('').optional(),
      checkoutRemarks: Joi.string().allow("").optional(),
      checkoutGeofenceStatus: Joi.string().valid("INSIDE", "OUTSIDE").required().messages({
        "any.only": "faceauthstatus must be 'yes' or 'no'",
        "any.required": "Geofence status is required",
      }),
      checkoutGeofenceStatus: Joi.string().valid("INSIDE", "OUTSIDE").required().messages({
        "any.only": "faceauthstatus must be 'yes' or 'no'",
        "any.required": "Geofence status is required",
      }),
      checkoutLat: Joi.number().required().messages({
        'number.base': 'Value must be a number.',
        'any.required': 'Float value is required.',
      }),

      checkoutLon: Joi.number().required().messages({
        'number.base': 'Value must be a number.',
        'any.required': 'Float value is required.',
      }),

      faceauthstatus: Joi.string()
        .valid("yes", "no")
        .required()
        .messages({ "any.only": "faceauthstatus must be 'yes' or 'no'" })
    },
    )
  )
})


