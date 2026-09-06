import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import { isPreviewMode } from '../services/dataMode';
import { publicCourses, myCourses as previewMyCourses } from '../services/previewData';
import { shouldAutoStartTour, startTourHere, setPreviewContext, subscribeTour, isTourActive } from '../services/previewTourController';
import { useTour } from '../hooks/useTour';
import {
  GraduationCap,
  ShieldCheck,
  BadgeCheck,
  ArrowRight,
  Play,
  Search,
  Users,
  BookOpen,
  Clock,
  Lock,
  Globe,
  Code2,
  Terminal,
  Palette,
  Briefcase,
  Cloud,
  Database,
  BrainCircuit,
  Compass,
  Lightbulb,
  BarChart3,
  MonitorPlay,
  Sparkles,
  FileText,
  Video,
  Award,
  CheckCircle2,
  Layers,
  Rocket,
  LockKeyhole,
  TrendingUp,
} from 'lucide-react';

const COURSE_CARD_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
      <rect width="400" height="250" fill="#0f172a" />
      <circle cx="200" cy="105" r="42" fill="rgba(16,185,129,0.15)" />
      <circle cx="200" cy="105" r="25" fill="#10b981" />
      <path d="M190 92 L210 105 L190 118 Z" fill="#0f172a" />
      <rect x="120" y="168" width="160" height="10" rx="5" fill="#334155" />
      <rect x="150" y="188" width="100" height="8" rx="4" fill="#1e293b" />
      <text x="200" y="226" font-family="sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">LMS</text>
    </svg>
  `);

const CATEGORY_META = {
  'web development': { Icon: Globe, accent: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  'web': { Icon: Globe, accent: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  'programming': { Icon: Terminal, accent: 'bg-slate-100 text-slate-700 ring-slate-300' },
  'design': { Icon: Palette, accent: 'bg-rose-50 text-rose-700 ring-rose-200' },
  'business': { Icon: Briefcase, accent: 'bg-amber-50 text-amber-700 ring-amber-200' },
  'devops': { Icon: Cloud, accent: 'bg-teal-50 text-teal-700 ring-teal-200' },
  'data & ai': { Icon: BrainCircuit, accent: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  'ai': { Icon: BrainCircuit, accent: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  'data': { Icon: Database, accent: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  'database': { Icon: Database, accent: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  'frontend': { Icon: Code2, accent: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  'backend': { Icon: Code2, accent: 'bg-slate-100 text-slate-700 ring-slate-300' },
};
const FALLBACK_CATEGORY = { Icon: BookOpen, accent: 'bg-slate-100 text-slate-700 ring-slate-300' };

const getWhyUs = (t) => [
  { Icon: BadgeCheck, title: t('home.whyUs.0.title'), text: t('home.whyUs.0.text') },
  { Icon: Layers, title: t('home.whyUs.1.title'), text: t('home.whyUs.1.text') },
  { Icon: ShieldCheck, title: t('home.whyUs.2.title'), text: t('home.whyUs.2.text') },
  { Icon: BarChart3, title: t('home.whyUs.3.title'), text: t('home.whyUs.3.text') },
  { Icon: MonitorPlay, title: t('home.whyUs.4.title'), text: t('home.whyUs.4.text') },
  { Icon: Rocket, title: t('home.whyUs.5.title'), text: t('home.whyUs.5.text') },
];

const getJourney = (t) => [
  { Icon: Compass, step: '01', title: t('home.journey.0.title'), text: t('home.journey.0.text') },
  { Icon: Play, step: '02', title: t('home.journey.1.title'), text: t('home.journey.1.text') },
  { Icon: Lightbulb, step: '03', title: t('home.journey.2.title'), text: t('home.journey.2.text') },
  { Icon: BarChart3, step: '04', title: t('home.journey.3.title'), text: t('home.journey.3.text') },
  { Icon: Award, step: '05', title: t('home.journey.4.title'), text: t('home.journey.4.text') },
];

const getSecureFeatures = (t) => [
  { Icon: Video, title: t('home.secureFeatures.0.title'), text: t('home.secureFeatures.0.text') },
  { Icon: Lock, title: t('home.secureFeatures.1.title'), text: t('home.secureFeatures.1.text') },
  { Icon: Sparkles, title: t('home.secureFeatures.2.title'), text: t('home.secureFeatures.2.text') },
  { Icon: FileText, title: t('home.secureFeatures.3.title'), text: t('home.secureFeatures.3.text') },
  { Icon: BarChart3, title: t('home.secureFeatures.4.title'), text: t('home.secureFeatures.4.text') },
];

const formatCompact = (n) => {
  if (n == null || Number.isNaN(n)) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

const getInitials = (name = '') =>
  name.trim().split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

const truncate = (text, max = 100) =>
  text?.length > max ? text.slice(0, max) + '…' : text || '';

const SectionHeading = ({ eyebrow, title, text, center = true }) => (
  <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''} animate-fade-up`}>
    <span className="eyebrow">{eyebrow}</span>
    <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{title}</h2>
    {text && <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">{text}</p>}
  </div>
);

