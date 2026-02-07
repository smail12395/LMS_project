import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const AddCourse = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // 🔐 Check instructor access
  useEffect(() => {
    if (!token || role !== "instructor") {
      toast.error("Access denied. Instructors only.");
      navigate("/login");
    }
  }, [token, role, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      toast.error("Please select a course cover image");
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("description", formData.description);
      fd.append("price", formData.price);
      fd.append("image", imageFile);

      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/addCourse`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        toast.success("Course created successfully 🚀");
        setFormData({ name: "", description: "", price: "" });
        setImageFile(null);
        setImagePreview(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Create New Course
        </h1>
        <p className="text-gray-500 mb-6">
          Fill in the details below to publish your course
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Course Cover Image
            </label>

            <div className="flex items-center gap-6">
              <div className="w-40 h-28 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-gray-50">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Preview</span>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block text-sm text-gray-600
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-100 file:text-indigo-700
                  hover:file:bg-indigo-200"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Course Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Price ($)
            </label>
            <input
              type="number"
              min="0"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Publish Course"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddCourse;
