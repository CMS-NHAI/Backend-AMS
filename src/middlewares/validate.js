
// Custom Joi validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    // Validate request body by default, you can modify for query or params validation as well
    const { error } = schema.validate(req.body)

    if (error) {
      return res.status(400).json({
        success: false,
        errors: error.details.map(err => err.message)  // Send the validation error message
      })
    }

    next() // If valid, proceed to the next middleware/controller
  }
}