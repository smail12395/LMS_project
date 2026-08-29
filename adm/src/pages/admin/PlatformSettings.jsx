import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { isPreviewMode } from "../../services/dataMode";
import {
  platformSettings as previewSettings,
} from "../../services/previewData";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const PlatformSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subSaving, setSubSaving] = useState(false);

  // Subscription settings inputs
  const [subPriceInput, setSubPriceInput] = useState("");
  const [studentLimitInput, setStudentLimitInput] = useState("");
  const [graceInput, setGraceInput] = useState("");
  const [subRequiredInput, setSubRequiredInput] = useState(true);

  const token = localStorage.getItem("token");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = isPreviewMode
        ? await previewSettings()
        : await axios.get(`${BACKEND_URL}/api/admin/settings`, {
            headers: { Authorization: `Bearer ${token}` },
          });
      if (res.data.success) {
        const s = res.data.data;
        setSettings(s);
        setSubPriceInput(String(s.defaultMonthlyPrice ?? 7));
        setStudentLimitInput(String(s.defaultStudentLimit ?? 5));
        setGraceInput(String(s.gracePeriodDays ?? 3));
        setSubRequiredInput(s.subscriptionRequired !== false);
      } else {
        toast.error(res.data.message || "Failed to load settings");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    const price = Number(subPriceInput);
    const limit = Number(studentLimitInput);
    const grace = Number(graceInput);

    if (!Number.isFinite(price) || price < 0) {
      toast.error("Subscription price must be >= 0");
      return;
    }
    if (!Number.isFinite(limit) || limit < 0) {
      toast.error("Student limit must be >= 0");
      return;
    }
    if (!Number.isFinite(grace) || grace < 0) {
      toast.error("Grace period must be >= 0");
      return;
    }

    setSubSaving(true);
    try {
      const res = await axios.put(
        `${BACKEND_URL}/api/admin/settings/subscription`,
        {
          defaultMonthlyPrice: price,
          defaultStudentLimit: Math.floor(limit),
          gracePeriodDays: Math.floor(grace),
          subscriptionRequired: subRequiredInput,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Subscription settings updated");
        setSettings((prev) => ({ ...prev, ...res.data.data }));
      } else {
        toast.error(res.data.message || "Update failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSubSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 min-h-screen bg-gray-50 text-gray-600">Loading settings...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <ToastContainer />
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Platform Settings</h1>

      {settings && (
        <div className="space-y-6 max-w-2xl">
          {/* Current Config */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Configuration</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Currency</dt>
                <dd className="text-2xl font-bold text-gray-900 uppercase">{settings.currency || "usd"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Monthly subscription</dt>
                <dd className="text-2xl font-bold text-gray-900">${settings.defaultMonthlyPrice}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Student limit</dt>
                <dd className="text-2xl font-bold text-gray-900">{settings.defaultStudentLimit}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Grace period</dt>
                <dd className="text-2xl font-bold text-gray-900">{settings.gracePeriodDays} days</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Subscription required</dt>
                <dd className="text-2xl font-bold text-gray-900">{settings.subscriptionRequired ? "Yes" : "No"}</dd>
              </div>
              {settings.updatedBy && (
                <>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Last updated by</dt>
                    <dd className="text-sm text-gray-700">{settings.updatedBy}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Last updated at</dt>
                    <dd className="text-sm text-gray-700">
                      {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "—"}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {/* Instructor Subscription Settings */}
          <form onSubmit={handleSaveSubscription} className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Instructor Subscription</h2>
            <p className="text-sm text-gray-500">
              Configure the default monthly subscription, student limit, and grace period
              for all instructors. Individual instructors can have per-instructor overrides.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={subPriceInput}
                  onChange={(e) => setSubPriceInput(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">0 = no subscription required</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default student limit
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={studentLimitInput}
                  onChange={(e) => setStudentLimitInput(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">0 = unlimited</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grace period (days)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={graceInput}
                  onChange={(e) => setGraceInput(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Days after failed payment before lock</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Require subscription after limit
                </label>
                <select
                  value={subRequiredInput ? "true" : "false"}
                  onChange={(e) => setSubRequiredInput(e.target.value === "true")}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Yes — lock instructors who exceed limit</option>
                  <option value="false">No — limit is informational only</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={subSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {subSaving ? "Saving..." : "Save Subscription Settings"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PlatformSettings;