import Joi from 'joi'

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
      checkInGeofenceStatus:Joi.string().valid("INSIDE","OUTSIDE").required().messages({
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
})
