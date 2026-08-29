import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { PlusIcon, MagnifyingGlassIcon, BookOpenIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import CourseCard from "../../components/instructor/CourseCard";
import { isPreviewMode } from "../../services/dataMode";
import useInstructorLock from "../../hooks/useInstructorLock";
import { courses as previewCourses } from "../../services/previewData";

const AllCources = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const { locked: instructorLocked } = useInstructorLock();

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (!token || role !== "instructor") {
      toast.warning("Access denied. Instructors only.");
      navigate("/login");
      return;
    }

    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data } = isPreviewMode
        ? await previewCourses()
        : await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/instructor/courses`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

      if (data.success) {
        setCourses(data.data);
      } else {
        toast.error("Failed to load courses");
      }
    } catch (error) {
      console.error("Fetch courses error:", error.response?.data || error.message);
      toast.error("Something went wrong while fetching courses");
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (course.name || "").toLowerCase().includes(q) ||
      (course.description || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-center justify-between">
            <div className="h-9 w-48 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* ===== Header ===== */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              My Courses
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {courses.length > 0
                ? `You have ${courses.length} ${courses.length === 1 ? "course" : "courses"} in your catalog.`
                : "Build your course catalog and reach more students."}
            </p>
          </div>
          <button
            onClick={() => instructorLocked ? navigate("/payInstructor") : navigate("/AddCource")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              instructorLocked
                ? "bg-slate-100 text-slate-500 hover:bg-slate-200 focus:ring-slate-400"
                : "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500"
            }`}
          >
            {instructorLocked ? <LockClosedIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
            {instructorLocked ? "Instructor Plan Required" : "Add Course"}
          </button>
        </div>

        {/* ===== Search ===== */}
        {courses.length > 0 && (
          <div className="mb-8">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses by name or description..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 shadow-sm transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        )}

        {/* ===== Courses Grid ===== */}
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
              <BookOpenIcon className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">No courses yet</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              You haven't created any courses yet. Start building your first course now.
            </p>
            <button
              onClick={() => instructorLocked ? navigate("/payInstructor") : navigate("/AddCource")}
              className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors ${
                instructorLocked
                  ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {instructorLocked ? <LockClosedIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
              {instructorLocked ? "Instructor Plan Required" : "Create your first course"}
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <MagnifyingGlassIcon className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No matching courses</h3>
            <p className="mt-1 text-sm text-slate-500">
              No courses match "{search}". Try a different search term.
            </p>
            <button
              onClick={() => setSearch("")}
              className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllCources;
