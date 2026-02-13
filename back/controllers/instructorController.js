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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Course image is required",
      });
    }

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

    // ✅ ADD COURSE TO INSTRUCTOR
    await instructorModel.findByIdAndUpdate(
      req.instructor.id,
      { $push: { courses: newCourse._id } },
      { new: true }
    );

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

    const course = await Course.findOne({
      _id: courseId,
      instructor: req.instructor.id,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or access denied",
      });
    }

    // ✅ REMOVE COURSE FROM INSTRUCTOR
    await instructorModel.findByIdAndUpdate(
      req.instructor.id,
      { $pull: { courses: courseId } }
    );

    await Course.findByIdAndDelete(courseId);

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
    const { title, contentType, contentData, availability } = req.body; //  Added availability
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

    // ===== VALIDATE AVAILABILITY =====
    const validAvailability = ["paid", "free"].includes(availability) 
      ? availability 
      : "paid"; // Default to "paid" if invalid

    const newContent = {
      title,
      contentType,
      contentData: finalContentData,
      cloudinaryPublicId,
      availability: validAvailability, // ✅ Save availability
      createdAt: new Date(),
    };

    course.content.push(newContent);
    await course.save();

    res.status(201).json({
      success: true,
      message: `Content added successfully (${validAvailability})`,
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

// back/controllers/instructorController.js
import fs from "fs";

export const addVideoSeries = async (req, res) => {
  try {
    console.log("addVideoSeries called with courseId:", req.params.courseId);
    
    const { courseId } = req.params;
    const instructorId = req.instructor.id;

    if (!instructorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Find course and verify ownership
    const course = await Course.findOne({
      _id: courseId,
      instructor: instructorId,
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: "Course not found or you don't have permission",
      });
    }

    const files = req.files || [];
    let meta = req.body.meta || [];

    console.log(`Received ${files.length} files and ${Array.isArray(meta) ? meta.length : 1} metadata entries`);

    // Normalize meta to array
    if (!Array.isArray(meta)) {
      meta = [meta];
    }

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No video files provided",
      });
    }

    if (files.length !== meta.length) {
      return res.status(400).json({
        success: false,
        message: `Video files (${files.length}) and metadata (${meta.length}) count mismatch`,
      });
    }

    const series = [];
    const errors = [];

    // Get the current number of videos to calculate order
    const currentVideoCount = course.videoSeries ? course.videoSeries.length : 0;

    // Upload videos sequentially to avoid Cloudinary rate limits
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let parsedMeta;

      try {
        parsedMeta = JSON.parse(meta[i]);
      } catch (err) {
        errors.push(`Video ${i + 1}: Invalid metadata format`);
        continue;
      }

      // Validate video title
      if (!parsedMeta.videoTitle || parsedMeta.videoTitle.trim() === "") {
        errors.push(`Video ${i + 1}: Title is required`);
        continue;
      }

      // Validate file size (Cloudinary free plan: 100MB max)
      if (file.size > 100 * 1024 * 1024) {
        errors.push(`Video ${i + 1}: File too large (max 100MB)`);
        continue;
      }

      try {
        console.log(`Uploading video ${i + 1}: ${parsedMeta.videoTitle}`);
        
        // Upload to Cloudinary
        const uploaded = await cloudinary.uploader.upload(file.path, {
          resource_type: "video",
          folder: `lms_courses/${courseId}/videos`,
          chunk_size: 6000000, // 6MB chunks for large files
          timeout: 120000, // 2 minute timeout
        });

        console.log(`Video ${i + 1} uploaded successfully: ${uploaded.public_id}`);

        // Create video object with proper order (existing count + index)
        const videoObj = {
          videoTitle: parsedMeta.videoTitle.trim(),
          order: currentVideoCount + i, // This ensures order continues from existing videos
          videoUrl: uploaded.secure_url,
          cloudinaryPublicId: uploaded.public_id,
          duration: uploaded.duration || 0,
          createdAt: new Date(),
        };

        // Add quizzes if provided
        if (parsedMeta.quizzes && Array.isArray(parsedMeta.quizzes)) {
          videoObj.quizzes = parsedMeta.quizzes.map(quiz => ({
            question: quiz.question || "",
            options: Array.isArray(quiz.options) ? quiz.options : ["", "", "", ""],
            correctAnswer: parseInt(quiz.correctAnswer) || 0,
            points: parseInt(quiz.points) || 10,
          }));
        } else {
          videoObj.quizzes = [];
        }

        series.push(videoObj);

        // Clean up temp file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

      } catch (uploadErr) {
        console.error(`Error uploading video ${i + 1}:`, uploadErr);
        errors.push(`Video ${i + 1}: Upload failed - ${uploadErr.message}`);
        
        // Clean up temp file even on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    // Check if we have any successful uploads
    if (series.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No videos were uploaded successfully",
        errors: errors,
      });
    }

    // Update course with new video series
    // If videoSeries doesn't exist, initialize it
    if (!course.videoSeries || !Array.isArray(course.videoSeries)) {
      course.videoSeries = [];
    }

    // Add new videos to existing ones
    course.videoSeries = [...course.videoSeries, ...series];
    
    // Sort by order (should already be correct, but just in case)
    course.videoSeries.sort((a, b) => a.order - b.order);
    
    await course.save();

    console.log(`Successfully saved ${series.length} videos to course ${courseId}`);

    res.json({
      success: true,
      uploaded: series.length,
      videoSeries: series,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${series.length} video${series.length > 1 ? 's' : ''}`
    });

  } catch (err) {
    console.error("Error in addVideoSeries:", err);
    
    // Clean up any remaining temp files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const getExistingVideoSeries = async (req, res) => {
  try {
    console.log("getExistingVideoSeries called for course:", req.params.courseId);
    
    const { courseId } = req.params;
    const instructorId = req.instructor.id;

    if (!instructorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      instructor: instructorId,
    }).select("videoSeries");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or access denied",
      });
    }

    const videoSeries = course.videoSeries || [];
    
    // FIX: Include _id in sanitizedSeries
    const sanitizedSeries = videoSeries.map(video => ({
      _id: video._id, // ✅ CRITICAL: Include the _id field
      videoTitle: video.videoTitle || "",
      videoUrl: video.videoUrl || "",
      cloudinaryPublicId: video.cloudinaryPublicId || "",
      duration: video.duration || 0,
      quizzes: video.quizzes || [],
      order: video.order || 0,
      createdAt: video.createdAt || new Date(),
    }));

    console.log(`Returning ${sanitizedSeries.length} videos for course ${courseId}`);
    console.log("Sample video ID:", sanitizedSeries[0]?._id); // Debug log

    res.json({
      success: true,
      videoSeries: sanitizedSeries,
      count: sanitizedSeries.length,
    });

  } catch (err) {
    console.error("Error in getExistingVideoSeries:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


export const deleteVideoFromSeries = async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const instructorId = req.instructor.id;

    console.log(`Delete video request - Course: ${courseId}, Video: ${videoId}`);

    if (!instructorId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Find course and verify ownership
    const course = await Course.findOne({
      _id: courseId,
      instructor: instructorId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or access denied",
      });
    }

    // Check if videoSeries exists
    if (!course.videoSeries || !Array.isArray(course.videoSeries)) {
      return res.status(404).json({
        success: false,
        message: "No video series found in this course",
      });
    }

    // Find video index by _id
    const videoIndex = course.videoSeries.findIndex(
      video => video._id.toString() === videoId
    );

    if (videoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Video not found in series",
      });
    }

    const deletedVideo = course.videoSeries[videoIndex];

    // ☁️ Cloudinary cleanup
    if (deletedVideo.cloudinaryPublicId) {
      try {
        console.log(`Deleting from Cloudinary: ${deletedVideo.cloudinaryPublicId}`);
        
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(deletedVideo.cloudinaryPublicId, {
          resource_type: 'video',
          invalidate: true
        });
        
        console.log(`Successfully deleted from Cloudinary: ${deletedVideo.cloudinaryPublicId}`);
      } catch (cloudinaryErr) {
        console.warn(`⚠ Cloudinary delete failed: ${cloudinaryErr.message}`);
        // Continue with DB deletion even if Cloudinary fails
        // Log this for manual cleanup
        console.warn(`Manual cleanup needed for: ${deletedVideo.cloudinaryPublicId}`);
      }
    }

    // Remove video from array
    course.videoSeries.splice(videoIndex, 1);

    // Reorder remaining videos
    course.videoSeries.forEach((video, index) => {
      video.order = index;
    });

    await course.save();

    // Log the deletion
    console.log(`Deleted video: "${deletedVideo.videoTitle}" from course: ${courseId}`);
    console.log(`Remaining videos: ${course.videoSeries.length}`);

    res.json({
      success: true,
      message: "Video deleted successfully",
      deletedVideo: {
        title: deletedVideo.videoTitle,
        videoId: deletedVideo._id,
        hadCloudinaryCleanup: !!deletedVideo.cloudinaryPublicId
      },
      remainingCount: course.videoSeries.length
    });

  } catch (err) {
    console.error("Error in deleteVideoFromSeries:", err);
    
    res.status(500).json({
      success: false,
      message: "Failed to delete video",
      error: err.message,
    });
  }
};