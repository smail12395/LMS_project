import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { isPreviewMode } from '../services/dataMode';
import { courseById, quizAnswers, previewMutation } from '../services/previewData';
import {
  Play, FileText, Type, Image as ImageIcon, Clock, Users, BookOpen,
  CheckCircle2, ChevronRight, Lock, HelpCircle,
  Video, FileQuestion, ArrowLeft, ExternalLink, X, CircleDot,
  Pause, Volume2, VolumeX, Volume1, Maximize, RotateCcw, RotateCw,
  Gauge
} from 'lucide-react';

const WATERMARK_POSITIONS = [
  { top: '8px', left: '50%', transform: 'translateX(-50%)' },
  { bottom: '40px', right: '12px' },
  { top: '50%', left: '12px', transform: 'translateY(-50%)' },
  { top: '12px', right: '12px' },
  { bottom: '40px', left: '50%', transform: 'translateX(-50%)' },
  { top: '50%', right: '12px', transform: 'translateY(-50%)' },
];

const WatermarkOverlay = React.forwardRef(({ email, active }, ref) => {
  const [posIndex, setPosIndex] = React.useState(0);

  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setPosIndex((i) => (i + 1) % WATERMARK_POSITIONS.length);
    }, 12000);
    return () => clearInterval(id);
  }, [active]);

  if (!active || !email) return null;

  const pos = WATERMARK_POSITIONS[posIndex];

  return (
    <div
      ref={ref}
      data-watermark="true"
      style={{
        position: 'absolute',
        zIndex: 10,
        pointerEvents: 'none',
        userSelect: 'none',
        color: 'rgba(255,255,255,0.18)',
        fontSize: '14px',
        fontFamily: 'monospace',
        fontWeight: 500,
        letterSpacing: '0.5px',
        textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'all 2s ease-in-out',
        whiteSpace: 'nowrap',
        ...pos,
      }}
    >
      {email}
    </div>
  );
});
WatermarkOverlay.displayName = 'WatermarkOverlay';

const formatPlaybackTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

