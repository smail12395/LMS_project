import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import userModel from "../Models/userModel.js";
import Course from "../Models/courseModel.js";
import Stripe from 'stripe';
import Instructor from '../Models/instructorModel.js';
import Enrollment from '../Models/EnrollmentModel.js';
// =======================
// REGISTER USER
// =======================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing details" });
    }

    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email" });
    }

    if (password.length < 4) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a strong password" });
    }

    // Check if email already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please log in instead.",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new userModel({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({ success: true, token });
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

// =======================
// LOGIN USER
// =======================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing email or password" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ success: true, token });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

export const getPublicCourses = async (req, res) => {
  try {
    // Fetch only necessary fields, populate instructor name and speciality
    const courses = await Course.find({})
      .select('name imageCover description price createdAt instructor')
      .populate('instructor', 'name speciality')
      .lean(); // convert to plain JS objects for performance

    // Format date to readable string
    const formattedCourses = courses.map((course) => ({
      ...course,
      createdAt: course.createdAt
        ? new Date(course.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : null,
      instructorName: course.instructor?.name || 'Unknown',
      instructorSpeciality: course.instructor?.speciality || '',
    }));

    res.status(200).json({
      success: true,
      count: formattedCourses.length,
      data: formattedCourses,
    });
  } catch (error) {
    console.error('Error fetching public courses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error, could not fetch courses',
    });
  }
};


