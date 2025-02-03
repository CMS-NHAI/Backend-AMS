// import Joi from 'joi';
// import _ from 'lodash';

// const validate = (schema) => (req, res, next) => {
// 	const validSchema = _.pick(schema, ['params', 'query', 'body']);
// 	const object = _.pick(req, Object.keys(validSchema));
// 	const { error, value } = Joi.compile(validSchema)
// 		.prefs({ errors: { label: 'path', wrap: { label: false } }, abortEarly: false })
// 		.validate(object);
// 	if (error) {
// 		return next(error);
// 	}
// 	Object.assign(req, value);
// 	return next();
// };

import Joi from 'joi'

// Custom Joi validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    // Validate request body by default, you can modify for query or params validation as well
    const { error } = schema.validate(req.body)

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message, // Send the validation error message
      })
    }

    next() // If valid, proceed to the next middleware/controller
  }
}

export default validate
