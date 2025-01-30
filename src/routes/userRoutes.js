import express from "express";
// import { getUserDetails } from "../services/userService";
import { getUser } from "../controllers/userController.js";
import validate from "../middlewares/validate.js";

const router = express.Router()

router.get('/getUserDetails',getUser);

export default router;