export const getPaymentInfo = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const course = await Course.findById(courseId).populate('instructor');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const instructor = course.instructor;
    if (!instructor || !instructor.stripePublicKey) {
      return res.status(400).json({
        success: false,
        message: 'Instructor has not set up Stripe payments',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        courseName: course.name,
        courseId: course._id,
        price: course.price,
        instructorName: instructor.name,
        stripePublicKey: instructor.stripePublicKey, // safe to expose
      },
    });
  } catch (error) {
    console.error('getPaymentInfo error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a Stripe PaymentIntent (uses instructor's secret key)
// @route   POST /api/payments/create-payment-intent
// @access  Private (authUser)
export const createPaymentIntent = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    // 1. Get course & instructor
    const course = await Course.findById(courseId).populate('instructor');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const instructor = course.instructor;
    if (!instructor || !instructor.stripeSecretKey) {
      return res.status(400).json({
        success: false,
        message: 'Instructor payment configuration missing',
      });
    }

    // 2. Initialize Stripe with this instructor's secret key
    const stripe = new Stripe(instructor.stripeSecretKey);

    // 3. Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(course.price * 100), // Stripe uses cents
      currency: 'usd',
      metadata: {
        courseId: course._id.toString(),
        userId: userId.toString(),
        instructorId: instructor._id.toString(),
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('createPaymentIntent error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Confirm enrollment after successful payment
// @route   POST /api/payments/confirm-enrollment
// @access  Private (authUser)
export const confirmEnrollment = async (req, res) => {
  try {
    const { paymentIntentId, courseId } = req.body;
    const userId = req.user.id;

    // 1. Get course & instructor to verify payment with Stripe
    const course = await Course.findById(courseId).populate('instructor');
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const instructor = course.instructor;
    const stripe = new Stripe(instructor.stripeSecretKey);

    // 2. Retrieve the PaymentIntent to verify its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful',
      });
    }

    // 3. Create enrollment
    const enrollment = await Enrollment.create({
      userId,
      courseId,
      enrolledAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'active',
      paymentId: paymentIntentId,
      amountPaid: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });

    await Course.findByIdAndUpdate(courseId, {
      $inc: { numberOfUsersPaidForThisCourse: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Enrollment successful',
      data: enrollment,
    });
  } catch (error) {
    console.error('confirmEnrollment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

import { cloudinary } from '../config/cloudinary.js'; 

const extractCloudinaryPublicId = (url) => {
  try {
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return matches ? matches[1] : null;
  } catch {
    return null;
  }
};
export const getCourseDetails = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const isEnrolled = req.isEnrolled;

    const course = await Course.findById(courseId)
      .populate('instructor', 'name speciality')
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // ---------- Public data (for everyone) ----------
    const publicData = {
      _id: course._id,
      name: course.name,
      description: course.description,
      imageCover: course.imageCover,
      price: course.price,
      instructorName: course.instructor?.name || 'Unknown',
      instructorSpeciality: course.instructor?.speciality || '',
      numberOfStudents: course.numberOfUsersPaidForThisCourse || 0,
      videoSeries: course.videoSeries?.map(v => ({
        _id: v._id,
        videoTitle: v.videoTitle,
        duration: v.duration,
        order: v.order,
        createdAt: v.createdAt,
        // quizzes not included for non‑enrolled
      })) || [],
      content: course.content?.map(c => ({
        _id: c._id,
        title: c.title,
        contentType: c.contentType,
        position: c.position,
        createdAt: c.createdAt,
      })) || [],
    };

    publicData.videoSeries.sort((a, b) => a.order - b.order);

    if (!isEnrolled) {
      return res.status(200).json({
        success: true,
        isEnrolled: false,
        data: publicData,
      });
    }

    // ---------- Enriched content (signed PDFs, plain text) ----------
    const enrichedContent = await Promise.all(
      publicData.content.map(async (item) => {
        const originalItem = course.content.find(c => c._id.toString() === item._id.toString());
        if (item.contentType === 'pdf' && originalItem?.contentData?.includes('cloudinary')) {
          const publicId = extractCloudinaryPublicId(originalItem.contentData);
          if (publicId) {
            const signedPdfUrl = cloudinary.url(publicId, {
              resource_type: 'raw',
              sign_url: true,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              secure: true,
            });
            return { ...item, contentData: signedPdfUrl };
          }
        } else if (item.contentType === 'postText') {
          return { ...item, contentData: originalItem?.contentData || '' };
        }
        return item;
      })
    );

    enrichedContent.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : 0;
      const dateB = b.createdAt ? new Date(b.createdAt) : 0;
      return dateB - dateA;
    });

    // ---------- Full data for enrolled users (including quizzes) ----------
    const fullData = {
      ...publicData,
      content: enrichedContent,
      videoSeries: course.videoSeries.map(v => ({
        _id: v._id,
        videoTitle: v.videoTitle,
        duration: v.duration,
        order: v.order,
        createdAt: v.createdAt,
        quizzes: v.quizzes?.map(q => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
        })) || [],
      })),
    };

    res.status(200).json({
      success: true,
      isEnrolled: true,
      data: fullData,
    });
  } catch (error) {
    console.error('getCourseDetails error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

import axios from 'axios';

export const streamVideo = async (req, res) => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://yourdomain.com'];
  const referer = req.headers.referer || req.headers.origin;

  if (!referer || !allowedOrigins.some(origin => referer.startsWith(origin))) {
    console.warn(`🚫 Blocked request from unknown origin: ${referer}`);
    return res.status(403).send('Access denied'); // لا نستخدم JSON لأن عنصر الفيديو يتوقع stream
  }

  try {
    const video = req.video;
    const range = req.headers.range;
    const userId = req.user.id;  
    const user = await userModel.findById(userId).select('email');
    const userEmail = user?.email || userId;

    const watermarkText = encodeURIComponent(userEmail);

// ✅ العلامة المائية الثابتة (تعمل على جميع الخطط)
const transformation = [
  {
    overlay: {
      font_family: 'Arial',
      font_size: 36,                // حجم كبير
      font_weight: 'bold',
      text: watermarkText,
      background: 'rgba:00000080', // خلفية سوداء شفافة 50% (اختياري)
    },
    color: 'white',
    opacity: 70,                   // شفافية 70% (أقل شفافية = أوضح)
    gravity: 'center',            // في المنتصف تماماً
    // لا نضيف start_offset ولا duration → تستمر طوال الفيديو
  },
];

    // ✅ 1. التحقق من وجود cloudinaryPublicId
    if (!video.cloudinaryPublicId) {
      console.error(`❌ Video ${video._id} has no cloudinaryPublicId`);
      return res.status(400).json({ 
        success: false, 
        message: 'Video configuration missing' 
      });
    }

    console.log(`🎬 Streaming: ${video.videoTitle} | ID: ${video._id}`);
    console.log(`📦 Cloudinary Public ID: ${video.cloudinaryPublicId}`);

    // ✅ 2. توليد الرابط الموقع – مع التأكد من وجود الدالة
    if (typeof cloudinary.url !== 'function') {
      console.error('❌ cloudinary.url is not a function – check cloudinary import');
      return res.status(500).json({ success: false, message: 'Cloudinary configuration error' });
    }

    const signedUrl = cloudinary.url(video.cloudinaryPublicId, {
      resource_type: 'video',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 300, // 5 دقائق
      secure: true,
      format: 'mp4',
      transformation,
    });

    console.log(`🔗 Signed URL generated (expires 5 min)`);

    // ✅ 3. تجهيز headers للطلب إلى Cloudinary
    const headers = {};
    if (range) {
      headers.Range = range;
      console.log(`📡 Range requested: ${range}`);
    }

    // ✅ 4. طلب الفيديو من Cloudinary
    const response = await axios({
      method: 'get',
      url: signedUrl,
      responseType: 'stream',
      headers,
      timeout: 10000, // مهلة 10 ثوانٍ
    }).catch((err) => {
      console.error('❌ Axios error details:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
      });
      throw err;
    });

    console.log(`✅ Cloudinary response status: ${response.status}`);

    // ✅ 5. تمرير headers الاستجابة
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }

    // هيدرات منع التخزين
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Accept-Ranges', 'bytes');

    // كود الحالة المناسب
    res.status(range ? 206 : 200);

    // ✅ 6. تمرير الـ stream
    response.data.pipe(res);

    response.data.on('end', () => {
      console.log(`✅ Stream finished: ${video.videoTitle}`);
    });

    response.data.on('error', (streamError) => {
      console.error(`❌ Stream pipe error: ${video.videoTitle}`, streamError.message);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

  } catch (error) {
    console.error('❌ streamVideo error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });

    if (!res.headersSent) {
      // ✅ نرسل JSON فقط إذا كان الطلب يتوقع JSON (مثل fetch من الفيديو)
      // لكن للـ video element، يجب أن نرسل خطأ 500 مع stream فارغ أو نص خطأ
      res.status(500).setHeader('Content-Type', 'text/plain').send('Video stream error');
    }
  }
};


// controllers/userController.js
export const streamContentVideo = async (req, res) => {
  // التحقق من Referer (نفس المنطق)
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
  const referer = req.headers.referer || req.headers.origin;
  if (!referer || !allowedOrigins.some(origin => referer.startsWith(origin))) {
    console.warn(`🚫 Blocked content video request from unknown origin: ${referer}`);
    return res.status(403).send('Access denied');
  }

  try {
    const { courseId, contentId } = req.params;
    const userId = req.user.id;

    // 1. جلب الدورة والتحقق من الاشتراك
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const enrollment = await Enrollment.findOne({
      userId,
      courseId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // 2. البحث عن عنصر المحتوى
    const contentItem = course.content.find(
      (item) => item._id.toString() === contentId
    );
    if (!contentItem || contentItem.contentType !== 'video') {
      return res.status(404).json({ success: false, message: 'Video content not found' });
    }

    // 3. استخراج publicId من رابط Cloudinary
    const publicId = extractCloudinaryPublicId(contentItem.contentData);
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'Invalid video URL' });
    }

    // 4. توليد رابط موقع صالح لمدة دقيقة
    const signedUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60,
      secure: true,
      format: 'mp4',
    });

    // 5. تمرير البث إلى العميل (مثل streamVideo)
    const range = req.headers.range;
    const headers = {};
    if (range) headers.Range = range;

    const response = await axios({
      method: 'get',
      url: signedUrl,
      responseType: 'stream',
      headers,
      timeout: 10000,
    });

    // تمرير headers الاستجابة
    if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range']);
    if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
    if (response.headers['content-type']) res.setHeader('Content-Type', response.headers['content-type']);

    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Accept-Ranges', 'bytes');

    res.status(range ? 206 : 200);
    response.data.pipe(res);

    response.data.on('end', () => console.log(`✅ Content video stream finished: ${contentItem.title}`));
    response.data.on('error', (err) => {
      console.error('Stream pipe error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });

  } catch (error) {
    console.error('streamContentVideo error:', error.message);
    if (!res.headersSent) res.status(500).send('Video stream error');
  }
};
// controllers/quizController.js
import QuizAnswer from '../Models/QuizAnswer.js';

export const saveQuizAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, quizId, selectedOption, duration, isSecondShot } = req.body;

    // Validate required fields
    if (!courseId || !quizId || selectedOption === undefined || duration === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: courseId, quizId, selectedOption, duration' 
      });
    }

    // Ensure selectedOption and duration are numbers
    if (typeof selectedOption !== 'number' || typeof duration !== 'number' || isNaN(duration)) {
      return res.status(400).json({ 
        success: false, 
        message: 'selectedOption and duration must be valid numbers' 
      });
    }

    // Find course to get quiz details (for snapshot)
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Locate the quiz inside videoSeries
    let quizData = null;
    for (const video of course.videoSeries) {
      const found = video.quizzes?.find(q => q._id.toString() === quizId);
      if (found) {
        quizData = found;
        break;
      }
    }

    if (!quizData) {
      return res.status(404).json({ success: false, message: 'Quiz not found in course' });
    }

    const isCorrect = (selectedOption === quizData.correctAnswer);

    // Find existing answer document for this user/course/quiz
    let answer = await QuizAnswer.findOne({ user: userId, course: courseId, quiz: quizId });

    if (!answer) {
      // First shot – create new document
      const shotData = {
        isCorrect,
        duration,
        selectedOption
      };

      answer = new QuizAnswer({
        user: userId,
        course: courseId,
        quiz: quizId,
        quizSnapshot: {
          question: quizData.question,
          options: quizData.options,
          pointsPossible: quizData.points
        },
        firstShot: shotData,
        // secondShot left undefined
      });
    } else {
      // Existing answer – this should be the second shot
      if (answer.secondShot) {
        return res.status(400).json({ success: false, message: 'Both attempts already used for this quiz' });
      }
      // Ensure firstShot exists
      if (!answer.firstShot) {
        return res.status(400).json({ success: false, message: 'First shot missing – cannot add second shot' });
      }

      const shotData = {
        isCorrect,
        duration,
        selectedOption
      };
      answer.secondShot = shotData;
    }

    await answer.save(); // pre-save hook calculates totalPointsEarned and passed

    res.status(200).json({
      success: true,
      data: answer,
      message: 'Answer saved successfully'
    });
  } catch (error) {
    console.error('saveQuizAnswer error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getUserQuizAnswers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    const answers = await QuizAnswer.find({ user: userId, course: courseId }).lean();

    res.status(200).json({
      success: true,
      data: answers
    });
  } catch (error) {
    console.error('getUserQuizAnswers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};