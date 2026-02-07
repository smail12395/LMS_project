import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const DashInstructor = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

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
      console.log("📡 Fetching courses...");

      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/courses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        setCourses(data.data);
      }
    } catch (error) {
      console.error("❌ Fetch error:", error.message);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this course? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(courseId);

      console.log("🗑️ Deleting course:", courseId);

      const { data } = await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/instructor/course/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        toast.success("Course deleted successfully");
        setCourses((prev) =>
          prev.filter((course) => course._id !== courseId)
        );
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("❌ Delete error:", error.message);
      toast.error("Failed to delete course");
    } finally {
      setDeletingId(null);
    }
  };

  // 📊 Stats
  const totalEarnings = courses.reduce(
    (sum, c) => sum + c.price * c.numberOfUsersPaidForThisCourse,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800">
            Instructor Dashboard
          </h1>

          <button
            onClick={() => navigate("/AddCource")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-semibold"
          >
            + New Course
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard title="Courses" value={courses.length} />
          <StatCard
            title="Total Students"
            value={courses.reduce(
              (sum, c) => sum + c.numberOfUsersPaidForThisCourse,
              0
            )}
          />
          <StatCard title="Total Earnings" value={`$${totalEarnings}`} />
        </div>

        {/* Courses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course._id}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition relative"
            >
              <img
                src={course.imageCover}
                alt={course.name}
                className="h-40 w-full object-cover"
              />

              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-800 mb-1">
                  {course.name}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {course.description}
                </p>

                <div className="flex justify-between text-sm mb-1">
                  <span>Students</span>
                  <span>{course.numberOfUsersPaidForThisCourse}</span>
                </div>

                <div className="flex justify-between text-sm mb-1">
                  <span>Price</span>
                  <span>${course.price}</span>
                </div>

                <div className="flex justify-between font-semibold">
                  <span>Earnings</span>
                  <span className="text-green-600">
                    $
                    {course.price *
                      course.numberOfUsersPaidForThisCourse}
                  </span>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(course._id)}
                  disabled={deletingId === course._id}
                  className="mt-4 w-full bg-red-100 hover:bg-red-200 text-red-600 font-semibold py-2 rounded-xl transition disabled:opacity-50"
                >
                  {deletingId === course._id
                    ? "Deleting..."
                    : "Delete Course"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            No courses yet.
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-white rounded-2xl shadow-md p-6">
    <h3 className="text-gray-500 text-sm mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
  </div>
);

export default DashInstructor;
