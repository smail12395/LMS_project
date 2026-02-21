import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const UsersAnswers = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [usersData, setUsersData] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    fetchUsersAnswers();
  }, [courseId]);

  const fetchUsersAnswers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login');
        navigate('/login');
        return;
      }

      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/courses/${courseId}/users-answers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setUsersData(data.data);
        console.log(data.data)
      } else {
        toast.error(data.message || 'Failed to load data');
      }
    } catch (error) {
      console.error('Error fetching users answers:', error);
      toast.error(error.response?.data?.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-700 font-medium">Loading student answers...</p>
        </div>
      </div>
    );
  }

  const topStudents = usersData.slice(0, 5); // top 5 by average

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              Student Quiz Performance
            </h1>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Back
            </button>
          </div>
        </div>

        {usersData.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No student answers yet</h3>
            <p className="mt-2 text-gray-500">Students haven't taken any quizzes for this course.</p>
          </div>
        ) : (
          <>
            {/* Leaderboard */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a6 6 0 100-12 6 6 0 000 12zm-2 2a8 8 0 00-8 8h20a8 8 0 00-8-8h-4z" />
                </svg>
                Top Performers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topStudents.map((student, index) => (
                  <div key={student.user._id} className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 flex items-center">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="font-semibold text-gray-900">{student.user.name}</p>
                      <p className="text-sm text-gray-600">Avg: {student.averageScore.toFixed(1)} pts</p>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">{student.averageScore.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Students */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">All Students ({usersData.length})</h2>
              <div className="space-y-4">
                {usersData.map((student) => (
                  <div key={student.user._id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* User header */}
                    <div
                      className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => setExpandedUser(expandedUser === student.user._id ? null : student.user._id)}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                          {student.user.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="ml-4">
                          <p className="font-semibold text-gray-900">{student.user.name}</p>
                          <p className="text-sm text-gray-500">{student.answers.length} quizzes taken</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="mr-4 text-right">
                          <p className="text-sm text-gray-500">Average</p>
                          <p className="text-xl font-bold text-blue-600">{student.averageScore.toFixed(1)}</p>
                        </div>
                        <svg className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedUser === student.user._id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Expanded answers */}
                    {expandedUser === student.user._id && (
                      <div className="p-4 border-t border-gray-200 bg-white">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Quiz Attempts</h3>
                        <div className="space-y-3">
                          {student.answers.map((answer) => (
                            <div key={answer._id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{answer.quizSnapshot.question}</p>
                                  <div className="mt-1 text-xs text-gray-500">
                                    First shot: {answer.firstShot ? (
                                      <span className={answer.firstShot.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                        {answer.firstShot.isCorrect ? '✓' : '✗'} (opt {answer.firstShot.selectedOption}, {answer.firstShot.duration}s)
                                      </span>
                                    ) : 'none'}
                                    {answer.secondShot && (
                                      <span className="ml-2">
                                        Second: {answer.secondShot.isCorrect ? '✓' : '✗'} (opt {answer.secondShot.selectedOption}, {answer.secondShot.duration}s)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {answer.totalPointsEarned} / {answer.quizSnapshot.pointsPossible} pts
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UsersAnswers;