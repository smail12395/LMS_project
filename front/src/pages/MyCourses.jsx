import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const MyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login first');
        navigate('/login');
        return;
      }

      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/my-courses`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setCourses(data.data);
      } else {
        toast.error(data.message || 'Failed to load courses');
      }
    } catch (error) {
      console.error('Error fetching my courses:', error);
      toast.error(error.response?.data?.message || 'Error loading courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-700 font-medium">Loading your courses...</p>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-4 text-2xl font-bold text-gray-900">No courses yet</h3>
            <p className="mt-2 text-gray-600">You haven't enrolled in any courses. Browse our catalog to get started!</p>
            <button
              onClick={() => navigate('/courses')}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Browse Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            My Courses ({courses.length})
          </h1>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((item) => {
            const course = item.course;
            return (
              <div
                onClick={() => navigate(`/course/${course._id}`)}
                key={course._id}
                className="cursor-pointer bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition transform hover:-translate-y-1"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={course.imageCover || 'https://via.placeholder.com/400x200?text=No+Image'}
                    alt={course.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{course.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description}</p>
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                      {course.instructorName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="ml-2 text-sm text-gray-700">{course.instructorName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-blue-600">${course.price?.toFixed(2)}</span>
                    <span className="text-xs text-gray-500">Enrolled {new Date(item.enrolledAt).toLocaleDateString()}</span>
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