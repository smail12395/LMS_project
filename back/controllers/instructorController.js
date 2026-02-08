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

    // ✅ multer puts file here
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Course image is required",
      });
    }

    // ☁️ Upload image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "lms_courses",
    });

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
    console.error("❌ addCourse error:", error);
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





/**
 * PUT /api/instructor/course/:id
 * Update course details (Instructor only)
 */
export const updateCourseDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.instructor.id;

    const {
      name,
      description,
      price,
      imageCover
    } = req.body;

    const course = await Course.findOne({
      _id: id,
      instructor: instructorId
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not authorized"
      });
    }

    // Update fields only if provided
    if (name !== undefined) course.name = name;
    if (description !== undefined) course.description = description;
    if (price !== undefined) course.price = price;
    if (imageCover !== undefined) course.imageCover = imageCover;

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course
    });

  } catch (error) {
    console.error("Update course error:", error);

    // Example error logging (extend later to DB collection)
    // await ErrorLog.create({ message: error.message, stack: error.stack });

    return res.status(500).json({
      success: false,
      message: "Server error while updating course"
    });
  }
};



import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

export const addCourseContent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, contentType, contentData } = req.body;
    const instructorId = req.instructor.id;

    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).json({ success: false, message: "Course not found" });

    if (course.instructor.toString() !== instructorId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    let finalContentData = contentData;
    let cloudinaryPublicId = null;

    // ===== FILE VALIDATION =====
    if (req.file) {
      const mime = req.file.mimetype;

      const allowed = {
        image: mime.startsWith("image/"),
        video: mime.startsWith("video/"),
        pdf: mime === "application/pdf",
      };

      if (!allowed[contentType]) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type for ${contentType}`,
        });
      }

      // ===== CLOUDINARY UPLOAD =====
      const upload = await uploadToCloudinary(req.file.path, contentType);
      finalContentData = upload.secure_url;
      cloudinaryPublicId = upload.public_id;
    }

    const newContent = {
      title,
      contentType,
      contentData: finalContentData,
      cloudinaryPublicId,
      createdAt: new Date(),
    };

    course.content.push(newContent);
    await course.save();

    res.status(201).json({
      success: true,
      message: "Content added successfully",
      content: newContent,
    });
  } catch (error) {
    console.error("ADD CONTENT ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const removeCourseContent = async (req, res) => {
  try {
    const { courseId, contentIndex } = req.params;
    const instructorId = req.instructor.id;

    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).json({ success: false, message: "Course not found" });

    if (course.instructor.toString() !== instructorId)
      return res.status(403).json({ success: false, message: "Unauthorized" });

    const index = Number(contentIndex);
    if (!course.content[index])
      return res.status(400).json({ success: false, message: "Invalid content index" });

    const deletedContent = course.content[index];

    // ☁️ Cloudinary cleanup
    if (deletedContent.cloudinaryPublicId) {
      const deleted = await deleteFromCloudinary(
        deletedContent.cloudinaryPublicId
      );

      if (!deleted) {
        console.warn("⚠ Cloudinary delete failed but DB continues");
      }
    }

    course.content.splice(index, 1);
    await course.save();

    res.json({
      success: true,
      message: "Content deleted successfully",
      deletedContent,
    });
  } catch (error) {
    console.error("DELETE CONTENT ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};