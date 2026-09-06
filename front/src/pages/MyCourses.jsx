import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isPreviewMode } from '../services/dataMode';
import { myCourses as previewMyCourses } from '../services/previewData';
import { useTour } from '../hooks/useTour';

const MY_COURSES_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
      <rect width="400" height="200" fill="#E2E8F0" />
      <rect x="60" y="40" width="280" height="120" rx="20" fill="#94A3B8" />
      <path d="M150 110 L250 80 L250 120 L150 150 Z" fill="#FFFFFF" />
      <text x="200" y="176" font-family="sans-serif" font-size="18" fill="#334155" text-anchor="middle">Course</text>
    </svg>
  `);

const MyCourses = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token && !isPreviewMode) {
        toast.error(t('myCourses.pleaseLogin'));
        navigate('/login');
        return;
      }

      const { data } = isPreviewMode
        ? await previewMyCourses()
        : await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/user/my-courses`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

      if (data.success) {
        setCourses(data.data);
      } else {
        toast.error(data.message || t('myCourses.failedToLoad'));
      }
    } catch (error) {
      console.error('Error fetching my courses:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        toast.error(t('myCourses.sessionExpired'));
        navigate('/login');
        return;
      }
      toast.error(error.response?.data?.message || t('myCourses.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useTour(!loading && courses.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg text-slate-700 font-medium">{t('myCourses.loading')}</p>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="card p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-4 text-2xl font-bold text-slate-900">{t('myCourses.noCoursesTitle')}</h3>
            <p className="mt-2 text-slate-600">{t('myCourses.noCoursesText')}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 btn-brand px-6 py-3"
            >
              {t('myCourses.browseCourses')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="card p-6 mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <svg className="w-6 h-6 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            {t('myCourses.myCourses', { count: courses.length })}
          </h1>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((item, idx) => {
            const course = item.course;
            return (
              <div
                onClick={() => navigate(`/course/${course._id}`)}
                key={course._id}
                data-tour={idx === 0 ? 'enrolled-course' : undefined}
                className="cursor-pointer card overflow-hidden hover:shadow-soft-lg transition transform hover:-translate-y-1"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={course.imageCover || MY_COURSES_FALLBACK}
                    alt={course.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      if (e.target.dataset.fallbackApplied) return;
                      e.target.dataset.fallbackApplied = 'true';
                      e.target.src = MY_COURSES_FALLBACK;
                    }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">{course.name}</h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">{course.description}</p>
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                      {course.instructorName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="ml-2 text-sm text-slate-700">{course.instructorName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-primary">${course.price?.toFixed(2)}</span>
                    <span className="text-xs text-slate-500">{t('myCourses.enrolled', { date: new Date(item.enrolledAt).toLocaleDateString() })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MyCourses;