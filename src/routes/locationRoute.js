/**
 * @author Deepak
 */

import express from "express";
import { validateToken } from "../middlewares/validateToken.js";
import { fetchlocationBydate } from "../controllers/locationController.js";


const router = express.Router();

router.get("/attendance/locationByDate", validateToken, fetchlocationBydate);


export default router;
