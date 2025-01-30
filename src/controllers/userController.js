import { prisma } from "../config/prismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import  {getUserDetails} from "../services/userService.js"

export const getUser = async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await getUserDetails(userId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
