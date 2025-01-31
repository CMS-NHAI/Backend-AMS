import jwt from 'jsonwebtoken'
import { STATUS_CODES } from '../constants/statusCodeConstants.js'
// Middleware to check JWT token
export const validateToken = (req, res, next) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(' ')[1] // Extract the token from Authorization header

  if (!token) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: 'Authorization token is required.',
    })
  }

  try {
    // Verify the token using the JWT secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

    // You can attach the decoded token info (like userId or role) to the request object
    req.user = decoded

    next() // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token.',
    })
  }
}
