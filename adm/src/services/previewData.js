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

// GET /api/admin/settings
export const platformSettings = async () => {
  const db = await loadDB();
  const value = db.platformSettings || { currency: "usd" };
  const defaults = {
    defaultMonthlyPrice: 6,
    defaultStudentLimit: 5,
    gracePeriodDays: 3,
    subscriptionRequired: true,
  };
  return { data: { success: true, data: { ...defaults, ...value } } };
};

// --- Subscription preview stubs ---

// GET /api/instructor/subscription/status
export const previewSubscriptionStatus = async () => {
  return {
    data: {
      success: true,
      data: {
        subscriptionStatus: "inactive",
        subscriptionCurrentPeriodEnd: null,
        subscriptionCancelAtPeriodEnd: false,
        studentCount: 0,
        studentLimit: 5,
        monthlyPrice: 6,
        subscriptionRequired: true,
        canSell: false,
        blockReason: "subscription_required",
      },
    },
  };
};

// POST /api/instructor/subscription/checkout
export const previewSubscriptionCheckout = async () => {
  previewMutation("Opening subscription checkout");
  return { data: { success: true, data: { clientSecret: "pi_fake_secret_preview" } } };
};

// POST /api/instructor/subscription/cancel
export const previewSubscriptionCancel = async () => {
  return { data: { success: true, message: "Subscription canceled (preview)" } };
};

// POST /api/instructor/subscription/resume
export const previewSubscriptionResume = async () => {
  return { data: { success: true, message: "Subscription resumed (preview)" } };
};

// POST /api/instructor/subscription/portal
export const previewSubscriptionPortal = async () => {
  previewMutation("Opening billing portal");
  return { data: { success: true, data: { url: "#/billing-portal-simulated" } } };
};

// PUT /api/admin/settings/subscription
export const previewUpdateSubscriptionSettings = () => {
  return previewMutation("Updating subscription settings");
};

// PUT /api/admin/instructors/:id/student-limit
export const previewUpdateStudentLimit = () => {
  return previewMutation("Updating instructor student limit");
};

// PUT /api/admin/instructors/:id/monthly-price
export const previewUpdateMonthlyPrice = () => {
  return previewMutation("Updating instructor monthly price");
};

// Any mutation while in preview mode: show a hint and do nothing.
export const previewMutation = (action) => {
  toast.info(`Preview Mode — ${action} is simulated (no backend call, nothing saved).`);
  return null;
};
