// API for Adding Instructor
import bcrypt from "bcrypt";
import validator from "validator";
import instructorModel from "../Models/instructorModel.js";
import jwt from "jsonwebtoken";

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // التحقق من البيانات من ENV (بدون قاعدة بيانات حالياً)
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        { id: "admin_unique_id", role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Admin logged in successfully",
        token,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Email or password is incorrect",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

