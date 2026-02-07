import express from "express";
import { registerUser, loginUser} from "../controllers/userController.js";
import authUser from "../middleware/authUser.js";

const userRoute = express.Router();

userRoute.post("/login", loginUser);
userRoute.post("/register", registerUser);


export default userRoute;
