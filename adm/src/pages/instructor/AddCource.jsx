import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  PhotoIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  BookOpenIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { isPreviewMode } from "../../services/dataMode";
import { previewMutation } from "../../services/previewData";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-400";

const AddCourse = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({ image: "" });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    courseSpeciality: "",
    price: "",
    isFree: false,
  });

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (!token || role !== "instructor") {
      toast.error("Access denied. Instructors only.");
      navigate("/login");
    }
  }, [token, role, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === "name" && errors.name) {
      setErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      setErrors({ image: "Please select a course cover image." });
      toast.error("Please select a course cover image");
      return;
    }

    try {
      setLoading(true);

      if (isPreviewMode) {
        previewMutation("Publishing course");
        setFormData({ name: "", description: "", courseSpeciality: "", price: "", isFree: false });
        setImageFile(null);
        setImagePreview(null);
        setErrors({});
        return;
      }

      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("description", formData.description);
      fd.append("courseSpeciality", formData.courseSpeciality);
      fd.append("price", formData.price);
      fd.append("isFree", String(formData.isFree));
      fd.append("image", imageFile);

      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/addCourse`,
        fd,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Course created successfully 🚀");
        setFormData({ name: "", description: "", courseSpeciality: "", price: "", isFree: false });
        setImageFile(null);
        setImagePreview(null);
        setErrors({});
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
    <div className="min-h-screen bg-slate-50 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* ===== Header ===== */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-600"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Create New Course
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill in the details below to publish your course to students.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ===== Cover ===== */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <PhotoIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Course Cover</h2>
                <p className="text-xs text-slate-500">
                  Upload a high-quality image that represents your course.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:items-start">
              {/* Preview */}
              <div
                className={`flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-slate-50 sm:col-span-1 ${
                  errors.image ? "border-red-300" : "border-slate-200"
                }`}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 text-center">
                    <PhotoIcon className="h-8 w-8 text-slate-300" />
                    <span className="mt-2 text-xs text-slate-400">Preview</span>
                  </div>
                )}
              </div>

              {/* Uploader */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="course-image"
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-slate-50 px-6 py-8 text-center transition-colors ${
                    errors.image
                      ? "border-red-300 hover:border-red-400"
                      : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                    <PhotoIcon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Click to upload cover image
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    PNG, JPG or GIF — recommended 1280×720
                  </p>
                  <input
                    id="course-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {errors.image && (
                  <p className="mt-2 text-xs font-medium text-red-600">{errors.image}</p>
                )}
              </div>
            </div>
          </section>

          {/* ===== Details ===== */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <BookOpenIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Course Details</h2>
                <p className="text-xs text-slate-500">
                  Tell students what they'll learn in this course.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Advanced JavaScript Bootcamp"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="courseSpeciality" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Course Speciality
                </label>
                <input
                  id="courseSpeciality"
                  type="text"
                  name="courseSpeciality"
                  value={formData.courseSpeciality}
                  onChange={handleChange}
                  placeholder="e.g. Web Development, Design, Data & AI..."
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Used to categorize and filter this course on the Home page.
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what your course covers and who it's for..."
                  required
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* ===== Pricing ===== */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <TagIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Pricing & Access</h2>
                <p className="text-xs text-slate-500">
                  Set your course price or make it available for free.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Price (USD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    $
                  </span>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="49.00"
                    required
                    disabled={formData.isFree}
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <label className="flex cursor-pointer items-start gap-3 select-none">
                  <span className="relative mt-0.5 inline-flex">
                    <input
                      type="checkbox"
                      checked={formData.isFree}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isFree: e.target.checked,
                          price: e.target.checked ? "0" : formData.price,
                        })
                      }
                      className="peer h-5 w-5 rounded-md border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                    />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Free course — make all content publicly accessible
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      When enabled, content items marked "free" are available to all users without
                      enrollment.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* ===== Actions ===== */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  Publish Course
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCourse;
