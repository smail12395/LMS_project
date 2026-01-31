import instructorModel from "../Models/instructorModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Course from "../Models/courseModel.js";
import { v2 as cloudinary } from "cloudinary";

export const loginInstructor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const instructor = await instructorModel.findOne({ email });

    if (!instructor) {
      return res.status(400).json({ success: false, message: "Email or password is incorrect" });
    }

    const isMatch = await bcrypt.compare(password, instructor.password);
    
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Email or password is incorrect" });
    }

    const token = jwt.sign(
      { id: instructor._id, role: "instructor" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Instructor logged in successfully",
      token,
      instructor: {
        id: instructor._id,
        name: instructor.name,
        email: instructor.email,
        speciality: instructor.speciality
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
