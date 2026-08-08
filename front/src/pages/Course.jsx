// src/pages/Course.jsx
//
// AUDIT NOTE: reviewed against every backend change made in this pass
// (watermarking, streaming fixes, CORS fix, schema fix) — nothing here
// needs to change. The watermark is applied server-side inside
// streamVideo/streamContentVideo, so the exact same stream URLs this file
// already builds now transparently come back watermarked. Delivered
// unchanged, byte-for-byte identical to what you pasted, so you have the
// full "safe" set together in one place

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { isPreviewMode } from '../services/dataMode';
import { courseById, quizAnswers, previewMutation } from '../services/previewData';

const COURSE_IMAGE_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#E2E8F0" />
      <rect x="80" y="90" width="440" height="220" rx="24" fill="#94A3B8" />
      <path d="M220 240 L320 180 L380 220 L420 180" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="220" cy="180" r="28" fill="#FFFFFF" />
      <text x="300" y="330" font-family="sans-serif" font-size="28" fill="#334155" text-anchor="middle">Course Image</text>
    </svg>
  `);

const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('content'); // 'content' أو 'videos'
  const [videoStreamUrl, setVideoStreamUrl] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

const [selectedContentVideo, setSelectedContentVideo] = useState(null);
const [contentVideoStreamUrl, setContentVideoStreamUrl] = useState(null);
const [contentVideoError, setContentVideoError] = useState(false);
const [imageModalOpen, setImageModalOpen] = useState(false);
const [selectedImageUrl, setSelectedImageUrl] = useState(null);
const [isSubmitting, setIsSubmitting] = useState(false);

// Quiz state
// Quiz answers from backend
const [userAnswers, setUserAnswers] = useState({}); // key: quizId -> answer object
// Current quiz session
const [quizSession, setQuizSession] = useState(null); // { videoId, videoTitle, quizzes, currentIndex, shot, remainingWrong }
// For timing each quiz
const [quizStartTime, setQuizStartTime] = useState(null);
// Quiz UI states
const [quizzesView, setQuizzesView] = useState('list'); // 'list' or 'take'
const [selectedOption, setSelectedOption] = useState(null);
const [answerSubmitted, setAnswerSubmitted] = useState(false);
const [elapsedTime, setElapsedTime] = useState(0);
const timerRef = useRef(null);
const startTimer = () => {
  if (timerRef.current) clearInterval(timerRef.current);
  setElapsedTime(0);
  timerRef.current = setInterval(() => {
    setElapsedTime(prev => prev + 1);
  }, 1000);
};

const stopTimer = () => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};
useEffect(() => {
  if (isEnrolled && courseId) {
    fetchUserAnswers();
  }
}, [isEnrolled, courseId]);

const fetchUserAnswers = async () => {
  try {
    const token = localStorage.getItem('token');
    const { data } = isPreviewMode
      ? await quizAnswers(courseId)
      : await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/user/quizzes/my-answers/${courseId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
    if (data.success) {
      const answersMap = {};
      data.data.forEach(ans => {
        answersMap[ans.quiz] = ans;
      });
      setUserAnswers(answersMap);
    }
  } catch (err) {
    console.error('Error fetching user answers:', err);
  }
};
// Start a quiz session for a given video
const startQuizSession = (video) => {
  const videoQuizzes = video.quizzes || [];
  
  // Quizzes needing first shot (no answer yet)
  const needFirstShot = videoQuizzes.filter(quiz => {
    const ans = userAnswers[quiz._id];
    return !ans || !ans.firstShot;
  });

  // Quizzes needing second shot (first shot wrong, no second shot yet)
  const needSecondShot = videoQuizzes.filter(quiz => {
    const ans = userAnswers[quiz._id];
    return ans && ans.firstShot && !ans.firstShot.isCorrect && !ans.secondShot;
  });

  if (needFirstShot.length > 0) {
    setQuizSession({
      videoId: video._id,
      videoTitle: video.videoTitle,
      quizzes: needFirstShot,          // only this video's pending quizzes
      currentIndex: 0,
      shot: 'first',
      remainingWrong: []                // reset for this session
    });
    setQuizzesView('take');
  } else if (needSecondShot.length > 0) {
    setQuizSession({
      videoId: video._id,
      videoTitle: video.videoTitle,
      quizzes: needSecondShot,          // only this video's second‑shot quizzes
      currentIndex: 0,
      shot: 'second',
      remainingWrong: []
    });
    setQuizzesView('take');
  } else {
    toast.info('You have no remaining attempts for this video.');
  }
};

// Move to the next quiz in the current session
const moveToNextQuiz = () => {
  const nextIndex = quizSession.currentIndex + 1;
  if (nextIndex < quizSession.quizzes.length) {
    setQuizSession(prev => ({
      ...prev,
      currentIndex: nextIndex
    }));
  } else {
    // Finished current round
    if (quizSession.shot === 'first') {
      // First shot round completed
      if (quizSession.remainingWrong.length > 0) {
        toast.info(`You finished your first shot in this video. Now starting second shot for ${quizSession.remainingWrong.length} quiz(zes).`);
        const wrongQuizzes = quizSession.quizzes.filter(q => 
          quizSession.remainingWrong.includes(q._id)
        );
        setQuizSession({
          videoId: quizSession.videoId,
          videoTitle: quizSession.videoTitle,
          quizzes: wrongQuizzes,          // only wrong ones from this video
          currentIndex: 0,
          shot: 'second',
          remainingWrong: []
        });
      } else {
        toast.success('You have completed all quizzes for this video!');
        setQuizzesView('list');
        setQuizSession(null);
        fetchUserAnswers();
      }
    } else {
      // Second shot round completed
      toast.success('You have completed all quizzes for this video!');
      setQuizzesView('list');
      setQuizSession(null);
      fetchUserAnswers();
    }
  }
};

// Submit the selected answer to the backend
const submitAnswer = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);
  stopTimer();

  if (selectedOption === null) {
    toast.warning('Please select an answer');
    setIsSubmitting(false);
    return;
  }
  if (!quizSession || !quizSession.quizzes[quizSession.currentIndex]) {
    toast.error('Quiz session expired. Please restart.');
    setIsSubmitting(false);
    return;
  }

  const currentQuiz = quizSession.quizzes[quizSession.currentIndex];
  const duration = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;

  try {
    if (isPreviewMode) {
      previewMutation('Saving quiz answer');
      return;
    }

    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/api/user/quizzes/save-answer`,
      {
        courseId,
        quizId: currentQuiz._id,
        selectedOption,
        duration,
        isSecondShot: quizSession.shot === 'second'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      setUserAnswers(prev => ({ ...prev, [currentQuiz._id]: response.data.data }));
      // Now show feedback and next button
      setAnswerSubmitted(true);
    }
  } catch (error) {
    console.error('Error saving answer:', error);
    const msg = error.response?.data?.message || 'Failed to save answer';
    toast.error(msg);
  } finally {
    setIsSubmitting(false);
  }
};

