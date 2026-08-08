// src/services/previewData.js
// Local, read-only mock data for preview mode. Every getter mimics the
// axios response shape of the corresponding backend endpoint so pages can
// swap `await axios.get(...)` for these with a one-line change. No network
// request to the backend is ever made from this module.
import { toast } from 'react-toastify';

let dbPromise = null;

const loadDB = () => {
  if (!dbPromise) {
    dbPromise = fetch('/preview-data/db.json').then((res) => {
      if (!res.ok) {
        throw new Error(`Preview data unavailable (${res.status})`);
      }
      return res.json();
    });
  }
  return dbPromise;
};

// GET /api/user/public
export const publicCourses = async () => {
  const db = await loadDB();
  return { data: { success: true, data: db.publicCourses } };
};

// GET /api/user/my-courses
export const myCourses = async () => {
  const db = await loadDB();
  return { data: { success: true, data: db.myCourses } };
};

// GET /api/user/me
export const profile = async () => {
  const db = await loadDB();
  return { data: { success: true, data: db.profile } };
};

// GET /api/user/courses/:courseId
export const courseById = async (courseId) => {
  const db = await loadDB();
  const course = db.courses.find((c) => c._id === courseId);
  const isEnrolled = (db.myCourses || []).some((m) => m.course._id === courseId);
  return { data: { success: true, data: course, isEnrolled } };
};

// GET /api/user/quizzes/my-answers/:courseId
export const quizAnswers = async (courseId) => {
  const db = await loadDB();
  return { data: { success: true, data: db.quizAnswers || [] } };
};

// GET /api/user/courses/:courseId/payment-info
export const paymentInfo = async (courseId) => {
  const db = await loadDB();
  return { data: { success: true, data: db.paymentInfo } };
};

// POST /api/user/payments/create-payment-intent (simulated)
export const paymentIntent = async (courseId) => {
  return { data: { success: true, clientSecret: 'pi_preview_simulated_client_secret' } };
};

// Any mutation while in preview mode: show a hint and do nothing.
export const previewMutation = (action) => {
  toast.info(`Preview Mode — ${action} is simulated (no backend call, nothing saved).`);
  return null;
};
