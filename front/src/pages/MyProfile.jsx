// Fix: Add a triple-slash directive to include Vite's client types for `import.meta.env`.
/// <reference types="vite/client" />

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Icon Components (Heroicons)
const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ShieldCheckIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944a12.02 12.02 0 009 2.056c4.522 0 8.34-1.857 9-4.239V10a11.955 11.955 0 00-2.382-6.984z" />
    </svg>
);


const MyProfile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error("No authentication token found. Please log in.");
        }

        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/user/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          setUserData(response.data.data);
        } else {
          throw new Error(response.data.message || "Failed to fetch user data.");
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleVerify = () => {
      alert("Account verification feature is coming soon!");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg shadow-lg max-w-md text-center" role="alert">
          <strong className="font-bold">An Error Occurred</strong>
          <span className="block mt-1">{error}</span>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <p>No user data found.</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-gray-700">
                {userData.name.charAt(0).toUpperCase()}
              </div>
              {userData.verified && (
                <ShieldCheckIcon className="absolute bottom-0 right-0 h-8 w-8 text-green-400 bg-gray-800 rounded-full p-1" />
              )}
            </div>
            <div className="text-center sm:text-left flex-grow">
              <h1 className="text-3xl font-bold text-white">{userData.name}</h1>
              <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                userData.verified 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {userData.verified ? 'Verified Account' : 'Unverified Account'}
              </div>
            </div>
          </div>
          
          {!userData.verified && (
            <div className="mt-6 bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-center">
              <p className="font-semibold">Your account needs verification.</p>
              <p className="text-sm mt-1">Please verify your account to unlock all features.</p>
              <button 
                onClick={handleVerify}
                className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Verify Account Now
              </button>
            </div>
          )}

          <div className="mt-8 border-t border-gray-700 pt-8 space-y-6">
            <div className="flex items-start">
              <MailIcon />
              <div className="ml-4">
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-lg font-medium">{userData.email}</p>
              </div>
            </div>
            <div className="flex items-start">
              <PhoneIcon />
              <div className="ml-4">
                <p className="text-sm text-gray-400">Phone Number</p>
                <p className="text-lg font-medium">{userData.phoneNumber || <span className="text-gray-500 italic">Not provided</span>}</p>
              </div>
            </div>
            <div className="flex items-start">
                <CalendarIcon />
              <div className="ml-4">
                <p className="text-sm text-gray-400">Member Since</p>
                <p className="text-lg font-medium">{new Date(userData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="flex items-start">
              <CalendarIcon />
              <div className="ml-4">
                <p className="text-sm text-gray-400">Last Login</p>
                <p className="text-lg font-medium">{new Date(userData.lastLogin).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;