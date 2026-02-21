import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpeciality, setFilterSpeciality] = useState('All');
  const [sortDate, setSortDate] = useState('newest'); // 'newest' or 'oldest'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/user/public`
        );

        if (data.success) {
          setCourses(data.data);
          setFilteredCourses(data.data);
        } else {
          setError(data.message || 'Failed to load courses');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.response?.data?.message || 'Server error. Please try again.');
        toast.error('Could not load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Extract unique specialities for filter dropdown
  const specialities = useMemo(() => {
    const all = courses.map(c => c.instructorSpeciality).filter(Boolean);
    return ['All', ...new Set(all)];
  }, [courses]);

  // Apply filters (search, speciality, date sort)
  useEffect(() => {
    let filtered = [...courses];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.name?.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term) ||
          course.instructorName?.toLowerCase().includes(term) ||
          course.instructorSpeciality?.toLowerCase().includes(term)
      );
    }

    // Speciality filter
    if (filterSpeciality !== 'All') {
      filtered = filtered.filter(
        (course) => course.instructorSpeciality === filterSpeciality
      );
    }

    // Date sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      if (sortDate === 'newest') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    setFilteredCourses(filtered);
  }, [searchTerm, filterSpeciality, sortDate, courses]);

  const truncate = (text, max = 100) =>
    text?.length > max ? text.slice(0, max) + '…' : text || '';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-700 text-lg font-medium">Loading amazing courses...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center p-10 bg-white rounded-2xl shadow-xl max-w-md">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-4 text-gray-800 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
            Explore Our Courses
          </h1>
          <p className="text-xl text-gray-600">
            Find the perfect course for your journey
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by course name, description, instructor, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-12 pr-12 py-4 border border-gray-300 rounded-2xl bg-white shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 text-gray-900 placeholder-gray-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter Section (desktop-friendly) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-5 rounded-2xl shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Speciality:</span>
            <div className="flex flex-wrap gap-2">
              {specialities.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setFilterSpeciality(spec)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                    filterSpeciality === spec
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Sort by date:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortDate('newest')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  sortDate === 'newest'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortDate('oldest')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  sortDate === 'oldest'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Oldest
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="mt-2 text-sm text-gray-600 text-right mb-6">
          {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
        </p>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-2xl font-semibold text-gray-900">
              No courses found
            </h3>
            <p className="mt-2 text-gray-600">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredCourses.map((course) => (
              <div
                onClick={() => navigate(`/course/${course._id}`)}
                key={course._id}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer flex flex-col"
              >
                {/* Image with overlay effect */}
                <div className="relative h-52 w-full bg-gray-200 overflow-hidden">
                  {course.imageCover ? (
                    <img
                      src={course.imageCover}
                      alt={course.name}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                      <span className="text-white text-3xl font-bold">
                        {course.name?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </div>

                {/* Content */}
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 line-clamp-2 mb-3 group-hover:text-blue-600 transition">
                    {course.name}
                  </h3>

                  {/* Instructor info with more space */}
                  <div className="flex flex-col mb-3">
                    <div className="flex items-center text-gray-700">
                      <svg
                        className="h-5 w-5 mr-2 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                      <span className="font-medium truncate">{course.instructorName}</span>
                    </div>
                    {course.instructorSpeciality && (
                      <span className="mt-1 ml-7 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold inline-block w-fit">
                        {course.instructorSpeciality}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-5 line-clamp-3 flex-grow">
                    {truncate(course.description, 80)}
                  </p>

                  {/* Price & Date */}
                  <div className="flex items-center justify-between border-t pt-4 mt-auto">
                    <span className="text-2xl font-bold text-gray-900">
                      ${course.price?.toFixed(2) || '0.00'}
                    </span>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Published</div>
                      <div className="text-sm font-medium text-gray-700">
                        {new Date(course.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;