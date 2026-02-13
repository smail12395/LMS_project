import express from "express";
import { loginInstructor, addCourse, getInstructorCourses, deleteCourse,updateCourseDetails,addCourseContent,removeCourseContent,addVideoSeries,getExistingVideoSeries,deleteVideoFromSeries } from '../controllers/InstructorController.js';
import authInstructor from "../middleware/authInstructor.js";
import multer from "multer";

const instructorRouter = express.Router();
const upload = multer({ dest: "uploads/" });

instructorRouter.delete('/course/:courseId/video-series/:videoId', authInstructor, deleteVideoFromSeries);
instructorRouter.post(
  "/course/:courseId/video-series",
  authInstructor,
  upload.array("videos"),
  addVideoSeries
);
instructorRouter.get(
  "/course/:courseId/video-series",
  authInstructor,
  getExistingVideoSeries
);

instructorRouter.post('/login', loginInstructor);
instructorRouter.post(
  "/addCourse",
  authInstructor,
  upload.single("image"),
  addCourse
);
instructorRouter.get("/courses", authInstructor, getInstructorCourses);
instructorRouter.delete("/course/:courseId", authInstructor, deleteCourse);
instructorRouter.put(
  "/course/:id",
  authInstructor,
  updateCourseDetails
);
instructorRouter.post(
  "/course/:courseId/content",
  authInstructor,
  upload.single("file"),
  addCourseContent
);
instructorRouter.delete(
  "/course/:courseId/content/:contentIndex",
  authInstructor,
  removeCourseContent
);
export default instructorRouter;
