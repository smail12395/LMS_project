import instructorModel from "../Models/instructorModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Course from "../Models/courseModel.js";

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








import { v2 as cloudinary } from "cloudinary";

export const addCourse = async (req, res) => {
  try {
    const { name, description, price } = req.body;

    if (!name || !description || !price) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "Course image is required",
      });
    }

    // ☁️ Upload image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      req.files.image.tempFilePath,
      {
        folder: "lms_courses",
      }
    );

    const newCourse = await Course.create({
      name,
      description,
      price,
      imageCover: uploadResult.secure_url,
      instructor: req.instructor.id,
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: newCourse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





export const getInstructorCourses = async (req, res) => {
  try {
    console.log("➡️ Instructor ID:", req.instructor.id);

    const courses = await Course.find({
      instructor: req.instructor.id,
    }).sort({ createdAt: -1 });

    console.log("✅ Courses found:", courses.length);

    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("❌ Error fetching courses:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log("🗑️ Delete request for course:", courseId);
    console.log("👤 Instructor:", req.instructor.id);

    const course = await Course.findOne({
      _id: courseId,
      instructor: req.instructor.id, // security check
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or access denied",
      });
    }

    await Course.findByIdAndDelete(courseId);

    console.log("✅ Course deleted successfully");

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete course error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