// Custom controls wrapper. The native <video> remains the playback engine and
// reuses the caller's videoRef so that seeking, watermarking and streaming are
// completely unchanged. The WatermarkOverlay and tamper-protection children are
// passed through and rendered above the video, below/inside this player.
const CustomVideoPlayer = ({
  src,
  videoRef,
  onError,
  className = '',
  children,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSpeed, setShowSpeed] = useState(false);
  const [dragTime, setDragTime] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const dragRef = useRef(null);

  const formatTime = (t) => {
    if (!Number.isFinite(t) || t < 0) return '0:00';
    return formatPlaybackTime(t);
  };

  const showControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !isDragging) {
        setControlsVisible(false);
      }
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Wire up video element events. Keeps playing/paused state in sync for the UI.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => { if (!isDragging) setCurrentTime(video.currentTime); };
    const onDuration = () => setDuration(video.duration || 0);
    const onPlay = () => { setIsPlaying(true); showControls(); };
    const onPause = () => { setIsPlaying(false); setControlsVisible(true); };
    const onVol = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    const onEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onDuration);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVol);
    video.addEventListener('ended', onEnded);

    setDuration(video.duration || 0);
    setVolume(video.volume);
    setMuted(video.muted);

    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onDuration);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('playing', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVol);
      video.removeEventListener('ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) video.play().catch(() => {});
    else video.pause();
  };

  const seekBy = (seconds) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = target;
    setCurrentTime(target);
    showControls();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    showControls();
  };

  const changeVolume = (v) => {
    const video = videoRef.current;
    if (!video) return;
    const val = Number(v);
    video.volume = val;
    if (val > 0 && video.muted) video.muted = false;
  };

  const toggleSpeed = () => {
    setShowSpeed((s) => !s);
    showControls();
  };

  const applySpeed = (rate) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeed(false);
    showControls();
  };

  const trackTime = (e) => {
    const rect = dragRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = ratio * (videoRef.current?.duration || 0);
    const clamped = Math.max(0, Math.min(videoRef.current?.duration || 0, t));
    setDragTime(clamped);
    setCurrentTime(clamped);
  };

  const seekFromPos = () => {
    const video = videoRef.current;
    if (!video) return;
    if (dragTime != null && Number.isFinite(video.duration)) {
      video.currentTime = Math.max(0, Math.min(video.duration, dragTime));
      setCurrentTime(video.currentTime);
    }
    setIsDragging(false);
    setDragTime(null);
    showControls();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const shownTime = isDragging && dragTime != null ? dragTime : currentTime;
  const maxTime = duration || 0;
  const volumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className={`vc-group relative w-full h-full bg-black overflow-hidden ${isFullscreen ? 'aspect-none' : ''} ${className}`}
      onMouseMove={showControls}
      onMouseLeave={() => { if (isPlaying && !isDragging) setControlsVisible(false); }}
      onTouchStart={showControls}
    >
      {children}

      {/* Center play/pause toggle (only visible when paused) */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="absolute inset-0 z-[15] flex items-center justify-center cursor-pointer bg-transparent focus:outline-none"
      >
        {!isPlaying && (
          <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/40 text-white flex items-center justify-center ring-1 ring-white/30 backdrop-blur-[2px] transition-all duration-200 hover:bg-emerald-500/80 hover:scale-105 active:scale-95">
            <Play size={32} fill="currentColor" className="ml-1" />
          </span>
        )}
      </button>

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 px-3 sm:px-4 pt-12 pb-2.5 sm:pb-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Timeline */}
        <div
          ref={dragRef}
          className="group/tl relative h-12 -my-3 flex items-center cursor-pointer touch-none"
          onPointerDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
            dragRef.current.setPointerCapture?.(e.pointerId);
            trackTime(e);
          }}
          onPointerMove={(e) => {
            if (isDragging) trackTime(e);
          }}
          onPointerUp={seekFromPos}
          onPointerCancel={() => {
            setIsDragging(false);
            setDragTime(null);
          }}
        >
          <div className="relative w-full h-1.5 rounded-full bg-white/20 group-hover/tl:h-2.5 transition-all duration-150">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-emerald-400"
              style={{ width: `${maxTime ? (shownTime / maxTime) * 100 : 0}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-lg opacity-0 group-hover/tl:opacity-100 transition-opacity"
              style={{ left: `calc(${maxTime ? (shownTime / maxTime) * 100 : 0}% - 7px)` }}
            />
          </div>
        </div>

        {/* Control row */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500 text-white hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-900/30"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => seekBy(-5)}
            aria-label="Backward 5 seconds"
            className="vc-btn vc-btn-ghost"
          >
            <RotateCcw size={17} />
            <span className="text-[10px] font-semibold">5</span>
          </button>
          <button
            type="button"
            onClick={() => seekBy(5)}
            aria-label="Forward 5 seconds"
            className="vc-btn vc-btn-ghost relative"
          >
            <RotateCw size={17} />
            <span className="text-[10px] font-semibold">5</span>
          </button>

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1.5 group/vol">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="vc-btn vc-btn-ghost"
            >
              {volumeIcon === VolumeX && <VolumeX size={18} />}
              {volumeIcon === Volume1 && <Volume1 size={18} />}
              {volumeIcon === Volume2 && <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="vc-slider w-16 md:w-24"
              aria-label="Volume"
            />
          </div>

          {/* Mobile mute shortcut */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="vc-btn vc-btn-ghost sm:hidden"
          >
            {volumeIcon === VolumeX ? <VolumeX size={18} /> : volumeIcon === Volume1 ? <Volume1 size={18} /> : <Volume2 size={18} />}
          </button>

          <span className="text-[11px] sm:text-xs text-white/80 font-medium tabular-nums ml-1">
            {formatTime(shownTime)} / {formatTime(maxTime)}
          </span>

          <div className="flex-1" />

          {/* Speed */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleSpeed}
              aria-label="Playback speed"
              className="vc-btn vc-btn-ghost"
            >
              <Gauge size={17} />
              <span className="text-[10px] font-semibold tabular-nums">{playbackRate}x</span>
            </button>
            {showSpeed && (
              <div className="absolute bottom-11 right-0 z-30 min-w-[7rem] rounded-xl bg-slate-900/95 border border-white/10 shadow-xl p-1.5 animate-fade-in">
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => applySpeed(rate)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      playbackRate === rate
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
            className="vc-btn vc-btn-ghost"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

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

const CONTENT_TYPE_CONFIG = {
  pdf:    { icon: FileText, bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200', label: 'PDF Document', btnBg: 'bg-rose-50 hover:bg-rose-100 text-rose-700' },
  video:  { icon: Play, bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200', label: 'Video', btnBg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' },
  postText: { icon: Type, bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200', label: 'Text', btnBg: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
  image:  { icon: ImageIcon, bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', label: 'Image', btnBg: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
  default: { icon: BookOpen, bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200', label: 'Resource', btnBg: 'bg-slate-100 hover:bg-slate-200 text-slate-700' },
};

const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
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

  const [userEmail, setUserEmail] = useState('');
  const [watermarkTampered, setWatermarkTampered] = useState(false);
  const watermarkRef = useRef(null);

  const seriesVideoRef = useRef(null);
  const contentVideoRef = useRef(null);

  const [userAnswers, setUserAnswers] = useState({});
  const [quizSession, setQuizSession] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [quizzesView, setQuizzesView] = useState('list');
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

  const startQuizSession = (video) => {
    const videoQuizzes = video.quizzes || [];

    const needFirstShot = videoQuizzes.filter(quiz => {
      const ans = userAnswers[quiz._id];
      return !ans || !ans.firstShot;
    });

    const needSecondShot = videoQuizzes.filter(quiz => {
      const ans = userAnswers[quiz._id];
      return ans && ans.firstShot && !ans.firstShot.isCorrect && !ans.secondShot;
    });

    if (needFirstShot.length > 0) {
      setQuizSession({
        videoId: video._id,
        videoTitle: video.videoTitle,
        quizzes: needFirstShot,
        currentIndex: 0,
        shot: 'first',
        remainingWrong: []
      });
      setQuizzesView('take');
    } else if (needSecondShot.length > 0) {
      setQuizSession({
        videoId: video._id,
        videoTitle: video.videoTitle,
        quizzes: needSecondShot,
        currentIndex: 0,
        shot: 'second',
        remainingWrong: []
      });
      setQuizzesView('take');
    } else {
      toast.info('You have no remaining attempts for this video.');
    }
  };

  const moveToNextQuiz = () => {
    const nextIndex = quizSession.currentIndex + 1;
    if (nextIndex < quizSession.quizzes.length) {
      setQuizSession(prev => ({
        ...prev,
        currentIndex: nextIndex
      }));
    } else {
      if (quizSession.shot === 'first') {
        if (quizSession.remainingWrong.length > 0) {
          toast.info(`You finished your first shot in this video. Now starting second shot for ${quizSession.remainingWrong.length} quiz(zes).`);
          const wrongQuizzes = quizSession.quizzes.filter(q =>
            quizSession.remainingWrong.includes(q._id)
          );
          setQuizSession({
            videoId: quizSession.videoId,
            videoTitle: quizSession.videoTitle,
            quizzes: wrongQuizzes,
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
        toast.success('You have completed all quizzes for this video!');
        setQuizzesView('list');
        setQuizSession(null);
        fetchUserAnswers();
      }
    }
  };

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

  useEffect(() => {
    if (quizSession && quizSession.quizzes[quizSession.currentIndex]) {
      stopTimer();
      setQuizStartTime(Date.now());
      setSelectedOption(null);
      setAnswerSubmitted(false);
      setElapsedTime(0);
      startTimer();
    }
    return () => stopTimer();
  }, [quizSession, quizSession?.currentIndex]);

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

  useEffect(() => {
    const fetchEmail = async () => {
      // Preview mode uses a hardcoded local identity and never calls the backend.
      if (isPreviewMode) {
        setUserEmail('sarah@example.com');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/user/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.success && data.data?.email) {
          setUserEmail(data.data.email);
        }
      } catch {}
    };
    fetchEmail();
  }, []);

  useEffect(() => {
    if (!userEmail || watermarkTampered) return;
    const videoEl = seriesVideoRef.current || contentVideoRef.current;
    if (!videoEl) return;

    const interval = setInterval(() => {
      const wm = watermarkRef.current;
      const playing = videoEl && !videoEl.paused && !videoEl.ended && videoEl.readyState > 2;
      if (!playing) return;

      if (!wm || !wm.isConnected || !wm.textContent.includes(userEmail)) {
        setWatermarkTampered(true);
        try { videoEl.pause(); } catch {}
        return;
      }

      const cs = window.getComputedStyle(wm);
      const styleViolated =
        cs.display === 'none' ||
        cs.visibility === 'hidden' ||
        cs.visibility === 'collapse' ||
        cs.opacity === '0' ||
        cs.position !== 'absolute' ||
        cs.pointerEvents !== 'none';

      const attrViolated =
        wm.getAttribute('data-watermark') !== 'true';

      if (styleViolated || attrViolated) {
        setWatermarkTampered(true);
        try { videoEl.pause(); } catch {}
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [userEmail, watermarkTampered, selectedVideo, selectedContentVideo]);

  const handlePlayContentVideo = async (contentItem) => {
    if (!isEnrolled && contentItem.availability !== 'free') return;
    setSelectedContentVideo(contentItem);
    setContentVideoError(false);
    setWatermarkTampered(false);

    if (isPreviewMode) {
      setContentVideoStreamUrl(contentItem.contentData);
      return;
    }

    const token = localStorage.getItem('token');
    const timestamp = Date.now();
    const streamUrl = `${import.meta.env.VITE_BACKEND_URL}/api/user/content/stream/${courseId}/${contentItem._id}?t=${timestamp}&token=${encodeURIComponent(token)}`;
    setContentVideoStreamUrl(streamUrl);
  };

  const withToken = (url) => {
    if (!url) return url;
    if (url.includes('?')) return `${url}&token=${encodeURIComponent(localStorage.getItem('token') || '')}`;
    return `${url}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`;
  };

  const canAccessItem = (item) =>
    isEnrolled || item.availability === 'free';

  const buildVideoStreamUrl = (video) => {
    if (isPreviewMode) {
      return `/preview-data/storage/videos/${video.filename}`;
    }
    const token = localStorage.getItem('token');
    const timestamp = Date.now();
    return `${import.meta.env.VITE_BACKEND_URL}/api/user/videos/stream/${courseId}/${video._id}?t=${timestamp}&token=${encodeURIComponent(token)}`;
  };

  const handleSelectVideo = (video) => {
    if (!isEnrolled && !course?.isFree) return;
    setSelectedVideo(video);
    setVideoError(false);
    setWatermarkTampered(false);
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
    if (!seconds) return null;
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

  const sortedContent = course?.content
    ? [...course.content].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : 0;
        const dateB = b.createdAt ? new Date(b.createdAt) : 0;
        return dateB - dateA;
      })
    : [];

  const sortedVideos = course?.videoSeries
    ? [...course.videoSeries].sort((a, b) => a.order - b.order)
    : [];

  const totalQuizzes = sortedVideos.reduce((acc, v) => acc + (v.quizzes?.length || 0), 0);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setQuizzesView('list');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-[3px] border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-slate-500 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center p-10 bg-white rounded-2xl border border-slate-200/70 shadow-soft max-w-md animate-fade-up">
          <div className="bg-rose-50 rounded-full p-3 inline-flex mb-4">
            <svg className="h-10 w-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h3>
          <p className="text-slate-500 text-sm mb-6">{error || 'Course not found'}</p>
          <button onClick={() => navigate('/')} className="btn-brand w-full px-6 py-3">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ========== HERO ========== */}
      <div className="bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="lg:flex gap-8">
            {/* Cover Image */}
            <div className="lg:w-96 flex-shrink-0 mb-6 lg:mb-0">
              <div className="relative rounded-2xl overflow-hidden shadow-soft-lg aspect-[4/3] bg-slate-100">
                <img
                  className="w-full h-full object-cover"
                  src={course.imageCover || COURSE_IMAGE_FALLBACK}
                  alt={course.name}
                  onError={(e) => {
                    if (e.target.dataset.fallbackApplied) return;
                    e.target.dataset.fallbackApplied = 'true';
                    e.target.src = COURSE_IMAGE_FALLBACK;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                {!isEnrolled && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-amber-400 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg">
                    <Lock size={12} />
                    Preview
                  </div>
                )}
                {isEnrolled && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-primary text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg">
                    <CheckCircle2 size={12} />
                    Enrolled
                  </div>
                )}
              </div>
            </div>

            {/* Course Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="eyebrow">
                  {course.courseSpeciality || course.instructorSpeciality || 'Course'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Users size={13} />
                  {course.numberOfStudents} students
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-3 tracking-tight">
                {course.name}
              </h1>

              <p className="text-slate-500 text-sm sm:text-base leading-relaxed mb-5 line-clamp-3">
                {course.description}
              </p>

              {/* Instructor */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
                  {course.instructorName?.charAt(0) || 'I'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{course.instructorName}</p>
                  <p className="text-xs text-slate-400">Instructor</p>
                </div>
              </div>

              {/* Meta pills */}
              <div className="flex flex-wrap gap-2 mb-5">
                {course.isFree && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
                    <CheckCircle2 size={13} />
                    Free Course
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-600">
                  <Video size={13} />
                  {sortedVideos.length} Videos
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-600">
                  <FileText size={13} />
                  {sortedContent.length} Materials
                </span>
                {totalQuizzes > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-600">
                    <FileQuestion size={13} />
                    {totalQuizzes} Quiz{totalQuizzes !== 1 ? 'zes' : ''}
                  </span>
                )}
              </div>

              {/* CTA */}
              {course.isFree ? (
                <button
                  onClick={() => switchTab('videos')}
                  className="group btn-brand px-7 py-3 text-sm"
                >
                  {isEnrolled ? 'Start Course' : 'Watch Free Course'}
                  <Play size={16} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : !isEnrolled ? (
                <button
                  onClick={() => navigate(`/pay/${courseId}`)}
                  className="group btn-brand px-7 py-3 text-sm"
                >
                  Buy Now — ${course.price?.toFixed(2)}
                  <ChevronRight size={16} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold">
                  <CheckCircle2 size={16} />
                  You're enrolled
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== TABS ========== */}
      <div className="bg-white border-b border-slate-200/70 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-0 -mb-px" aria-label="Course sections">
            {[
              { key: 'content', label: 'Materials', icon: BookOpen, count: sortedContent.length },
              { key: 'videos', label: 'Videos', icon: Play, count: sortedVideos.length },
              { key: 'quizzes', label: 'Quizzes', icon: FileQuestion, count: totalQuizzes },
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`
                  relative flex items-center gap-2 px-4 sm:px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap
                  ${activeTab === key
                    ? 'text-primary'
                    : 'text-slate-500 hover:text-slate-800'
                  }
                `}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
                <span className={`
                  inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold
                  ${activeTab === key
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 text-slate-500'
                  }
                `}>
                  {count}
                </span>
                {activeTab === key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ========== CONTENT ========== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* ===== CONTENT TAB ===== */}
        {activeTab === 'content' && (
          <div>
            {/* Inline Content Video Player */}
            {selectedContentVideo && contentVideoStreamUrl && canAccessItem(selectedContentVideo) && (
              <div className="mb-6 bg-white rounded-2xl border border-slate-200/70 shadow-soft overflow-hidden">
                <div className="relative bg-black aspect-video overflow-hidden">
                  {contentVideoError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6">
                      <svg className="w-12 h-12 text-rose-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-slate-300">Video unavailable. <button onClick={() => handlePlayContentVideo(selectedContentVideo)} className="text-primary underline font-medium">Retry</button></p>
                    </div>
                  ) : (
                    <CustomVideoPlayer
                      src={contentVideoStreamUrl}
                      videoRef={contentVideoRef}
                      onError={() => setContentVideoError(true)}
                      className="aspect-video"
                    >
                      <video
                        ref={(node) => { contentVideoRef.current = node; }}
                        key={contentVideoStreamUrl}
                        controlsList="nodownload"
                        disablePictureInPicture
                        playsInline
                        onContextMenu={(e) => e.preventDefault()}
                        onError={() => setContentVideoError(true)}
                        className="w-full h-full object-contain"
                      >
                        <source src={contentVideoStreamUrl} type="video/mp4" />
                      </video>
                      {selectedContentVideo && userEmail && (
                        <WatermarkOverlay ref={watermarkRef} email={userEmail} active={!watermarkTampered && !contentVideoError} />
                      )}
                      {watermarkTampered && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80">
                          <p className="text-white text-center px-6 py-3 bg-rose-900/80 rounded-lg text-sm font-medium">
                            Playback protection was disabled. Video playback has been paused.
                          </p>
                        </div>
                      )}
                    </CustomVideoPlayer>
                  )}
                </div>
                <div className="px-3 py-2.5 flex items-center justify-between border-t border-slate-100">
                  <span className="text-sm font-medium text-slate-700 truncate">{selectedContentVideo.title}</span>
                  <button
                    onClick={() => { setSelectedContentVideo(null); setContentVideoStreamUrl(null); }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg px-2.5 py-1.5 transition"
                  >
                    <X size={14} /> Close
                  </button>
                </div>
              </div>
            )}

            {/* Image Modal */}
            {imageModalOpen && selectedImageUrl && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={() => setImageModalOpen(false)}
              >
                <div
                  className="relative flex items-center justify-center w-[92vw] max-w-5xl h-[85vh] rounded-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={selectedImageUrl}
                    alt="Course content"
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    onClick={() => setImageModalOpen(false)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white transition"
                  >
                    <X size={20} className="text-slate-700" />
                  </button>
                </div>
              </div>
            )}

            {/* Content List */}
            {(() => {
              const contentToShow = isEnrolled
                ? sortedContent
                : sortedContent.filter(item => item.availability === 'free');

              if (contentToShow.length === 0) {
                const emptyMessage = !isEnrolled
                  ? 'No public content available.'
                  : 'No course materials available.';
                return (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/70 shadow-soft">
                    <BookOpen className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">{emptyMessage}</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {contentToShow.map((item, idx) => {
                    const isNew =
                      item.createdAt &&
                      new Date(item.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                    const cfg = CONTENT_TYPE_CONFIG[item.contentType] || CONTENT_TYPE_CONFIG.default;
                    const TypeIcon = cfg.icon;

                    return (
                      <div
                        key={item._id}
                        className={`group flex items-center gap-4 p-4 bg-white rounded-xl border transition-all duration-200 ${
                          isEnrolled
                            ? 'border-slate-200/70 hover:border-primary/30 hover:shadow-soft cursor-pointer'
                            : 'border-slate-200/70 opacity-80'
                        }`}
                        onClick={() => {
                          if (!canAccessItem(item)) return;
                          if (item.contentType === 'video') handlePlayContentVideo(item);
                          else if (item.contentType === 'pdf' && item.contentData) window.open(withToken(item.contentData), '_blank');
                          else if (item.contentType === 'image' && item.contentData) { setSelectedImageUrl(withToken(item.contentData)); setImageModalOpen(true); }
                        }}
                      >
                        {/* Index */}
                        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition">
                          {idx + 1}
                        </span>

                        {/* Type Icon */}
                        <div className={`flex-shrink-0 ${cfg.bg} p-2 rounded-xl ring-1 ${cfg.ring}`}>
                          <TypeIcon size={18} className={cfg.text} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                            {isNew && isEnrolled && (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase tracking-wider">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {cfg.label}
                            {item.createdAt && <span className="ml-1.5">&middot; {formatDate(item.createdAt)}</span>}
                          </p>
                        </div>

                        {/* Action */}
                        {canAccessItem(item) ? (
                          <div className="flex-shrink-0">
                            {item.contentType === 'pdf' && item.contentData && (
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${cfg.btnBg}`}>
                                <ExternalLink size={12} /> View
                              </span>
                            )}
                            {item.contentType === 'video' && (
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${cfg.btnBg}`}>
                                <Play size={12} /> Play
                              </span>
                            )}
                            {item.contentType === 'image' && item.contentData && (
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${cfg.btnBg}`}>
                                <ImageIcon size={12} /> View
                              </span>
                            )}
                            {item.contentType === 'postText' && item.contentData && (
                              <span className="text-xs text-slate-400 max-w-[120px] truncate block text-right">{item.contentData}</span>
                            )}
                          </div>
                        ) : (
                          <Lock size={16} className="text-slate-300 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ===== VIDEOS TAB ===== */}
        {activeTab === 'videos' && (
          <div className="lg:flex gap-6">
            {/* Video Player — left/main area */}
            <div className="flex-1 min-w-0">
              {(isEnrolled || course?.isFree) && selectedVideo && videoStreamUrl ? (
                <div className="mb-6">
                  <div className="relative bg-black rounded-2xl overflow-hidden shadow-soft-lg">
                    {videoError ? (
                      <div className="w-full h-full aspect-video flex flex-col items-center justify-center bg-slate-900 text-white p-6">
                        <svg className="w-14 h-14 text-rose-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-lg font-bold mb-1">Video Unavailable</h3>
                        <p className="text-slate-400 text-sm text-center mb-4">
                          We're having trouble playing this video.
                          {retryCount >= MAX_RETRIES && ' Please try another video.'}
                        </p>
                        {retryCount < MAX_RETRIES && (
                          <button
                            onClick={() => {
                              setRetryCount(0);
                              setVideoError(false);
                              setVideoStreamUrl(buildVideoStreamUrl(selectedVideo));
                            }}
                            className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-emerald-700 transition"
                          >
                            Try Again
                          </button>
                        )}
                      </div>
                    ) : (
                      <CustomVideoPlayer
                        src={videoStreamUrl}
                        videoRef={seriesVideoRef}
                        onError={handleVideoError}
                        className="aspect-video"
                      >
                        <video
                          ref={(node) => { seriesVideoRef.current = node; }}
                          key={videoStreamUrl}
                          controlsList="nodownload"
                          disablePictureInPicture
                          playsInline
                          width="100%"
                          height="100%"
                          onError={handleVideoError}
                          onContextMenu={(e) => e.preventDefault()}
                          className="w-full h-full object-contain"
                        >
                          <source src={videoStreamUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                        {selectedVideo && userEmail && (
                          <WatermarkOverlay ref={watermarkRef} email={userEmail} active={!watermarkTampered && !videoError} />
                        )}
                        {watermarkTampered && (
                          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80">
                            <p className="text-white text-center px-6 py-3 bg-rose-900/80 rounded-lg text-sm font-medium">
                              Playback protection was disabled. Video playback has been paused.
                            </p>
                          </div>
                        )}
                      </CustomVideoPlayer>
                    )}
                  </div>

                  {/* Player title bar */}
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedVideo.videoTitle}</h2>
                      {selectedVideo.duration > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Clock size={12} />
                          {formatDuration(selectedVideo.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (isEnrolled || course?.isFree) && !selectedVideo ? (
                <div className="mb-6 bg-white rounded-2xl border border-slate-200/70 shadow-soft p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Play size={28} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Select a video to start learning</h3>
                  <p className="text-sm text-slate-500 mt-1">Choose a video from the playlist on the right.</p>
                </div>
              ) : !isEnrolled && !course?.isFree ? (
                <div className="mb-6 bg-white rounded-2xl border border-slate-200/70 shadow-soft p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                    <Lock size={28} className="text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Enroll to watch videos</h3>
                  <p className="text-sm text-slate-500 mt-1 mb-4">Unlock all {sortedVideos.length} videos in this course.</p>
                  <button
                    onClick={() => navigate(`/pay/${courseId}`)}
                    className="group btn-brand px-6 py-2.5 text-sm"
                  >
                    Enroll Now — ${course.price?.toFixed(2)}
                    <ChevronRight size={16} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ) : null}
            </div>

            {/* Playlist Sidebar */}
            <div className="lg:w-80 xl:w-96 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-soft overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Video size={16} className="text-primary" />
                    Playlist
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">{sortedVideos.length} videos</span>
                </div>

                {sortedVideos.length > 0 ? (
                  <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {sortedVideos.map((video, index) => {
                      const isSelected = selectedVideo?._id === video._id;
                      const duration = formatDuration(video.duration);
                      const canWatch = isEnrolled || course?.isFree;

                      return (
                        <button
                          key={video._id}
                          onClick={() => handleSelectVideo(video)}
                          disabled={!canWatch}
                          className={`
                            w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150
                            ${isSelected
                              ? 'bg-primary/5 border-l-[3px] border-l-primary'
                              : 'border-l-[3px] border-l-transparent hover:bg-slate-50'
                            }
                            ${!canWatch ? 'opacity-60 cursor-default' : 'cursor-pointer'}
                          `}
                        >
                          {/* Number / Play indicator */}
                          <div className={`
                            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition
                            ${isSelected
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 text-slate-500'
                            }
                          `}>
                            {isSelected && canWatch ? (
                              <Play size={14} fill="currentColor" />
                            ) : (
                              index + 1
                            )}
                          </div>

                          {/* Title + duration */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                              {video.videoTitle}
                            </p>
                            {duration && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                <Clock size={10} />
                                {duration}
                              </span>
                            )}
                          </div>

                          {/* Lock icon for non-enrolled */}
                          {!canWatch && (
                            <Lock size={14} className="text-slate-300 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <Video className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No videos available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== QUIZZES TAB ===== */}
        {activeTab === 'quizzes' && (
          <div>
            {quizzesView === 'list' ? (
              <div>
                {sortedVideos.length === 0 || totalQuizzes === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/70 shadow-soft">
                    <FileQuestion className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No quizzes available yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedVideos.map((video) => {
                      const videoQuizzes = video.quizzes || [];
                      if (videoQuizzes.length === 0) return null;
                      const { firstShotRemaining, secondShotRemaining } = getVideoChanceInfo(video);
                      const totalRemaining = firstShotRemaining + secondShotRemaining;
                      const totalAttempted = videoQuizzes.length * 2 - totalRemaining;

                      return (
                        <div
                          key={video._id}
                          className="bg-white border border-slate-200/70 rounded-xl p-4 sm:p-5 shadow-soft hover:shadow-soft-lg transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Video size={16} className="text-primary" />
                                </div>
                                <span className="truncate">{video.videoTitle}</span>
                              </h3>

                              <div className="flex flex-wrap items-center gap-2 mt-2.5 ml-10">
                                <span className="text-xs text-slate-400 font-medium">
                                  {videoQuizzes.length} quiz{videoQuizzes.length !== 1 ? 'zes' : ''}
                                </span>

                                {firstShotRemaining > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
                                    1st attempt: {firstShotRemaining}
                                  </span>
                                )}
                                {secondShotRemaining > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
                                    2nd attempt: {secondShotRemaining}
                                  </span>
                                )}
                                {totalRemaining === 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500">
                                    <CheckCircle2 size={11} />
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => startQuizSession(video)}
                              disabled={totalRemaining === 0}
                              className={`flex-shrink-0 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                                totalRemaining > 0
                                  ? 'bg-primary text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {totalRemaining > 0 ? 'Take Quiz' : 'Done'}
                            </button>
                          </div>

                          {/* Progress bar */}
                          {videoQuizzes.length > 0 && (
                            <div className="mt-3 ml-10">
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${(totalAttempted / (videoQuizzes.length * 2)) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ===== QUIZ TAKING VIEW ===== */
              <div>
                <button
                  onClick={() => { setQuizzesView('list'); setQuizSession(null); }}
                  className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
                >
                  <ArrowLeft size={16} />
                  Back to quizzes
                </button>

                {quizSession && quizSession.quizzes[quizSession.currentIndex] && (
                  <div className="max-w-2xl mx-auto">
                    {/* Session Header */}
                    <div className="bg-white border border-slate-200/70 rounded-2xl p-5 mb-5 shadow-soft">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{quizSession.videoTitle}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {quizSession.shot === 'first' ? '1st attempt' : '2nd attempt'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Clock size={13} />
                          {Math.floor(elapsedTime / 60)}:{elapsedTime % 60 < 10 ? '0' : ''}{elapsedTime % 60}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${((quizSession.currentIndex + 1) / quizSession.quizzes.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500 flex-shrink-0">
                          {quizSession.currentIndex + 1}/{quizSession.quizzes.length}
                        </span>
                      </div>
                    </div>

                    {/* Question Card */}
                    {(() => {
                      const currentQuiz = quizSession.quizzes[quizSession.currentIndex];
                      const isLastQuiz = quizSession.currentIndex === quizSession.quizzes.length - 1;

                      return (
                        <div className="bg-white border border-slate-200/70 rounded-2xl p-5 sm:p-6 shadow-soft">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-5 leading-relaxed">
                            {currentQuiz.question}
                          </h3>

                          {/* Options */}
                          <div className="space-y-2.5 mb-6">
                            {currentQuiz.options.map((option, index) => {
                              const letter = String.fromCharCode(65 + index);
                              let styles = '';

                              if (answerSubmitted) {
                                if (quizSession.shot === 'first') {
                                  if (selectedOption === index && index !== currentQuiz.correctAnswer) {
                                    styles = 'border-rose-400 bg-rose-50 ring-1 ring-rose-200';
                                  } else {
                                    styles = 'border-slate-200 bg-slate-50 opacity-60';
                                  }
                                } else {
                                  if (index === currentQuiz.correctAnswer) {
                                    styles = 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200';
                                  } else if (selectedOption === index && index !== currentQuiz.correctAnswer) {
                                    styles = 'border-rose-400 bg-rose-50 ring-1 ring-rose-200';
                                  } else {
                                    styles = 'border-slate-200 bg-slate-50 opacity-60';
                                  }
                                }
                              } else {
                                styles = selectedOption === index
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50';
                              }

                              return (
                                <button
                                  key={index}
                                  onClick={() => { if (!answerSubmitted) setSelectedOption(index); }}
                                  className={`
                                    w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all duration-150 flex items-center gap-3
                                    ${styles}
                                    ${!answerSubmitted ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}
                                  `}
                                >
                                  <span className={`
                                    flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition
                                    ${answerSubmitted && quizSession.shot === 'second' && index === currentQuiz.correctAnswer
                                      ? 'bg-emerald-500 text-white'
                                      : answerSubmitted && ((quizSession.shot === 'first' || quizSession.shot === 'second') && selectedOption === index && index !== currentQuiz.correctAnswer)
                                        ? 'bg-rose-500 text-white'
                                        : selectedOption === index && !answerSubmitted
                                          ? 'bg-primary text-white'
                                          : 'bg-slate-100 text-slate-500'
                                    }
                                  `}>
                                    {answerSubmitted && quizSession.shot === 'second' && index === currentQuiz.correctAnswer ? (
                                      <CheckCircle2 size={16} />
                                    ) : answerSubmitted && selectedOption === index && index !== currentQuiz.correctAnswer ? (
                                      <X size={16} />
                                    ) : letter}
                                  </span>
                                  <span className={`text-sm font-medium ${answerSubmitted && ((selectedOption === index && index !== currentQuiz.correctAnswer) || (quizSession.shot === 'second' && index === currentQuiz.correctAnswer)) ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {option}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Submit / Actions */}
                          {!answerSubmitted ? (
                            <button
                              onClick={submitAnswer}
                              disabled={selectedOption === null || isSubmitting}
                              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition ${
                                selectedOption === null || isSubmitting
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-primary text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
                              }`}
                            >
                              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                            </button>
                          ) : (
                            <div className="space-y-3">
                              {(() => {
                                const isCorrect = (selectedOption === currentQuiz.correctAnswer);
                                return (
                                  <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                      {isCorrect ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" /> : <CircleDot size={18} className="text-rose-500 flex-shrink-0" />}
                                      {isCorrect
                                        ? 'Correct! Well done.'
                                        : `Incorrect. ${quizSession.shot === 'second' ? `The correct answer is: ${currentQuiz.options[currentQuiz.correctAnswer]}` : 'You have one more chance later.'}`
                                      }
                                    </span>
                                  </div>
                                );
                              })()}

                              {!isLastQuiz ? (
                                <button
                                  onClick={() => { setAnswerSubmitted(false); moveToNextQuiz(); }}
                                  className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition shadow-sm hover:shadow-md"
                                >
                                  Next Question
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setQuizzesView('list'); setQuizSession(null); fetchUserAnswers(); }}
                                  className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition"
                                >
                                  Finish Quiz
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default Course;
