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
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [currentInstructor, setCurrentInstructor] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    speciality: "",
    stripePublicKey: "",
    stripeSecretKey: "",
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      speciality: "",
      stripePublicKey: "",
      stripeSecretKey: "",
    });
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
      stripePublicKey: inst.stripePublicKey || "",
      stripeSecretKey: inst.stripeSecretKey || "",
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
    // Remove password if empty (for edit mode)
    if (!payload.password) delete payload.password;

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Speciality</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Courses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {instructors.map((inst) => (
                <tr key={inst._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{inst.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{inst.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{inst.speciality}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{inst.courses?.length || 0}</td>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === "add" ? "Add Instructor" : "Edit Instructor"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { field: "name", label: "Name", type: "text", required: true },
                { field: "email", label: "Email", type: "email", required: true },
                { field: "password", label: "Password (leave blank to keep)", type: "password", required: modalMode === "add" },
                { field: "speciality", label: "Speciality", type: "text", required: true },
                { field: "stripePublicKey", label: "Stripe Public Key", type: "text", required: true, className: "md:col-span-2" },
                { field: "stripeSecretKey", label: "Stripe Secret Key", type: "password", required: true, className: "md:col-span-2" },
              ].map((cfg) => (
                <div key={cfg.field} className={cfg.className || ""}>
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

              <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
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
