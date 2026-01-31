import express from 'express';
import { loginAdmin, addInstructor } from '../controllers/adminControllers.js';
import authAdmin from '../middleware/authAdmin.js';

const adminRouter = express.Router();

adminRouter.post('/login', loginAdmin);

export default adminRouter;