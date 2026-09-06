import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { isPreviewMode } from "../../services/dataMode";
import { instructors as previewInstructors, previewMutation } from "../../services/previewData";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const ManageInstructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentInstructor, setCurrentInstructor] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    speciality: "",
    monthlyPrice: "",
    studentLimit: "",
  });

  const [limitOverride, setLimitOverride] = useState({});
  const [priceOverride, setPriceOverride] = useState({});

  const token = localStorage.getItem("token");

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      const res = isPreviewMode
        ? await previewInstructors()
        : await axios.get(`${BACKEND_URL}/api/admin/instructors`, {
            headers: { Authorization: `Bearer ${token}` },
          });
      if (res.data.success) {
        setInstructors(res.data.data);
      } else {
        toast.error(res.data.message || "Failed to load instructors");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load instructors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructors();
  }, []);

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "", speciality: "", monthlyPrice: "", studentLimit: "" });
  };

  const openAddModal = () => {
    setModalMode("add");
    resetForm();
    setCurrentInstructor(null);
    setShowModal(true);
  };

  const openEditModal = (inst) => {
    setModalMode("edit");
    setCurrentInstructor(inst);
    setFormData({
      name: inst.name || "",
      email: inst.email || "",
      password: "",
      speciality: inst.speciality || "",
      monthlyPrice: inst.monthlyPrice != null ? String(inst.monthlyPrice) : "",
      studentLimit: inst.studentLimit != null ? String(inst.studentLimit) : "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setCurrentInstructor(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.password) delete payload.password;
    if (modalMode === "add") {
      if (payload.monthlyPrice === "" || payload.monthlyPrice === null) delete payload.monthlyPrice;
      if (payload.studentLimit === "" || payload.studentLimit === null) delete payload.studentLimit;
    } else {
      // The identity endpoint doesn't handle pricing fields; they are persisted
      // separately via the dedicated /monthly-price and /student-limit endpoints.
      delete payload.monthlyPrice;
      delete payload.studentLimit;
    }

    // Empty (or null) price/limit == inherit the platform default. Convert the
    // form values to numbers for the dedicated endpoints; empty string -> null.
    const monthlyPrice = formData.monthlyPrice === "" || formData.monthlyPrice == null
      ? null
      : Number(formData.monthlyPrice);
    const studentLimit = formData.studentLimit === "" || formData.studentLimit == null
      ? null
      : Math.floor(Number(formData.studentLimit));

    try {
      if (isPreviewMode) {
        previewMutation(modalMode === "add" ? "Adding instructor" : "Updating instructor");
        closeModal();
        return;
      }

      let res;
      if (modalMode === "add") {
        res = await axios.post(`${BACKEND_URL}/api/admin/instructors`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.put(`${BACKEND_URL}/api/admin/instructors/${currentInstructor._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (res.data.success) {
        // Persist the instructor's pricing overrides (edit mode only). These use
        // the existing dedicated endpoints whose backend ``null`` clearing makes
        // the instructor inherit the current platform default immediately.
        if (modalMode === "edit") {
          await Promise.all([
            axios.put(`${BACKEND_URL}/api/admin/instructors/${currentInstructor._id}/monthly-price`, { monthlyPrice }, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.put(`${BACKEND_URL}/api/admin/instructors/${currentInstructor._id}/student-limit`, { studentLimit }, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
        }
        toast.success(modalMode === "add" ? "Instructor added" : "Instructor updated");
        closeModal();
        fetchInstructors();
      } else {
        toast.error(res.data.message || "Operation failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this instructor?")) return;
    try {
      if (isPreviewMode) {
        previewMutation("Deleting instructor");
        return;
      }
      const res = await axios.delete(`${BACKEND_URL}/api/admin/instructors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Instructor deleted");
        fetchInstructors();
      } else {
        toast.error(res.data.message || "Delete failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleUpdateStudentLimit = async (instId, value) => {
    try {
      const val = value === "" ? null : Number(value);
      const res = await axios.put(
        `${BACKEND_URL}/api/admin/instructors/${instId}/student-limit`,
        { studentLimit: val },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Student limit updated");
        setLimitOverride((prev) => ({ ...prev, [instId]: value }));
        fetchInstructors();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update student limit");
    }
  };

  const handleUpdateMonthlyPrice = async (instId, value) => {
    try {
      const val = value === "" ? null : Number(value);
      const res = await axios.put(
        `${BACKEND_URL}/api/admin/instructors/${instId}/monthly-price`,
        { monthlyPrice: val },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Monthly price updated");
        setPriceOverride((prev) => ({ ...prev, [instId]: value }));
        fetchInstructors();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update monthly price");
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <ToastContainer />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Instructor Management</h1>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          Add Instructor
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading instructors...</p>
      ) : instructors.length === 0 ? (
        <p className="text-gray-600">No instructors found.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {instructors.map((inst) => (
                <tr key={inst._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{inst.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{inst.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${inst.studentLimit && inst.liveStudentCount >= inst.studentLimit ? 'text-red-600' : 'text-gray-800'}`}>
                      {inst.liveStudentCount || 0}
                    </span>
                    {inst.studentLimit != null && (
                      <span className="text-gray-400"> / {inst.studentLimit}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-medium">
                        ${inst.monthlyPrice != null ? inst.monthlyPrice : "default"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Override"
                        value={priceOverride[inst._id] ?? ""}
                        onChange={(e) => setPriceOverride((prev) => ({ ...prev, [inst._id]: e.target.value }))}
                        onBlur={() => {
                          if (priceOverride[inst._id] !== undefined) {
                            handleUpdateMonthlyPrice(inst._id, priceOverride[inst._id]);
                          }
                        }}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      inst.subscriptionStatus === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : inst.subscriptionStatus === "past_due"
                        ? "bg-rose-100 text-rose-700"
                        : inst.subscriptionStatus === "grace"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {inst.subscriptionStatus || "inactive"}
                    </span>
                    {inst.stripeSubscriptionId && (
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{inst.stripeSubscriptionId}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => openEditModal(inst)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(inst._id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === "add" ? "Add Instructor" : "Edit Instructor"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { field: "name", label: "Name", type: "text", required: true },
                { field: "email", label: "Email", type: "email", required: true },
                { field: "password", label: "Password (leave blank to keep)", type: "password", required: modalMode === "add" },
                { field: "speciality", label: "Speciality", type: "text", required: true },
              ].map((cfg) => (
                <div key={cfg.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{cfg.label}</label>
                  <input
                    type={cfg.type}
                    value={formData[cfg.field] || ""}
                    onChange={(e) => setFormData({ ...formData, [cfg.field]: e.target.value })}
                    required={cfg.required}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    spellCheck={false}
                  />
                </div>
              ))}

              {modalMode === "add" || modalMode === "edit" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monthly Price ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.monthlyPrice}
                        onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                        placeholder="Default: 7"
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">Leave empty to use platform default</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Student Limit
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.studentLimit}
                        onChange={(e) => setFormData({ ...formData, studentLimit: e.target.value })}
                        placeholder="Default: 5"
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">Leave empty to use platform default</p>
                    </div>
                  </div>
              ) : null}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {modalMode === "add" ? "Add" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageInstructors;
