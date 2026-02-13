// middleware/checkEnrollment.js
import Enrollment from '../Models/EnrollmentModel.js';

const checkEnrollment = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user?.id;

    if (!userId || !courseId) {
      req.isEnrolled = false;
      return next();
    }

    const enrollment = await Enrollment.findOne({
      userId,
      courseId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });

    req.isEnrolled = !!enrollment;
    next();
  } catch (error) {
    console.error('CheckEnrollment error:', error);
    req.isEnrolled = false;
    next();
  }
};

export default checkEnrollment;