// Get remaining attempts info for a video
const getVideoChanceInfo = (video) => {
  const videoQuizzes = video.quizzes || [];
  let firstShotRemaining = 0;
  let secondShotRemaining = 0;

  videoQuizzes.forEach(quiz => {
    const ans = userAnswers[quiz._id];
    if (!ans || !ans.firstShot) {
      firstShotRemaining++;
    } else if (ans.firstShot && !ans.firstShot.isCorrect && !ans.secondShot) {
      secondShotRemaining++;
    }
  });

  return { firstShotRemaining, secondShotRemaining };
};
// Reset quiz timer when current quiz changes
useEffect(() => {
  if (quizSession && quizSession.quizzes[quizSession.currentIndex]) {
    // Stop any previous timer
    stopTimer();
    // Reset states
    setQuizStartTime(Date.now());
    setSelectedOption(null);
    setAnswerSubmitted(false);
    setElapsedTime(0);
    // Start timer for new quiz
    startTimer();
  }
  // Cleanup on unmount or when session ends
  return () => stopTimer();
}, [quizSession, quizSession?.currentIndex]);

  // جلب بيانات الدورة
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Please login first');
          navigate('/login');
          return;
        }

        const { data } = isPreviewMode
          ? await courseById(courseId)
          : await axios.get(
              `${import.meta.env.VITE_BACKEND_URL}/api/user/courses/${courseId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

        if (data.success) {
          setCourse(data.data);
          setIsEnrolled(data.isEnrolled);
          setSelectedVideo(null);
          setVideoStreamUrl(null);
        } else {
          setError(data.message || 'Failed to load course');
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Error loading course');
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, navigate]);


const handlePlayContentVideo = async (contentItem) => {
  if (!isEnrolled && contentItem.availability !== 'free') return;
  setSelectedContentVideo(contentItem);
  setContentVideoError(false);

  if (isPreviewMode) {
    // Preview videos are served as static files from the preview-data folder.
    setContentVideoStreamUrl(contentItem.contentData);
    return;
  }

  const token = localStorage.getItem('token');
  const timestamp = Date.now();
  const streamUrl = `${import.meta.env.VITE_BACKEND_URL}/api/user/content/stream/${courseId}/${contentItem._id}?t=${timestamp}&token=${encodeURIComponent(token)}`;
  setContentVideoStreamUrl(streamUrl);
};

  // Attach the auth token to a protected media URL (used by content images
  // and PDFs served through the watermarked /api/user/media route).
  const withToken = (url) => {
    if (!url) return url;
    if (url.includes('?')) return `${url}&token=${encodeURIComponent(localStorage.getItem('token') || '')}`;
    return `${url}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`;
  };

  // A content item is actionable when the user is enrolled, or when the
  // item is flagged "free" (Everyone - visible to all users).
  const canAccessItem = (item) =>
    isEnrolled || item.availability === 'free';


  // اختيار فيديو – إنشاء رابط البث المباشر (بدون blob)
  // In preview mode the local /preview-data video file is used directly.
  const buildVideoStreamUrl = (video) => {
    if (isPreviewMode) {
      return `public/preview-data/storage/videos/${video.filename}`;
    }
    const token = localStorage.getItem('token');
    const timestamp = Date.now();
    return `${import.meta.env.VITE_BACKEND_URL}/api/user/videos/stream/${courseId}/${video._id}?t=${timestamp}&token=${encodeURIComponent(token)}`;
  };

  const handleSelectVideo = (video) => {
    if (!isEnrolled) return;
    setSelectedVideo(video);
    setVideoError(false);
    setRetryCount(0);
    setVideoStreamUrl(buildVideoStreamUrl(video));
  };

  const handleVideoError = () => {
    console.error('Video stream error');
    setVideoError(true);

    if (retryCount < MAX_RETRIES) {
      toast.info(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setVideoStreamUrl((prev) => {
          if (!prev) return prev;
          return prev.replace(/t=\d+/, `t=${Date.now()}`);
        });
      }, 1500);
    } else {
      toast.error('Unable to play video. Please try another video or contact support.');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ترتيب المحتوى: الأحدث أولاً
  const sortedContent = course?.content
    ? [...course.content].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : 0;
        const dateB = b.createdAt ? new Date(b.createdAt) : 0;
        return dateB - dateA;
      })
    : [];

  // ترتيب الفيديوهات حسب order
  const sortedVideos = course?.videoSeries
    ? [...course.videoSeries].sort((a, b) => a.order - b.order)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg text-slate-600 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-10 bg-white rounded-2xl border border-slate-200/70 shadow-soft max-w-md animate-fade-up">
          <div className="bg-rose-50 rounded-full p-3 inline-flex mb-4">
            <svg className="h-12 w-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Oops!</h3>
          <p className="text-slate-600 mb-6">{error || 'Course not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-brand w-full px-6 py-3"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* ========== HERO SECTION ========== */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-soft overflow-hidden mb-8 transition transform hover:shadow-soft-lg">
          <div className="lg:flex">
            <div className="lg:flex-shrink-0 lg:w-80 relative">
              <img
                className="h-56 w-full lg:h-full object-cover"
                src={course.imageCover || COURSE_IMAGE_FALLBACK}
                alt={course.name}
                onError={(e) => {
                  if (e.target.dataset.fallbackApplied) return;
                  e.target.dataset.fallbackApplied = 'true';
                  e.target.src = COURSE_IMAGE_FALLBACK;
                }}
              />
              {!isEnrolled && (
                <div className="absolute top-4 left-4 bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                  Preview
                </div>
              )}
            </div>
            <div className="p-8 lg:p-10 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mb-3">
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  {course.courseSpeciality || course.instructorSpeciality || 'Course'}
                </span>
                <span className="flex items-center text-slate-500">
                  <svg className="w-4 h-4 mr-1 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  {course.numberOfStudents} students
                </span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
                {course.name}
              </h1>
              <p className="text-slate-600 mb-6 text-lg leading-relaxed">
                {course.description}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center">
                  <div className="bg-primary rounded-full p-0.5">
                    <div className="bg-white rounded-full p-1">
                      <div className="bg-primary rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">
                        {course.instructorName?.charAt(0) || 'I'}
                      </div>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-900">{course.instructorName}</p>
                    <p className="text-xs text-slate-500">Instructor</p>
                  </div>
                </div>
                {!isEnrolled ? (
                  <button
                    onClick={() => navigate(`/pay/${courseId}`)}
                    className="group btn-brand px-8 py-3 text-base"
                  >
                    <span className="relative flex items-center">
                      Buy Now — ${course.price?.toFixed(2)}
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                ) : (
                  <span className="inline-flex items-center px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-semibold">
                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Enrolled
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>


<div className="mb-8">
  <div className="card p-1 flex max-w-md mx-auto lg:mx-0">
    <button
      onClick={() => {
        setActiveTab('content');
        setQuizzesView('list'); // reset quiz view when switching tabs
      }}
      className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
        activeTab === 'content'
          ? 'bg-primary text-white shadow-md'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      Course Content
    </button>
    <button
      onClick={() => {
        setActiveTab('videos');
        setQuizzesView('list');
      }}
      className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
        activeTab === 'videos'
          ? 'bg-primary text-white shadow-md'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      Videos ({sortedVideos.length})
    </button>
    <button
      onClick={() => {
        setActiveTab('quizzes');
        setQuizzesView('list');
      }}
      className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
        activeTab === 'quizzes'
          ? 'bg-primary text-white shadow-md'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      Video Quizzes
    </button>
  </div>
</div>

      
{activeTab === 'content' && (
  <div className="card p-6 lg:p-8">
    <div className="flex items-center mb-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center">
        <svg className="w-6 h-6 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
        Course Materials
      </h2>
    </div>

    {/* Video player for enrolled users and free content on free courses */}
    {selectedContentVideo && contentVideoStreamUrl && canAccessItem(selectedContentVideo) && (
      <div className="mb-8 bg-white rounded-xl border border-slate-200/70 shadow-soft overflow-hidden">
        <div className="bg-black aspect-w-16 aspect-h-9">
          {contentVideoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6">
              <svg className="w-12 h-12 text-rose-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Video unavailable. <button onClick={() => handlePlayContentVideo(selectedContentVideo)} className="text-emerald-400 underline">Retry</button></p>
            </div>
          ) : (
            <video
              key={contentVideoStreamUrl}
              controls
              controlsList="nodownload"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              onError={() => setContentVideoError(true)}
              className="w-full h-full"
            >
              <source src={contentVideoStreamUrl} type="video/mp4" />
            </video>
          )}
        </div>
        <div className="p-3 bg-slate-50 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700 truncate">{selectedContentVideo.title}</span>
          <button
            onClick={() => {
              setSelectedContentVideo(null);
              setContentVideoStreamUrl(null);
            }}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    )}

    {/* Image Modal */}
    {imageModalOpen && selectedImageUrl && (
      <div 
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm"
        onClick={() => setImageModalOpen(false)}
      >
        <div 
          className="relative flex items-center justify-center w-[92vw] max-w-5xl h-[85vh] rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={selectedImageUrl} 
            alt="Course content" 
            className="max-h-full max-w-full object-contain"
          />
          <button
            onClick={() => setImageModalOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-slate-100 transition"
          >
            <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )}

    {/* Content list */}
    {(() => {
      // Non-enrolled users only see items flagged "free" (Everyone - visible
      // to all users). Paid items require enrollment (the backend enforces
      // the same rule).
      const contentToShow = isEnrolled
        ? sortedContent
        : sortedContent.filter(item => item.availability === 'free');

      if (contentToShow.length === 0) {
        const emptyMessage = !isEnrolled
          ? 'No public content available.'
          : 'No course materials available.';
        return (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200/70">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-slate-600 font-medium">{emptyMessage}</p>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {contentToShow.map((item) => {
            const isNew =
              item.createdAt &&
              new Date(item.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            // Choose icon based on content type
            let icon;
            let bgColor;
            let iconColor;
            switch (item.contentType) {
              case 'pdf':
                icon = (
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                );
                bgColor = 'bg-rose-50';
                iconColor = 'text-rose-600';
                break;
              case 'video':
                icon = (
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                );
                bgColor = 'bg-emerald-50';
                iconColor = 'text-emerald-600';
                break;
              case 'postText':
                icon = (
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v2H6V4zm0 4h8v2H6V8zm0 4h8v2H6v-2z"
                    clipRule="evenodd"
                  />
                );
                bgColor = 'bg-slate-100';
                iconColor = 'text-slate-700';
                break;
              case 'image':
                icon = (
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                );
                bgColor = 'bg-amber-50';
                iconColor = 'text-amber-700';
                break;
              default:
                icon = (
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                );
                bgColor = 'bg-slate-100';
                iconColor = 'text-slate-600';
            }

            return (
              <div
                key={item._id}
                className={`group flex items-center p-4 border rounded-xl transition-all duration-200 ${
                  isEnrolled
                    ? 'hover:border-emerald-300 hover:shadow-soft hover:bg-emerald-50/40 border-slate-200'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 mr-4 ${bgColor} p-2 rounded-lg group-hover:bg-opacity-80 transition`}>
                  <svg className={`w-6 h-6 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                    {icon}
                  </svg>
                </div>

                {/* Title and metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-slate-900 truncate">{item.title}</p>
                    {isNew && isEnrolled && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.contentType === 'pdf' && 'PDF Document'}
                    {item.contentType === 'video' && 'Video'}
                    {item.contentType === 'postText' && 'Text'}
                    {item.contentType === 'image' && 'Image'}
                    {item.createdAt && <span className="ml-2">• {formatDate(item.createdAt)}</span>}
                  </p>
                </div>

                {/* Action buttons for enrolled users (and free content on free courses) */}
                {canAccessItem(item) && (
                  <>
                    {item.contentType === 'pdf' && item.contentData && (
                      <a
                        href={withToken(item.contentData)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-100 hover:shadow-sm transition flex items-center"
                      >
                        <span>View</span>
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {item.contentType === 'video' && (
                      <button
                        onClick={() => handlePlayContentVideo(item)}
                        className="ml-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 hover:shadow-sm transition flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                        Play
                      </button>
                    )}
                    {item.contentType === 'postText' && item.contentData && (
                      <div className="ml-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm max-w-xs truncate">
                        {item.contentData}
                      </div>
                    )}
            {item.contentType === "image" && (
              (() => {
                // Protected content image URL — attach the auth token so the
                // backend can authenticate and watermark it dynamically.
                const imageUrl = withToken(item.contentData);
                if (!imageUrl) {
                  // Optionally show a disabled state if no URL
                  return <div className="ml-2 px-4 py-2 bg-slate-200 text-slate-500 rounded-lg text-sm">No image</div>;
                }
                return (
                  <button
                    onClick={() => {
                      setSelectedImageUrl(imageUrl);
                      setImageModalOpen(true);
                    }}
                    className="ml-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 hover:shadow-sm transition flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    View Image
                  </button>
                );
              })()
            )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      );
    })()}
  </div>
)}

{activeTab === 'videos' && (
          <div className="card p-6 lg:p-8">
            {/* مشغل الفيديو - للمشتركين فقط */}
            {isEnrolled && selectedVideo && videoStreamUrl && (
              <div className="mb-8">
                <div className="bg-black rounded-xl overflow-hidden aspect-w-16 aspect-h-9">
                  {videoError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6">
                      <svg className="w-16 h-16 text-rose-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <h3 className="text-xl font-bold mb-2">Video Unavailable</h3>
                      <p className="text-slate-300 text-center mb-4">
                        We're having trouble playing this video.
                        if the same problem still refresh page.
                        {retryCount >= MAX_RETRIES && ' Please try another video.'}
                      </p>
                      {retryCount < MAX_RETRIES && (
                        <button
                          onClick={() => {
                            setRetryCount(0);
                            setVideoError(false);
                            setVideoStreamUrl(buildVideoStreamUrl(selectedVideo));
                          }}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-700 transition"
                        >
                          Try Again
                        </button>
                      )}
                    </div>
                  ) : (
                    <video
                      key={videoStreamUrl}
                      controls
                      controlsList="nodownload"
                      disablePictureInPicture
                      width="100%"
                      height="100%"
                      onError={handleVideoError}
                      onCanPlay={() => console.log('Video can play')}
                      onContextMenu={(e) => e.preventDefault()}
                      className="w-full h-full"
                    >
                      <source src={videoStreamUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
                <div className="mt-4">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedVideo.videoTitle}</h2>
                  <div className="flex items-center mt-2 text-slate-600">
                    <svg className="w-5 h-5 mr-1 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm">{formatDuration(selectedVideo.duration)}</span>
                  </div>
                </div>
              </div>
            )}

            {isEnrolled && !selectedVideo && (
              <div className="bg-slate-50 rounded-xl border border-slate-200/70 p-8 text-center mb-8">
                <svg className="mx-auto h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="mt-4 text-xl font-bold text-slate-900">Select a video to start learning</h3>
                <p className="mt-2 text-slate-600">Choose a video from the playlist below.</p>
              </div>
            )}

            {/* قائمة الفيديوهات - تظهر للجميع (مع إمكانية النقر للمشتركين فقط) */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  Course Videos
                </h2>
              </div>

              {sortedVideos.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {sortedVideos.map((video, index) => {
                    const isSelected = selectedVideo?._id === video._id;
                    return (
                      <button
                        key={video._id}
                        onClick={() => handleSelectVideo(video)}
                        disabled={!isEnrolled}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                          isSelected && isEnrolled
                            ? 'bg-emerald-50/60 border-2 border-primary shadow-soft'
                            : 'border border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                        } ${!isEnrolled ? 'cursor-default opacity-80' : 'cursor-pointer hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                              isSelected && isEnrolled
                                ? 'bg-primary text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                isSelected && isEnrolled ? 'text-emerald-900' : 'text-slate-900'
                              }`}
                            >
                              {video.videoTitle}
                            </p>
                            <div className="flex items-center mt-1 text-xs text-slate-500">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {formatDuration(video.duration)}
                            </div>
                          </div>
                          {!isEnrolled && (
                            <svg className="w-5 h-5 text-slate-400 ml-2" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 border border-slate-200/70 rounded-xl">
                  <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-slate-500">No videos available.</p>
                </div>
              )}

              {!isEnrolled && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <button
                    onClick={() => navigate(`/pay/${courseId}`)}
                    className="group btn-brand w-full px-6 py-3"
                  >
                    <span className="relative flex items-center">
                      Unlock Full Course
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-4">
                    Get access to all {sortedVideos.length} videos, PDFs, and quizzes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
{activeTab === 'quizzes' && (
  <div className="card p-6 lg:p-8">
    {quizzesView === 'list' ? (
      // ---------- LIST VIEW ----------
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <svg className="w-6 h-6 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
          Video Quizzes
        </h2>
        {sortedVideos.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No videos available.</p>
        ) : (
          <div className="space-y-6">
            {sortedVideos.map((video) => {
              const videoQuizzes = video.quizzes || [];
              if (videoQuizzes.length === 0) return null;
              const { firstShotRemaining, secondShotRemaining } = getVideoChanceInfo(video);
              const totalRemaining = firstShotRemaining + secondShotRemaining;

              return (
                <div key={video._id} className="border border-slate-200/70 rounded-xl p-4 hover:shadow-soft transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                        {video.videoTitle}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {firstShotRemaining > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                            First shot: {firstShotRemaining} left
                          </span>
                        )}
                        {secondShotRemaining > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                            Second shot: {secondShotRemaining} left
                          </span>
                        )}
                        {totalRemaining === 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            No attempts left
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => startQuizSession(video)}
                      disabled={totalRemaining === 0}
                      className={`px-4 py-2 text-sm rounded-lg transition ${
                        totalRemaining > 0
                          ? 'bg-primary text-white hover:bg-emerald-700'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Take Quiz
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{videoQuizzes.length} quiz(zes)</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ) : (
      // ---------- QUIZ TAKING VIEW ----------
      <div>
        <button
          onClick={() => {
            setQuizzesView('list');
            setQuizSession(null);
          }}
          className="mb-4 text-emerald-700 hover:text-emerald-900 flex items-center font-medium"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to quizzes
        </button>

        {quizSession && quizSession.quizzes[quizSession.currentIndex] && (
          <div className="max-w-2xl mx-auto">
<div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
  <p className="text-sm text-emerald-900">
    <span className="font-semibold">Video:</span> {quizSession.videoTitle}
  </p>
  <p className="text-xs text-emerald-700 mt-1">
    {quizSession.shot === 'first' ? 'First attempt' : 'Second attempt'} • Quiz {quizSession.currentIndex + 1} of {quizSession.quizzes.length}
  </p>
  {/* Timer display */}
  <div className="mt-2 flex items-center text-sm text-emerald-800">
    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>Time: {Math.floor(elapsedTime / 60)}:{elapsedTime % 60 < 10 ? '0' : ''}{elapsedTime % 60}</span>
  </div>
</div>

            {(() => {
              const currentQuiz = quizSession.quizzes[quizSession.currentIndex];
              const isLastQuiz = quizSession.currentIndex === quizSession.quizzes.length - 1;

              return (
                <>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{currentQuiz.question}</h3>

                  {/* Options rendering (same as before) */}
                  <div className="space-y-3 mb-6">
                    {currentQuiz.options.map((option, index) => {
                      let optionClass = 'p-4 border rounded-lg cursor-pointer transition ';
                      if (answerSubmitted) {
                        if (quizSession.shot === 'first') {
                          if (selectedOption === index && index !== currentQuiz.correctAnswer) {
                            optionClass += 'bg-rose-50 border-rose-500 text-rose-900 ';
                          } else {
                            optionClass += 'bg-slate-50 border-slate-200 text-slate-500 ';
                          }
                        } else {
                          if (index === currentQuiz.correctAnswer) {
                            optionClass += 'bg-emerald-50 border-emerald-500 text-emerald-900 ';
                          } else if (selectedOption === index && index !== currentQuiz.correctAnswer) {
                            optionClass += 'bg-rose-50 border-rose-500 text-rose-900 ';
                          } else {
                            optionClass += 'bg-slate-50 border-slate-200 text-slate-500 ';
                          }
                        }
                      } else {
                        optionClass += selectedOption === index
                          ? 'bg-emerald-50 border-primary text-emerald-900'
                          : 'bg-white border-slate-200 hover:bg-slate-50';
                      }

                      return (
                        <div
                          key={index}
                          className={optionClass}
                          onClick={() => {
                            if (!answerSubmitted) setSelectedOption(index);
                          }}
                        >
                          <div className="flex items-center">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full border text-sm mr-3
                              ${answerSubmitted && quizSession.shot === 'second' && index === currentQuiz.correctAnswer ? 'bg-emerald-500 text-white border-emerald-500' : 
                                answerSubmitted && quizSession.shot === 'second' && selectedOption === index && index !== currentQuiz.correctAnswer ? 'bg-rose-500 text-white border-rose-500' :
                                answerSubmitted && quizSession.shot === 'first' && selectedOption === index && index !== currentQuiz.correctAnswer ? 'bg-rose-500 text-white border-rose-500' :
                                selectedOption === index ? 'bg-primary text-white border-primary' : 'border-slate-300'}`}
                            >
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span>{option}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit / Action button */}
                  {!answerSubmitted ? (
<button
  onClick={submitAnswer}
  disabled={selectedOption === null || isSubmitting}
  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition
    ${selectedOption === null || isSubmitting ? 'bg-slate-300 cursor-not-allowed' : 'bg-primary hover:bg-emerald-700'}`}
>
  {isSubmitting ? 'Submitting...' : 'Submit Answer'}
</button>
                  ) : (
                    <div className="space-y-4">
                      {/* Feedback message */}
                      {(() => {
                        const isCorrect = (selectedOption === currentQuiz.correctAnswer);
                        if (quizSession.shot === 'first') {
                          return isCorrect ? (
                            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800">
                              <span className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Correct! Well done.
                              </span>
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg bg-rose-50 border border-rose-100 text-rose-800">
                              <span className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Incorrect. You have one more chance later.
                              </span>
                            </div>
                          );
                        } else {
                          return isCorrect ? (
                            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800">
                              <span className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Correct! Well done.
                              </span>
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg bg-rose-50 border border-rose-100 text-rose-800">
                              <span className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Incorrect. The correct answer is: {currentQuiz.options[currentQuiz.correctAnswer]}
                              </span>
                            </div>
                          );
                        }
                      })()}

                      {/* Conditional button: Next Quiz or Go Home */}
                      {!isLastQuiz ? (
                        <button
                          onClick={() => {
                            setAnswerSubmitted(false);
                            moveToNextQuiz();
                          }}
                          className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
                        >
                          Next Quiz
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setQuizzesView('list');
                            setQuizSession(null);
                            fetchUserAnswers(); // optional refresh
                          }}
                          className="w-full py-3 px-4 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition"
                        >
                          Go Home
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    )}
  </div>
)}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #10b981;
        }
      `}</style>
    </div>
  );
}


export default Course;
