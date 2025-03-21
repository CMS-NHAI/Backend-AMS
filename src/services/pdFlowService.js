/**
 * @author Deepak
 */
import { prisma } from "../config/prismaClient.js"

export async function fetchOffsiteEmployeesDetails(req, userId) {
    try {
        const reqDesignation = req?.user?.designation;
        const userDesignation = await prisma.user_master.findFirst({
            where: {
                user_id: userId
            },
            select: {
                designation: true,
                user_id: true
            }
        });

        console.log("USerrrr DESIGNATIOn :::::::::: ", userDesignation);
    } catch (error) {
        
    }
}