import express from 'express'
import attendaceRoutes from './attendanceRoutes.js'
// import productRoutes from "./productRoutes.js";

const router = express.Router()

// Use individual route files
router.use('/attendance', attendaceRoutes) // Routes for user management
// router.use("/products", productRoutes);

export default router
