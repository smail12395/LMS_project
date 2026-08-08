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

// GET /api/admin/instructors
export const instructors = async () => {
  const db = await loadDB();
  return { data: { success: true, data: db.instructors } };
};

// GET /api/instructor/courses
export const courses = async () => {
  const db = await loadDB();
  return { data: { success: true, data: db.courses } };
};

// GET /api/instructor/course/:courseId/video-series
export const videoSeries = async (courseId) => {
  const db = await loadDB();
  const series = db.videoSeries?.[courseId] || [];
  return { data: { success: true, videoSeries: series } };
};

// GET /api/instructor/courses/:courseId/users-answers
export const usersAnswers = async (courseId) => {
  const db = await loadDB();
  const data = db.usersAnswers?.[courseId] || [];
  return { data: { success: true, data } };
};

// Any mutation while in preview mode: show a hint and do nothing.
export const previewMutation = (action) => {
  toast.info(`Preview Mode — ${action} is simulated (no backend call, nothing saved).`);
  return null;
};
