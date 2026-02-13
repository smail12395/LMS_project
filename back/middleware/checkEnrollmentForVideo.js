// middleware/checkEnrollmentForVideo.js
import Course from '../Models/courseModel.js';
import Enrollment from '../Models/EnrollmentModel.js';

const checkEnrollmentForVideo = async (req, res, next) => {
  try {
    const { courseId, videoId } = req.params;
    const userId = req.user.id;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const video = course.videoSeries.find(
      (v) => v._id.toString() === videoId
    );
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // ✅ التحقق من الاشتراك
    const enrollment = await Enrollment.findOne({
      userId,
      courseId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Access denied. Please enroll first.' });
    }

    // ✅ التحقق من وجود cloudinaryPublicId
    if (!video.cloudinaryPublicId) {
      console.warn(`⚠️ Video ${videoId} has no cloudinaryPublicId`);
      // نسمح بالمرور على أي حال، ولكن الـ controller سيرفض
    }

    req.video = {
      _id: video._id,
      videoTitle: video.videoTitle,
      cloudinaryPublicId: video.cloudinaryPublicId,
      duration: video.duration,
    };

    next();
  } catch (error) {
    console.error('checkEnrollmentForVideo error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default checkEnrollmentForVideo;