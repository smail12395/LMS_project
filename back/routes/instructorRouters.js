import express from "express";
import { addCourse, loginInstructor } from "../controllers/InstructorController.js";
import authInstructor from "../middleware/authInstructor.js";
import multer from "multer";

const instructorRouter = express.Router();

instructorRouter.post('/login', loginInstructor);

export default instructorRouter;
