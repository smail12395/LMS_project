import express from "express";
import { registerUser, loginUser,getPublicCourses,getPaymentInfo,createPaymentIntent,confirmEnrollment,getCourseDetails,streamVideo,streamContentVideo,saveQuizAnswer,getUserQuizAnswers} from "../controllers/userController.js";
import authUser from "../middleware/authUser.js";
import checkEnrollment from '../middleware/checkEnrollment.js';
import checkEnrollmentForVideo from '../middleware/checkEnrollmentForVideo.js'; // جديد

const userRoute = express.Router();

userRoute.post("/login", loginUser);
userRoute.post("/register", registerUser);
userRoute.get('/public', getPublicCourses);
userRoute.get('/courses/:courseId/payment-info', authUser, getPaymentInfo);
userRoute.post('/payments/create-payment-intent', authUser, createPaymentIntent);
userRoute.post('/payments/confirm-enrollment', authUser, confirmEnrollment);
userRoute.get('/courses/:courseId',authUser,checkEnrollment,getCourseDetails);
userRoute.get( '/videos/stream/:courseId/:videoId', authUser, checkEnrollmentForVideo,  streamVideo);
userRoute.get('/content/stream/:courseId/:contentId',authUser,checkEnrollment,streamContentVideo);
userRoute.post('/quizzes/save-answer', authUser, checkEnrollment, saveQuizAnswer);
userRoute.get('/quizzes/my-answers/:courseId', authUser, checkEnrollment, getUserQuizAnswers);

export default userRoute;
