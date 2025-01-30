import {findUserById} from '../services/db/userDbService.js'
export const getUserDetails = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};