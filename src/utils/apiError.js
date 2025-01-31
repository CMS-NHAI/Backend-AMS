class APIError extends Error {
  constructor(statusCode, message) {
    super(message)
    // this.name = this.constructor.name
    // this.message = message
    this.statusCode = statusCode
    // this.isOperational = isOperational
    // Error.captureStackTrace(this, this.constructor)
  }
}

export default APIError
