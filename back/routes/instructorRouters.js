import express from "express";
import { loginInstructor, addCourse, getInstructorCourses, deleteCourse } from '../controllers/InstructorController.js';
import authInstructor from "../middleware/authInstructor.js";
import multer from "multer";

const instructorRouter = express.Router();

instructorRouter.post('/login', loginInstructor);
instructorRouter.post("/addCourse", authInstructor, addCourse);
instructorRouter.get("/courses", authInstructor, getInstructorCourses);
instructorRouter.delete("/course/:courseId", authInstructor, deleteCourse);

export default instructorRouter;