const CourseCard = ({ course, enrolled, index, tourMarker }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const MetaIcon = (CATEGORY_META[course.courseSpeciality?.toLowerCase()] || CATEGORY_META[course.instructorSpeciality?.toLowerCase()] || FALLBACK_CATEGORY).Icon;
  const isFree = course.isFree === true;
  const durationH = course.totalDuration > 0 ? Math.max(1, Math.round(course.totalDuration / 3600)) : 0;

  return (
    <article
      onClick={() => navigate(`/course/${course._id}`)}
      data-tour={tourMarker}
      style={{ animationDelay: `${(index % 4) * 70}ms` }}
      className="group card flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1.5 hover:shadow-soft-lg hover:border-emerald-200/80 transition-all duration-300 animate-fade-up"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        {course.imageCover ? (
          <img
            src={course.imageCover}
            alt={course.name}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              if (e.target.dataset.fallbackApplied) return;
              e.target.dataset.fallbackApplied = 'true';
              e.target.src = COURSE_CARD_FALLBACK;
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-slate-900">
            <span className="text-white text-4xl font-extrabold">{course.name?.charAt(0) || 'L'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200/70">
          <MetaIcon size={12} />
          {course.courseSpeciality || course.instructorSpeciality || t('home.course')}
        </span>

        {enrolled ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/90 px-2.5 py-1 text-[11px] font-semibold text-white">
            <CheckCircle2 size={12} className="text-emerald-400" /> {t('home.enrolledBadge')}
          </span>
        ) : isFree ? (
          <span className="absolute top-3 right-3 inline-flex items-center rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
            {t('home.free')}
          </span>
        ) : null}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {course.name}
        </h3>

        <div className="mt-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">
            {getInitials(course.instructorName)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{course.instructorName}</p>
            <p className="text-xs text-slate-500 truncate">{course.instructorSpeciality}</p>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-2 flex-grow">
          {truncate(course.description, 90)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Play size={12} className="text-emerald-600" /> {t('home.lessons', { count: course.lessonCount || 0 })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={12} className="text-emerald-600" /> {t('home.studentsCount', { count: formatCompact(course.studentCount || 0) })}
          </span>
          {durationH > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} className="text-emerald-600" /> {durationH}h
            </span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          {isFree ? (
            <span className="text-lg font-extrabold text-emerald-600">{t('home.free')}</span>
          ) : (
            <span className="text-lg font-extrabold text-slate-900">
              ${course.price?.toFixed ? course.price.toFixed(2) : Number(course.price || 0).toFixed(2)}
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
            enrolled
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-900 text-white hover:bg-emerald-700'
          }`}>
            {enrolled ? t('home.continue') : t('home.viewCourse')}
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </article>
  );
};

const Home = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpeciality, setFilterSpeciality] = useState('All');
  const [sortDate, setSortDate] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolledIds, setEnrolledIds] = useState(() => new Set());
  const [isLoggedIn] = useState(() => !!localStorage.getItem('token'));
  const navigate = useNavigate();
  const { t } = useTranslation();
  const WHY_US = getWhyUs(t);
  const JOURNEY = getJourney(t);
  const SECURE_FEATURES = getSecureFeatures(t);
  const [tourRunning, setTourRunning] = useState(isTourActive());

  useEffect(() => {
    setTourRunning(isTourActive());
    return subscribeTour((s) => setTourRunning(s.isRunning));
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const { data } = isPreviewMode
          ? await publicCourses()
          : await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/public`);
        if (data.success) {
          setCourses(data.data);
          setFilteredCourses(data.data);
        } else {
          setError(data.message || t('home.serverError'));
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.response?.data?.message || t('home.serverError'));
        toast.error(t('home.couldNotLoad'));
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && !isPreviewMode) return;
    const enrolledRequest = isPreviewMode
      ? previewMyCourses()
      : axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/my-courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
    enrolledRequest
      .then(({ data }) => {
        if (data.success) setEnrolledIds(new Set(data.data.map((e) => e.course._id)));
      })
      .catch(() => {});
  }, []);

  const tourReady = !loading && courses.length > 0;

  // Preview-only auto-start: on the very first visit, launch the tour once the
  // catalog is rendered. Never auto-starts after completion/skip or opt-out.
  useEffect(() => {
    if (!isPreviewMode) return;
    if (!tourReady) return;
    setPreviewContext({ enrolledIds });
    if (shouldAutoStartTour()) startTourHere();
  }, [tourReady, enrolledIds]);

  useTour(tourReady, { enrolledIds, isHome: true }, tourRunning);

  const specialities = useMemo(() => {
    const all = courses.map((c) => c.courseSpeciality).filter(Boolean);
    return ['All', ...new Set(all)];
  }, [courses]);

  useEffect(() => {
    let filtered = [...courses];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.name?.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term) ||
          course.instructorName?.toLowerCase().includes(term) ||
          course.courseSpeciality?.toLowerCase().includes(term) ||
          course.instructorSpeciality?.toLowerCase().includes(term)
      );
    }
    if (filterSpeciality !== 'All') {
      filtered = filtered.filter((course) => course.courseSpeciality === filterSpeciality);
    }
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortDate === 'newest' ? dateB - dateA : dateA - dateB;
    });
    setFilteredCourses(filtered);
  }, [searchTerm, filterSpeciality, sortDate, courses]);

  const stats = useMemo(() => {
    const students = courses.reduce((s, c) => s + (c.studentCount || 0), 0);
    const lessons = courses.reduce((s, c) => s + (c.lessonCount || 0), 0);
    const instructorIds = new Set(courses.map((c) => c.instructor?._id).filter(Boolean));
    return { courses: courses.length, students, lessons, instructors: instructorIds.size };
  }, [courses]);

  const instructors = useMemo(() => {
    const map = new Map();
    courses.forEach((c) => {
      if (!c.instructor?._id) return;
      const id = c.instructor._id;
      const existing = map.get(id);
      if (existing) {
        existing.courseCount += 1;
        existing.totalStudents += c.studentCount || 0;
      } else {
        map.set(id, {
          _id: id,
          name: c.instructor.name,
          speciality: c.instructor.speciality || '',
          courseCount: 1,
          totalStudents: c.studentCount || 0,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalStudents - a.totalStudents);
  }, [courses]);

  const categories = useMemo(() => {
    const set = new Set();
    courses.forEach((c) => c.courseSpeciality && set.add(c.courseSpeciality));
    return Array.from(set);
  }, [courses]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    courses.forEach((c) => {
      if (c.courseSpeciality) counts[c.courseSpeciality] = (counts[c.courseSpeciality] || 0) + 1;
    });
    return counts;
  }, [courses]);

  const favorites = useMemo(() => {
    const withStudents = courses.filter((c) => (c.studentCount || 0) > 0).sort((a, b) => b.studentCount - a.studentCount);
    return (withStudents.length ? withStudents : courses).slice(0, 3);
  }, [courses]);

  const scrollToCourses = () => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });

  const heroCourse = courses[0];

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-50">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-amber-100/50 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(203 213 225 / 0.55) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-16 items-center">
            <div className="animate-fade-up">
              <span className="eyebrow">
                <GraduationCap size={14} /> {t('home.eyebrow')}
              </span>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.08] text-slate-900">
                {t('home.heroTitle1')}{' '}
                <span className="relative whitespace-nowrap">
                  <span className="relative z-10">{t('home.heroTitleHighlight')}</span>
                  <span className="absolute left-0 -bottom-1 z-0 h-3 w-full -skew-x-6 rounded-sm bg-emerald-200/80" />
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
                {t('home.heroText')}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button onClick={scrollToCourses} className="btn-brand px-7 py-3.5 text-base">
                  {t('home.exploreCourses')}
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => navigate(isLoggedIn ? '/MyCourses' : '/login')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                >
                  <Play size={17} />
                  {isLoggedIn ? t('home.myCourses') : t('home.startLearning')}
                </button>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{loading ? '–' : formatCompact(stats.students)}+</p>
                  <p className="text-sm text-slate-500">{t('home.activeLearners')}</p>
                </div>
                <div className="w-px h-10 bg-slate-200 hidden sm:block" />
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{loading ? '–' : stats.courses}+</p>
                  <p className="text-sm text-slate-500">{t('home.expertLedCourses')}</p>
                </div>
                <div className="w-px h-10 bg-slate-200 hidden sm:block" />
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{loading ? '–' : formatCompact(stats.lessons)}+</p>
                  <p className="text-sm text-slate-500">{t('home.videoLessons')}</p>
                </div>
              </div>

              <div className="mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-soft">
                <LockKeyhole size={15} className="text-emerald-600" />
                {t('home.enrollmentGated')}
              </div>
            </div>

            <div className="relative hidden lg:block animate-fade-in" style={{ animationDelay: '150ms' }}>
              <div className="relative rotate-1 rounded-3xl bg-white border border-slate-200/80 shadow-soft-lg overflow-hidden max-w-lg mx-auto transition-transform duration-500 hover:rotate-0">
                <div className="relative aspect-video bg-slate-900">
                  {heroCourse?.imageCover ? (
                    <img
                      src={heroCourse.imageCover}
                      alt={heroCourse.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        if (e.target.dataset.fallbackApplied) return;
                        e.target.dataset.fallbackApplied = 'true';
                        e.target.src = COURSE_CARD_FALLBACK;
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-900">
                      <span className="text-white text-5xl font-extrabold">{heroCourse?.name?.charAt(0) || 'L'}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                  <button
                    onClick={() => navigate(heroCourse ? `/course/${heroCourse._id}` : '/')}
                    className="absolute inset-0 m-auto flex items-center justify-center"
                    aria-label={t('home.playPreview')}
                  >
                    <span className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 text-white shadow-lift ring-4 ring-white/30 hover:scale-110 transition-transform">
                      <Play size={24} className="ml-0.5" />
                    </span>
                  </button>
                  {heroCourse && (
                    <div className="absolute bottom-0 inset-x-0 p-5">
                      <p className="text-white font-bold text-lg leading-snug">{heroCourse.name}</p>
                      <p className="text-emerald-300 text-sm font-medium mt-0.5">{heroCourse.instructorName}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute -top-6 -right-2 animate-float rounded-2xl bg-white border border-slate-200/80 shadow-soft-lg p-4 w-52">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-slate-700">{t('home.lessonProgress')}</span>
                  <span className="font-bold text-emerald-600">78%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" />
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  {t('home.protectedStreaming')}
                </div>
              </div>

              <div className="absolute -bottom-8 -left-6 animate-float rounded-2xl bg-white border border-slate-200/80 shadow-soft-lg p-4 w-56" style={{ animationDelay: '1.5s' }}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    {getInitials(heroCourse?.instructorName || 'L')}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{heroCourse?.instructorName || t('home.expertInstructor')}</p>
                    <p className="text-xs text-slate-500">{heroCourse?.instructorSpeciality || t('home.courseAuthor')}</p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <BadgeCheck size={13} /> {t('home.courseInstructor')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section id="courses" className="bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={t('home.featuredEyebrow')}
            title={t('home.featuredTitle')}
            text={t('home.featuredText')}
          />

          <div className="mt-12 card p-5 sm:p-6" data-tour="course-filters">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder={t('home.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  aria-label={t('home.clearSearch')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {specialities.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setFilterSpeciality(spec)}
                    className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors ${
                      filterSpeciality === spec
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 mr-1">{t('home.sort')}:</span>
                <button
                  onClick={() => setSortDate('newest')}
                  className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors ${
                    sortDate === 'newest'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  {t('home.newest')}
                </button>
                <button
                  onClick={() => setSortDate('oldest')}
                  className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors ${
                    sortDate === 'oldest'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  {t('home.oldest')}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            {loading ? t('home.loadingCourses') : (filteredCourses.length === 1 ? t('home.coursesFound', { count: filteredCourses.length }) : t('home.coursesFoundPlural', { count: filteredCourses.length }))}
          </p>

          {error ? (
            <div className="mt-4 card p-10 text-center">
              <p className="text-slate-700">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-5 btn-brand px-6 py-2.5 text-sm">
                {t('home.tryAgain')}
              </button>
            </div>
          ) : loading ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="card overflow-hidden animate-pulse">
                  <div className="aspect-video bg-slate-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-8 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="mt-6 card p-14 text-center">
              <span className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Search size={24} />
              </span>
              <h3 className="mt-5 text-xl font-bold text-slate-900">{t('home.noCoursesTitle')}</h3>
              <p className="mt-2 text-slate-500">{t('home.noCoursesText')}</p>
              <button
                onClick={() => { setSearchTerm(''); setFilterSpeciality('All'); }}
                className="mt-6 btn-brand px-6 py-2.5 text-sm"
              >
                {t('home.clearFilters')}
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map((course, i) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  index={i}
                  enrolled={enrolledIds.has(course._id)}
                  tourMarker={
                    filteredCourses.findIndex((c) => !enrolledIds.has(c._id)) === i
                      ? 'first-unenrolled'
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="categories" className="bg-slate-50 py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={t('home.browseCategoriesEyebrow')}
            title={t('home.browseCategoriesTitle')}
            text={t('home.browseCategoriesText')}
          />

          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-5">
            {categories.map((cat, i) => {
              const meta = CATEGORY_META[cat.toLowerCase()] || FALLBACK_CATEGORY;
              return (
                <button
                  key={cat}
                  onClick={() => { setFilterSpeciality(cat); scrollToCourses(); }}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="group card p-6 text-left hover:-translate-y-1 hover:border-emerald-200/80 hover:shadow-soft-lg transition-all duration-300 animate-fade-up"
                >
                  <span className={`inline-flex w-11 h-11 rounded-xl items-center justify-center ring-1 ${meta.accent}`}>
                    <meta.Icon size={20} />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {cat}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {(categoryCounts[cat] || 0) === 1 ? t('home.coursesCount', { count: 1 }) : t('home.coursesCountPlural', { count: categoryCounts[cat] || 0 })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={t('home.whyUsEyebrow')}
            title={t('home.whyUsTitle')}
            text={t('home.whyUsText')}
          />

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_US.map((feature, i) => (
              <div
                key={feature.title}
                style={{ animationDelay: `${i * 70}ms` }}
                className="group card p-7 hover:-translate-y-1 hover:border-emerald-200/80 hover:shadow-soft-lg transition-all duration-300 animate-fade-up"
              >
                <span className="inline-flex w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.Icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 lg:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={t('home.journeyEyebrow')}
            title={t('home.journeyTitle')}
            text={t('home.journeyText')}
          />

          <div className="mt-16 relative">
            <div className="hidden lg:block absolute top-6 left-[9%] right-[9%] h-px bg-slate-200" />
            <div className="grid gap-10 lg:grid-cols-5">
              {JOURNEY.map((step, i) => (
                <div key={step.title} className="relative text-center lg:text-left animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
                  <div className="relative z-10 mx-auto lg:mx-0 w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lift ring-4 ring-slate-50">
                    <step.Icon size={20} />
                  </div>
                  <span className="mt-5 inline-block text-xs font-bold tracking-widest text-emerald-600">{step.step}</span>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xs mx-auto lg:mx-0">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 sm:px-12 lg:px-16 lg:py-16">
            <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="relative grid lg:grid-cols-2 gap-12 items-center">
              <div className="animate-fade-up">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  <ShieldCheck size={14} /> {t('home.secureEyebrow')}
                </span>
                <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  {t('home.secureTitle')}
                </h2>
                <p className="mt-4 text-slate-300 leading-relaxed">
                  {t('home.secureText')}
                </p>

                <ul className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-5">
                  {SECURE_FEATURES.map((f) => (
                    <li key={f.title} className="flex gap-3">
                      <span className="mt-0.5 inline-flex w-8 h-8 shrink-0 rounded-lg bg-emerald-500/15 text-emerald-400 items-center justify-center">
                        <f.Icon size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{f.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{f.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <button onClick={scrollToCourses} className="mt-9 btn-brand px-6 py-3 text-sm">
                  {t('home.browseSecureCourses')}
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-soft-lg">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center">
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                      <Lock size={11} /> {t('home.protectedLesson')}
                    </span>
                    <span className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
                      <Play size={24} className="ml-0.5" />
                    </span>
                    <p className="mt-3 text-sm text-slate-400">{t('home.enrollmentRequired')}</p>
                    <span className="absolute bottom-3 right-3 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur">
                      {t('home.hdWatermarked')}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 text-center text-[10px] text-slate-600 tracking-widest uppercase select-none py-1">
                      {t('home.signedInAs', { email: 'student@example.com' })}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-slate-300 font-medium">{t('home.lessonOf', { current: 4, total: 12 })}</span>
                    <span className="text-emerald-400 font-semibold">{t('home.inProgress')}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                      <FileText size={16} className="text-amber-400" />
                      <p className="mt-2 text-xs text-slate-300">{t('home.studentPdfs')}</p>
                      <p className="text-[11px] text-slate-500">{t('home.enrolledAccess')}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                      <BarChart3 size={16} className="text-emerald-400" />
                      <p className="mt-2 text-xs text-slate-300">{t('home.quizTracking')}</p>
                      <p className="text-[11px] text-slate-500">{t('home.attemptsMax')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={t('home.instructorsEyebrow')}
            title={t('home.instructorsTitle')}
            text={t('home.instructorsText')}
          />

          {instructors.length === 0 ? (
            <div className="mt-12 card p-14 text-center text-slate-500">
              {t('home.noInstructors')}
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {instructors.map((instructor, i) => (
                <div
                  key={instructor._id}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="card p-7 text-center hover:-translate-y-1 hover:border-emerald-200/80 hover:shadow-soft-lg transition-all duration-300 animate-fade-up"
                >
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl font-extrabold">
                    {getInitials(instructor.name)}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{instructor.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{instructor.speciality}</p>
                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-lg font-extrabold text-slate-900">{instructor.courseCount}</p>
                      <p className="text-xs text-slate-500">{instructor.courseCount === 1 ? t('home.course') : t('home.coursesCountPlural', { count: instructor.courseCount })}</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-slate-900">{formatCompact(instructor.totalStudents)}</p>
                      <p className="text-xs text-slate-500">{t('home.students')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card px-8 py-10 sm:py-12 grid grid-cols-2 lg:grid-cols-4 gap-y-10">
            {[
              { label: t('home.activeLearners'), value: loading ? '–' : `${formatCompact(stats.students)}+`, Icon: Users },
              { label: t('home.expertLedCourses'), value: loading ? '–' : `${stats.courses}+`, Icon: GraduationCap },
              { label: t('home.whyUs.0.title'), value: loading ? '–' : `${stats.instructors}+`, Icon: BadgeCheck },
              { label: t('home.videoLessons'), value: loading ? '–' : `${formatCompact(stats.lessons)}+`, Icon: Play },
            ].map((s, i) => (
              <div key={s.label} className={`flex flex-col items-center text-center ${i > 0 ? 'lg:border-l lg:border-slate-100' : ''}`}>
                <span className="inline-flex w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 items-center justify-center">
                  <s.Icon size={20} />
                </span>
                <p className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{s.value}</p>
                <p className="mt-1 text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {favorites.length > 0 && (
        <section className="bg-slate-50 py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow={t('home.favoritesEyebrow')}
              title={t('home.favoritesTitle')}
              text={t('home.favoritesText')}
            />

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {favorites.map((course, i) => (
                <div
                  key={course._id}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="group card flex flex-col overflow-hidden hover:-translate-y-1 hover:border-emerald-200/80 hover:shadow-soft-lg transition-all duration-300 animate-fade-up"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                    {course.imageCover ? (
                      <img
                        src={course.imageCover}
                        alt={course.name}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          if (e.target.dataset.fallbackApplied) return;
                          e.target.dataset.fallbackApplied = 'true';
                          e.target.src = COURSE_CARD_FALLBACK;
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-900">
                        <span className="text-white text-4xl font-extrabold">{course.name?.charAt(0) || 'L'}</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white">
                      <TrendingUp size={11} /> {t('home.mostEnrolled')}
                    </span>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {course.courseSpeciality || course.instructorSpeciality || t('home.course')}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <Users size={14} className="text-emerald-600" />
                        {formatCompact(course.studentCount || 0)}
                      </span>
                    </div>
                    <h3
                      onClick={() => navigate(`/course/${course._id}`)}
                      className="mt-3 text-lg font-bold text-slate-900 leading-snug line-clamp-2 cursor-pointer group-hover:text-emerald-700 transition-colors"
                    >
                      {course.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2 flex-grow">{truncate(course.description, 110)}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">
                          {getInitials(course.instructorName)}
                        </span>
                        <span className="text-sm text-slate-700 truncate">{course.instructorName}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/course/${course._id}`)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                      >
                        {t('home.viewCourse')} <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-emerald-700 px-6 py-16 sm:px-12 lg:py-20 text-center">
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[28rem] w-[28rem] rounded-full border border-white/15" />

            <div className="relative animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-50">
                        <Rocket size={14} /> {t('home.startToday')}
                      </span>
                      <h2 className="mt-6 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                        {t('home.readyToStart')}
                      </h2>
                      <p className="mt-4 max-w-xl mx-auto text-emerald-100 text-lg">
                        {t('home.ctaText')}
                      </p>
                      <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
                        <button
                          onClick={scrollToCourses}
                          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                        >
                          {t('home.exploreCourses')} <ArrowRight size={18} />
                        </button>
                        <button
                          onClick={() => navigate(isLoggedIn ? '/MyCourses' : '/login')}
                          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
                        >
                          {isLoggedIn ? t('home.goToMyCourses') : t('home.createAccount')}
                        </button>
                      </div>
            </div>
          </div>
        </div>
      </section>

      <Footer categories={categories} />
    </>
  );
};

export default Home;
