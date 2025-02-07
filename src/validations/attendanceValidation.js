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
        .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .required()
        .messages({
          'string.empty': 'Checkin Time should not be empty.',
          'string.pattern.base': 'checkinTime must be in HH:MM:SS format',
          'any.required': 'Checkin Date is required.'
        }),
      checkinRemarks: Joi.string().allow("").optional(),

      project: Joi.string().required(),

      ucc: Joi.string().required(),

      stretch: Joi.string().required(),

      checkinLat: Joi.string()
        .pattern(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$/)
        .required()
        .messages({ "string.pattern.base": "checkinLat must be a valid latitude" }),

      checkinLon: Joi.string()
        .pattern(/^[-+]?((1[0-7]\d)|([1-9]?\d))(\.\d+)?|180(\.0+)?$/)
        .required()
        .messages({ "string.pattern.base": "checkinLon must be a valid longitude" }),

      faceauthstatus: Joi.string()
        .valid("yes", "no")
        .required()
        .messages({ "any.only": "faceauthstatus must be 'yes' or 'no'" })
    },
    )
  )
})
